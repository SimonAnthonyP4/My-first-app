// CRAZY SPECIALS FOR EVERYONE. game/crazy.js has the rules and the first four (Javan, Nicholas, Anthony, Gabriel);
// this file gives the other 33 fighters one each. All of them unlock after that fighter has been knocked out once in
// the match, are used with EX, work once, and win the round if they land. They come in four kinds, and each kind can
// be beaten in its own way (on top of hitting them out of the wind-up):
//   LOOK   it catches anyone within range when the wind-up ends  -> stay out of range
//   DROP   it locks on to where you are standing, then lands there about half a second later -> move, or jump high
//   SHOT   something crosses the stage -> block it or jump it
//   GRAB   a short dash that has to reach you -> back away, or jump
// To change one: its row in MOVES (name, numbers, lines), and its two drawings (draw = the fighter's side,
// vic = what happens on the victim).
(function () {
  const { fx, say, STY, S, sprite, R, T, lerp, clamp, hash, CRAZY } = RF.crazyKit;
  const ring = (c, x, y, rx, ry, col, w) => { if (rx <= 0 || ry <= 0) return; c.strokeStyle = col; c.lineWidth = w || 2; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.stroke(); c.lineWidth = 1; };
  const star = (c, x, y, r, col) => { c.strokeStyle = col || '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke(); c.lineWidth = 1; R(c, '#fff', x - 1, y - 1, 2, 2); };
  const bub = (c, text, x, y, col) => {                  // a speech bubble (kept on the screen)
    const lines = RF.font.wrap(text, 24), w = Math.max(...lines.map((l) => RF.font.textWidth(l))) + 8, h = lines.length * 8 + 5;
    x = Math.max(w / 2 + 2, Math.min(RF.CONFIG.WIDTH - w / 2 - 2, x)); y = Math.max(24, y);
    R(c, '#000', x - w / 2 - 1, y - 1, w + 2, h + 2); R(c, col || '#f0e8d8', x - w / 2, y, w, h);
    lines.forEach((l, i) => RF.font.drawText(c, l, Math.round(x), Math.round(y + 3 + i * 8), { align: 'center', color: '#1a0a08' }));
  };
  const zzz = (c, x, y, t, col) => { for (let i = 0; i < 3; i++) T(c, 'Z', x + 8 + i * 7, y - i * 8 - (t % 24) * 0.3, col || '#c8d8ff', i === 2 ? 2 : 1); };
  const V = (v, fy) => { const h = v.body.height, feet = fy - v.y; return { x: v.x, feet, h, top: feet - h, mid: feet - h * 0.5, head: feet - h * 0.86, w: v.body.width }; };
  const fade = (it, n) => clamp((it.len - it.t) / (n || 16));
  const gap = (a, b) => Math.abs(a.x - b.x) - (a.body.width + b.body.width) / 2;
  const open = (f, sc, m) => { if (m.open) sc.effects.spawnText(m.open, f.x, f.body.height + 18, m.color); RF.audio.sfx(m.sfx || 'arcane'); };
  const hide = (f, on) => { f.hidden = on; f.crazyHidden = on; };

  // ================================================================ the four kinds
  function look(m) {
    const at = m.at || 26;
    return {
      update(f, sc, t, d, opp) {
        if (t === 1) open(f, sc, m);
        if (t === (m.commit || at - 6)) f.crazyCommitted = true;      // until then, a hit stops it
        if (t === at) {
          if (Math.abs(opp.x - f.x) < m.range && !opp.isKO) {
            d.hooked = true; d.vic = opp; d.ox = opp.x; RF.crazyHold(opp, m.ko - at + 40);
            fx(sc, { vic: opp, len: m.ko - at + (m.linger || 34), draw: m.vic, att: f });
            if (m.onHook) m.onHook(f, sc, opp, d); RF.audio.sfx(m.hookSfx || 'perfect');
          } else { d.miss = true; sc.effects.spawnText(m.missText || 'TOO FAR AWAY.', f.x, f.body.height + 32, '#a8a8b8'); }
        }
        if (d.miss) { if (t > at + 26) { f.crazyCommitted = false; f.setState('idle'); } return; }
        if (!d.hooked) return;
        for (const [lt, text] of m.lines || []) if (t === at + lt) say(f, text);
        if (m.tick) m.tick(f, sc, t - at, d, opp);
        if (t === m.ko) RF.crazyKO(sc, f, opp, m.koText, m.color);
      },
      draw(f, ctx, fy, t, d) { if (m.draw) m.draw(f, ctx, fy, t, d, t - at); },
      anim: m.anim || ((f, t) => ['special', t < 12 ? 0 : 1]),
    };
  }
  function drop(m) {
    const mark = m.mark || 20, hit = m.hit || 56;
    return {
      update(f, sc, t, d, opp) {
        if (t === 1) open(f, sc, m);
        if (t === mark - 2) f.crazyCommitted = true;
        if (t <= mark) d.tx = opp.x;                                   // it follows them until it locks on
        if (t === mark) RF.audio.sfx('ready');
        if (t === hit) {
          sc.shake = Math.max(sc.shake, m.shake || 12); RF.audio.sfx(m.hitSfx || 'boom'); if (m.flash) sc.flash = Math.max(sc.flash, m.flash);
          for (let i = -2; i <= 2; i++) sc.effects.spawn('dust', d.tx + i * 9, 1);
          if (Math.abs(opp.x - d.tx) < (m.radius || 24) && opp.y < 50 && !opp.isKO) { d.hooked = true; fx(sc, { vic: opp, len: m.linger || 60, draw: m.vic, att: f }); RF.crazyKO(sc, f, opp, m.koText, m.color); }
          else sc.effects.spawnText('DODGED!', opp.x, opp.body.height + 22, '#a8a8b8');
        }
      },
      draw(f, ctx, fy, t, d) {
        if (d.tx == null || t < 6) return;
        const u = clamp((t - mark) / (hit - mark)), x = d.tx;
        if (t < hit) {                                                   // the warning: a shadow that grows, and a blinking mark
          ctx.globalAlpha = 0.25 + u * 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, fy + 1, 9 + u * 16, 3 + u * 3, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
          if (t < mark ? (t >> 2) % 2 : (t >> 1) % 2) { ctx.strokeStyle = m.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, fy + 1, 22, 5, 0, 0, 7); ctx.stroke(); }
        }
        m.draw(f, ctx, fy, t, d, u, t - hit, x);
      },
      anim: m.anim || ((f, t) => ['victory', clamp(t / 16)]),
    };
  }
  function shot(m) {
    return {
      update(f, sc, t, d, opp) {
        if (t === 1) open(f, sc, m);
        if (t === (m.commit || 14)) f.crazyCommitted = true;
        if (m.tick) m.tick(f, sc, t, d, opp);
        if (t === m.fire) {
          const cfg = Object.assign({ kind: 'projectile', speed: 8, size: 18, height: 0.55, damage: 5, hitstun: 20, blockstun: 12, pushback: 5, hitstop: 6, crazyKO: true, sound: 'whoosh', colors: ['#ffffff', m.color, '#000000'] }, m.proj, { koText: m.koText, koColor: m.color, koFx: m.vic, koFxLen: m.linger || 60 });
          if (m.fromBehind) {                                            // it comes in from the edge behind them, along the floor
            const b = sc.stageDef.bounds, mv = RF.specialMove(f, cfg);
            sc.projectiles.push({ owner: f, cfg, move: mv, baseDamage: mv.damage, x: f.facing > 0 ? b.left - 16 : b.right + 16, y: 0, vx: f.facing * cfg.speed, w: cfg.w || 30, h: cfg.h || 30, t: 0 });
            RF.audio.sfx(cfg.sound);
          } else sc.spawnProjectile(f, cfg);
        }
      },
      draw(f, ctx, fy, t, d) { if (m.draw) m.draw(f, ctx, fy, t, d); },
      anim: m.anim || ((f, t) => ['special', t < m.fire ? 0 : 1]),
    };
  }
  function grab(m) {
    const go = m.dashAt || 10, len = m.dashLen || 11;
    return {
      update(f, sc, t, d, opp) {
        if (t === 1) open(f, sc, m);
        if (t === (m.commit || 8)) f.crazyCommitted = true;
        if (t >= go && t < go + len) { const g = gap(f, opp); if (g > 4) f.x += f.facing * Math.min(m.speed || 8, g - 2); if (t % 3 === 0) sc.effects.spawn('dust', f.x - f.facing * 8, 1); }
        if (t === go + len) {
          if (gap(f, opp) < (m.reach || 14) && opp.y < 34 && !opp.isKO) {
            d.hooked = true; d.vic = opp; d.at = t; RF.crazyHold(opp, m.koAfter + 40);
            fx(sc, { vic: opp, len: m.koAfter + (m.linger || 34), draw: m.vic, att: f });
            if (m.onHook) m.onHook(f, sc, opp, d); RF.audio.sfx(m.hookSfx || 'heavy'); sc.shake = Math.max(sc.shake, 6);
          } else { d.miss = true; sc.effects.spawnText('WHIFFED.', f.x, f.body.height + 32, '#a8a8b8'); }
        }
        if (d.miss) { if (t > go + len + 30) { f.crazyCommitted = false; f.setState('idle'); } return; }
        if (!d.hooked) return;
        const k = t - d.at;
        for (const [lt, text] of m.lines || []) if (k === lt) say(f, text);
        if (m.tick) m.tick(f, sc, k, d, opp);
        if (k === m.koAfter) RF.crazyKO(sc, f, opp, m.koText, m.color);
      },
      draw(f, ctx, fy, t, d) { if (m.draw) m.draw(f, ctx, fy, t, d, d.at == null ? -1 : t - d.at); },
      anim: m.anim || ((f, t) => (t < go ? ['crouch', 0] : ['heavy', 1])),
    };
  }
  const KIND = { look, drop, shot, grab };

  // ================================================================ the 33
  const MOVES = {
    // ------------------------------------------------ LOOK
    viper: { kind: 'look', name: 'A Thousand Cuts', range: 190, at: 20, ko: 86, total: 116, color: '#7cff4a', open: 'YOU WILL NOT SSSSEE IT.', koText: 'A THOUSAND CUTS.', sfx: 'hiss',
      about: 'She is gone. A dozen cuts later she is standing behind you, and then they all open at once.',
      onHook(f) { hide(f, true); },
      tick(f, sc, k, d, opp) { if (k % 5 === 0 && k < 46) RF.audio.sfx('whoosh'); if (k === 46) { const b = sc.stageDef.bounds; hide(f, false); f.x = Math.max(b.left + 14, Math.min(b.right - 14, opp.x + f.facing * 34)); f.faceOpponent(opp); sc.effects.spawn('dust', f.x, 1); } },
      draw(f, ctx, fy, t, d, k) { if (!d.hooked || k > 46) return; for (let i = 0; i < 3; i++) { const y = fy - 20 - hash(i + (k >> 1)) * 60, x = d.ox + (hash(i * 7 + (k >> 1)) - 0.5) * 90; R(ctx, '#7cff4a', x - 22, y, 44, 1); R(ctx, '#ffffff', x - 10, y, 20, 1); } },
      vic(ctx, v, fy, t, it) { const g = V(v, fy), n = Math.min(14, Math.floor(t / 3)), glow = t > 46; ctx.globalAlpha = fade(it); for (let i = 0; i < n; i++) { const cx = g.x + (hash(i) - 0.5) * 30, cy = g.mid + (hash(i + 9) - 0.5) * g.h * 0.8, a = hash(i + 3) * 3.14, L = 12; ctx.strokeStyle = glow ? '#ffffff' : '#c8ffc0'; ctx.lineWidth = glow ? 2 : 1; ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * L, cy - Math.sin(a) * L); ctx.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); ctx.stroke(); } } },
    jauregui: { kind: 'look', name: 'Final Exam', range: 170, ko: 112, total: 142, color: '#f0f0e0', open: 'FINAL EXAM. NO NOTES.', koText: 'SEE ME AFTER CLASS.', sfx: 'scribble',
      about: 'A desk, a test and three seconds. It comes back with an F on it.', lines: [[4, 'YOU MAY BEGIN.'], [58, 'PENCILS DOWN.']],
      vic(ctx, v, fy, t, it) { const g = V(v, fy), d = it.att.x < v.x ? -1 : 1, dx = g.x + d * 16; ctx.globalAlpha = fade(it);
        R(ctx, '#111', dx - 14, g.feet - 31, 28, 5); R(ctx, '#8a5a2a', dx - 13, g.feet - 30, 26, 3); R(ctx, '#3a3a44', dx - 11, g.feet - 27, 2, 27); R(ctx, '#3a3a44', dx + 9, g.feet - 27, 2, 27); R(ctx, '#f4f0e6', dx - 6, g.feet - 34, 12, 4);
        if (t < 58) { T(ctx, ['3', '2', '1'][Math.min(2, Math.floor(t / 19))], g.x, g.top - 30, '#ff4040', 2); for (let i = 0; i < 3; i++) T(ctx, '?', g.x - 16 + i * 16, g.top - 10 - ((t + i * 7) % 16), '#f0f0e0'); }
        else { const s = t < 64 ? 4 : 3; ring(ctx, g.x, g.top - 12, 15, 15, '#ff3030', 2); T(ctx, 'F', g.x, g.top - 12 - s * 3.5, '#ff3030', s); } } },
    landa: { kind: 'look', name: 'Python', range: 150, ko: 108, total: 138, color: '#4aa86a', open: 'COME OUT, MY PET.', koText: 'CONSTRICTED.', sfx: 'hiss', lines: [[6, 'SQUEEZE.']],
      about: 'Something very long comes up out of the floor and winds round you until you stop moving.',
      vic(ctx, v, fy, t, it) { const g = V(v, fy), n = Math.min(9, Math.floor(t / 5)), sq = t > 44 ? 2 : 0; ctx.globalAlpha = fade(it);
        for (let i = 0; i < n; i++) { const y = g.feet - 7 - i * (g.h * 0.085), rx = g.w * 0.6 + Math.sin(t / 4 + i) * 1.5 - sq; R(ctx, '#0a1e0f', g.x - rx - 1, y - 3, rx * 2 + 2, 7); R(ctx, i % 2 ? '#4aa86a' : '#3a8a58', g.x - rx, y - 2, rx * 2, 5); R(ctx, '#c8e8a0', g.x - rx + 2, y + 1, rx * 2 - 4, 1); }
        if (n >= 9) { const hx = g.x + (v.facing || 1) * (g.w * 0.6 + 4), hy = g.head - 4; R(ctx, '#0a1e0f', hx - 6, hy - 4, 12, 9); R(ctx, '#4aa86a', hx - 5, hy - 3, 10, 7); R(ctx, '#ff2010', hx - 2, hy - 2, 2, 2); if ((t >> 2) % 2) R(ctx, '#ff5a7a', hx - (v.facing || 1) * 9, hy + 1, 5, 1); } } },
    sirven: { kind: 'look', name: 'Called Your Mom', range: 190, ko: 120, total: 150, color: '#ffd030', open: 'ONE MOMENT. I AM CALLING YOUR MOTHER.', koText: 'GROUNDED.', sfx: 'pa',
      about: 'He phones your mother. She is on her way. There is nothing you can do.', lines: [[8, 'YES. IT IS ABOUT YOUR CHILD.'], [56, 'SHE IS ON HER WAY.']],
      draw(f, ctx, fy, t) { if (t > 100) return; const x = f.x + f.facing * 9, y = fy - f.body.height * 0.84; R(ctx, '#111', x - 2, y - 5, 5, 10); R(ctx, '#3a3a44', x - 1, y - 4, 3, 8); for (let i = 0; i < 2; i++) if ((t + i * 6) % 16 < 8) { ctx.strokeStyle = '#ffd030'; ctx.beginPath(); ctx.arc(x, y, 7 + i * 4, -0.8, 0.8, f.facing < 0); ctx.stroke(); } },
      vic(ctx, v, fy, t, it) { const g = V(v, fy); ctx.globalAlpha = fade(it); for (let i = 0; i < 4; i++) R(ctx, '#80c8ff', g.x + (i % 2 ? 1 : -1) * (g.w * 0.5 + 2 + (i >> 1) * 3), g.head - 4 + ((t * 0.9 + i * 6) % 22), 2, 3);
        if (t > 22) bub(ctx, t > 60 ? 'MOM: I AM IN THE PARKING LOT.' : 'MOM: WAIT UNTIL YOU GET HOME.', g.x, g.top - 30 - (t < 28 ? (28 - t) : 0)); if (t > 22 && (t >> 2) % 2) T(ctx, '!', g.x, g.top - 12, '#ff4040', 2); } },
    chris: { kind: 'look', name: 'Everyone Has a Price', range: 170, ko: 112, total: 142, color: '#3ad070', open: 'EVERYONE HAS A PRICE.', koText: 'BOUGHT.', sfx: 'cash', lines: [[4, 'NAME YOURS.'], [52, 'DADDY IS PAYING.']],
      about: 'He writes a cheque. It has a lot of zeros on it. You take the money and lie down.',
      draw(f, ctx, fy, t, d, k) { if (!d.hooked || k > 18) return; const u = k / 18, x = lerp(f.x + f.facing * 12, d.ox, u), y = fy - 60 - Math.sin(u * 3.14) * 24; ctx.save(); ctx.translate(x, y); ctx.rotate(k * 0.5); R(ctx, '#111', -8, -5, 16, 9); R(ctx, '#f4f0e6', -7, -4, 14, 7); R(ctx, '#3ad070', -5, -1, 10, 1); ctx.restore(); },
      vic(ctx, v, fy, t, it) { const g = V(v, fy); if (t < 18) return; ctx.globalAlpha = fade(it); const y = g.top - 44 + Math.sin(t / 9) * 2;
        R(ctx, '#111', g.x - 31, y - 1, 62, 30); R(ctx, '#e8f4e4', g.x - 30, y, 60, 28); R(ctx, '#3ad070', g.x - 30, y, 60, 2); R(ctx, '#3ad070', g.x - 30, y + 26, 60, 2);
        RF.font.drawText(ctx, 'PAY: YOU', g.x - 26, y + 4, { color: '#0a3a1a' }); RF.font.drawText(ctx, '$1,000,000', g.x - 26, y + 12, { color: '#0a7a3a' }); RF.font.drawText(ctx, 'MEMO: LOSE', g.x - 26, y + 20, { color: '#0a3a1a' });
        for (const s of [-4, 5]) T(ctx, '$', g.x + s * (v.facing || 1) * 0.9 + 2, g.head - 4, '#3ad070');
        for (let i = 0; i < 6; i++) { const yy = g.top - 10 + ((t * 1.6 + i * 17) % (g.h + 10)); R(ctx, '#111', g.x + (hash(i) - 0.5) * 40 - 2, yy - 2, 5, 5); R(ctx, '#ffd040', g.x + (hash(i) - 0.5) * 40 - 1, yy - 1, 3, 3); } } },
    tamayo: { kind: 'look', name: 'Filibuster Forever', range: 180, ko: 140, total: 170, color: '#ff4040', open: 'I YIELD THE FLOOR TO MYSELF.', koText: 'BORED TO SLEEP.', sfx: 'laugh', lines: [[4, 'AND FURTHERMORE...']],
      about: 'He starts talking. He does not stop. Hours pass. You do not make it.',
      draw(f, ctx, fy, t, d, k) { if (!d.hooked) return; const L = ['AND FURTHERMORE...', 'POINT OF ORDER.', 'AS I WAS SAYING...', 'IN CONCLUSION: NO.', 'HA!'], n = Math.min(L.length, 1 + Math.floor(k / 22)); for (let i = 0; i < n; i++) bub(ctx, L[i], f.x, fy - f.body.height - 20 - (n - 1 - i) * 14); },
      vic(ctx, v, fy, t, it) { const g = V(v, fy), cy = g.top - 16; ctx.globalAlpha = fade(it);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(g.x - 14, cy, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#f4ecd0'; ctx.beginPath(); ctx.arc(g.x - 14, cy, 8, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(g.x - 14, cy); ctx.rotate(t * 0.5); R(ctx, '#111', -1, -7, 2, 7); ctx.rotate(t * 0.04 - t * 0.5); R(ctx, '#c8202c', -1, -5, 2, 5); ctx.restore();
        if (t > 36) { zzz(ctx, g.x, g.top - 6, t); for (const s of [-4, 5]) R(ctx, '#1a1010', g.x + s * (v.facing || 1) * 0.9, g.head - 2, 4, 1); } } },
    fernando: { kind: 'look', name: 'Secondhand Smoke', range: 140, at: 24, ko: 98, total: 126, color: '#c8c8c8', open: 'HEH HEH. BREATHE IN.', koText: 'SMOKED OUT.', sfx: 'laugh',
      about: 'One very long drag, and a cloud that fills your side of the room.',
      draw(f, ctx, fy, t) { if (t > 96) return; for (let i = 0; i < 16; i++) { const a = ((t * 1.3 + i * 9) % 70) / 70; ctx.globalAlpha = 0.5 * (1 - a) * clamp(t / 10); ctx.fillStyle = i % 2 ? '#b8b8b8' : '#8a8a8a'; ctx.beginPath(); ctx.arc(f.x + f.facing * (12 + a * 120) + Math.sin(i * 2.1) * 8, fy - f.body.height * 0.8 + Math.sin(i * 1.7 + a * 5) * (8 + a * 16), 4 + a * 12, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; },
      vic(ctx, v, fy, t, it) { const g = V(v, fy); for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.55 * fade(it); ctx.fillStyle = i % 2 ? '#b8b8b8' : '#8a8a8a'; ctx.beginPath(); ctx.arc(g.x + Math.cos(t / 9 + i) * 12, g.head + Math.sin(t / 7 + i * 2) * 8, 8 + (i % 3) * 2, 0, 7); ctx.fill(); }
        ctx.globalAlpha = fade(it); if (t % 28 < 16) T(ctx, 'COUGH', g.x + ((t / 28 | 0) % 2 ? 16 : -16), g.top - 16, '#e0e0e0'); } },
    wuttke: { kind: 'look', name: 'Fortissimo', range: 170, at: 24, ko: 84, total: 112, color: '#c080ff', open: 'FROM THE TOP. FORTISSIMO!', koText: 'TINNITUS.', sfx: 'chord',
      about: 'Every instrument in the building, at once, as loud as they go.',
      tick(f, sc, k) { if (k % 6 === 0 && k < 56) { sc.shake = Math.max(sc.shake, 5); if (k % 12 === 0) RF.audio.sfx('chord'); } },
      draw(f, ctx, fy, t) { if (t < 20 || t > 90) return; const x = f.x + f.facing * 14, y = fy - f.body.height * 0.7; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const r = ((t * 4 + i * 24) % 150) + 8; ctx.globalAlpha = 1 - r / 158; ctx.strokeStyle = i % 2 ? '#c080ff' : '#ffd040'; ctx.beginPath(); ctx.arc(x, y, r, f.facing > 0 ? -0.6 : Math.PI - 0.6, f.facing > 0 ? 0.6 : Math.PI + 0.6); ctx.stroke(); } ctx.globalAlpha = 1; ctx.lineWidth = 1; T(ctx, 'fff', f.x, fy - f.body.height - 26, '#ffd040', 2); },
      vic(ctx, v, fy, t, it) { const g = V(v, fy); ctx.globalAlpha = fade(it); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const a = i * 0.785 + (t >> 2) * 0.3, r0 = 10, r1 = 15 + (i % 2) * 5; ctx.beginPath(); ctx.moveTo(g.x + Math.cos(a) * r0, g.head + Math.sin(a) * r0); ctx.lineTo(g.x + Math.cos(a) * r1, g.head + Math.sin(a) * r1); ctx.stroke(); }
        ctx.lineWidth = 1; for (let i = 0; i < 3; i++) star(ctx, g.x + Math.cos(t / 6 + i * 2.1) * 16, g.top - 8 + Math.sin(t / 6 + i * 2.1) * 4, 3, '#ffd040'); if ((t >> 3) % 2) T(ctx, 'RIIIING', g.x, g.top - 28, '#ffffff'); } },
    lopez: { kind: 'look', name: 'Q.E.D.', range: 190, ko: 114, total: 144, color: '#00ffd0', open: 'LET X BE YOU.', koText: 'Q.E.D.', lines: [[30, 'X MINUS X IS ZERO.'], [60, 'THEREFORE.']],
      about: 'A three-line proof that you equal zero. It is correct.',
      draw(f, ctx, fy, t, d, k) { if (!d.hooked) return; const y = fy - f.body.height - 44; T(ctx, 'LET X = YOU', f.x, y, '#a0fff0'); if (k >= 30) T(ctx, 'X - X = 0', f.x, y + 10, '#a0fff0'); if (k >= 60) T(ctx, 'YOU = 0', f.x, y + 20, '#ffffff'); },
      vic(ctx, v, fy, t, it) { const g = V(v, fy), u = clamp(t / 86), w = lerp(g.w + 44, 6, u), h = lerp(g.h + 30, 6, u); ctx.globalAlpha = fade(it); ctx.strokeStyle = '#00ffd0'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(g.x - w / 2), Math.round(g.mid - h / 2), Math.round(w), Math.round(h)); ctx.lineWidth = 1;
        T(ctx, '= 0', g.x + w / 2 + 14, g.mid - 4, '#00ffd0', 2); for (let i = 0; i < 12; i++) R(ctx, i % 2 ? '#a0fff0' : '#00b0a0', g.x + (hash(i) - 0.5) * g.w * 1.2, g.feet - ((t * (0.8 + hash(i + 3)) + hash(i + 7) * g.h) % g.h), 2, 2); } },
    brady: { kind: 'look', name: 'Dress Code Violation', range: 160, ko: 108, total: 138, color: '#ff6a8a', open: 'DRESS CODE CHECK.', koText: 'SENT HOME.', sfx: 'pa', lines: [[4, 'IS THAT SHIRT TUCKED IN?'], [44, 'THAT IS A VIOLATION.']],
      about: 'She measures. It is two inches out. That is a violation, and you are going home.',
      vic(ctx, v, fy, t, it) { const g = V(v, fy); ctx.globalAlpha = fade(it);
        if (t < 44) { const y = g.feet - 10 - Math.abs(Math.sin(t / 9)) * (g.h - 16); R(ctx, '#ffd030', g.x - g.w * 0.7, y, g.w * 1.4, 2); for (let i = 0; i < 8; i++) R(ctx, '#111', g.x - g.w * 0.7 + i * (g.w * 0.2), y, 1, 4); T(ctx, Math.round((g.feet - y) / 2) + ' IN', g.x + g.w * 0.7 + 14, y - 3, '#ffd030'); }
        else { const s = t < 50 ? 2 : 0; ctx.save(); ctx.translate(g.x, g.mid - 6); ctx.rotate(-0.15); R(ctx, '#111', -25 - s, -8 - s, 50 + s * 2, 15 + s * 2); R(ctx, '#ff9ac8', -24 - s, -7 - s, 48 + s * 2, 13 + s * 2); RF.font.drawText(ctx, 'VIOLATION', 0, -4, { align: 'center', color: '#a01040' }); ctx.restore(); }
        R(ctx, '#111', g.x - 7, g.top - 20, 14, 8); R(ctx, (t >> 3) % 2 ? '#ff2020' : '#2060ff', g.x - 6, g.top - 19, 12, 6); if ((t >> 3) % 2) ring(ctx, g.x, g.top - 16, 12, 6, '#ff2020', 1); } },
    erick: { kind: 'look', name: 'W Rizz', range: 150, at: 24, ko: 102, total: 130, color: '#ff7ac8', open: 'HEY. YOU DROPPED THIS.', koText: 'RIZZED UP.', sfx: 'ready', lines: [[20, 'MY NUMBER.'], [50, 'W.']],
      about: 'A wink, a folded note with a phone number on it, and your knees stop working.',
      draw(f, ctx, fy, t, d, k) { if (t > 8 && t < 24) star(ctx, f.x + f.facing * 6, fy - f.body.height * 0.86, 3 + (t % 4), '#ffffff'); if (!d.hooked || k > 16) return; const u = k / 16, x = lerp(f.x + f.facing * 12, d.ox, u), y = fy - 58 - Math.sin(u * 3.14) * 20; R(ctx, '#111', x - 5, y - 4, 10, 8); R(ctx, '#f4f0e6', x - 4, y - 3, 8, 6); },
      vic(ctx, v, fy, t, it) { const g = V(v, fy); ctx.globalAlpha = fade(it);
        for (let i = 0; i < 6; i++) { const yy = g.mid - ((t * 0.9 + i * 14) % 70), x = g.x + Math.sin(yy / 9 + i) * 16, s = 1 + (i % 2) * 0.4; ctx.fillStyle = i % 2 ? '#ff2a6a' : '#ff7ac8'; ctx.beginPath(); ctx.arc(x - 1.6 * s, yy - 1, 2 * s, 0, 7); ctx.arc(x + 1.6 * s, yy - 1, 2 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 3.4 * s, yy); ctx.lineTo(x + 3.4 * s, yy); ctx.lineTo(x, yy + 4 * s); ctx.fill(); }
        if (t > 16) { const y = g.top - 34; R(ctx, '#111', g.x - 25, y - 1, 50, 21); R(ctx, '#f4f0e6', g.x - 24, y, 48, 19); RF.font.drawText(ctx, 'CALL ME', g.x, y + 3, { align: 'center', color: '#a01060' }); RF.font.drawText(ctx, '555-RIZZ', g.x, y + 11, { align: 'center', color: '#1a0a08' }); }
        for (const s of [-1, 1]) R(ctx, '#ff8aa0', g.x + s * 6 - 2 + (v.facing || 1) * 2, g.head + 2, 4, 2); } },
    urbanik: { kind: 'look', name: 'Breakthrough', range: 170, ko: 112, total: 142, color: '#40e8d0', open: 'SIT. LET US TALK.', koText: 'BREAKTHROUGH.', lines: [[4, 'TELL ME ABOUT YOUR MOTHER.'], [46, 'AND HOW DID THAT FEEL?']],
      about: 'Two questions. By the second one you are crying too hard to stand.',
      vic(ctx, v, fy, t, it) { const g = V(v, fy), k = clamp(t / 40); ctx.globalAlpha = fade(it);
        for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { const a = ((t * 2 + i * 5) % 40) / 40; R(ctx, i % 2 ? '#80c8ff' : '#c0e8ff', g.x + s * (4 + a * 24 * k) + (v.facing || 1) * 2, g.head - 2 - Math.sin(a * 3.14) * 12 * k + a * a * (g.h * 0.8), 2, 3); }
        ctx.fillStyle = 'rgba(128,200,255,0.6)'; ctx.beginPath(); ctx.ellipse(g.x, g.feet + 1, 6 + t * 0.3, 2 + t * 0.03, 0, 0, 7); ctx.fill();
        if (t > 46) { const bx = g.x + 22, by = g.top - 26; R(ctx, '#111', bx - 11, by - 9, 22, 18); R(ctx, '#f0e8d8', bx - 10, by - 8, 20, 16); R(ctx, '#f0e8d8', bx - 12, by + 9, 3, 3); R(ctx, '#ff2a6a', bx - 6, by - 4, 5, 6); R(ctx, '#ff2a6a', bx + 2, by - 2, 5, 6); R(ctx, '#f0e8d8', bx - 1, by - 5, 2, 10); } } },
    riley: { kind: 'look', name: 'Escorted Out', range: 180, ko: 100, total: 130, color: '#ffd75a', open: 'SIR. YOU NEED TO LEAVE.', koText: 'ESCORTED OUT.', lines: [[30, 'THIS WAY.']],
      about: 'Security. A bubble of light picks you up, carries you to the door, and drops you.',
      tick(f, sc, k, d, opp) { if (k < 74) { opp.y = lerp(0, 66, clamp(k / 40)); opp.vy = 0; } },
      vic(ctx, v, fy, t, it) { const g = V(v, fy), r = g.h * 0.66 * clamp(t / 10); if (v.isKO) return; ctx.globalAlpha = fade(it, 8);
        const gr = ctx.createRadialGradient(g.x, g.mid, r * 0.4, g.x, g.mid, Math.max(1, r)); gr.addColorStop(0, 'rgba(255,230,140,0.03)'); gr.addColorStop(1, 'rgba(255,215,90,0.5)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.x, g.mid, Math.max(1, r), 0, 7); ctx.fill(); ring(ctx, g.x, g.mid, r, r, '#ffffff', 2);
        for (let i = 0; i < 3; i++) { ctx.strokeStyle = '#ffd75a'; ctx.beginPath(); ctx.ellipse(g.x, g.mid, Math.max(1, r), Math.max(1, r * 0.28), t / 20 + i * 1.05, 0, 7); ctx.stroke(); } T(ctx, 'EXIT', g.x, g.top - 20 - r * 0.3, '#60ff80'); } },
    escudero: { kind: 'look', name: 'Bad Angle', range: 170, at: 24, ko: 106, total: 136, color: '#ff5aa8', open: 'OH, HONEY. HOLD STILL.', koText: 'CANCELLED.', sfx: 'paper', lines: [[8, 'OH NO. THIS ANGLE.'], [48, 'POSTED.']],
      about: 'One photo, from the worst angle there is. He posts it. You do not recover.',
      onHook(f, sc) { sc.flash = Math.max(sc.flash, 8); },
      draw(f, ctx, fy, t, d, k) { if (!d.hooked || k < 4) return; const v = d.vic, x = (f.x + v.x) / 2, y = fy - 150 + Math.sin(k / 9) * 2 - (k < 10 ? (10 - k) * 3 : 0), w = 44, h = 56;
        R(ctx, '#111', x - w / 2 - 1, y - 1, w + 2, h + 2); R(ctx, '#f4f0e6', x - w / 2, y, w, h); R(ctx, '#2a2a34', x - w / 2 + 3, y + 3, w - 6, h - 18);
        ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2 + 3, y + 3, w - 6, h - 18); ctx.clip(); ctx.translate(x, y + h - 16); ctx.scale(0.72, 0.72); v.sprite.draw(ctx, 'hit', 0, 0, 22, v.facing); ctx.restore();
        RF.font.drawText(ctx, k > 48 ? 'LIKES: ' + Math.min(9999, (k - 48) * 173) : 'YIKES.', x, y + h - 11, { align: 'center', color: '#a01060' }); },
      vic(ctx, v, fy, t, it) { const g = V(v, fy); ctx.globalAlpha = fade(it); for (let i = 0; i < 4; i++) R(ctx, '#80c8ff', g.x + (i % 2 ? 1 : -1) * (g.w * 0.5 + 2 + (i >> 1) * 3), g.head - 4 + ((t * 0.9 + i * 6) % 22), 2, 3); if (t > 26 && (t >> 3) % 2) T(ctx, 'DELETE IT!', g.x + ((t >> 1) % 2), g.top - 12, '#ff4040'); } },
    proctor: { kind: 'look', name: 'Pencils Down', range: 190, ko: 108, total: 138, color: '#f4ecd0', open: 'PENCILS. DOWN.', koText: 'TIME IS UP.', sfx: 'bell', lines: [[6, 'YOU HAVE NO TIME REMAINING.']],
      about: 'Your clock runs out. All of it, in three seconds.',
      vic(ctx, v, fy, t, it) { const g = V(v, fy), u = clamp(t / 78), x = g.x, y = g.top - 30; ctx.globalAlpha = fade(it);
        R(ctx, '#111', x - 8, y - 12, 16, 3); R(ctx, '#111', x - 8, y + 9, 16, 3); ctx.fillStyle = '#c8e8ff'; ctx.beginPath(); ctx.moveTo(x - 7, y - 9); ctx.lineTo(x + 7, y - 9); ctx.lineTo(x, y); ctx.lineTo(x + 7, y + 9); ctx.lineTo(x - 7, y + 9); ctx.lineTo(x, y); ctx.fill();
        ctx.fillStyle = '#e8c070'; ctx.beginPath(); ctx.moveTo(x - 6 * (1 - u), y - 8 * (1 - u)); ctx.lineTo(x + 6 * (1 - u), y - 8 * (1 - u)); ctx.lineTo(x, y); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 7 * u, y + 9); ctx.lineTo(x + 7 * u, y + 9); ctx.lineTo(x, y + 9 - 8 * u); ctx.fill(); if (u < 1) R(ctx, '#e8c070', x, y, 1, 9);
        ctx.strokeStyle = `rgba(220,220,230,${0.8 * u})`; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(g.x - g.w * 0.6, g.head - 4 + i * 2); ctx.lineTo(g.x + (i - 3) * 5 * u, g.head + 16 * u + i * 3); ctx.lineTo(g.x + g.w * 0.6, g.head - 2 + i * 2); ctx.stroke(); }
        for (let i = 0; i < 10; i++) R(ctx, '#a8a8b0', g.x + (hash(i) - 0.5) * g.w, g.top + ((t * (0.6 + hash(i + 2)) + hash(i + 5) * g.h) % g.h), 1, 2); } },
    eraser: { kind: 'look', name: 'Erased', range: 160, at: 24, ko: 98, total: 126, color: '#f4f0e6', open: 'SHHHH.', koText: 'NOBODY REMEMBERS.', sfx: 'paper',
      about: 'It rubs you out, top to bottom. Nobody in the room remembers who was standing there.',
      vic(ctx, v, fy, t, it) { const g = V(v, fy), u = clamp(t / 70), y = g.top + u * g.h, ex = g.x + Math.sin(t * 0.5) * g.w * 0.7; if (v.isKO) return;
        ctx.globalAlpha = 0.6 * fade(it, 8); for (let yy = g.top - 2; yy < y; yy += 4) R(ctx, '#e8e4d8', g.x - g.w * 0.75 + Math.sin(yy) * 2, yy, g.w * 1.5, 3);
        ctx.globalAlpha = fade(it, 8); R(ctx, '#111', ex - 7, y - 5, 15, 11); R(ctx, '#6a4a2a', ex - 6, y - 4, 13, 4); R(ctx, '#e8e4d8', ex - 6, y, 13, 5); for (let i = 0; i < 10; i++) R(ctx, '#f4f0e6', ex - 10 + hash(i + t) * 20, y - 6 + hash(i * 3 + t) * 16, 1, 1); } },
    // ------------------------------------------------ DROP
    dabalsa: { kind: 'drop', name: 'The Complete Works', color: '#e8b997', open: 'A TRAGEDY. YOURS.', koText: 'CLOSED BOOK.', shake: 16, sfx: 'paper',
      about: 'All thirty-seven plays, in one hardback, from a great height.',
      draw(f, ctx, fy, t, d, u, after, x) { if (t < 20) return; const y = after >= 0 ? fy - 30 : lerp(-50, fy - 30, u * u), w = 48; R(ctx, '#111', x - w / 2 - 1, y - 1, w + 2, 32); R(ctx, '#6a3a1a', x - w / 2, y, w, 30); R(ctx, '#d4a838', x - w / 2, y + 3, w, 2); R(ctx, '#d4a838', x - w / 2, y + 22, w, 2); R(ctx, '#f4f0e6', x - w / 2 + 2, y + 26, w - 4, 3); R(ctx, '#3a2010', x - w / 2, y, 4, 30); RF.font.drawText(ctx, 'COMPLETE', x + 2, y + 7, { align: 'center', color: '#ffe0a0' }); RF.font.drawText(ctx, 'WORKS', x + 2, y + 14, { align: 'center', color: '#ffe0a0' }); },
      vic(ctx, v, fy, t, it) { ctx.globalAlpha = fade(it); for (let i = 0; i < 4; i++) star(ctx, v.x + Math.cos(t / 6 + i * 1.57) * 22, fy - 40 + Math.sin(t / 6 + i * 1.57) * 5, 3, '#ffd040'); } },
    bruiser: { kind: 'drop', name: 'Mystery Meat', color: '#c87a30', open: 'ORDER UP!', koText: 'LUNCH IS SERVED.', sfx: 'clang', hitSfx: 'stomp',
      about: 'Today\'s special, all of it, poured from the ceiling. Nobody knows what it is.',
      draw(f, ctx, fy, t, d, u, after, x) { if (t < 20) return; if (after < 14) { const y1 = after >= 0 ? fy : lerp(0, fy, u), y0 = after >= 0 ? lerp(0, fy, after / 14) : -4; R(ctx, '#3a1c08', x - 9, y0, 18, y1 - y0); R(ctx, '#8a4a18', x - 8, y0, 16, y1 - y0); R(ctx, '#b06a28', x - 8, y0, 4, y1 - y0); for (let i = 0; i < 5; i++) R(ctx, '#5a2c0c', x - 6 + (i * 5) % 12, y0 + ((t * 6 + i * 31) % Math.max(1, y1 - y0)), 3, 4); }
        if (after >= 0) { const k = clamp(after / 8); ctx.fillStyle = '#3a1c08'; ctx.beginPath(); ctx.ellipse(x, fy + 1, 30 * k, 14 * k, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#8a4a18'; ctx.beginPath(); ctx.ellipse(x, fy + 1, 28 * k, 12 * k, 0, Math.PI, 0); ctx.fill(); for (let i = 0; i < 5; i++) R(ctx, '#b06a28', x - 18 + i * 9, fy - 5 - (i % 2) * 4, 4, 3); } },
      vic(ctx, v, fy, t, it) { ctx.globalAlpha = fade(it); for (let i = 0; i < 3; i++) { ctx.strokeStyle = '#80c040'; ctx.beginPath(); for (let j = 0; j < 6; j++) { const px = v.x - 12 + i * 12 + Math.sin(j + t / 5) * 3, py = fy - 16 - j * 5; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } for (let i = 0; i < 3; i++) R(ctx, '#111', v.x + Math.cos(t / 4 + i * 2) * 20, fy - 30 + Math.sin(t / 3 + i) * 8, 2, 2); } },
    weissenberg: { kind: 'drop', name: '1.21 Gigawatts', color: '#7ad8ff', open: 'CHARGING...', koText: 'GREAT SCOTT!', hitSfx: 'bolt', flash: 8, shake: 14, sfx: 'zap',
      about: 'A storm cloud parks itself over your head. Then all 1.21 gigawatts come down.',
      draw(f, ctx, fy, t, d, u, after, x) { const k = clamp(t / 20); for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#3a3a4c' : '#2a2a3a'; ctx.beginPath(); ctx.arc(x - 24 + i * 8, 30 + Math.sin(i * 2 + t / 9) * 3, (9 + (i % 3) * 3) * k, 0, 7); ctx.fill(); }
        if (t > 20 && after < 0 && (t >> 1) % 3 === 0) R(ctx, '#ffffff', x - 20 + hash(t) * 40, 36 + hash(t + 3) * 10, 2, 5);
        if (after >= 0 && after < 12 && RF.electric) { const el = RF.electric, seed = after * 17.3; el.glow(ctx, x, fy - 30, 30, 0.8); el.bolt(ctx, [x, 34], [x, fy], { seed, amp: 12, thick: 2.2, forks: 6 }); el.bolt(ctx, [x - 6, 34], [x + 4, fy], { seed: seed + 9, amp: 16, thick: 0.8, forks: 3 }); } },
      vic(ctx, v, fy, t, it) { if (t > 26) return; v.sprite.draw(ctx, 'hit', 0, v.x, fy - v.y, v.facing, (t >> 1) % 2 ? '#ffffff' : '#101828'); } },
    escobedo: { kind: 'drop', name: 'Orbital Strike', color: '#40d8ff', open: 'TARGET LOCKED. DALE.', koText: 'TARGET DELETED.', hitSfx: 'boom', flash: 6, shake: 14, sfx: 'drill',
      about: 'A red dot finds you. Something in orbit agrees.',
      draw(f, ctx, fy, t, d, u, after, x) { if (after < 0) { const y = fy - 40; ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 10 - u * 4, 0, 7); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 14); ctx.stroke(); if ((t >> 1) % 2) R(ctx, 'rgba(255,48,48,0.7)', x, 0, 1, y); R(ctx, '#ff3030', x - 1, y - 1, 3, 3); }
        else if (after < 16) { const w = 34 * (1 - after / 16); R(ctx, 'rgba(64,216,255,0.5)', x - w / 2 - 4, 0, w + 8, fy); R(ctx, '#aef0ff', x - w / 2, 0, w, fy); R(ctx, '#ffffff', x - w / 4, 0, w / 2, fy); ring(ctx, x, fy, 10 + after * 4, 3 + after, '#aef0ff', 2); } },
      vic(ctx, v, fy, t, it) { ctx.globalAlpha = fade(it) * 0.6; for (let i = 0; i < 5; i++) { ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.arc(v.x + (i - 2) * 7, fy - 12 - ((t * 0.9 + i * 9) % 40), 4 + (i % 3), 0, 7); ctx.fill(); } } },
    holbrook: { kind: 'drop', name: 'You Are Here', color: '#e02020', open: 'I KNOW WHERE YOU LIVE.', koText: 'LOCATED.', shake: 14, sfx: 'birds',
      about: 'A map pin the size of a car, dropped exactly where you are standing.',
      draw(f, ctx, fy, t, d, u, after, x) { if (t < 20) return; const tip = after >= 0 ? fy : lerp(-70, fy, u * u), wob = after >= 0 && after < 14 ? Math.sin(after * 1.2) * (14 - after) * 0.01 : 0; ctx.save(); ctx.translate(x, tip); ctx.rotate(wob);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-13, -38); ctx.lineTo(13, -38); ctx.fill(); ctx.beginPath(); ctx.arc(0, -46, 19, 0, 7); ctx.fill();
        ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, -38); ctx.lineTo(11, -38); ctx.fill(); ctx.beginPath(); ctx.arc(0, -46, 17, 0, 7); ctx.fill(); ctx.fillStyle = '#ff7060'; ctx.beginPath(); ctx.arc(-5, -51, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -46, 6, 0, 7); ctx.fill(); ctx.restore();
        if (after > 6) T(ctx, 'YOU ARE HERE', x, fy - 84, '#ffffff'); },
      vic(ctx, v, fy, t, it) { ctx.globalAlpha = fade(it); for (let i = 0; i < 4; i++) star(ctx, v.x + Math.cos(t / 6 + i * 1.57) * 22, fy - 16 + Math.sin(t / 6 + i * 1.57) * 4, 3, '#ffd040'); } },
    ruano: { kind: 'drop', name: 'Smite', color: '#fff2c0', open: 'LET US PRAY.', koText: 'AMEN.', hitSfx: 'bell', flash: 8, sfx: 'bell',
      about: 'The clouds part. A light comes down on exactly one person.',
      draw(f, ctx, fy, t, d, u, after, x) { const k = clamp(t / 20); ctx.fillStyle = `rgba(255,242,192,${0.5 * k})`; ctx.beginPath(); ctx.ellipse(x, 2, 44 * k, 12 * k, 0, 0, 7); ctx.fill();
        if (after < 0) { ctx.fillStyle = `rgba(255,246,208,${0.08 + u * 0.14})`; ctx.beginPath(); ctx.moveTo(x - 4, 0); ctx.lineTo(x + 4, 0); ctx.lineTo(x + 10 + u * 10, fy); ctx.lineTo(x - 10 - u * 10, fy); ctx.fill(); if (t > 20) T(ctx, 'AAAAH', x, 18, '#fff2c0'); }
        else if (after < 22) { const a = 1 - after / 22; ctx.globalAlpha = a; R(ctx, '#fff6d0', x - 22, 0, 44, fy); R(ctx, '#ffffff', x - 12, 0, 24, fy); for (let i = 0; i < 3; i++) ring(ctx, x, fy, 14 + after * 3 + i * 8, 4 + after * 0.5, '#fff2c0', 2); ctx.globalAlpha = 1; } },
      vic(ctx, v, fy, t, it) { ctx.globalAlpha = fade(it); ring(ctx, v.x, fy - 34 - Math.min(20, t * 0.5), 8, 3, '#ffe27a', 2); for (let i = 0; i < 4; i++) if ((t + i * 5) % 12 < 6) star(ctx, v.x + (hash(i + (t / 12 | 0)) - 0.5) * 40, fy - 20 - hash(i * 3 + (t / 12 | 0)) * 40, 3, '#fff2c0'); } },
    alejandro: { kind: 'drop', name: 'Avalanche', color: '#a89478', open: 'ROCK!', koText: 'ROCKED.', shake: 18, sfx: 'rumble',
      about: 'He looks up. The biggest boulder on the crag looks down, and lets go.',
      draw(f, ctx, fy, t, d, u, after, x) { if (t < 20) return; const y = after >= 0 ? fy - 22 : lerp(-50, fy - 22, u * u), rot = after >= 0 ? 0.4 : t * 0.15; ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        const pts = [[-22, 4], [-17, -14], [-4, -23], [12, -20], [23, -6], [20, 12], [6, 22], [-12, 20]], path = (s) => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s))); ctx.closePath(); };
        path(1.08); ctx.fillStyle = '#1c150e'; ctx.fill(); path(1); ctx.fillStyle = '#6e604c'; ctx.fill(); ctx.fillStyle = '#a89478'; ctx.beginPath(); ctx.moveTo(-17, -14); ctx.lineTo(-4, -23); ctx.lineTo(2, -8); ctx.lineTo(-12, -2); ctx.fill(); ctx.fillStyle = '#4a3e30'; ctx.beginPath(); ctx.moveTo(20, 12); ctx.lineTo(6, 22); ctx.lineTo(2, 8); ctx.lineTo(14, 2); ctx.fill(); ctx.restore();
        if (after < 0) for (let i = 0; i < 4; i++) R(ctx, '#6e604c', x - 30 + i * 20, y - 30 - i * 14 + (t % 7), 4, 4);
        else if (after < 24) for (let i = 0; i < 8; i++) { ctx.globalAlpha = 0.6 * (1 - after / 24); ctx.fillStyle = '#d8ccb8'; ctx.beginPath(); ctx.arc(x + (i - 3.5) * 9 * (1 + after / 10), fy - 4 - (i % 3) * 4, 5 + after * 0.3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } },
      vic() {} },
    trump: { kind: 'drop', name: 'The Wall', color: '#ffd75a', open: 'WE ARE BUILDING IT. RIGHT THERE.', koText: 'AND YOU PAID FOR IT.', shake: 16, sfx: 'fanfare',
      about: 'A very big, very beautiful section of wall, delivered from above.',
      draw(f, ctx, fy, t, d, u, after, x) { if (t < 20) return; const w = 44, h = 58, y = after >= 0 ? fy - h : lerp(-80, fy - h, u * u); R(ctx, '#111', x - w / 2 - 1, y - 1, w + 2, h + 2); R(ctx, '#7a5a10', x - w / 2, y, w, h);
        for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) { const bx = x - w / 2 + c * 12 + (r % 2 ? 6 : 0), by = y + 1 + r * 7; const l = Math.max(x - w / 2, bx), rr = Math.min(x + w / 2, bx + 11); if (rr > l) { R(ctx, '#d4a838', l, by, rr - l, 6); R(ctx, '#ffe9a0', l, by, rr - l, 1); } }
        if (after > 4) { R(ctx, '#111', x - 21, y + 20, 42, 11); R(ctx, '#f4f0e6', x - 20, y + 21, 40, 9); RF.font.drawText(ctx, 'PAID', x, y + 22, { align: 'center', color: '#c8202c' }); } },
      vic() {} },
    david: { kind: 'drop', name: 'Acme', color: '#f4f0e6', open: 'HOLD ON. ALMOST DONE.', koText: 'ACME.', shake: 16, sfx: 'scribble', hit: 60,
      about: 'He draws an anvil over your head, one line at a time. When he finishes the last line, it is real.',
      draw(f, ctx, fy, t, d, u, after, x) { if (t < 20) return; const P = [[-20, -22], [16, -22], [24, -18], [16, -12], [6, -12], [3, -4], [12, 0], [12, 4], [-12, 4], [-12, 0], [-4, -4], [-6, -12], [-20, -14], [-20, -22]], k = clamp((t - 20) / 30), y0 = fy - 130, drawn = after >= -8;
        const y = after >= 0 ? fy - 6 : drawn ? lerp(y0, fy - 6, Math.pow((after + 8) / 8, 2)) : y0; ctx.save(); ctx.translate(x, y);
        if (drawn) { ctx.fillStyle = '#111'; ctx.beginPath(); P.forEach(([px, py], i) => (i ? ctx.lineTo(px * 1.05, py * 1.05) : ctx.moveTo(px * 1.05, py * 1.05))); ctx.fill(); ctx.fillStyle = '#4a4a56'; ctx.beginPath(); P.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.fill(); R(ctx, '#8a8a98', -18, -21, 32, 2); RF.font.drawText(ctx, 'ACME', -2, -20, { align: 'center', color: '#e8e8f0' }); }
        else { const n = Math.max(1, Math.floor(k * (P.length - 1))); ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= n; i++) { const [px, py] = P[i], j = (hash(i + (t >> 2)) - 0.5) * 1.6; i ? ctx.lineTo(px + j, py + j) : ctx.moveTo(px, py); } ctx.stroke(); const [qx, qy] = P[n]; ctx.translate(qx, qy); ctx.rotate(-0.8); R(ctx, '#111', -2, -16, 5, 18); R(ctx, '#f2c21e', -1, -15, 3, 13); R(ctx, '#333', -1, -2, 3, 3); }
        ctx.restore(); ctx.lineWidth = 1; },
      vic() {} },
    // ------------------------------------------------ SHOT
    astuto: { kind: 'shot', name: 'We the People', fire: 30, total: 76, color: '#e8d8a8', open: 'WE THE PEOPLE!', koText: 'UNCONSTITUTIONAL.', sfx: 'clang', proj: { ground: true, speed: 5.6, size: 30, art: 'crazyScroll', sound: 'paper' },
      about: 'The whole Constitution, rolled up, rolling at you along the floor.',
      vic(ctx, v, fy, t, it) { const g = V(v, fy); ctx.globalAlpha = fade(it); for (let i = 0; i < 4; i++) { const y = fy - 8 - i * 7; R(ctx, '#111', g.x - g.h * 0.5, y - 3, g.h, 7); R(ctx, '#e8d8a8', g.x - g.h * 0.5 + 1, y - 2, g.h - 2, 5); R(ctx, '#8a7a5a', g.x - g.h * 0.5 + 4, y, g.h - 8, 1); } } },
    tyler: { kind: 'shot', name: 'Cart Path Only', fire: 26, total: 80, color: '#80ffb0', open: 'FORE! ...NO, REALLY. MOVE.', koText: 'CART PATH ONLY.', sfx: 'honk', fromBehind: true, proj: { speed: 7.6, w: 40, h: 30, art: 'crazyCart', sound: 'engine' },
      about: 'His golf cart, at full speed, from behind him. He is not driving it.',
      vic(ctx, v, fy, t, it) { ctx.globalAlpha = fade(it); for (let i = 0; i < 12; i++) R(ctx, '#1a1a1a', v.x - 36 + i * 6, fy - 1 + (i % 2), 4, 2); for (let i = 0; i < 4; i++) star(ctx, v.x + Math.cos(t / 6 + i * 1.57) * 20, fy - 30 + Math.sin(t / 6 + i * 1.57) * 5, 3, '#ffd040'); } },
    mikey: { kind: 'shot', name: 'The Whole Team', fire: 26, total: 84, color: '#60ff60', open: 'HUT! HUT! HIKE!', koText: 'SACKED!', sfx: 'roar', fromBehind: true, proj: { speed: 7, w: 64, h: 60, art: 'crazyTeam', sound: 'stomp' },
      about: 'The entire defensive line comes through, from behind him.',
      vic(ctx, v, fy, t, it) { ctx.globalAlpha = fade(it); for (let i = 0; i < 5; i++) star(ctx, v.x + Math.cos(t / 5 + i * 1.26) * 22, fy - 30 + Math.sin(t / 5 + i * 1.26) * 6, 3, '#ffd040'); } },
    bandy: { kind: 'shot', name: 'Amp to Eleven', fire: 34, total: 84, color: '#ff60a0', open: 'THIS ONE GOES TO ELEVEN.', koText: 'FACE: MELTED.', sfx: 'chord', proj: { speed: 9, size: 46, height: 0.5, art: 'crazyRiff', sound: 'chord' },
      about: 'A wall of amplifiers, and one chord. The chord crosses the room.',
      tick(f, sc, t) { if (t === 34) sc.shake = Math.max(sc.shake, 10); },
      draw(f, ctx, fy, t) { if (t < 4 || t > 78) return; const k = clamp((t - 4) / 8), x = f.x - f.facing * 26, vib = t >= 34 && t < 60 ? Math.sin(t * 2) : 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const bx = x - 22 + c * 22 + vib, by = fy - (r + 1) * 22 * k; R(ctx, '#111', bx, by, 22, 22 * k); R(ctx, '#2a2a30', bx + 1, by + 1, 20, 22 * k - 2); ctx.fillStyle = '#4a4a54'; ctx.beginPath(); ctx.arc(bx + 11, by + 11 * k, 7 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#1a1a20'; ctx.beginPath(); ctx.arc(bx + 11, by + 11 * k, 3 * k, 0, 7); ctx.fill(); } if (t >= 34) T(ctx, '11', x, fy - 80, '#ff60a0', 2); },
      vic(ctx, v, fy, t, it) { const g = V(v, fy); ctx.globalAlpha = fade(it); for (let i = 0; i < 3; i++) ring(ctx, g.x, fy - 20, 10 + ((t * 2 + i * 12) % 36), 4 + ((t * 2 + i * 12) % 36) * 0.3, i % 2 ? '#ff60a0' : '#2ad0c0', 2); } },
    olu: { kind: 'shot', name: 'One in the Chamber', fire: 44, total: 84, color: '#ffd75a', open: 'ONE.', koText: 'CALLED IT.', sfx: 'ready', proj: { speed: 15, size: 10, height: 0.62, art: 'crazyBullet', sound: 'boom' },
      about: 'One round. He takes his time lining it up. You can see exactly where it is going.',
      tick(f, sc, t) { if (t === 44) { sc.flash = Math.max(sc.flash, 5); sc.shake = Math.max(sc.shake, 8); } },
      draw(f, ctx, fy, t) { if (t < 8 || t > 50) return; const y = fy - f.body.height * 0.62 - 4, x = f.x + f.facing * 14; if (t < 44) { if (t < 30 || (t >> 1) % 2) R(ctx, 'rgba(255,215,90,0.75)', f.facing > 0 ? x : 0, y, f.facing > 0 ? 400 - x : x, 1); R(ctx, '#ffffff', x - 1, y - 1, 3, 3); } else { for (let i = 0; i < 8; i++) { const a = i * 0.785; R(ctx, i % 2 ? '#ffffff' : '#ffd75a', x + f.facing * 6 + Math.cos(a) * (4 + (t - 44) * 2), y + Math.sin(a) * (4 + (t - 44) * 2), 3, 3); } } },
      vic(ctx, v, fy, t, it) { ctx.globalAlpha = fade(it); ring(ctx, v.x, fy - 40 - Math.min(16, t * 0.5), 9, 3, '#ffd75a', 2); } },
    // ------------------------------------------------ GRAB
    simon: { kind: 'grab', name: 'One Knee', speed: 9, dashLen: 12, koAfter: 32, total: 96, color: '#ffd060', open: 'ONE KNEE.', koText: 'THAT IS ALL I NEED.', sfx: 'whoosh', lines: [[4, 'THAT IS ALL I NEED.']],
      about: 'He told you. One knee. This is the one.',
      onHook(f, sc) { sc.flash = Math.max(sc.flash, 6); sc.hitstop = Math.max(sc.hitstop || 0, 10); },
      anim: (f, t) => (t < 10 ? ['crouch', 0] : ['uppercut', 1]),
      draw(f, ctx, fy, t, d, k) { if (t >= 10 && k < 0) for (let i = 0; i < 6; i++) R(ctx, i % 2 ? '#ffd060' : '#fff6c0', f.x - f.facing * (10 + i * 9), fy - 20 - (i * 11) % 40, 9, 2); },
      vic(ctx, v, fy, t, it) { const g = V(v, fy); if (t > 26) return; const a = 1 - t / 26; ctx.globalAlpha = a; ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { const an = i * 0.628; ctx.beginPath(); ctx.moveTo(g.x + Math.cos(an) * 8, g.head + 6 + Math.sin(an) * 8); ctx.lineTo(g.x + Math.cos(an) * (14 + t * 1.6), g.head + 6 + Math.sin(an) * (14 + t * 1.6)); ctx.stroke(); } ring(ctx, g.x, g.head + 6, 6 + t * 2, 6 + t * 2, '#ffffff', 2); } },
    loor: { kind: 'grab', name: 'Twelve Rounds', speed: 8, koAfter: 78, total: 140, color: '#ff4030', open: 'DING DING.', koText: 'T.K.O.', sfx: 'bell',
      about: 'All twelve rounds, in about a second and a half.',
      tick(f, sc, k, d, opp) { if (k % 6 === 0 && k < 72) { sc.shake = Math.max(sc.shake, 4); RF.audio.sfx('hit'); sc.effects.spawn('hit', opp.x + (hash(k) - 0.5) * 16, opp.body.height * (0.4 + hash(k + 2) * 0.45)); } if (k === 72) RF.audio.sfx('bell'); },
      anim: (f, t) => (t < 10 ? ['crouch', 0] : [(t >> 2) % 2 ? 'light' : 'heavy', 1]),
      vic(ctx, v, fy, t, it) { const g = V(v, fy), n = Math.min(12, Math.floor(t / 6) + 1); ctx.globalAlpha = fade(it); T(ctx, 'ROUND', g.x, g.top - 30, '#ffffff'); T(ctx, String(n), g.x, g.top - 22, n === 12 ? '#ffd030' : '#ff4030', 2); } },
    ringer: { kind: 'grab', name: 'For Whom the Bell Tolls', speed: 5, dashLen: 14, reach: 20, koAfter: 80, total: 150, color: '#e8b030', open: '...', koText: 'IT TOLLS FOR THEE.', sfx: 'bell',
      about: 'It puts the bell over you. Then it rings the bell.',
      tick(f, sc, k, d, opp) { if (k === 20 || k === 40 || k === 60) { sc.shake = Math.max(sc.shake, 12); RF.audio.sfx('bell'); sc.effects.spawnText('DONG', opp.x, opp.body.height + 30, '#ffd75a'); } },
      anim: (f, t) => (t < 10 ? ['crouch', 0] : ['heavy', (t >> 3) % 2 ? 1 : 2]),
      vic(ctx, v, fy, t, it) { const g = V(v, fy), dropY = Math.min(0, (t - 8) * 12), hit = t >= 20 && t < 68 ? Math.sin(t * 1.6) * Math.max(0, 3 - ((t - 20) % 20) * 0.3) : 0; if (v.isKO && t > it.len - 30) return; ctx.globalAlpha = fade(it, 10); ctx.save(); ctx.translate(g.x + hit, dropY);
        const top = g.top - 12, w = g.w + 22, path = (s) => { ctx.beginPath(); ctx.moveTo(-w * 0.28 * s, top); ctx.lineTo(w * 0.28 * s, top); ctx.lineTo(w * 0.5 * s, g.feet - 8); ctx.lineTo(w * 0.62 * s, g.feet); ctx.lineTo(-w * 0.62 * s, g.feet); ctx.lineTo(-w * 0.5 * s, g.feet - 8); ctx.closePath(); };
        path(1.06); ctx.fillStyle = '#111'; ctx.fill(); path(1); ctx.fillStyle = '#c08a30'; ctx.fill(); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(-w * 0.2, top + 4, 4, g.h - 6); ctx.fillStyle = '#7a5a10'; ctx.fillRect(-w * 0.6, g.feet - 6, w * 1.2, 2); R(ctx, '#111', -4, top - 8, 8, 8); ctx.restore();
        for (const k of [20, 40, 60]) if (t >= k && t < k + 18) { ctx.globalAlpha = 1 - (t - k) / 18; ring(ctx, g.x, g.mid, 20 + (t - k) * 4, 24 + (t - k) * 3, '#fff6d0', 2); } } },
  };

  // ---------------------------------------------------------------- things that cross the stage
  Object.assign(RF.PROJECTILE_ART, {
    crazyScroll(ctx, x, y, t, dir, p, floorY) {
      const cy = floorY - 14; for (let i = 0; i < 9; i++) { R(ctx, '#111', x - dir * (10 + i * 8) - 4, floorY - 3, 9, 4); R(ctx, '#e8d8a8', x - dir * (10 + i * 8) - 4, floorY - 2, 8, 2); if (i % 2) R(ctx, '#8a7a5a', x - dir * (10 + i * 8) - 2, floorY - 1, 4, 1); }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, cy, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#e8d8a8'; ctx.beginPath(); ctx.arc(x, cy, 14, 0, 7); ctx.fill();
      ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 26; i++) { const a = t * 0.3 * dir + i * 0.5, r = i * 0.5; i ? ctx.lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(x, cy); } ctx.stroke(); ctx.lineWidth = 1;
    },
    crazyCart(ctx, x, y, t, dir, p, floorY) {
      ctx.save(); ctx.translate(Math.round(x), floorY + Math.round(Math.sin(t) * 0.6)); ctx.scale(dir, 1);
      for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.5 - i * 0.09; ctx.fillStyle = '#d8ccb8'; ctx.beginPath(); ctx.arc(-26 - i * 8, -4 - (i % 2) * 3, 4 + i, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
      R(ctx, '#111', -21, -22, 42, 16); R(ctx, '#f4f4f0', -20, -21, 40, 14); R(ctx, '#0a7a4a', -20, -12, 40, 3); R(ctx, '#111', -18, -40, 2, 20); R(ctx, '#111', 12, -40, 2, 20); R(ctx, '#111', -22, -43, 40, 5); R(ctx, '#0a7a4a', -21, -42, 38, 3);
      R(ctx, '#3a2a1a', -19, -34, 6, 14); R(ctx, '#c8c8d0', -18, -40, 1, 8); R(ctx, '#c8c8d0', -15, -39, 1, 7); R(ctx, '#ffe27a', 19, -18, 2, 3);
      for (const wx of [-12, 12]) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(wx, -5, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#8a8a96'; ctx.beginPath(); ctx.arc(wx, -5, 2.5, 0, 7); ctx.fill(); R(ctx, '#111', wx + Math.cos(t * 0.6) * 4, -5 + Math.sin(t * 0.6) * 4, 1, 1); }
      ctx.restore();
    },
    crazyTeam(ctx, x, y, t, dir, p, floorY) {
      const sp = sprite('mikey'); for (let i = 2; i >= 0; i--) { for (let k = 0; k < 3; k++) R(ctx, 'rgba(255,255,255,0.45)', x - dir * (22 * i + 24 + k * 7), floorY - 24 - k * 14 - i * 4, 8, 1); sp.draw(ctx, 'walk', (t / 3 + i) % 4, x - dir * i * 22, floorY, dir, i ? (i === 1 ? '#0a5a38' : '#083a26') : undefined); }
    },
    crazyRiff(ctx, x, y, t, dir) {
      ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { ctx.strokeStyle = i % 2 ? '#2ad0c0' : '#ff60a0'; ctx.globalAlpha = 1 - i * 0.16; ctx.beginPath(); ctx.arc(x - dir * (i * 9 + 10), y, 24 - i * 2, dir > 0 ? -1.1 : Math.PI - 1.1, dir > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke(); } ctx.globalAlpha = 1; ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff'; ctx.beginPath(); for (let i = 0; i < 7; i++) { const px = x + dir * (14 - i * 7), py = y + (i % 2 ? -7 : 7) * (1 + (t % 3) * 0.2); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.lineWidth = 1;
      if (RF.drawNote) for (let i = 0; i < 3; i++) RF.drawNote(ctx, x - dir * (20 + i * 14), y - 22 + ((t * 2 + i * 9) % 44), i % 2 ? '#ff60a0' : '#2ad0c0', 1);
    },
    crazyBullet(ctx, x, y, t, dir) {
      for (let i = 1; i < 9; i++) R(ctx, `rgba(255,215,90,${0.7 - i * 0.08})`, x - dir * i * 6 - 3, y - (i < 3 ? 1 : 0), 6, i < 3 ? 3 : 1);
      R(ctx, '#111', x - 5, y - 2, 10, 5); R(ctx, '#ffd75a', x - 4, y - 1, 8, 3); R(ctx, '#ffffff', x + dir * 2 - 1, y - 1, 2, 1);
    },
  });

  // ---------------------------------------------------------------- register them
  for (const id in MOVES) {
    const m = MOVES[id], d = RF.getCharacter(id); if (!d) continue;
    const key = 'crazy_' + id, total = m.total || (m.kind === 'drop' ? (m.hit || 56) + 44 : 140);
    STY[key] = KIND[m.kind](m);
    RF.SPECIALS[key] = S({ name: m.name, style: key, total, description: m.about });
    d.crazy = CRAZY[id] = { special: key, afterKO: true, kind: m.kind,
      aiRange: m.kind === 'look' ? m.range - 30 : m.kind === 'grab' ? Math.round((m.speed || 8) * (m.dashLen || 11) * 0.8) : 280 };
  }
  RF.CRAZY_MOVES = MOVES;
})();
