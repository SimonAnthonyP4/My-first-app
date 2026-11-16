// Stage 2: an abandoned New York City street at night.
(function () {
  const { rng, hash } = RF.util;
  const SIDEWALK = 148; // top of the sidewalk / base of the buildings
  const CURB = 160;     // where the sidewalk meets the street

  function rect(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  // A tenement block: brick face, windows (some boarded or broken), fire escape.
  function building(ctx, r, x, w, top, brick) {
    rect(ctx, brick, x, top, w, SIDEWALK - top);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; // brick courses
    for (let y = top + 3; y < SIDEWALK; y += 4) ctx.fillRect(x, y, w, 1);
    rect(ctx, '#1a1214', x, top, w, 3); // cornice
    rect(ctx, '#2c2024', x - 1, top + 3, w + 2, 2);
    for (let wy = top + 10; wy < SIDEWALK - 30; wy += 22) {
      for (let wx = x + 6; wx < x + w - 12; wx += 16) {
        const roll = r();
        rect(ctx, '#0c0a10', wx - 1, wy - 1, 10, 15); // frame
        if (roll < 0.3) {          // boarded up
          rect(ctx, '#5a4430', wx, wy, 8, 13);
          rect(ctx, '#3a2a1c', wx, wy + 3, 8, 1); rect(ctx, '#3a2a1c', wx, wy + 8, 8, 1);
        } else if (roll < 0.36) {  // the one lit window on the block
          rect(ctx, '#d8a040', wx, wy, 8, 13);
          rect(ctx, '#7a4818', wx, wy + 6, 8, 1);
        } else {                   // dark / broken glass
          rect(ctx, '#141a24', wx, wy, 8, 13);
          if (roll > 0.8) { rect(ctx, '#2a3446', wx + 1, wy + 1, 3, 4); rect(ctx, '#2a3446', wx + 5, wy + 6, 2, 3); }
        }
        rect(ctx, '#2a2024', wx - 1, wy + 13, 10, 2); // sill
      }
    }
    // Fire escape zig-zag
    const fx = x + Math.floor(w * 0.55);
    ctx.fillStyle = '#121014';
    for (let y = top + 28; y < SIDEWALK - 34; y += 22) {
      ctx.fillRect(fx - 12, y, 26, 1);
      ctx.fillRect(fx - 12, y - 6, 1, 6); ctx.fillRect(fx + 13, y - 6, 1, 6);
      for (let i = 0; i < 18; i++) ctx.fillRect(fx - 10 + i, y + 1 + Math.floor(i * 1.2), 1, 1);
    }
  }

  function graffiti(ctx, r, x, y, colors) {
    // Scribbled tag: a few chunky loops in faded spray-paint colours.
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      let px = x + i * 10, py = y + r() * 6;
      ctx.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += 3 + r() * 5; py = y + (k % 2 ? 10 : 0) + r() * 4; ctx.lineTo(px, py); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawStatic(ctx, W, H) {
    const r = rng(1977);

    // Smoggy night sky
    const g = ctx.createLinearGradient(0, 0, 0, SIDEWALK);
    g.addColorStop(0, '#07080e');
    g.addColorStop(0.6, '#1a1a26');
    g.addColorStop(1, '#3a2a2a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, SIDEWALK);
    ctx.fillStyle = '#b8b098'; // hazy moon
    ctx.beginPath(); ctx.arc(318, 26, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(184,176,152,0.08)';
    ctx.beginPath(); ctx.arc(318, 26, 18, 0, Math.PI * 2); ctx.fill();

    // Distant skyline silhouettes with a scatter of lit windows
    for (let x = 0; x < W; ) {
      const w = 14 + Math.floor(r() * 26), h = 30 + Math.floor(r() * 50);
      rect(ctx, '#11111a', x, 92 - h, w, h + 10);
      if (r() < 0.25) rect(ctx, '#11111a', x + w / 2 - 1, 92 - h - 10, 2, 10); // antenna
      for (let k = 0; k < 4; k++) if (r() < 0.5) rect(ctx, '#6a5a30', x + 2 + Math.floor(r() * (w - 4)), 92 - h + 4 + Math.floor(r() * h), 1, 1);
      x += w + 1;
    }

    // Tenements
    building(ctx, r, -4, 96, 34, '#4a2622');
    building(ctx, r, 94, 70, 52, '#3a2a2e');
    building(ctx, r, 166, 104, 22, '#52302a');
    building(ctx, r, 272, 116, 44, '#3c2420');

    // Shuttered bodega with a half-dead sign
    rect(ctx, '#2a2a2e', 176, 106, 84, 42);
    ctx.fillStyle = '#3e3e44';
    for (let y = 108; y < 148; y += 3) ctx.fillRect(178, y, 80, 1); // roll-down shutter
    rect(ctx, '#101014', 172, 94, 92, 12);
    RF.font.drawText(ctx, 'B DEGA', 218, 96, { align: 'center', color: '#ff3a6a' });
    rect(ctx, '#401020', 208, 97, 5, 7); // the dead "O"
    graffiti(ctx, r, 186, 122, ['#40d0ff', '#ffe040']);
    graffiti(ctx, r, 222, 130, ['#ff4060', '#ffffff']);

    // Subway entrance on the left
    rect(ctx, '#1c2a20', 20, 116, 52, 32);
    rect(ctx, '#0a0c0a', 26, 124, 40, 24);
    rect(ctx, '#2e4a34', 18, 112, 56, 5);
    RF.font.drawText(ctx, 'SUBWAY', 46, 104, { align: 'center', color: '#e8e8e0' });
    rect(ctx, '#0e0e0e', 21, 102, 50, 1);
    ctx.fillStyle = '#ffffff'; // stair edges going down into the dark
    for (let i = 0; i < 5; i++) ctx.fillRect(28 + i * 2, 128 + i * 4, 36 - i * 4, 1);
    graffiti(ctx, r, 300, 120, ['#a0ff40', '#ff40c0']);
    graffiti(ctx, r, 112, 128, ['#ffa020', '#4080ff']);

    // Posters peeling on the right building
    rect(ctx, '#c8b890', 296, 96, 14, 18); rect(ctx, '#a8986a', 312, 98, 12, 16);
    rect(ctx, '#7a1a1a', 298, 99, 10, 4); rect(ctx, '#202020', 314, 102, 8, 2);

    // Sidewalk
    rect(ctx, '#3a383c', 0, SIDEWALK, W, CURB - SIDEWALK);
    ctx.fillStyle = '#2a282c';
    for (let x = 0; x < W; x += 24) ctx.fillRect(x, SIDEWALK, 1, CURB - SIDEWALK);
    rect(ctx, '#55525a', 0, CURB - 2, W, 2); // curb lip
    rect(ctx, '#1a181c', 0, CURB, W, 2);

    // Street: asphalt, faded double yellow line in perspective, cracks, manhole
    const sg = ctx.createLinearGradient(0, CURB, 0, H);
    sg.addColorStop(0, '#222026');
    sg.addColorStop(1, '#161418');
    ctx.fillStyle = sg;
    ctx.fillRect(0, CURB + 2, W, H - CURB - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 260; i++) ctx.fillRect(Math.floor(r() * W), CURB + 2 + Math.floor(r() * (H - CURB)), 1, 1);
    for (let x = 0; x < W; x += 30) {
      if (r() < 0.3) continue; // worn away
      rect(ctx, '#8a7a30', x, 186, 18, 1);
      rect(ctx, '#8a7a30', x, 188, 18, 1);
    }
    ctx.strokeStyle = '#0c0a0e';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      let x = r() * W, y = CURB + 8 + r() * 50;
      ctx.moveTo(x, y);
      for (let i = 0; i < 6; i++) { x += 6 + r() * 10; y += (r() - 0.5) * 6; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = '#0e0d10';
    ctx.beginPath(); ctx.ellipse(250, 214, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a282e';
    ctx.beginPath(); ctx.ellipse(250, 213, 18, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Burned-out taxi parked at the far curb
    rect(ctx, '#1a1410', 112, 150, 56, 14);
    rect(ctx, '#8a6a14', 114, 150, 52, 8);  // faded yellow
    rect(ctx, '#5a3a10', 130, 152, 16, 5);  // scorch
    rect(ctx, '#1a1410', 124, 142, 30, 9);  // cabin
    rect(ctx, '#0c0c10', 127, 144, 11, 6); rect(ctx, '#0c0c10', 140, 144, 11, 6); // empty windows
    rect(ctx, '#101010', 116, 162, 10, 5); rect(ctx, '#101010', 152, 162, 10, 5);  // wheels
    rect(ctx, '#3a3a3a', 134, 139, 8, 3); // roof light

    // Hydrant, trash bags, street lamp post
    rect(ctx, '#7a1a14', 332, 148, 6, 10); rect(ctx, '#9a2a1a', 331, 146, 8, 3); rect(ctx, '#7a1a14', 329, 151, 12, 2);
    ctx.fillStyle = '#121216';
    for (const [x, y, rr] of [[80, 155, 6], [88, 153, 5], [92, 157, 4], [358, 154, 5]]) {
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
    }
    rect(ctx, '#18181c', 276, 60, 3, 98);   // lamp post
    rect(ctx, '#18181c', 268, 58, 16, 3);
    rect(ctx, '#2a2a30', 266, 61, 6, 3);    // lamp head (glow drawn animated)

    // Vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 240);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAnimated(ctx, t) {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;

    // Flickering street lamp and its pool of light
    const on = hash(Math.floor(t / 5)) > 0.12;
    if (on) {
      ctx.fillStyle = 'rgba(255,200,120,0.07)';
      ctx.beginPath();
      ctx.moveTo(266, 64); ctx.lineTo(274, 64); ctx.lineTo(320, CURB + 30); ctx.lineTo(214, CURB + 30);
      ctx.fill();
      ctx.fillStyle = '#ffd890';
      ctx.fillRect(266, 64, 6, 1);
    }

    // Steam from the manhole
    for (let i = 0; i < 14; i++) {
      const life = (t * 0.5 + hash(i * 3.3) * 60) % 60;
      const x = 244 + hash(i) * 12 + Math.sin((t + i * 13) / 9) * (life / 10);
      ctx.fillStyle = `rgba(190,190,200,${0.22 * (1 - life / 60)})`;
      ctx.fillRect(Math.round(x), Math.round(212 - life * 1.4), 3, 3);
    }

    // A newspaper tumbling across the street every so often
    const cycle = t % 900;
    if (cycle < 420) {
      const x = -20 + cycle * 1.0;
      const y = 196 - Math.abs(Math.sin(cycle / 14)) * 10;
      ctx.fillStyle = '#c8c4b0';
      ctx.fillRect(Math.round(x), Math.round(y), 7, 4);
      ctx.fillStyle = '#6a6858';
      ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, 5, 1);
    }

    // Light drizzle
    ctx.fillStyle = 'rgba(160,170,200,0.35)';
    for (let i = 0; i < 60; i++) {
      const x = (hash(i * 7.1) * W + t * 0.6) % W;
      const y = (hash(i * 2.9) * H + t * 5) % H;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 3);
    }
  }

  RF.registerStage({
    id: 'nyc',
    name: 'Abandoned NYC Street',
    music: 'nyc',
    floorY: 204,
    bounds: { left: 10, right: 374 },
    drawStatic,
    drawAnimated,
  });
})();
