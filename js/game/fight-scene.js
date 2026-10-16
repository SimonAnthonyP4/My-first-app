// A best-of-three match between two fighters on one stage: round flow,
// collisions, hit detection, announcements.
(function () {
  const { sign, rectsOverlap } = RF.util;
  const T = (...a) => RF.font.drawText(...a);

  const BIG = ['#fff8c0', '#fff070', '#ffd030', '#ffa020', '#ff7010', '#e04010', '#a02008'];
  const INTRO_FRAMES = 110;      // "ROUND n" ... "FIGHT!"
  const ROUND_OVER_FRAMES = 200; // K.O. / TIME banner + victory pose
  const START_GAP = 70;          // each fighter starts this far from the centre

  class FightScene {
    constructor(game, opts) {
      this.game = game;
      this.opts = opts;
      this.stageDef = RF.getStage(opts.stage);
      this.stage = new RF.StageRenderer(this.stageDef);
      this.fighters = [new RF.Fighter(opts.p1, 0), new RF.Fighter(opts.p2, 1)];
      this.inputs = [
        new RF.PlayerInput(game.kb, RF.CONTROLS.p1),
        new RF.PlayerInput(game.kb, RF.CONTROLS.p2),
      ];
      this.effects = new RF.Effects();
      this.hud = new RF.HUD();
      this.frame = 0;
      this.paused = false;
      this.showHitboxes = false;
      this.startMatch();
    }

    startMatch() {
      this.wins = [0, 0];
      this.round = 1;
      this.startRound();
    }

    startRound() {
      const b = this.stageDef.bounds, mid = (b.left + b.right) / 2;
      this.fighters[0].reset(mid - START_GAP, 1);
      this.fighters[1].reset(mid + START_GAP, -1);
      this.timer = RF.CONFIG.ROUND_TIME * RF.CONFIG.FPS;
      this.hitstop = 0;
      this.shake = 0;
      this.effects.clear();
      this.hud.reset();
      this.setPhase('intro');
    }

    setPhase(p) {
      this.phase = p;
      this.phaseTime = 0;
    }

    // ---------------- update ----------------

    update() {
      const kb = this.game.kb;
      if (kb.justPressed('Backquote')) this.showHitboxes = !this.showHitboxes;
      if (kb.justPressed('Escape', 'KeyP') && this.phase !== 'matchOver') this.paused = !this.paused;
      if (this.paused) return;

      this.frame++;
      this.phaseTime++;
      this.hud.update(this.fighters);
      this.effects.update();
      if (this.shake > 0) this.shake--;
      if (this.hitstop > 0) { this.hitstop--; return; }

      switch (this.phase) {
        case 'intro':
          if (this.phaseTime >= INTRO_FRAMES) this.setPhase('fight');
          break;
        case 'fight':
          if (--this.timer <= 0) this.endRound('time');
          break;
        case 'roundOver':
          // Brief slow-motion right after the round ends.
          if (this.phaseTime < 40 && this.phaseTime % 2) return;
          if (this.phaseTime === 70 && this.roundWinner !== null) {
            const w = this.fighters[this.roundWinner];
            if (!w.isKO) { w.vx = 0; w.state = null; w.setState('victory'); }
          }
          if (this.phaseTime >= ROUND_OVER_FRAMES) {
            if (this.wins.some((n) => n >= RF.CONFIG.ROUNDS_TO_WIN)) this.setPhase('matchOver');
            else { this.round++; this.startRound(); }
          }
          break;
        case 'matchOver':
          if (kb.justPressed('Enter', 'NumpadEnter')) this.startMatch();
          break;
      }

      const canAct = this.phase === 'fight';
      const [a, b] = this.fighters;
      const bounds = this.stageDef.bounds;
      a.update(this.inputs[0], b, canAct, bounds);
      b.update(this.inputs[1], a, canAct, bounds);
      this.separate(a, b, bounds);

      if (this.phase === 'fight') {
        this.checkHits();
        if (a.isKO || b.isKO) this.endRound('ko');
      }
    }

    // Keep fighters from walking through each other (but allow jumping over).
    separate(a, b, bounds) {
      if (a.isKO || b.isKO) return;
      const [low, high] = a.y <= b.y ? [a, b] : [b, a];
      if (high.y > low.body.height * 0.75) return;
      const minDist = (a.body.width + b.body.width) / 2;
      const dx = b.x - a.x;
      if (Math.abs(dx) >= minDist) return;
      const s = sign(dx) || (a.facing > 0 ? 1 : -1);
      const push = (minDist - Math.abs(dx)) / 2;
      a.x -= s * push;
      b.x += s * push;
      a.clampTo(bounds);
      b.clampTo(bounds);
      // If one is pinned against a wall, the other takes the whole correction.
      const rest = minDist - Math.abs(b.x - a.x);
      if (rest > 0.01) {
        if (a.atWall(bounds)) b.x += s * rest; else a.x -= s * rest;
        a.clampTo(bounds);
        b.clampTo(bounds);
      }
    }

    checkHits() {
      // Collect first so simultaneous hits trade properly.
      const hits = [];
      for (const [att, def] of [[this.fighters[0], this.fighters[1]], [this.fighters[1], this.fighters[0]]]) {
        const hb = att.getHitbox(), hurt = def.getHurtbox();
        if (hb && hurt && rectsOverlap(hb, hurt)) hits.push([att, def, hb, hurt]);
      }
      for (const [att, def, hb, hurt] of hits) {
        att.moveHasHit = true;
        const move = att.move;
        const blocked = def.receiveHit(att, move);
        // Pushing someone into the wall pushes the attacker back instead.
        if (def.atWall(this.stageDef.bounds)) att.pushVx = -att.facing * move.pushback * 0.7;
        const ex = (Math.max(hb.x, hurt.x) + Math.min(hb.x + hb.w, hurt.x + hurt.w)) / 2;
        const ey = (Math.max(hb.y, hurt.y) + Math.min(hb.y + hb.h, hurt.y + hurt.h)) / 2;
        this.effects.spawn(blocked ? 'block' : att.moveKind === 'heavy' ? 'heavy' : 'hit', ex, ey);
        this.hitstop = Math.max(this.hitstop, blocked ? 2 : move.hitstop);
        if (!blocked && att.moveKind === 'heavy') this.shake = 6;
      }
    }

    endRound(reason) {
      const [a, b] = this.fighters;
      let winner = null;
      if (reason === 'ko') {
        if (a.isKO && b.isKO) this.banner = 'DOUBLE K.O.';
        else { winner = a.isKO ? 1 : 0; this.banner = 'K.O.'; }
      } else {
        this.banner = 'TIME';
        if (a.health !== b.health) winner = a.health > b.health ? 0 : 1;
      }
      // A draw round gives nobody a point; the round is simply replayed.
      if (winner === null) this.subBanner = 'DRAW';
      else {
        this.wins[winner]++;
        this.subBanner = this.fighters[winner].def.name + ' WINS';
      }
      this.roundWinner = winner;
      this.setPhase('roundOver');
    }

    // ---------------- render ----------------

    render(ctx) {
      const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
      const floorY = this.stageDef.floorY;
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.5));
      this.stage.draw(ctx, this.frame);
      for (const f of this.fighters) f.drawShadow(ctx, floorY);
      // Whoever is attacking is drawn in front.
      const order = [...this.fighters].sort((p, q) => (p.state === 'attack') - (q.state === 'attack'));
      for (const f of order) f.draw(ctx, floorY);
      this.effects.draw(ctx, floorY);
      if (this.showHitboxes) this.drawHitboxes(ctx, floorY);
      ctx.restore();

      this.hud.draw(ctx, this);
      this.drawAnnouncements(ctx, W, H);

      if (this.paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        T(ctx, 'PAUSED', W / 2, 90, { scale: 3, align: 'center', color: BIG, outline: '#000' });
        T(ctx, 'ESC TO RESUME', W / 2, 124, { align: 'center', color: '#ccc', outline: '#000' });
      }
    }

    drawAnnouncements(ctx, W) {
      const big = (text, y = 80, scale = 4) => T(ctx, text, W / 2, y, { scale, align: 'center', color: BIG, outline: '#200000' });
      const small = (text, y) => T(ctx, text, W / 2, y, { scale: 1, align: 'center', color: '#fff', outline: '#000' });
      if (this.phase === 'intro') {
        if (this.phaseTime < 65) big('ROUND ' + this.round);
        else big('FIGHT!', 76, 5);
      } else if (this.phase === 'roundOver') {
        big(this.banner);
        if (this.phaseTime > 70) T(ctx, this.subBanner, W / 2, 118, { scale: 2, align: 'center', color: '#fff', outline: '#000' });
      } else if (this.phase === 'matchOver') {
        const w = this.wins[0] > this.wins[1] ? 0 : 1;
        big(this.fighters[w].def.name + ' WINS', 70, 3);
        T(ctx, 'PLAYER ' + (w + 1) + ' TAKES THE MATCH', W / 2, 104, { scale: 1, align: 'center', color: '#ffd030', outline: '#000' });
        if (Math.floor(this.frame / 30) % 2 === 0) small('PRESS ENTER FOR A REMATCH', 124);
      }
    }

    drawHitboxes(ctx, floorY) {
      const rect = (r, color) => {
        if (!r) return;
        ctx.strokeStyle = color;
        ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(floorY - r.y - r.h) + 0.5, Math.round(r.w), Math.round(r.h));
      };
      for (const f of this.fighters) {
        rect(f.getHurtbox(), '#40ff40');
        if (f.state === 'attack' && f.attackPhase() === 'active') {
          const h = f.move.hitbox;
          rect({ x: f.facing > 0 ? f.x + h.x : f.x - h.x - h.w, y: f.y + h.y, w: h.w, h: h.h }, '#ff3030');
        }
      }
    }
  }

  RF.FightScene = FightScene;
})();
