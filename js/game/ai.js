// CPU opponent. It presents the same interface as a keyboard PlayerInput
// (held / pressed / consume / lastPress), so the fighter can't tell the
// difference and the CPU plays by exactly the same rules as a human.
(function () {
  const ACTIONABLE = ['idle', 'walk', 'crouch', 'block', 'jump'];

  class AIInput {
    constructor(kb, scene, side) {
      this.kb = kb;
      this.scene = scene;
      this.side = side;
      this.holding = new Set();
      this.pressAt = {};
      this.consumedAt = {};
      this.blockPlan = null;
      this.lastThreat = null;
      this.plan = null;
    }

    // ---- PlayerInput interface ----
    held(a) { return this.holding.has(a); }
    lastPress(a) { return a in this.pressAt ? this.pressAt[a] : -Infinity; }
    pressed(a, buffer = RF.CONFIG.INPUT_BUFFER) {
      const t = this.lastPress(a);
      const c = a in this.consumedAt ? this.consumedAt[a] : -Infinity;
      return t > c && this.kb.frame - t <= buffer;
    }
    consume(a) { this.consumedAt[a] = this.kb.frame; }
    tap(a) { this.pressAt[a] = this.kb.frame; }

    get level() { return RF.AI_LEVELS[RF.CONFIG.CPU_LEVEL] || RF.AI_LEVELS.normal; }

    // Called once per frame before the fighters update.
    think() {
      this.holding.clear();
      const now = this.kb.frame, L = this.level;
      const me = this.scene.fighters[this.side], opp = this.scene.opponentOf(me);
      // FINISH THEM!: walk up and finish (harder CPUs never miss the chance).
      if (this.scene.phase === 'finish' && !this.scene.finisher && this.scene.finishVictim === opp) {
        const gap = Math.abs(opp.x - me.x) - (me.body.width + opp.body.width) / 2;
        if (gap > RF.CONFIG.THROW_RANGE + 10) this.holding.add(opp.x > me.x ? 'right' : 'left');
        else if (Math.random() < L.punish * 0.1) this.tap('throw');
        return;
      }
      if (this.scene.phase !== 'fight') { this.blockPlan = null; return; }
      const toward = Math.sign(opp.x - me.x) || me.facing;
      const key = (d) => (d > 0 ? 'right' : 'left');

      // Being thrown: maybe break free.
      if (me.state === 'thrown') {
        if (me.stateTime === 1) this.breakAt = Math.random() < L.breakChance ? 3 + Math.floor(Math.random() * 5) : -1;
        if (me.stateTime === this.breakAt) this.tap('throw');
        return;
      }

      // 1. Defence: react to attacks we can see coming.
      const threat = this.detectThreat(me, opp, now);
      if (threat && threat.id !== this.lastThreat) {
        this.lastThreat = threat.id;
        if (Math.random() < L.blockChance) {
          let pressAt = now + L.reaction + Math.floor(Math.random() * 4);
          // A perfect block means pressing just before the hit lands.
          if (Math.random() < L.perfectChance && threat.hitAt - 3 >= now + 2) pressAt = threat.hitAt - 3;
          this.blockPlan = { pressAt, until: threat.endAt + 4, low: threat.level === 'low', pressed: false };
        }
      }
      if (this.blockPlan) {
        const bp = this.blockPlan;
        if (now > bp.until) this.blockPlan = null;
        else {
          if (now >= bp.pressAt) {
            if (!bp.pressed) { this.tap('block'); bp.pressed = true; }
            this.holding.add('block');
            if (bp.low) this.holding.add('down');
          }
          return;
        }
      }

      if (!ACTIONABLE.includes(me.state)) return;
      const dist = Math.abs(opp.x - me.x);
      const reach = (m) => (me.moves[m].projectile ? 220 : me.moves[m].hitbox.x + me.moves[m].hitbox.w + opp.body.width / 2);

      // 2. Jump-in: kick on the way down.
      if (me.state === 'jump') {
        if (!me.airAttackUsed && me.vy < 1 && dist < reach('airHeavy') + 12) this.tap('heavy');
        return;
      }
      if (opp.isKO) return;

      // 3. Punish an opponent who whiffed or is stunned.
      const open = (opp.state === 'attack' && opp.attackPhase() === 'recovery') || opp.state === 'hitstun';
      if (open && dist < reach('heavy') && Math.random() < L.punish * 0.25) {
        this.tap(dist < reach('light') ? 'light' : 'heavy');
        return;
      }

      // 4. Throw when right next to them (more likely if they're blocking).
      const gap = dist - (me.body.width + opp.body.width) / 2;
      if (gap <= RF.CONFIG.THROW_RANGE - 2 && opp.grounded &&
          Math.random() < L.throwChance * (opp.state === 'block' ? 4 : 1)) {
        this.tap('throw');
        return;
      }

      // 5. Attack when in range.
      if (dist <= reach('heavy') && Math.random() < L.aggression) {
        const r = Math.random();
        if (r < 0.35 && dist < reach('light')) this.tap('light');
        else if (r < 0.55) this.tap('heavy');
        else if (r < 0.75 && dist < reach('lowLight')) { this.holding.add('down'); this.tap('light'); }
        else { this.holding.add('down'); this.tap('heavy'); }
        return;
      }

      // 6. Footsies: pick a short movement plan and stick to it for a moment.
      if (!this.plan || now >= this.plan.until) {
        const r = Math.random(), rnd = (n) => Math.floor(Math.random() * n);
        if (dist > reach('heavy') + 30) {
          this.plan = r < L.jumpChance ? { jump: true, dir: toward, until: now + 2 } : { dir: toward, until: now + 10 + rnd(30) };
        } else if (r < 0.1 + L.blockChance * 0.3) {
          // Guard in advance: jabs are too fast to block on reaction alone.
          this.plan = { guard: true, low: Math.random() < 0.4, until: now + 15 + rnd(25) };
          this.tap('block');
        } else if (dist < reach('light') * 0.7 && r < 0.6) this.plan = { dir: -toward, until: now + 10 + rnd(20) };
        else if (r < 0.15) this.plan = { crouch: true, until: now + 10 + rnd(20) };
        else if (r < 0.5) this.plan = { dir: 0, until: now + 5 + rnd(L.idle) };
        else this.plan = { dir: toward, until: now + 8 + rnd(20) };
      }
      if (this.plan.guard) { this.holding.add('block'); if (this.plan.low) this.holding.add('down'); }
      if (this.plan.jump) this.holding.add('up');
      if (this.plan.dir) this.holding.add(key(this.plan.dir));
      if (this.plan.crouch) this.holding.add('down');
    }

    // Describe an incoming hit: when it lands, when it's over, and whether it's low.
    detectThreat(me, opp, now) {
      if (opp.state === 'attack' && opp.attackPhase() === 'startup') {
        const m = opp.move;
        const range = m.hitbox.x + m.hitbox.w + me.body.width / 2 + 15;
        if (Math.abs(opp.x - me.x) < range) {
          return {
            id: 'atk' + (now - opp.stateTime),
            hitAt: now + (m.startup - opp.stateTime),
            endAt: now + (m.total - opp.stateTime),
            level: RF.Fighter.attackLevel(opp, m),
          };
        }
      }
      if (opp.state === 'special' && opp.stateTime < 4) {
        return { id: 'sp' + (now - opp.stateTime), hitAt: now + 14, endAt: now + 45, level: 'mid' };
      }
      for (const p of this.scene.projectiles) {
        if (p.owner !== opp || Math.sign(me.x - p.x) !== Math.sign(p.vx)) continue;
        const gap = Math.abs(p.x - me.x) - me.body.width / 2;
        if (gap < 110) {
          const hitAt = now + Math.max(1, Math.floor(gap / Math.abs(p.vx)));
          return { id: p, hitAt, endAt: hitAt + 4, level: 'mid' };
        }
      }
      return null;
    }
  }

  RF.AIInput = AIInput;
})();
