// Four places the story needed (all of them are also stages you can fight on):
//   post      THE KEEPER'S POST   a security desk at the door between universes, and a wall of screens:
//                                 every Terramania High there is
//   tribunal  THE BENCH           where the Judge sits, above everything, with the school in the gallery
//   oblock    O BLOCK             the block Olu kept: a summer evening that never ended
//   pizzeria  LOOR'S              the pizza place. The oven is always on.
(function () {
  const { rng } = RF.util;
  const T = (...a) => RF.font.drawText(...a);
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const grad = (ctx, x, y, w, h, stops) => { const g = ctx.createLinearGradient(0, y, 0, y + h); for (const [o, c] of stops) g.addColorStop(o, c); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); };
  const FLOOR = 204, TOP = 140, GOLD = '#ffd75a', ICE = '#8fe6ff';
  // a floor that runs away from you: bands that get thinner toward the back wall, and lines to a vanishing point
  const floor = (ctx, W, H, a, b, line) => {
    for (let y = TOP, i = 0; y < H; i++) { const h = 2 + i; rect(ctx, i % 2 ? a : b, 0, y, W, h); y += h; }
    if (line) { ctx.strokeStyle = line; for (let k = -12; k <= 12; k++) { ctx.beginPath(); ctx.moveTo(192 + k * 10, TOP); ctx.lineTo(192 + k * 58, H); ctx.stroke(); } }
  };
  const SKY = [['#4a90e0', '#bfe4ff'], ['#ff4fb0', '#ffb040'], ['#02030a', '#141a2e'], ['#3a0806', '#ff7a10'], ['#0a3a2a', '#8fe0a0'], ['#2a1a4a', '#c080ff']];
  const SCREENS = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) { const x = 8 + c * 37 + (c > 4 ? 6 : 0); if (x > 150 && x < 204) continue; SCREENS.push([x, 22 + r * 25, r * 10 + c]); }

  // ================================================================== THE KEEPER'S POST
  RF.registerStage({
    id: 'post', name: "The Keeper's Post", music: 'throne', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      const r = rng(7);
      grad(ctx, 0, 0, W, TOP, [[0, '#010308'], [0.7, '#04101c'], [1, '#0a2030']]);
      for (let i = 0; i < 60; i++) rect(ctx, i % 6 ? '#22405a' : ICE, Math.floor(r() * W), Math.floor(r() * 120), 1, 1);
      // the wall of screens: a frame for each universe
      for (const [x, y] of SCREENS) { rect(ctx, '#02060c', x - 2, y - 2, 34, 23); rect(ctx, '#0c1c2a', x - 1, y - 1, 32, 21); }
      // THE DOOR: taller than it has any need to be
      rect(ctx, '#000', 160, 14, 64, 128); rect(ctx, '#0e1a28', 163, 17, 58, 125);
      rect(ctx, '#16283a', 166, 22, 24, 52); rect(ctx, '#16283a', 194, 22, 24, 52); rect(ctx, '#16283a', 166, 80, 24, 58); rect(ctx, '#16283a', 194, 80, 24, 58);
      rect(ctx, '#020408', 158, 6, 68, 9);
      // the desk: a sign-in book, a lamp, one chair behind it with no legs
      rect(ctx, '#000', 84, 116, 82, 26); rect(ctx, '#12222e', 86, 118, 78, 24); rect(ctx, '#1c3446', 86, 118, 78, 3);
      rect(ctx, '#e8ecf0', 98, 113, 22, 5); rect(ctx, '#9aa4b0', 108, 113, 1, 5);                              // the book
      rect(ctx, '#0a1620', 140, 100, 2, 18); rect(ctx, '#0a1620', 132, 98, 12, 3);                              // the lamp
      rect(ctx, '#000', 228, 126, 60, 16); rect(ctx, '#12222e', 230, 128, 56, 14); for (let i = 0; i < 6; i++) rect(ctx, i % 2 ? '#c02020' : '#e8ecf0', 234 + i * 8, 131, 6, 8);   // a tray of visitor passes
      floor(ctx, W, H, '#040b12', '#07121c', 'rgba(140,220,255,0.16)');
      ctx.fillStyle = 'rgba(255,246,208,0.12)'; ctx.beginPath(); ctx.moveTo(186, TOP); ctx.lineTo(198, TOP); ctx.lineTo(236, H); ctx.lineTo(148, H); ctx.fill();   // light from under the door
    },
    drawAnimated(ctx, t) {
      for (const [x, y, i] of SCREENS) {
        const s = SKY[i % 6], g = ctx.createLinearGradient(0, y, 0, y + 19); g.addColorStop(0, s[0]); g.addColorStop(1, s[1]); ctx.fillStyle = g; ctx.fillRect(x, y, 30, 19);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + 6, y + 10, 18, 9); ctx.fillRect(x + 13, y + 6, 4, 5);
        for (let k = 0; k < 3; k++) rect(ctx, ((t / 40 + k + i) | 0) % 4 ? '#ffd870' : '#3a3020', x + 8 + k * 5, y + 12 + ((k + i) % 2) * 3, 2, 2);
        if (i % 7 === 3) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(x, y, 30, 19); ctx.restore(); rect(ctx, 'rgba(200,240,255,0.3)', x, y, 30, 19); }   // one that was sealed
        else { ctx.globalAlpha = 0.14; rect(ctx, '#ffffff', x, y + ((t * 0.5 + i * 7) % 19), 30, 1); ctx.globalAlpha = 1; }
      }
      // the gap in the door, breathing
      const a = 0.65 + Math.sin(t / 36) * 0.2;
      ctx.globalAlpha = a; rect(ctx, '#fff6d0', 191, 18, 2, 124); ctx.globalAlpha = a * 0.3; rect(ctx, GOLD, 188, 18, 8, 124); ctx.globalAlpha = 1;
      T(ctx, 'EXIT', 192, 7, { align: 'center', color: (t % 120) < 100 ? '#60ff90' : '#1a5a30' });
      const g = ctx.createRadialGradient(134, 104, 1, 134, 104, 26); g.addColorStop(0, 'rgba(255,230,150,0.5)'); g.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = g; ctx.fillRect(108, 80, 52, 50);
      for (let i = 0; i < 10; i++) { ctx.globalAlpha = 0.35; rect(ctx, i % 3 ? ICE : '#ffffff', (i * 61 + t * (0.08 + i * 0.01)) % 400 - 8, 16 + (i * 43) % 120 + Math.sin(t / 60 + i) * 4, 1, 1); } ctx.globalAlpha = 1;
    },
  });

  // ================================================================== THE BENCH
  RF.registerStage({
    id: 'tribunal', name: 'The Bench Above Everything', music: 'court', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      const r = rng(1787);
      grad(ctx, 0, 0, W, TOP, [[0, '#04030a'], [0.55, '#151028'], [1, '#3a2c50']]);
      for (let i = 0; i < 90; i++) rect(ctx, i % 5 ? '#6a5a8a' : '#fff6d0', Math.floor(r() * W), Math.floor(r() * 96), 1, 1);
      // the galleries: the whole school, come to watch
      for (const side of [0, 1]) for (let row = 0; row < 3; row++) {
        const y = 92 + row * 15, x0 = side ? 262 : 0;
        rect(ctx, '#0c0a16', x0, y, 122, 16); rect(ctx, '#2a2238', x0, y, 122, 2);
        for (let i = 0; i < 12; i++) { const x = x0 + 6 + i * 10 + (row % 2) * 4; rect(ctx, ['#3a3048', '#4a3a40', '#30384a', '#463a52'][(i + row) % 4], x, y - 7, 6, 8); rect(ctx, ['#c8a080', '#8a5a3a', '#e0c0a0', '#6a4428'][(i * 3 + row) % 4], x + 1, y - 11, 4, 4); }
      }
      // columns
      for (const cx of [128, 256]) { rect(ctx, '#000', cx - 9, 0, 18, TOP); grad(ctx, cx - 8, 0, 16, TOP, [[0, '#8a8498'], [1, '#e8e4dc']]); for (let k = -6; k <= 6; k += 4) rect(ctx, 'rgba(0,0,0,0.14)', cx + k, 0, 1, TOP); rect(ctx, '#fff6d0', cx - 11, TOP - 8, 22, 8); rect(ctx, '#c8a030', cx - 11, TOP - 8, 22, 2); }
      // the bench: three steps up, and then a long way up
      for (let i = 0; i < 3; i++) { rect(ctx, '#000', 142 - i * 10, TOP - 10 + i * 4, 100 + i * 20, 5); rect(ctx, '#f4f0e4', 143 - i * 10, TOP - 10 + i * 4, 98 + i * 20, 1); rect(ctx, '#b8b0a0', 143 - i * 10, TOP - 9 + i * 4, 98 + i * 20, 3); }
      rect(ctx, '#000', 150, 62, 84, 70); grad(ctx, 152, 64, 80, 68, [[0, '#f4f0e4'], [1, '#a8a090']]);
      rect(ctx, '#c8a030', 152, 64, 80, 3); rect(ctx, '#c8a030', 152, 100, 80, 2); rect(ctx, '#7a5a10', 160, 72, 64, 24); rect(ctx, '#e8b420', 162, 74, 60, 20);
      T(ctx, 'ORDER', 192, 80, { align: 'center', color: '#3a2408' });
      floor(ctx, W, H, '#cfc8b8', '#e4ded0', 'rgba(170,130,30,0.35)');
      ctx.fillStyle = 'rgba(200,160,40,0.25)'; ctx.beginPath(); ctx.moveTo(180, TOP + 4); ctx.lineTo(204, TOP + 4); ctx.lineTo(244, H); ctx.lineTo(140, H); ctx.fill();
    },
    drawAnimated(ctx, t) {
      // the ring behind the bench, turning
      ctx.save(); ctx.translate(192, 44);
      ctx.globalAlpha = 0.16 + 0.05 * Math.sin(t / 40); ctx.fillStyle = '#fff6d0';
      for (let i = 0; i < 12; i++) { const a = i * 0.5236 + t / 260; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 150, Math.sin(a) * 150); ctx.lineTo(Math.cos(a + 0.09) * 150, Math.sin(a + 0.09) * 150); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.stroke();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 30, t / 50, t / 50 + 1.4); ctx.stroke();
      // the scales
      const sw = Math.sin(t / 70) * 0.09;
      rect(ctx, GOLD, -1, -18, 2, 30); ctx.rotate(sw); rect(ctx, GOLD, -20, -16, 40, 2);
      for (const sx of [-19, 19]) { ctx.save(); ctx.translate(sx, -15); ctx.rotate(-sw); rect(ctx, '#c8a030', 0, 0, 1, 12); rect(ctx, GOLD, -6, 12, 13, 2); ctx.restore(); }
      ctx.restore(); ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) { ctx.globalAlpha = 0.25 + (i % 4) * 0.1; rect(ctx, i % 3 ? '#fff6d0' : GOLD, (i * 53) % 384, 136 - ((t * (0.2 + (i % 4) * 0.08) + i * 37) % 136), 1, 1); } ctx.globalAlpha = 1;
    },
  });

  // ================================================================== O BLOCK
  RF.registerStage({
    id: 'oblock', name: 'O Block', music: 'nyc', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      const r = rng(64);
      grad(ctx, 0, 0, W, TOP, [[0, '#3a2a6a'], [0.45, '#e86a50'], [0.8, '#ffb050'], [1, '#ffe090']]);
      ctx.fillStyle = 'rgba(255,240,176,0.35)'; ctx.beginPath(); ctx.arc(238, 40, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.arc(238, 40, 17, 0, 7); ctx.fill();                                   // the sun, a hand above the roofs. It never gets lower.
      for (const [x, y, w] of [[40, 30, 70], [150, 18, 90], [260, 40, 60]]) { ctx.globalAlpha = 0.35; rect(ctx, '#ffd0a0', x, y, w, 5); rect(ctx, '#ffd0a0', x + 12, y - 4, w - 30, 4); ctx.globalAlpha = 1; }
      // the L, on its iron legs
      rect(ctx, '#1a1420', 0, 58, W, 7); rect(ctx, '#2a2230', 0, 56, W, 2); for (let x = 20; x < W; x += 62) { rect(ctx, '#1a1420', x, 65, 5, 78); rect(ctx, '#1a1420', x - 8, 65, 21, 3); }
      // courtyard buildings: three floors of brick, every window a different evening
      for (const [bx, bw, by] of [[0, 118, 72], [132, 110, 80], [256, 128, 70]]) {
        rect(ctx, '#1a0e0c', bx - 1, by - 1, bw + 2, TOP - by + 2); rect(ctx, '#7a3a28', bx, by, bw, TOP - by);
        for (let y = by + 2; y < TOP; y += 5) for (let x = bx + ((y / 5) % 2) * 5; x < bx + bw; x += 10) rect(ctx, '#6a3020', x, y, 9, 1);
        rect(ctx, '#c8b090', bx, by, bw, 3);
        for (let fl = 0; fl < 3; fl++) for (let x = bx + 8; x < bx + bw - 12; x += 20) {
          const y = by + 8 + fl * 20, lit = r() < 0.55;
          rect(ctx, '#1a0e0c', x - 1, y - 1, 13, 14); rect(ctx, lit ? ['#ffd870', '#ffb040', '#a0d8ff'][Math.floor(r() * 3)] : '#2a1a20', x, y, 11, 12); rect(ctx, '#1a0e0c', x + 5, y, 1, 12); rect(ctx, '#c8b090', x - 1, y + 12, 13, 2);
        }
      }
      rect(ctx, '#0c1a10', 120, 120, 10, 22); rect(ctx, '#1a3a1c', 112, 104, 26, 20); rect(ctx, '#245028', 116, 100, 18, 10);   // one tree
      // the iron fence, the hoop, the sign
      for (let x = 0; x < W; x += 6) rect(ctx, '#141018', x, 124, 1, 18); rect(ctx, '#141018', 0, 126, W, 2); rect(ctx, '#141018', 0, 138, W, 2);
      rect(ctx, '#2a2a30', 334, 76, 3, 66); rect(ctx, '#e8e4dc', 316, 72, 22, 16); rect(ctx, '#c02020', 322, 77, 10, 8); rect(ctx, '#ff7020', 318, 88, 12, 2);
      rect(ctx, '#2a2a30', 30, 84, 2, 58); rect(ctx, '#0a5a2a', 14, 80, 36, 9); T(ctx, 'O BLOCK', 32, 81, { align: 'center', color: '#ffffff' });
      // the sidewalk, and a hopscotch somebody drew years ago that never washed off
      for (let y = TOP, i = 0; y < H; i++) { const h = 2 + i; rect(ctx, i % 2 ? '#8a8078' : '#958a80', 0, y, W, h); y += h; }
      ctx.strokeStyle = 'rgba(40,30,30,0.35)'; for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(192 + k * 22, TOP); ctx.lineTo(192 + k * 110, H); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 5; i++) ctx.strokeRect(84 + i * 15, 168 + (i % 2) * 2, 14, 10);
      grad(ctx, 0, TOP, W, H - TOP, [[0, 'rgba(255,150,60,0.28)'], [1, 'rgba(255,150,60,0)']]);
    },
    drawAnimated(ctx, t) {
      // the train: it comes round every so often, and it is always the same one
      const tx = ((t * 2.6) % 1500) - 300;
      if (tx < 400) for (let c = 0; c < 4; c++) { const x = tx + c * 66; rect(ctx, '#0c0a10', x, 40, 64, 17); rect(ctx, '#8a909a', x + 1, 41, 62, 15); rect(ctx, '#3a4a6a', x + 1, 52, 62, 2); for (let w = 0; w < 5; w++) rect(ctx, '#ffe9a0', x + 5 + w * 12, 44, 8, 6); }
      // the hydrant somebody opened: an arc of water with the light in it
      rect(ctx, '#000', 227, 128, 9, 15); rect(ctx, '#c02020', 228, 129, 7, 14); rect(ctx, '#e04040', 228, 129, 7, 3);
      for (let i = 0; i < 26; i++) { const u = ((t * 0.9 + i * 4) % 104) / 104, x = 236 + u * 54, y = 132 - Math.sin(u * Math.PI) * 26 + u * 12; ctx.globalAlpha = 0.75 * (1 - u * 0.5); rect(ctx, i % 3 ? '#c8ecff' : '#ffffff', x, y, 2, 2); } ctx.globalAlpha = 1;
      // a basketball that has not stopped bouncing
      const by = Math.abs(Math.sin(t / 11)) * 30; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(322, 143, 5 - by / 12, 1.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(322, 138 - by, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#ff7020'; ctx.beginPath(); ctx.arc(322, 138 - by, 4, 0, 7); ctx.fill(); rect(ctx, '#7a3000', 318, 138 - by, 8, 1);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.07 + 0.03 * Math.sin(t / 60 + i * 2); ctx.fillStyle = '#ffd090'; ctx.beginPath(); ctx.moveTo(238, 40); ctx.lineTo(40 + i * 70, 224); ctx.lineTo(84 + i * 70, 224); ctx.fill(); } ctx.restore(); ctx.globalAlpha = 1;
    },
  });

  // ================================================================== LOOR'S
  RF.registerStage({
    id: 'pizzeria', name: "Loor's Pizza", music: 'cafeteria', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      rect(ctx, '#3a1e14', 0, 0, W, TOP); rect(ctx, '#f0e4c8', 0, 0, W, 86);
      for (let x = 0; x < W; x += 16) rect(ctx, '#e4d6b4', x, 0, 1, 86);
      rect(ctx, '#7a1a14', 0, 86, W, 4); rect(ctx, '#2a140e', 0, 90, W, TOP - 90);
      for (let y = 92; y < TOP; y += 8) for (let x = ((y / 8) % 2) * 8; x < W; x += 16) rect(ctx, '#34180f', x, y, 15, 7);                 // brick under the rail
      // the window: the street, at night
      rect(ctx, '#111', 12, 16, 98, 62); grad(ctx, 14, 18, 94, 58, [[0, '#0a0c1e'], [1, '#2a1e38']]);
      for (const [x, h] of [[20, 30], [42, 44], [66, 26], [86, 38]]) { rect(ctx, '#080814', x, 76 - h, 18, h); for (let k = 0; k < 3; k++) rect(ctx, '#ffd870', x + 3 + (k % 2) * 8, 76 - h + 5 + k * 8, 3, 3); }
      rect(ctx, '#111', 60, 18, 2, 58);
      // the menu
      rect(ctx, '#111', 126, 12, 110, 54); rect(ctx, '#1e2a22', 128, 14, 106, 50);
      T(ctx, "LOOR'S", 181, 17, { scale: 2, align: 'center', color: '#fff0c0' });
      [['SLICE', '2.50'], ['WHOLE PIE', '14'], ['THE ECUADOR', '16']].forEach(([n, p], i) => { T(ctx, n, 134, 36 + i * 9, { color: '#e8e4d0' }); T(ctx, p, 228, 36 + i * 9, { align: 'right', color: '#ffd040' }); });
      // a flag, a pair of gloves on a nail, a photo of a kid with his guard up
      rect(ctx, '#111', 247, 15, 32, 22); rect(ctx, '#ffd100', 248, 16, 30, 10); rect(ctx, '#0038a8', 248, 26, 30, 5); rect(ctx, '#ce1126', 248, 31, 30, 5);
      rect(ctx, '#111', 290, 14, 2, 6); for (const gx of [282, 293]) { rect(ctx, '#111', gx - 1, 19, 11, 15); rect(ctx, '#c02020', gx, 20, 9, 13); rect(ctx, '#e8e4dc', gx, 30, 9, 3); }
      rect(ctx, '#111', 250, 44, 24, 28); rect(ctx, '#c8b890', 252, 46, 20, 24); rect(ctx, '#6a4428', 258, 52, 8, 8); rect(ctx, '#c02020', 255, 58, 5, 6); rect(ctx, '#c02020', 264, 58, 5, 6);
      // the oven: brick, an arch, and the only light that matters
      rect(ctx, '#111', 308, 30, 70, 100); rect(ctx, '#8a3a24', 310, 32, 66, 98);
      for (let y = 34; y < 130; y += 7) for (let x = 310 + ((y / 7) % 2) * 6; x < 374; x += 12) rect(ctx, '#74301c', x, y, 11, 1);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(343, 100, 25, Math.PI, 0); ctx.lineTo(368, 122); ctx.lineTo(318, 122); ctx.fill();
      // the counter: glass, pies under it, the register, a tower of boxes
      rect(ctx, '#111', 118, 96, 186, 46); rect(ctx, '#c8ccd0', 120, 98, 182, 6); rect(ctx, '#7a1a14', 120, 104, 182, 38);
      rect(ctx, '#a8d0e0', 126, 108, 100, 22); rect(ctx, '#111', 126, 118, 100, 1);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#e0a040'; ctx.beginPath(); ctx.ellipse(140 + i * 24, 124, 10, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c03020'; ctx.beginPath(); ctx.ellipse(140 + i * 24, 124, 8, 3, 0, 0, 7); ctx.fill(); rect(ctx, '#f0e0a0', 136 + i * 24, 123, 3, 1); rect(ctx, '#f0e0a0', 142 + i * 24, 125, 3, 1); }
      rect(ctx, '#111', 236, 82, 26, 16); rect(ctx, '#3a3a44', 238, 84, 22, 14); rect(ctx, '#80ffa0', 241, 86, 16, 4);
      for (let i = 0; i < 6; i++) { rect(ctx, '#111', 270, 92 - i * 6, 28, 7); rect(ctx, '#f0e8d8', 271, 93 - i * 6, 26, 5); rect(ctx, '#c02020', 280, 94 - i * 6, 8, 3); }
      // the floor: red and white, like every pizza place in every universe
      for (let y = TOP, i = 0; y < H; i++) { const h = 3 + i * 2, n = 9 + i; for (let k = 0; k < n * 2; k++) { const x0 = 192 + (k - n) * (W / n) * (0.55 + i * 0.12); rect(ctx, (k + i) % 2 ? '#b02a22' : '#eee6d8', x0, y, Math.ceil((W / n) * (0.55 + i * 0.12)) + 1, h); } y += h; }
      grad(ctx, 0, TOP, W, H - TOP, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
    },
    drawAnimated(ctx, t) {
      // the fire
      const g = ctx.createRadialGradient(343, 114, 2, 343, 110, 30); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.5, '#ff8a20'); g.addColorStop(1, 'rgba(160,30,0,0)');
      ctx.save(); ctx.beginPath(); ctx.arc(343, 100, 23, Math.PI, 0); ctx.lineTo(366, 122); ctx.lineTo(320, 122); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(316, 74, 56, 50);
      for (let i = 0; i < 7; i++) { const h = 10 + Math.sin(t / 5 + i * 1.7) * 5 + (i % 3) * 3; ctx.fillStyle = i % 2 ? '#ffd040' : '#ff7020'; ctx.beginPath(); ctx.moveTo(322 + i * 6, 122); ctx.lineTo(325 + i * 6 + Math.sin(t / 7 + i) * 2, 122 - h); ctx.lineTo(328 + i * 6, 122); ctx.fill(); }
      ctx.restore();
      ctx.globalAlpha = 0.12 + 0.04 * Math.sin(t / 9); ctx.fillStyle = '#ff9030'; ctx.beginPath(); ctx.ellipse(343, 150, 80, 34, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      // PIZZA in neon, in the window, with one letter that will not behave
      'PIZZA'.split('').forEach((ch, i) => { const on = !(i === 3 && (t % 90) < 12); T(ctx, ch, 28 + i * 14, 24, { scale: 2, color: on ? '#ff5aa0' : '#5a2040', outline: on ? '#7a1040' : '#000' }); });
      for (let i = 0; i < 3; i++) { const u = ((t + i * 40) % 120) / 120; ctx.globalAlpha = 0.3 * (1 - u); rect(ctx, '#ffffff', 150 + i * 30 + Math.sin(t / 14 + i) * 3, 104 - u * 22, 2, 3); } ctx.globalAlpha = 1;
    },
  });
})();
