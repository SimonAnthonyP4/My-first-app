// BANDY: street fighter, skater, rock and roll. Everything that's only his lives here:
// the skateboard and guitar art, his move effects, the soundwave projectile, his
// skate-in entrance and his fatality (ENCORE).
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  // A skateboard on the ground (x = centre, y = the floor under the wheels), optionally
  // flipping (spin 0..1 = one full kickflip roll) and tilted (angle, radians).
  RF.drawSkateboard = function (ctx, x, y, facing = 1, angle = 0, spin = 0) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    const flip = Math.cos(spin * Math.PI * 2); // squash for the kickflip roll
    ctx.scale(1, Math.abs(flip) < 0.15 ? 0.15 : flip);
    const top = flip >= 0;
    R(ctx, '#111', -15, -6, 30, 4);                               // outline
    R(ctx, top ? '#2a2a30' : '#ff3060', -14, -5, 28, 2);          // grip tape on top, graphic underneath
    if (!top) { R(ctx, '#ffd030', -6, -5, 4, 2); R(ctx, '#ffffff', 2, -5, 3, 2); }
    R(ctx, '#111', -16 * facing - (facing < 0 ? 1 : 0), -7, 2, 2); // kicktails
    R(ctx, '#111', 14 * facing - (facing < 0 ? 1 : 0), -7, 2, 2);
    R(ctx, '#8a8a94', -10, -2, 4, 1); R(ctx, '#8a8a94', 6, -2, 4, 1); // trucks
    for (const wx of [-10, -7, 6, 9]) R(ctx, '#f0e8d8', wx, -1, 2, 2); // wheels
    ctx.restore();
  };

  // An electric guitar (x, y = where the hands hold the body; angle 0 = neck pointing right).
  RF.drawGuitar = function (ctx, x, y, angle = 0, s = 1, color = '#d81830') {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.scale(s, s);
    R(ctx, '#111', 4, -2, 26, 4);           // neck outline
    R(ctx, '#7a4a22', 5, -1, 24, 2);        // neck
    for (let i = 8; i < 28; i += 4) R(ctx, '#c8c0a0', i, -1, 1, 2); // frets
    R(ctx, '#111', 28, -3, 7, 6); R(ctx, '#222', 29, -2, 5, 4);     // headstock
    R(ctx, '#d8d8d8', 30, -3, 1, 1); R(ctx, '#d8d8d8', 32, -3, 1, 1); R(ctx, '#d8d8d8', 30, 2, 1, 1); R(ctx, '#d8d8d8', 32, 2, 1, 1);
    // the body: two lobes and a pointy horn (rock!)
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(-4, 0, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, 1, 6, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(-4, 0, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, 1, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
    R(ctx, '#f0f0f0', -6, -3, 7, 5);        // pickguard
    R(ctx, '#111', -4, -2, 1, 3); R(ctx, '#111', -1, -2, 1, 3);     // pickups
    R(ctx, '#c0c0c8', -10, -1, 2, 2);       // bridge
    R(ctx, '#e8e0c0', -9, 0, 38, 1);        // strings
    ctx.restore();
  };

  // ---------------------------------------------------------------- move effects + aura
  Object.assign(RF.MOVE_FX, {
    // BOARD SWING: a pink arc where the skateboard passes, and a "CRACK" if it lands.
    boardSwing(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup - 2 || t > m.startup + m.active + 6) return;
      const a = t - m.startup + 2, cx = f.x + f.facing * 10, cy = floorY - f.y - f.body.height * 0.62;
      ctx.strokeStyle = '#ff60a0'; ctx.lineWidth = 2; ctx.globalAlpha = Math.max(0, 0.8 - a / 12);
      ctx.beginPath();
      const s = f.facing > 0 ? -Math.PI * 0.6 : Math.PI * 1.6, e = f.facing > 0 ? Math.PI * 0.25 : Math.PI * 0.75;
      ctx.arc(cx, cy, 34, Math.min(s, e), Math.max(s, e));
      ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1;
      if (f.moveHasHit && a < 12) T(ctx, 'CRACK!', cx + f.facing * 30, cy - 30, { align: 'center', color: '#ff60a0', outline: '#000' });
    },

    // Bandy's aura: the board appears under his feet when he rides it (dash, kickflip, ollie),
    // and the guitar comes out for the power chord.
    skateAura(f, ctx, floorY, frame, layer) {
      if (f.isKO || ['finished', 'thrown'].includes(f.state)) return;
      const feet = floorY - f.y + 1;
      if (layer === 'back') {
        if (f.state === 'dash' && f.dashDir === f.facing) RF.drawSkateboard(ctx, f.x, feet, f.facing, 0);
        if (f.state === 'special' && f.special && f.special.board) {
          const s = f.special, t = f.stateTime, on = t >= s.startup && t < s.startup + s.duration;
          if (on) RF.drawSkateboard(ctx, f.x, feet + (f.y > 2 ? 6 : 0), f.facing, 0, f.y > 2 ? Math.min(1, (t - s.startup) / 12) : 0);
        }
        if (f.ollieT > 0) RF.drawSkateboard(ctx, f.x, feet + 4, f.facing, -0.3 * f.facing * (f.ollieT / 14), 0);
        return;
      }
      if (f.state === 'special' && f.special && f.special.guitar) {
        const s = f.special, t = f.stateTime;
        if (t > s.startup + s.recovery) return;
        const strum = t >= s.startup && t < s.startup + 6;
        RF.drawGuitar(ctx, f.x + f.facing * 2, floorY - f.y - f.body.height * 0.5, f.facing > 0 ? -0.5 : Math.PI + 0.5, 1, f.superActive ? '#ffd030' : '#d81830');
        if (strum && frame % 2) { ctx.globalAlpha = 0.6; R(ctx, '#ffffff', f.x - 12, floorY - f.y - f.body.height * 0.5, 24, 1); ctx.globalAlpha = 1; }
      }
    },
  });

  // POWER CHORD: rings of sound, pink and white, with a note riding the wave.
  RF.PROJECTILE_ART.soundwave = function (ctx, x, y, t, dir) {
    for (let i = 0; i < 4; i++) {
      const r = 6 + i * 5 + (t % 6), a = 0.9 - i * 0.2;
      ctx.globalAlpha = Math.max(0.1, a); ctx.strokeStyle = i % 2 ? '#ff60a0' : '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (dir > 0) ctx.arc(x - i * 6, y, r, -0.9, 0.9); else ctx.arc(x + i * 6, y, r, Math.PI - 0.9, Math.PI + 0.9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
    if (RF.drawNote) RF.drawNote(ctx, x - dir * 4, y - 14 + Math.sin(t / 3) * 2, t % 8 < 4 ? '#ffffff' : '#ff60a0', 1);
  };

  // ---------------------------------------------------------------- entrance
  // Skates in from off-screen, kicks the board up into his hand, and drops it.
  RF.INTROS.skateIn = {
    boardX(f, t) {
      const W = RF.CONFIG.WIDTH, from = f.facing > 0 ? -40 : W + 40, stop = f.homeX;
      const u = Math.min(1, t / 26);
      return from + (stop - from) * (1 - (1 - u) * (1 - u));
    },
    update(f, t, scene) {
      if (t === 0) RF.audio.sfx('whoosh');
      if (t < 30) { f.x = this.boardX(f, t); f.state = 'idle'; f.y = 6; }
      if (t > 8 && t < 26 && t % 4 === 0) scene.effects.spawn('dust', f.x - f.facing * 12, 1);
      if (t === 30) { f.y = 0; f.x = f.homeX; RF.audio.sfx('clang'); }
      if (t === 38) { RF.audio.sfx('chord'); scene.effects.spawnText('TURN IT UP!', f.homeX, f.body.height + 24, '#ff60a0'); }
    },
    draw(f, ctx, floorY, t) {
      if (t > 70) return;
      if (t < 30) return RF.drawSkateboard(ctx, this.boardX(f, t), floorY + 1, f.facing, 0);
      // kicked up, spinning, then it lands leaning against his leg
      const u = Math.min(1, (t - 30) / 12), x = f.homeX - f.facing * 14, y = floorY + 1 - Math.sin(u * Math.PI) * 26;
      RF.drawSkateboard(ctx, x, y, f.facing, u < 1 ? u * Math.PI * 2 * f.facing : -1.2 * f.facing, 0);
    },
  };

  // ---------------------------------------------------------------- fatality: ENCORE
  // "ONE MORE SONG." Three power chords blast them back, then he leaps and smashes the
  // guitar down on their head. The crowd goes wild.
  RF.FINISHERS.encore = {
    name: 'Encore',
    duration: 210,
    chords: [36, 56, 76],
    update(att, vic, t, scene) {
      att.finisherAnim = t < 24 ? ['taunt', 0] : t < 100 ? ['special', 1] : t < 132 ? ['jump', Math.min(1, (t - 100) / 30)] : ['victory', (t >> 4) % 2];
      if (t === 4) scene.effects.spawnText('ONE MORE SONG.', att.x, att.body.height + 24, '#ff60a0');
      if (this.chords.includes(t)) {
        RF.audio.sfx('chord'); scene.shake = 8;
        vic.x += att.facing * 10;
        scene.effects.spawn('shock', vic.x, vic.body.height * 0.5);
        scene.effects.spawnText(['ONE!', 'TWO!', 'THREE!'][this.chords.indexOf(t)], vic.x, vic.body.height + 18, '#ffffff');
      }
      // the leap: up and over to them, guitar raised
      if (t === 100) { this.from = att.x; RF.audio.sfx('whoosh'); }
      if (t >= 100 && t <= 130) {
        const u = (t - 100) / 30;
        att.x = this.from + (vic.x - att.facing * 16 - this.from) * u;
        att.y = Math.sin(u * Math.PI) * 60;
      }
      if (t === 130) { att.y = 0; RF.audio.sfx('crack'); RF.audio.sfx('boom'); scene.shake = 22; scene.flash = 8; }
      if (t === 150) scene.effects.spawnText('ENCORE!', RF.CONFIG.WIDTH / 2, 130, '#ff60a0');
      if (t === 160) RF.audio.sfx('applause');
    },
    drawVictim(vic, ctx, floorY, t) {
      if (vic.dismembered) return;
      const pose = t < 36 ? ['dazed', 0] : ['hit', 0];
      vic.sprite.draw(ctx, pose[0], pose[1], vic.x, floorY, vic.facing);
    },
    drawFx(att, vic, ctx, floorY, t) {
      if (t < 24 || t > 170) return;
      const hx = att.x + att.facing * 2, hy = floorY - att.y - att.body.height * 0.45;
      if (t < 100) RF.drawGuitar(ctx, hx, hy, att.facing > 0 ? -0.45 : Math.PI + 0.45, 1); // playing
      else if (t < 130) RF.drawGuitar(ctx, hx, hy - 30, att.facing > 0 ? -1.9 : Math.PI + 1.9, 1.1); // raised overhead
      else {
        // smashed: the body splinters on the floor, the neck snapped off
        RF.drawGuitar(ctx, vic.x - att.facing * 6, floorY - 6, att.facing > 0 ? 0.3 : Math.PI - 0.3, 0.9);
        for (let i = 0; i < 8; i++) R(ctx, i % 2 ? '#d81830' : '#7a4a22', vic.x + Math.cos(i * 0.8) * (6 + Math.min(20, t - 130)), floorY - 4 - Math.abs(Math.sin(i * 1.3)) * Math.max(0, 24 - (t - 130)), 2, 2);
      }
      if (t >= 36 && t < 96) { // stage lights: pink and white beams
        ctx.globalAlpha = 0.12;
        for (const [bx, c] of [[60, '#ff60a0'], [192, '#ffffff'], [324, '#ff60a0']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(bx - 4, 0); ctx.lineTo(bx + 4, 0); ctx.lineTo(bx + 40, floorY); ctx.lineTo(bx - 40, floorY); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    },
  };
  RF.FATALITY_STYLE.encore = 'crush';
  RF.FATALITY_CLIMAX.encore = 130;
})();
