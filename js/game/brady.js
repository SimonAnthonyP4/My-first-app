// MS. BRADY: assistant principal. Strict, demanding, and King Sirven's right hand.
// The ADMINISTRATION assist (she radios Sirven in; his taunt radios her in), her
// walkie-talkie, her move effects, her entrance and her fatality (EXPELLED) live here.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  // A walkie-talkie (x, y = its bottom centre).
  RF.drawWalkie = function (ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s, s);
    R(ctx, '#111', -3, -10, 7, 10); R(ctx, '#2a2a30', -2, -9, 5, 8);
    R(ctx, '#80c060', -1, -8, 3, 2);                 // little screen
    R(ctx, '#111', 2, -15, 1, 5);                    // antenna
    R(ctx, '#ff3030', -2, -10, 1, 1);                // power light
    ctx.restore();
  };

  // ---------------------------------------------------------------- THE ADMINISTRATION
  // A teammate storms in from behind `owner`, charges across the stage and hits whoever is in
  // the way. It rides the projectile system (so it can be blocked, and a fireball can stop it).
  //   actor  - character id of who comes in ('sirven' for Ms. Brady, 'brady' for Sirven)
  //   opts   - { damage, speed, line, hitText }
  RF.spawnAssist = function (scene, owner, actor, opts = {}) {
    const b = scene.stageDef.bounds, def = RF.getCharacter(actor);
    if (!def) return false;
    const cfg = { art: 'assistRunner', actor, ground: true, colors: ['#ffffff', '#ffd030', '#c08010'], hitText: opts.hitText || 'SUSPENDED!', line: opts.line || '', damage: opts.damage || 12, hitstun: 30, blockstun: 14, pushback: 6, hitstop: 10, launch: 4 };
    const move = RF.specialMove(owner, cfg);
    scene.projectiles.push({
      owner, cfg, move, baseDamage: move.damage,
      x: owner.facing > 0 ? b.left - 12 : b.right + 12, y: 0,
      vx: owner.facing * (opts.speed || 6.5), w: 26, h: Math.round(def.body.height * 0.8), t: 0,
      sprite: RF.createSprite(def), body: def.body,
    });
    RF.audio.sfx('whoosh');
    return true;
  };

  RF.PROJECTILE_ART.assistRunner = function (ctx, x, y, t, dir, p, floorY) {
    const fy = floorY - p.y;
    ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, floorY + 1, 14, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // speed lines behind, then the teammate mid-sprint
    for (let i = 0; i < 4; i++) R(ctx, 'rgba(255,255,255,0.5)', x - dir * (18 + i * 7), fy - 20 - i * 12, 8, 1);
    p.sprite.draw(ctx, 'walk', (t / 4) % 4, x, fy, dir);
    if (t < 40 && p.cfg.line) T(ctx, p.cfg.line, x, fy - p.body.height - 14, { align: 'center', color: '#ffd030', outline: '#000' });
  };

  // CALL THE PRINCIPAL (Ms. Brady's signature): she radios the office... and King Sirven charges
  // in. If she's fighting Sirven himself, she writes him up instead.
  RF.SPECIAL_KINDS.assist = {
    start(f) { f.vx = 0; },
    update(f, scene) {
      const s = f.special, t = f.stateTime, opp = scene.opponentOf(f);
      if (t === 1) { RF.audio.sfx('pa'); scene.effects.spawnText(s.callout, f.x, f.body.height + 16, '#ffd030'); }
      if (t === s.startup) {
        if (opp.def.id === s.actor) { // can't call the boss on the boss
          scene.effects.spawnText(s.fallbackLine || '...FINE. I\'LL DO IT MYSELF.', f.x, f.body.height + 26, '#ffffff');
          scene.spawnProjectile(f, (s.fallback && RF.SPECIALS[s.fallback]) || RF.BRADY_SLIP);
        } else {
          RF.spawnAssist(scene, f, s.actor, { damage: s.damage, speed: f.superActive ? 8.5 : 6.5, line: s.line, hitText: s.hitText });
          if (f.superActive) RF.spawnAssist(scene, f, s.actor, { damage: s.damage * 0.5, speed: 5, line: '', hitText: 'AND STAY OUT!' }); // the super sends a second wave
        }
      }
      if (t >= s.startup + s.recovery) f.setState('idle');
    },
    anim(f) { return ['special', f.stateTime < f.special.startup ? 0 : 1]; },
  };

  // ---------------------------------------------------------------- move effects
  Object.assign(RF.MOVE_FX, {
    // STOP.: a firm open palm - a ghost of the hand pushes out, and "STOP." if it lands.
    stopPalm(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 8) return;
      const a = t - m.startup, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w - 4 + a), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.globalAlpha = Math.max(0, 0.5 - a / 16); ctx.fillStyle = '#ffffff';
      R(ctx, '#ffffff', x - 3, y - 6, 6, 9);                                   // palm
      for (let i = 0; i < 4; i++) R(ctx, '#ffffff', x - 3 + i * 2 - (f.facing < 0 ? 1 : 0), y - 11, 1, 5); // fingers
      ctx.globalAlpha = 1;
      if (f.moveHasHit && a < 14) T(ctx, 'STOP.', x, y - 22, { align: 'center', color: '#ffffff', outline: '#000' });
    },
    // WALKIE SMACK: crackling static around the radio, and "OVER." if it lands.
    walkieSmack(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 10) return;
      const a = t - m.startup, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.7), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.strokeStyle = '#a0e0ff'; ctx.globalAlpha = Math.max(0, 0.9 - a / 12);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); let px = x - 10, py = y - 8 + i * 8; ctx.moveTo(px, py);
        for (let k = 0; k < 5; k++) { px += 5; py += ((frame + k + i) % 2 ? -3 : 3); ctx.lineTo(px, py); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (f.moveHasHit && a < 14) T(ctx, 'OVER.', x, y - 26, { align: 'center', color: '#a0e0ff', outline: '#000' });
    },
  });

  // ---------------------------------------------------------------- entrance
  // Walks in talking into her walkie-talkie.
  RF.INTROS.walkieIn = {
    update(f, t, scene) {
      const W = RF.CONFIG.WIDTH, from = f.facing > 0 ? -30 : W + 30;
      if (t < 40) { f.x = from + (f.homeX - from) * Math.min(1, t / 40); f.state = 'walk'; f.stateTime = t; }
      if (t === 40) { f.x = f.homeX; f.state = 'idle'; }
      if (t === 4) { RF.audio.sfx('pa'); scene.effects.spawnText('BRADY TO FRONT OFFICE.', f.homeX, f.body.height + 30, '#ffd030'); }
      if (t === 34) scene.effects.spawnText('...COPY. I\'M ON IT.', f.homeX, f.body.height + 20, '#ffffff');
      if (t === 60) { RF.audio.sfx('paper'); scene.effects.spawnText('YOU. HALL PASS. NOW.', f.homeX, f.body.height + 24, '#ff4040'); }
    },
    draw(f, ctx, floorY, t) {
      if (t > 58) return;
      RF.drawWalkie(ctx, f.x + f.facing * 6, floorY - f.y - f.body.height * 0.78, 1); // radio at her ear
      if (t % 10 < 5) T(ctx, '((', f.x + f.facing * 14, floorY - f.body.height * 0.95, { align: 'center', color: '#a0e0ff' });
    },
  };

  // ---------------------------------------------------------------- fatality: EXPELLED
  // She radios it in. A giant rubber stamp drops out of the sky: EXPELLED. Then King Sirven
  // walks in to sign off on it.
  RF.FINISHERS.expelled = {
    name: 'Expelled',
    duration: 220,
    update(att, vic, t, scene) {
      att.finisherAnim = t < 40 ? ['special', 0] : t < 90 ? ['victory', 0] : ['victory', (t >> 4) % 2];
      if (t === 4) { RF.audio.sfx('pa'); scene.effects.spawnText('BRADY TO OFFICE. WE HAVE A SITUATION.', RF.CONFIG.WIDTH / 2, 118, '#ffd030'); }
      if (t === 30) scene.effects.spawnText('PERMISSION TO EXPEL?', att.x, att.body.height + 22, '#ffffff');
      if (t === 46) { RF.audio.sfx('pa'); scene.effects.spawnText('GRANTED.', RF.CONFIG.WIDTH / 2, 112, '#ffd030'); }
      if (t === 60) RF.audio.sfx('whoosh');
      if (t === 74) { RF.audio.sfx('stomp'); RF.audio.sfx('boom'); scene.shake = 24; scene.flash = 6; }
      if (t === 150) scene.effects.spawnText('GOOD WORK, MS. BRADY.', this.sirvenX(att, t), 120, '#ffd040');
      if (t === 176) scene.effects.spawnText('THANK YOU, SIR.', att.x, att.body.height + 24, '#ffffff');
    },
    stampY(t, floorY) { return t < 56 ? -80 : t < 74 ? -80 + (floorY - 4 + 80) * ((t - 56) / 18) ** 2 : t < 110 ? floorY - 4 : floorY - 4 - (t - 110) * 4; },
    sirvenX(att, t) { const W = RF.CONFIG.WIDTH, from = att.facing > 0 ? -30 : W + 30; return from + (att.x - att.facing * 40 - from) * Math.min(1, Math.max(0, (t - 116) / 30)); },
    drawVictim(vic, ctx, floorY, t) {
      if (vic.dismembered) return;
      vic.sprite.draw(ctx, t < 60 ? 'dazed' : 'hit', 0, vic.x, floorY, vic.facing);
    },
    drawFx(att, vic, ctx, floorY, t, frame) {
      if (t < 40) RF.drawWalkie(ctx, att.x + att.facing * 6, floorY - att.body.height * 0.78, 1);
      // the stamp: shadow first, then the giant wooden-handled stamp
      if (t >= 50 && t < 160) {
        const sy = this.stampY(t, floorY), sw = 56;
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(vic.x, floorY, sw / 2 * Math.min(1, (t - 50) / 20), 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        R(ctx, '#111', vic.x - 8, sy - 74, 16, 44); R(ctx, '#8a5a2a', vic.x - 7, sy - 73, 14, 42);  // handle
        R(ctx, '#111', vic.x - 14, sy - 84, 28, 12); R(ctx, '#a06a32', vic.x - 13, sy - 83, 26, 10); // knob
        R(ctx, '#111', vic.x - sw / 2, sy - 32, sw, 30); R(ctx, '#3a3a40', vic.x - sw / 2 + 1, sy - 31, sw - 2, 20); // block
        R(ctx, '#c01818', vic.x - sw / 2 + 1, sy - 11, sw - 2, 9);                                 // red rubber
      }
      // the stamp mark left behind
      if (t >= 74) {
        const k = Math.min(1, (t - 74) / 6);
        ctx.globalAlpha = 0.9 * k;
        T(ctx, 'EXPELLED', vic.x, floorY - 70, { scale: 2, align: 'center', color: '#e01818', outline: '#300000' });
        ctx.strokeStyle = '#e01818'; ctx.lineWidth = 2; ctx.strokeRect(vic.x - 54, floorY - 74, 108, 22); ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
      }
      // King Sirven walks in to sign off on it
      if (t >= 116) {
        const sp = this.sp || (this.sp = RF.createSprite(RF.getCharacter('sirven')));
        const sx = this.sirvenX(att, t), walking = t < 146;
        sp.draw(ctx, walking ? 'walk' : 'idle', walking ? (t / 4) % 4 : 0, sx, floorY, att.facing);
      }
    },
  };
  RF.FATALITY_STYLE.expelled = 'crush';
  RF.FATALITY_CLIMAX.expelled = 74;
})();
