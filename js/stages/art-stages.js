// Two home stages for the two newest fighters.
//   THE PHOTO STUDIO (Escudero)  a roll of white seamless paper, a softbox, an umbrella light, polaroids on a
//                                string, a pride flag, STRIKE A POSE in neon. The lights pop every few seconds.
//                                Hazard: the big strobe against the right wall (OVEREXPOSED!).
//   THE ART ROOM (David P.)      afternoon light through tall windows, a half-finished mural, shelves of paint,
//                                a plaster bust, easels, and a floor that has seen every colour.
//                                Hazard: the shelf of open paint cans against the left wall (PAINTED!).
// Their music ("Strike a Pose", "Wet Paint") is in config/music.js.
(function () {
  const { rng } = RF.util;
  const T = (...a) => RF.font.drawText(...a);
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const grad = (ctx, x, y, w, h, stops) => { const g = ctx.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); };
  const FLOOR = 204, TOP = 138;
  const RB = ['#e83034', '#fa8c1e', '#fade32', '#32be54', '#3470e8', '#9048cc'];
  const PAINT = ['#e03a3a', '#f2a21e', '#f4dc3a', '#34b860', '#3a8ae0', '#8a4ad0', '#f070b0', '#f4f0e6'];

  // ================================================================ THE PHOTO STUDIO
  RF.registerStage({
    id: 'studio', name: 'The Photo Studio', music: 'studio', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      // the walls: charcoal, with painted brick showing low down
      grad(ctx, 0, 0, W, TOP, [[0, '#14141c'], [1, '#2a2a36']]);
      for (let y = 78; y < TOP; y += 8) for (let x = ((y / 8) % 2) * 9 - 9; x < W; x += 18) rect(ctx, 'rgba(255,255,255,0.035)', x, y, 17, 7);
      // the floor: dark polished concrete
      grad(ctx, 0, TOP, W, H - TOP, [[0, '#1a1a22'], [1, '#32323e']]);
      for (let k = -9; k <= 9; k++) { ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.moveTo(192 + k * 22, TOP); ctx.lineTo(192 + k * 60, H); ctx.stroke(); }
      // the seamless: a roll of white paper on two stands, down the wall and out across the floor
      rect(ctx, '#0a0a0e', 92, 24, 4, TOP - 24); rect(ctx, '#0a0a0e', 288, 24, 4, TOP - 24);
      rect(ctx, '#0a0a0e', 84, FLOOR - 62, 20, 3); rect(ctx, '#0a0a0e', 280, FLOOR - 62, 20, 3);
      grad(ctx, 98, 30, 188, TOP - 30, [[0, '#babac8'], [0.6, '#dcdce6'], [1, '#f0f0f6']]);
      rect(ctx, 'rgba(0,0,0,0.07)', 98, 30, 5, TOP - 30); rect(ctx, 'rgba(0,0,0,0.07)', 281, 30, 5, TOP - 30);
      const g = ctx.createLinearGradient(0, TOP, 0, H); g.addColorStop(0, '#f0f0f6'); g.addColorStop(1, '#c4c4d2');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(98, TOP); ctx.lineTo(286, TOP); ctx.lineTo(336, H); ctx.lineTo(48, H); ctx.fill();
      rect(ctx, 'rgba(255,255,255,0.5)', 98, TOP - 1, 188, 2);                                                  // where the wall becomes the floor
      rect(ctx, '#0a0a0e', 86, 22, 212, 10); rect(ctx, '#d0d0dc', 88, 23, 208, 8); rect(ctx, '#f4f4f8', 88, 23, 208, 2); rect(ctx, '#9a9aaa', 88, 29, 208, 2);   // the roll
      // tape marks on the paper where the model stands
      for (const mx of [150, 234]) { ctx.strokeStyle = 'rgba(40,40,60,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 5, 186); ctx.lineTo(mx + 5, 192); ctx.moveTo(mx + 5, 186); ctx.lineTo(mx - 5, 192); ctx.stroke(); ctx.lineWidth = 1; }
      // cables snaking across the floor
      ctx.strokeStyle = '#08080c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, TOP + 14); ctx.bezierCurveTo(70, 176, 20, 196, 60, 214); ctx.stroke(); ctx.beginPath(); ctx.moveTo(352, TOP + 16); ctx.bezierCurveTo(330, 170, 372, 190, 344, 216); ctx.stroke(); ctx.lineWidth = 1;
      // left: the softbox on its stand
      rect(ctx, '#0a0a0e', 39, 96, 3, TOP + 14 - 96); ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, TOP + 2); ctx.lineTo(26, TOP + 16); ctx.moveTo(40, TOP + 2); ctx.lineTo(54, TOP + 16); ctx.stroke(); ctx.lineWidth = 1;
      rect(ctx, '#0a0a0e', 16, 38, 50, 60); grad(ctx, 19, 41, 44, 54, [[0, '#ffffff'], [1, '#d8dcf0']]);
      for (let i = 1; i < 4; i++) { rect(ctx, 'rgba(0,0,0,0.08)', 19 + i * 11, 41, 1, 54); rect(ctx, 'rgba(0,0,0,0.08)', 19, 41 + i * 13, 44, 1); }
      // polaroids on a string above it
      ctx.strokeStyle = '#8a7a6a'; ctx.beginPath(); ctx.moveTo(2, 24); ctx.quadraticCurveTo(44, 34, 88, 25); ctx.stroke();
      [[8, 27], [22, 29], [36, 30], [50, 30], [64, 29], [77, 27]].forEach(([px, py], i) => { rect(ctx, '#0a0a0e', px - 1, py, 11, 13); rect(ctx, '#f4f0e6', px, py + 1, 9, 11); rect(ctx, ['#3a6ae0', '#e03a6a', '#f2a21e', '#34b860', '#8a4ad0', '#2ad0c0'][i], px + 1, py + 2, 7, 6); rect(ctx, '#c8a878', px + 3, py - 1, 3, 2); });
      // right: the flag, the camera on its tripod, the umbrella light
      rect(ctx, '#0a0a0e', 303, 29, 38, 26); RB.forEach((c, i) => rect(ctx, c, 304, 30 + i * 4, 36, 4));
      ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(316, 112); ctx.lineTo(306, TOP + 12); ctx.moveTo(316, 112); ctx.lineTo(326, TOP + 12); ctx.moveTo(316, 112); ctx.lineTo(316, TOP + 8); ctx.stroke(); ctx.lineWidth = 1;
      rect(ctx, '#0a0a0e', 306, 98, 20, 14); rect(ctx, '#2a2a34', 307, 99, 18, 12); rect(ctx, '#0a0a0e', 298, 101, 9, 8); rect(ctx, '#5a8ac8', 299, 103, 3, 4); rect(ctx, '#c8c8d0', 319, 95, 5, 4);
      rect(ctx, '#0a0a0e', 356, 96, 3, TOP + 16 - 96); ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(357, TOP + 4); ctx.lineTo(344, TOP + 18); ctx.moveTo(357, TOP + 4); ctx.lineTo(370, TOP + 18); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#0a0a0e'; ctx.beginPath(); ctx.ellipse(350, 92, 32, 30, 0, Math.PI * 0.62, Math.PI * 1.9); ctx.fill();
      ctx.fillStyle = '#eeeef6'; ctx.beginPath(); ctx.ellipse(350, 92, 30, 28, 0, Math.PI * 0.64, Math.PI * 1.88); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < 6; i++) { const a = Math.PI * (0.7 + i * 0.22); ctx.beginPath(); ctx.moveTo(357, 96); ctx.lineTo(350 + Math.cos(a) * 30, 92 + Math.sin(a) * 28); ctx.stroke(); }
      // a director's chair, a prop stool
      rect(ctx, '#0a0a0e', 70, TOP - 22, 2, 30); rect(ctx, '#0a0a0e', 86, TOP - 22, 2, 30); rect(ctx, '#c02040', 69, TOP - 22, 20, 7); rect(ctx, '#c02040', 69, TOP - 8, 20, 4);
    },
    drawAnimated(ctx, t) {
      const pop = t % 230, on = pop < 5 ? 1 : pop < 14 ? (14 - pop) / 9 : 0;
      // the softbox throws its light across the paper; so does the umbrella
      ctx.fillStyle = `rgba(255,255,255,${0.05 + 0.02 * Math.sin(t / 20) + on * 0.25})`;
      ctx.beginPath(); ctx.moveTo(62, 44); ctx.lineTo(62, 96); ctx.lineTo(250, FLOOR + 14); ctx.lineTo(250, 40); ctx.fill();
      ctx.beginPath(); ctx.moveTo(326, 78); ctx.lineTo(326, 108); ctx.lineTo(130, FLOOR + 14); ctx.lineTo(130, 44); ctx.fill();
      if (on) { ctx.fillStyle = `rgba(255,255,255,${on * 0.5})`; ctx.fillRect(19, 41, 44, 54); ctx.fillRect(98, 30, 188, TOP - 30); ctx.fillStyle = `rgba(255,255,255,${on * 0.9})`; ctx.beginPath(); ctx.arc(352, 94, 9, 0, 7); ctx.fill(); }
      // STRIKE A POSE in neon, with a tube that sticks
      const flick = (t % 170) > 160 && (t >> 1) % 2;
      T(ctx, 'STRIKE', 322, 60, { align: 'center', color: flick ? '#5a2040' : '#ff5aa8', outline: flick ? '#000' : '#7a1040' });
      T(ctx, 'A POSE', 322, 69, { align: 'center', color: '#40e8ff', outline: '#104a5a' });
      // the camera's little red light
      if ((t >> 4) % 2) rect(ctx, '#ff3030', 322, 100, 2, 2);
      // warm bulbs along the polaroid string
      for (let i = 0; i < 8; i++) { const u = i / 7, x = 2 + u * 86, y = 24 + Math.sin(u * Math.PI) * 6; rect(ctx, (i + (t >> 4)) % 3 ? '#ffe9a0' : '#fff8e0', x, y - 1, 2, 2); }
      // dust in the light
      for (let i = 0; i < 10; i++) { const x = 70 + ((i * 37 + t * 0.15) % 180), y = 50 + ((i * 53 + t * 0.2) % 130); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    },
  });

  // ================================================================ THE ART ROOM
  RF.registerStage({
    id: 'artroom', name: 'The Art Room', music: 'artroom', floorY: FLOOR, horizon: TOP, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      const r = rng(1503);
      // the walls: warm plaster over a wooden rail
      grad(ctx, 0, 0, W, 104, [[0, '#cdbf9e'], [1, '#e6dabc']]);
      rect(ctx, '#5a3e22', 0, 104, W, 3); grad(ctx, 0, 107, W, TOP - 107, [[0, '#8a6a44'], [1, '#6e5234']]);
      for (let x = 0; x < W; x += 22) rect(ctx, 'rgba(0,0,0,0.12)', x, 107, 1, TOP - 107);
      // tall windows on the left: late afternoon
      for (const wx of [12, 62]) {
        rect(ctx, '#3a2a18', wx - 2, 24, 44, 76); grad(ctx, wx, 26, 40, 72, [[0, '#7ab8e8'], [0.65, '#f4d898'], [1, '#f8b870']]);
        rect(ctx, '#3a2a18', wx + 19, 26, 2, 72); rect(ctx, '#3a2a18', wx, 60, 40, 2); rect(ctx, '#5a4428', wx - 4, 98, 48, 4);
        rect(ctx, 'rgba(255,255,255,0.35)', wx + 3, 30, 12, 3); rect(ctx, 'rgba(255,255,255,0.25)', wx + 24, 40, 10, 2);     // clouds
      }
      ctx.fillStyle = '#2a4a2a'; ctx.beginPath(); ctx.arc(34, 98, 16, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(92, 98, 12, Math.PI, 0); ctx.fill();   // trees outside
      // the mural: half finished, in a taped-up rectangle
      rect(ctx, '#3a2a18', 126, 26, 132, 72); rect(ctx, '#f4f0e6', 128, 28, 128, 68);
      for (let i = 0; i < 26; i++) { const x = 130 + r() * 84, y = 30 + r() * 62, rad = 4 + r() * 12; ctx.globalAlpha = 0.85; ctx.fillStyle = PAINT[Math.floor(r() * 7)]; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#f4dc3a'; ctx.beginPath(); ctx.arc(160, 52, 13, 0, 7); ctx.fill(); ctx.strokeStyle = '#e03a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(132, 84); ctx.bezierCurveTo(160, 60, 190, 96, 222, 66); ctx.stroke(); ctx.lineWidth = 1;
      ctx.strokeStyle = '#8a8a98'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(222 + i * 6, 34 + i * 3); ctx.lineTo(252, 44 + i * 10); ctx.stroke(); }   // the part that is still pencil
      for (const [tx, ty] of [[126, 26], [252, 26], [126, 92], [252, 92]]) rect(ctx, '#e8d8a0', tx, ty, 8, 5);                                     // masking tape
      // shelves of paint on the right, and the bust he keeps drawing
      for (let s = 0; s < 3; s++) {
        const y = 48 + s * 22; rect(ctx, '#3a2a18', 270, y, 106, 3); rect(ctx, '#5a4428', 270, y, 106, 1);
        for (let i = 0; i < 9; i++) { if (s === 0 && i > 5) continue; const x = 273 + i * 11, h = 9 + ((i * 7 + s * 3) % 5); rect(ctx, '#1a1410', x - 1, y - h - 1, 9, h + 1); rect(ctx, PAINT[(i + s * 3) % 8], x, y - h, 7, h); rect(ctx, '#c8c8d0', x, y - h, 7, 2); rect(ctx, 'rgba(255,255,255,0.4)', x + 1, y - h + 3, 1, h - 4); }
      }
      rect(ctx, '#1a1410', 346, 22, 22, 26); ctx.fillStyle = '#e8e4dc'; ctx.beginPath(); ctx.arc(357, 31, 7, 0, 7); ctx.fill(); rect(ctx, '#e8e4dc', 352, 36, 10, 6); rect(ctx, '#e8e4dc', 349, 42, 16, 6); rect(ctx, '#c8c4b8', 359, 28, 3, 8); rect(ctx, '#b8b4a8', 352, 24, 10, 3);   // the bust
      rect(ctx, '#1a1410', 334, 34, 9, 14); rect(ctx, '#7a8a98', 335, 35, 7, 13); for (let i = 0; i < 3; i++) rect(ctx, ['#e03a3a', '#3a8ae0', '#f4dc3a'][i], 335 + i * 2, 27 + i, 2, 9);   // brushes in a can
      // the floor: old boards, and every colour that ever got spilled
      for (let y = TOP, i = 0; y < H; i++) { const h = 3 + i * 2; rect(ctx, i % 2 ? '#a8845a' : '#9c7a52', 0, y, W, h); rect(ctx, 'rgba(0,0,0,0.12)', 0, y, W, 1); y += h; }
      for (let k = -8; k <= 8; k++) { ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.moveTo(192 + k * 26, TOP); ctx.lineTo(192 + k * 66, H); ctx.stroke(); }
      ctx.fillStyle = 'rgba(244,240,230,0.5)'; ctx.beginPath(); ctx.moveTo(120, TOP + 20); ctx.lineTo(268, TOP + 16); ctx.lineTo(300, H); ctx.lineTo(84, H); ctx.fill();   // a drop cloth
      for (let i = 0; i < 70; i++) { const x = r() * W, y = TOP + 6 + r() * (H - TOP - 8), big = r() > 0.8; ctx.fillStyle = PAINT[Math.floor(r() * 7)]; ctx.beginPath(); ctx.ellipse(x, y, big ? 5 + r() * 5 : 1.5 + r() * 2, big ? 2 + r() * 2 : 1 + r(), 0, 0, 7); ctx.fill(); }
      // easels at the back, with a stool
      const easel = (x, pic) => { ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, TOP - 46); ctx.lineTo(x - 12, TOP + 10); ctx.moveTo(x, TOP - 46); ctx.lineTo(x + 12, TOP + 10); ctx.moveTo(x, TOP - 46); ctx.lineTo(x + 3, TOP + 4); ctx.stroke(); ctx.lineWidth = 1; rect(ctx, '#3a2a18', x - 13, TOP - 12, 26, 2); rect(ctx, '#1a1410', x - 12, TOP - 42, 24, 30); rect(ctx, '#f4f0e6', x - 11, TOP - 41, 22, 28); pic(x); };
      easel(118, (x) => { rect(ctx, '#3a8ae0', x - 11, TOP - 41, 22, 14); rect(ctx, '#34b860', x - 11, TOP - 27, 22, 14); ctx.fillStyle = '#f4dc3a'; ctx.beginPath(); ctx.arc(x + 5, TOP - 34, 4, 0, 7); ctx.fill(); });
      easel(262, (x) => { ctx.fillStyle = '#2a2a34'; ctx.beginPath(); ctx.arc(x, TOP - 31, 6, 0, 7); ctx.fill(); rect(ctx, '#2a2a34', x - 7, TOP - 25, 14, 12); rect(ctx, '#e03a3a', x - 11, TOP - 41, 4, 28); });
      rect(ctx, '#3a2a18', 232, TOP - 8, 2, 16); rect(ctx, '#3a2a18', 244, TOP - 8, 2, 16); rect(ctx, '#5a4428', 229, TOP - 11, 20, 4);
      // light falling in from the windows
      ctx.fillStyle = 'rgba(255,232,170,0.1)'; ctx.beginPath(); ctx.moveTo(12, 26); ctx.lineTo(52, 26); ctx.lineTo(190, H); ctx.lineTo(96, H); ctx.fill(); ctx.beginPath(); ctx.moveTo(62, 26); ctx.lineTo(102, 26); ctx.lineTo(280, H); ctx.lineTo(196, H); ctx.fill();
    },
    drawAnimated(ctx, t) {
      // dust turning over in the light
      for (let i = 0; i < 16; i++) { const u = ((i * 41 + t * 0.12) % 200) / 200, x = 30 + i * 9 + u * 110 + Math.sin(t / 30 + i) * 4, y = 34 + u * 170; ctx.fillStyle = `rgba(255,244,210,${0.5 * Math.sin(u * Math.PI)})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
      // one jar on the top shelf has been dripping for years
      const d = t % 110; rect(ctx, '#e03a3a', 276, 48, 2, 3 + Math.min(4, d / 12)); if (d > 48) { const y = 52 + Math.pow((d - 48) / 62, 2) * 86; if (y < TOP - 2) rect(ctx, '#e03a3a', 276, y, 2, 3); else { ctx.fillStyle = '#e03a3a'; ctx.beginPath(); ctx.ellipse(277, TOP + 1, 3 + (d - 100) * 0.3, 1.5, 0, 0, 7); ctx.fill(); } }
      // the mural is still wet: a run of yellow
      rect(ctx, '#f4dc3a', 158, 64, 2, 4 + ((t / 40) % 14));
      // leaves moving outside
      for (let i = 0; i < 5; i++) rect(ctx, '#3a6a3a', 22 + i * 6 + Math.sin(t / 25 + i) * 2, 86 + (i % 2) * 3, 3, 2);
    },
  });

  // ================================================================ their hazards
  RF.HOME_HAZARDS = RF.HOME_HAZARDS || {};
  RF.HOME_HAZARDS.studio = { side: 1, name: 'OVEREXPOSED!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#ffffff', sound: 'zap',
    draw(ctx, x, floorY, frame, firing) {              // the big strobe on its stand
      const l = x - 20; rect(ctx, '#0a0a0e', l + 8, floorY - 52, 3, 52); ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l + 9, floorY - 8); ctx.lineTo(l, floorY); ctx.moveTo(l + 9, floorY - 8); ctx.lineTo(l + 19, floorY); ctx.stroke(); ctx.lineWidth = 1;
      rect(ctx, '#0a0a0e', l - 2, floorY - 70, 24, 20); rect(ctx, '#2a2a34', l - 1, floorY - 69, 22, 18);
      ctx.fillStyle = '#0a0a0e'; ctx.beginPath(); ctx.moveTo(l - 2, floorY - 70); ctx.lineTo(l - 12, floorY - 76); ctx.lineTo(l - 12, floorY - 44); ctx.lineTo(l - 2, floorY - 50); ctx.fill();
      ctx.fillStyle = firing ? '#ffffff' : (frame % 90 < 4 ? '#ffffff' : '#c8d0e8'); ctx.beginPath(); ctx.moveTo(l - 3, floorY - 68); ctx.lineTo(l - 11, floorY - 73); ctx.lineTo(l - 11, floorY - 47); ctx.lineTo(l - 3, floorY - 52); ctx.fill();
      rect(ctx, firing ? '#ff3030' : '#30d050', l + 16, floorY - 66, 3, 3);
    },
    fx(ctx, x, floorY, t) {                              // everything goes white, then the lens flare
      const a = Math.max(0, 1 - t / 26); ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`; ctx.fillRect(-20, -20, 430, 270);
      const cx = x - 30, cy = floorY - 60; ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - t / 50)})`; ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const an = i * 0.5236 + t * 0.03; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * 10, cy + Math.sin(an) * 10); ctx.lineTo(cx + Math.cos(an) * (30 + t * 2), cy + Math.sin(an) * (30 + t * 2)); ctx.stroke(); }
      ctx.lineWidth = 1; RB.forEach((c, i) => { ctx.globalAlpha = Math.max(0, 0.6 - t / 60); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx - 26 - i * 22, cy + 8 + i * 9, 5 + i * 2, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
    },
  };
  RF.HOME_HAZARDS.artroom = { side: -1, name: 'PAINTED!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#f2a21e', sound: 'boom',
    draw(ctx, x, floorY, frame, firing) {              // a wobbly shelf of open cans
      const l = x - 2; rect(ctx, '#1a1410', l, floorY - 58, 26, 58); rect(ctx, '#6e5234', l + 1, floorY - 57, 24, 56);
      for (let s = 0; s < 3; s++) { const y = floorY - 40 + s * 19, wob = firing ? Math.sin(frame * 2 + s) * 2 : 0; rect(ctx, '#3a2a18', l + 1, y, 24, 2);
        for (let i = 0; i < 2; i++) { const cx = l + 3 + i * 11 + wob; rect(ctx, '#1a1410', cx - 1, y - 13, 10, 13); rect(ctx, '#c8c8d0', cx, y - 12, 8, 11); rect(ctx, PAINT[(s * 2 + i) % 7], cx, y - 12, 8, 3); rect(ctx, PAINT[(s * 2 + i) % 7], cx + 5, y - 9, 2, 4 + ((frame >> 4) + s + i) % 3); } }
    },
    fx(ctx, x, floorY, t) {                              // every can at once
      for (let i = 0; i < 46; i++) { const u = t / 50, ang = -Math.PI / 2 + (i / 46 - 0.35) * 2.2, d = 8 + u * (50 + (i % 7) * 14); ctx.globalAlpha = Math.max(0, 1 - u); ctx.fillStyle = PAINT[i % 7]; ctx.beginPath(); ctx.arc(x + 12 + Math.cos(ang) * d, floorY - 40 + Math.sin(ang) * d + u * u * 60, 2 + (i % 3), 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
  };
})();
