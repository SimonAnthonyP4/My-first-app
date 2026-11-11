// REGAL KENDALL VILLAGE (Erick's home turf): the movie theater lobby. Carpet, concession stand,
// a marquee that chases, poster light boxes, a ticket kiosk, and SCREEN 7's doors.
// Hazard: the popcorn machine against the left wall (HOT BUTTER!).
(function () {
  const { rng } = RF.util;
  const T = (...a) => RF.font.drawText(...a);
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const grad = (ctx, x, y, w, h, stops) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  const FLOOR = 204, TOP = 138;

  RF.registerStage({
    id: 'regal', name: 'Regal Kendall Village', music: 'nyc', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      const r = rng(2026);
      // back wall: deep wine red with a darker band, and gold trim
      grad(ctx, 0, 0, W, TOP, [[0, '#1a0a24'], [0.5, '#4a1030'], [1, '#6a1a38']]);
      rect(ctx, '#14081a', 0, 118, W, 3); rect(ctx, '#d8a830', 0, 121, W, 1);
      for (let x = 0; x < W; x += 24) rect(ctx, 'rgba(255,255,255,0.04)', x, 0, 1, 118);
      // the marquee banner
      rect(ctx, '#0a0408', 96, 34, 192, 26); rect(ctx, '#d8a830', 96, 34, 192, 2); rect(ctx, '#d8a830', 96, 58, 192, 2);
      T(ctx, 'REGAL', 128, 44, { align: 'center', color: '#ffd860', outline: '#000' });      // (the round timer sits in the middle)
      T(ctx, 'KENDALL VILLAGE', 248, 44, { align: 'center', color: '#ffffff', outline: '#000' });
      // poster light boxes (made-up movies)
      const posters = [['THE LAST', 'BELL', '#2a1a6a', '#c090ff'], ['SPACE', 'TACOS', '#0a4a5a', '#ffd040'], ['ZOMBIE', 'PROM 2', '#4a0a0a', '#ff6a5a'], ['TUSH', 'PUSH', '#0a3a1a', '#60e080']];
      posters.forEach((p, i) => {
        const x = [118, 164, 210, 256][i] - 8 + (i > 1 ? 0 : 0), y = 68;
        rect(ctx, '#0a0408', x - 2, y - 2, 36, 50); grad(ctx, x, y, 32, 46, [[0, p[2]], [1, '#000000']]);
        T(ctx, p[0], x + 16, y + 4, { align: 'center', color: p[3] }); T(ctx, p[1], x + 16, y + 12, { align: 'center', color: '#ffffff' });
        rect(ctx, p[3], x + 12, y + 24, 8, 12); rect(ctx, '#000', x + 14, y + 26, 4, 4);
      });
      // SCREEN 7 doors on the right, the ticket kiosk on the left of them
      rect(ctx, '#0a0408', 312, 56, 56, 66); rect(ctx, '#d8a830', 312, 56, 56, 2);
      rect(ctx, '#2a0a1a', 316, 64, 22, 58); rect(ctx, '#2a0a1a', 342, 64, 22, 58);
      rect(ctx, '#ffe27a', 336, 92, 2, 8); rect(ctx, '#ffe27a', 342, 92, 2, 8);
      rect(ctx, '#000', 328, 46, 24, 8); T(ctx, 'SCREEN 7', 340, 47, { align: 'center', color: '#ff5a5a' });
      // the concession stand, left: counter, menu board, popcorn warmer glow
      rect(ctx, '#0a0408', 6, 70, 84, 70); rect(ctx, '#3a2030', 8, 72, 80, 66);
      rect(ctx, '#000', 14, 76, 68, 22); T(ctx, 'CONCESSIONS', 48, 79, { align: 'center', color: '#ffd860' });
      T(ctx, 'POPCORN  SODA  CANDY', 48, 89, { align: 'center', color: '#ffffff' });
      rect(ctx, '#7a5030', 4, 118, 88, 22); rect(ctx, '#a07040', 4, 118, 88, 3);
      for (let i = 0; i < 9; i++) rect(ctx, i % 2 ? '#c02030' : '#f4f0e4', 8 + i * 9, 106, 6, 12);       // buckets
      // the floor: loud geometric carpet in perspective
      for (let y = TOP, i = 0; y < H; i++) { const h = 2 + i; rect(ctx, i % 2 ? '#2a1040' : '#34164c', 0, y, W, h); y += h; }
      for (let k = -14; k <= 14; k++) { ctx.strokeStyle = 'rgba(255,208,64,0.16)'; ctx.beginPath(); ctx.moveTo(192 + k * 12, TOP); ctx.lineTo(192 + k * 52, H); ctx.stroke(); }
      for (let y = TOP + 10, i = 0; y < H - 4; i++, y += 8 + i * 3) for (let x = ((i % 2) * 18) - 20; x < W; x += 36 + i * 6) {
        ctx.fillStyle = i % 3 ? 'rgba(255,90,160,0.18)' : 'rgba(80,220,255,0.16)'; ctx.fillRect(x, y, 4 + i, 2 + (i >> 1));
      }
      // velvet rope stanchions
      for (const sx of [150, 236]) { rect(ctx, '#d8a830', sx, FLOOR - 26, 2, 26); rect(ctx, '#d8a830', sx - 3, FLOOR - 1, 8, 2); rect(ctx, '#a01030', sx - 14, FLOOR - 24, 28, 2); }
      // scattered popcorn on the carpet
      for (let i = 0; i < 30; i++) rect(ctx, r() > 0.5 ? '#fff4c8' : '#ffe27a', Math.floor(r() * W), TOP + 14 + Math.floor(r() * 60), 2, 2);
    },
    drawAnimated(ctx, t) {
      // chasing marquee bulbs round the banner
      for (let i = 0; i < 48; i++) {
        const x = 96 + i * 4, on = (i + (t >> 2)) % 3 === 0;
        rect(ctx, on ? '#ffe27a' : '#6a5018', x, 32, 2, 2); rect(ctx, on ? '#ffe27a' : '#6a5018', 286 - (x - 96), 60, 2, 2);
      }
      // the REGAL neon flickers now and then
      if (t % 140 > 128 && (t >> 1) % 2) rect(ctx, 'rgba(0,0,0,0.55)', 150, 37, 84, 20);
      // kernels popping in the warmer
      for (let i = 0; i < 5; i++) { const k = (t * 1.6 + i * 23) % 40; rect(ctx, i % 2 ? '#fff4c8' : '#ffe27a', 12 + i * 15 + Math.sin(i * 3 + k / 4) * 3, 104 - Math.sin(k / 40 * Math.PI) * 10, 2, 2); }
      // a light in SCREEN 7's doors, as if a trailer is playing
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t / 7); rect(ctx, '#80c0ff', 316, 64, 48, 58); ctx.globalAlpha = 1;
    },
  });

  RF.HOME_HAZARDS = RF.HOME_HAZARDS || {};
  RF.HOME_HAZARDS.regal = { side: -1, name: 'HOT BUTTER!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#ffe27a', sound: 'boom',
    draw(ctx, x, floorY, frame, firing) { // the popcorn machine
      const l = x - 2, wob = firing ? Math.sin(frame * 2) * 1.5 : 0;
      rect(ctx, '#111', l, floorY - 44, 28, 44); rect(ctx, '#c02030', l + 1, floorY - 22, 26, 21); rect(ctx, '#f4f0e4', l + 1, floorY - 8, 26, 3);
      rect(ctx, '#d8a830', l + 1, floorY - 43, 26, 3);
      rect(ctx, '#cfe8ff', l + 3, floorY - 40, 22, 18);                                    // the glass
      for (let i = 0; i < 12; i++) rect(ctx, i % 2 ? '#fff4c8' : '#ffe27a', Math.round(l + 4 + (i * 7) % 19 + wob), floorY - 25 - ((i * 5 + (firing ? frame * 2 : 0)) % 12), 3, 3);
      T(ctx, 'POP', l + 14, floorY - 16, { align: 'center', color: '#ffffff', outline: '#000' });
    },
    fx(ctx, x, floorY, t) { // a shower of popcorn and butter
      for (let i = 0; i < 40; i++) { const a = (t * 2.6 + i * 9) % 70; ctx.globalAlpha = Math.max(0, 1 - t / 50); ctx.fillStyle = i % 3 ? '#fff4c8' : i % 3 === 1 ? '#ffe27a' : '#f0b030'; ctx.fillRect(x + 4 + Math.sin(i * 2.3) * 22 + t * 0.4, floorY - 10 - a, 4, 4); }
      ctx.globalAlpha = 1;
    },
  };
})();
