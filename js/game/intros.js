// ENTRANCES: before round 1 each fighter makes an entrance (player 1 first, then
// player 2) with their name card and catchphrase. Press LIGHT/ENTER to skip.
// characters.js -> `intro: '<kind>'`. Each kind gets the fighter, the frame t
// (0..DURATION) and its target spot (f.homeX), and moves the fighter itself.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const DURATION = 80;     // frames per entrance
  const ARRIVE = 52;       // by now they're in place (name card + quote)

  const walkIn = (f, t, until, stomp, scene) => { // walk in from your own side of the screen
    const from = f.homeX - f.facing * 150, u = Math.min(1, t / until);
    f.x = from + (f.homeX - from) * u;
    f.state = u < 1 ? 'walk' : 'idle';
    f.walkTime = t;
    if (stomp && u < 1 && t % 14 === 0) { scene.shake = Math.max(scene.shake, stomp); RF.audio.sfx('stomp'); scene.effects.spawn('dust', f.x, 1); }
  };

  RF.INTROS = {
    // Strolls in, cracks knuckles.
    walk: { update(f, t, scene) { walkIn(f, t, 40, 0, scene); } },
    // Every step shakes the floor (Bruiser, Mr. Dabalsa).
    stomp: { update(f, t, scene) { walkIn(f, t, 46, f.def.stomp ? 7 : 4, scene); } },
    // Drops from the ceiling in a puff of smoke (Viper).
    drop: {
      update(f, t, scene) {
        if (t === 0) { f.y = 230; f.vy = 0; }
        if (f.y > 0) { f.vy -= 0.9; f.y = Math.max(0, f.y + f.vy); f.state = 'jump';
          if (f.y === 0) { scene.shake = 8; RF.audio.sfx('heavy'); for (let i = -2; i <= 2; i++) scene.effects.spawn('dust', f.x + i * 7, 1); }
        } else f.state = t < ARRIVE ? 'crouch' : 'idle';
      },
    },
    // Struck down by lightning (Dr. Weissenberg).
    lightning: {
      update(f, t, scene) {
        f.hidden = t < 22;
        if (t === 20) { RF.audio.sfx('bolt'); scene.flash = 8; scene.shake = 10; }
        if (t === 24) RF.audio.sfx('zap');
      },
      draw(f, ctx, floorY, t) {
        if (t < 16 || t > 30) return;
        let x = f.x, y = 0;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, 0);
        while (y < floorY) { y += 14; x = f.x + (Math.random() - 0.5) * 22; ctx.lineTo(x, Math.min(y, floorY)); }
        ctx.stroke(); ctx.strokeStyle = '#7ad8ff'; ctx.lineWidth = 1; ctx.stroke();
      },
    },
    // Rises out of purple smoke, cackling (Lady Landa).
    smoke: {
      update(f, t) { f.hidden = t < 26; if (t === 4) RF.audio.sfx('hiss'); if (t === 28) RF.audio.sfx('cackle'); },
      draw(f, ctx, floorY, t) {
        if (t > 60) return;
        const a = t < 30 ? 1 : 1 - (t - 30) / 30;
        for (let i = 0; i < 26; i++) {
          const r = 6 + (i % 5) * 3 + t * 0.2, ang = i * 2.4 + t / 20;
          const x = f.x + Math.cos(ang) * (8 + (i % 4) * 7), y = floorY - 8 - (i % 6) * 14 - Math.sin(ang) * 6;
          ctx.fillStyle = `rgba(${60 + (i % 3) * 25},0,${90 + (i % 2) * 50},${0.6 * a})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      },
    },
    // Flies in on the jetpack and touches down (El Escobedo).
    jet: {
      update(f, t, scene) {
        if (t === 0) { f.y = 150; f.x = f.homeX - f.facing * 60; RF.audio.sfx('jet'); }
        if (f.y > 0) { f.y = Math.max(0, f.y - 3.2); f.x += (f.homeX - f.x) * 0.06; f.state = 'jump';
          if (t % 6 === 0) scene.effects.spawn('dust', f.x - f.facing * 10, f.y + 34);
          if (f.y === 0) { f.x = f.homeX; scene.effects.spawn('dust', f.x, 1); RF.audio.sfx('engine'); }
        } else f.state = 'idle';
      },
      draw(f, ctx, floorY, t, frame) { if (f.y > 0) RF.MOVE_FX.jetpack(f, ctx, floorY, frame); },
    },
    // Chalk symbols swirl together into her (Jauregui).
    chalk: {
      update(f, t) { f.hidden = t < 34; if (t % 8 === 0 && t < 34) RF.audio.sfx('paper'); if (t === 34) RF.audio.sfx('perfect'); },
      draw(f, ctx, floorY, t) {
        if (t > 40) return;
        const G = ['Σ', 'Π', '√', '∞', '÷', '±', 'Δ', '∫'], u = Math.min(1, t / 34);
        G.forEach((g, i) => {
          const ang = i / G.length * Math.PI * 2 + t / 6, r = 70 * (1 - u) + 4;
          T(ctx, g, f.x + Math.cos(ang) * r, floorY - 50 + Math.sin(ang) * r * 0.6, { scale: 2, align: 'center', color: '#f0f0e0', outline: '#101010' });
        });
      },
    },
    // Hobbles in with his cane; the Liberty Bell tolls (Dr. Astuto).
    cane: { update(f, t, scene) { walkIn(f, t, 50, 0, scene); if (t === 50) RF.audio.sfx('bell'); } },
    // Descends from heaven in a beam of light, wings spread (Ruano).
    descend: {
      update(f, t, scene) {
        if (t === 0) { f.y = 160; RF.audio.sfx('bell'); }
        f.y = Math.max(0, 160 - t * 4);
        f.state = f.y > 0 ? 'jump' : 'idle';
        if (t === 40) { scene.effects.spawn('dust', f.x, 1); RF.audio.sfx('perfect'); }
      },
      draw(f, ctx, floorY, t) {
        if (t > 60) return;
        const a = t < 40 ? 0.45 : 0.45 * (60 - t) / 20;
        ctx.fillStyle = `rgba(255,245,200,${a})`; ctx.fillRect(Math.round(f.x - 22), 0, 44, floorY);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,255,255,${a * 1.5})`; ctx.fillRect(Math.round(f.x - 18 + ((i * 11 + t * 2) % 36)), Math.round(((i * 37 + t * 3) % floorY)), 2, 2); }
      },
    },
    // A white stretch limo pulls up; he steps out (Chris).
    limo: {
      update(f, t, scene) {
        if (t === 0) RF.audio.sfx('engine');
        f.hidden = t < 30;
        if (t === 30) { RF.audio.sfx('cash'); scene.effects.spawn('dust', f.x, 1); }
      },
      draw(f, ctx, floorY, t) {
        const W = RF.CONFIG.WIDTH, len = 110, from = f.facing > 0 ? -len - 10 : W + 10;
        const stop = f.homeX - f.facing * 50, u = t < 22 ? Math.min(1, t / 22) : t < 52 ? 1 : 1 + (t - 52) / 18;
        const x = from + (stop - from) * Math.min(u, 1) - f.facing * (u > 1 ? (u - 1) * 260 : 0);
        if (t > 72) return;
        const l = Math.round(f.facing > 0 ? x - len / 2 : x - len / 2), y = floorY - 26;
        ctx.fillStyle = '#111'; ctx.fillRect(l - 1, y - 1, len + 2, 22);
        ctx.fillStyle = '#f0f0f4'; ctx.fillRect(l, y + 6, len, 14);                 // body
        ctx.fillRect(l + 18, y, len - 40, 7);                                        // roof
        ctx.fillStyle = '#2a3040'; for (let i = 0; i < 5; i++) ctx.fillRect(l + 22 + i * 14, y + 1, 10, 5); // tinted windows
        ctx.fillStyle = '#e8c020'; ctx.fillRect(l, y + 12, len, 1);                  // gold trim
        ctx.fillStyle = '#111'; for (const wx of [l + 14, l + len - 22]) { ctx.beginPath(); ctx.arc(wx, floorY - 4, 5, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#c0c0c8'; for (const wx of [l + 14, l + len - 22]) ctx.fillRect(wx - 2, floorY - 6, 4, 4);
      },
    },
    // Rises out of a glowing summoning circle (Anthony).
    portal: {
      update(f, t, scene) {
        if (t === 0) RF.audio.sfx('arcane');
        f.hidden = t < 14;
        if (t === 14) { scene.flash = 4; }
      },
      draw(f, ctx, floorY, t, frame) {
        if (t > 60) return;
        const o = Math.min(1, t / 12) * (t > 45 ? (60 - t) / 15 : 1), R = 30 * o;
        ctx.save(); ctx.translate(f.x, floorY - 2); ctx.scale(1, 0.25);
        ctx.strokeStyle = '#ff70a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffe0ea'; ctx.lineWidth = 2;
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = frame / 15 + i * Math.PI / 3; ctx.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); } ctx.closePath(); ctx.stroke();
        ctx.restore();
        if (t > 10 && t < 30) { // a pillar of light
          ctx.fillStyle = `rgba(255,140,190,${0.5 * (1 - Math.abs(t - 20) / 10)})`;
          ctx.fillRect(Math.round(f.x - 16), 0, 32, floorY);
        }
      },
    },
    // Wai Kru: kneels and bows in the pre-fight ritual, then rises into his stance (Simon).
    waikru: {
      update(f, t, scene) {
        if (t === 0) RF.audio.sfx('bell');
        f.state = t < 34 ? 'crouch' : 'idle';
        f.crouching = t < 34;
        if (t === 34) { RF.audio.sfx('whoosh'); scene.effects.spawn('dust', f.x, 1); }
      },
      draw(f, ctx, floorY, t) {
        if (t > 40) return;
        const a = t < 30 ? 1 : (40 - t) / 10;
        for (let i = 0; i < 10; i++) { // incense-like golden sparkles rising around him
          const u = ((t * 1.5 + i * 11) % 40) / 40;
          ctx.fillStyle = `rgba(255,${200 + (i % 3) * 18},90,${a * (1 - u)})`;
          ctx.fillRect(Math.round(f.x - 14 + (i % 5) * 7), Math.round(floorY - 10 - u * 60), 2, 2);
        }
      },
    },
    // Flies in along a dotted flight path on a little plane, like a route on a map (Holbrook).
    flight: {
      update(f, t, scene) {
        f.hidden = t < 40;
        if (t === 0) RF.audio.sfx('jet');
        if (t === 40) { RF.audio.sfx('stomp'); scene.effects.spawn('dust', f.x, 1); scene.shake = 4; }
      },
      draw(f, ctx, floorY, t) {
        if (t > 46) return;
        const W = RF.CONFIG.WIDTH, sx = f.facing > 0 ? -10 : W + 10, ex = f.homeX, u = Math.min(1, t / 40);
        const pt = (v) => [sx + (ex - sx) * v, floorY - 40 - Math.sin(v * Math.PI) * 90];
        ctx.fillStyle = '#ff6040';
        for (let v = 0; v < u; v += 0.035) { const [x, y] = pt(v); ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
        const [px, py] = pt(u), dir = f.facing;
        ctx.fillStyle = '#111'; ctx.fillRect(px - 7, py - 2, 15, 5);
        ctx.fillStyle = '#e8e8f0'; ctx.fillRect(px - 6, py - 1, 13, 3);           // fuselage
        ctx.fillStyle = '#3a6ae0'; ctx.fillRect(px - 2, py - 5, 4, 11);            // wings
        ctx.fillRect(Math.round(px - dir * 6), py - 4, 2, 4);                       // tail
        ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.arc(ex, floorY - 4, 3, 0, Math.PI * 2); ctx.fill(); // destination pin
      },
    },
    // A red carpet rolls out and trumpets announce the king (King Sirven).
    royal: {
      back: true, // the carpet goes under him
      update(f, t, scene) {
        if (t === 0) RF.audio.sfx('fanfare');
        if (t < 18) { f.hidden = true; return; }
        f.hidden = false;
        walkIn(f, t - 18, 34, 0, scene);
      },
      draw(f, ctx, floorY, t) {
        const W = RF.CONFIG.WIDTH, u = Math.min(1, t / 18), edge = f.facing > 0 ? 0 : W;
        const end = edge + (f.homeX + f.facing * 20 - edge) * u;
        ctx.fillStyle = '#7a0a14'; ctx.fillRect(Math.min(edge, end), floorY - 2, Math.abs(end - edge), 5);
        ctx.fillStyle = '#e8b420'; ctx.fillRect(Math.min(edge, end), floorY - 2, Math.abs(end - edge), 1);
      },
    },
  };

  RF.ENTRANCE_DURATION = DURATION;
  RF.ENTRANCE_ARRIVE = ARRIVE;

  // Name card along the bottom while a fighter makes their entrance.
  RF.drawEntranceCard = function (ctx, f, t) {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
    const slide = Math.min(1, t / 10), out = t > DURATION - 8 ? (DURATION - t) / 8 : 1, a = Math.min(slide, out);
    const x = f.side === 0 ? -160 + 170 * a : W + 160 - 170 * a, align = f.side === 0 ? 'left' : 'right';
    const Y = 38, bio = RF.font.wrap((f.def.bio || '').toUpperCase(), 40)[0] || '';
    const w = Math.max(RF.font.textWidth(f.def.name, 2), RF.font.textWidth(bio)) + 16;
    const bx = f.side === 0 ? x - 10 : x - w + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(Math.min(bx, f.side === 0 ? 0 : bx), Y - 3, f.side === 0 ? bx + w : W - bx, 30);
    T(ctx, f.def.name, x, Y, { scale: 2, align, color: RF.TITLE_COLORS, outline: '#000' });
    T(ctx, bio, x, Y + 18, { align, color: '#e0d0c0', outline: '#000' });
  };
})();
