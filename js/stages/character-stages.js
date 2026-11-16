// Home stages for seven more fighters.
//   SCIENCE LAB, ROOM 13 (Dr. Weissenberg)  two Tesla coils throwing lightning at each other over the fight, a Jacob's
//                                           ladder, scopes, a wall of switchgear.          Hazard: the coil (SHOCKED!)
//   BIO LAB, ROOM 666 (Lady Landa)          shelves of things in jars, a snake in a tank, a skeleton, a plant that
//                                           should not be that big.                        Hazard: the plant (BITTEN!)
//   THE GLOBE (Mr. Dabalsa)                 the wooden O at night: three galleries of candle-lit groundlings, the
//                                           painted heavens, roses thrown from the pit.    Hazard: PURSUED BY A BEAR!
//   THE TEMPLE RING (Simon)                 a Muay Thai ring in a temple yard at sunset.   Hazard: the gong (GONG!)
//   THE PENTHOUSE (Chris)                   glass walls, the whole city below, a ticker.   Hazard: MARGIN CALL!
//   LA CATEDRAL (Ruano)                     a rose window, light through coloured glass.   Hazard: the organ (FORTISSIMO!)
//   THE OVAL OFFICE (Donald Trump)          the desk, the flags, the lawn at dusk.         Hazard: SECRET SERVICE!
// Shared drawing helpers live on RF.stageKit so the spectacle stages (spectacle-stages.js) can use them too.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const grad = (ctx, x, y, w, h, stops) => { const g = ctx.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); };
  const poly = (ctx, c, pts) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
  const circ = (ctx, c, x, y, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const line = (ctx, c, w, pts) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.lineWidth = 1; };
  const h1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // a soft light: additive, so it brightens what is under it
  const glow = (ctx, x, y, r, rgb, a) => {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  };
  // a jagged bolt from a to b; the same seed draws the same bolt
  const bolt = (ctx, x0, y0, x1, y1, seed, jag, color, w = 1) => {
    const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9)), pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const u = i / n; pts.push([x0 + (x1 - x0) * u + (h1(seed + i) - 0.5) * jag, y0 + (y1 - y0) * u + (h1(seed + i + 50) - 0.5) * jag]); }
    pts.push([x1, y1]); line(ctx, color, w, pts); return pts;
  };
  // a floor of tiles running away from the camera
  const tiles = (ctx, top, H, color, o = {}) => {
    const vy = top - (o.depth || 46), tw = o.tile || 26, rows = o.rows || 6, cx = o.cx || 192;
    const ys = []; for (let j = 0; j <= rows; j++) ys.push(top + (H - top) * Math.pow(j / rows, 1.5));
    const X = (k, y) => cx + k * tw * ((y - vy) / (top - vy));
    for (let j = 0; j < rows; j++) for (let k = -12; k < 12; k++) {
      const c = color(k, j); if (!c) continue;
      poly(ctx, c, [[X(k, ys[j]), ys[j]], [X(k + 1, ys[j]) + 0.5, ys[j]], [X(k + 1, ys[j + 1]) + 0.5, ys[j + 1] + 0.5], [X(k, ys[j + 1]), ys[j + 1] + 0.5]]);
    }
  };
  const FLOOR = 204, TOP = 138;
  RF.stageKit = { T, rect, grad, poly, circ, line, h1, glow, bolt, tiles, FLOOR, TOP };
  RF.HOME_HAZARDS = RF.HOME_HAZARDS || {};

  // ================================================================ SCIENCE LAB, ROOM 13
  const coil = (ctx, x, base, live) => {   // a Tesla coil: cabinet, the wound secondary, the doughnut on top
    rect(ctx, '#0a0c12', x - 17, base - 22, 34, 22); rect(ctx, '#2c3442', x - 16, base - 21, 32, 20); rect(ctx, '#3c4658', x - 16, base - 21, 32, 3);
    for (let i = 0; i < 4; i++) rect(ctx, '#0a0c12', x - 12 + i * 7, base - 13, 4, 8);
    rect(ctx, '#ffb020', x + 9, base - 18, 3, 3); rect(ctx, '#e02828', x - 12, base - 18, 3, 3);
    rect(ctx, '#0a0c12', x - 7, base - 84, 14, 62);
    for (let y = base - 83; y < base - 22; y += 2) { rect(ctx, '#c8742c', x - 6, y, 12, 1); rect(ctx, '#7a3c14', x - 6, y + 1, 12, 1); rect(ctx, '#f0a860', x - 3, y, 2, 1); }
    ctx.fillStyle = '#0a0c12'; ctx.beginPath(); ctx.ellipse(x, base - 90, 23, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a94a8'; ctx.beginPath(); ctx.ellipse(x, base - 90, 21, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d4dcec'; ctx.beginPath(); ctx.ellipse(x - 3, base - 92, 14, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a5468'; ctx.beginPath(); ctx.ellipse(x, base - 87, 17, 3, 0, 0, Math.PI); ctx.fill();
    if (live) glow(ctx, x, base - 90, 40, '150,200,255', 0.5 * live);
  };
  RF.registerStage({
    id: 'lab13', name: 'Science Lab, Room 13', music: 'lab13', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, TOP, [[0, '#0a1018'], [0.6, '#14222e'], [1, '#1c3040']]);
      for (let y = 20; y < TOP; y += 12) rect(ctx, 'rgba(255,255,255,0.025)', 0, y, W, 1);
      for (let x = 6; x < W; x += 24) rect(ctx, 'rgba(0,0,0,0.12)', x, 0, 1, TOP);
      // the blackboard: a circuit, and what it adds up to
      rect(ctx, '#050608', 122, 34, 140, 62); rect(ctx, '#5a4a30', 123, 35, 138, 60); rect(ctx, '#12241e', 126, 38, 132, 54);
      line(ctx, 'rgba(230,240,230,0.7)', 1, [[136, 50], [150, 50], [153, 46], [157, 54], [161, 46], [165, 54], [168, 50], [184, 50], [184, 76], [136, 76], [136, 50]]);
      rect(ctx, '#12241e', 157, 74, 8, 5); rect(ctx, 'rgba(230,240,230,0.7)', 158, 72, 1, 9); rect(ctx, 'rgba(230,240,230,0.7)', 162, 74, 1, 5);
      T(ctx, 'V = IR', 220, 44, { align: 'center', color: '#e8f0e0' }); T(ctx, 'P = IV', 220, 55, { align: 'center', color: '#b8d0b8' });
      T(ctx, '1.21 GW', 220, 70, { align: 'center', color: '#ffe060' }); line(ctx, '#ffe060', 1, [[198, 80], [242, 80]]);
      rect(ctx, '#8a7a5a', 124, 95, 136, 3); rect(ctx, '#f4f0e0', 150, 93, 8, 2); rect(ctx, '#f4f0e0', 206, 93, 5, 2);
      // the wall of switchgear, either side of it
      for (const [bx, n] of [[20, 0], [282, 1]]) {
        rect(ctx, '#050608', bx, 44, 82, 62); rect(ctx, '#27303c', bx + 1, 45, 80, 60); rect(ctx, '#343f4e', bx + 1, 45, 80, 2);
        for (let i = 0; i < 3; i++) { const gx = bx + 14 + i * 26, gy = 60; circ(ctx, '#050608', gx, gy, 10); circ(ctx, '#e8e4d4', gx, gy, 8); line(ctx, '#c02020', 1, [[gx, gy], [gx + Math.cos(-2.4 + h1(i + n * 7) * 1.6) * 6, gy + Math.sin(-2.4 + h1(i + n * 7) * 1.6) * 6]]); rect(ctx, '#050608', gx - 1, gy - 1, 2, 2); }
        for (let i = 0; i < 9; i++) rect(ctx, '#050608', bx + 6 + i * 8, 78, 5, 9);
        rect(ctx, '#050608', bx + 6, 92, 70, 9); rect(ctx, '#0c1810', bx + 7, 93, 68, 7);
      }
      // DANGER
      rect(ctx, '#050608', 135, 100, 114, 14); rect(ctx, '#f0c818', 136, 101, 112, 12);
      for (let i = 0; i < 3; i++) { poly(ctx, '#050608', [[137 + i * 6, 113], [141 + i * 6, 113], [146 + i * 6, 101], [142 + i * 6, 101]]); poly(ctx, '#050608', [[229 + i * 6, 113], [233 + i * 6, 113], [238 + i * 6, 101], [234 + i * 6, 101]]); }
      T(ctx, 'HIGH VOLTAGE', 192, 104, { align: 'center', color: '#101010' });
      // benches along the back, glassware on them
      rect(ctx, '#050608', 0, 116, W, 22); rect(ctx, '#1e2630', 0, 117, W, 4); rect(ctx, '#2a3644', 0, 117, W, 1); rect(ctx, '#121820', 0, 121, W, 17);
      for (let x = 14; x < W; x += 46) { rect(ctx, '#0a0e14', x, 123, 30, 13); rect(ctx, '#3a4656', x + 13, 128, 4, 2); }
      [[112, '#40e0a0'], [128, '#e06aff'], [246, '#ffb030'], [262, '#40c8ff']].forEach(([x, c], i) => { rect(ctx, 'rgba(200,230,255,0.35)', x, 104 + (i % 2) * 3, 7, 13 - (i % 2) * 3); rect(ctx, c, x + 1, 110, 5, 6); rect(ctx, 'rgba(255,255,255,0.6)', x + 1, 105 + (i % 2) * 3, 1, 8); });
      // the floor: black and sea-green tile, with the room in it
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#0c1820'], [1, '#182c38']]);
      tiles(ctx, TOP, H, (k, j) => ((k + j) & 1 ? 'rgba(80,150,160,0.16)' : 'rgba(0,0,0,0.22)'));
      rect(ctx, 'rgba(150,210,255,0.10)', 0, TOP, W, 2);
      // the coils
      coil(ctx, 62, TOP + 8); coil(ctx, 322, TOP + 8);
      // hanging lamps
      for (const lx of [132, 252]) { rect(ctx, '#050608', lx, 0, 1, 16); poly(ctx, '#050608', [[lx - 9, 22], [lx - 4, 15], [lx + 5, 15], [lx + 10, 22]]); rect(ctx, '#fff4c0', lx - 6, 22, 13, 2); }
    },
    drawAnimated(ctx, t) {
      // the big arc between the two coils: it holds a few frames, dies, and strikes again
      const beat = Math.floor(t / 5), strike = h1(beat) > 0.42, power = strike ? 0.6 + h1(beat + 9) * 0.4 : 0.12;
      glow(ctx, 62, 56, 46, '140,190,255', 0.35 * power + 0.1); glow(ctx, 322, 56, 46, '140,190,255', 0.35 * power + 0.1);
      if (strike) {
        const sag = 22 + h1(beat + 3) * 26, mid = [192 + (h1(beat + 4) - 0.5) * 60, 30 - sag * 0.4 + h1(beat + 5) * 20];
        for (const [c, w, j] of [['rgba(120,170,255,0.5)', 4, 0], ['#d8ecff', 1.5, 0], ['rgba(190,150,255,0.7)', 1, 40]]) { bolt(ctx, 80, 50, mid[0], mid[1], beat * 7 + j, 20, c, w); bolt(ctx, mid[0], mid[1], 304, 50, beat * 11 + j, 20, c, w); }
        if (h1(beat + 20) > 0.6) bolt(ctx, mid[0], mid[1], mid[0] + (h1(beat + 21) - 0.5) * 70, mid[1] + 26 + h1(beat + 22) * 20, beat * 3, 12, 'rgba(200,225,255,0.8)', 1);
        ctx.fillStyle = `rgba(150,200,255,${0.05 * power})`; ctx.fillRect(0, 0, 384, 224);
      }
      // feelers off each coil
      for (const cx of [62, 322]) for (let i = 0; i < 2; i++) { const s = Math.floor(t / 3) * 5 + i * 31 + cx; if (h1(s) > 0.5) { const a = -Math.PI * h1(s + 1); bolt(ctx, cx + Math.cos(a) * 20, 56 + Math.sin(a) * 7, cx + Math.cos(a) * (34 + h1(s + 2) * 22), 56 + Math.sin(a) * (22 + h1(s + 3) * 20), s, 9, 'rgba(180,215,255,0.85)', 1); } }
      // scopes: a green trace running on each panel
      for (const bx of [27, 289]) { ctx.strokeStyle = '#50ff90'; ctx.beginPath(); for (let i = 0; i < 66; i += 2) { const y = 96.5 + Math.sin((i + t * (bx > 100 ? 1.6 : 1)) / (bx > 100 ? 4 : 6)) * 2.6 * (strike ? 1.2 : 0.7); i ? ctx.lineTo(bx + 1 + i, y) : ctx.moveTo(bx + 1 + i, y); } ctx.stroke(); }
      // the breaker lights along the panels
      for (const bx of [20, 282]) for (let i = 0; i < 9; i++) rect(ctx, ((i * 3 + (t >> 4) + (bx >> 4)) % 5) ? (i % 3 ? '#30d060' : '#ffb020') : '#ff4030', bx + 7 + i * 8, 80, 3, 3);
      // a Jacob's ladder on the bench: the arc climbs and breaks
      const jl = 190, ju = (t % 46) / 46; line(ctx, '#9aa4b4', 1, [[jl - 2, 116], [jl - 8, 96]]); line(ctx, '#9aa4b4', 1, [[jl + 2, 116], [jl + 8, 96]]);
      if (ju < 0.92) { const y = 114 - ju * 18, w = 2 + ju * 6; bolt(ctx, jl - w, y, jl + w, y - 1, t >> 1, 3, '#e8d0ff', 1.5); glow(ctx, jl, y, 9, '200,150,255', 0.5); }
      // bubbles in the glassware
      [[114, '#a0ffd0'], [130, '#f0b0ff'], [248, '#ffe090'], [264, '#b0e8ff']].forEach(([x, c], i) => rect(ctx, c, x + ((t >> 3) + i) % 3, 114 - ((t + i * 9) % 20) / 4, 1, 1));
      // lamplight
      ctx.fillStyle = 'rgba(255,240,190,0.045)'; for (const lx of [132, 252]) { ctx.beginPath(); ctx.moveTo(lx - 6, 24); ctx.lineTo(lx + 7, 24); ctx.lineTo(lx + 46, 224); ctx.lineTo(lx - 46, 224); ctx.fill(); }
      // the lightning, in the floor
      if (strike) { ctx.fillStyle = `rgba(140,190,255,${0.09 * power})`; ctx.fillRect(0, TOP, 384, 86); }
    },
  });
  RF.HOME_HAZARDS.lab13 = { side: 1, name: 'SHOCKED!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#a0d0ff', sound: 'zap',
    draw(ctx, x, floorY, frame, firing) {
      const cx = x - 15;
      rect(ctx, '#0a0c12', cx - 12, floorY - 14, 24, 14); rect(ctx, '#2c3442', cx - 11, floorY - 13, 22, 12); rect(ctx, firing ? '#ff3030' : '#ffb020', cx + 5, floorY - 10, 3, 3);
      rect(ctx, '#0a0c12', cx - 5, floorY - 52, 10, 38); for (let y = floorY - 51; y < floorY - 14; y += 2) { rect(ctx, '#c8742c', cx - 4, y, 8, 1); rect(ctx, '#7a3c14', cx - 4, y + 1, 8, 1); }
      ctx.fillStyle = '#0a0c12'; ctx.beginPath(); ctx.ellipse(cx, floorY - 56, 15, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#9aa4b8'; ctx.beginPath(); ctx.ellipse(cx, floorY - 56, 13, 4.5, 0, 0, 7); ctx.fill();
      const s = Math.floor(frame / 3); if (firing || h1(s) > 0.55) bolt(ctx, cx - 10, floorY - 56, cx - 22 - h1(s + 1) * 16, floorY - 44 - h1(s + 2) * 30, s, 8, '#d0e8ff', 1);
    },
    fx(ctx, x, floorY, t) {
      const a = Math.max(0, 1 - t / 40); ctx.fillStyle = `rgba(170,210,255,${a * 0.35})`; ctx.fillRect(-20, -20, 430, 270);
      for (let i = 0; i < 6; i++) { const s = Math.floor(t / 2) * 9 + i * 17; bolt(ctx, x - 14, floorY - 56, x - 30 - h1(s) * 90, floorY - h1(s + 1) * 110, s, 16, i % 2 ? `rgba(255,255,255,${a})` : `rgba(140,190,255,${a})`, i % 2 ? 1.5 : 3); }
    },
  };

  // ================================================================ BIO LAB, ROOM 666
  const JARS = [];
  for (let r = 0; r < 2; r++) for (let sd = 0; sd < 2; sd++) for (let i = 0; i < (sd ? 4 : 5); i++) { const n = JARS.length; JARS.push({ sx: (sd ? 297 : 13) + i * 20, base: r ? 100 : 68, w: 11 + (n % 3) * 2, h: 16 + (n % 4) * 2, c: ['#7aff5a', '#c8ff4a', '#4affa8', '#ffd84a', '#ff7a5a'][n % 5], n }); }
  RF.registerStage({
    id: 'biolab', name: 'Bio Lab, Room 666', music: 'biolab', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, TOP, [[0, '#040a06'], [0.7, '#0e1c12'], [1, '#16281a']]);
      for (let x = 0; x < W; x += 16) rect(ctx, 'rgba(0,0,0,0.16)', x, 0, 1, TOP); for (let y = 10; y < TOP; y += 16) rect(ctx, 'rgba(0,0,0,0.16)', 0, y, W, 1);
      // the shelves, and everything she has collected
      for (const [sx, sw] of [[8, 104], [292, 84]]) for (const sy of [68, 100]) { rect(ctx, '#020403', sx, sy, sw, 5); rect(ctx, '#3a2c1c', sx + 1, sy + 1, sw - 2, 3); rect(ctx, '#5a4428', sx + 1, sy + 1, sw - 2, 1); rect(ctx, '#020403', sx + 6, sy + 5, 2, 6); rect(ctx, '#020403', sx + sw - 8, sy + 5, 2, 6); }
      JARS.forEach((j) => { const x = j.sx, base = j.base;
        rect(ctx, '#020403', x - 1, base - j.h - 3, j.w + 2, j.h + 3); rect(ctx, '#1a3020', x, base - j.h, j.w, j.h); rect(ctx, '#5a5040', x - 1, base - j.h - 3, j.w + 2, 3); rect(ctx, '#8a7a5a', x, base - j.h - 3, j.w, 1); });
      // the tank
      rect(ctx, '#020403', 126, 60, 132, 56); rect(ctx, '#0a1a10', 128, 62, 128, 52); grad(ctx, 128, 62, 128, 52, [[0, 'rgba(255,90,40,0.20)'], [1, 'rgba(40,90,40,0.25)']]);
      rect(ctx, '#3a2c18', 128, 104, 128, 10); for (let i = 0; i < 20; i++) rect(ctx, i % 2 ? '#5a4424' : '#2a2010', 130 + i * 6.3, 103 + (i % 3), 5, 2);
      poly(ctx, '#2a2a22', [[206, 104], [214, 86], [232, 82], [244, 92], [250, 104]]); poly(ctx, '#3c3c30', [[214, 86], [232, 82], [236, 92], [220, 96]]);
      line(ctx, '#2a1c0c', 3, [[136, 104], [150, 84], [170, 78], [186, 70]]); line(ctx, '#2a1c0c', 2, [[160, 81], [168, 68]]);
      rect(ctx, '#020403', 124, 56, 136, 6); rect(ctx, '#2a2e2a', 125, 57, 134, 4); rect(ctx, '#020403', 176, 50, 32, 7); rect(ctx, '#ff5020', 180, 56, 24, 2);
      rect(ctx, '#020403', 132, 116, 6, 22); rect(ctx, '#020403', 246, 116, 6, 22); rect(ctx, '#f4f0d0', 174, 108, 36, 7); T(ctx, 'DO NOT', 192, 109, { align: 'center', color: '#a01818' });
      // the skeleton on its stand
      const sk = 275, sb = TOP + 6; rect(ctx, '#020403', sk - 1, 44, 2, sb - 44); rect(ctx, '#020403', sk - 9, sb - 2, 18, 3);
      circ(ctx, '#020403', sk, 52, 8); circ(ctx, '#e4dcc0', sk, 52, 7); rect(ctx, '#e4dcc0', sk - 4, 57, 8, 5); rect(ctx, '#020403', sk - 4, 50, 3, 3); rect(ctx, '#020403', sk + 1, 50, 3, 3); rect(ctx, '#020403', sk - 3, 59, 1, 3); rect(ctx, '#020403', sk - 1, 59, 1, 3); rect(ctx, '#020403', sk + 1, 59, 1, 3);
      rect(ctx, '#e4dcc0', sk - 1, 62, 2, 30); for (let i = 0; i < 5; i++) { rect(ctx, '#e4dcc0', sk - 8 + i * 0.6, 66 + i * 4, 16 - i * 1.2, 2); } rect(ctx, '#e4dcc0', sk - 7, 92, 14, 4);
      line(ctx, '#e4dcc0', 2, [[sk - 9, 66], [sk - 13, 82], [sk - 11, 98]]); line(ctx, '#e4dcc0', 2, [[sk + 9, 66], [sk + 13, 82], [sk + 11, 98]]);
      line(ctx, '#e4dcc0', 2, [[sk - 4, 96], [sk - 5, 116], [sk - 4, 136]]); line(ctx, '#e4dcc0', 2, [[sk + 4, 96], [sk + 5, 116], [sk + 4, 136]]);
      // a chart of something with too many teeth
      rect(ctx, '#020403', 132, 18, 30, 36); rect(ctx, '#d8d0b0', 133, 19, 28, 34); ctx.strokeStyle = '#6a2018'; ctx.beginPath(); ctx.ellipse(147, 33, 8, 10, 0, 0, 7); ctx.stroke(); for (let i = 0; i < 5; i++) poly(ctx, '#6a2018', [[141 + i * 3, 33], [142.5 + i * 3, 37], [144 + i * 3, 33]]); for (let i = 0; i < 3; i++) rect(ctx, '#8a8468', 136, 45 + i * 3, 22, 1);
      // benches, a microscope, a tray
      rect(ctx, '#020403', 0, 118, W, 20); rect(ctx, '#1c2a20', 0, 119, W, 4); rect(ctx, '#2c4030', 0, 119, W, 1); rect(ctx, '#0c140e', 0, 123, W, 15);
      rect(ctx, '#020403', 40, 106, 5, 13); rect(ctx, '#020403', 36, 104, 10, 4); rect(ctx, '#020403', 34, 116, 16, 3); rect(ctx, '#8a94a0', 41, 107, 3, 9);
      rect(ctx, '#8a94a0', 58, 114, 24, 4); rect(ctx, '#c02020', 62, 113, 10, 2); rect(ctx, '#d8dce0', 76, 111, 1, 6);
      // the floor: green lino and a drain
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#0a160e'], [1, '#16281c']]);
      tiles(ctx, TOP, H, (k, j) => ((k + j) & 1 ? 'rgba(90,160,90,0.10)' : 'rgba(0,0,0,0.25)'), { tile: 30 });
      ctx.fillStyle = '#020403'; ctx.beginPath(); ctx.ellipse(192, 184, 16, 5, 0, 0, 7); ctx.fill(); for (let i = -2; i <= 2; i++) rect(ctx, '#2a3a2c', 180 + (i + 2) * 5, 183 + Math.abs(i) * 0.5, 3, 2);
      ctx.strokeStyle = 'rgba(160,20,20,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, 216); ctx.quadraticCurveTo(120, 196, 180, 185); ctx.stroke(); ctx.lineWidth = 1;
    },
    drawAnimated(ctx, t) {
      const flick = (t % 190) > 176 && (t >> 1) % 2 ? 0.4 : 1;
      // every jar is lit from inside, and something is in each of them
      JARS.forEach((j) => { const x = j.sx, base = j.base, bob = Math.sin(t / 30 + j.n) * 1.5;
        ctx.globalAlpha = 0.55 * flick; rect(ctx, j.c, x + 1, base - j.h + 2, j.w - 2, j.h - 3); ctx.globalAlpha = 1;
        const cy = base - j.h / 2 + bob, k = j.n % 4;
        if (k === 0) { circ(ctx, '#f0ecd8', x + j.w / 2, cy, 3.5); circ(ctx, '#3a6a20', x + j.w / 2 + Math.sin(t / 40 + j.n), cy, 1.6); if ((t + j.n * 37) % 160 < 6) rect(ctx, '#c8b890', x + j.w / 2 - 4, cy - 2, 8, 4); }   // an eye. It blinks.
        else if (k === 1) { line(ctx, '#2a1c2a', 2, [[x + 3, cy - 4], [x + j.w - 3, cy - 1], [x + 3, cy + 2], [x + j.w - 3, cy + 5]]); }   // something coiled
        else if (k === 2) { circ(ctx, '#c86a78', x + j.w / 2, cy, 3.5); rect(ctx, '#8a3a48', x + j.w / 2 - 1, cy - 3, 1, 6); }   // a brain, a small one
        else { rect(ctx, '#d8d0b0', x + j.w / 2 - 1, cy - 5, 2, 10); rect(ctx, '#d8d0b0', x + j.w / 2 - 3, cy - 5, 6, 2); rect(ctx, '#d8d0b0', x + j.w / 2 - 3, cy + 3, 6, 2); }   // a bone
        rect(ctx, 'rgba(255,255,255,0.5)', x + 1, base - j.h + 2, 1, j.h - 5);
        rect(ctx, '#f0ffe0', x + 3 + ((t >> 3) + j.n) % (j.w - 5), base - 3 - ((t + j.n * 11) % 44) / 44 * (j.h - 4), 1, 1);
        glow(ctx, x + j.w / 2, base - j.h / 2, 16, j.n % 5 === 4 ? '255,120,80' : '140,255,100', 0.12 * flick);
      });
      // the snake, moving through its tank
      const head = 150 + ((t * 0.35) % 150), body = [];
      for (let i = 0; i < 26; i++) { const x = head - i * 3.2; if (x > 130 && x < 254) body.push([x, 99 + Math.sin((x + t * 0.5) / 9) * 3 - (x > 206 && x < 250 ? 6 * Math.sin((x - 206) / 44 * Math.PI) : 0)]); }
      if (body.length > 1) { line(ctx, '#020403', 5, body); line(ctx, '#7ab020', 3, body); for (let i = 0; i < body.length; i += 3) rect(ctx, '#d8e040', body[i][0] - 1, body[i][1] - 1, 2, 2);
        if (head < 254) { circ(ctx, '#020403', body[0][0], body[0][1], 3.5); circ(ctx, '#8ac028', body[0][0], body[0][1], 2.5); rect(ctx, '#ff3020', body[0][0] + 1, body[0][1] - 1, 1, 1); if ((t >> 3) % 5 === 0) rect(ctx, '#ff5060', body[0][0] + 3, body[0][1], 4, 1); } }
      glow(ctx, 192, 62, 40, '255,90,40', 0.16 + 0.03 * Math.sin(t / 9));
      rect(ctx, 'rgba(255,255,255,0.06)', 134, 64, 3, 46); rect(ctx, 'rgba(255,255,255,0.04)', 140, 64, 1, 46);
      // the skeleton's jaw. Nobody is touching it.
      if ((t % 260) < 40 && (t >> 2) % 2) rect(ctx, '#e4dcc0', 271, 62, 8, 1);
      if ((t % 260) < 40) { rect(ctx, '#ff3020', 271, 51, 2, 2); rect(ctx, '#ff3020', 277, 51, 2, 2); }
      // the strip light, which has been about to go for a year
      ctx.fillStyle = `rgba(190,255,190,${0.05 * flick})`; ctx.fillRect(0, 0, 384, 224); rect(ctx, flick < 1 ? '#3a4a3a' : '#e8ffe0', 150, 4, 84, 3);
      // what creeps along the floor
      for (let i = 0; i < 7; i++) { const x = ((i * 67 + t * (0.25 + (i % 3) * 0.1)) % 440) - 30, y = 196 + (i % 3) * 9; ctx.fillStyle = `rgba(120,255,120,${0.05 + 0.02 * Math.sin(t / 30 + i)})`; ctx.beginPath(); ctx.ellipse(x, y, 34 + (i % 3) * 10, 5 + (i % 2) * 2, 0, 0, 7); ctx.fill(); }
    },
  });
  RF.HOME_HAZARDS.biolab = { side: -1, name: 'BITTEN!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#7aff5a', sound: 'hiss',
    draw(ctx, x, floorY, frame, firing) {   // a flytrap in a pot. It was a seedling in September.
      const l = x - 2, sway = Math.sin(frame / 18) * 2, open = firing ? 9 : 3 + Math.sin(frame / 12) * 1.5, hx = l + 16 + sway, hy = floorY - 46;
      poly(ctx, '#020403', [[l, floorY - 14], [l + 24, floorY - 14], [l + 21, floorY], [l + 3, floorY]]); poly(ctx, '#8a4a28', [[l + 1, floorY - 13], [l + 23, floorY - 13], [l + 20, floorY - 1], [l + 4, floorY - 1]]); rect(ctx, '#a85c34', l, floorY - 16, 24, 3);
      line(ctx, '#020403', 5, [[l + 12, floorY - 14], [l + 9, floorY - 30], [hx - 2, hy + 6]]); line(ctx, '#3a8a28', 3, [[l + 12, floorY - 14], [l + 9, floorY - 30], [hx - 2, hy + 6]]);
      poly(ctx, '#2a6a1c', [[l + 10, floorY - 24], [l + 22, floorY - 30], [l + 12, floorY - 20]]); poly(ctx, '#2a6a1c', [[l + 9, floorY - 22], [l, floorY - 32], [l + 8, floorY - 18]]);
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(hx, hy); ctx.rotate(s * open * 0.07 - 0.3);
        poly(ctx, '#020403', [[-3, 0], [3, -8 * s - s], [20, -7 * s - s], [25, 0]]); poly(ctx, s < 0 ? '#4aa030' : '#3a8a28', [[-2, 0], [3, -7 * s], [19, -6 * s], [23, 0]]); poly(ctx, '#c02848', [[0, 0], [4, -4 * s], [18, -3 * s], [21, 0]]);
        for (let i = 0; i < 5; i++) poly(ctx, '#f4f0d8', [[3 + i * 4, 0], [5 + i * 4, 4 * s * (open > 5 ? 1 : 0.7)], [7 + i * 4, 0]]); ctx.restore(); }
    },
    fx(ctx, x, floorY, t) {
      const a = Math.max(0, 1 - t / 44), u = Math.min(1, t / 6), cx = x + 34, cy = floorY - 44;
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(cx - 30, cy); ctx.rotate(s * (1 - u) * 0.9); ctx.globalAlpha = a;
        poly(ctx, '#020403', [[0, 0], [10, -22 * s], [62, -18 * s], [74, 0]]); poly(ctx, '#3a8a28', [[2, 0], [11, -20 * s], [60, -16 * s], [70, 0]]); poly(ctx, '#c02848', [[4, 0], [12, -11 * s], [58, -9 * s], [66, 0]]);
        for (let i = 0; i < 7; i++) poly(ctx, '#f4f0d8', [[8 + i * 8, 0], [12 + i * 8, 10 * s], [16 + i * 8, 0]]); ctx.restore(); }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 16; i++) { const an = -Math.PI / 2 + (h1(i) - 0.5) * 2.4, d = t * (1.5 + h1(i + 9) * 2); ctx.globalAlpha = a; circ(ctx, i % 2 ? '#b8ff5a' : '#7aff5a', cx + Math.cos(an) * d, cy + Math.sin(an) * d + t * t * 0.04, 2 + (i % 2)); }
      ctx.globalAlpha = 1;
    },
  };
  // ================================================================ THE GLOBE
  // Where everybody in the house is sitting: [x, y, tint], worked out once.
  const HOUSE = []; for (let tier = 0; tier < 3; tier++) for (let bay = 0; bay < 12; bay++) { const bx = 6 + bay * 31; if (bx > 28 && bx < 54 || bx > 326 && bx < 352) continue; for (let i = 0; i < 4; i++) { const n = tier * 100 + bay * 7 + i; if (h1(n) < 0.2) continue; HOUSE.push([bx + 5 + i * 6 + h1(n + 1) * 2, 63 + tier * 26 - h1(n + 2) * 3, n]); } }
  const PIT = []; for (let i = 0; i < 44; i++) PIT.push([i * 9 + h1(i + 300) * 5 - 4, 131 - h1(i + 310) * 7, i]);
  const CLOTH = ['#5a3020', '#3a3a5a', '#6a5a30', '#4a2a3a', '#2a4a3a', '#6a3a2a'];
  RF.registerStage({
    id: 'globe', name: 'The Globe', music: 'globe', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      // the open roof: night over London
      grad(ctx, 0, 0, W, 50, [[0, '#060818'], [1, '#141a3c']]);
      for (let i = 0; i < 40; i++) rect(ctx, h1(i) > 0.7 ? '#ffffff' : '#8a94c8', h1(i + 50) * W, h1(i + 90) * 40, 1, 1);
      // thatch, all the way round
      rect(ctx, '#0a0604', 0, 36, W, 14); for (let x = 0; x < W; x += 3) { const hgt = 9 + h1(x) * 4; rect(ctx, h1(x + 7) > 0.5 ? '#a8843c' : '#8a6a2c', x, 37, 3, hgt); rect(ctx, '#c8a450', x, 37, 1, 3); }
      rect(ctx, '#3a2810', 0, 49, W, 2);
      // three galleries: oak frame, white plaster, and a dark box of people in every bay
      for (let tier = 0; tier < 3; tier++) { const y = 51 + tier * 26;
        rect(ctx, '#0c0806', 0, y, W, 26); rect(ctx, '#1a100a', 0, y + 2, W, 15);
        rect(ctx, '#e8dcc0', 0, y + 17, W, 9); rect(ctx, '#c8b898', 0, y + 24, W, 2);
        for (let bay = 0; bay < 13; bay++) { const bx = 4 + bay * 31; rect(ctx, '#2a1a0e', bx - 2, y, 5, 26); rect(ctx, '#4a3018', bx - 1, y, 1, 26);
          line(ctx, '#2a1a0e', 2, [[bx + 3, y + 25], [bx + 15, y + 18], [bx + 28, y + 25]]);                    // the braces under each rail
          for (let i = 0; i < 6; i++) rect(ctx, '#3a2412', bx + 5 + i * 4.6, y + 13, 2, 5); }
        rect(ctx, '#3a2412', 0, y + 12, W, 2); rect(ctx, '#5a3a1c', 0, y + 12, W, 1); rect(ctx, '#2a1a0e', 0, y + 17, W, 2);
      }
      rect(ctx, '#0c0806', 0, 129, W, 9);
      // banners over the rail
      for (const [bx, c1, c2] of [[98, '#a01828', '#e8c040'], [160, '#1a3a8a', '#e8e0c8'], [222, '#a01828', '#e8c040'], [284, '#1a3a8a', '#e8e0c8']]) {
        poly(ctx, '#0c0806', [[bx - 1, 90], [bx + 15, 90], [bx + 15, 114], [bx + 7, 109], [bx - 1, 114]]); poly(ctx, c1, [[bx, 91], [bx + 14, 91], [bx + 14, 112], [bx + 7, 107], [bx, 112]]);
        ctx.strokeStyle = c2; ctx.beginPath(); ctx.arc(bx + 7, 98, 4, 0, 7); ctx.moveTo(bx + 3, 98); ctx.lineTo(bx + 11, 98); ctx.moveTo(bx + 7, 94); ctx.lineTo(bx + 7, 102); ctx.stroke(); }
      // the stage: oak boards, a trap in the middle
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#5a3a1c'], [0.4, '#7a5028'], [1, '#8a5c30']]);
      for (let k = -14; k <= 14; k++) { ctx.strokeStyle = 'rgba(30,16,6,0.5)'; ctx.beginPath(); ctx.moveTo(192 + k * 15, TOP); ctx.lineTo(192 + k * 34, H); ctx.stroke(); }
      for (let i = 0; i < 26; i++) { const y = TOP + 4 + h1(i + 400) * 80, x = h1(i + 410) * W; rect(ctx, 'rgba(30,16,6,0.4)', x, y, 10 + h1(i) * 14, 1); }
      for (let i = 0; i < 30; i++) rect(ctx, 'rgba(255,220,160,0.07)', h1(i + 420) * W, TOP + 6 + h1(i + 430) * 78, 14 + h1(i) * 20, 1);
      poly(ctx, 'rgba(20,10,4,0.55)', [[164, 172], [220, 172], [226, 190], [158, 190]]); poly(ctx, '#6a4422', [[166, 173], [218, 173], [223, 189], [161, 189]]); rect(ctx, '#1a0e06', 189, 180, 6, 2);
      rect(ctx, '#2a1a0e', 0, TOP - 1, W, 3); rect(ctx, '#8a6030', 0, TOP - 1, W, 1);
      // the two great pillars, painted to look like marble, and the heavens they hold up
      for (const px of [40, 344]) { rect(ctx, '#0c0806', px - 10, 30, 20, TOP - 26); grad(ctx, px - 9, 30, 18, TOP - 27, [[0, '#6a1420'], [1, '#8a2430']]);
        rect(ctx, 'rgba(255,255,255,0.14)', px - 6, 30, 3, TOP - 27); rect(ctx, 'rgba(0,0,0,0.25)', px + 4, 30, 5, TOP - 27);
        for (let i = 0; i < 9; i++) line(ctx, 'rgba(240,200,190,0.25)', 1, [[px - 8 + h1(i + px) * 14, 40 + i * 11], [px - 4 + h1(i + px + 3) * 10, 46 + i * 11], [px - 8 + h1(i + px + 5) * 16, 51 + i * 11]]);
        rect(ctx, '#0c0806', px - 13, TOP - 2, 26, 8); rect(ctx, '#c8a030', px - 12, TOP - 1, 24, 6); rect(ctx, '#f0d060', px - 12, TOP - 1, 24, 1);
        rect(ctx, '#0c0806', px - 13, 28, 26, 9); rect(ctx, '#c8a030', px - 12, 29, 24, 7); rect(ctx, '#f0d060', px - 12, 29, 24, 1); for (let i = 0; i < 4; i++) rect(ctx, '#8a6a18', px - 10 + i * 6, 32, 3, 3); }
      rect(ctx, '#0c0806', 0, 0, W, 30); grad(ctx, 0, 0, W, 28, [[0, '#0e1444'], [1, '#1c2870']]);
      for (let i = 0; i < 36; i++) { const x = 6 + i * 10.6 + h1(i + 500) * 4, y = 4 + h1(i + 510) * 18; rect(ctx, '#f0d060', x, y, 1, 1); if (i % 4 === 0) { rect(ctx, '#f0d060', x - 1, y, 3, 1); rect(ctx, '#f0d060', x, y - 1, 1, 3); } }
      for (let x = 0; x < W; x += 12) poly(ctx, '#c8a030', [[x, 28], [x + 12, 28], [x + 6, 34]]); rect(ctx, '#f0d060', 0, 27, W, 1);
    },
    drawAnimated(ctx, t) {
      // the house: every head a little different, and none of them still
      for (const [x, y, n] of HOUSE) { const up = Math.sin(t / (26 + (n % 5) * 6) + n) * 0.8; rect(ctx, CLOTH[n % 6], x - 2, y + 4 + up, 5, 6); circ(ctx, n % 3 ? '#d8a878' : '#b88858', x, y + 2 + up, 2.2); if (n % 4 === 0) rect(ctx, '#1a100a', x - 2, y - 1 + up, 5, 2); }
      // the groundlings in the pit, lit from the stage
      for (const [x, y, i] of PIT) { const up = Math.abs(Math.sin(t / (18 + (i % 4) * 5) + i)) * 1.5; rect(ctx, '#140c08', x - 3, y + 3 - up, 7, 12); circ(ctx, '#1e120a', x, y - up, 3.2); rect(ctx, 'rgba(255,190,110,0.5)', x - 2, y + 1 - up, 4, 1); if (i % 7 === 3) poly(ctx, '#140c08', [[x - 4, y - 2 - up], [x, y - 8 - up], [x + 4, y - 2 - up]]); }
      // candles: along the front of the stage, and in sconces on the pillars
      for (let i = 0; i < 12; i++) { const x = 22 + i * 31, f = 0.7 + 0.3 * Math.sin(t / 3 + i * 2.1); rect(ctx, '#e8dcc0', x, TOP - 5, 2, 4); rect(ctx, '#ffd060', x, TOP - 8 - f, 2, 3); rect(ctx, '#fff4c0', x, TOP - 7, 1, 2); glow(ctx, x + 1, TOP - 6, 13, '255,180,80', 0.22 * f); }
      for (const px of [40, 344]) for (const sy of [62, 96]) { const f = 0.7 + 0.3 * Math.sin(t / 4 + px + sy); rect(ctx, '#c8a030', px - 3, sy, 6, 2); rect(ctx, '#e8dcc0', px - 1, sy - 5, 2, 5); rect(ctx, '#ffd060', px - 1, sy - 8 - f, 2, 3); glow(ctx, px, sy - 6, 18, '255,180,80', 0.3 * f); }
      // footlight on the boards
      ctx.fillStyle = `rgba(255,190,100,${0.07 + 0.015 * Math.sin(t / 5)})`; ctx.fillRect(0, TOP, 384, 30);
      // stars in the painted heavens catch the candlelight
      for (let i = 0; i < 9; i++) if ((t + i * 37) % 120 < 12) rect(ctx, '#ffffff', 6 + (i * 4) * 10.6 + h1(i * 4 + 500) * 4 - 1, 4 + h1(i * 4 + 510) * 18 - 1, 3, 3);
      // a rose from the pit, now and then
      const rt = t % 260; if (rt < 150) { const s = Math.floor(t / 260), x0 = 60 + h1(s) * 264, x1 = x0 + (h1(s + 1) - 0.5) * 80, u = Math.min(1, rt / 34), x = x0 + (x1 - x0) * u, y = u < 1 ? 128 + (62 + h1(s + 2) * 20) * u - Math.sin(u * Math.PI) * 44 : 190 + h1(s + 2) * 20;
        ctx.globalAlpha = rt > 120 ? (150 - rt) / 30 : 1; rect(ctx, '#2a7a2a', x - 3, y + 1, 5, 1); circ(ctx, '#d81830', x + 2, y, 2); rect(ctx, '#ff6070', x + 1, y - 1, 1, 1); ctx.globalAlpha = 1; }
      // and what they think of it
      const ct = t % 420; if (ct < 60) { const s = Math.floor(t / 420); T(ctx, ['HUZZAH!', 'ENCORE!', 'BRAVO!', 'ZOUNDS!', 'MORE!'][s % 5], 70 + h1(s + 40) * 240, 120 - ct * 0.2, { align: 'center', color: ct < 46 ? '#ffe9a0' : '#a08850', outline: '#000' }); }
    },
  });
  RF.HOME_HAZARDS.globe = { side: 1, name: 'PURSUED BY A BEAR!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#c88a4a', sound: 'roar',
    draw(ctx, x, floorY, frame, firing) {   // the stage door, and what is waiting behind the curtain
      const l = x - 22; rect(ctx, '#0c0806', l - 2, floorY - 64, 26, 64); rect(ctx, '#1a0a0a', l, floorY - 62, 22, 62);
      const peek = firing ? 0 : 2 + Math.sin(frame / 40) * 2;
      circ(ctx, '#5a3418', l + 12 + peek, floorY - 40, 8); rect(ctx, '#3a200c', l + 5 + peek, floorY - 40, 5, 4); rect(ctx, '#0c0806', l + 4 + peek, floorY - 40, 2, 2);
      if ((frame % 150) > 8) { rect(ctx, '#ffd040', l + 9 + peek, floorY - 44, 2, 2); rect(ctx, '#ffd040', l + 14 + peek, floorY - 44, 2, 2); }
      for (let i = 0; i < 3; i++) { const sw = Math.sin(frame / 30 + i) * 0.6; poly(ctx, i % 2 ? '#8a1420' : '#a01828', [[l + i * 8 + sw, floorY - 62], [l + 8 + i * 8 + sw, floorY - 62], [l + 7 + i * 8, floorY - (i ? 0 : 26)], [l + i * 8 - 1, floorY - (i ? 0 : 30)]]); }
      rect(ctx, '#c8a030', l - 2, floorY - 66, 26, 3);
    },
    fx(ctx, x, floorY, t) {
      const a = Math.max(0, 1 - t / 46), out = Math.min(1, t / 7) * (t > 30 ? Math.max(0, 1 - (t - 30) / 12) : 1), bx = x - 6 - out * 34, by = floorY - 46;
      ctx.globalAlpha = Math.min(1, a * 2);
      circ(ctx, '#0c0806', bx, by, 23); circ(ctx, '#6a3e1c', bx, by, 21); circ(ctx, '#0c0806', bx - 12, by - 18, 8); circ(ctx, '#6a3e1c', bx - 12, by - 18, 6); circ(ctx, '#0c0806', bx + 14, by - 17, 8); circ(ctx, '#6a3e1c', bx + 14, by - 17, 6);
      circ(ctx, '#c89858', bx - 8, by + 6, 10); rect(ctx, '#0c0806', bx - 13, by, 8, 5); poly(ctx, '#3a0808', [[bx - 16, by + 8], [bx, by + 8], [bx - 3, by + 17], [bx - 13, by + 17]]);
      for (let i = 0; i < 3; i++) { poly(ctx, '#f4f0d8', [[bx - 15 + i * 5, by + 8], [bx - 13 + i * 5, by + 12], [bx - 11 + i * 5, by + 8]]); poly(ctx, '#f4f0d8', [[bx - 14 + i * 4, by + 17], [bx - 12 + i * 4, by + 13], [bx - 10 + i * 4, by + 17]]); }
      rect(ctx, '#ffd040', bx - 12, by - 8, 4, 3); rect(ctx, '#ffd040', bx + 2, by - 8, 4, 3); rect(ctx, '#0c0806', bx - 11, by - 8, 2, 3); rect(ctx, '#0c0806', bx + 3, by - 8, 2, 3);
      ctx.globalAlpha = a; for (let i = 0; i < 4; i++) { const sx = x - 44 - t * 1.4 + i * 9; line(ctx, '#ffffff', 2, [[sx + 16, floorY - 84 + i * 3], [sx, floorY - 30 + i * 3]]); line(ctx, '#e03030', 1, [[sx + 18, floorY - 84 + i * 3], [sx + 2, floorY - 30 + i * 3]]); }
      ctx.globalAlpha = 1;
    },
  };

  // ================================================================ THE TEMPLE RING
  const roofTier = (ctx, cx, y, w, hgt, c) => {   // one swept-up tier of a temple roof, with the finials
    poly(ctx, c, [[cx - w, y], [cx - w * 0.82, y - 2], [cx - w * 0.3, y - hgt * 0.8], [cx, y - hgt], [cx + w * 0.3, y - hgt * 0.8], [cx + w * 0.82, y - 2], [cx + w, y]]);
    poly(ctx, c, [[cx - w, y], [cx - w - 7, y - 7], [cx - w + 4, y - 2]]); poly(ctx, c, [[cx + w, y], [cx + w + 7, y - 7], [cx + w - 4, y - 2]]); poly(ctx, c, [[cx - 2, y - hgt], [cx, y - hgt - 9], [cx + 2, y - hgt]]);
  };
  const chedi = (ctx, cx, base, s, c) => {       // a bell-shaped stupa and its spire
    poly(ctx, c, [[cx - 16 * s, base], [cx - 15 * s, base - 5 * s], [cx - 12 * s, base - 6 * s], [cx - 11 * s, base - 10 * s], [cx - 8 * s, base - 11 * s], [cx - 7 * s, base - 20 * s], [cx - 3 * s, base - 28 * s], [cx - 1.5 * s, base - 40 * s], [cx, base - 58 * s], [cx + 1.5 * s, base - 40 * s], [cx + 3 * s, base - 28 * s], [cx + 7 * s, base - 20 * s], [cx + 8 * s, base - 11 * s], [cx + 11 * s, base - 10 * s], [cx + 12 * s, base - 6 * s], [cx + 15 * s, base - 5 * s], [cx + 16 * s, base]]);
  };
  const palm = (ctx, x, base, hgt, c) => { line(ctx, c, 2, [[x, base], [x + 2, base - hgt * 0.5], [x - 1, base - hgt]]); for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.05 + i * 0.15), l = 13 + (i % 2) * 4; line(ctx, c, 2, [[x - 1, base - hgt], [x - 1 + Math.cos(a) * l * 0.6, base - hgt + Math.sin(a) * l * 0.7 - 3], [x - 1 + Math.cos(a) * l, base - hgt + Math.sin(a) * l * 0.4 + 4]]); } };
  RF.registerStage({
    id: 'templering', name: 'The Temple Ring', music: 'templering', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, TOP, [[0, '#1c1048'], [0.3, '#5a1e68'], [0.55, '#c0405c'], [0.75, '#f58a3c'], [0.9, '#ffc860'], [1, '#ffe08a']]);
      for (let i = 0; i < 26; i++) rect(ctx, 'rgba(255,255,255,0.6)', h1(i + 600) * W, h1(i + 610) * 40, 1, 1);
      // long clouds, lit from underneath
      for (let i = 0; i < 7; i++) { const x = h1(i + 620) * W, y = 34 + i * 7, w = 50 + h1(i + 630) * 70; ctx.fillStyle = 'rgba(90,30,90,0.45)'; ctx.beginPath(); ctx.ellipse(x, y, w, 2.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,170,110,0.5)'; ctx.beginPath(); ctx.ellipse(x, y + 2, w * 0.8, 1, 0, 0, 7); ctx.fill(); }
      // the sun going down, in bands
      circ(ctx, 'rgba(255,230,150,0.25)', 192, 106, 50); circ(ctx, '#fff0b0', 192, 106, 36); circ(ctx, '#ffe488', 192, 108, 34);
      for (let i = 0; i < 6; i++) rect(ctx, '#f58a3c', 150, 104 + i * 6, 84, 1 + i * 0.6);
      // hills, far then near
      poly(ctx, '#8a3a6a', [[0, 122], [40, 106], [84, 116], [130, 100], [170, 114], [214, 108], [260, 96], [300, 112], [344, 102], [384, 116], [384, TOP], [0, TOP]]);
      poly(ctx, '#5a2458', [[0, 130], [50, 118], [100, 126], [150, 120], [230, 124], [290, 116], [340, 124], [384, 118], [384, TOP], [0, TOP]]);
      // the temple, against the light: the hall on the left, the chedis on the right
      const S = '#2a1038', G = '#f0b040';
      rect(ctx, S, 52, 104, 76, 34); for (let i = 0; i < 5; i++) rect(ctx, '#ffb850', 60 + i * 14, 114, 5, 14);
      roofTier(ctx, 90, 106, 50, 18, S); roofTier(ctx, 90, 92, 37, 16, S); roofTier(ctx, 90, 79, 24, 15, S);
      line(ctx, G, 1, [[42, 105], [60, 98], [90, 88]]); line(ctx, G, 1, [[55, 91], [72, 84], [90, 76]]); line(ctx, G, 1, [[68, 78], [80, 71], [90, 64]]);
      chedi(ctx, 304, TOP, 1.15, S); chedi(ctx, 262, TOP, 0.62, S); chedi(ctx, 344, TOP, 0.7, S);
      line(ctx, G, 1, [[304, 71], [301, 92], [296, 106], [291, 115]]); line(ctx, G, 1, [[262, 102], [260, 114], [257, 120]]); line(ctx, G, 1, [[344, 97], [342, 110], [339, 118]]);
      palm(ctx, 20, TOP, 62, S); palm(ctx, 142, TOP, 46, S); palm(ctx, 236, TOP, 52, S); palm(ctx, 372, TOP, 66, S);
      // the crowd along the far ropes
      rect(ctx, '#1a0a26', 0, 128, W, 10); for (let i = 0; i < 52; i++) { const x = i * 7.5 + h1(i + 640) * 4, y = 127 - h1(i + 650) * 6; circ(ctx, '#1a0a26', x, y, 3); rect(ctx, 'rgba(255,170,90,0.55)', x - 2, y - 3, 3, 1); }
      // the ring: corner posts, pads, four ropes
      for (const [px, c, c2] of [[22, '#c81828', '#ff5a5a'], [362, '#1a48c8', '#5a9aff']]) { rect(ctx, '#0a0410', px - 5, 82, 10, TOP - 76); rect(ctx, '#3a3a44', px - 4, 83, 8, TOP - 78); rect(ctx, '#6a6a78', px - 4, 83, 2, TOP - 78);
        rect(ctx, '#0a0410', px - 7, 86, 14, 44); rect(ctx, c, px - 6, 87, 12, 42); rect(ctx, c2, px - 6, 87, 3, 42); for (let i = 0; i < 4; i++) rect(ctx, '#0a0410', px - 6, 93 + i * 10, 12, 1);
        rect(ctx, '#f0b040', px - 5, 80, 10, 4); }
      [[92, '#c81828'], [102, '#f4f0e6'], [112, '#f4f0e6'], [122, '#1a48c8']].forEach(([y, c]) => { ctx.strokeStyle = '#0a0410'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(22, y); ctx.quadraticCurveTo(192, y + 5, 362, y); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(22, y); ctx.quadraticCurveTo(192, y + 5, 362, y); ctx.stroke(); ctx.lineWidth = 1; });
      // the canvas, and the mark in the middle of it
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#8a6a8a'], [0.3, '#b8a0b0'], [1, '#d8c8cc']]);
      rect(ctx, 'rgba(255,200,120,0.35)', 0, TOP, W, 3); rect(ctx, '#2a1038', 0, TOP - 1, W, 2);
      ctx.save(); ctx.translate(192, 184); ctx.scale(1, 0.3);
      circ(ctx, 'rgba(200,40,50,0.5)', 0, 0, 84); circ(ctx, '#c8b8c0', 0, 0, 76); circ(ctx, 'rgba(240,176,64,0.75)', 0, 0, 70); circ(ctx, '#cfc0c6', 0, 0, 62);
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); poly(ctx, 'rgba(200,40,50,0.55)', [[0, -8], [14, -34], [0, -58], [-14, -34]]); poly(ctx, 'rgba(240,176,64,0.7)', [[0, -16], [6, -34], [0, -48], [-6, -34]]); ctx.restore(); }
      circ(ctx, 'rgba(240,176,64,0.85)', 0, 0, 12); circ(ctx, 'rgba(200,40,50,0.7)', 0, 0, 6); ctx.restore();
      for (let i = 0; i < 24; i++) rect(ctx, 'rgba(60,30,60,0.10)', h1(i + 660) * W, TOP + 8 + h1(i + 670) * 76, 8 + h1(i) * 18, 1);
      grad(ctx, 0, TOP, W, 26, [[0, 'rgba(60,20,70,0.45)'], [1, 'rgba(60,20,70,0)']]);
      // incense burners in the far corners
      for (const bx of [58, 326]) { rect(ctx, '#0a0410', bx - 6, TOP - 14, 12, 14); rect(ctx, '#b88420', bx - 5, TOP - 13, 10, 3); rect(ctx, '#8a5c14', bx - 4, TOP - 10, 8, 9); rect(ctx, '#f0c050', bx - 5, TOP - 13, 10, 1); rect(ctx, '#3a2408', bx, TOP - 22, 1, 9); }
    },
    drawAnimated(ctx, t) {
      // the sun shivers on the horizon
      for (let i = 0; i < 4; i++) rect(ctx, 'rgba(255,240,180,0.35)', 160 + Math.sin(t / 20 + i * 2) * 4, 120 + i * 4, 64 - i * 6, 1);
      glow(ctx, 192, 108, 90, '255,170,90', 0.16 + 0.02 * Math.sin(t / 40));
      // birds crossing it
      for (let i = 0; i < 5; i++) { const x = ((t * (0.3 + i * 0.05) + i * 90) % 460) - 40, y = 58 + i * 9 + Math.sin(t / 30 + i) * 4, f = Math.sin(t / 5 + i) > 0 ? 2 : -1; line(ctx, '#2a1038', 1, [[x - 4, y - f], [x, y], [x + 4, y - f]]); }
      // lanterns strung from corner to corner
      const str = (u) => [22 + u * 340, 64 + Math.sin(u * Math.PI) * 14];
      ctx.strokeStyle = '#2a1038'; ctx.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = str(i / 20); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      for (let i = 1; i < 12; i++) { const [x, y] = str(i / 12), sw = Math.sin(t / 26 + i) * 1.5, c = i % 2 ? '#e83028' : '#f0b040', f = 0.75 + 0.25 * Math.sin(t / 7 + i * 3);
        rect(ctx, '#2a1038', x + sw - 1, y, 1, 4); rect(ctx, '#2a1038', x + sw - 5, y + 3, 9, 12); rect(ctx, c, x + sw - 4, y + 4, 7, 10); rect(ctx, 'rgba(255,240,180,0.8)', x + sw - 2, y + 6, 3, 5); rect(ctx, '#f0d060', x + sw - 2, y + 14, 3, 3); glow(ctx, x + sw, y + 9, 15, i % 2 ? '255,90,60' : '255,190,80', 0.28 * f); }
      // incense
      for (const bx of [58, 326]) for (let i = 0; i < 9; i++) { const u = ((t * 0.6 + i * 11) % 100) / 100; ctx.fillStyle = `rgba(240,220,240,${0.22 * (1 - u)})`; ctx.beginPath(); ctx.arc(bx + Math.sin(u * 7 + i + t / 50) * (3 + u * 9), TOP - 24 - u * 60, 2 + u * 5, 0, 7); ctx.fill(); }
      // flashes from the crowd
      for (let i = 0; i < 3; i++) { const s = Math.floor((t + i * 23) / 34) * 7 + i; if ((t + i * 23) % 34 < 3 && h1(s) > 0.4) { const x = h1(s + 1) * 384; rect(ctx, '#ffffff', x - 1, 123, 3, 3); glow(ctx, x, 124, 12, '255,255,255', 0.5); } }
      // petals coming down across everything
      for (let i = 0; i < 16; i++) { const x = (h1(i + 700) * 420 + Math.sin(t / 40 + i) * 14 + t * 0.2) % 400 - 8, y = (h1(i + 710) * 240 + t * (0.3 + h1(i + 720) * 0.3)) % 230; rect(ctx, i % 3 ? '#ffb0c8' : '#ffe0e8', x, y, 2, (t + i * 9) % 30 < 15 ? 2 : 1); }
      // the last of the light, across the canvas
      ctx.fillStyle = `rgba(255,170,90,${0.05 + 0.01 * Math.sin(t / 30)})`; ctx.beginPath(); ctx.moveTo(150, TOP); ctx.lineTo(234, TOP); ctx.lineTo(330, 224); ctx.lineTo(54, 224); ctx.fill();
    },
  });
  RF.HOME_HAZARDS.templering = { side: -1, name: 'GONG!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#f0b040', sound: 'gong',
    draw(ctx, x, floorY, frame, firing) {
      const l = x - 2, sh = firing ? Math.sin(frame * 2.5) * 2 : 0, cx = l + 15 + sh, cy = floorY - 40;
      rect(ctx, '#0a0410', l, floorY - 70, 4, 70); rect(ctx, '#0a0410', l + 26, floorY - 70, 4, 70); rect(ctx, '#0a0410', l - 3, floorY - 72, 36, 5); rect(ctx, '#8a2018', l + 1, floorY - 69, 2, 69); rect(ctx, '#8a2018', l + 27, floorY - 69, 2, 69); rect(ctx, '#b02820', l - 2, floorY - 71, 34, 3);
      line(ctx, '#3a2408', 1, [[l + 8, floorY - 67], [cx - 8, cy - 11]]); line(ctx, '#3a2408', 1, [[l + 22, floorY - 67], [cx + 8, cy - 11]]);
      circ(ctx, '#0a0410', cx, cy, 15); circ(ctx, '#b88420', cx, cy, 14); circ(ctx, '#e8b840', cx - 1, cy - 1, 11); circ(ctx, '#b88420', cx, cy, 8); circ(ctx, '#f0d060', cx - 1, cy - 1, 4); circ(ctx, '#8a5c14', cx, cy, 2);
      ctx.strokeStyle = 'rgba(255,240,180,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, 12, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    },
    fx(ctx, x, floorY, t) {
      const cx = x + 13, cy = floorY - 40;
      for (let i = 0; i < 4; i++) { const r = (t - i * 6) * 4.5; if (r < 0) continue; ctx.strokeStyle = `rgba(240,190,70,${Math.max(0, 0.9 - r / 180)})`; ctx.lineWidth = 3 - i * 0.5; ctx.beginPath(); ctx.arc(cx, cy, 14 + r, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); }
      ctx.lineWidth = 1; ctx.fillStyle = `rgba(255,220,140,${Math.max(0, 0.3 - t / 90)})`; ctx.fillRect(-20, -20, 430, 270);
    },
  };
  // ================================================================ THE PENTHOUSE
  const TOWERS = []; { let x = -6, i = 0; while (x < 392) { const w = 14 + h1(i + 800) * 22, hgt = 22 + h1(i + 810) * 62 + (i % 5 === 2 ? 24 : 0); TOWERS.push([x, w, hgt, i]); x += w + 1 + h1(i + 820) * 5; i++; } }
  const TICK = 'TMNA +4.20   BROB +69.0   ZA -3.14   GOLD +12.5   YACHT +8.8   RENT -99.9   CHRS +100   ';
  RF.registerStage({
    id: 'penthouse', name: 'The Penthouse', music: 'penthouse', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      // the city, from ninety floors up
      grad(ctx, 0, 0, W, TOP, [[0, '#05061a'], [0.5, '#141040'], [0.8, '#4a1e5a'], [1, '#c0506a']]);
      for (let i = 0; i < 50; i++) rect(ctx, h1(i) > 0.8 ? '#ffffff' : '#7a84c0', h1(i + 830) * W, h1(i + 840) * 70, 1, 1);
      circ(ctx, 'rgba(255,240,220,0.12)', 318, 52, 16); circ(ctx, '#f4ecd8', 318, 52, 9); circ(ctx, '#d8ccb4', 321, 50, 2);
      for (let i = 0; i < 30; i++) { const x = i * 13.4, hgt = 12 + h1(i + 850) * 30; rect(ctx, '#2a1a4a', x, 132 - hgt, 12, hgt + 6); for (let k = 0; k < 5; k++) if (h1(i * 9 + k) > 0.5) rect(ctx, 'rgba(255,200,140,0.5)', x + 2 + (k % 3) * 3, 134 - hgt + Math.floor(k / 3) * 5 + (k % 2) * 3, 1, 1); }
      for (const [x, w, hgt, i] of TOWERS) { rect(ctx, '#0c0a22', x, TOP - hgt, w, hgt); rect(ctx, '#1a1638', x, TOP - hgt, 2, hgt);
        if (i % 5 === 2) { rect(ctx, '#0c0a22', x + w / 2 - 1, TOP - hgt - 12, 2, 12); rect(ctx, '#0c0a22', x + w / 2 - 4, TOP - hgt - 4, 8, 4); }
        if (i % 4 === 1) poly(ctx, '#0c0a22', [[x, TOP - hgt], [x + w / 2, TOP - hgt - 8], [x + w, TOP - hgt]]); }
      // the glass, floor to ceiling
      for (let x = 0; x <= W; x += 64) { rect(ctx, '#020308', x - 2, 0, 4, TOP); rect(ctx, '#2a2c3c', x - 1, 0, 1, TOP); }
      rect(ctx, '#020308', 0, 64, W, 13);
      for (let x = 6; x < W; x += 64) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.beginPath(); ctx.moveTo(x, 77); ctx.lineTo(x + 18, 77); ctx.lineTo(x + 4, TOP); ctx.lineTo(x - 14, TOP); ctx.fill(); }
      // black marble with gold in it, and the skyline upside down in the polish
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#0a0a18'], [1, '#1c1a2c']]);
      for (const [x, w, hgt, i] of TOWERS) { ctx.fillStyle = 'rgba(70,60,120,0.16)'; ctx.fillRect(Math.round(x), TOP, Math.round(w), Math.round(hgt * 0.5)); }
      grad(ctx, 0, TOP, W, 50, [[0, 'rgba(192,80,106,0.28)'], [1, 'rgba(192,80,106,0)']]);
      tiles(ctx, TOP, H, (k, j) => ((k + j) & 1 ? 'rgba(255,255,255,0.035)' : null), { tile: 34, rows: 5 });
      for (let i = 0; i < 14; i++) { const x = h1(i + 860) * W, y = TOP + 6 + h1(i + 870) * 76; line(ctx, 'rgba(232,192,80,0.35)', 1, [[x, y], [x + 12 + h1(i) * 20, y + 3 + h1(i + 1) * 5], [x + 30 + h1(i + 2) * 30, y + 2 + h1(i + 3) * 9]]); }
      rect(ctx, '#c8a030', 0, TOP - 1, W, 2); rect(ctx, '#f0d060', 0, TOP - 1, W, 1);
      // a sofa nobody is allowed to sit on
      rect(ctx, '#020308', 22, 112, 78, 26); rect(ctx, '#e8e4dc', 24, 114, 74, 12); rect(ctx, '#c8c4bc', 24, 124, 74, 3); rect(ctx, '#f4f0e8', 24, 126, 74, 8); rect(ctx, '#d8d4cc', 24, 114, 6, 20); rect(ctx, '#d8d4cc', 92, 114, 6, 20);
      for (let i = 1; i < 3; i++) rect(ctx, '#b8b4ac', 24 + i * 24.6, 114, 1, 20); rect(ctx, '#c8a030', 26, 134, 3, 4); rect(ctx, '#c8a030', 93, 134, 3, 4); rect(ctx, '#c02848', 34, 116, 12, 9); rect(ctx, '#e8c040', 78, 116, 12, 9);
      // gold, stacked on a glass table, as you do
      rect(ctx, 'rgba(160,200,230,0.35)', 118, 124, 44, 2); rect(ctx, '#020308', 122, 126, 2, 12); rect(ctx, '#020308', 156, 126, 2, 12);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) { const x = 124 + r * 5.5 + i * 11, y = 118 - r * 6; rect(ctx, '#020308', x - 1, y - 1, 12, 7); rect(ctx, '#e8b830', x, y, 10, 5); rect(ctx, '#ffe070', x, y, 10, 1); rect(ctx, '#a87818', x, y + 4, 10, 1); }
      // the bar
      rect(ctx, '#020308', 270, 104, 68, 34); rect(ctx, '#2a1a12', 271, 105, 66, 32); rect(ctx, '#c8a030', 271, 105, 66, 2); rect(ctx, '#3a2418', 271, 120, 66, 1);
      [[276, '#30a060'], [284, '#c8a030'], [292, '#a02030'], [300, '#e8e4dc'], [308, '#3060c0'], [316, '#c8a030'], [324, '#30a060']].forEach(([x, c], i) => { rect(ctx, '#020308', x - 1, 90 - (i % 3) * 2, 6, 15 + (i % 3) * 2); rect(ctx, c, x, 95 - (i % 3) * 2, 4, 9 + (i % 3) * 2); rect(ctx, c, x + 1, 91 - (i % 3) * 2, 2, 4); rect(ctx, 'rgba(255,255,255,0.5)', x, 95 - (i % 3) * 2, 1, 7); });
      // his portrait. He commissioned it himself.
      rect(ctx, '#020308', 232, 84, 34, 44); rect(ctx, '#c8a030', 233, 85, 32, 42); rect(ctx, '#f0d060', 233, 85, 32, 1); rect(ctx, '#2a3a6a', 237, 89, 24, 34);
      circ(ctx, '#e8b890', 249, 102, 6); rect(ctx, '#3a2414', 243, 95, 12, 4); rect(ctx, '#1a1a2a', 241, 110, 16, 13); rect(ctx, '#f4f0e8', 248, 110, 2, 7); rect(ctx, '#c02030', 248, 112, 2, 6); rect(ctx, '#020308', 246, 101, 2, 1); rect(ctx, '#020308', 251, 101, 2, 1);
      rect(ctx, '#020308', 238, 128, 22, 6); rect(ctx, '#c8a030', 239, 129, 20, 4);
      // a palm in a pot that cost more than your car
      rect(ctx, '#020308', 349, 116, 16, 22); rect(ctx, '#e8e4dc', 350, 117, 14, 20); rect(ctx, '#c8a030', 350, 117, 14, 2); for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.08 + i * 0.14); line(ctx, '#0c3a1c', 2, [[357, 117], [357 + Math.cos(a) * 12, 104 + Math.sin(a) * 10], [357 + Math.cos(a) * 24, 100 + Math.sin(a) * 22 + 8]]); }
      // the chandelier
      rect(ctx, '#020308', 191, 0, 2, 64);
    },
    drawAnimated(ctx, t) {
      // windows in the towers going on and off
      for (const [x, w, hgt, i] of TOWERS) for (let k = 0; k < 16; k++) { const s = i * 31 + k, wx = x + 3 + (s % Math.max(1, Math.floor((w - 5) / 3))) * 3, wy = TOP - hgt + 4 + Math.floor(h1(s) * (hgt - 8) / 4) * 4; if (wy < 42) continue; const on = h1(s + Math.floor((t + s * 13) / 240)) > 0.45; if (on) rect(ctx, ['#ffd890', '#ffe8b0', '#a8d0ff', '#ffc070'][s % 4], wx, wy, 2, 2); }
      for (const [x, w, hgt, i] of TOWERS) if (i % 5 === 2 && (t + i * 20) % 80 < 40) { rect(ctx, '#ff3030', x + w / 2 - 1, TOP - hgt - 13, 2, 2); glow(ctx, x + w / 2, TOP - hgt - 12, 7, '255,60,60', 0.5); }
      // searchlights off a roof somewhere
      for (let i = 0; i < 2; i++) { const a = -Math.PI / 2 + Math.sin(t / (70 + i * 30) + i * 2) * 0.7, bx = 96 + i * 170; ctx.fillStyle = 'rgba(200,210,255,0.05)'; ctx.beginPath(); ctx.moveTo(bx, 120); ctx.lineTo(bx + Math.cos(a - 0.06) * 150, 120 + Math.sin(a - 0.06) * 150); ctx.lineTo(bx + Math.cos(a + 0.06) * 150, 120 + Math.sin(a + 0.06) * 150); ctx.fill(); }
      // a helicopter going home
      const hx = 400 - ((t * 0.45) % 520), hy = 58 + Math.sin(t / 50) * 4; rect(ctx, '#020308', hx, hy, 9, 3); rect(ctx, '#020308', hx + 8, hy + 1, 7, 1); rect(ctx, '#020308', hx - 4 + (t % 4 < 2 ? 0 : 3), hy - 2, 12, 1); if (t % 40 < 20) { rect(ctx, '#ff3030', hx + 3, hy + 3, 2, 1); glow(ctx, hx + 4, hy + 3, 6, '255,60,60', 0.5); } else rect(ctx, '#40ff60', hx + 14, hy, 1, 1);
      // the ticker, round the top of the room
      rect(ctx, '#040810', 0, 66, 384, 9);
      const off = (t * 0.6) % (TICK.length * 6); ctx.save(); ctx.beginPath(); ctx.rect(0, 66, 384, 9); ctx.clip();
      for (let r = -1; r < 2; r++) { let x = -off + r * TICK.length * 6; for (const part of TICK.trim().split('   ')) { T(ctx, part, x, 67, { color: part.includes('-') ? '#ff5050' : '#40e870' }); x += (part.length + 3) * 6; } }
      ctx.restore();
      // the chandelier: tiers of crystal, each one catching the room
      for (let r = 0; r < 3; r++) for (let i = 0; i < 7 - r * 2; i++) { const x = 192 + (i - (6 - r * 2) / 2) * 7, y = 83 + r * 6 + Math.abs(i - (6 - r * 2) / 2) * -1.5; const tw = (t + i * 17 + r * 31) % 50 < 6; rect(ctx, '#c8a030', x - 1, y - 2, 2, 2); poly(ctx, tw ? '#ffffff' : 'rgba(200,225,255,0.7)', [[x - 2, y], [x + 2, y], [x, y + 5]]); }
      rect(ctx, '#020308', 191, 75, 2, 5); rect(ctx, '#c8a030', 172, 80, 40, 2); glow(ctx, 192, 89, 46, '255,230,170', 0.22 + 0.02 * Math.sin(t / 15));
      // its light, in the marble
      ctx.fillStyle = 'rgba(255,230,170,0.05)'; ctx.beginPath(); ctx.ellipse(192, 186, 120, 22, 0, 0, 7); ctx.fill();
      // the gold glints
      const gs = Math.floor(t / 18); if (h1(gs) > 0.4) { const x = 126 + h1(gs + 1) * 30, y = 108 + h1(gs + 2) * 12; rect(ctx, '#ffffff', x - 2, y, 5, 1); rect(ctx, '#ffffff', x, y - 2, 1, 5); }
    },
  });
  RF.HOME_HAZARDS.penthouse = { side: 1, name: 'CASHED OUT!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#f0d060', sound: 'cash',
    draw(ctx, x, floorY, frame, firing) {   // the vault. Of course there is a vault.
      const cx = x - 16, cy = floorY - 36, a = frame / 40 + (firing ? frame * 0.4 : 0);
      rect(ctx, '#020308', x - 34, floorY - 72, 36, 72); rect(ctx, '#4a4e5c', x - 33, floorY - 71, 34, 70); rect(ctx, '#6a6e7c', x - 33, floorY - 71, 34, 2);
      circ(ctx, '#020308', cx, cy, 16); circ(ctx, '#8a8e9c', cx, cy, 15); circ(ctx, '#aeb2c0', cx - 1, cy - 1, 12); circ(ctx, '#6a6e7c', cx, cy, 9);
      for (let i = 0; i < 4; i++) line(ctx, '#020308', 2, [[cx, cy], [cx + Math.cos(a + i * Math.PI / 2) * 11, cy + Math.sin(a + i * Math.PI / 2) * 11]]);
      circ(ctx, '#c8a030', cx, cy, 3); for (let i = 0; i < 4; i++) rect(ctx, '#2a2c38', x - 31 + (i % 2) * 28, floorY - 68 + Math.floor(i / 2) * 62, 3, 3);
      rect(ctx, firing ? '#40ff60' : '#ff3030', x - 8, floorY - 66, 3, 3);
    },
    fx(ctx, x, floorY, t) {
      const a = Math.max(0, 1 - t / 48);
      for (let i = 0; i < 34; i++) { const an = Math.PI + (h1(i + 900) - 0.5) * 1.9, d = t * (1.6 + h1(i + 910) * 3), px = x - 16 + Math.cos(an) * d, py = floorY - 36 + Math.sin(an) * d * 0.8 + t * t * 0.035; ctx.globalAlpha = a;
        if (i % 3 === 0) { rect(ctx, '#020308', px - 1, py - 1, 10, 6); rect(ctx, '#e8b830', px, py, 8, 4); rect(ctx, '#ffe070', px, py, 8, 1); }
        else { ctx.save(); ctx.translate(px, py); ctx.rotate(t * 0.2 + i); rect(ctx, '#3a8a40', -4, -2, 8, 4); rect(ctx, '#9ad090', -3, -1, 6, 2); ctx.restore(); } }
      ctx.globalAlpha = 1; glow(ctx, x - 16, floorY - 36, 60, '255,220,100', a * 0.5);
    },
  };

  // ================================================================ LA CATEDRAL
  const GLASS = ['#e02838', '#2858e0', '#f0c020', '#20a858', '#a030c0', '#f07020', '#30b8d8'];
  const lancet = (ctx, cx, top, w, hgt, seed) => {   // a tall pointed window, leaded, every pane a different colour
    const pts = [[cx - w, top + hgt], [cx - w, top + w * 1.3], [cx - w * 0.6, top + w * 0.45], [cx, top], [cx + w * 0.6, top + w * 0.45], [cx + w, top + w * 1.3], [cx + w, top + hgt]];
    poly(ctx, '#020206', pts.map(([x, y]) => [cx + (x - cx) * 1.25, y < top + 4 ? y - 3 : y])); ctx.save(); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.clip();
    for (let r = 0; r < hgt / 6 + 1; r++) for (let c = 0; c < 4; c++) rect(ctx, GLASS[Math.floor(h1(seed + r * 7 + c) * 7)], cx - w + c * (w / 2), top + r * 6, w / 2 + 1, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(cx - w, top, w * 2, hgt * 0.4);
    for (let r = 0; r < hgt / 6 + 1; r++) rect(ctx, '#020206', cx - w, top + r * 6, w * 2, 1); for (let c = 1; c < 4; c++) rect(ctx, '#020206', cx - w + c * (w / 2), top, 1, hgt);
    circ(ctx, '#020206', cx, top + w * 1.5, w * 0.62); circ(ctx, GLASS[seed % 7], cx, top + w * 1.5, w * 0.48); circ(ctx, '#fff4c0', cx, top + w * 1.5, w * 0.18); ctx.restore();
  };
  RF.registerStage({
    id: 'catedral', name: 'La Catedral', music: 'catedral', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, TOP, [[0, '#06050c'], [0.6, '#16121e'], [1, '#221c2a']]);
      for (let y = 8; y < TOP; y += 9) for (let x = ((y / 9) % 2) * 11 - 11; x < W; x += 22) rect(ctx, 'rgba(255,255,255,0.022)', x, y, 21, 8);
      // the rose window
      const rx = 192, ry = 66; circ(ctx, '#020206', rx, ry, 37); circ(ctx, '#3a3040', rx, ry, 35); circ(ctx, '#020206', rx, ry, 32);
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 16; i++) { const a0 = i * Math.PI / 8, a1 = a0 + Math.PI / 8, r0 = ring ? 17 : 6, r1 = ring ? 30 : 16; ctx.fillStyle = GLASS[(i * (ring ? 3 : 5) + ring * 2) % 7]; ctx.beginPath(); ctx.arc(rx, ry, r1, a0 + 0.03, a1 - 0.03); ctx.arc(rx, ry, r0, a1 - 0.03, a0 + 0.03, true); ctx.fill(); }
      for (let i = 0; i < 16; i++) line(ctx, '#020206', 1, [[rx, ry], [rx + Math.cos(i * Math.PI / 8) * 31, ry + Math.sin(i * Math.PI / 8) * 31]]);
      ctx.strokeStyle = '#020206'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rx, ry, 16.5, 0, 7); ctx.stroke(); ctx.lineWidth = 1; circ(ctx, '#020206', rx, ry, 6); circ(ctx, '#fff4c0', rx, ry, 4.5); circ(ctx, '#f0c020', rx, ry, 2.5);
      // lancets either side of it
      lancet(ctx, 84, 40, 11, 76, 3); lancet(ctx, 124, 48, 9, 66, 11); lancet(ctx, 260, 48, 9, 66, 19); lancet(ctx, 300, 40, 11, 76, 27);
      // the piers and the ribs springing from them
      for (const px of [44, 340]) { rect(ctx, '#020206', px - 12, 0, 24, TOP + 2); grad(ctx, px - 11, 0, 22, TOP, [[0, '#2a2430'], [1, '#4a4250']]); for (const dx of [-8, -3, 2, 6]) rect(ctx, 'rgba(0,0,0,0.25)', px + dx, 0, 1, TOP); rect(ctx, 'rgba(255,255,255,0.10)', px - 10, 0, 2, TOP);
        rect(ctx, '#020206', px - 15, TOP - 8, 30, 12); rect(ctx, '#5a5262', px - 14, TOP - 7, 28, 10); rect(ctx, '#7a7284', px - 14, TOP - 7, 28, 2); rect(ctx, '#020206', px - 14, 34, 28, 7); rect(ctx, '#6a6274', px - 13, 35, 26, 5); }
      ctx.strokeStyle = '#3a3442'; ctx.lineWidth = 3; for (const [a, b] of [[44, 192], [340, 192]]) { ctx.beginPath(); ctx.moveTo(a, 36); ctx.quadraticCurveTo(a + (b - a) * 0.35, 4, b, -6); ctx.stroke(); } ctx.lineWidth = 1;
      // the altar: gold from the floor to the dark
      rect(ctx, '#020206', 150, 104, 84, 34); grad(ctx, 152, 106, 80, 32, [[0, '#c8a030'], [1, '#7a5a14']]);
      for (let i = 0; i < 5; i++) { rect(ctx, '#020206', 156 + i * 15, 108, 11, 22); rect(ctx, ['#7a1420', '#1a2a6a', '#7a1420', '#1a2a6a', '#7a1420'][i], 157 + i * 15, 109, 9, 20); circ(ctx, '#f0d060', 161.5 + i * 15, 114, 2.5); rect(ctx, '#e8dcc0', 160 + i * 15, 117, 3, 9); }
      rect(ctx, '#f0d060', 152, 106, 80, 1); rect(ctx, '#020206', 186, 92, 12, 14); rect(ctx, '#f0d060', 190, 90, 4, 16); rect(ctx, '#f0d060', 186, 95, 12, 4);
      rect(ctx, '#020206', 142, 130, 100, 8); rect(ctx, '#e8e0d0', 143, 131, 98, 6); rect(ctx, '#a01828', 143, 134, 98, 1);
      // pews
      for (const [x0, dir] of [[56, 1], [328, -1]]) for (let i = 0; i < 4; i++) { const x = x0 + dir * i * 21 - (dir < 0 ? 16 : 0); rect(ctx, '#020206', x, 118, 17, 20); rect(ctx, '#3a2414', x + 1, 119, 15, 18); rect(ctx, '#5a3a1e', x + 1, 119, 15, 2); rect(ctx, '#2a180c', x + 3, 124, 11, 9); }
      // black and white marble, all the way to the doors
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#14121c'], [1, '#2a2634']]);
      tiles(ctx, TOP, H, (k, j) => ((k + j) & 1 ? 'rgba(235,225,240,0.22)' : 'rgba(0,0,0,0.3)'), { tile: 22, rows: 7 });
      rect(ctx, '#020206', 0, TOP - 1, W, 2);
    },
    drawAnimated(ctx, t) {
      // the light through the glass: long coloured shafts, and the pools they leave on the floor
      const beams = [[84, 78, '224,40,56'], [124, 82, '40,88,224'], [192, 66, '240,192,32'], [260, 82, '32,168,88'], [300, 78, '160,48,192']];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      beams.forEach(([x, y, rgb], i) => { const a = 0.09 + 0.03 * Math.sin(t / 60 + i * 1.7), dx = (x - 192) * 0.5 + 30;
        ctx.fillStyle = `rgba(${rgb},${a})`; ctx.beginPath(); ctx.moveTo(x - 9, y - 20); ctx.lineTo(x + 9, y - 20); ctx.lineTo(x + dx + 34, 216); ctx.lineTo(x + dx - 34, 216); ctx.fill();
        ctx.fillStyle = `rgba(${rgb},${a * 2.2})`; ctx.beginPath(); ctx.ellipse(x + dx * 0.86, 190 + (i % 2) * 8, 38, 8, 0, 0, 7); ctx.fill(); });
      ctx.restore();
      glow(ctx, 192, 66, 60, '255,230,160', 0.16 + 0.03 * Math.sin(t / 45));
      // dust in the shafts
      for (let i = 0; i < 26; i++) { const x = (h1(i + 950) * 384 + Math.sin(t / 70 + i) * 10) % 384, y = (h1(i + 960) * 200 + t * 0.08 * (0.5 + h1(i))) % 200 + 8; ctx.fillStyle = `rgba(255,240,210,${0.25 + 0.25 * Math.sin(t / 20 + i)})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
      // candles on the altar
      for (let i = 0; i < 6; i++) { const x = 149 + i * 17, f = 0.7 + 0.3 * Math.sin(t / 3.5 + i * 2.3); rect(ctx, '#f4f0e0', x, 123, 2, 8); rect(ctx, '#ffd060', x, 119 - f, 2, 4); rect(ctx, '#fff8d0', x, 121, 1, 2); glow(ctx, x + 1, 121, 12, '255,190,90', 0.3 * f); }
      // the censer, on its long chain, from one side of the nave to the other
      const sw = Math.sin(t / 34), ang = sw * 0.9, cxp = 192 + Math.sin(ang) * 96, cyp = -10 + Math.cos(ang) * 96;
      line(ctx, '#8a7a50', 1, [[192, -10], [cxp, cyp]]); rect(ctx, '#020206', cxp - 5, cyp - 2, 10, 11); rect(ctx, '#c8a030', cxp - 4, cyp - 1, 8, 9); rect(ctx, '#f0d060', cxp - 4, cyp - 1, 8, 2); rect(ctx, '#ff8a30', cxp - 2, cyp + 3, 4, 2); glow(ctx, cxp, cyp + 4, 10, '255,150,60', 0.5);
      for (let i = 1; i < 12; i++) { const pa = Math.sin((t - i * 4) / 34) * 0.9, px = 192 + Math.sin(pa) * 96, py = -10 + Math.cos(pa) * 96 - i * 1.2; ctx.fillStyle = `rgba(230,225,240,${0.2 * (1 - i / 12)})`; ctx.beginPath(); ctx.arc(px, py, 2 + i * 0.7, 0, 7); ctx.fill(); }
      // a dove, up near the vault
      const du = (t % 700) / 700; if (du < 0.5) { const x = -10 + du * 2 * 404, y = 44 + Math.sin(du * 14) * 8, f = Math.sin(t / 4) > 0 ? 3 : -2; line(ctx, '#f4f0f8', 2, [[x - 5, y - f], [x, y], [x + 5, y - f]]); rect(ctx, '#f4f0f8', x - 1, y, 4, 2); }
    },
  });
  RF.HOME_HAZARDS.catedral = { side: -1, name: 'FORTISSIMO!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#f0d060', sound: 'chord',
    draw(ctx, x, floorY, frame, firing) {   // the organ: a rank of pipes up the wall
      const l = x - 2; rect(ctx, '#020206', l, floorY - 26, 30, 26); rect(ctx, '#3a2414', l + 1, floorY - 25, 28, 24); rect(ctx, '#5a3a1e', l + 1, floorY - 25, 28, 2); for (let i = 0; i < 9; i++) rect(ctx, i % 3 === 1 ? '#0c0806' : '#f4f0e0', l + 2 + i * 3, floorY - 12, 2, 5);
      for (let i = 0; i < 7; i++) { const hgt = 34 + Math.abs(3 - i) * -6 + 30, px = l + 2 + i * 4, sh = firing ? Math.sin(frame * 1.7 + i) : 0; rect(ctx, '#020206', px - 1 + sh, floorY - 26 - hgt, 5, hgt); rect(ctx, '#c8a030', px + sh, floorY - 25 - hgt, 3, hgt - 1); rect(ctx, '#f0d878', px + sh, floorY - 25 - hgt, 1, hgt - 1); rect(ctx, '#020206', px + sh, floorY - 34, 3, 2); }
    },
    fx(ctx, x, floorY, t) {
      for (let i = 0; i < 5; i++) { const r = (t - i * 5) * 5; if (r < 0) continue; ctx.strokeStyle = `rgba(240,216,120,${Math.max(0, 0.9 - r / 200)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 12, floorY - 60, 10 + r, -Math.PI / 2.6, Math.PI / 2.6); ctx.stroke(); }
      ctx.lineWidth = 1; if (RF.drawNote) for (let i = 0; i < 7; i++) { const u = Math.min(1, (t + i * 4) / 50); ctx.globalAlpha = Math.max(0, 1 - u); RF.drawNote(ctx, x + 20 + u * (60 + i * 16), floorY - 50 - i * 9 - Math.sin(u * 5 + i) * 10, i % 2 ? '#f0d060' : '#ffffff', 1, i % 3 === 0); }
      ctx.globalAlpha = 1;
    },
  };

  // ================================================================ THE OVAL OFFICE
  const flagUS = (ctx, x, y, w, hgt, wave) => { for (let i = 0; i < 7; i++) rect(ctx, i % 2 ? '#f0ece4' : '#b82030', x, y + i * (hgt / 7) + wave * (i % 2 ? 0.5 : -0.5), w, hgt / 7 + 1); rect(ctx, '#1a2a6a', x, y, w * 0.45, hgt * 0.5); for (let i = 0; i < 6; i++) rect(ctx, '#f0ece4', x + 1 + (i % 3) * (w * 0.14), y + 2 + Math.floor(i / 3) * (hgt * 0.2), 1, 1); };
  RF.registerStage({
    id: 'oval', name: 'The Oval Office', music: 'oval', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      // cream walls, a chair rail, the curve of the room
      grad(ctx, 0, 0, W, TOP, [[0, '#cfc4a4'], [1, '#e8dfc4']]);
      for (let x = 0; x < W; x += 6) rect(ctx, 'rgba(255,255,255,0.05)', x, 0, 1, TOP);
      grad(ctx, 0, 0, 70, TOP, [[0, 'rgba(60,40,10,0.22)'], [1, 'rgba(60,40,10,0.22)']]); grad(ctx, 314, 0, 70, TOP, [[0, 'rgba(60,40,10,0.22)'], [1, 'rgba(60,40,10,0.22)']]);
      rect(ctx, '#f4eedc', 0, 112, W, 26); rect(ctx, '#b8ac8c', 0, 111, W, 2); rect(ctx, '#fffaf0', 0, 113, W, 1); for (let x = 8; x < W; x += 40) { rect(ctx, '#d8ceb0', x, 118, 30, 16); rect(ctx, '#f4eedc', x + 1, 119, 28, 14); }
      rect(ctx, '#b8ac8c', 0, 29, W, 3); rect(ctx, '#fffaf0', 0, 32, W, 1);
      // three tall windows on the lawn at dusk
      for (const wx of [128, 192, 256]) {
        rect(ctx, '#3a2c10', wx - 23, 32, 46, 84); grad(ctx, wx - 20, 35, 40, 78, [[0, '#2a2a6a'], [0.5, '#c0607a'], [0.75, '#ffb060'], [1, '#ffd890']]);
        rect(ctx, '#1e4a24', wx - 20, 92, 40, 21); rect(ctx, '#2e6a30', wx - 20, 92, 40, 3); for (let i = 0; i < 4; i++) rect(ctx, 'rgba(255,255,255,0.05)', wx - 20, 97 + i * 4, 40, 1);
        if (wx === 192) { poly(ctx, '#f4f0e8', [[190, 92], [191, 56], [192, 52], [193, 56], [194, 92]]); rect(ctx, '#d8d4cc', 192, 56, 2, 36); }
        else { const tx = wx + (wx < 192 ? -6 : 6); circ(ctx, '#143a1a', tx, 84, 10); circ(ctx, '#1e4a24', tx - 3, 80, 7); rect(ctx, '#2a1a0c', tx - 1, 88, 2, 6); }
        rect(ctx, '#f4eedc', wx - 1, 35, 2, 78); for (let i = 1; i < 4; i++) rect(ctx, '#f4eedc', wx - 20, 35 + i * 19.5, 40, 2);
        rect(ctx, '#3a2c10', wx - 24, 112, 48, 4); rect(ctx, '#f4eedc', wx - 23, 113, 46, 2);
      }
      // gold drapes, tied back, and a pelmet over the three of them
      for (const wx of [128, 192, 256]) for (const s of [-1, 1]) { poly(ctx, '#3a2c10', [[wx + s * 25, 30], [wx + s * 11, 30], [wx + s * 15, 70], [wx + s * 22, 96], [wx + s * 19, 116], [wx + s * 26, 116]]); poly(ctx, '#c89a28', [[wx + s * 24, 31], [wx + s * 12, 31], [wx + s * 16, 70], [wx + s * 23, 96], [wx + s * 20, 115], [wx + s * 25, 115]]); line(ctx, '#f0c850', 1, [[wx + s * 21, 32], [wx + s * 22, 70], [wx + s * 24, 100]]); line(ctx, '#8a6614', 1, [[wx + s * 16, 32], [wx + s * 18, 70]]); rect(ctx, '#8a1420', wx + s * 21 - 2, 94, 5, 3); }
      rect(ctx, '#3a2c10', 100, 26, 184, 10); rect(ctx, '#c89a28', 101, 27, 182, 8); rect(ctx, '#f0c850', 101, 27, 182, 1); for (let x = 104; x < 282; x += 9) poly(ctx, '#c89a28', [[x, 35], [x + 9, 35], [x + 4.5, 40]]);
      // paintings: a man on a horse, a man not on a horse
      for (const [fx, c] of [[30, '#3a4a3a'], [322, '#4a3a2a']]) { rect(ctx, '#3a2c10', fx, 44, 34, 42); rect(ctx, '#c89a28', fx + 1, 45, 32, 40); rect(ctx, '#f0c850', fx + 1, 45, 32, 1); rect(ctx, c, fx + 4, 48, 26, 34); circ(ctx, '#d8b088', fx + 17, 60, 5); rect(ctx, '#1a1a2a', fx + 10, 66, 14, 16); rect(ctx, '#e8e4dc', fx + 12, 55, 10, 3); }
      // the flags
      for (const [px, us] of [[88, 1], [296, 0]]) { rect(ctx, '#3a2c10', px - 1, 40, 3, 98); rect(ctx, '#c89a28', px, 40, 1, 98); poly(ctx, '#f0c850', [[px - 3, 40], [px, 33], [px + 4, 40]]); rect(ctx, '#3a2c10', px - 6, 134, 13, 4); }
      // the desk. Everything on it is the most important thing on it.
      rect(ctx, '#1a0e06', 132, 106, 120, 32); grad(ctx, 134, 108, 116, 30, [[0, '#6a3c1a'], [1, '#4a2810']]); rect(ctx, '#8a5428', 132, 104, 120, 4); rect(ctx, '#a86a34', 132, 104, 120, 1);
      for (let i = 0; i < 3; i++) { rect(ctx, '#3a1e0c', 140 + i * 37, 112, 30, 22); rect(ctx, '#5a3216', 141 + i * 37, 113, 28, 20); } circ(ctx, '#c89a28', 192, 123, 6); circ(ctx, '#5a3216', 192, 123, 4); poly(ctx, '#c89a28', [[188, 123], [192, 119], [196, 123], [192, 127]]);
      rect(ctx, '#1a1a1e', 142, 98, 14, 6); rect(ctx, '#1a1a1e', 140, 96, 18, 3); rect(ctx, '#f4f0e4', 168, 101, 16, 3); rect(ctx, '#f4f0e4', 170, 99, 16, 3); rect(ctx, '#c02020', 218, 95, 6, 9); rect(ctx, '#e8e4dc', 218, 97, 6, 2); rect(ctx, '#8a8a92', 219, 94, 4, 1);
      rect(ctx, '#3a2c10', 228, 96, 13, 8); rect(ctx, '#f0c850', 229, 97, 11, 6);
      // the chair behind it
      rect(ctx, '#1a0e06', 180, 84, 24, 22); rect(ctx, '#5a1a1a', 181, 85, 22, 20); rect(ctx, '#7a2a2a', 181, 85, 22, 2); for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) rect(ctx, '#3a0e0e', 186 + k * 6, 90 + i * 7, 1, 1);
      // the floor, and the rug with the seal on it
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#7a5a34'], [1, '#a07a48']]);
      for (let k = -14; k <= 14; k++) { ctx.strokeStyle = 'rgba(40,24,8,0.3)'; ctx.beginPath(); ctx.moveTo(192 + k * 15, TOP); ctx.lineTo(192 + k * 34, H); ctx.stroke(); }
      ctx.save(); ctx.translate(192, 184); ctx.scale(1, 0.27);
      circ(ctx, '#0c1230', 0, 0, 172); circ(ctx, '#c89a28', 0, 0, 168); circ(ctx, '#1a2458', 0, 0, 162); circ(ctx, '#c89a28', 0, 0, 120); circ(ctx, '#202c68', 0, 0, 116);
      for (let i = 0; i < 24; i++) { ctx.save(); ctx.rotate(i * Math.PI / 12); poly(ctx, 'rgba(200,154,40,0.5)', [[0, -30], [5, -112], [-5, -112]]); ctx.restore(); }
      for (let i = 0; i < 26; i++) { const a = i * Math.PI * 2 / 26; ctx.save(); ctx.translate(Math.cos(a) * 141, Math.sin(a) * 141); ctx.scale(1, 3.7); poly(ctx, '#f0ece4', [[0, -2.5], [1, -0.5], [3, -0.5], [1.4, 0.8], [2, 3], [0, 1.6], [-2, 3], [-1.4, 0.8], [-3, -0.5], [-1, -0.5]]); ctx.restore(); }
      circ(ctx, '#c89a28', 0, 0, 34); circ(ctx, '#f4eedc', 0, 0, 30); ctx.restore();
      poly(ctx, '#3a2810', [[182, 184], [192, 180], [202, 184], [196, 185], [192, 188], [188, 185]]); rect(ctx, '#3a2810', 190, 182, 4, 5);
      rect(ctx, '#3a2c10', 0, TOP - 2, W, 3); rect(ctx, '#f4eedc', 0, TOP - 1, W, 1);
    },
    drawAnimated(ctx, t) {
      // the flags move in the air conditioning
      const w = Math.sin(t / 22) * 1.5;
      flagUS(ctx, 90, 44, 26 + w, 46, w); rect(ctx, '#0c1640', 268 - w, 44, 27 + w, 46); rect(ctx, '#1a2a6a', 269 - w, 45, 25 + w, 44); circ(ctx, '#c89a28', 281, 67, 8); circ(ctx, '#1a2a6a', 281, 67, 6); poly(ctx, '#f0c850', [[281, 62], [283, 67], [281, 72], [279, 67]]);
      for (let i = 0; i < 3; i++) { rect(ctx, 'rgba(0,0,0,0.14)', 98 + i * 7 + w, 44, 2, 46); rect(ctx, 'rgba(0,0,0,0.14)', 274 + i * 7 - w, 44, 2, 46); }
      // sprinklers on the lawn, a light on the monument
      for (const wx of [128, 256]) for (let i = 0; i < 6; i++) { const u = ((t + i * 7) % 40) / 40, a = -0.5 - Math.abs(Math.sin(t / 60)) * 2.1; rect(ctx, 'rgba(220,240,255,0.7)', wx + Math.cos(a) * u * 16, 106 + Math.sin(a) * u * 12 + u * u * 10, 1, 1); }
      if (t % 90 < 45) { rect(ctx, '#ff4040', 191, 51, 2, 2); glow(ctx, 192, 52, 6, '255,70,70', 0.5); }
      glow(ctx, 192, 104, 80, '255,180,100', 0.07 + 0.01 * Math.sin(t / 50));
      // the phone, the button
      rect(ctx, (t >> 4) % 2 ? '#ff3030' : '#5a1010', 152, 99, 2, 2);
      const pb = 0.6 + 0.4 * Math.sin(t / 10); circ(ctx, '#8a1010', 235, 100, 3.5); circ(ctx, `rgb(${Math.round(160 + 95 * pb)},30,30)`, 235, 99.5, 2.5); glow(ctx, 235, 99, 9, '255,40,40', 0.4 * pb);
      // the television, on, as ever
      rect(ctx, '#0c0c10', 348, 92, 30, 22); rect(ctx, (t >> 3) % 9 ? '#1c3a6a' : '#2c4a7a', 350, 94, 26, 14); rect(ctx, '#c02020', 350, 104, 26, 4);
      circ(ctx, '#d8b088', 357, 99, 2.5); rect(ctx, '#1a1a2a', 354, 101, 7, 3); T(ctx, 'NEWS', 371, 95, { align: 'right', color: '#ffffff' });
      ctx.save(); ctx.beginPath(); ctx.rect(350, 104, 26, 5); ctx.clip(); T(ctx, 'BREAKING: FIGHT IN OVAL OFFICE. TREMENDOUS FIGHT.', 376 - ((t * 0.5) % 340), 103, { color: '#ffffff' }); ctx.restore();
      rect(ctx, '#0c0c10', 360, 114, 6, 24);
      // evening through the glass, on the rug
      ctx.fillStyle = 'rgba(255,190,110,0.06)'; for (const wx of [128, 192, 256]) { ctx.beginPath(); ctx.moveTo(wx - 20, TOP); ctx.lineTo(wx + 20, TOP); ctx.lineTo(wx + 46 + (wx - 192) * 0.5, 224); ctx.lineTo(wx - 46 + (wx - 192) * 0.5, 224); ctx.fill(); }
    },
  });
  RF.HOME_HAZARDS.oval = { side: 1, name: 'SECRET SERVICE!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#ffffff', sound: 'heavy',
    draw(ctx, x, floorY, frame, firing) {   // he has been standing by that door since breakfast
      if (firing) return; const cx = x - 12, by = floorY;
      rect(ctx, '#0a0a0e', cx - 8, by - 54, 16, 40); rect(ctx, '#1a1a22', cx - 7, by - 53, 14, 38); rect(ctx, '#f4f0e8', cx - 2, by - 53, 4, 12); rect(ctx, '#0a0a0e', cx - 1, by - 52, 2, 12);
      rect(ctx, '#0a0a0e', cx - 6, by - 16, 5, 16); rect(ctx, '#0a0a0e', cx + 1, by - 16, 5, 16); rect(ctx, '#0a0a0e', cx - 8, by - 2, 7, 2); rect(ctx, '#0a0a0e', cx + 1, by - 2, 7, 2);
      circ(ctx, '#0a0a0e', cx, by - 62, 7.5); circ(ctx, '#d8a878', cx, by - 62, 6.5); rect(ctx, '#2a1a0c', cx - 6, by - 69, 12, 4); rect(ctx, '#0a0a0e', cx - 7, by - 64, 11, 3);
      line(ctx, '#e8e4dc', 1, [[cx + 6, by - 62], [cx + 7, by - 56], [cx + 5, by - 52]]); rect(ctx, '#0a0a0e', cx - 9, by - 40, 5, 4);
      if ((frame % 200) < 30) T(ctx, '...', cx - 14, by - 80, { align: 'center', color: '#ffffff', outline: '#000' });
    },
    fx(ctx, x, floorY, t) {
      const u = Math.min(1, t / 8), back = t > 26 ? Math.min(1, (t - 26) / 14) : 0, cx = x - 12 - u * 46 * (1 - back), by = floorY - 22 * Math.sin(Math.min(1, t / 16) * Math.PI);
      ctx.save(); ctx.translate(cx, by - 30); ctx.rotate(-0.9 * u * (1 - back));
      rect(ctx, '#0a0a0e', -8, -24, 16, 40); rect(ctx, '#1a1a22', -7, -23, 14, 38); rect(ctx, '#0a0a0e', -6, 14, 5, 16); rect(ctx, '#0a0a0e', 1, 14, 5, 16); rect(ctx, '#0a0a0e', -30, -20, 24, 6); rect(ctx, '#d8a878', -34, -20, 5, 6);
      circ(ctx, '#0a0a0e', 0, -32, 7.5); circ(ctx, '#d8a878', 0, -32, 6.5); rect(ctx, '#2a1a0c', -6, -39, 12, 4); rect(ctx, '#0a0a0e', -7, -34, 11, 3); ctx.restore();
      if (t > 6 && t < 30) T(ctx, 'GET DOWN!', x - 60, floorY - 96 - t * 0.4, { align: 'center', color: '#ffffff', outline: '#000' });
      for (let i = 0; i < 5; i++) { const a = t * 0.3 + i * 1.256; ctx.globalAlpha = Math.max(0, 1 - t / 40); rect(ctx, '#ffe060', x - 62 + Math.cos(a) * 16, floorY - 74 + Math.sin(a) * 6, 3, 3); } ctx.globalAlpha = 1;
    },
  };
})();
