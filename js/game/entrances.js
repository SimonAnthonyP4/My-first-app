// CINEMATIC ENTRANCES. Before round 1 each fighter gets three beats, with the screen letterboxed and the
// camera pushed in on them:
//   1. THE ARRIVAL   how they get here (game/intros.js, plus the new ones in this file)
//   2. THE FLOURISH  they show what they can do: an effect built from their own abilities (FX below)
//   3. THE LINE      what they say, typed out under their name
// A rival still gets their rival line instead. LIGHT / ENTER skips, as before.
(function () {
  const D = 150, F0 = 58, F1 = 104;          // frames per entrance; the flourish runs F0..F1 and fades after
  RF.ENTRANCE_DURATION = D; RF.ENTRANCE_ARRIVE = 56;
  const W = () => RF.CONFIG.WIDTH, H = () => RF.CONFIG.HEIGHT;
  const T = (...a) => RF.font.drawText(...a);
  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const ring = (c, x, y, rx, ry, col, w) => { if (rx <= 0 || ry <= 0) return; c.strokeStyle = col; c.lineWidth = w || 2; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.stroke(); c.lineWidth = 1; };
  const rays = (c, x, y, n, r0, r1, col, w, rot) => { c.strokeStyle = col; c.lineWidth = w || 1.5; for (let i = 0; i < n; i++) { const a = (rot || 0) + i * 6.283 / n; c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke(); } c.lineWidth = 1; };
  const star = (c, x, y, r, col) => { c.strokeStyle = col || '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke(); c.lineWidth = 1; R(c, '#fff', x - 1, y - 1, 2, 2); };
  const G = (c, s, x, y, col, scale) => T(c, s, Math.round(x), Math.round(y), { align: 'center', color: col, outline: '#000', scale: scale || 1 });
  const RB = ['#e83034', '#fa8c1e', '#fade32', '#32be54', '#3470e8', '#9048cc'];
  const sil = (f, c, x, y, col) => f.sprite.draw(c, 'idle', 0, x, y, f.facing, col);   // the fighter as a flat silhouette

  // ================================================================ the new arrivals
  const walkIn = (f, t, until, scene, dust) => { const from = f.homeX - f.facing * 150, u = Math.min(1, t / until); f.x = from + (f.homeX - from) * u; f.state = u < 1 ? 'walk' : 'idle'; f.walkTime = t; if (dust && u < 1 && t % dust === 0) scene.effects.spawn('dust', f.x - f.facing * 8, 1); };
  Object.assign(RF.INTROS, {
    // JAVAN: sprints out of the tunnel through green smoke
    tailgate: { update(f, t, scene) { if (t === 0) RF.audio.sfx('applause'); walkIn(f, t, 26, scene, 4); },
      draw(f, c, fy, t) { if (t > 40) return; for (let i = 0; i < 14; i++) { const x = f.homeX - f.facing * (150 - i * 9) + Math.sin(t / 5 + i) * 4; c.fillStyle = `rgba(20,${110 + (i % 3) * 30},70,${0.5 * (1 - t / 40)})`; c.beginPath(); c.arc(x, fy - 10 - (i % 4) * 12 - t * 0.4, 8 + (i % 3) * 3, 0, 7); c.fill(); } } },
    // TRUMP: a red carpet and a wall of flashbulbs
    pressWalk: { back: true, update(f, t, scene) { if (t === 0) RF.audio.sfx('fanfare'); walkIn(f, t, 46, scene); if (t < 46 && t % 7 === 0) scene.flash = Math.max(scene.flash, 2); },
      draw(f, c, fy, t) { const edge = f.facing > 0 ? 0 : W(), end = f.homeX + f.facing * 20; R(c, '#8a0a14', Math.min(edge, end), fy - 2, Math.abs(end - edge), 5); R(c, '#e8b420', Math.min(edge, end), fy - 2, Math.abs(end - edge), 1);
        if (t < 50) for (let i = 0; i < 5; i++) if ((t + i * 3) % 9 < 2) star(c, f.x + (hash(i + Math.floor(t / 9) * 5) - 0.5) * 150, fy - 20 - hash(i * 3 + Math.floor(t / 9)) * 70, 5); } },
    // URBANIK: rings of thought close on one spot, and he is standing in it
    mindIn: { update(f, t, scene) { f.hidden = t < 30; if (t === 2) RF.audio.sfx('arcane'); if (t === 30) { scene.flash = 4; f.y = 16; } if (t > 30 && f.y > 0) { f.y = Math.max(0, f.y - 0.7); f.state = 'idle'; } },
      draw(f, c, fy, t) { if (t > 44) return; const y = fy - f.body.height * 0.55; for (let i = 0; i < 4; i++) { const r = Math.max(2, 90 - t * 3 + i * 16); c.globalAlpha = Math.max(0, Math.min(1, t / 8) * (1 - Math.max(0, t - 30) / 14)); ring(c, f.homeX, y, r, r * 0.8, i % 2 ? '#b070ff' : '#40e8d0', 2); } c.globalAlpha = 1; } },
    // CHRIS LOOR: the ring walk, under his own spotlight
    ringWalk: { back: true, update(f, t, scene) { if (t === 0) RF.audio.sfx('bell'); walkIn(f, t, 42, scene, 9); },
      draw(f, c, fy, t) { if (t > 70) return; c.globalAlpha = 0.2 * Math.min(1, t / 6) * (1 - Math.max(0, t - 54) / 16); c.fillStyle = '#fff6d0'; c.beginPath(); c.moveTo(f.x - 8, -4); c.lineTo(f.x + 8, -4); c.lineTo(f.x + 34, fy + 3); c.lineTo(f.x - 34, fy + 3); c.fill(); c.globalAlpha *= 1.6; c.beginPath(); c.ellipse(f.x, fy + 2, 34, 5, 0, 0, 7); c.fill(); c.globalAlpha = 1; } },
    // OLU: a door of light opens in the air and he steps through it
    lightDoor: { back: true, update(f, t, scene) { f.hidden = t < 22; if (t === 2) RF.audio.sfx('arcane'); if (t === 22) { scene.flash = 5; RF.audio.sfx('perfect'); } if (t >= 22) { const u = Math.min(1, (t - 22) / 16); f.x = f.homeX - f.facing * 12 * (1 - u); f.state = u < 1 ? 'walk' : 'idle'; f.walkTime = t; } },
      draw(f, c, fy, t) { if (t > 50) return; const w = t < 22 ? t * 0.9 : Math.max(0, 20 - (t - 22) * 0.75), x = f.homeX - f.facing * 12, top = fy - f.body.height - 16; if (w <= 0) return;
        c.fillStyle = 'rgba(255,215,90,0.25)'; c.fillRect(x - w - 6, top - 4, (w + 6) * 2, fy - top + 6); c.fillStyle = '#ffd75a'; c.fillRect(x - w, top, w * 2, fy - top + 2); c.fillStyle = '#ffffff'; c.fillRect(x - w * 0.6, top + 2, w * 1.2, fy - top - 2); rays(c, x, (top + fy) / 2, 10, w + 6, w + 16 + (t % 6), '#ffe8a0', 1, t / 20); } },
    // RILEY: the orb comes down first; he is inside it
    orbIn: { update(f, t, scene) { f.hidden = t < 36; if (t === 2) RF.audio.sfx('arcane'); if (t === 36) { scene.flash = 6; scene.shake = 5; RF.audio.sfx('perfect'); } },
      draw(f, c, fy, t) { if (t > 50) return; const my = fy - f.body.height * 0.5, y = t < 28 ? -20 + (my + 20) * (1 - Math.pow(1 - t / 28, 2)) : my, r = t < 28 ? 9 : 9 + (t - 28) * 3.4, a = t < 36 ? 1 : Math.max(0, 1 - (t - 36) / 14);
        c.globalAlpha = a; const g = c.createRadialGradient(f.homeX, y, r * 0.2, f.homeX, y, r); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(255,215,90,0.6)'); g.addColorStop(1, 'rgba(160,110,255,0.1)'); c.fillStyle = g; c.beginPath(); c.arc(f.homeX, y, r, 0, 7); c.fill();
        for (let i = 0; i < 3; i++) { c.strokeStyle = '#ffd75a'; c.beginPath(); c.ellipse(f.homeX, y, r, r * 0.3, t / 9 + i * 1.05, 0, 7); c.stroke(); } c.globalAlpha = 1; } },
    // ESCUDERO: three camera flashes; in each one he is a step closer, and on the third he is there
    flashIn: { update(f, t, scene) { f.hidden = t < 30; if (t === 8 || t === 18 || t === 30) { scene.flash = 7; RF.audio.sfx(t === 30 ? 'perfect' : 'paper'); } },
      draw(f, c, fy, t) { for (const [t0, off] of [[8, 60], [18, 30]]) if (t >= t0 && t < t0 + 6) { c.globalAlpha = 1 - (t - t0) / 6; sil(f, c, f.homeX - f.facing * off, fy, '#ffffff'); c.globalAlpha = 1; }
        if (t >= 30 && t < 46) { c.globalAlpha = 1 - (t - 30) / 16; c.lineWidth = 3; for (let s = 0; s < 6; s++) { c.strokeStyle = RB[s]; c.beginPath(); c.arc(f.homeX, fy, 30 + (t - 30) * 4 + s * 3, Math.PI, 0); c.stroke(); } c.lineWidth = 1; c.globalAlpha = 1; } } },
    // DAVID P.: a pencil draws him, bottom to top, and then he steps off the page
    drawnIn: { update(f, t, scene) { f.hidden = t < 40; if (t % 9 === 0 && t < 40) RF.audio.sfx('scribble'); if (t === 40) { scene.flash = 3; RF.audio.sfx('paper'); } },
      draw(f, c, fy, t) { if (t >= 40) return; const u = t / 38, h = f.body.height + 6, y = fy - h * u;
        c.save(); c.beginPath(); c.rect(f.homeX - 40, y, 80, h * u + 2); c.clip(); sil(f, c, f.homeX, fy, '#f4f0e6'); c.globalAlpha = 0.5; sil(f, c, f.homeX + 1, fy, '#55555f'); c.restore(); c.globalAlpha = 1;
        const px = f.homeX + Math.sin(t * 0.9) * 16; c.save(); c.translate(px, y); c.rotate(-0.9); R(c, '#111', -2, -16, 5, 18); R(c, '#f2c21e', -1, -15, 3, 13); R(c, '#e8a090', -1, -17, 3, 3); R(c, '#333', -1, -2, 3, 3); c.restore(); } },
    // THE PROCTOR: a clock opens in the air, runs to midnight, and he steps out of it
    clockIn: { back: true, update(f, t, scene) { f.hidden = t < 30; if (t === 2) RF.audio.sfx('arcane'); if (t === 30) { scene.flash = 4; RF.audio.sfx('bell'); } },
      draw(f, c, fy, t) { if (t > 46) return; const y = fy - f.body.height * 0.55, r = t < 12 ? t * 2.8 : t < 30 ? 34 : Math.max(0, 34 - (t - 30) * 2.2); if (r <= 1) return;
        c.fillStyle = '#0a0810'; c.beginPath(); c.arc(f.homeX, y, r + 2, 0, 7); c.fill(); c.fillStyle = '#f4ecd0'; c.beginPath(); c.arc(f.homeX, y, r, 0, 7); c.fill();
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R(c, '#0a0810', f.homeX + Math.sin(a) * (r - 4) - 1, y - Math.cos(a) * (r - 4) - 1, 2, 2); }
        const sp = t < 30 ? t * t * 0.02 : 0; c.save(); c.translate(f.homeX, y); c.rotate(sp); R(c, '#0a0810', -1, -r + 5, 2, r - 5); c.rotate(sp * 0.2); R(c, '#c8202c', -1, -r + 9, 2, r - 9); c.restore(); } },
    // THE BELL RINGER: comes down like the bell itself
    bellDrop: { update(f, t, scene) { if (t === 0) { f.y = 240; f.vy = 0; } if (f.y > 0) { f.vy -= 1.1; f.y = Math.max(0, f.y + f.vy); f.state = 'jump'; if (f.y === 0) { scene.shake = 16; scene.flash = 3; RF.audio.sfx('bell'); RF.audio.sfx('stomp'); for (let i = -3; i <= 3; i++) scene.effects.spawn('dust', f.x + i * 9, 1); f.landT = t; } } else f.state = 'idle'; },
      draw(f, c, fy, t) { const a = t - (f.landT || 999); if (a < 0 || a > 22) return; c.globalAlpha = 1 - a / 22; for (let i = 0; i < 3; i++) ring(c, f.x, fy, 12 + a * 5 + i * 10, 3 + a * 0.6 + i * 2, i % 2 ? '#fff6d0' : '#e8b030', 2); c.globalAlpha = 1; } },
    // THE ERASER: was rubbed out; the board is wiped and there he is
    unErase: { update(f, t, scene) { f.hidden = t < 34; if (t % 8 === 0 && t < 34) RF.audio.sfx('paper'); },
      draw(f, c, fy, t) { if (t >= 40) return; const u = Math.min(1, t / 32), wdt = 60, x0 = f.homeX - wdt / 2;
        c.save(); c.beginPath(); c.rect(x0, fy - f.body.height - 20, wdt * u, f.body.height + 24); c.clip(); sil(f, c, f.homeX, fy, '#f4f0e6'); c.restore();
        const ex = x0 + wdt * u, ey = fy - f.body.height * (0.5 + 0.4 * Math.sin(t * 0.7)); R(c, '#111', ex - 5, ey - 7, 11, 14); R(c, '#6a4a2a', ex - 4, ey - 6, 9, 5); R(c, '#e8e4d8', ex - 4, ey - 1, 9, 5);
        for (let i = 0; i < 8; i++) R(c, '#e8e4d8', ex - 8 + hash(i + t) * 14, ey - 10 + hash(i * 3 + t) * 30, 1, 1); } },
  });
  const ARRIVE = { javan: 'tailgate', trump: 'pressWalk', urbanik: 'mindIn', loor: 'ringWalk', olu: 'lightDoor', riley: 'orbIn', escudero: 'flashIn', david: 'drawnIn', proctor: 'clockIn', ringer: 'bellDrop', eraser: 'unErase' };
  for (const id in ARRIVE) { const d = RF.getCharacter(id); if (d) d.intro = ARRIVE[id]; }

  // ================================================================ the flourishes
  // fx(f, c, fy, k, L): c = canvas, fy = the floor under them, k = { u: 0..1 through the flourish, t: frames since it began,
  // a: alpha (fades out after), fr: scene frame }, L = 'back' (behind the fighter) or 'front'.
  const geo = (f, fy) => ({ x: f.x, h: f.body.height, top: fy - f.y - f.body.height, mid: fy - f.y - f.body.height * 0.5, d: f.facing });
  const orbit = (n, rx, ry, ang, fn) => { for (let i = 0; i < n; i++) { const a = ang + i * 6.283 / n; fn(Math.cos(a) * rx, Math.sin(a) * ry, i, a); } };
  const FX = {
    bruiser(f, c, fy, k, L) { if (L !== 'front') return; const { x } = geo(f, fy);          // the floor cracks, trays jump
      for (let i = -3; i <= 3; i++) { if (!i) continue; const len = Math.min(1, k.u * 1.8) * (16 + Math.abs(i) * 10); R(c, '#140e08', i > 0 ? x + 6 : x - 6 - len, fy - 1 + (Math.abs(i) % 2) * 2, len, 2); }
      for (let i = 0; i < 4; i++) { c.save(); c.translate(x + (i - 1.5) * 20, fy - 8 - Math.sin(Math.min(1, k.u) * Math.PI) * (36 + i * 9)); c.rotate(k.t * 0.3 + i * 1.7); R(c, '#111', -8, -3, 16, 6); R(c, '#c8c8d0', -7, -2, 14, 4); c.restore(); } },
    viper(f, c, fy, k, L) { if (L !== 'front') return; const { x, mid } = geo(f, fy);       // a ring of throwing stars, venom dripping
      orbit(5, 12 + k.u * 26, 8 + k.u * 22, k.t * 0.25, (dx, dy) => { c.save(); c.translate(x + dx, mid + dy); c.rotate(k.t * 0.6); R(c, '#111', -5, -2, 10, 4); R(c, '#111', -2, -5, 4, 10); R(c, '#c8d0c8', -4, -1, 8, 2); R(c, '#c8d0c8', -1, -4, 2, 8); c.restore(); });
      for (let i = 0; i < 6; i++) R(c, '#7cff4a', x + (hash(i) - 0.5) * 30, mid - 6 + ((k.t * 2.4 + i * 9) % 44), 2, 4); },
    weissenberg(f, c, fy, k, L) { if (L !== 'front' || !RF.electric) return; const { x, mid } = geo(f, fy), el = RF.electric, seed = Math.floor(k.fr / 2) * 13.7;   // lightning comes to his hands
      el.glow(c, x, mid, 20 + k.u * 10, 0.5 * k.a); el.crackle(c, x, mid, 24, seed, 6);
      if (k.u < 0.6) { el.bolt(c, [x - 30, -4], [x - 6, mid], { seed, amp: 9, thick: 1.2, forks: 3 }); el.bolt(c, [x + 34, -4], [x + 6, mid], { seed: seed + 40, amp: 9, thick: 1, forks: 3 }); } },
    jauregui(f, c, fy, k, L) { const { x, mid } = geo(f, fy);                               // symbols orbit, a protractor sweeps
      if (L === 'back') { c.strokeStyle = '#f0f0e0'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, mid + 8, 38, Math.PI, Math.PI + Math.PI * Math.min(1, k.u * 1.4)); c.stroke(); for (let i = 0; i <= 12 * Math.min(1, k.u * 1.4); i++) { const a = Math.PI + i * Math.PI / 12; R(c, '#f0f0e0', x + Math.cos(a) * 34, mid + 8 + Math.sin(a) * 34, 2, 2); } c.lineWidth = 1; return; }
      orbit(6, 30, 12, k.t * 0.12, (dx, dy, i) => G(c, ['Σ', 'π', '√', '∞', 'Δ', '∫'][i], x + dx, mid - 10 + dy, i % 2 ? '#fff2a0' : '#ffffff')); },
    astuto(f, c, fy, k, L) { if (L !== 'front') return; const { x, top } = geo(f, fy);      // the gavel comes down; order rings out
      const hit = Math.min(1, k.u * 3); c.save(); c.translate(x + f.facing * 18, top + 20); c.rotate(f.facing * (-1.2 + hit * 1.5)); R(c, '#111', -2, -22, 5, 24); R(c, '#8a5a2a', -1, -21, 3, 22); R(c, '#111', -8, -29, 17, 10); R(c, '#b07a3a', -7, -28, 15, 8); c.restore();
      if (k.u > 0.33) for (let i = 0; i < 3; i++) { const r = (k.u - 0.33) * 90 - i * 14; if (r > 0) ring(c, x + f.facing * 22, fy, r, r * 0.22, i % 2 ? '#fff6d0' : '#e8b420', 2); } },
    escobedo(f, c, fy, k, L) { if (L !== 'front') return; const { x, mid, top } = geo(f, fy);   // a hex shield boots up, cell by cell
      const cells = [[0, 0], [0, -16], [0, 16], [10, -8], [10, 8], [-10, -8], [-10, 8], [0, -32], [0, 32]]; c.lineWidth = 1.5;
      cells.forEach(([dx, dy], i) => { if (k.u * 12 < i) return; c.strokeStyle = (i + Math.floor(k.t / 4)) % 3 ? '#40d8ff' : '#ffffff'; c.beginPath(); for (let s = 0; s <= 6; s++) { const a = s * Math.PI / 3; const px = x + f.facing * (22 + dx) + Math.cos(a) * 7, py = mid + dy + Math.sin(a) * 8; s ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); });
      c.lineWidth = 1; R(c, 'rgba(64,216,255,0.6)', x - 20, top + ((k.t * 3) % (fy - top)), 40, 1); },
    landa(f, c, fy, k, L) { const { x, h } = geo(f, fy);                                     // two serpents wind up around her
      for (let s = 0; s < 2; s++) for (let i = 0; i < Math.min(1, k.u * 1.3) * 30; i++) { const y = fy - i * (h / 28), ph = i * 0.42 + k.t * 0.2 + s * Math.PI, z = Math.cos(ph); if ((z > 0) !== (L === 'front')) continue; R(c, '#0a1e0f', x + Math.sin(ph) * 15 - 3, y - 3, 6, 5); R(c, i % 2 ? '#4aa86a' : '#b040ff', x + Math.sin(ph) * 15 - 2, y - 2, 4, 3); } },
    dabalsa(f, c, fy, k, L) { if (L !== 'back') return; const { x, top } = geo(f, fy);       // the curtains part and the spotlight finds him
      const open = Math.min(1, k.u * 1.5), ht = fy - top + 24; c.fillStyle = 'rgba(255,246,208,0.16)'; c.beginPath(); c.moveTo(x - 6, top - 60); c.lineTo(x + 6, top - 60); c.lineTo(x + 36, fy + 2); c.lineTo(x - 36, fy + 2); c.fill();
      for (const s of [-1, 1]) { const w = 56 * (1 - open) + 10; R(c, '#5a0a12', s < 0 ? x - 66 : x + 66 - w, top - 22, w, ht); for (let i = 0; i < w; i += 6) R(c, '#8a1420', (s < 0 ? x - 66 : x + 66 - w) + i, top - 22, 2, ht); }
      R(c, '#e8b420', x - 66, top - 26, 132, 5); },
    sirven(f, c, fy, k, L) { if (L !== 'front') return; const { x, top, d } = geo(f, fy);    // THIS IS YOUR PRINCIPAL SPEAKING
      c.lineWidth = 2; for (let i = 0; i < 4; i++) { const r = ((k.t * 2.2 + i * 14) % 56) + 6; c.globalAlpha = k.a * (1 - r / 62); c.strokeStyle = i % 2 ? '#ffd030' : '#fff'; c.beginPath(); c.arc(x + d * 8, top + 16, r, d > 0 ? -0.7 : Math.PI - 0.7, d > 0 ? 0.7 : Math.PI + 0.7); c.stroke(); }
      c.globalAlpha = k.a; c.lineWidth = 1; for (let i = 0; i < 3; i++) if ((k.t + i * 5) % 12 < 6) star(c, x - 10 + i * 10, top - 6 - (i % 2) * 4, 3, '#ffd030'); },
    holbrook(f, c, fy, k, L) { const { x, mid, top } = geo(f, fy);                           // the globe turns round him
      if (L === 'back') { const r = 34 * Math.min(1, k.u * 2); c.strokeStyle = '#80c0ff'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x, mid, Math.max(0.5, Math.abs(Math.cos(k.t * 0.06 + i * 0.8)) * r), r, 0, 0, 7); c.stroke(); } for (const yy of [-0.5, 0, 0.5]) { c.beginPath(); c.ellipse(x, mid + yy * r, r * Math.sqrt(1 - yy * yy), 4, 0, 0, 7); c.stroke(); } return; }
      const py = top - 14 + Math.abs(Math.sin(k.t / 5)) * -5; c.fillStyle = '#e02020'; c.beginPath(); c.arc(x, py, 4, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 3, py + 2); c.lineTo(x + 3, py + 2); c.lineTo(x, py + 9); c.fill(); R(c, '#fff', x - 1, py - 1, 2, 2); },
    simon(f, c, fy, k, L) { const { x, h } = geo(f, fy);                                     // the gold of the Sak Yant rises off him
      if (L === 'back') { ring(c, x, fy, 26 * Math.min(1, k.u * 2), 5, '#ffd060', 2); return; }
      for (let i = 0; i < 16; i++) { const yy = (k.t * 2.2 + i * 11) % (h + 10), s = i % 2 ? 1 : -1; c.globalAlpha = k.a * (1 - yy / (h + 10)); R(c, i % 3 ? '#ffd060' : '#fff6c0', x + s * (10 + (i % 4) * 3) + Math.sin(yy / 7 + i) * 3, fy - yy, 2, 4); } c.globalAlpha = k.a; },
    anthony(f, c, fy, k, L) { const { x, mid } = geo(f, fy);                                 // the circle opens under him; the batch orbits
      if (L === 'back') { const r = 34 * Math.min(1, k.u * 2); ring(c, x, fy, r, r * 0.26, '#ff70a8', 2); c.strokeStyle = '#ffe0ea'; for (let s = 0; s < 2; s++) { c.beginPath(); for (let i = 0; i <= 3; i++) { const a = k.t * 0.05 + s * Math.PI / 3 + i * 2.094; i ? c.lineTo(x + Math.cos(a) * r, fy + Math.sin(a) * r * 0.26) : c.moveTo(x + Math.cos(a) * r, fy + Math.sin(a) * r * 0.26); } c.stroke(); } return; }
      orbit(3, 28, 10, k.t * 0.14, (dx, dy) => { R(c, '#111', x + dx - 7, mid + dy - 3, 14, 7); R(c, '#e8b420', x + dx - 6, mid + dy - 2, 12, 5); R(c, '#1a1a22', x + dx - 2, mid + dy - 2, 4, 5); }); },
    chris(f, c, fy, k, L) { if (L !== 'front') return; const { x, top } = geo(f, fy);        // it rains money
      for (let i = 0; i < 16; i++) { const px = x + (hash(i) - 0.5) * 110, py = top - 30 + ((k.t * (1.6 + hash(i + 3)) + hash(i + 7) * 120) % (fy - top + 30)); c.save(); c.translate(px, py); c.rotate(Math.sin(k.t / 6 + i) * 0.6); R(c, '#0a3a1a', -5, -3, 10, 6); R(c, '#3ad070', -4, -2, 8, 4); R(c, '#c8ffd8', -1, -1, 2, 2); c.restore(); }
      for (let i = 0; i < 3; i++) if ((k.t + i * 6) % 14 < 5) star(c, x + (i - 1) * 16, top + 10 + i * 14, 3, '#ffd040'); },
    ruano(f, c, fy, k, L) { if (L !== 'back') return; const { x, top } = geo(f, fy);         // wings of light, and the window behind her
      const sp = Math.min(1, k.u * 1.6); ring(c, x, top - 4, 9, 3, '#fff2c0', 2);
      for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { const a = -1.35 + i * 0.26 * sp, len = 30 + (i % 3) * 8; c.strokeStyle = i % 2 ? '#ffffff' : '#fff2c0'; c.lineWidth = 3; c.globalAlpha = k.a * 0.85; c.beginPath(); c.moveTo(x + s * 5, top + 22); c.lineTo(x + s * (5 + Math.cos(a) * len), top + 22 + Math.sin(a) * len); c.stroke(); } c.lineWidth = 1; c.globalAlpha = k.a; },
    tamayo(f, c, fy, k, L) { if (L !== 'front') return; const { x, mid, top } = geo(f, fy);  // a filibuster's worth of paper
      orbit(8, 30 + Math.sin(k.t / 9) * 4, 26, k.t * 0.1, (dx, dy, i) => { c.save(); c.translate(x + dx, mid + dy * (i % 2 ? 1 : 0.6)); c.rotate(k.t * 0.1 + i); R(c, '#111', -5, -6, 10, 12); R(c, '#f4f0e6', -4, -5, 8, 10); R(c, '#8a8a96', -3, -3, 6, 1); R(c, '#8a8a96', -3, 0, 5, 1); c.restore(); });
      if (k.u > 0.4 && (k.t % 16) < 11) G(c, 'HA!', x + f.facing * 22, top - 8, '#ff4040'); },
    nicholas(f, c, fy, k, L) { if (L !== 'front') return; const { x, mid, d } = geo(f, fy);  // hands too fast to see
      c.globalAlpha = k.a * Math.max(0, 1 - k.u * 2); rays(c, x, mid, 14, 20, 34, '#ffd030', 2, k.t / 8); c.globalAlpha = k.a;
      for (let i = 0; i < 7; i++) if ((k.t + i * 2) % 6 < 3) { const yy = mid - 18 + hash(i + Math.floor(k.t / 3)) * 30; R(c, '#ffe27a', x + d * 14, yy, d * (16 + hash(i * 3 + Math.floor(k.t / 3)) * 22), 2); R(c, '#ffffff', x + d * (30 + hash(i * 3 + Math.floor(k.t / 3)) * 22), yy - 1, 4, 4); } },
    tyler(f, c, fy, k, L) { if (L !== 'front') return; const { x, d } = geo(f, fy);          // one off the tee
      const u = Math.min(1, k.u * 1.4), bx = x + d * (10 + u * 120), by = fy - 4 - Math.sin(u * Math.PI * 0.8) * 90; for (let i = 1; i < 8; i++) { const v = Math.max(0, u - i * 0.03); R(c, `rgba(255,255,255,${0.6 - i * 0.07})`, x + d * (10 + v * 120), fy - 4 - Math.sin(v * Math.PI * 0.8) * 90, 2, 2); }
      c.fillStyle = '#111'; c.beginPath(); c.arc(bx, by, 3.5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(bx, by, 2.5, 0, 7); c.fill();
      for (let i = 0; i < 6; i++) R(c, '#3ad070', x + d * (8 + hash(i) * 12 + k.t * 0.5), fy - 2 - Math.sin(Math.min(1, k.u * 2) * Math.PI) * (8 + hash(i + 2) * 14), 2, 2); if (k.u < 0.5) G(c, 'FORE!', x + d * 26, fy - 60, '#80ffb0'); },
    fernando(f, c, fy, k, L) { if (L !== 'front') return; const { x, top, d } = geo(f, fy);  // smoke rings
      for (let i = 0; i < 4; i++) { const a = ((k.t + i * 12) % 48) / 48; c.globalAlpha = k.a * (1 - a) * 0.8; ring(c, x + d * (10 + a * 36), top + 18 - a * 26, 3 + a * 9, 4 + a * 12, '#c8c8c8', 2); } c.globalAlpha = k.a; R(c, '#ff7020', x + d * 9, top + 18, 2, 2); },
    gabriel(f, c, fy, k, L) { const { x, mid, h } = geo(f, fy);                              // neon thought, 305
      for (let i = 0; i < 4; i++) { const back = i % 2 === 0; if (back !== (L === 'back')) continue; c.strokeStyle = i % 2 ? '#ff4fb0' : '#40e8ff'; c.lineWidth = 2; c.globalAlpha = k.a * 0.9; c.beginPath(); c.ellipse(x, mid - 12 + i * 9, 22 + Math.sin(k.t / 5 + i) * 6, 6, Math.sin(k.t / 9 + i) * 0.4, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI); c.stroke(); }
      c.lineWidth = 1; c.globalAlpha = k.a; if (L === 'front') for (let i = 0; i < 5; i++) if ((k.t + i * 3) % 8 < 3) star(c, x + (hash(i + Math.floor(k.t / 8)) - 0.5) * 50, mid - h * 0.4 + hash(i * 5 + Math.floor(k.t / 8)) * h * 0.7, 3, i % 2 ? '#ff4fb0' : '#40e8ff'); },
    wuttke(f, c, fy, k, L) { if (L !== 'back') return; const { x, mid } = geo(f, fy);        // the staff unrolls behind him, in tempo
      const len = 150 * Math.min(1, k.u * 1.6); for (let s = 0; s < 5; s++) { c.strokeStyle = '#e0d0f0'; c.beginPath(); for (let i = 0; i <= len; i += 6) { const px = x - 75 + i, py = mid - 22 + s * 5 + Math.sin(i / 16 + k.t / 7) * 6; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
      if (RF.drawNote) for (let i = 0; i < 5; i++) { const px = ((k.t * 1.6 + i * 31) % 150); if (px < len) RF.drawNote(c, x - 75 + px, mid - 18 + Math.sin(px / 16 + k.t / 7) * 6 + (i % 3) * 5, i % 2 ? '#ffd040' : '#c080ff', 1, i % 2 === 0); } },
    lopez(f, c, fy, k, L) { const { x, mid, top } = geo(f, fy);                              // the proof writes itself
      if (L === 'back') { const u = Math.min(1, k.u * 1.5); R(c, '#00ffd0', x - 44, mid + 20, 88 * u, 1); R(c, '#00ffd0', x - 30, mid + 20 - 60 * u, 1, 60 * u); c.strokeStyle = 'rgba(160,255,240,0.9)'; c.beginPath(); for (let i = 0; i <= 60 * u; i += 3) { const px = x - 28 + i, py = mid + 18 - Math.pow(i / 60, 2) * 54; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); return; }
      ['∫', 'Σ', '∞', 'Δ', '√'].forEach((g, i) => { const yy = ((k.t * 1.2 + i * 17) % 70); c.globalAlpha = k.a * (1 - yy / 70); G(c, g, x + (i - 2) * 14 + Math.sin(yy / 9 + i) * 4, fy - 20 - yy, i % 2 ? '#a0fff0' : '#ffffff'); }); c.globalAlpha = k.a; },
    alejandro(f, c, fy, k, L) { if (L !== 'front') return; const { x } = geo(f, fy);         // the rock answers
      const u = Math.min(1, k.u * 2.2), e = 1 - (1 - u) * (1 - u); for (const [dx, hh] of [[-30, 34], [28, 46], [-48, 20], [46, 26]]) { const bx = x + dx, ht = hh * e; c.fillStyle = '#1c150e'; c.beginPath(); c.moveTo(bx - 9, fy + 1); c.lineTo(bx - 2, fy - ht - 2); c.lineTo(bx + 9, fy + 1); c.fill(); c.fillStyle = '#6e604c'; c.beginPath(); c.moveTo(bx - 7, fy + 1); c.lineTo(bx - 2, fy - ht); c.lineTo(bx + 7, fy + 1); c.fill(); c.fillStyle = '#a89478'; c.beginPath(); c.moveTo(bx - 7, fy + 1); c.lineTo(bx - 2, fy - ht); c.lineTo(bx - 3, fy + 1); c.fill(); }
      for (let i = 0; i < 8; i++) R(c, '#a89880', x + (hash(i) - 0.5) * 100, fy - 4 - Math.sin(Math.min(1, k.u * 1.5) * Math.PI) * (10 + hash(i + 4) * 30), 2, 2); },
    mikey(f, c, fy, k, L) { const { x, mid, top } = geo(f, fy);                              // game day: the play is drawn up, and he goes green
      if (L === 'back') { c.globalAlpha = k.a * 0.5; rays(c, x, mid, 16, 26, 44 + Math.sin(k.t / 3) * 4, '#60ff60', 2, k.t / 14); c.globalAlpha = k.a; return; }
      const marks = [['X', -34, -30], ['O', -14, -44], ['X', 12, -46], ['O', 34, -30], ['X', 40, -6]]; marks.forEach(([g, dx, dy], i) => { if (k.u * 7 > i) G(c, g, x + dx, mid + dy, g === 'X' ? '#ffffff' : '#ffd030'); });
      if (k.u > 0.5) { c.strokeStyle = '#fff'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x - 30, mid - 24); c.quadraticCurveTo(x, top - 30, x + 30, mid - 24); c.stroke(); c.setLineDash([]); } },
    bandy(f, c, fy, k, L) { if (L !== 'back') return; const { x } = geo(f, fy);              // the amps come on
      for (let i = 0; i < 11; i++) { const hgt = (10 + Math.abs(Math.sin(k.t / 3 + i * 1.3)) * 44) * Math.min(1, k.u * 2); R(c, '#111', x - 55 + i * 10 - 1, fy - hgt - 1, 8, hgt + 1); R(c, i % 2 ? '#ff60a0' : '#2ad0c0', x - 55 + i * 10, fy - hgt, 6, hgt); R(c, '#fff', x - 55 + i * 10, fy - hgt, 6, 2); } },
    brady(f, c, fy, k, L) { if (L !== 'front') return; const { x, top } = geo(f, fy);        // slips, and the stamp
      for (let i = 0; i < 9; i++) { const px = x + (hash(i) - 0.5) * 90 + Math.sin(k.t / 7 + i) * 6, py = top - 20 + ((k.t * 1.5 + hash(i + 2) * 100) % (fy - top + 20)); c.save(); c.translate(px, py); c.rotate(Math.sin(k.t / 8 + i)); R(c, '#111', -5, -4, 10, 8); R(c, '#ff9ac8', -4, -3, 8, 6); R(c, '#d0507a', -3, -1, 6, 1); c.restore(); }
      if (k.u > 0.35) { const s = k.u < 0.45 ? 2 : 1; c.save(); c.translate(x, top - 16); c.rotate(-0.12); c.strokeStyle = '#ff3030'; c.lineWidth = 2; c.strokeRect(-34, -4, 68, 13); c.lineWidth = 1; G(c, 'DETENTION', 0, -1, '#ff3030', s === 2 ? 1 : 1); c.restore(); } },
    javan(f, c, fy, k, L) { if (L !== 'front') return; const { x, top } = geo(f, fy);        // E-A-G-L-E-S
      for (let i = 0; i < 22; i++) { const a = hash(i) * 6.28, sp = 20 + hash(i + 3) * 46, u = Math.min(1, k.u * 1.4); R(c, i % 3 ? '#0a7a4a' : '#c8d0d8', x + Math.cos(a) * sp * u, top + 20 + Math.sin(a) * sp * u * 0.8 + u * u * 34, 3, 2); }
      'EAGLES'.split('').forEach((g, i) => { if (k.u * 9 > i) G(c, g, x - 30 + i * 12, top - 16 - (k.u * 9 - i < 1 ? 3 : 0), i % 2 ? '#c8d0d8' : '#3ad070', 2); }); },
    trump(f, c, fy, k, L) { if (L !== 'front') return; const { x, top } = geo(f, fy);        // flashbulbs and confetti
      for (let i = 0; i < 20; i++) { const px = x + (hash(i) - 0.5) * 130, py = top - 30 + ((k.t * (1.3 + hash(i + 3)) + hash(i + 7) * 130) % (fy - top + 30)); R(c, ['#e02030', '#ffffff', '#2a5ad0'][i % 3], px + Math.sin(k.t / 5 + i) * 3, py, 3, 2); }
      for (let i = 0; i < 4; i++) if ((k.t + i * 4) % 10 < 2) star(c, x + (hash(i + Math.floor(k.t / 10) * 3) - 0.5) * 120, top + hash(i * 5 + Math.floor(k.t / 10)) * 60, 6, '#fff'); },
    erick(f, c, fy, k, L) { const { x, top, d } = geo(f, fy);                                // the flashlight sweeps; the popcorn goes up
      if (L === 'back') { const a = -0.5 + Math.sin(k.t / 9) * 0.5; c.fillStyle = 'rgba(255,226,122,0.22)'; c.beginPath(); c.moveTo(x + d * 12, top + 30); c.lineTo(x + d * (12 + Math.cos(a - 0.2) * 120), top + 30 + Math.sin(a - 0.2) * 120); c.lineTo(x + d * (12 + Math.cos(a + 0.2) * 120), top + 30 + Math.sin(a + 0.2) * 120); c.fill(); return; }
      for (let i = 0; i < 14; i++) { const u = ((k.t * 0.03 + hash(i)) % 1), px = x - d * 12 + (hash(i + 2) - 0.5) * 40 * u, py = top + 24 - Math.sin(u * Math.PI) * (30 + hash(i + 5) * 30) + u * 30; R(c, '#3a2a10', px - 2, py - 2, 5, 5); R(c, i % 2 ? '#fff4c8' : '#ffe27a', px - 1, py - 1, 3, 3); } },
    urbanik(f, c, fy, k, L) { const { x, top } = geo(f, fy);                                 // he is already in your head
      if (L === 'back') { c.strokeStyle = '#40e8d0'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 70 * Math.min(1, k.u * 1.5); i++) { const a = i * 0.32 + k.t * 0.15, r = i * 0.55; i ? c.lineTo(x + Math.cos(a) * r, top + 12 + Math.sin(a) * r) : c.moveTo(x, top + 12); } c.stroke(); c.lineWidth = 1; return; }
      for (let i = 0; i < 3; i++) { const r = ((k.t * 1.5 + i * 16) % 48); c.globalAlpha = k.a * (1 - r / 48); ring(c, x + f.facing * 4, top + 10, r, r * 0.6, i % 2 ? '#b070ff' : '#40e8d0', 1.5); } c.globalAlpha = k.a; },
    loor(f, c, fy, k, L) { const { x, mid, top } = geo(f, fy);                               // ding ding; the slices go round
      if (L === 'back') { c.fillStyle = 'rgba(255,246,208,0.15)'; c.beginPath(); c.moveTo(x - 8, top - 60); c.lineTo(x + 8, top - 60); c.lineTo(x + 36, fy + 2); c.lineTo(x - 36, fy + 2); c.fill(); return; }
      orbit(4, 30, 11, k.t * 0.13, (dx, dy, i, a) => { c.save(); c.translate(x + dx, mid - 4 + dy); c.rotate(a + k.t * 0.1); c.fillStyle = '#2a1a0a'; c.beginPath(); c.moveTo(-7, -6); c.lineTo(7, -6); c.lineTo(0, 9); c.fill(); c.fillStyle = '#ffd860'; c.beginPath(); c.moveTo(-5, -4); c.lineTo(5, -4); c.lineTo(0, 7); c.fill(); R(c, '#e8a040', -6, -6, 12, 2); R(c, '#c82828', -2, -2, 2, 2); R(c, '#c82828', 1, 1, 2, 2); c.restore(); });
      if (k.u < 0.45) G(c, 'DING DING', x, top - 14, '#ffd030'); },
    olu(f, c, fy, k, L) { const { x, mid, top } = geo(f, fy);                                // the light behind him; the rounds hang in the air
      if (L === 'back') { c.globalAlpha = k.a * 0.55; rays(c, x, top + 14, 18, 14, 60 * Math.min(1, k.u * 2), '#ffd75a', 2, k.t / 40); c.globalAlpha = k.a; return; }
      orbit(6, 34, 9, k.t * 0.05, (dx, dy, i, a) => { const px = x + dx, py = mid - 6 + dy, t2 = -Math.sin(a); for (let j = 1; j < 5; j++) R(c, `rgba(255,215,90,${0.5 - j * 0.1})`, px - t2 * j * 3, py, 2, 1); R(c, '#111', px - 3, py - 2, 7, 4); R(c, '#ffd75a', px - 2, py - 1, 5, 2); }); },
    riley(f, c, fy, k, L) { const { x, mid, h } = geo(f, fy);                                // the orb closes round him
      if (L === 'back') { const r = h * 0.72 * Math.min(1, k.u * 1.6); const g = c.createRadialGradient(x, mid, r * 0.4, x, mid, Math.max(1, r)); g.addColorStop(0, 'rgba(255,230,140,0.02)'); g.addColorStop(1, 'rgba(255,215,90,0.45)'); c.fillStyle = g; c.beginPath(); c.arc(x, mid, Math.max(1, r), 0, 7); c.fill(); ring(c, x, mid, r, r, '#ffffff', 2); return; }
      const r = h * 0.72 * Math.min(1, k.u * 1.6); for (let i = 0; i < 3; i++) { c.strokeStyle = '#ffd75a'; c.beginPath(); c.ellipse(x, mid, Math.max(1, r), Math.max(1, r * 0.28), k.t / 30 + i * 1.05, 0, Math.PI); c.stroke(); } orbit(5, r + 6, r + 6, k.t * 0.07, (dx, dy, i) => { if ((k.t + i * 4) % 10 < 6) star(c, x + dx, mid + dy, 3, '#fff6d0'); }); },
    escudero(f, c, fy, k, L) { const { x, mid, top } = geo(f, fy);                           // a rainbow right across the room, and the flash
      if (L === 'back') { c.lineWidth = 4; for (let s = 0; s < 6; s++) { c.strokeStyle = RB[s]; c.globalAlpha = k.a * 0.9; c.beginPath(); c.arc(x, fy + 6, 84 - s * 4, Math.PI, Math.PI + Math.PI * Math.min(1, k.u * 1.7)); c.stroke(); } c.lineWidth = 1; c.globalAlpha = k.a; return; }
      for (let i = 0; i < 5; i++) if ((k.t + i * 5) % 12 < 4) star(c, x + (hash(i + Math.floor(k.t / 12) * 3) - 0.5) * 110, top - 10 + hash(i * 7 + Math.floor(k.t / 12)) * 70, 5, RB[i % 6]); },
    david(f, c, fy, k, L) { if (L !== 'front') return; const { x, mid } = geo(f, fy);        // lines and paint, all at once
      const P = ['#e03a3a', '#f2a21e', '#f4dc3a', '#3a8ae0', '#8a4ad0', '#34b860']; for (let i = 0; i < 6; i++) { if (k.u * 8 < i) continue; const px = x + (hash(i) - 0.5) * 100, py = mid - 30 + hash(i + 4) * 60, r = Math.min(7, (k.u * 8 - i) * 4); c.fillStyle = P[i]; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(px + Math.cos(j * 1.7 + i) * (r + 3), py + Math.sin(j * 1.7 + i) * (r + 3), 1.4, 0, 7); c.fill(); } }
      c.strokeStyle = '#e8e0d0'; c.lineWidth = 1.2; for (let i = 0; i < 10; i++) { const a = i * 0.63 + Math.floor(k.t / 3) * 0.05, r1 = 24 + Math.min(1, k.u * 1.5) * (14 + (i % 3) * 8); c.beginPath(); c.moveTo(x + Math.cos(a) * 20, mid + Math.sin(a) * 26); c.lineTo(x + Math.cos(a) * r1 + (hash(i + Math.floor(k.t / 3)) - 0.5) * 3, mid + Math.sin(a) * (r1 + 6)); c.stroke(); } c.lineWidth = 1; },
    proctor(f, c, fy, k, L) { if (L !== 'back') return; const { x, mid } = geo(f, fy);       // two minutes to midnight, behind him
      const r = 38 * Math.min(1, k.u * 2); if (r < 2) return; c.globalAlpha = k.a * 0.85; c.fillStyle = '#0a0810'; c.beginPath(); c.arc(x, mid - 6, r + 2, 0, 7); c.fill(); c.fillStyle = '#f4ecd0'; c.beginPath(); c.arc(x, mid - 6, r, 0, 7); c.fill();
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R(c, '#0a0810', x + Math.sin(a) * (r - 4) - 1, mid - 6 - Math.cos(a) * (r - 4) - 1, 2, 2); }
      const sp = k.u < 0.75 ? k.t * 0.5 : -0.2; c.save(); c.translate(x, mid - 6); c.rotate(sp); R(c, '#0a0810', -1, -r + 5, 2, r - 5); c.rotate(k.u < 0.75 ? sp * 0.2 : 0.2); R(c, '#c8202c', -1, -r + 9, 2, r - 9); c.restore(); c.globalAlpha = k.a; },
    ringer(f, c, fy, k, L) { if (L !== 'front') return; const { x, top } = geo(f, fy);       // DONG
      for (let i = 0; i < 4; i++) { const r = ((k.t * 2.4 + i * 22) % 88); c.globalAlpha = k.a * (1 - r / 88); ring(c, x, top + 18, r, r * 0.8, i % 2 ? '#fff6d0' : '#e8b030', 3); } c.globalAlpha = k.a; if (k.t % 30 < 14) G(c, 'DONG', x, top - 18, '#ffd75a', 2); },
    eraser(f, c, fy, k, L) { if (L !== 'front') return; const { x, mid, h } = geo(f, fy);    // what was written here is going
      for (let i = 0; i < 6; i++) { const y = mid - h * 0.4 + i * (h * 0.16), len = 70 * Math.max(0, 1 - k.u * 1.3 + i * 0.04); c.strokeStyle = '#f4f0e6'; c.lineWidth = 1.3; c.beginPath(); for (let j = 0; j <= len; j += 5) { const px = x - 35 + j, py = y + Math.sin(j * 0.6 + i) * 2; j ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
      c.lineWidth = 1; for (let i = 0; i < 18; i++) { c.globalAlpha = k.a * 0.7; R(c, '#e8e4d8', x + (hash(i) - 0.5) * 80 + Math.sin(k.t / 9 + i) * 4, mid - h * 0.5 + ((hash(i + 3) * h + k.t * 0.8) % h), 2, 2); } c.globalAlpha = k.a; },
  };

  // ================================================================ sounds, poses, and what they say
  const E = {
    bruiser: ['LUNCH IS SERVED. YOU ARE THE SPECIAL.', 'stomp', 12, 'victory'], viper: ['YOU WILL NOT SSSSEE THE NEXT ONE.', 'hiss', 3, 'special'],
    weissenberg: ['ONE POINT TWENTY-ONE GIGAWATTS. ALL FOR YOU.', 'bolt', 8, 'victory'], jauregui: ['SOLVE FOR X. X IS HOW HARD YOU LAND.', 'scribble', 2, 'special'],
    astuto: ['COURT IS IN SESSION. YOU ARE OVERRULED.', 'clang', 9, 'special'], escobedo: ['SYSTEMS ONLINE. TARGET ACQUIRED. DALE!', 'drill', 2, 'special'],
    landa: ['MY SERPENTS ARE HUNGRY. HOLD STILL.', 'hiss', 2, 'victory'], dabalsa: ['ALL THE WORLD IS A STAGE. THIS IS YOUR EXIT.', 'applause', 2, 'victory'],
    sirven: ['ATTENTION, STUDENTS. KNEEL.', 'pa', 6, 'special'], holbrook: ['I KNOW EXACTLY WHERE YOU ARE GOING. DOWN.', 'birds', 2, 'victory'],
    simon: ['RESPECT THE RITUAL. THEN FEAR THE KNEE.', 'perfect', 4, 'special'], anthony: ['THE CIRCLE IS OPEN. TIME TO BATCH UP.', 'arcane', 4, 'victory'],
    chris: ['I COULD BUY THIS ARENA. I MIGHT.', 'cash', 2, 'victory'], ruano: ['CLASS HAS BEGUN. HEAVEN IS WATCHING.', 'bell', 3, 'victory'],
    tamayo: ['I COULD TALK ALL DAY. I WILL. HA!', 'laugh', 2, 'victory'], nicholas: ['LIGHT WEIGHT, BABY. YOU ARE THE WARM-UP.', 'whoosh', 4, 'light'],
    tyler: ['FORE. THAT IS YOUR ONLY WARNING, BRO.', 'whoosh', 3, 'heavy'], fernando: ['HEH HEH. SMELL THAT? THAT IS TROUBLE.', 'laugh', 2, 'victory'],
    gabriel: ['I AM ALREADY IN YOUR HEAD. 305!', 'arcane', 5, 'victory'], wuttke: ['FROM THE TOP. YOUR REQUIEM, IN TEMPO.', 'chord', 3, 'special'],
    lopez: ['I SOLVED THIS FIGHT IN NINE THOUSAND UNIVERSES.', 'arcane', 5, 'special'], alejandro: ['THE ROCK LISTENS TO ME. SEND IT!', 'rumble', 12, 'victory'],
    mikey: ['GAME DAY, BABY. MIKEY SMASH!', 'roar', 10, 'victory'], bandy: ['TURN IT UP. THIS ONE GOES TO ELEVEN.', 'chord', 6, 'victory'],
    brady: ['NO HALL PASS? THAT IS A WRITE-UP.', 'paper', 4, 'special'], javan: ['E-A-G-L-E-S. GO BIRDS!', 'applause', 5, 'victory'],
    trump: ['NOBODY MAKES AN ENTRANCE LIKE ME. NOBODY.', 'fanfare', 2, 'victory'], erick: ['SEATS ARE THIS WAY. YOUR SHOW IS OVER.', 'ready', 2, 'special'],
    urbanik: ['I ALREADY KNOW HOW THIS ENDS. DO YOU?', 'arcane', 3, 'victory'], loor: ['GLOVES UP. DELIVERY IN THIRTY SECONDS OR LESS.', 'bell', 4, 'light'],
    olu: ['I WAS HERE BEFORE THE LIGHT. STEP BACK.', 'boom', 6, 'victory'], riley: ['THIS UNIVERSE IS UNDER MY PROTECTION.', 'arcane', 4, 'victory'],
    escudero: ['SMILE, HUN. THIS IS YOUR GOOD SIDE.', 'perfect', 3, 'victory'], david: ['HOLD THAT POSE. I AM DRAWING YOUR ENDING.', 'scribble', 2, 'special'],
    proctor: ['PENCILS DOWN. YOUR TIME IS UP.', 'bell', 4, 'victory'], ringer: ['...DONG.', 'bell', 14, 'victory'], eraser: ['SHHHH. YOU WERE NEVER HERE.', 'paper', 2, 'special'],
  };
  const FLASH = { weissenberg: 7, escudero: 8, olu: 5, riley: 4, mikey: 4, alejandro: 2 };
  const entry = (f) => E[f.def.id] || [f.def.quote || '', 'special', 3, 'victory'];
  RF.entranceLine = (f, opp) => (f.def.rivalQuote && opp && f.def.rivalQuote[opp.def.id]) || entry(f)[0] || f.def.quote || '';

  RF.entranceTick = function (scene, f, t) {
    const e = entry(f);
    if (t === F0) { f.hidden = false; RF.audio.sfx(e[1]); scene.shake = Math.max(scene.shake, e[2]); if (FLASH[f.def.id]) scene.flash = Math.max(scene.flash, FLASH[f.def.id]); }
    if (t >= F0 && t <= F1 && f.y === 0 && !f.hidden) {            // the pose they hold while it happens
      const u = (t - F0) / (F1 - F0), kind = e[3];
      f.state = 'finishing'; f.finisherAnim = kind === 'victory' ? ['victory', Math.min(1, u * 3)] : kind === 'special' ? ['special', u < 0.3 ? 0 : 1] : [kind, (Math.floor((t - F0) / 5) % 2) ? 1 : 2];
    } else if (t === F1 + 1) { f.state = 'idle'; f.finisherAnim = null; }
  };
  RF.entranceCam = function (scene) {
    const ent = scene.entranceInfo(), t = ent.t;
    return { z: t < 6 ? 1.05 : t < F0 - 4 ? 1.14 : t < D - 14 ? 1.36 : 1.08, x: ent.f.x };
  };
  const kOf = (scene, t) => ({ u: Math.max(0, Math.min(1, (t - F0) / (F1 - F0))), t: t - F0, a: t <= F1 ? Math.min(1, (t - F0) / 4) : Math.max(0, 1 - (t - F1) / 16), fr: scene.frame });
  const layer = (L) => function (scene, c, fy, ent) {
    const t = ent.t, f = ent.f;
    if (L === 'back' && t > 4) { const dim = Math.min(0.42, (t < F0 ? 0.16 : 0.42) * Math.min(1, t / 14)) * Math.min(1, (D - t) / 12); c.fillStyle = `rgba(4,2,10,${Math.max(0, dim)})`; c.fillRect(-20, -20, W() + 40, H() + 40); }
    if (t < F0 || f.hidden) return; const fx = FX[f.def.id], k = kOf(scene, t); if (!fx || k.a <= 0) return;
    c.save(); c.globalAlpha = k.a; try { fx(f, c, fy, k, L); } finally { c.restore(); c.globalAlpha = 1; c.lineWidth = 1; }
  };
  RF.drawEntranceBack = layer('back'); RF.drawEntranceFront = layer('front');

  // ================================================================ the letterbox, the name, the line
  RF.drawEntranceCard = function (ctx, f, t) {
    const w = W(), h = H(), a = Math.max(0, Math.min(1, t / 9, (D - t) / 9)), side = f.side, col = side === 0 ? '#ff5040' : '#50a0ff';
    const opp = f.scene && f.scene.opponentOf(f), line = RF.entranceLine(f, opp), lines = line ? RF.font.wrap('"' + line + '"', 54).slice(0, 2) : [];
    const top = Math.round(20 * a), bh = 42, by = h - Math.round(bh * a);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, top); ctx.fillRect(0, by, w, bh + 2);
    ctx.fillStyle = col; ctx.fillRect(0, top, w, 1); ctx.fillRect(0, by - 1, w, 1);
    if (a < 1) return;
    const spec = RF.SPECIALS[f.def.special], al = side === 0 ? 'left' : 'right', ex = side === 0 ? 8 : w - 8;
    T(ctx, side === 0 ? 'PLAYER 1' : (f.scene && f.scene.opts.cpu ? 'CPU' : 'PLAYER 2'), ex, 7, { align: al, color: col });
    if (spec) T(ctx, 'SIGNATURE: ' + spec.name.toUpperCase(), side === 0 ? w - 8 : 8, 7, { align: side === 0 ? 'right' : 'left', color: '#8a7a70' });
    // the name slides in on a slanted plate, then their line is typed out under it
    const s = Math.min(1, (t - 9) / 8), nx = side === 0 ? -140 + 148 * s : w + 140 - 148 * s, nw = RF.font.textWidth(f.def.name, 2) + 14;
    ctx.fillStyle = col; ctx.beginPath(); const px = side === 0 ? nx - 8 : nx - nw + 8; ctx.moveTo(px, by + 3); ctx.lineTo(px + nw, by + 3); ctx.lineTo(px + nw - 5, by + 19); ctx.lineTo(px - 5, by + 19); ctx.fill();
    T(ctx, f.def.name, nx, by + 4, { scale: 2, align: al, color: '#ffffff', outline: '#000' });
    const sub = ((f.def.archetype || '') + (f.def.origin ? '  -  ' + f.def.origin : '')).toUpperCase();
    T(ctx, RF.font.wrap(sub, 34)[0] || '', side === 0 ? w - 8 : 8, by + 8, { align: side === 0 ? 'right' : 'left', color: '#a89888' });
    if (t >= F0 - 2) { let n = Math.floor((t - (F0 - 2)) * 1.5); lines.forEach((l, i) => { const show = l.slice(0, Math.max(0, n)); n -= l.length; if (show) T(ctx, show, w / 2, by + 22 + i * 9, { align: 'center', color: '#fff0d0' }); }); }
  };
})();
