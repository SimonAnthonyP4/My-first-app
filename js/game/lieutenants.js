// THE HEADMASTER'S THREE, PLAYABLE: the Proctor, the Bell Ringer and the Eraser. They were story-only
// (RF.EXTRAS); now they are on the roster. Drawn without arms, so every attack here is an effect:
//   THE PROCTOR     a clock-hand sweep; floats; his dash is TIME SKIP (a blink, two minutes early)
//   THE BELL RINGER slowest and heaviest, with armour on his heavies; every hit is a ring of sound,
//                   and TOLL THE BELL sends one rolling across the floor
//   THE ERASER      fastest; chalk swipes with a felt block; his dash is a blink: he is rubbed out here
//                   and drawn in there
(function () {
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const when = (f) => { const m = f.move, t = f.stateTime; return m && t >= m.startup - 3 && t <= m.startup + m.active + 8 ? { m, age: t - (m.startup - 3), life: m.active + 11 } : null; };

  // ---- the attacks ----
  // a clock hand swung round from behind to in front (pivot at the shoulder)
  const sweep = (len, col) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return;
    const u = Math.min(1, w.age / (w.m.active + 4)), a = -2.3 + 2.8 * u, px = f.x + f.facing * 8, py = floorY - f.y - f.body.height * 0.6;
    ctx.save(); ctx.translate(px, py); ctx.scale(f.facing, 1);
    for (let i = 5; i >= 0; i--) {      // the hand, and the fading trail of where it was
      ctx.globalAlpha = Math.max(0, (1 - w.age / w.life) * (1 - i * 0.17)); ctx.save(); ctx.rotate(a - i * 0.16);
      R(ctx, '#0a0810', 3, -3, len, 6); R(ctx, col, 4, -2, len - 2, 4); R(ctx, '#c8202c', len - 6, -3, 6, 6); ctx.restore();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  // rings of sound, rolling out from the bell
  const ring = (reach, col) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return;
    ctx.save(); ctx.translate(f.x + f.facing * 20, floorY - f.y - f.body.height * 0.5); ctx.scale(f.facing, 1); ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const r = w.age * (reach / w.life) * 1.6 - i * 9; if (r <= 2) continue;
      ctx.globalAlpha = Math.max(0, 1 - r / (reach * 1.05)); ctx.strokeStyle = i % 2 ? '#fff6d0' : col;
      ctx.beginPath(); ctx.ellipse(r * 0.55, 0, r * 0.45, r * 0.8, 0, -1.3, 1.3); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  // a swipe of chalk with a felt block at the end of it
  const chalk = (reach) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return;
    const y = floorY - f.y - f.body.height * 0.52, x0 = f.x + f.facing * 14, len = Math.min(reach, 8 + w.age * 11), a = Math.max(0, 1 - w.age / w.life);
    ctx.globalAlpha = a;
    for (let i = 0; i < 14; i++) { const u = i / 13, xx = x0 + f.facing * len * u, yy = y + Math.sin(u * 6 + w.age * 0.6) * 5 - u * 4; R(ctx, i % 3 ? '#f4f0e6' : '#b8b4a8', xx, yy, 3 + (i % 2), 3); }
    const bx = x0 + f.facing * len;
    R(ctx, '#111', bx - 5, y - 8, 11, 14); R(ctx, '#6a4a2a', bx - 4, y - 7, 9, 5); R(ctx, '#e8e4d8', bx - 4, y - 2, 9, 7);
    ctx.globalAlpha = 1;
  };
  Object.assign(RF.MOVE_FX, {
    clockJab: sweep(40, '#e8e0c8'), clockSlash: sweep(58, '#fff6d0'),
    bellTap: ring(52, '#e8b030'), bellToll: ring(86, '#ffd75a'),
    chalkFlick: chalk(52), chalkWipe: chalk(70),
  });
  // TOLL THE BELL: a big ring that rolls along the floor
  RF.PROJECTILE_ART.bellWave = function (ctx, x, y, t, dir) {
    for (let i = 0; i < 3; i++) { const k = ((t * 0.12 + i / 3) % 1); ctx.globalAlpha = 0.9 * (1 - k); ctx.strokeStyle = i % 2 ? '#fff6d0' : '#e8b030'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x - dir * k * 22, y, 7 + k * 8, 17 + k * 8, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1; R(ctx, '#111', x - 6, y - 8, 12, 14); R(ctx, '#c08a30', x - 5, y - 7, 10, 12); R(ctx, '#fff0a0', x - 5, y - 7, 10, 2); R(ctx, '#111', x - 1, y + 5, 3, 3);
  };
  RF.SPECIALS.tollBell = {
    name: 'Toll the Bell', description: 'Rings it once, along the floor. Everything in its path is a little deafer.',
    kind: 'projectile', startup: 14, recovery: 22, speed: 4.4, size: 26, height: 0.28, damage: 16, hitstun: 30, blockstun: 16, pushback: 9, hitstop: 12,
    art: 'bellWave', sound: 'bell', hitText: 'DONG!', colors: ['#fff6d0', '#e8b030', '#7a5a10'],
  };

  // ---- the roster ----
  const patch = {
    proctor: { moves: { light: { fx: 'clockJab', fxSound: 'whoosh', startup: 7, active: 4, recovery: 13, damage: 6, pushback: 4, hitbox: { x: 10, y: 30, w: 52, h: 34 } },
                         heavy: { fx: 'clockSlash', fxSound: 'clang', startup: 11, active: 6, recovery: 19, damage: 14, hitstun: 26, blockstun: 14, pushback: 7, knockback: 10, hitstop: 10, hitbox: { x: 8, y: 16, w: 72, h: 64 } } },
      teleport: 96, dashTime: 9, tpCols: ['#e8e0c8', '#c8202c'], stats: { damage: 1.16 },
      sprite: { hover: 7 },
      rivalQuote: { lopez: 'HEADMASTER. YOU ARE LATE TO YOUR OWN FIGHT.', riley: 'KEEPER. I KEEP TIME. YOU KEEP DOORS. WE SHOULD COMPARE NOTES.', brady: 'MS. BRADY. YOU TIMED ME. TWICE. HOW DARE YOU.' },
      ending: ['THE PROCTOR WON.', 'IT LOOKED AT ITS OWN FACE.', 'IT WAS TWO MINUTES TO MIDNIGHT.', 'IT WAS NEVER ANYTHING ELSE.', 'FOR THE FIRST TIME, THE CLOCK RAN.'] },
    ringer: { moves: { light: { fx: 'bellTap', fxSound: 'bell', startup: 9, active: 5, recovery: 16, damage: 8, pushback: 6, hitbox: { x: 10, y: 28, w: 62, h: 44 } },
                        heavy: { fx: 'bellToll', fxSound: 'boom', startup: 15, active: 7, recovery: 23, damage: 18, hitstun: 30, blockstun: 16, pushback: 10, knockback: 13, hitstop: 13, hitbox: { x: 6, y: 14, w: 92, h: 70 } } },
      special: 'tollBell',
      rivalQuote: { lopez: '...', olu: 'DONG.', sirven: 'THE BELL. IS. HIS.' },
      ending: ['THE BELL RINGER WON.', 'IT SET THE BELL DOWN.', 'THE SCHOOL WAS SO QUIET', 'THAT YOU COULD HEAR THE ECHO', 'OF EVERY BELL IT HAD EVER RUNG.'] },
    eraser: { moves: { light: { fx: 'chalkFlick', fxSound: 'paper', startup: 6, active: 4, recovery: 11, damage: 5, pushback: 4, hitbox: { x: 10, y: 40, w: 60, h: 24 } },
                        heavy: { fx: 'chalkWipe', fxSound: 'paper', startup: 9, active: 5, recovery: 15, damage: 13, hitstun: 26, blockstun: 14, pushback: 6, knockback: 9, hitstop: 10, hitbox: { x: 8, y: 26, w: 76, h: 44 } } },
      teleport: 110, dashTime: 8, tpCols: ['#f4f0e6', '#b8b4a8'],
      rivalQuote: { lopez: 'SHHHH. HEADMASTER. YOU WERE NEVER ON THE ROLL.', nicholas: 'WHO ARE YOU? WHO WAS I ABOUT TO ERASE?' },
      ending: ['THE ERASER WON.', 'IT ERASED THE BOARD.', 'THEN THE DESKS. THEN THE CHAIRS.', 'THEN IT ERASED ITSELF.', 'NOBODY ASKED WHERE IT WENT.'] },
  };
  for (const id of Object.keys(patch)) {
    const i = RF.EXTRAS.findIndex((c) => c.id === id); if (i < 0) continue;
    const d = RF.EXTRAS.splice(i, 1)[0], p = patch[id];
    d.moves = { light: Object.assign({}, d.moves.light, p.moves.light), heavy: Object.assign({}, d.moves.heavy, p.moves.heavy) };
    for (const k of ['special', 'teleport', 'dashTime', 'tpCols', 'rivalQuote', 'ending']) if (p[k] !== undefined) d[k] = p[k];
    if (p.stats) d.stats = Object.assign({}, d.stats, p.stats);
    d.sprite = Object.assign({}, d.sprite, p.sprite || {}, { poses: {   // a lunge, not a kick (no arms to swing): the effects are the attack
      idle: [{}, { head: [0, -1], torso: [0, -1] }],
      light: [{ head: [-1, 0] }, { head: [2, 0], torso: [1, 0] }, { head: [1, 0] }],
      heavy: [{ head: [-2, -1], torso: [-1, 0] }, { head: [3, 1], torso: [3, 1] }, { head: [1, 0], torso: [1, 0] }],
      special: [{ head: [-1, -1] }, { head: [1, 0], torso: [1, 0] }, { head: [0, 0] }],
    } });
    d.lieutenant = false; d.archetype = id === 'ringer' ? 'tank' : id === 'eraser' ? 'light' : 'balanced';
    RF.CHARACTERS.push(d);
  }
})();
