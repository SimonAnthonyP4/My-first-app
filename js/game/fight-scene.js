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
      RF.audio.playSong(this.stageDef.music);
      this.fighters = [new RF.Fighter(opts.p1, 0), new RF.Fighter(opts.p2, 1, opts.p2Alt)];
      for (const f of this.fighters) f.scene = this;
      this.projectiles = [];
      this.inputs = [
        new RF.PlayerInput(game.kb, RF.CONTROLS.p1),
        opts.cpu ? new RF.AIInput(game.kb, this, 1) : new RF.PlayerInput(game.kb, RF.CONTROLS.p2),
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
      this.toastyShown = false;
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
      this.comboText = null;
      this.finisher = null;      // the finisher being performed, if any
      this.finishVictim = null;  // who is dazed waiting to be finished
      this.finishOffered = false;
      this.firstHit = false;
      this.flawless = false;
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
      if (this.comboText && --this.comboText.t <= 0) this.comboText = null;
      if (this.toasty && ++this.toasty.t > 70) this.toasty = null;
      for (const f of this.fighters) f.tickVisuals();
      if (this.hitstop > 0) { this.hitstop--; return; }

      switch (this.phase) {
        case 'intro':
          if (this.phaseTime === 1) RF.audio.sfx('gong');

          if (this.phaseTime === 65) RF.audio.sfx('fight');
          if (this.phaseTime >= INTRO_FRAMES) this.setPhase('fight');
          break;
        case 'fight':
          if (this.phaseTime === 1 && this.round === 1) { // opening line, once the banners clear
            for (const f of this.fighters) if (f.def.quote) this.effects.spawnText(f.def.quote, f.x, f.body.height + 12, '#e8dcc0');
          }
          if (--this.timer <= 0) this.endRound('time'); // Infinity never runs out
          break;
        case 'finish':
          if (this.finisher) {
            const fin = this.finisher;
            fin.t++;
            fin.kind.update(fin.att, fin.vic, fin.t, this);
            if (fin.t >= fin.kind.duration) this.endRound('finisher');
          } else if (this.phaseTime >= RF.CONFIG.FINISH_TIME && this.finishVictim.state === 'dazed') {
            this.finishVictim.knockOut(-this.finishVictim.facing); // too slow: they just collapse
          }
          break;
        case 'roundOver':
          // Brief slow-motion right after the round ends.
          if (this.phaseTime < 40 && this.phaseTime % 2) return;
          if (this.phaseTime === 70 && this.roundWinner !== null) {
            const w = this.fighters[this.roundWinner];
            if (!w.isKO) { w.vx = 0; w.state = null; w.setState('victory'); }
            if (w.def.winQuote && w.state === 'victory') this.effects.spawnText(w.def.winQuote, w.x, w.body.height + 12, '#e8dcc0');
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

      // During FINISH THEM! only the winner can move.
      const canAct = (f) => this.phase === 'fight' || (this.phase === 'finish' && !this.finisher && f !== this.finishVictim);
      const [a, b] = this.fighters;
      const bounds = this.stageDef.bounds;
      for (const input of this.inputs) if (input.think) input.think();
      a.update(this.inputs[0], b, canAct(a), bounds);
      b.update(this.inputs[1], a, canAct(b), bounds);
      this.separate(a, b, bounds);
      this.updateProjectiles(bounds);

      if (this.phase === 'fight' || (this.phase === 'finish' && !this.finisher)) {
        this.checkHits();
        if (a.isKO || b.isKO) this.endRound('ko');
      }
    }

    // Keep fighters from walking through each other (but allow jumping over).
    separate(a, b, bounds) {
      if (a.isKO || b.isKO) return;
      if ([a.state, b.state].some((s) => s === 'thrown' || s === 'throwing')) return;
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

    // ---- throws ----

    // ---- FINISH THEM! ----

    // Called when a fighter is about to be knocked out. If it's the blow that
    // wins the match, they're left dazed for a finisher instead.
    tryDaze(f) {
      const opp = this.opponentOf(f);
      if (this.phase !== 'fight' || this.finishOffered || f.state === 'dazed' || opp.isKO || opp.health <= 0) return false;
      if (this.wins[opp.side] + 1 < RF.CONFIG.ROUNDS_TO_WIN) return false;
      this.finishOffered = true;
      this.finishVictim = f;
      f.health = 0;
      f.move = null;
      f.state = null;
      f.setState('dazed');
      this.projectiles = [];
      this.setPhase('finish');
      RF.audio.sfx('gong');
      return true;
    }

    startFinisher(att, vic) {
      const kind = RF.FINISHERS[att.def.finisher];
      if (!kind) return false;
      this.finisher = { kind, att, vic, t: 0 };
      att.faceOpponent(vic);
      vic.facing = -att.facing;
      att.vx = vic.vx = att.pushVx = vic.pushVx = 0;
      att.state = null; att.setState('finishing');
      vic.state = null; vic.setState('finished');
      this.effects.spawnText(kind.name.toUpperCase() + '!', att.x, att.body.height + 12, '#ff4020');
      RF.audio.sfx('grab');
      return true;
    }

    tryGrab(att) {
      const def = this.opponentOf(att);
      const gap = Math.abs(def.x - att.x) - (att.body.width + def.body.width) / 2;
      if (def.state === 'dazed' && gap <= RF.CONFIG.THROW_RANGE + 24) { this.startFinisher(att, def); return; }
      const grabbable = ['idle', 'walk', 'crouch', 'block', 'attack', 'throwReach'].includes(def.state);
      if (this.phase !== 'fight' || !att.grounded || !def.grounded || !grabbable || gap > RF.CONFIG.THROW_RANGE) return;
      if (def.state === 'throwReach') return this.breakThrow(att, def); // both grabbed at once
      att.faceOpponent(def);
      att.beginThrowing(def);
      this.hitstop = Math.max(this.hitstop, 4);
      this.effects.spawnText(att.throwCfg.name.toUpperCase() + '!', att.x, att.body.height + 10, '#ff9a40');
      RF.audio.sfx('grab');
    }

    // Damage dealt during a throw. Pass `fling` ({vx, vy}) to let go of the victim.
    throwHit(att, def, base, fling) {
      const dmg = base * att.stats.damage * (1 - def.stats.damageReduction);
      if (this.phase === 'fight') def.health = Math.max(0, def.health - dmg);
      def.flash = 3;
      this.hitstop = Math.max(this.hitstop, fling ? 8 : 4);
      RF.audio.sfx(fling ? 'heavy' : 'hit');
      if (fling || def.health <= 0) {
        def.releaseFromThrow(fling || { vx: att.facing * 3, vy: 4 });
        att.throwRecover = 14;
      }
    }

    // Throw broken (or both grabbed at once): shove both fighters apart.
    breakThrow(a, b) {
      for (const f of [a, b]) {
        const away = Math.sign(f.x - this.opponentOf(f).x) || -f.facing;
        f.victim = f.grabber = null;
        f.combo = 0;
        f.state = null;
        f.stun = 12;
        f.setState('hitstun');
        f.pushVx = away * 5;
      }
      a.throwRecover = 0;
      this.effects.spawnText('BREAK!', (a.x + b.x) / 2, Math.max(a.body.height, b.body.height) + 8, '#8ff0ff');
      this.effects.spawn('block', (a.x + b.x) / 2, 45);
      RF.audio.sfx('block');
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
        // Ranged effects (lightning) stop at the opponent's body.
        att.fxHitDist = att.facing > 0 ? hurt.x - att.x + 2 : att.x - (hurt.x + hurt.w) + 2;
        const ex = (Math.max(hb.x, hurt.x) + Math.min(hb.x + hb.w, hurt.x + hurt.w)) / 2;
        const ey = (Math.max(hb.y, hurt.y) + Math.min(hb.y + hb.h, hurt.y + hurt.h)) / 2;
        this.applyHit(att, def, att.move, /heavy/i.test(att.moveKind) ? 'heavy' : 'hit', ex, ey);
      }
    }

    // Every source of damage (normals, specials, projectiles) goes through
    // here. Returns 'perfect', 'block' or 'hit'.
    applyHit(att, def, move, spark, ex, ey) {
      if ((this.phase !== 'fight' && this.phase !== 'finish') || def.isKO) return null;
      const bounds = this.stageDef.bounds;

      if (def.isPerfectBlockAgainst(att, move)) {
        this.effects.spawn('perfect', ex, ey);
        this.effects.spawnText('PERFECT!', def.x, def.body.height + 14, '#8ff0ff');
        this.effects.spawnText(def.special.name.toUpperCase() + '!', def.x, def.body.height + 4, '#ffd030', 12);
        this.hitstop = Math.max(this.hitstop, 14);
        this.flash = 6;
        RF.audio.sfx('perfect');
        if (!att.isKO && att.state !== 'special') att.stagger(RF.CONFIG.PERFECT_BLOCK_STAGGER);
        def.startSpecial();
        return 'perfect';
      }

      const blocked = def.receiveHit(att, move);
      if (!blocked && !this.firstHit) {
        this.firstHit = true;
        this.effects.spawnText('FIRST HIT!', att.x, att.body.height + 20, '#ff6050');
      }
      // Rare easter egg on a big hit
      if (!blocked && !this.toastyShown && (move.special || move.knockback) && Math.random() < 0.08) {
        this.toastyShown = true;
        this.toasty = { t: 0 };
        RF.audio.sfx('toasty');
      }
      if (!blocked && def.combo >= 2) this.comboText = { side: att.side, hits: def.combo, t: 70 };
      // Pushing someone into the wall pushes the attacker back instead.
      if (def.atWall(bounds) && Math.abs(att.x - def.x) < 80) att.pushVx = -sign(def.x - att.x) * move.pushback * 0.7;
      this.effects.spawn(blocked ? def.def.blockSpark || 'block' : spark, ex, ey);
      if (!blocked && move.knockback && def.grounded) this.effects.spawn('dust', def.x, 1); // skid
      // Hulk-strength fighters: every hit they land is a seismic event.
      const imp = att.def.impact;
      if (imp) {
        this.shake = Math.max(this.shake, blocked ? Math.round(imp.shake / 2) : imp.shake);
        if (!blocked) {
          this.hitstop += imp.hitstop;
          this.effects.spawn('shock', ex, Math.max(4, ey - 10));
          RF.audio.sfx('boom');
        }
      }
      if (move.fx === 'lightning' && !blocked) { this.flash = Math.max(this.flash, 3); this.effects.spawn('zap', ex, ey + 8); }
      RF.audio.sfx(blocked ? (def.def.blockSound || (def.def.blockFx ? 'shield' : 'block')) : spark === 'heavy' || move.special ? 'heavy' : 'hit');
      this.hitstop = Math.max(this.hitstop, blocked ? 2 : move.hitstop);
      if (!blocked && (spark === 'heavy' || move.special)) this.shake = Math.max(this.shake, 6);
      return blocked ? 'block' : 'hit';
    }

    spawnProjectile(f, s) {
      RF.audio.sfx(s.sound || 'special');
      const size = s.size * f.body.scale;
      this.glyphCount = (this.glyphCount || 0) + 1;
      this.projectiles.push({
        owner: f, cfg: s, move: RF.specialMove(f, s),
        x: f.x + f.facing * f.body.width * 0.7, y: f.y + f.body.height * s.height - size / 2,
        vx: f.facing * s.speed, w: size, h: size * 0.75, t: 0,
        glyph: s.glyphs ? s.glyphs[this.glyphCount % s.glyphs.length] : null, // math-symbol projectiles
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
        if (p.cfg.art && RF.PROJECTILE_ART[p.cfg.art]) {
          RF.PROJECTILE_ART[p.cfg.art](ctx, x, y, p.t, dir, p);
          continue;
        }
        if (p.glyph) {
          // A spinning chalk-white math symbol with a dusty trail.
          for (let i = 1; i <= 5; i++) {
            ctx.fillStyle = `rgba(230,230,210,${0.5 - i * 0.08})`;
            ctx.fillRect(x - dir * i * 4, y + Math.round(Math.sin((p.t + i) * 0.8) * 2), 2, 2);
          }
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.round(p.t / 3) * (Math.PI / 8) * dir); // chunky, stepped spin
          RF.font.drawText(ctx, p.glyph, 0, -7, { scale: 2, align: 'center', color: [c0, c0, c0, c1, c1, c1, c2], outline: '#101010' });
          ctx.restore();
          continue;
        }
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
      if (reason === 'finisher') {
        winner = this.finisher.att.side;
        this.banner = 'FINISHER!';
      } else if (reason === 'ko') {
        RF.audio.sfx('ko');
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
      this.flawless = winner !== null && this.fighters[winner].health >= this.fighters[winner].maxHealth;
      if (this.flawless) RF.audio.sfx('perfect');
      this.setPhase('roundOver');
    }

    // ---------------- render ----------------

    render(ctx) {
      const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
      const floorY = this.stageDef.floorY;
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.5));
      this.stage.draw(ctx, this.frame);
      for (const f of this.fighters) if (f.state !== 'finished') f.drawShadow(ctx, floorY);
      // Whoever is attacking is drawn in front.
      const order = [...this.fighters].sort((p, q) => (p.state === 'attack') - (q.state === 'attack'));
      const fin = this.finisher;
      for (const f of order) {
        if (fin && f === fin.vic) fin.kind.drawVictim(f, ctx, floorY, fin.t, this.frame, fin.att);
        else f.draw(ctx, floorY);
      }
      if (fin && fin.kind.drawFx) fin.kind.drawFx(fin.att, fin.vic, ctx, floorY, fin.t, this.frame);
      this.drawProjectiles(ctx, floorY);
      for (const f of this.fighters) {
        if (f.state === 'special' && f.specialKind.draw) f.specialKind.draw(f, ctx, floorY, this.frame);
        if (f.state === 'throwing' && f.victim && f.throwKind.draw) f.throwKind.draw(f, f.victim, ctx, floorY, this.frame);
      }
      this.effects.draw(ctx, floorY);
      if (this.showHitboxes) this.drawHitboxes(ctx, floorY);
      ctx.restore();

      if (this.flash) {
        ctx.fillStyle = `rgba(200,240,255,${this.flash * 0.06})`;
        ctx.fillRect(0, 0, W, H);
      }
      this.hud.draw(ctx, this);
      if (this.toasty) this.drawToasty(ctx, W, H);
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
      } else if (this.phase === 'finish' && !this.finisher) {
        band(66, 60);
        if (Math.floor(this.phaseTime / 8) % 4 !== 3) big('FINISH THEM!', 74, 4);
        T(ctx, 'GET CLOSE AND PRESS THROW', W / 2, 110, { align: 'center', color: '#ffd030', outline: '#000' });
      } else if (this.phase === 'roundOver') {
        big(this.banner);
        if (this.phaseTime > 70) T(ctx, this.subBanner, W / 2, 118, { scale: 2, align: 'center', color: '#fff', outline: '#000' });
        if (this.flawless && this.phaseTime > 90) {
          T(ctx, 'FLAWLESS VICTORY', W / 2, 138, { scale: 2, align: 'center', color: ['#ffffff', '#fff6b0', '#ffe060', '#ffc030', '#ff9a10', '#ff7000', '#e04000'], outline: '#200000' });
        }
      } else if (this.phase === 'matchOver') {
        const w = this.wins[0] > this.wins[1] ? 0 : 1;
        big(this.fighters[w].def.name + ' WINS', 70, 3);
        T(ctx, (w === 1 && this.opts.cpu ? 'THE CPU' : 'PLAYER ' + (w + 1)) + ' TAKES THE MATCH', W / 2, 104, { scale: 1, align: 'center', color: '#ffd030', outline: '#000' });
        if (this.phaseTime > 60) this.endMenu.draw(ctx, W / 2, 128, this.frame, { spacing: 14 });
      }
    }

    // Easter egg: Dr. Weissenberg's head pops up in the corner.
    drawToasty(ctx, W, H) {
      if (!this.toastyHead) {
        const def = RF.getCharacter('weissenberg');
        if (!def || def.sprite.type !== 'pixel') { this.toasty = null; return; }
        const s = def.sprite, S = 4, rows = s.grid.slice(0, s.neckRow);
        const [c, cx] = RF.util.makeCanvas(rows[0].length * S, rows.length * S);
        rows.forEach((row, r) => [...row].forEach((ch, col) => {
          if (ch === '.') return;
          cx.fillStyle = s.palette[s.legend[ch]];
          cx.fillRect(col * S, r * S, S, S);
        }));
        this.toastyHead = c;
      }
      const t = this.toasty.t, head = this.toastyHead;
      const rise = t < 8 ? t / 8 : t > 60 ? (70 - t) / 10 : 1;
      const y = H - head.height * rise;
      ctx.drawImage(head, W - head.width - 6, Math.round(y));
      if (t > 8 && t < 60) T(ctx, 'SHOCKING!', W - head.width - 10, H - head.height + 4, { align: 'right', color: '#9ff0ff', outline: '#000' });
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
