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
      this.fighters = [new RF.Fighter(opts.p1, 0), new RF.Fighter(opts.p2, 1, opts.p2Alt)];
      for (const f of this.fighters) f.scene = this;
      this.projectiles = [];
      this.inputs = [
        new RF.PlayerInput(game.kb, RF.CONTROLS.p1),
        new RF.PlayerInput(game.kb, RF.CONTROLS.p2),
      ];
      this.effects = new RF.Effects();
      this.hud = new RF.HUD();
      this.frame = 0;
      this.paused = false;
      this.showHitboxes = RF.CONFIG.SHOW_HITBOXES;
      const toSelect = () => game.setScene(new RF.SelectScene(game, opts));
      const toTitle = () => game.setScene(new RF.TitleScene(game));
      this.pauseMenu = new RF.ListMenu([
        { label: 'RESUME', onSelect: () => { this.paused = false; } },
        { label: 'RESTART MATCH', onSelect: () => { this.paused = false; this.startMatch(); } },
        { label: 'CHARACTER SELECT', onSelect: toSelect },
        { label: 'MAIN MENU', onSelect: toTitle },
      ]);
      this.endMenu = new RF.ListMenu([
        { label: 'REMATCH', onSelect: () => this.startMatch() },
        { label: 'CHARACTER SELECT', onSelect: toSelect },
        { label: 'MAIN MENU', onSelect: toTitle },
      ]);
      this.startMatch();
    }

    startMatch() {
      this.wins = [0, 0];
      this.round = 1;
      if (this.endMenu) this.endMenu.index = 0;
      this.startRound();
    }

    startRound() {
      const b = this.stageDef.bounds, mid = (b.left + b.right) / 2;
      this.fighters[0].reset(mid - START_GAP, 1);
      this.fighters[1].reset(mid + START_GAP, -1);
      this.timer = RF.CONFIG.ROUND_TIME ? RF.CONFIG.ROUND_TIME * RF.CONFIG.FPS : Infinity;
      this.hitstop = 0;
      this.shake = 0;
      this.flash = 0;
      this.projectiles = [];
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
      if (kb.justPressed('Escape', 'KeyP') && this.phase !== 'matchOver') {
        this.paused = !this.paused;
        this.pauseMenu.index = 0;
        return;
      }
      if (this.paused) return this.pauseMenu.update(kb);

      this.frame++;
      this.phaseTime++;
      this.hud.update(this.fighters);
      this.effects.update();
      if (this.shake > 0) this.shake--;
      if (this.flash > 0) this.flash--;
      if (this.hitstop > 0) { this.hitstop--; return; }

      switch (this.phase) {
        case 'intro':
          if (this.phaseTime >= INTRO_FRAMES) this.setPhase('fight');
          break;
        case 'fight':
          if (--this.timer <= 0) this.endRound('time'); // Infinity never runs out
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
          // Short delay so players still mashing attacks don't pick an option by accident.
          if (this.phaseTime > 60) this.endMenu.update(kb);
          break;
      }

      const canAct = this.phase === 'fight';
      const [a, b] = this.fighters;
      const bounds = this.stageDef.bounds;
      a.update(this.inputs[0], b, canAct, bounds);
      b.update(this.inputs[1], a, canAct, bounds);
      this.separate(a, b, bounds);
      this.updateProjectiles(bounds);

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

    opponentOf(f) {
      return this.fighters[0] === f ? this.fighters[1] : this.fighters[0];
    }

    checkHits() {
      // Collect first so simultaneous hits trade properly.
      const hits = [];
      for (const att of this.fighters) {
        const def = this.opponentOf(att);
        const hb = att.getHitbox(), hurt = def.getHurtbox();
        if (hb && hurt && rectsOverlap(hb, hurt)) hits.push([att, def, hb, hurt]);
      }
      for (const [att, def, hb, hurt] of hits) {
        att.moveHasHit = true;
        const ex = (Math.max(hb.x, hurt.x) + Math.min(hb.x + hb.w, hurt.x + hurt.w)) / 2;
        const ey = (Math.max(hb.y, hurt.y) + Math.min(hb.y + hb.h, hurt.y + hurt.h)) / 2;
        this.applyHit(att, def, att.move, att.moveKind === 'heavy' ? 'heavy' : 'hit', ex, ey);
      }
    }

    // Every source of damage (normals, specials, projectiles) goes through
    // here. Returns 'perfect', 'block' or 'hit'.
    applyHit(att, def, move, spark, ex, ey) {
      if (this.phase !== 'fight' || def.isKO) return null;
      const bounds = this.stageDef.bounds;

      if (def.isPerfectBlockAgainst(att)) {
        this.effects.spawn('perfect', ex, ey);
        this.effects.spawnText('PERFECT!', def.x, def.body.height + 14, '#8ff0ff');
        this.effects.spawnText(def.special.name.toUpperCase() + '!', def.x, def.body.height + 4, '#ffd030', 12);
        this.hitstop = Math.max(this.hitstop, 14);
        this.flash = 6;
        if (!att.isKO && att.state !== 'special') att.stagger(RF.CONFIG.PERFECT_BLOCK_STAGGER);
        def.startSpecial();
        return 'perfect';
      }

      const blocked = def.receiveHit(att, move);
      // Pushing someone into the wall pushes the attacker back instead.
      if (def.atWall(bounds) && Math.abs(att.x - def.x) < 80) att.pushVx = -sign(def.x - att.x) * move.pushback * 0.7;
      this.effects.spawn(blocked ? 'block' : spark, ex, ey);
      this.hitstop = Math.max(this.hitstop, blocked ? 2 : move.hitstop);
      if (!blocked && (spark === 'heavy' || move.special)) this.shake = Math.max(this.shake, 6);
      return blocked ? 'block' : 'hit';
    }

    spawnProjectile(f, s) {
      const size = s.size * f.body.scale;
      this.projectiles.push({
        owner: f, cfg: s, move: RF.specialMove(f, s),
        x: f.x + f.facing * f.body.width * 0.7, y: f.y + f.body.height * s.height - size / 2,
        vx: f.facing * s.speed, w: size, h: size * 0.75, t: 0,
      });
    }

    updateProjectiles(bounds) {
      for (const p of this.projectiles) {
        p.x += p.vx;
        p.t++;
        if (p.x < bounds.left - 20 || p.x > bounds.right + 20) p.dead = true;
      }
      // Two projectiles meeting cancel each other out.
      for (const p of this.projectiles) for (const q of this.projectiles) {
        if (p !== q && p.owner !== q.owner && !p.dead && !q.dead && rectsOverlap(this.projBox(p), this.projBox(q))) {
          p.dead = q.dead = true;
          this.effects.spawn('hit', (p.x + q.x) / 2, p.y + p.h / 2);
        }
      }
      if (this.phase === 'fight') {
        for (const p of this.projectiles) {
          if (p.dead) continue;
          const target = this.opponentOf(p.owner);
          const hurt = target.getHurtbox();
          if (hurt && rectsOverlap(this.projBox(p), hurt)) {
            p.dead = true;
            this.applyHit(p.owner, target, p.move, 'hit', p.x, p.y + p.h / 2);
          }
        }
      }
      this.projectiles = this.projectiles.filter((p) => !p.dead);
    }

    projBox(p) { return { x: p.x - p.w / 2, y: p.y, w: p.w, h: p.h }; }

    drawProjectiles(ctx, floorY) {
      for (const p of this.projectiles) {
        const [c0, c1, c2] = p.cfg.colors;
        const x = Math.round(p.x), y = Math.round(floorY - p.y - p.h / 2);
        const dir = Math.sign(p.vx);
        for (let i = 1; i <= 4; i++) { // trail
          ctx.fillStyle = c2;
          const r = Math.max(1, Math.round(p.h / 2 - i * 1.5));
          ctx.fillRect(x - dir * i * 5 - r, y - r + ((p.t + i) % 3) - 1, r * 2, r * 2);
        }
        const rw = Math.round(p.w / 2), rh = Math.round(p.h / 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(x - rw - 1, y - rh, rw * 2 + 2, rh * 2);
        ctx.fillRect(x - rw, y - rh - 1, rw * 2, rh * 2 + 2);
        ctx.fillStyle = c1;
        ctx.fillRect(x - rw, y - rh, rw * 2, rh * 2);
        ctx.fillStyle = c0;
        ctx.fillRect(x - rw + 2 + (dir > 0 ? 2 : 0), y - rh + 1, Math.max(2, rw - 1), Math.max(2, rh - 1));
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
      this.drawProjectiles(ctx, floorY);
      this.effects.draw(ctx, floorY);
      if (this.showHitboxes) this.drawHitboxes(ctx, floorY);
      ctx.restore();

      if (this.flash) {
        ctx.fillStyle = `rgba(200,240,255,${this.flash * 0.06})`;
        ctx.fillRect(0, 0, W, H);
      }
      this.hud.draw(ctx, this);
      this.drawAnnouncements(ctx, W, H);

      if (this.paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        T(ctx, 'PAUSED', W / 2, 60, { scale: 3, align: 'center', color: BIG, outline: '#000' });
        this.pauseMenu.draw(ctx, W / 2, 100, this.frame + this.pauseMenu.index, { spacing: 16 });
      }
    }

    drawAnnouncements(ctx, W) {
      const band = (y, h) => {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, y, W, h);
      };
      if (this.phase === 'intro' || this.phase === 'roundOver') band(70, 64);
      else if (this.phase === 'matchOver') band(60, 120);
      const big = (text, y = 80, scale = 4) => T(ctx, text, W / 2, y, { scale, align: 'center', color: BIG, outline: '#200000' });
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
        if (this.phaseTime > 60) this.endMenu.draw(ctx, W / 2, 128, this.frame, { spacing: 14 });
      }
    }

    drawHitboxes(ctx, floorY) {
      const rect = (r, color) => {
        if (!r) return;
        ctx.strokeStyle = color;
        ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(floorY - r.y - r.h) + 0.5, Math.round(r.w), Math.round(r.h));
      };
      for (const p of this.projectiles) rect(this.projBox(p), '#ff3030');
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
