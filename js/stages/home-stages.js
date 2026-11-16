// HOME-TURF STAGES: one for the newer fighters. Each has its own hazard against a wall
// (merged into RF.HAZARDS by game/hazards.js). Drawn in code like the other stages:
// drawStatic is baked once, drawAnimated runs every frame.
(function () {
  const { rng, hash } = RF.util;
  const T = (...a) => RF.font.drawText(...a);
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const grad = (ctx, x, y, w, h, stops) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  // A floor in perspective: rows get taller toward the camera, plus receding lines.
  const perspectiveFloor = (ctx, W, H, top, colA, colB, lineCol, vx = 192) => {
    for (let y = top, i = 0; y < H; i++) { const h = 2 + i; rect(ctx, i % 2 ? colA : colB, 0, y, W, h); y += h; }
    if (lineCol) { ctx.strokeStyle = lineCol; for (let k = -10; k <= 10; k++) { ctx.beginPath(); ctx.moveTo(vx + k * 14, top); ctx.lineTo(vx + k * 60, H); ctx.stroke(); } }
  };
  const FLOOR = 204;
  const HZ = {};               // hazards, keyed by stage id
  const FX = 50;

  // ================================================================ FRIDAY NIGHT LIGHTS (Mikey)
  RF.registerStage({
    id: 'field', name: 'Friday Night Lights', music: 'field', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      const r = rng(4040);
      grad(ctx, 0, 0, W, 150, [[0, '#02030a'], [1, '#141a2e']]);
      for (let i = 0; i < 40; i++) rect(ctx, '#ffffff', Math.floor(r() * W), Math.floor(r() * 60), 1, 1);
      // light towers
      for (const lx of [40, 344]) {
        rect(ctx, '#2a2e38', lx - 2, 20, 4, 110);
        rect(ctx, '#3a3e48', lx - 16, 14, 32, 14);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) rect(ctx, '#fffbe0', lx - 14 + i * 8, 16 + j * 6, 6, 4);
      }
      // bleachers packed with fans
      for (let i = 0; i < 6; i++) { rect(ctx, '#3a3440', 0, 72 + i * 11, W, 11); rect(ctx, '#4e4656', 0, 72 + i * 11, W, 2); }
      for (let i = 0; i < 6; i++) for (let x = 2; x < W; x += 6) if (r() < 0.85) {
        const c = ['#c02020', '#e8e8e8', '#202020', '#c02020', '#d8a070', '#5a3a28'][Math.floor(r() * 6)];
        rect(ctx, c, x, 66 + i * 11, 4, 5); rect(ctx, '#d8a070', x + 1, 63 + i * 11, 2, 3);
      }
      // scoreboard
      rect(ctx, '#0c0c10', 150, 22, 84, 38); rect(ctx, '#1c1c24', 152, 24, 80, 34);
      T(ctx, 'HOME', 170, 27, { align: 'center', color: '#b0b0b0' }); T(ctx, 'AWAY', 214, 27, { align: 'center', color: '#b0b0b0' });
      T(ctx, '21', 170, 38, { scale: 2, align: 'center', color: '#ffb020' }); T(ctx, '14', 214, 38, { scale: 2, align: 'center', color: '#ffb020' });
      // the field
      perspectiveFloor(ctx, W, H, 138, '#2f7a2a', '#358a30', null);
      ctx.fillStyle = '#e8f0e0';
      for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(192 + k * 28, 138); ctx.lineTo(192 + k * 26 + 2, 138); ctx.lineTo(192 + k * 90 + 3, H); ctx.lineTo(192 + k * 90, H); ctx.fill(); }
      T(ctx, 'TERRA', 192, 166, { scale: 3, align: 'center', color: 'rgba(255,255,255,0.35)' });
      // goalpost (left)
      rect(ctx, '#ffd030', 18, 96, 3, 56); rect(ctx, '#ffd030', 6, 96, 28, 3); rect(ctx, '#ffd030', 6, 70, 3, 28); rect(ctx, '#ffd030', 31, 70, 3, 28);
    },
    drawAnimated(ctx, t) { // camera flashes in the crowd, light glare
      for (let i = 0; i < 3; i++) { const h = hash(Math.floor(t / 9) * 7 + i); if (h < 0.55) rect(ctx, '#ffffff', Math.floor(hash(t + i * 13) * 384), 64 + Math.floor(h * 60), 2, 2); }
      ctx.globalAlpha = 0.08 + Math.sin(t / 20) * 0.03; ctx.fillStyle = '#fffbe0';
      for (const lx of [40, 344]) { ctx.beginPath(); ctx.moveTo(lx - 16, 28); ctx.lineTo(lx + 16, 28); ctx.lineTo(192 + (lx - 192) * 0.2 + 60, 204); ctx.lineTo(192 + (lx - 192) * 0.2 - 60, 204); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
  });
  HZ.field = { side: 1, name: 'SACKED!', damage: 10, launch: { vx: 4, vy: 9 }, color: '#ffffff', sound: 'boom',
    draw(ctx, x, floorY) { // a tackling sled
      const l = x - 30;
      rect(ctx, '#111', l, floorY - 4, 30, 4); rect(ctx, '#888', l + 1, floorY - 3, 28, 2);
      for (const px of [l + 4, l + 18]) { rect(ctx, '#111', px - 1, floorY - 34, 10, 31); rect(ctx, '#c02020', px, floorY - 33, 8, 29); rect(ctx, '#e8e8e8', px, floorY - 24, 8, 3); }
    },
    fx(ctx, x, floorY, t) { if (t < 24) T(ctx, 'HIKE!', x - 22, floorY - 60 - t, { align: 'center', color: '#ffffff', outline: '#000' }); },
  };

  // ================================================================ MUSIC ROOM (Wuttke)
  RF.registerStage({
    id: 'musicroom', name: 'Music Room', music: 'musicroom', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, 140, [[0, '#3a2418'], [1, '#5a3a24']]);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, 0, 1, 140);   // wood panels
      // chalkboard with a staff and notes
      rect(ctx, '#5a4028', 92, 14, 200, 64); rect(ctx, '#1e3a2a', 96, 18, 192, 56);
      for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) rect(ctx, '#c8d8c8', 104, 26 + s * 24 + i * 3, 176, 1);
      T(ctx, '&', 108, 22, { scale: 2, color: '#e0e8e0' });
      for (let i = 0; i < 9; i++) { const nx = 130 + i * 17, ny = 26 + ((i * 5) % 12); rect(ctx, '#e8f0e8', nx, ny + 4, 4, 3); rect(ctx, '#e8f0e8', nx + 3, ny - 4, 1, 8); }
      T(ctx, 'FORTISSIMO = LOUD!', 192, 66, { align: 'center', color: '#e8f0e8' });
      // posters
      rect(ctx, '#e8dcc0', 20, 22, 44, 56); T(ctx, 'BACH', 42, 30, { align: 'center', color: '#3a2418' }); rect(ctx, '#8a6a4a', 30, 42, 24, 28);
      rect(ctx, '#e8dcc0', 320, 22, 44, 56); T(ctx, 'BAND', 342, 30, { align: 'center', color: '#8a1818' }); T(ctx, 'CAMP', 342, 40, { align: 'center', color: '#8a1818' });
      // risers + music stands + a grand piano and drum kit at the back
      for (let i = 0; i < 3; i++) rect(ctx, '#6a4a30', 0, 100 + i * 12, W, 12), rect(ctx, '#7a5a3a', 0, 100 + i * 12, W, 2);
      for (let x = 30; x < W; x += 46) { rect(ctx, '#1a1a1a', x, 100, 2, 24); rect(ctx, '#1a1a1a', x - 6, 98, 14, 4); }
      rect(ctx, '#0a0a0c', 238, 108, 70, 24); rect(ctx, '#18181c', 240, 110, 66, 20); rect(ctx, '#f0f0e8', 240, 124, 66, 4);
      for (let i = 0; i < 16; i++) rect(ctx, '#111', 242 + i * 4, 124, 2, 2);
      ctx.fillStyle = '#0a0a0c'; ctx.beginPath(); ctx.moveTo(244, 110); ctx.lineTo(290, 88); ctx.lineTo(300, 110); ctx.fill();
      rect(ctx, '#c02020', 70, 112, 24, 18); rect(ctx, '#e8e8e8', 72, 116, 20, 10); rect(ctx, '#d8b030', 60, 100, 16, 2); rect(ctx, '#d8b030', 96, 102, 14, 2);
      // wooden stage floor
      perspectiveFloor(ctx, W, H, 136, '#8a5a32', '#94643a', 'rgba(60,30,10,0.35)');
    },
    drawAnimated(ctx, t) { // notes floating up from the piano
      for (let i = 0; i < 4; i++) { const a = (t + i * 30) % 120; if (a > 90) continue; ctx.globalAlpha = 1 - a / 90; RF.drawNote && RF.drawNote(ctx, 262 + i * 10 + Math.sin((t + i * 20) / 15) * 6, 104 - a * 0.7, i % 2 ? '#ffd040' : '#ffffff', 1); }
      ctx.globalAlpha = 1;
    },
  });
  HZ.musicroom = { side: -1, name: 'GONG!', damage: 10, launch: { vx: 5, vy: 7 }, color: '#ffd040', sound: 'gong',
    draw(ctx, x, floorY, frame, firing) {
      const cx = x + 14, cy = floorY - 40, wob = firing ? Math.sin(frame) * 2 : 0;
      rect(ctx, '#3a2414', x, floorY - 72, 3, 72); rect(ctx, '#3a2414', x + 26, floorY - 72, 3, 72); rect(ctx, '#3a2414', x, floorY - 74, 29, 3);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + wob, cy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c89a30'; ctx.beginPath(); ctx.arc(cx + wob, cy, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.arc(cx + wob - 3, cy - 3, 5, 0, Math.PI * 2); ctx.fill();
    },
    fx(ctx, x, floorY, t) { // rings of sound
      ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const r = t * 3 - i * 12; if (r > 0) { ctx.globalAlpha = Math.max(0, 1 - r / 140); ctx.beginPath(); ctx.arc(x + 14, floorY - 40, r, 0, Math.PI * 2); ctx.stroke(); } }
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    },
  };

  // ================================================================ THE BACK NINE (Tyler)
  RF.registerStage({
    id: 'golf', name: 'The Back Nine', music: 'golf', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, 130, [[0, '#4a90e0'], [1, '#bfe4ff']]);
      // far hills and trees
      ctx.fillStyle = '#6aa860'; ctx.beginPath(); ctx.moveTo(0, 110); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 96 + Math.sin(x / 50) * 10); ctx.lineTo(W, 140); ctx.lineTo(0, 140); ctx.fill();
      ctx.fillStyle = '#4e8a48'; ctx.beginPath(); ctx.moveTo(0, 124); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, 116 + Math.sin(x / 34 + 1) * 6); ctx.lineTo(W, 150); ctx.lineTo(0, 150); ctx.fill();
      const r = rng(77);
      for (let i = 0; i < 9; i++) { const tx = 20 + i * 42 + Math.floor(r() * 10), ty = 96 + Math.floor(r() * 10); rect(ctx, '#4a3020', tx, ty, 3, 14); ctx.fillStyle = '#2e6a2a'; ctx.beginPath(); ctx.arc(tx + 1, ty - 2, 8, 0, Math.PI * 2); ctx.fill(); }
      // the green with the pin, a bunker, the clubhouse
      ctx.fillStyle = '#5cbf50'; ctx.beginPath(); ctx.ellipse(250, 136, 56, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(262, 136, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8d8a0'; ctx.beginPath(); ctx.ellipse(130, 140, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
      rect(ctx, '#e8e0d0', 30, 104, 44, 24); ctx.fillStyle = '#a03020'; ctx.beginPath(); ctx.moveTo(26, 104); ctx.lineTo(52, 90); ctx.lineTo(78, 104); ctx.fill();
      T(ctx, 'CLUB', 52, 112, { align: 'center', color: '#3a2a1a' });
      // fairway in front
      perspectiveFloor(ctx, W, H, 142, '#58b04c', '#62bc54', null);
    },
    drawAnimated(ctx, t) {
      // drifting clouds
      for (let i = 0; i < 4; i++) { const x = ((t * (0.15 + i * 0.05) + i * 110) % 460) - 60, y = 14 + i * 12; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(x, y, 22, 6, 0, 0, Math.PI * 2); ctx.ellipse(x + 14, y - 4, 14, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      // the flag fluttering on the pin
      rect(ctx, '#f0f0f0', 262, 108, 1, 28);
      ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.moveTo(263, 108); ctx.lineTo(275, 111 + Math.sin(t / 6) * 2); ctx.lineTo(263, 115); ctx.fill();
    },
  });
  HZ.golf = { side: 1, name: 'WATER HAZARD!', damage: 9, launch: { vx: 3, vy: 10 }, color: '#60c0ff', sound: 'hiss',
    draw(ctx, x, floorY, frame) {
      ctx.fillStyle = '#2a70b0'; ctx.beginPath(); ctx.ellipse(x - 18, floorY + 1, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8ad0ff'; rect(ctx, '#8ad0ff', x - 30 + ((frame >> 3) % 6) * 3, floorY, 6, 1);
      rect(ctx, '#f0f0f0', x - 4, floorY - 22, 2, 22); rect(ctx, '#ffd030', x - 2, floorY - 22, 8, 5);
    },
    fx(ctx, x, floorY, t) { // a splash column
      for (let i = 0; i < 24; i++) { const a = (t * 2.5 + i * 11) % 70; ctx.globalAlpha = Math.max(0, 1 - t / FX); ctx.fillStyle = i % 3 ? '#8ad0ff' : '#ffffff'; ctx.fillRect(x - 18 + Math.sin(i * 2.1) * 12, floorY - a, 3, 4); }
      ctx.globalAlpha = 1;
    },
  };

  // ================================================================ SOUTH BEACH (Gabriel)
  RF.registerStage({
    id: 'miami', name: 'South Beach', music: 'miami', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, 110, [[0, '#2a0a4a'], [0.55, '#ff4fb0'], [1, '#ffb040']]);
      ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(192, 108, 40, Math.PI, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) rect(ctx, '#ff6fb0', 150, 80 + i * 6, 84, 2);
      // hotels with neon
      const r = rng(305);
      for (const [hx, hw, hh, neon] of [[8, 60, 70, 'OCEAN'], [300, 76, 86, 'DRIVE']]) {
        rect(ctx, '#2a1840', hx, 110 - hh, hw, hh);
        for (let y = 110 - hh + 8; y < 104; y += 9) for (let x = hx + 5; x < hx + hw - 6; x += 9) rect(ctx, r() < 0.5 ? '#ffd890' : '#3a2858', x, y, 5, 5);
        T(ctx, neon, hx + hw / 2, 110 - hh - 9, { align: 'center', color: neon === 'OCEAN' ? '#40e8ff' : '#ff4fb0', outline: '#000' });
      }
      // ocean
      grad(ctx, 0, 110, W, 34, [[0, '#2a68b0'], [1, '#1a3a70']]);
      // palms
      for (const px of [96, 286]) {
        ctx.fillStyle = '#1a0828';
        for (let i = 0; i < 12; i++) rect(ctx, '#1a0828', px + Math.round(Math.sin(i / 4) * 4), 60 + i * 6, 4, 7);
        for (let k = 0; k < 6; k++) { ctx.save(); ctx.translate(px + 2, 60); ctx.rotate(-2.6 + k * 0.85); ctx.fillRect(0, -2, 28, 4); ctx.restore(); }
      }
      // sand
      perspectiveFloor(ctx, W, H, 144, '#e8c890', '#f0d29c', null);
    },
    drawAnimated(ctx, t) { // waves glinting, the tide line
      for (let i = 0; i < 14; i++) { const x = ((i * 31 + t * 0.4) % 400) - 8, y = 114 + (i % 4) * 7; ctx.fillStyle = 'rgba(255,220,240,0.6)'; ctx.fillRect(Math.round(x), y, 8, 1); }
      const tide = 144 + Math.sin(t / 30) * 2; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(0, Math.round(tide), 384, 1);
    },
  });
  HZ.miami = { side: -1, name: 'WIPEOUT!', damage: 10, launch: { vx: 5, vy: 8 }, color: '#40e8ff', sound: 'hiss',
    draw(ctx, x, floorY) { // a lifeguard stand
      rect(ctx, '#111', x + 2, floorY - 46, 26, 4); rect(ctx, '#e04040', x + 3, floorY - 45, 24, 2);
      rect(ctx, '#e8d8b0', x + 4, floorY - 42, 3, 42); rect(ctx, '#e8d8b0', x + 22, floorY - 42, 3, 42);
      rect(ctx, '#e04040', x + 6, floorY - 62, 18, 16); T(ctx, '+', x + 15, floorY - 58, { align: 'center', color: '#fff' });
    },
    fx(ctx, x, floorY, t) { // a wave crashes over the wall
      const u = Math.min(1, t / 14), w = 40 + u * 30;
      ctx.globalAlpha = Math.max(0, 1 - t / FX);
      ctx.fillStyle = '#2a90e0'; ctx.beginPath(); ctx.moveTo(x, floorY); ctx.quadraticCurveTo(x + w * 0.4, floorY - 70 * u, x + w, floorY); ctx.fill();
      ctx.fillStyle = '#e8f8ff'; for (let i = 0; i < 10; i++) ctx.fillRect(x + i * w / 10, floorY - 70 * u * Math.sin((i / 10) * Math.PI) - 2, 3, 3);
      ctx.globalAlpha = 1;
    },
  };

  // ================================================================ BRO BATCH HQ (Anthony & Nicholas)
  RF.registerStage({
    id: 'brobatch', name: 'Bro Batch HQ', music: 'brobatch', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, 140, [[0, '#18120e'], [1, '#2a1e16']]);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 6, row = 0; y < 140; y += 7, row++) { ctx.fillRect(0, y, W, 1); for (let x = (row % 2) * 9; x < W; x += 18) ctx.fillRect(x, y - 6, 1, 6); }
      // giant sign
      rect(ctx, '#0c0806', 96, 10, 192, 32); rect(ctx, '#1e140c', 98, 12, 188, 28);
      // vats
      for (const vx of [20, 316]) { rect(ctx, '#5a5e66', vx, 60, 48, 66); rect(ctx, '#7a7e86', vx + 4, 60, 6, 66); rect(ctx, '#3a3e46', vx, 82, 48, 3); T(ctx, 'WHEY', vx + 24, 96, { align: 'center', color: '#e8e0d0' }); rect(ctx, '#3a3e46', vx + 20, 40, 8, 20); }
      // posters
      rect(ctx, '#e8b420', 120, 52, 40, 30); T(ctx, 'GAINS', 140, 62, { align: 'center', color: '#1a1a22' });
      rect(ctx, '#e8b420', 224, 52, 40, 30); T(ctx, 'GRIND', 244, 62, { align: 'center', color: '#1a1a22' });
      // conveyor frame
      rect(ctx, '#111', 0, 116, W, 14); rect(ctx, '#3a3a40', 0, 118, W, 8);
      for (let x = 6; x < W; x += 20) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x, 128, 3, 0, Math.PI * 2); ctx.fill(); }
      perspectiveFloor(ctx, W, H, 136, '#3a3a3e', '#424246', 'rgba(255,200,40,0.12)');
    },
    drawAnimated(ctx, t) {
      // the neon sign flickers on
      const on = t % 140 < 132 || t % 4 < 2;
      T(ctx, 'BRO BATCH', 192, 16, { scale: 2, align: 'center', color: on ? '#ffd030' : '#5a4010', outline: on ? '#ff6020' : '#000' });
      // bars riding the conveyor
      for (let i = 0; i < 9; i++) { const x = ((i * 46 + t * 0.8) % 430) - 30; if (RF.drawProteinBar) RF.drawProteinBar(ctx, x, 115, 0.55, 0); else rect(ctx, '#e8b420', x, 112, 14, 5); }
    },
  });
  HZ.brobatch = { side: 1, name: 'PRESSED!', damage: 11, launch: { vx: 4, vy: 7 }, color: '#ffd030', sound: 'stomp',
    draw(ctx, x, floorY, frame, firing) { // a hydraulic bar press
      const l = x - 30, down = firing ? Math.min(30, (frame % 20) * 3) : 0;
      rect(ctx, '#111', l, floorY - 80, 30, 6); rect(ctx, '#5a5e66', l + 1, floorY - 79, 28, 4);
      rect(ctx, '#888', l + 13, floorY - 74, 4, 20 + down);
      rect(ctx, '#111', l + 2, floorY - 56 + down, 26, 8); rect(ctx, '#c02020', l + 3, floorY - 55 + down, 24, 6);
      rect(ctx, '#111', l, floorY - 6, 30, 6); rect(ctx, '#3a3e46', l + 1, floorY - 5, 28, 4);
    },
    fx(ctx, x, floorY, t) { if (t < 30) T(ctx, 'FRESH BATCH!', x - 40, floorY - 92 - t * 0.5, { align: 'center', color: '#ffd030', outline: '#000' }); },
  };

  // ================================================================ THE CRAG (Alejandro)
  RF.registerStage({
    id: 'cliff', name: 'The Crag', music: 'cliff', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, 120, [[0, '#ff9850'], [1, '#ffd8a0']]);
      grad(ctx, 0, 100, W, 48, [[0, '#7a6078'], [1, '#4a3a40']]);   // the valley far below
      // distant peaks
      ctx.fillStyle = '#8a6a8a'; ctx.beginPath(); ctx.moveTo(0, 100); [[40, 50], [90, 80], [150, 30], [210, 76], [270, 40], [330, 70], [384, 46], [384, 120], [0, 120]].forEach(([x, y]) => ctx.lineTo(x, y)); ctx.fill();
      ctx.fillStyle = '#f0e8f0'; [[150, 30], [270, 40], [40, 50]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 10, y + 12); ctx.lineTo(x, y); ctx.lineTo(x + 10, y + 12); ctx.fill(); });
      // the rock wall (right) with holds, quickdraws and a rope
      const r = rng(9);
      ctx.fillStyle = '#5a4436'; ctx.beginPath(); ctx.moveTo(220, 0); for (let y = 0; y <= 150; y += 10) ctx.lineTo(222 + Math.floor(r() * 12), y); ctx.lineTo(W, 150); ctx.lineTo(W, 0); ctx.fill();
      for (let i = 0; i < 26; i++) rect(ctx, ['#7a5e4a', '#3e2e24'][i % 2], 236 + Math.floor(r() * 140), Math.floor(r() * 140), 4 + Math.floor(r() * 6), 2);
      for (let i = 0; i < 6; i++) { const hx = 250 + (i % 2) * 40 + i * 8, hy = 14 + i * 22; rect(ctx, ['#e04040', '#40c0e0', '#ffd030'][i % 3], hx, hy, 6, 4); }
      ctx.strokeStyle = '#e07030'; ctx.beginPath(); ctx.moveTo(260, 0); ctx.quadraticCurveTo(280, 80, 268, 150); ctx.stroke();
      // the ledge they fight on
      perspectiveFloor(ctx, W, H, 146, '#6a5446', '#725c4c', null);
      rect(ctx, '#3a2c24', 0, 146, W, 2);
    },
    drawAnimated(ctx, t) { // a hawk circling, little dust
      const a = t / 80, hx = 110 + Math.cos(a) * 60, hy = 40 + Math.sin(a) * 14;
      ctx.fillStyle = '#2a1a14'; ctx.fillRect(Math.round(hx) - 4, Math.round(hy), 9, 1); ctx.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 3, 2);
    },
  });
  HZ.cliff = { side: -1, name: 'ROCKFALL!', damage: 11, launch: { vx: 4, vy: 6 }, color: '#c8a888', sound: 'rumble',
    draw(ctx, x, floorY) { // a FALLING ROCK sign and a pile of loose rocks
      rect(ctx, '#3a3a40', x + 10, floorY - 44, 2, 44);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(x + 11, floorY - 64); ctx.lineTo(x + 25, floorY - 50); ctx.lineTo(x + 11, floorY - 36); ctx.lineTo(x - 3, floorY - 50); ctx.fill();
      ctx.fillStyle = '#ffd030'; ctx.beginPath(); ctx.moveTo(x + 11, floorY - 62); ctx.lineTo(x + 23, floorY - 50); ctx.lineTo(x + 11, floorY - 38); ctx.lineTo(x - 1, floorY - 50); ctx.fill();
      rect(ctx, '#111', x + 7, floorY - 54, 4, 3); rect(ctx, '#111', x + 12, floorY - 49, 3, 3); rect(ctx, '#111', x + 9, floorY - 45, 5, 2);
      for (const [rx, rw] of [[x + 2, 8], [x + 12, 6], [x + 20, 9]]) { rect(ctx, '#111', rx - 1, floorY - rw, rw + 2, rw); rect(ctx, '#7a6250', rx, floorY - rw + 1, rw, rw - 1); }
    },
    fx(ctx, x, floorY, t) { // boulders tumbling down
      for (let i = 0; i < 6; i++) { const y = Math.min(floorY - 6, -20 + (t - i * 4) * (t - i * 4) * 0.25); if (t < i * 4) continue; ctx.fillStyle = '#111'; ctx.fillRect(x + 10 + i * 5, y - 1, 10, 9); ctx.fillStyle = '#7a6250'; ctx.fillRect(x + 11 + i * 5, y, 8, 7); }
    },
  };

  // ================================================================ PARKING LOT (Fernando)
  RF.registerStage({
    id: 'parking', name: 'Parking Lot', music: 'parking', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, 130, [[0, '#06060e'], [1, '#1a1626']]);
      // the school behind a chain-link fence
      rect(ctx, '#1c1a22', 0, 118, W, 22);                            // the lot behind the fence
      rect(ctx, '#2a2430', 30, 50, 324, 70);
      for (let y = 58; y < 114; y += 14) for (let x = 40; x < 346; x += 22) rect(ctx, hash(x * 3 + y) < 0.3 ? '#ffd890' : '#141020', x, y, 12, 8);
      T(ctx, 'TERRAMANIA HIGH', 192, 40, { align: 'center', color: '#806878', outline: '#000' });
      ctx.strokeStyle = 'rgba(160,160,170,0.35)';
      for (let x = -40; x < W + 40; x += 8) { ctx.beginPath(); ctx.moveTo(x, 96); ctx.lineTo(x + 30, 130); ctx.moveTo(x + 30, 96); ctx.lineTo(x, 130); ctx.stroke(); }
      rect(ctx, '#5a5a60', 0, 94, W, 2);
      // parked cars
      for (const [cx, col] of [[60, '#7a1a1a'], [170, '#1a3a6a'], [300, '#3a3a3a']]) {
        rect(ctx, '#111', cx - 1, 113, 62, 20); rect(ctx, col, cx, 120, 60, 12); rect(ctx, col, cx + 12, 113, 34, 8);
        rect(ctx, '#2a3448', cx + 15, 114, 12, 6); rect(ctx, '#2a3448', cx + 31, 114, 12, 6);
        for (const wx of [cx + 10, cx + 48]) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(wx, 132, 5, 0, Math.PI * 2); ctx.fill(); }
      }
      // asphalt with painted lines
      perspectiveFloor(ctx, W, H, 138, '#26262c', '#2c2c32', null);
      ctx.fillStyle = '#d8d0a0'; for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(192 + k * 40, 140); ctx.lineTo(192 + k * 40 + 2, 140); ctx.lineTo(192 + k * 100 + 4, H); ctx.lineTo(192 + k * 100, H); ctx.fill(); }
      // street lamp
      rect(ctx, '#3a3a40', 340, 30, 3, 110); rect(ctx, '#3a3a40', 326, 30, 16, 3); rect(ctx, '#ffe8a0', 324, 33, 10, 3);
    },
    drawAnimated(ctx, t) {
      ctx.globalAlpha = 0.12 + Math.sin(t / 7) * 0.02 * (t % 90 < 4 ? 4 : 1); ctx.fillStyle = '#ffe8a0';
      ctx.beginPath(); ctx.moveTo(324, 36); ctx.lineTo(334, 36); ctx.lineTo(380, 204); ctx.lineTo(270, 204); ctx.fill(); ctx.globalAlpha = 1;
      // a car alarm blinking on the red car
      if (t % 60 < 30) rect(ctx, '#ff3030', 118, 122, 3, 2);
    },
  });
  HZ.parking = { side: 1, name: 'TRASHED!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#80c060', sound: 'clang',
    draw(ctx, x, floorY) { // a dumpster
      const l = x - 34;
      rect(ctx, '#111', l, floorY - 30, 34, 30); rect(ctx, '#2a6a2a', l + 1, floorY - 29, 32, 28); rect(ctx, '#1e4e1e', l + 1, floorY - 32, 32, 4);
      rect(ctx, '#e8e0c0', l + 6, floorY - 20, 22, 8); T(ctx, 'TRASH', l + 17, floorY - 19, { align: 'center', color: '#2a2a2a' });
    },
    fx(ctx, x, floorY, t) { // trash explodes out
      for (let i = 0; i < 20; i++) { const u = t / FX, ang = -Math.PI / 2 + (i / 20 - 0.5) * 2, d = 8 + u * (30 + (i % 5) * 10); ctx.globalAlpha = Math.max(0, 1 - u); ctx.fillStyle = ['#e8e0c0', '#80c060', '#c08040', '#a0a0a0'][i % 4]; ctx.fillRect(x - 17 + Math.cos(ang) * d, floorY - 32 + Math.sin(ang) * d + u * u * 30, 3, 3); }
      ctx.globalAlpha = 1;
    },
  };

  // ================================================================ THE SKATEPARK (Bandy)
  RF.registerStage({
    id: 'skatepark', name: 'The Skatepark', music: 'skatepark', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, 140, [[0, '#0c0618'], [0.6, '#2a1030'], [1, '#4a1a3a']]);
      const r = rng(77);
      for (let i = 0; i < 40; i++) rect(ctx, '#ffffff', Math.floor(r() * W), Math.floor(r() * 60), 1, 1);   // stars
      // city skyline
      for (let x = 0; x < W; x += 18 + Math.floor(r() * 14)) {
        const h = 30 + Math.floor(r() * 50), w = 14 + Math.floor(r() * 14);
        rect(ctx, '#160c20', x, 100 - h, w, h + 10);
        for (let wy = 104 - h; wy < 96; wy += 6) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (r() < 0.25) rect(ctx, '#ffd890', wx, wy, 2, 2);
      }
      // the graffiti wall
      rect(ctx, '#3a3440', 0, 92, W, 50);
      for (let y = 92; y < 142; y += 8) for (let x = (y / 8) % 2 ? 0 : 12; x < W; x += 24) rect(ctx, '#332e3a', x, y, 23, 7); // cinder blocks
      const tag = (txt, x, y, sc, col, out) => T(ctx, txt, x, y, { scale: sc, align: 'center', color: col, outline: out });
      tag('SICK', 96, 100, 3, ['#ff60a0', '#ff3060', '#c01850'], '#1a0010');
      tag('TERRAMANIA', 260, 104, 2, ['#60e0ff', '#3090ff'], '#001020');
      tag('SKATE OR DIE', 300, 126, 1, '#ffd030', '#201000');
      rect(ctx, '#ff60a0', 30, 128, 2, 10); rect(ctx, '#ff60a0', 30, 138, 6, 2);                         // drips
      ctx.fillStyle = '#80ff80'; ctx.beginPath(); ctx.arc(190, 118, 9, 0, Math.PI * 2); ctx.fill();      // a smiley
      rect(ctx, '#102010', 186, 114, 2, 3); rect(ctx, '#102010', 192, 114, 2, 3); rect(ctx, '#102010', 186, 121, 8, 2);
      // quarter-pipe ramps on both sides
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? 0 : W;
        ctx.fillStyle = '#8a8690'; ctx.beginPath(); ctx.moveTo(x0, 112); ctx.quadraticCurveTo(x0 - side * 6, 140, x0 - side * 62, 142); ctx.lineTo(x0, 142); ctx.fill();
        ctx.strokeStyle = '#c8c4cc'; ctx.beginPath(); ctx.moveTo(x0, 112); ctx.quadraticCurveTo(x0 - side * 6, 140, x0 - side * 62, 142); ctx.stroke();
        rect(ctx, '#d0d0d8', side < 0 ? 0 : W - 30, 110, 30, 2);                                            // coping
      }
      // a grind rail
      rect(ctx, '#111', 120, 128, 140, 3); rect(ctx, '#b8b8c4', 120, 128, 140, 1);
      for (const px of [128, 190, 252]) rect(ctx, '#2a2a30', px, 131, 2, 11);
      // smooth concrete
      perspectiveFloor(ctx, W, H, 142, '#5a5662', '#625e6a', 'rgba(0,0,0,0.12)');
      ctx.strokeStyle = 'rgba(20,20,26,0.5)';
      for (const [a, b, c, d] of [[40, 160, 70, 190], [300, 150, 330, 180], [330, 180, 340, 210]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); } // cracks
    },
    drawAnimated(ctx, t) {
      // string lights swaying over the park
      for (let i = 0; i < 16; i++) {
        const x = 12 + i * 24, y = 60 + Math.sin(i / 15 * Math.PI) * 14 + Math.sin(t / 30 + i) * 0.8;
        rect(ctx, ['#ff60a0', '#ffd030', '#60e0ff'][i % 3], Math.round(x), Math.round(y), 2, 2);
        if ((t >> 4) % 3 === i % 3) { ctx.globalAlpha = 0.25; rect(ctx, '#ffffff', Math.round(x) - 1, Math.round(y) - 1, 4, 4); ctx.globalAlpha = 1; }
      }
      // the neon SKATE sign, flickering
      const on = !(t % 140 > 128 && t % 4 < 2);
      T(ctx, 'SKATE', 192, 74, { scale: 2, align: 'center', color: on ? '#ff60a0' : '#40182a', outline: on ? '#ffffff' : '#000' });
    },
  });
  HZ.skatepark = { side: -1, name: 'AMPED!', damage: 10, launch: { vx: 5, vy: 7 }, color: '#ff60a0', sound: 'chord',
    draw(ctx, x, floorY) { // a stack of amps
      const l = x;
      for (const [y, h] of [[floorY - 22, 22], [floorY - 40, 18]]) {
        rect(ctx, '#111', l, y, 30, h); rect(ctx, '#2a2a30', l + 1, y + 1, 28, h - 2);
        rect(ctx, '#3a3a44', l + 3, y + 4, 24, h - 7);
        for (let gy = y + 5; gy < y + h - 3; gy += 2) rect(ctx, '#22222a', l + 3, gy, 24, 1);   // speaker grille
      }
      rect(ctx, '#d8c890', l + 3, floorY - 39, 10, 2); rect(ctx, '#111', l + 18, floorY - 39, 2, 2); rect(ctx, '#111', l + 22, floorY - 39, 2, 2);
    },
    fx(ctx, x, floorY, t) { // a wall of sound blasts out
      const u = t / FX;
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = Math.max(0, 0.8 - u - i * 0.12); ctx.strokeStyle = i % 2 ? '#ff60a0' : '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x + 15, floorY - 26, 10 + u * 70 + i * 8, -1.1, 1.1); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    },
  };

  // ================================================================ THE MAIN HALLWAY (Ms. Brady)
  RF.registerStage({
    id: 'hallway', name: 'The Main Hallway', music: 'hallway', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      grad(ctx, 0, 0, W, 140, [[0, '#d8d4c4'], [1, '#c4bea8']]);                         // painted cinder-block wall
      for (let y = 6; y < 140; y += 10) for (let x = (y / 10) % 2 ? 0 : 14; x < W; x += 28) rect(ctx, '#cac4b0', x, y, 27, 9);
      rect(ctx, '#2a3a7a', 0, 0, W, 6); rect(ctx, '#ffd030', 0, 6, W, 2);              // school-colour stripe
      // lockers
      for (let x = 4; x < W; x += 16) {
        if (x > 150 && x < 236) continue;                                                // gap for the trophy case
        rect(ctx, '#111', x, 52, 15, 90); rect(ctx, '#2a4a9a', x + 1, 53, 13, 88);
        for (let v = 0; v < 3; v++) rect(ctx, '#1a3070', x + 3, 56 + v * 3, 9, 1);      // vents
        rect(ctx, '#c0c0c8', x + 10, 92, 2, 6);                                          // handle
        if (hash(x) < 0.25) { rect(ctx, '#e8e0c0', x + 3, 104, 8, 10); }                 // a note taped on
      }
      // trophy case
      rect(ctx, '#3a2414', 152, 50, 84, 92); rect(ctx, '#8ab0c8', 155, 53, 78, 70);
      for (const [tx, ty, h] of [[166, 88, 22], [188, 80, 30], [210, 90, 20]]) { rect(ctx, '#d8a020', tx, ty, 10, h - 8); rect(ctx, '#b07818', tx + 2, ty + h - 8, 6, 8); rect(ctx, '#ffe070', tx + 2, ty + 2, 2, h - 12); }
      rect(ctx, '#5a3a1a', 155, 112, 78, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(160, 53); ctx.lineTo(170, 53); ctx.lineTo(158, 85); ctx.lineTo(155, 85); ctx.fill();
      // signs
      rect(ctx, '#111', 30, 22, 90, 18); rect(ctx, '#c01818', 31, 23, 88, 16);
      T(ctx, 'NO RUNNING', 75, 27, { align: 'center', color: '#ffffff' });
      rect(ctx, '#111', 268, 20, 90, 22); rect(ctx, '#ffffff', 269, 21, 88, 20);
      T(ctx, 'MAIN OFFICE', 313, 24, { align: 'center', color: '#2a3a7a' }); T(ctx, '->', 313, 32, { align: 'center', color: '#2a3a7a' });
      // clock
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(194, 30, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4f0e4'; ctx.beginPath(); ctx.arc(194, 30, 9, 0, Math.PI * 2); ctx.fill();
      rect(ctx, '#111', 193, 23, 1, 8); rect(ctx, '#111', 194, 30, 5, 1);                  // 7:45
      // waxed linoleum floor
      perspectiveFloor(ctx, W, H, 142, '#b8b0a0', '#c4bcac', 'rgba(80,70,60,0.15)');
      for (let x = 0; x < W; x += 24) rect(ctx, 'rgba(255,255,255,0.12)', x, 150, 10, 2);  // shine
    },
    drawAnimated(ctx, t) {
      // a flickering fluorescent tube
      const flick = t % 200 > 186 && t % 4 < 2;
      ctx.globalAlpha = flick ? 0.05 : 0.12; rect(ctx, '#fffff0', 0, 0, 384, 140); ctx.globalAlpha = 1;
      rect(ctx, flick ? '#888' : '#ffffff', 60, 10, 60, 3); rect(ctx, '#ffffff', 260, 10, 60, 3);
      // the clock's second hand
      const a = (t / 60) * Math.PI / 30;
      ctx.fillStyle = '#c01818'; ctx.fillRect(Math.round(194 + Math.sin(a) * 7), Math.round(30 - Math.cos(a) * 7), 1, 1);
    },
  });
  HZ.hallway = { side: 1, name: 'LOCKED IN!', damage: 10, launch: { vx: -5, vy: 7 }, color: '#2a4a9a', sound: 'clang',
    draw(ctx, x, floorY, frame, firing) { // an open locker at the wall
      const l = x - 26;
      rect(ctx, '#111', l, floorY - 74, 26, 74); rect(ctx, '#2a4a9a', l + 1, floorY - 73, 24, 72);
      rect(ctx, '#0a0a10', l + 4, floorY - 68, 18, 62);                                  // inside
      rect(ctx, '#1a3070', l - (firing ? 4 : 14), floorY - 73, firing ? 4 : 12, 72);       // the door, swinging
    },
    fx(ctx, x, floorY, t) {
      const u = t / FX;
      ctx.globalAlpha = Math.max(0, 1 - u);
      T(ctx, 'CLANG!', x - 30, floorY - 90 - u * 20, { align: 'center', color: '#ffd030', outline: '#000' });
      ctx.globalAlpha = 1;
    },
  };

  RF.HOME_HAZARDS = HZ;
})();
