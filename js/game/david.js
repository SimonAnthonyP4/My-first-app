// DAVID P.: the artist. The shortest fighter on the roster (so the hardest to hit high), quick, and every move is
// something he DRAWS and then it hits you:
//   attacks   a pencil jab, a paint-brush swipe, a doodle, an ink drop from above, the sketchbook swung up with
//             its pages flying, a charcoal smudge, and a paint roller dragged along the floor
//   block     SKETCH SHIELD: a shield drawn in pencil, line by line, that he scribbles over when it takes a hit
//   specials  DOWN, FORWARD + LIGHT  Paint Splatter (three blobs)       + HEAVY  Smudge Dash (he smears forward)
//             DOWN, BACK    + LIGHT  Quick Sketch (a counter)           + HEAVY  Rub Out (erases himself, redraws behind you)
//   signature LIVING SKETCH: he draws a wolf in the air, line by line, and it comes to life and charges
//   finisher  REJECTED: he sketches them, pulls the page, crumples it and bins it
// (The drawing is a friend's picture, mirrored so he faces his opponent; the face is repainted by hand because it is tiny.)
(function () {
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const T = (ctx, text, x, y, color) => RF.font.drawText(ctx, text, x, y, { align: 'center', color, outline: '#000' });
  const lerp = (a, b, u) => a + (b - a) * u, ease = (u) => 1 - (1 - u) * (1 - u);
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const when = (f) => { const m = f.move, t = f.stateTime; return m && t >= m.startup - 3 && t <= m.startup + m.active + 8 ? { m, age: t - (m.startup - 3), life: m.active + 11 } : null; };
  const INK = '#15121a', PAPER = '#f4f0e6', PAINT = ['#e03a3a', '#f2a21e', '#f4dc3a', '#3a8ae0', '#8a4ad0', '#34b860'];
  // a hand-drawn line: a polyline with a little wobble that changes every few frames (a "boiling" pencil line)
  const wobble = (ctx, pts, col, w, t, amp) => {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    pts.forEach((p, i) => { const j = Math.floor(t / 3) * 7.1 + i * 3.3, x = p[0] + (hash(j) - 0.5) * amp, y = p[1] + (hash(j + 9) - 0.5) * amp; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  };
  const pencil = (ctx, x, y, face, ang) => {       // a yellow pencil, tip toward the way it is going
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang); ctx.scale(face, 1);
    R(ctx, '#111', -10, -3, 22, 6); R(ctx, '#f2c21e', -9, -2, 15, 4); R(ctx, '#d89a10', -9, 0, 15, 1); R(ctx, '#e8a090', -12, -2, 3, 4); R(ctx, '#c8c8d0', -9, -2, 1, 4);
    R(ctx, '#e8c898', 6, -2, 3, 4); R(ctx, '#333', 9, -1, 3, 2); ctx.restore();
  };

  // ---------------------------------------------------------------- the attacks
  const frame = (f, floorY, fn) => { const w = when(f); if (!w) return; const m = w.m, h = m.hitbox, cx = h.x + h.w * 0.75, cy = h.y + h.h / 2, u = Math.min(1, w.age / (m.active + 2)), a = Math.max(0, 1 - w.age / w.life); fn(w, m, h, cx, cy, u, a, (lx, ly) => [f.x + f.facing * lx, floorY - f.y - ly]); };
  Object.assign(RF.MOVE_FX, {
    // PENCIL JAB: a graphite line stabs out and the pencil is on the end of it
    pencilJab(f, ctx, floorY, t) { frame(f, floorY, (w, m, h, cx, cy, u, a, P) => {
      const [x0, y0] = P(8, cy + 1), [x1, y1] = P(lerp(8, cx, ease(u)), cy);
      ctx.save(); ctx.globalAlpha = a; wobble(ctx, [[x0, y0], [(x0 + x1) / 2, y0 + 1], [x1, y1]], '#3a3a44', 2, t, 1.2); wobble(ctx, [[x0, y0 + 2], [x1, y1 + 2]], '#8a8a96', 1, t + 5, 1.6);
      pencil(ctx, x1 + f.facing * 8, y1, f.facing, 0); if (u > 0.7) for (let i = 0; i < 5; i++) R(ctx, '#55555f', x1 + f.facing * (10 + hash(i + t) * 10), y1 + (hash(i * 3 + t) - 0.5) * 12, 1, 1);
      ctx.restore(); }); },
    // BRUSH SWIPE: a wide arc of paint, a different colour in every stroke, and drops flying off it
    brushSwipe(f, ctx, floorY, t) { frame(f, floorY, (w, m, h, cx, cy, u, a, P) => {
      ctx.save(); ctx.lineCap = 'round'; const pts = [];
      for (let j = 0; j <= 10; j++) { const th = lerp(-2.4, 0.4, ease(Math.max(0, u - (10 - j) * 0.06))), rad = cx - 4; pts.push(P(6 + rad * Math.cos(th), cy + rad * 0.5 * Math.sin(th) + 3)); }
      for (let s = 0; s < 3; s++) { ctx.strokeStyle = PAINT[(s * 2 + 1) % 6]; ctx.globalAlpha = a * 0.9; ctx.lineWidth = 3.2 - s * 0.6; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + (s - 1) * 3) : ctx.moveTo(p[0], p[1] + (s - 1) * 3))); ctx.stroke(); }
      const [ex, ey] = pts[10]; for (let i = 0; i < 8; i++) { ctx.globalAlpha = a; ctx.fillStyle = PAINT[i % 6]; const k = (w.age * 0.9 + i * 2) % 12; ctx.beginPath(); ctx.arc(ex + f.facing * (k * 1.6 + i), ey - 6 + (hash(i + 3) - 0.3) * 22 + k * 0.6, 1.4 + (i % 3) * 0.5, 0, 7); ctx.fill(); }
      ctx.restore(); }); },
    // DOODLE: a quick star and spiral scribbled in the air where it hits
    doodleFlick(f, ctx, floorY, t) { frame(f, floorY, (w, m, h, cx, cy, u, a, P) => {
      const [x, y] = P(cx - 4, cy), n = Math.max(2, Math.floor(u * 26)), pts = [];
      for (let k = 0; k < n; k++) { const an = k * 0.7, r = 1.2 + k * 0.38; pts.push([x + Math.cos(an) * r * f.facing, y + Math.sin(an) * r]); }
      ctx.save(); ctx.globalAlpha = a; wobble(ctx, pts, '#e8e0d0', 1.4, t, 0.8); const [px, py] = pts[pts.length - 1] || [x, y]; pencil(ctx, px + f.facing * 6, py - 3, f.facing, -0.5);
      if (u > 0.6) { wobble(ctx, [[x - 9, y - 7], [x - 5, y - 11], [x - 1, y - 7], [x - 6, y - 3], [x - 9, y - 7]], '#ffe27a', 1.4, t, 0.6); } ctx.restore(); }); },
    // INK DROP: a black drop falls out of the air and splats where it lands
    inkDrop(f, ctx, floorY, t) { frame(f, floorY, (w, m, h, cx, cy, u, a, P) => {
      const [x, y] = P(cx - 2, cy), fall = Math.min(1, u * 1.6);
      ctx.save(); ctx.globalAlpha = a;
      if (fall < 1) { const dy = y - 40 * (1 - fall); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x, dy - 9); ctx.quadraticCurveTo(x + 5, dy, x, dy + 4); ctx.quadraticCurveTo(x - 5, dy, x, dy - 9); ctx.fill(); R(ctx, '#7a7a96', x - 1, dy - 3, 1, 3); }
      else { const k = (u - 0.62) * 2.6; ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, y, 6 + k * 8, 3 + k * 3, 0, 0, 7); ctx.fill(); for (let i = 0; i < 9; i++) { const an = i * 0.7 + 0.3, r = 8 + k * 12 + hash(i) * 6; ctx.beginPath(); ctx.arc(x + Math.cos(an) * r * f.facing, y + Math.sin(an) * r * 0.7, 1.4 + hash(i + 4) * 1.6, 0, 7); ctx.fill(); } }
      ctx.restore(); }); },
    // SKETCHBOOK UPPERCUT: the book swung up from low, pages tearing loose behind it
    bookUpper(f, ctx, floorY, t) { frame(f, floorY, (w, m, h, cx, cy, u, a, P) => {
      const e = ease(u), [x, y] = P(lerp(10, cx * 0.8, e), lerp(h.y * 0.5 + 8, h.y + h.h - 8, e));
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 5; i >= 1; i--) { const [px, py] = P(lerp(10, cx * 0.8, ease(Math.max(0, u - i * 0.09))) - 3 * i, lerp(h.y * 0.5 + 8, h.y + h.h - 8, ease(Math.max(0, u - i * 0.09)))); ctx.save(); ctx.translate(px, py); ctx.rotate(i * 0.5 + t * 0.2); ctx.globalAlpha = a * (0.8 - i * 0.12); R(ctx, '#111', -6, -4, 12, 9); R(ctx, PAPER, -5, -3, 10, 7); R(ctx, '#8a8a96', -4, -1, 6, 1); ctx.restore(); }
      ctx.translate(x, y); ctx.rotate(-0.5 * f.facing); R(ctx, '#111', -8, -10, 16, 20); R(ctx, '#3a3040', -7, -9, 14, 18); R(ctx, '#e8d8a0', -7, -9, 14, 2);
      for (let i = 0; i < 6; i++) R(ctx, '#c8c8d0', -6 + i * 2, -12, 1, 3); R(ctx, '#8a7a9a', -3, -3, 6, 7); ctx.restore(); }); },
    // CHARCOAL SMUDGE: a low smear of grey with a fingertip dragging it
    smudge(f, ctx, floorY, t) { frame(f, floorY, (w, m, h, cx, cy, u, a, P) => {
      ctx.save(); const [x0, y0] = P(10, cy), [x1, y1] = P(lerp(10, cx, ease(u)), cy);
      for (let i = 0; i < 4; i++) { ctx.globalAlpha = a * (0.55 - i * 0.1); ctx.fillStyle = '#2a2a32'; ctx.beginPath(); ctx.moveTo(x0, y0 - 4 + i); ctx.lineTo(x1, y1 - 2 - i * 2); ctx.lineTo(x1, y1 + 3 + i); ctx.lineTo(x0, y0 + 3 - i); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = a; R(ctx, '#e0a070', x1 + f.facing * 2 - 3, y1 - 3, 6, 6); R(ctx, '#2a2a32', x1 + f.facing * 2 - 3, y1 - 1, 6, 2);
      for (let i = 0; i < 6; i++) R(ctx, '#55555f', x1 + f.facing * (4 + hash(i + t) * 10), y1 + (hash(i * 5 + t) - 0.5) * 10, 2, 1); ctx.restore(); }); },
    // PAINT ROLLER: dragged along the floor, a stripe of yellow paint behind it
    rollerSweep(f, ctx, floorY, t) { frame(f, floorY, (w, m, h, cx, cy, u, a, P) => {
      const [x0, y0] = P(6, 3), [x1, y1] = P(lerp(6, cx, ease(u)), 3);
      ctx.save(); ctx.globalAlpha = a; R(ctx, '#f4dc3a', Math.min(x0, x1), y1 - 1, Math.abs(x1 - x0), 3); R(ctx, '#c8a820', Math.min(x0, x1), y1 + 1, Math.abs(x1 - x0), 1);
      ctx.translate(x1, y1 - 6); R(ctx, '#111', -9, -5, 18, 11); R(ctx, '#e8e4d8', -8, -4, 16, 9); R(ctx, '#f4dc3a', -8, -4, 16, 3);
      R(ctx, '#555', f.facing * -10 - 1, -9, 2, 7); R(ctx, '#8a5a30', f.facing * -10 - 2, -14, 4, 6); ctx.restore(); }); },
  });

  // ---------------------------------------------------------------- SKETCH SHIELD
  const NOPE = ['NOPE.', 'REDRAW THAT.', 'OFF THE PAGE.', 'SMUDGED.'];
  RF.BLOCK_FX.sketchShield = function (f, ctx, floorY, t) {
    const hurt = f.getHurtbox(); if (!hurt) return;
    const k = f.shieldHit > 0 ? f.shieldHit / 12 : 0, base = floorY - f.y, h = Math.min(hurt.h * 0.92, 66), top = base - hurt.h * 0.95, w = 22;
    if (f.shT == null || f.shLast == null || t - f.shLast > 4) f.shT = 0;
    f.shLast = t; const age = ++f.shT, prog = Math.min(1, age / 9);          // the lines are drawn in, one after another
    const x = f.x + f.facing * (f.body.width / 2 + 10);
    const pts = [[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.55], [0, h], [-w / 2, h * 0.55], [-w / 2, 0]].map(([px, py]) => [x + px, top + py]);
    ctx.save();
    const n = pts.length - 1, drawn = prog * n;
    if (prog > 0.9) { ctx.globalAlpha = 0.5 + k * 0.3; ctx.fillStyle = PAPER; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.fill(); }
    ctx.globalAlpha = 0.95;
    const part = []; for (let i = 0; i <= Math.floor(drawn); i++) part.push(pts[i]); if (drawn < n) { const q = drawn - Math.floor(drawn), a0 = pts[Math.floor(drawn)], b0 = pts[Math.floor(drawn) + 1]; part.push([lerp(a0[0], b0[0], q), lerp(a0[1], b0[1], q)]); }
    wobble(ctx, part, '#20202a', 1.8, t, 1.4); wobble(ctx, part, '#555566', 1, t + 4, 2);
    if (prog > 0.8) for (let i = 1; i < 7; i++) wobble(ctx, [[x - w / 2 + 3, top + 4 + i * (h * 0.13)], [x + w / 2 - 3 - (i > 4 ? (i - 4) * 4 : 0), top + 1 + i * (h * 0.13)]], '#8a8a98', 0.8, t + i, 1);   // shading hatch
    if (k > 0) { ctx.strokeStyle = '#d02030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2, top + 2); ctx.lineTo(x + w / 2, top + h * 0.8); ctx.moveTo(x + w / 2, top + 2); ctx.lineTo(x - w / 2, top + h * 0.8); ctx.stroke(); }
    ctx.restore(); ctx.lineWidth = 1;
    if (!f.shCount) f.shCount = 0; if (k > 0.95) f.shCount++;
    if (k > 0.4) T(ctx, NOPE[f.shCount % NOPE.length], f.x, top - 10, '#f4f0e6');
  };

  // ---------------------------------------------------------------- LIVING SKETCH: a wolf he draws, and it runs
  const wolf = (ctx, x, y, t, dir, reveal) => {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(dir * 1.25, 1.25);
    if (reveal < 1) { ctx.beginPath(); ctx.rect(-40, -30, 80 * reveal, 60); ctx.clip(); }
    const run = Math.sin(t / 2.2), body = [[-16, 2], [-12, -6], [-2, -8], [8, -6], [13, -9], [17, -5], [21, -6], [24, -2], [20, 2], [14, 3], [8, 5], [-2, 5], [-10, 6], [-16, 2]];
    ctx.globalAlpha = 0.9; ctx.fillStyle = PAPER; ctx.beginPath(); body.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.fill(); ctx.globalAlpha = 1;
    wobble(ctx, body, INK, 1.8, t, 1.4); wobble(ctx, body, '#8a8a98', 0.8, t + 5, 2.2);
    wobble(ctx, [[13, -9], [14, -14], [17, -9]], INK, 1.5, t, 1); wobble(ctx, [[18, -6], [20, -11], [21, -6]], INK, 1.5, t + 2, 1);   // ears
    wobble(ctx, [[-16, 1], [-24, -5 + run * 2], [-30, -3 + run * 3]], INK, 1.6, t, 2);                                                      // the tail streams back
    for (const [lx, ph] of [[-10, 0], [-5, 2.2], [8, 1.1], [13, 3.3]]) { const sw = Math.sin(t / 2.2 + ph) * 6; wobble(ctx, [[lx, 5], [lx + sw * 0.5, 10], [lx + sw, 15]], INK, 1.7, t + lx, 1); }
    R(ctx, '#ff3030', 19, -6, 2, 2); R(ctx, INK, 24, -3, 2, 2);                                                                               // the red eye, the nose
    for (let i = 0; i < 4; i++) R(ctx, '#7a7a86', -18 - i * 5 - ((t * 2) % 6), -4 + (hash(i + t) - 0.5) * 12, 2, 1);                            // graphite dust behind it
    ctx.restore();
  };
  RF.PROJECTILE_ART.sketchWolf = function (ctx, x, y, t, dir) { wolf(ctx, x, y + 2, t, dir, 1); };
  RF.SPECIAL_KINDS.drawBeast = {
    start(f) { f.vx = 0; },
    update(f, scene) {
      const s = f.special, t = f.stateTime;
      if (t === 3) scene.effects.spawnText('HOLD ON...', f.x, f.body.height + 18, '#f4f0e6');
      if (t === s.startup) { scene.spawnProjectile(f, s); scene.effects.spawnText('IT\'S ALIVE.', f.x, f.body.height + 18, '#ffe27a'); }
      if (t >= s.startup + s.recovery) f.setState('idle');
    },
    anim(f) { const s = f.special, t = f.stateTime; return ['special', t < s.startup * 0.55 ? 0 : 1]; },
    draw(f, ctx, floorY, frame) {
      const s = f.special, t = f.stateTime; if (t >= s.startup) return;
      const p = Math.min(1, t / (s.startup - 2)), x = f.x + f.facing * 36, y = floorY - f.y - f.body.height * 0.5;
      wolf(ctx, x, y, frame, f.facing, p); pencil(ctx, x - f.facing * 22 + f.facing * 44 * p, y - 12 + Math.sin(frame / 1.5) * 4, f.facing, -0.4 * f.facing);
    },
  };
  RF.SPECIALS.livingSketch = {
    name: 'Living Sketch', description: 'He draws a wolf in the air, line by line, and it climbs off the page and charges. Everything he draws comes true.',
    kind: 'drawBeast', startup: 28, recovery: 22, speed: 5.2, size: 34, height: 0.28, damage: 16, hitstun: 30, blockstun: 16, pushback: 7, hitstop: 11, launch: 3, art: 'sketchWolf', sound: 'roar', hitText: 'MAULED.', colors: ['#f4f0e6', '#8a8a98', '#15121a'],
  };

  // ---------------------------------------------------------------- command specials
  RF.PROJECTILE_ART.paintBlob = function (ctx, x, y, t, dir) {
    const col = PAINT[Math.abs(Math.floor(y / 5)) % 6];
    for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.45 - i * 0.1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - dir * i * 6, y + Math.sin(t / 2 + i) * 2, 5 - i, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 7.5 + Math.sin(t / 2) * 0.8, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 6.2 + Math.sin(t / 2) * 0.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - 3), Math.round(y - 4), 2, 2);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = col; ctx.fillRect(Math.round(x + dir * (6 + i * 3)), Math.round(y - 6 + ((t + i * 5) % 12)), 2, 2); }
  };
  const hit = (dmg, extra = {}) => Object.assign({ damage: dmg, hitstun: 24, blockstun: 12, pushback: 5, hitstop: 7 }, extra);
  Object.assign(RF.COMMANDS, {
    paintSplatter: Object.assign({ name: 'Paint Splatter', kind: 'volley', startup: 9, interval: 6, recovery: 18, heights: [0.7, 0.5, 0.3], speed: 5.4, size: 16, art: 'paintBlob', sound: 'whoosh', color: '#f2a21e', colors: ['#ffffff', '#f2a21e', '#e03a3a'] }, hit(5, { hitstun: 18, blockstun: 10, pushback: 3, hitstop: 5 })),
    smudgeDash: Object.assign({ name: 'Smudge Dash', kind: 'rush', startup: 6, speed: 8.5, duration: 15, reach: 16, recovery: 16, color: '#3a3a44', anim: 'heavy' }, hit(11, { pushback: 8 })),
    quickSketch: Object.assign({ name: 'Quick Sketch', kind: 'counter', startup: 2, window: 26, recovery: 16, color: '#f4f0e6', callout: 'I\'LL DRAW THAT.' }, hit(12, { launch: 4 })),
    rubOut: Object.assign({ name: 'Rub Out', kind: 'teleport', startup: 8, behind: true, strikeDelay: 4, reach: 20, recovery: 14, color: '#f0b0c0', callout: 'RUBBED OUT.', sound: 'paper' }, hit(10)),
  });
  RF.THROWS.stillLife = { name: 'Still Life', description: 'Poses them, lifts them for the better angle, and puts them down hard. Do not move, he is almost done.', kind: 'overhead', damage: 14 };

  // ---------------------------------------------------------------- REJECTED: sketched, pulled off the pad, crumpled and binned
  const sheet = (ctx, x, bottom, vic, u, sketch) => {
    const w = 42, h = 62, l = Math.round(x - w / 2), top = bottom - h;
    ctx.save(); R(ctx, '#111', l - 2, top - 2, w + 4, h + 4); R(ctx, PAPER, l, top, w, h);
    for (let i = 0; i < 9; i++) R(ctx, '#c8c4b8', l, top + 4 + i * 7, w, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(l + 2, top + 2, w - 4, h - 4); ctx.clip(); ctx.translate(x, bottom - 4); ctx.scale(0.55, 0.55);
    try { ctx.filter = 'grayscale(1) contrast(1.5) brightness(1.15)'; } catch (e) { /* ok */ }
    ctx.globalAlpha = Math.min(1, sketch); vic.sprite.draw(ctx, 'hit', 0, 0, 0, vic.facing); ctx.restore();
    ctx.restore();
  };
  RF.FINISHERS.rejected = {
    name: 'Rejected',
    duration: 220,
    update(att, vic, t, scene) {
      att.finisherAnim = t < 20 ? ['taunt', 0] : t < 120 ? ['special', (t >> 4) % 2 ? 1 : 0] : ['victory', (t >> 3) % 2];
      if (t === 6) scene.effects.spawnText('HOLD STILL.', att.x, att.body.height + 22, '#f4f0e6');
      if (t === 40) { RF.audio.sfx('paper'); scene.flash = 3; }
      if (t === 80) scene.effects.spawnText('JUST THE OUTLINE...', att.x, att.body.height + 30, '#ffe27a');
      if (t === 120) { RF.audio.sfx('paper'); RF.audio.sfx('heavy'); scene.shake = 10; scene.flash = 3; }
      if (t === 150) scene.effects.spawnText('REJECTED.', att.x, att.body.height + 26, '#ff4040');
      if (t === 185) RF.audio.sfx('applause');
    },
    drawVictim(vic, ctx, floorY, t, frame) {
      if (t < 30) return vic.sprite.draw(ctx, 'dazed', 0, vic.x, floorY, vic.facing);
      if (t < 120) {
        const drop = Math.min(1, (t - 30) / 12), y = floorY - 6 - (1 - ease(drop)) * 90;
        sheet(ctx, vic.x, y, vic, 1, Math.min(1, (t - 40) / 50));
        if (t > 44 && t < 100) pencil(ctx, vic.x + Math.sin(t / 3) * 14, y - 30 + Math.cos(t / 2) * 10, 1, -0.6);
        return;
      }
      const u = Math.min(1, (t - 120) / 26), sc = lerp(1, 0.22, ease(u)), rot = u * 6;                   // crumpled into a ball
      if (t < 150) { ctx.save(); ctx.translate(vic.x, floorY - 6 - 31 * sc); ctx.rotate(rot); ctx.scale(sc, sc); sheet(ctx, 0, 31, vic, 1, 1); ctx.restore(); return; }
      const v = (t - 150) / 50, bx = vic.x - vic.facing * 110 * v, by = floorY - 18 - Math.sin(Math.min(1, v) * Math.PI) * 50 + v * 20;   // tossed away
      if (v < 1.2) { ctx.save(); ctx.translate(bx, by); ctx.rotate(t * 0.4); R(ctx, '#111', -7, -7, 14, 14); R(ctx, PAPER, -6, -6, 12, 12); R(ctx, '#bdb8a8', -3, -2, 6, 1); R(ctx, '#bdb8a8', -4, 2, 4, 1); ctx.restore(); }
    },
  };

  // ---------------------------------------------------------------- the fighter
  const DEF = {
    id: 'david',
    name: 'David P.',
    archetype: 'artist',
    health: 114,
    origin: 'The Art Room / The Gallery',
    bio: 'Artist and drawer, and the shortest fighter in the ring, which makes him the hardest to hit high. Carries a sketchbook, a pocket of brushes and a paint-splattered apron. If he can draw it, it can hit you.',
    quote: 'EVERYTHING I DRAW COMES TRUE.',
    winQuote: 'THAT ONE GOES ON THE FRIDGE.',
    special: 'livingSketch',
    throw: 'stillLife',
    finisher: 'rejected',
    intro: 'walk',
    brutality: { name: 'FINAL DRAFT', color: '#f4f0e6' },
    blockFx: 'sketchShield',
    ending: [
      'DAVID P. WON TERRAMANIA.',
      'HE DREW THE TROPHY HIMSELF.',
      'THEN HE DREW A BIGGER ONE.',
      'BOTH ARE HANGING IN THE GALLERY.',
      'EVERYTHING HE DREW CAME TRUE.',
    ],
    tauntLines: [
      'HOLD STILL. I AM SKETCHING YOU.',
      'YOU ARE A WORK IN PROGRESS.',
      'I DRAW BETTER THAN YOU FIGHT.',
      'THAT WAS ONLY THE OUTLINE.',
      'NEGATIVE SPACE. THAT IS YOU.',
      'LET ME ADD SOME SHADING.',
      'THERE IS AN ERASER ON THE END OF THE PENCIL FOR A REASON.',
      'THIS IS GOING IN THE SKETCHBOOK.',
      'I WILL DRAW YOU LOSING. IT IS EASY. I HAVE DONE IT TWICE.',
    ],
    rivalQuote: { escudero: 'ESCUDERO. YOUR PHOTOS, MY DRAWINGS. I WILL DRAW YOU LOSING.', loor: 'CHRIS. HOLD STILL. I WILL DRAW THE GLOVES.' },
    stats: {
      walkSpeed: 3.4,
      jumpPower: 10.2,
      damage: 1.08,
      damageReduction: 0.03,
      attackSpeed: 1.2,
    },
    moves: {   // every one is something he draws (the effects are above)
      light: { fx: 'pencilJab', fxSound: 'whoosh', startup: 4, active: 3, recovery: 7, damage: 3.6, pushback: 3, hitbox: { x: 10, y: 42, w: 42, h: 15 } },
      heavy: { fx: 'brushSwipe', fxSound: 'whoosh', startup: 10, active: 5, recovery: 16, damage: 12, hitstun: 26, blockstun: 14, pushback: 7, knockback: 10, hitstop: 10, hitbox: { x: 6, y: 34, w: 54, h: 30 } },
      airLight: { fx: 'doodleFlick', fxSound: 'whoosh', startup: 4, active: 6, recovery: 6, damage: 3.6, hitbox: { x: 4, y: 10, w: 34, h: 24 } },
      airHeavy: { fx: 'inkDrop', fxSound: 'stomp', startup: 8, active: 7, recovery: 10, damage: 10, knockback: 8, hitstop: 8, hitbox: { x: 4, y: -6, w: 44, h: 46 } },
      launcher: { fx: 'bookUpper', fxSound: 'paper', startup: 8, active: 5, recovery: 19, damage: 8, hitbox: { x: 4, y: 24, w: 34, h: 62 } },
      lowLight: { fx: 'smudge', fxSound: 'whoosh', startup: 4, active: 3, recovery: 7, damage: 3, hitbox: { x: 8, y: 22, w: 42, h: 20 } },
      lowHeavy: { fx: 'rollerSweep', fxSound: 'whoosh', startup: 10, active: 5, recovery: 19, damage: 9, hitbox: { x: 6, y: 0, w: 58, h: 13 } },
    },
    body: { scale: 1.0, bulk: 1.0, width: 28, height: 76, crouchHeight: 0.7 },
    idleFrames: 2,
    idleRate: 12,
    sprite: {
      type: 'pixel',
      scale: 1,
      limbScale: 4,
      crouchSquash: true,
      shoulder: [34, 17],
      footCol: 22,
      crouchDrop: 10,
      armThickness: 1.8,
      sleeveLength: 0.3,
      sleeveColor: 'col7',
      sleeveShade: 0,
      armBehind: true,
      handColor: 'col3',
      legColor: 'pantst',
      footColor: 'shoes4',
      hideWhenPosed: ['proparm0', 'proparm2', 'proparm3', 'proparm4', 'proparm5', 'proparm7', 'proparm8', 'proparmd', 'proparme', 'proparmh', 'proparmj', 'proparmk', 'proparmn', 'proparms'],      // the front fist becomes the punching arm
      legend: { 'A': 'colt', 'B': 'colg', 'C': 'colu', 'D': 'cold', 'E': 'colv', 'F': 'col1', 'G': 'col9', 'H': 'colp', 'I': 'colm', 'J': 'col8', 'K': 'coll', 'L': 'colq', 'M': 'colr', 'N': 'cola', 'O': 'col3', 'P': 'col5', 'Q': 'col2', 'R': 'col7', 'S': 'colo', 'T': 'colj', 'U': 'cols', 'V': 'cole', 'W': 'col0', 'X': 'coln', 'Y': 'colb', 'Z': 'colk', 'a': 'colh', 'b': 'col6', 'c': 'col4', 'd': 'proparmn', 'e': 'proparm3', 'f': 'proparm7', 'g': 'proparm4', 'h': 'proparms', 'i': 'proparm8', 'j': 'proparmj', 'k': 'proparm2', 'l': 'proparmk', 'm': 'proparm5', 'n': 'proparme', 'o': 'proparmd', 'p': 'proparmh', 'q': 'proparm0', 'r': 'colc', 's': 'pantse', 't': 'pants9', 'u': 'pantso', 'v': 'pantsu', 'w': 'pantsa', 'x': 'pantss', 'y': 'pantsf', 'z': 'pants0', '0': 'pantsc', '1': 'pants1', '2': 'pants2', '3': 'pantsv', '4': 'pantsr', '5': 'pantsk', '6': 'pantsq', '7': 'pantsg', '8': 'pantsj', '9': 'pantsm', '!': 'pants7', '@': 'pants8', '#': 'pantsl', '$': 'pantst', '%': 'pantsh', '^': 'pants4', '&': 'pantsn', '*': 'pantsd', '+': 'pantsp', '=': 'shoese', '~': 'shoesl', '?': 'shoest', '<': 'shoesp', '>': 'shoesd', '(': 'shoesh', ')': 'shoes8', '[': 'shoes7', ']': 'shoesn', '{': 'shoesg', '}': 'shoeso', ':': 'shoesa', ';': 'shoes4', ',': 'shoes6', '|': 'shoesr', '-': 'shoesk' },
      palette: {
        col0: '#64392a',
        col1: '#38221b',
        col2: '#7c442f',
        col3: '#e08a5b',
        col4: '#e2b899',
        col5: '#cc7e52',
        col6: '#ead0ba',
        col7: '#d2a589',
        col8: '#a27f6a',
        col9: '#070403',
        cola: '#201714',
        colb: '#f0f0eb',
        colc: '#994329',
        cold: '#6d5346',
        cole: '#5a433a',
        colg: '#493631',
        colh: '#8f6f5d',
        colj: '#955a3b',
        colk: '#7f6152',
        coll: '#2e221f',
        colm: '#422921',
        coln: '#bb977f',
        colo: '#372824',
        colp: '#130d0b',
        colq: '#1a1210',
        colr: '#271c1a',
        cols: '#b16b45',
        colt: '#3f2f2b',
        colu: '#4c3026',
        colv: '#301e18',
        pants0: '#64392a',
        pants1: '#38221b',
        pants2: '#7c442f',
        pants4: '#e2b899',
        pants7: '#d2a589',
        pants8: '#a27f6a',
        pants9: '#070403',
        pantsa: '#201714',
        pantsc: '#994329',
        pantsd: '#6d5346',
        pantse: '#5a433a',
        pantsf: '#d38934',
        pantsg: '#493631',
        pantsh: '#8f6f5d',
        pantsj: '#955a3b',
        pantsk: '#7f6152',
        pantsl: '#2e221f',
        pantsm: '#422921',
        pantsn: '#bb977f',
        pantso: '#372824',
        pantsp: '#130d0b',
        pantsq: '#1a1210',
        pantsr: '#271c1a',
        pantss: '#b16b45',
        pantst: '#3f2f2b',
        pantsu: '#4c3026',
        pantsv: '#301e18',
        proparm0: '#64392a',
        proparm2: '#7c442f',
        proparm3: '#e08a5b',
        proparm4: '#e2b899',
        proparm5: '#cc7e52',
        proparm7: '#d2a589',
        proparm8: '#a27f6a',
        proparmd: '#6d5346',
        proparme: '#5a433a',
        proparmh: '#8f6f5d',
        proparmj: '#955a3b',
        proparmk: '#7f6152',
        proparmn: '#bb977f',
        proparms: '#b16b45',
        shoes4: '#e2b899',
        shoes6: '#ead0ba',
        shoes7: '#d2a589',
        shoes8: '#a27f6a',
        shoesa: '#201714',
        shoesd: '#6d5346',
        shoese: '#5a433a',
        shoesg: '#493631',
        shoesh: '#8f6f5d',
        shoesk: '#7f6152',
        shoesl: '#2e221f',
        shoesn: '#bb977f',
        shoeso: '#372824',
        shoesp: '#130d0b',
        shoesr: '#271c1a',
        shoest: '#3f2f2b',
      },
      grid: [
        '....................ABBCBDBB...................',
        '....................BEFGFHIJ...................',
        '...................KFHLGGMCND..................',
        '..................CHFOOOPENHID.................',
        '..................MLQOOROEGHES.................',
        '..................LLTOOOUQGGNV.................',
        '..................HWQTTIIUELLDL................',
        '..................NPPGPWTGWGGF.................',
        '...................OUOOOOOFTNL.................',
        '...................UUTPPOUUULV.................',
        '...................THXYYYHT.L..................',
        '..................SVPHHHHU.S...................',
        '.................BJUUOPWUZN....................',
        '.................MJVFLWOOaK....................',
        '...............DCNMMABTOUHAZPP.................',
        '.............bcXCKNSVVTOWHVTOPO................',
        '...........cXRRcRCLNNNTPCNKTOPPd...............',
        '..........ccccRcRDNLHHUOILGaPOOef..............',
        '.........JZDDVZJXRCNZTPOQVLVaWOeeg.............',
        '........KMKAVaJPPUFCcRXXcXSFJJQhei.............',
        '........KKBVDBKMMPCIXRcDccZEJJJjhedd...........',
        '........VMVVDaDKMUCCVcRDacZIZJZkeeei...........',
        '........cKKDZVDMMVBIWccJccJCaJDlmeefd..........',
        '........XAMDaaVKMMTIWcccccJCJRZnhemeoi.........',
        '.......RcVMMZaaMMPPFFAVDDVSICRVnjeempf.........',
        '......RaaaNMMDaSPWTPWCKBWIAFCJJljheefi.........',
        '......XXZRDSVVZDOOOUTSSCWKCVBa.oiqjidi.........',
        '......RXcZPUCICUOOPOUMCIKBZWIJ..opifdd.........',
        '......aXROOOOOOOOOUPTMMBADCIFa...DaaR..........',
        '......XXaUOOOOPOOOPPFAEFBWSFKJ.................',
        '......JaROPPUTQELMGDMBWESIIMBZ.................',
        '.......ZJCQQQ.LNNMMDBIrCWKCCBB.................',
        '........aaaa...DMNHNIMaEQEMNLK.................',
        '................MNLLNEBNJIEWIZ.................',
        '...............FIMFSBDMIZVDEEM.................',
        '..............IGMNDDDcNQrWCFISD................',
        '.............stuvwxyz010023w4vu5...............',
        '.............6374sx89299sv9113v7...............',
        '.............47uw!@61#u97$u9vw$$%..............',
        '..............745^&w17uvz998w#u1s..............',
        '.............*7#!^!7w3*v92s19v#97%.............',
        '.............*$u!!^s7w9$2z91vv4v7s%............',
        '............5$75!&^5494u2v9vzu#s$u77...........',
        '...........*7$u&!@&%v13433w34$#2u$ws%..........',
        '...........77w7!!8^@63++6#w$#v9s$7###..........',
        '..........744474@@^!690###vuu2vs$v7#s5.........',
        '..........7$u$715%^^uw9277vwuzsv7v7uu7*........',
        '.........577$77u&@75z#3vz7#49vz$7$$7$7$........',
        '.........#$$u779@^#40$#1$94$z22v$2z7uus%.......',
        '........*#7u$779#6v$$zv#u9uvz822zzz7$6#7.......',
        '........s$#u7s7vuuu9uv2vuuvzv0*.6u7777$5.......',
        '........uww#777$ww.99vzzvv$z..6wuu77777s.......',
        '........*$777777$46+..........66u$$7*s7s5......',
        '........77777s77##ww..........#+6$$$8*7us5.....',
        '.......5s77s577uu$#............46w$$$7$7#*.....',
        '.......s$u7*57$$$$7.............uw$$#$$7u7.....',
        '.......##777s7$$4#...............u$$#$$7*u.....',
        '.......ws$z$7$744................u$u#$$7$5.....',
        '......#7$$$$$$77.................7$1#$77$$5....',
        '......77$$7v$$$*.................744u7$7$4*....',
        '......s$$v$zu$$5.................$#w$$$$#ws....',
        '.....*$$$$7$4u$*..................u4$$$7#4.....',
        '....suuv$u77w#$....................s$$$$su.....',
        '....$3ww#77$w47....................*$uw4$*5....',
        '.....1w477$7w7.....................7$www6u5....',
        '.....w#7$$$7#......................uw444wu7s...',
        '.....77$#4$74......................w6w64$$u....',
        '....5$wwww4$.......................$$$$$#u7....',
        '...*$$$uw4wu*.......................6+4uw4*....',
        '...u+64$$#4#$.......................$#w#$$s....',
        '...$#444$$$$.........................w#u7%%....',
        '...s###$$4u..........................46%@%&%...',
        '...=~??<~?>.........................()==[[(]>..',
        '...>]({}:}..........................))({)=[;;,.',
        '..)]])({|=............................((({{=-=-',
        '..-])[=-)...............................);;;;;;',
        '.];[(]>>]......................................',
        ');;]-=)[]......................................',
        '(--=([>........................................',
        ')[;;;].........................................',
      ],
      poses: {
        idle: [{}, { head: [0, -1], torso: [0, -1] }],
        block: [{ head: [-2, 2], torso: [-1, 1] }],
        crouchBlock: [{ crouch: true, head: [-2, 1], torso: [-1, 0] }],
        light: [{ arm: 'forwardShort', head: [1, 0] }, { arm: 'forward', head: [2, 0], torso: [1, 0] }, { arm: 'forwardShort', head: [1, 0] }],
        heavy: [{ arm: 'back', head: [-2, 0], torso: [-2, 0] }, { arm: 'forward', head: [3, 1], torso: [3, 1] }, { arm: 'forwardShort', head: [1, 0], torso: [1, 0] }],
        special: [{ arm: 'back', head: [-2, 1], torso: [-1, 1] }, { arm: 'forward', head: [2, 0], torso: [2, 0] }, { arm: 'forwardShort', head: [1, 0] }],
      },
    },
  };
  RF.CHARACTERS.push(DEF);
  Object.assign(DEF, { commands: { qcf: 'paintSplatter', qcb: 'quickSketch' }, commandsHeavy: { qcf: 'smudgeDash', qcb: 'rubOut' }, taunt: 'LET ME DRAW THAT.', voicePitch: 1.2 });
})();
