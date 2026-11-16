// Three stages that are here to be looked at.
//   BETWEEN UNIVERSES (Lopez Tuero)   a glass floor over nothing, three doorways into other worlds, equations adrift.
//                                      Hazard: the singularity (DIVIDED BY ZERO!)
//   ROOFTOP, MIDNIGHT                 forty floors up in a thunderstorm: rain, neon in the puddles, lightning that
//                                      lights the whole sky.                 Hazard: the transformer (SHORT CIRCUIT!)
//   THE CALDERA                       inside the volcano: lava falls, a lake of fire, the cone going off behind it.
//                                      Hazard: the vent (MELTED!)
(function () {
  const { T, rect, grad, poly, circ, line, h1, glow, bolt, FLOOR, TOP } = RF.stageKit;

  // ================================================================ BETWEEN UNIVERSES
  const PORTALS = [[62, 92, 27, 0], [192, 78, 22, 1], [322, 94, 28, 2]];
  // what is on the other side of each doorway
  const world = (ctx, k, x, y, r, t) => {
    if (k === 0) {          // an afternoon somewhere green
      grad(ctx, x - r, y - r, r * 2, r * 2, [[0, '#58b8f0'], [0.6, '#c8ecff'], [1, '#f4f8e0']]);
      circ(ctx, '#fff8c0', x + r * 0.4, y - r * 0.35, r * 0.2); for (let i = 0; i < 3; i++) { const cx = x - r + ((t * 0.08 + i * r * 0.9) % (r * 2.6)) - r * 0.3; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx, y - r * 0.5 + i * 5, 8, 2.5, 0, 0, 7); ctx.fill(); }
      poly(ctx, '#3a9a48', [[x - r, y + r * 0.3], [x - r * 0.3, y + r * 0.05], [x + r * 0.3, y + r * 0.3], [x + r, y + r * 0.1], [x + r, y + r], [x - r, y + r]]);
      poly(ctx, '#2a7a38', [[x - r, y + r * 0.6], [x, y + r * 0.35], [x + r, y + r * 0.55], [x + r, y + r], [x - r, y + r]]);
      rect(ctx, '#5a3a1c', x - r * 0.45, y + r * 0.1, 2, 8); circ(ctx, '#1e6a2c', x - r * 0.45 + 1, y + r * 0.05, 5);
    } else if (k === 1) {   // one that is on fire
      grad(ctx, x - r, y - r, r * 2, r * 2, [[0, '#2a0408'], [0.6, '#a01c10'], [1, '#ff8a20']]);
      for (let i = 0; i < 5; i++) poly(ctx, '#140204', [[x - r + i * r * 0.45, y + r], [x - r + i * r * 0.45 + r * 0.2, y + r * (0.1 + h1(i + 3) * 0.5)], [x - r + i * r * 0.45 + r * 0.45, y + r]]);
      for (let i = 0; i < 8; i++) { const u = ((t * 0.6 + i * 13) % 50) / 50; rect(ctx, i % 2 ? '#ffd040' : '#ff7020', x - r + h1(i + 20) * r * 2, y + r - u * r * 1.8, 2, 2); }
      circ(ctx, '#ffc040', x, y + r * 1.1, r * 0.5 + Math.sin(t / 9) * 2);
    } else {                // an ocean under two moons
      grad(ctx, x - r, y - r, r * 2, r * 1.2, [[0, '#060a2a'], [1, '#2a3a8a']]); grad(ctx, x - r, y + r * 0.2, r * 2, r * 0.8, [[0, '#1a4a8a'], [1, '#081a44']]);
      circ(ctx, '#e8f0ff', x - r * 0.35, y - r * 0.4, r * 0.24); circ(ctx, '#ffb0d0', x + r * 0.45, y - r * 0.15, r * 0.12);
      for (let i = 0; i < 9; i++) rect(ctx, 'rgba(220,235,255,0.7)', x - r * 0.35 - 6 + Math.sin(t / 12 + i) * 3, y + r * 0.25 + i * 2.6, 12 - i, 1);
      for (let i = 0; i < 12; i++) rect(ctx, '#ffffff', x - r + h1(i + 40) * r * 2, y - r + h1(i + 50) * r * 0.9, 1, 1);
    }
  };
  // symbols drawn in chalk light: 0 integral, 1 sigma, 2 pi, 3 infinity, 4 root, 5 delta
  const sym = (ctx, k, x, y, s, c) => {
    const L = (pts) => line(ctx, c, 1.5, pts.map(([px, py]) => [x + px * s, y + py * s]));
    if (k === 0) L([[3, -6], [2, -7], [0.5, -6], [0, 0], [-0.5, 6], [-2, 7], [-3, 6]]);
    else if (k === 1) L([[4, -5], [-4, -5], [1, 0], [-4, 5], [4, 5]]);
    else if (k === 2) { L([[-5, -4], [5, -4]]); L([[-2, -4], [-3, 5]]); L([[2, -4], [3, 5], [4, 5]]); }
    else if (k === 3) { ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, d = 1 + Math.sin(a) * Math.sin(a); const px = x + (6 * Math.cos(a) / d) * s, py = y + (6 * Math.sin(a) * Math.cos(a) / d) * s * 1.6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.lineWidth = 1; }
    else if (k === 4) L([[-5, 0], [-3, -1], [-1, 5], [1, -6], [6, -6]]);
    else L([[0, -6], [5, 5], [-5, 5], [0, -6]]);
  };
  RF.registerStage({
    id: 'multiverse', name: 'Between Universes', music: 'multiverse', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, H, [[0, '#03020c'], [0.5, '#0c0828'], [1, '#160a36']]);
      // the stuff between: dust lit from inside
      [[80, 60, 120, '90,40,160', 0.35], [290, 80, 130, '30,110,150', 0.3], [190, 130, 150, '160,40,110', 0.22], [340, 30, 80, '200,120,40', 0.16], [20, 140, 90, '40,60,180', 0.25]].forEach(([x, y, r, rgb, a]) => glow(ctx, x, y, r, rgb, a));
      for (let i = 0; i < 150; i++) { const b = h1(i + 5); rect(ctx, b > 0.9 ? '#ffffff' : b > 0.6 ? '#a8b4ff' : '#5a5a9a', h1(i) * W, h1(i + 1000) * H, b > 0.95 ? 2 : 1, b > 0.95 ? 2 : 1); }
      // a planet with a ring, a long way off
      ctx.save(); ctx.translate(252, 70); ctx.rotate(-0.35); ctx.strokeStyle = 'rgba(230,200,150,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 19, 4, 0, Math.PI, Math.PI * 2); ctx.stroke(); ctx.restore();
      circ(ctx, '#3a2a5a', 252, 70, 10); circ(ctx, '#6a4a8a', 250, 68, 8); circ(ctx, '#8a6aaa', 248, 66, 4); for (let i = 0; i < 3; i++) rect(ctx, 'rgba(40,20,70,0.5)', 244, 67 + i * 3, 16, 1);
      ctx.save(); ctx.translate(252, 70); ctx.rotate(-0.35); ctx.strokeStyle = 'rgba(230,200,150,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 19, 4, 0, 0, Math.PI); ctx.stroke(); ctx.lineWidth = 1; ctx.restore();
      // the floor: glass, with nothing under it
      grad(ctx, 0, TOP, W, H - TOP, [[0, 'rgba(60,30,140,0.55)'], [1, 'rgba(14,8,50,0.75)']]);
      for (let i = 0; i < 60; i++) rect(ctx, 'rgba(190,200,255,0.5)', h1(i + 1100) * W, TOP + 4 + h1(i + 1110) * 80, 1, 1);
      for (let k = -16; k <= 16; k++) { ctx.strokeStyle = k % 4 === 0 ? 'rgba(90,230,255,0.5)' : 'rgba(90,230,255,0.2)'; ctx.beginPath(); ctx.moveTo(192 + k * 12, TOP); ctx.lineTo(192 + k * 40, H); ctx.stroke(); }
      rect(ctx, '#ff60d0', 0, TOP - 1, W, 1); rect(ctx, '#60e8ff', 0, TOP, W, 1); glow(ctx, 192, TOP, 200, '255,90,210', 0.12);
    },
    drawAnimated(ctx, t) {
      // stars that come and go
      for (let i = 0; i < 14; i++) if ((t + i * 23) % 90 < 8) { const x = h1(i * 7) * 384, y = h1(i * 7 + 1000) * 130; rect(ctx, '#ffffff', x - 1, y, 3, 1); rect(ctx, '#ffffff', x, y - 1, 1, 3); }
      // one falling, sometimes
      const fs = t % 210; if (fs < 22) { const s = Math.floor(t / 210), x = 40 + h1(s) * 300 + fs * 5, y = 20 + h1(s + 1) * 40 + fs * 2.4; line(ctx, 'rgba(255,255,255,0.9)', 1.5, [[x, y], [x - 22, y - 10.5]]); line(ctx, 'rgba(160,200,255,0.4)', 1, [[x - 22, y - 10.5], [x - 46, y - 22]]); }
      // the doorways
      for (const [x, y, r, k] of PORTALS) {
        const bob = Math.sin(t / 50 + k * 2) * 3, cy = y + bob, rgb = ['120,255,170', '255,120,60', '120,170,255'][k];
        glow(ctx, x, cy, r * 2.1, rgb, 0.28 + 0.06 * Math.sin(t / 20 + k));
        ctx.save(); ctx.beginPath(); ctx.arc(x, cy, r, 0, 7); ctx.clip(); world(ctx, k, x, cy, r, t);
        const g = ctx.createRadialGradient(x, cy, r * 0.55, x, cy, r); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,0,30,0.7)'); ctx.fillStyle = g; ctx.fillRect(x - r, cy - r, r * 2, r * 2); ctx.restore();
        ctx.strokeStyle = '#0a0418'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, cy, r + 1, 0, 7); ctx.stroke();
        for (let i = 0; i < 12; i++) { const a = t / (40 + k * 12) * (k % 2 ? -1 : 1) + i * Math.PI / 6; ctx.strokeStyle = i % 2 ? `rgba(${rgb},1)` : '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy, r + 1, a, a + 0.34); ctx.stroke(); }
        ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = -t / 30 + i * 1.05 + k, d = r + 5 + ((t + i * 9) % 20) * 0.5; rect(ctx, `rgba(${rgb},${1 - ((t + i * 9) % 20) / 20})`, x + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 2); }
        // each one lies on the glass
        ctx.fillStyle = `rgba(${rgb},0.10)`; ctx.beginPath(); ctx.ellipse(x, 170 + k * 4, r * 1.5, 7, 0, 0, 7); ctx.fill();
      }
      // equations, adrift
      for (let i = 0; i < 9; i++) { const x = (h1(i + 1200) * 420 + t * (0.08 + h1(i + 1210) * 0.1)) % 420 - 18, y = 44 + h1(i + 1220) * 86 + Math.sin(t / 40 + i) * 5, a = 0.35 + 0.3 * Math.sin(t / 35 + i * 1.3); sym(ctx, i % 6, x, y, 1 + (i % 3) * 0.35, `rgba(${i % 2 ? '160,240,255' : '255,220,150'},${a})`); }
      const eq = Math.floor(t / 300) % 4, ea = Math.sin(((t % 300) / 300) * Math.PI); T(ctx, ['E = MC2', 'A2 + B2 = C2', 'X = X + 1 ?', 'Q.E.D.'][eq], 128, 122 + Math.sin(t / 60) * 3, { align: 'center', color: `rgba(200,240,255,${0.15 + ea * 0.55})` });
      // a crack in it, now and then
      const rf = t % 340; if (rf < 14) { const s = Math.floor(t / 340), x0 = 60 + h1(s + 60) * 260; bolt(ctx, x0, 34, x0 + (h1(s + 61) - 0.5) * 120, 118, s * 13 + (rf >> 2), 22, 'rgba(255,140,240,0.5)', 4); bolt(ctx, x0, 34, x0 + (h1(s + 61) - 0.5) * 120, 118, s * 13 + (rf >> 2), 22, '#ffffff', 1.5); ctx.fillStyle = `rgba(220,160,255,${0.08 * (1 - rf / 14)})`; ctx.fillRect(0, 0, 384, 224); }
      // the grid, coming toward you
      const ph = (t / 46) % 1; for (let i = 0; i < 9; i++) { const u = (i + ph) / 9, y = TOP + (224 - TOP) * u * u; ctx.fillStyle = `rgba(255,96,208,${0.12 + u * 0.4})`; ctx.fillRect(0, Math.round(y), 384, 1); }
      // and a pulse through the glass
      const pu = (t % 150) / 150; ctx.strokeStyle = `rgba(96,232,255,${0.3 * (1 - pu)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(192, 182, pu * 230, pu * 46, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
    },
  });
  RF.HOME_HAZARDS.multiverse = { side: 1, name: 'DIVIDED BY ZERO!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#d080ff', sound: 'arcane',
    draw(ctx, x, floorY, frame, firing) {   // a small singularity. It is not small enough.
      const cx = x - 14, cy = floorY - 44, k = firing ? 1.5 : 1;
      glow(ctx, cx, cy, 34 * k, '200,110,255', 0.45);
      for (let i = 0; i < 10; i++) { const a = frame / 9 + i * 0.63, r = (8 + (i % 4) * 4) * k; ctx.strokeStyle = i % 2 ? 'rgba(255,170,90,0.9)' : 'rgba(210,130,255,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.5, r * 0.45, -0.4, a, a + 1.1); ctx.stroke(); }
      ctx.lineWidth = 1; circ(ctx, '#000000', cx, cy, 8 * k); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, 8 * k + 0.5, 0, 7); ctx.stroke();
    },
    fx(ctx, x, floorY, t) {
      const cx = x - 14, cy = floorY - 44, a = Math.max(0, 1 - t / 46);
      for (let i = 0; i < 26; i++) { const an = Math.PI + (h1(i + 1300) - 0.5) * 2.6, d0 = 30 + h1(i + 1310) * 150, d = d0 * Math.max(0, 1 - ((t + i * 2) % 26) / 26); line(ctx, `rgba(${i % 2 ? '255,255,255' : '210,130,255'},${a})`, 1.5, [[cx + Math.cos(an) * d, cy + Math.sin(an) * d * 0.7], [cx + Math.cos(an) * (d + 14), cy + Math.sin(an) * (d + 14) * 0.7]]); }
      ctx.fillStyle = `rgba(0,0,0,${a * 0.35})`; ctx.fillRect(-20, -20, 430, 270); circ(ctx, '#000000', cx, cy, 10 + Math.min(18, t)); ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 11 + Math.min(18, t), 0, 7); ctx.stroke(); ctx.lineWidth = 1;
      if (t < 34) T(ctx, '1 / 0', cx - 46, cy - 46 - t * 0.5, { align: 'center', color: '#ffffff', outline: '#000' });
    },
  };

  // ================================================================ ROOFTOP, MIDNIGHT
  const SKY = []; { let x = -4, i = 0; while (x < 390) { const w = 12 + h1(i + 1400) * 20, hgt = 20 + h1(i + 1410) * 50; SKY.push([x, w, hgt, i]); x += w + h1(i + 1420) * 4; i++; } }
  const SIGNS = [[58, 60, 'HOTEL', '255,60,120', 1], [322, 74, 'NOODLES', '60,230,255', 0], [206, 96, '24H', '255,210,60', 0]];
  const whenBolt = (t) => { const c = Math.floor(t / 150), at = c * 150 + 30 + Math.floor(h1(c + 1500) * 90); return { c, age: t - at }; };
  RF.registerStage({
    id: 'storm', name: 'Rooftop, Midnight', music: 'storm', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, TOP, [[0, '#04060e'], [0.6, '#121a2e'], [1, '#2a2444']]);
      // the cloud, low over everything
      for (let i = 0; i < 26; i++) { const x = h1(i + 1510) * 420 - 18, y = 20 + h1(i + 1520) * 54, w = 34 + h1(i + 1530) * 50; ctx.fillStyle = i % 3 ? 'rgba(20,26,44,0.7)' : 'rgba(40,46,70,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, w, 9 + h1(i) * 8, 0, 0, 7); ctx.fill(); }
      // the city down below
      for (let i = 0; i < 34; i++) { const x = i * 11.6, hgt = 10 + h1(i + 1540) * 26; rect(ctx, '#1a1a36', x, 130 - hgt, 10, hgt + 8); }
      for (const [x, w, hgt, i] of SKY) { rect(ctx, '#080a18', x, TOP - hgt, w, hgt); rect(ctx, '#141830', x, TOP - hgt, 1, hgt); if (i % 4 === 0) rect(ctx, '#080a18', x + w / 2, TOP - hgt - 9, 1, 9); if (i % 6 === 3) { rect(ctx, '#080a18', x + 2, TOP - hgt - 8, w - 4, 6); rect(ctx, '#080a18', x + 3, TOP - hgt - 2, 1, 2); rect(ctx, '#080a18', x + w - 4, TOP - hgt - 2, 1, 2); poly(ctx, '#080a18', [[x + 1, TOP - hgt - 8], [x + w / 2, TOP - hgt - 12], [x + w - 1, TOP - hgt - 8]]); } }
      // the next roof over on each side, with something to hang a sign on
      rect(ctx, '#05060e', 34, 50, 44, 88); rect(ctx, '#0e1020', 36, 52, 3, 86); rect(ctx, '#05060e', 296, 62, 58, 76); rect(ctx, '#0e1020', 298, 64, 3, 74);
      rect(ctx, '#05060e', 290, 66, 70, 18); rect(ctx, '#05060e', 300, 84, 3, 10); rect(ctx, '#05060e', 346, 84, 3, 10);
      // this roof: parapet, plant, pipework
      rect(ctx, '#05060e', 0, 122, W, 16); rect(ctx, '#1c2030', 0, 123, W, 4); rect(ctx, '#2c3248', 0, 123, W, 1); rect(ctx, '#10121e', 0, 127, W, 11); for (let x = 0; x < W; x += 28) rect(ctx, '#05060e', x, 127, 1, 11);
      for (const ax of [100, 244]) { rect(ctx, '#05060e', ax, 104, 40, 20); rect(ctx, '#3a4050', ax + 1, 105, 38, 18); rect(ctx, '#4e5568', ax + 1, 105, 38, 2); for (let i = 0; i < 5; i++) rect(ctx, '#1c2030', ax + 22 + i * 3, 109, 2, 11); circ(ctx, '#05060e', ax + 11, 114, 8); circ(ctx, '#1c2030', ax + 11, 114, 7); }
      ctx.strokeStyle = '#05060e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(140, 118); ctx.lineTo(176, 118); ctx.lineTo(176, 106); ctx.lineTo(230, 106); ctx.lineTo(230, 118); ctx.lineTo(244, 118); ctx.stroke(); ctx.strokeStyle = '#5a6078'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(140, 118); ctx.lineTo(176, 118); ctx.lineTo(176, 106); ctx.lineTo(230, 106); ctx.lineTo(230, 118); ctx.lineTo(244, 118); ctx.stroke(); ctx.lineWidth = 1;
      rect(ctx, '#05060e', 166, 96, 8, 26); rect(ctx, '#3a4050', 167, 97, 6, 25); rect(ctx, '#05060e', 164, 94, 12, 4);
      // wet concrete, a painted H, hazard paint at the edge
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#10121e'], [1, '#1e2234']]);
      for (let i = 0; i < 40; i++) rect(ctx, 'rgba(0,0,0,0.2)', h1(i + 1550) * W, TOP + 4 + h1(i + 1560) * 80, 10 + h1(i) * 24, 1);
      ctx.save(); ctx.translate(192, 182); ctx.scale(1, 0.3); ctx.strokeStyle = 'rgba(240,200,40,0.55)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 118, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(230,235,245,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 96, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(230,235,245,0.5)'; ctx.fillRect(-30, -52, 14, 104); ctx.fillRect(16, -52, 14, 104); ctx.fillRect(-30, -9, 60, 18); ctx.restore();
      for (let x = -8; x < W; x += 20) poly(ctx, 'rgba(240,200,40,0.4)', [[x, TOP + 2], [x + 10, TOP + 2], [x + 6, TOP + 7], [x - 4, TOP + 7]]);
      // puddles
      for (const [px, py, pw] of [[84, 176, 30], [286, 190, 38], [176, 208, 44], [330, 160, 20], [30, 200, 26]]) { ctx.fillStyle = 'rgba(120,140,190,0.13)'; ctx.beginPath(); ctx.ellipse(px, py, pw, pw * 0.16, 0, 0, 7); ctx.fill(); }
    },
    drawAnimated(ctx, t) {
      const { c, age } = whenBolt(t), fl = age >= 0 && age < 20 ? (age < 3 ? 1 : age < 6 ? 0.25 : age < 9 ? 0.8 : Math.max(0, 1 - (age - 9) / 11)) : 0;
      // the strike: the cloud lights from inside, then the bolt, then the whole city
      if (fl > 0) {
        const bx = 60 + h1(c + 1570) * 264;
        glow(ctx, bx, 30, 150, '170,190,255', 0.5 * fl);
        if (age < 10) { const pts = bolt(ctx, bx, 10, bx + (h1(c + 1571) - 0.5) * 90, 112, c * 17, 24, `rgba(150,180,255,${0.6 * fl})`, 5); line(ctx, '#ffffff', 1.5, pts); const m = pts[Math.floor(pts.length * 0.55)]; bolt(ctx, m[0], m[1], m[0] + (h1(c + 1572) - 0.5) * 100, m[1] + 30, c * 19, 14, `rgba(220,230,255,${fl})`, 1); }
        ctx.fillStyle = `rgba(190,205,255,${0.22 * fl})`; ctx.fillRect(0, 0, 384, 224);
      }
      // windows
      for (const [x, w, hgt, i] of SKY) for (let k = 0; k < 9; k++) { const s = i * 37 + k, wx = x + 2 + (s % Math.max(1, Math.floor((w - 3) / 3))) * 3, wy = TOP - hgt + 3 + Math.floor(h1(s) * (hgt - 6) / 4) * 4; if (h1(s + Math.floor((t + s * 11) / 300)) > 0.5) rect(ctx, ['#ffd890', '#a8d0ff', '#ffb070'][s % 3], wx, wy, 1, 2); }
      for (const [x, w, hgt, i] of SKY) if (i % 4 === 0 && (t + i * 17) % 70 < 35) { rect(ctx, '#ff3030', x + w / 2 - 0.5, TOP - hgt - 10, 2, 2); glow(ctx, x + w / 2, TOP - hgt - 9, 6, '255,60,60', 0.5); }
      // neon: the tube, the halo, and a smear of it in the wet
      for (const [sx, sy, txt, rgb, vert] of SIGNS) {
        const s = Math.floor(t / 6), dead = h1(s + sx) > 0.94 || ((t + sx * 3) % 260 > 244 && (t >> 1) % 2), a = dead ? 0.25 : 1, col = `rgba(${rgb},${a})`;
        if (vert) [...txt].forEach((ch, i) => T(ctx, ch, sx, sy + i * 11, { align: 'center', color: col, outline: '#1a0410' }));
        else T(ctx, txt, sx, sy + 4, { align: 'center', color: col, outline: '#04101a' });
        const cy = vert ? sy + txt.length * 5.5 : sy + 7, rr = vert ? 36 : 30; glow(ctx, sx, cy, rr, rgb, 0.3 * a);
        for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(${rgb},${(0.2 - i * 0.015) * a})`; ctx.fillRect(Math.round(sx - 12 + Math.sin(t / 9 + i * 0.9) * 3), TOP + 3 + i * 6, 24, 4); }
      }
      // fans, steam
      for (const ax of [100, 244]) { const a = t / 3; for (let i = 0; i < 3; i++) line(ctx, '#5a6078', 2, [[ax + 11, 114], [ax + 11 + Math.cos(a + i * 2.094) * 6, 114 + Math.sin(a + i * 2.094) * 6]]); }
      for (let i = 0; i < 8; i++) { const u = ((t * 0.7 + i * 13) % 100) / 100; ctx.fillStyle = `rgba(200,210,230,${0.16 * (1 - u)})`; ctx.beginPath(); ctx.arc(170 + Math.sin(u * 6 + i) * 6 + u * 16, 94 - u * 44, 3 + u * 7, 0, 7); ctx.fill(); }
      // rain: far (thin, slow), then near (long, fast), then where it lands
      ctx.strokeStyle = 'rgba(150,170,220,0.22)'; ctx.beginPath(); for (let i = 0; i < 46; i++) { const x = (h1(i + 1600) * 440 - t * 1.4 - 20) % 440, y = (h1(i + 1610) * 150 + t * 5) % 150; const xx = x < 0 ? x + 440 : x; ctx.moveTo(xx, y); ctx.lineTo(xx - 2, y + 6); } ctx.stroke();
      ctx.strokeStyle = `rgba(190,205,240,${0.38 + fl * 0.4})`; ctx.beginPath(); for (let i = 0; i < 56; i++) { const x = (h1(i + 1620) * 460 - t * 2.6 - 30) % 460, y = (h1(i + 1630) * 250 + t * 9) % 250 - 14; const xx = x < 0 ? x + 460 : x; ctx.moveTo(xx, y); ctx.lineTo(xx - 4, y + 13); } ctx.stroke();
      for (let i = 0; i < 16; i++) { const s = Math.floor((t + i * 5) / 12) * 16 + i, u = ((t + i * 5) % 12) / 12, x = h1(s + 1640) * 384, y = TOP + 6 + h1(s + 1650) * 80; ctx.strokeStyle = `rgba(200,215,250,${0.5 * (1 - u)})`; ctx.beginPath(); ctx.ellipse(x, y, 1 + u * 7, 0.4 + u * 1.6, 0, 0, 7); ctx.stroke(); if (u < 0.3) rect(ctx, 'rgba(220,230,255,0.7)', x, y - 2 - u * 6, 1, 2); }
      // the wind takes the rain off the parapet
      for (let i = 0; i < 12; i++) rect(ctx, 'rgba(190,205,240,0.35)', (i * 34 + t * 2) % 400 - 8, 121 - ((t + i * 7) % 5), 2, 1);
      if (fl > 0) { ctx.fillStyle = `rgba(190,205,255,${0.1 * fl})`; ctx.fillRect(0, TOP, 384, 86); }
    },
  });
  RF.HOME_HAZARDS.storm = { side: -1, name: 'SHORT CIRCUIT!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#80e0ff', sound: 'zap',
    draw(ctx, x, floorY, frame, firing) {   // a transformer that should not be out in this
      const l = x - 2; rect(ctx, '#05060e', l, floorY - 50, 26, 50); rect(ctx, '#4a5060', l + 1, floorY - 49, 24, 48); rect(ctx, '#626a7e', l + 1, floorY - 49, 24, 2); for (let i = 0; i < 6; i++) rect(ctx, '#2c3040', l + 3 + i * 4, floorY - 40, 2, 26);
      rect(ctx, '#f0c818', l + 5, floorY - 12, 16, 9); poly(ctx, '#05060e', [[l + 14, floorY - 11], [l + 10, floorY - 7], [l + 13, floorY - 7], [l + 11, floorY - 4], [l + 16, floorY - 8], [l + 13, floorY - 8]]);
      for (const ix of [6, 19]) { rect(ctx, '#05060e', l + ix - 2, floorY - 62, 5, 13); rect(ctx, '#c8c0a8', l + ix - 1, floorY - 61, 3, 11); for (let i = 0; i < 3; i++) rect(ctx, '#8a8470', l + ix - 2, floorY - 59 + i * 4, 5, 1); }
      const s = Math.floor(frame / 3); if (firing || h1(s + 1700) > 0.6) { bolt(ctx, l + 6, floorY - 62, l + 19, floorY - 62, s, 8, '#c0f0ff', 1.5); glow(ctx, l + 12, floorY - 62, 14, '120,220,255', 0.5); for (let i = 0; i < 3; i++) rect(ctx, '#ffffa0', l + 12 + (h1(s + i) - 0.5) * 20, floorY - 60 + h1(s + i + 5) * 14, 1, 1); }
    },
    fx(ctx, x, floorY, t) {
      const a = Math.max(0, 1 - t / 40); ctx.fillStyle = `rgba(170,225,255,${a * 0.3})`; ctx.fillRect(-20, -20, 430, 270);
      for (let i = 0; i < 7; i++) { const s = Math.floor(t / 2) * 7 + i * 13; bolt(ctx, x + 12, floorY - 60, x + 30 + h1(s + 1710) * 90, floorY - h1(s + 1720) * 100, s, 15, i % 2 ? `rgba(255,255,255,${a})` : `rgba(120,220,255,${a})`, i % 2 ? 1.5 : 3); }
      for (let i = 0; i < 18; i++) { const an = -Math.PI / 2 + (h1(i + 1730) - 0.3) * 2, d = t * (1.5 + h1(i + 1740) * 2.5); rect(ctx, `rgba(255,255,160,${a})`, x + 12 + Math.cos(an) * d, floorY - 60 + Math.sin(an) * d + t * t * 0.05, 2, 2); }
    },
  };

  // ================================================================ THE CALDERA
  const lavaFall = (ctx, x, y0, y1, w, t) => {   // molten rock coming down a wall
    rect(ctx, '#3a0a04', x - w / 2 - 2, y0, w + 4, y1 - y0); grad(ctx, x - w / 2, y0, w, y1 - y0, [[0, '#ffb030'], [0.5, '#ff6a10'], [1, '#ffd060']]);
    rect(ctx, '#fff0a0', x - 1, y0, 2, y1 - y0);
    for (let i = 0; i < 9; i++) { const y = y0 + ((t * (2.2 + (i % 3) * 0.7) + i * 23) % (y1 - y0)); rect(ctx, i % 2 ? '#fff4b0' : '#c83808', x - w / 2 + (i * 5) % w, y, 2, 5 + (i % 3) * 2); }
    glow(ctx, x, (y0 + y1) / 2, 40, '255,120,30', 0.25); glow(ctx, x, y1, 26, '255,200,80', 0.55 + 0.1 * Math.sin(t / 5));
    for (let i = 0; i < 5; i++) { const u = ((t + i * 6) % 24) / 24, a = -Math.PI * (0.15 + i * 0.175); rect(ctx, `rgba(255,220,100,${1 - u})`, x + Math.cos(a) * u * 16, y1 + Math.sin(a) * u * 12 + u * u * 8, 2, 2); }
  };
  RF.registerStage({
    id: 'caldera', name: 'The Caldera', music: 'caldera', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      // the sky you can see from down here: smoke, and the light under it
      grad(ctx, 0, 0, W, TOP, [[0, '#120404'], [0.45, '#4a0e08'], [0.8, '#b0340c'], [1, '#ff8a20']]);
      for (let i = 0; i < 22; i++) { const x = h1(i + 1800) * 420 - 18, y = 14 + h1(i + 1810) * 60; ctx.fillStyle = i % 2 ? 'rgba(20,6,6,0.55)' : 'rgba(70,20,12,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, 34 + h1(i + 1820) * 44, 8 + h1(i) * 8, 0, 0, 7); ctx.fill(); }
      // the cone, far across the lake
      poly(ctx, '#1a0606', [[120, 124], [164, 80], [176, 72], [184, 76], [190, 70], [200, 74], [208, 72], [222, 82], [268, 124]]);
      poly(ctx, '#2e0c08', [[164, 80], [176, 72], [184, 76], [178, 96], [160, 110], [140, 124], [120, 124]]);
      for (const [a, b] of [[[186, 74], [182, 92]], [[182, 92], [190, 108]], [[198, 74], [206, 92]], [[206, 92], [202, 112]], [[190, 108], [186, 124]]]) line(ctx, '#ff7a18', 2, [a, b]);
      line(ctx, '#ffd060', 1, [[186, 74], [182, 92], [190, 108], [186, 124]]);
      // the lake of it
      grad(ctx, 0, 118, W, 20, [[0, '#ffd870'], [0.3, '#ff8a18'], [1, '#c83008']]);
      for (let i = 0; i < 26; i++) { const x = h1(i + 1830) * W, y = 121 + h1(i + 1840) * 15, w = 8 + h1(i + 1850) * 22; ctx.fillStyle = 'rgba(40,8,4,0.8)'; ctx.beginPath(); ctx.ellipse(x, y, w, 1.5 + (y - 120) * 0.08, 0, 0, 7); ctx.fill(); }
      // the walls of the crater, either side: basalt in columns, with the fire showing through
      for (const s of [-1, 1]) { const X = (v) => (s < 0 ? v : W - v);
        poly(ctx, '#0c0404', [[X(0), 0], [X(112), 0], [X(96), 26], [X(104), 54], [X(84), 78], [X(92), 104], [X(70), 122], [X(64), TOP], [X(0), TOP]]);
        poly(ctx, '#200a08', [[X(0), 0], [X(96), 0], [X(82), 30], [X(88), 56], [X(70), 82], [X(74), 106], [X(54), TOP], [X(0), TOP]]);
        for (let i = 0; i < 10; i++) { const cx = X(4 + i * 8), top = 6 + h1(i + (s > 0 ? 50 : 0) + 1860) * 30; rect(ctx, i % 2 ? '#2c0e0a' : '#180706', Math.min(cx, cx + s * 7), top, 7, TOP - top); rect(ctx, 'rgba(255,140,60,0.10)', Math.min(cx, cx + s * 7) + (s < 0 ? 6 : 0), top, 1, TOP - top); }
        for (let i = 0; i < 5; i++) { const x0 = X(10 + h1(i + 1870 + s) * 60), y0 = 30 + i * 20; line(ctx, '#ff6a10', 2, [[x0, y0], [x0 + s * 6, y0 + 9], [x0 - s * 3, y0 + 17], [x0 + s * 4, y0 + 26]]); line(ctx, '#ffd060', 1, [[x0, y0], [x0 + s * 6, y0 + 9], [x0 - s * 3, y0 + 17]]); }
      }
      // the ledge you are fighting on: black glass, cracked, and hot underneath
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#1c0806'], [0.3, '#140606'], [1, '#221010']]);
      for (let j = 0; j < 6; j++) for (let k = -9; k <= 9; k++) { const y0 = TOP + (H - TOP) * Math.pow(j / 6, 1.5), y1 = TOP + (H - TOP) * Math.pow((j + 1) / 6, 1.5), sx = (y) => 192 + (k + (j % 2) * 0.5) * 30 * ((y - (TOP - 46)) / 46); if ((k + j * 3) % 4 === 0) poly(ctx, 'rgba(255,255,255,0.03)', [[sx(y0), y0], [sx(y0) + 30 * ((y0 - TOP + 46) / 46), y0], [sx(y1) + 30 * ((y1 - TOP + 46) / 46), y1], [sx(y1), y1]]); }
      rect(ctx, '#3a0e06', 0, TOP - 2, W, 3); rect(ctx, '#ff8a20', 0, TOP - 2, W, 1);
      grad(ctx, 0, TOP, W, 34, [[0, 'rgba(255,120,30,0.30)'], [1, 'rgba(255,120,30,0)']]);
    },
    drawAnimated(ctx, t) {
      // the cone is going off
      glow(ctx, 192, 68, 60, '255,140,40', 0.4 + 0.1 * Math.sin(t / 7));
      for (let i = 0; i < 26; i++) { const life = 70 + (i % 5) * 12, u = ((t + i * 11) % life) / life, vx = (h1(i + 1900) - 0.5) * 70, vy = 44 + h1(i + 1910) * 40; const x = 192 + vx * u, y = 72 - vy * u * 2 + vy * 2.2 * u * u; if (y > 118) continue; rect(ctx, u < 0.3 ? '#fff4b0' : u < 0.6 ? '#ffb030' : '#e04a10', x, y, u < 0.5 ? 2 : 1, u < 0.5 ? 2 : 1); }
      for (let i = 0; i < 9; i++) { const u = ((t * 0.5 + i * 17) % 150) / 150; ctx.fillStyle = `rgba(40,14,12,${0.5 * (1 - u)})`; ctx.beginPath(); ctx.arc(192 + Math.sin(u * 5 + i) * 10 + u * 50, 64 - u * 70, 6 + u * 16, 0, 7); ctx.fill(); }
      // a bomb out of it, sometimes, all the way over here
      const bt = t % 190; if (bt < 46) { const s = Math.floor(t / 190), u = bt / 46, x = 192 + (h1(s + 1920) - 0.5) * 300 * u, y = 70 - 90 * u + 150 * u * u; if (y < 126) { for (let i = 1; i < 6; i++) { const uu = Math.max(0, u - i * 0.02); rect(ctx, `rgba(255,${180 - i * 24},40,${1 - i / 6})`, 192 + (h1(s + 1920) - 0.5) * 300 * uu, 70 - 90 * uu + 150 * uu * uu, 3, 3); } circ(ctx, '#fff4b0', x + 1, y + 1, 2.5); glow(ctx, x, y, 12, '255,170,60', 0.6); } }
      // the lake moves
      for (let i = 0; i < 14; i++) { const x = (h1(i + 1930) * 420 + t * (0.12 + (i % 3) * 0.06)) % 420 - 18, y = 121 + (i % 6) * 2.6; rect(ctx, `rgba(255,240,170,${0.45 + 0.3 * Math.sin(t / 14 + i)})`, x, y, 10 + (i % 4) * 5, 1); }
      for (let i = 0; i < 5; i++) { const s = Math.floor((t + i * 31) / 60) * 5 + i, u = ((t + i * 31) % 60) / 60, x = 74 + h1(s + 1940) * 236, y = 124 + h1(s + 1950) * 10; if (u < 0.7) circ(ctx, '#ffe890', x, y, 1 + u * 4); else { ctx.strokeStyle = `rgba(255,232,144,${(1 - u) * 3})`; ctx.beginPath(); ctx.arc(x, y, 4 + (u - 0.7) * 20, Math.PI, Math.PI * 2); ctx.stroke(); } }
      glow(ctx, 192, 128, 200, '255,120,30', 0.14 + 0.02 * Math.sin(t / 22));
      // lava down both walls
      lavaFall(ctx, 74, 58, 128, 10, t); lavaFall(ctx, 316, 44, 128, 12, t + 40);
      // the cracks in the ledge, breathing
      const pulse = 0.55 + 0.45 * Math.sin(t / 26);
      [[[20, 150], [60, 158], [84, 152], [130, 166]], [[130, 166], [150, 184], [128, 200], [140, 222]], [[130, 166], [190, 160], [226, 172]], [[226, 172], [262, 162], [310, 170], [364, 156]], [[226, 172], [240, 196], [286, 206], [300, 222]], [[310, 170], [336, 190], [380, 196]], [[60, 158], [44, 184], [10, 196]]].forEach((pts, i) => {
        line(ctx, `rgba(255,90,16,${0.35 + 0.3 * pulse})`, 4, pts); line(ctx, `rgba(255,${190 + 40 * pulse},90,${0.7 + 0.3 * pulse})`, 1.5, pts); const m = pts[1]; glow(ctx, m[0], m[1], 22, '255,110,30', 0.12 + 0.1 * pulse); });
      // embers, everywhere, going up
      for (let i = 0; i < 44; i++) { const life = 150 + (i % 7) * 30, u = ((t + i * 37) % life) / life, x = (h1(i + 1960) * 400 + Math.sin(u * 9 + i) * 12) % 400 - 8, y = 216 - u * 230; rect(ctx, `rgba(255,${130 + (i % 4) * 30},40,${(1 - u) * (0.5 + 0.5 * Math.sin(t / 5 + i))})`, x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1); }
      // the heat coming off it all
      ctx.fillStyle = `rgba(255,90,20,${0.045 + 0.015 * Math.sin(t / 18)})`; ctx.fillRect(0, 0, 384, 224);
    },
  });
  RF.HOME_HAZARDS.caldera = { side: 1, name: 'MELTED!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#ff8a20', sound: 'boom',
    draw(ctx, x, floorY, frame, firing) {   // a vent in the ledge, right by the wall
      const cx = x - 14; poly(ctx, '#0c0404', [[cx - 18, floorY], [cx - 10, floorY - 16], [cx - 3, floorY - 20], [cx + 6, floorY - 18], [cx + 16, floorY]]); poly(ctx, '#2c0e0a', [[cx - 15, floorY], [cx - 9, floorY - 14], [cx - 3, floorY - 17], [cx - 5, floorY]]);
      ctx.fillStyle = '#ff8a18'; ctx.beginPath(); ctx.ellipse(cx - 1, floorY - 18, 7, 2.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe890'; ctx.beginPath(); ctx.ellipse(cx - 1, floorY - 18, 4, 1.2, 0, 0, 7); ctx.fill();
      glow(ctx, cx, floorY - 20, 22, '255,130,30', 0.4 + 0.15 * Math.sin(frame / 8));
      for (let i = 0; i < 4; i++) { const u = ((frame + i * 9) % 30) / 30; rect(ctx, `rgba(255,${200 - i * 20},80,${1 - u})`, cx - 5 + i * 3 + Math.sin(u * 5 + i) * 2, floorY - 20 - u * (firing ? 40 : 16), 2, 2); }
    },
    fx(ctx, x, floorY, t) {
      const cx = x - 14, a = Math.max(0, 1 - t / 46), hgt = Math.min(1, t / 6) * 130 * (t > 26 ? Math.max(0, 1 - (t - 26) / 20) : 1);
      grad(ctx, cx - 9, floorY - 18 - hgt, 18, hgt, [[0, 'rgba(255,240,150,0.9)'], [0.5, 'rgba(255,130,20,0.95)'], [1, 'rgba(255,220,90,1)']]); rect(ctx, '#fff4b0', cx - 2, floorY - 18 - hgt, 4, hgt);
      for (let i = 0; i < 24; i++) { const an = -Math.PI / 2 + (h1(i + 1980) - 0.5) * 1.8, d = t * (2 + h1(i + 1990) * 3); ctx.globalAlpha = a; circ(ctx, i % 2 ? '#ffd060' : '#ff6a10', cx + Math.cos(an) * d, floorY - 30 + Math.sin(an) * d + t * t * 0.06, 2 + (i % 3)); }
      ctx.globalAlpha = 1; glow(ctx, cx, floorY - 60, 90, '255,130,30', a * 0.6);
    },
  };
})();
