// THE HEADMASTER'S THREE, PLAYABLE: the Proctor, the Bell Ringer and the Eraser. They were story-only
// (RF.EXTRAS); now they are on the roster. Drawn without arms, so every attack is an effect, and each
// of the seven attacks has its own:
//   THE PROCTOR     TIME. Floats, blinks (Time Skip), and his heavy REWINDS you toward him. A clock hand
//                   for every move: jabs, a full midnight sweep, a hand dropped straight down from the air,
//                   a clock that spins up under you, a hand dragged along the floor. Block: a clock face.
//   THE BELL RINGER WEIGHT. Slowest, with armour on every heavy. Every hit is a ring of sound; the air
//                   heavy is a ground pound, the launcher rings upward, the low heavy is a quake along the
//                   floor. TOLL THE BELL rolls one across the room. Block: he pulls the bell down over him.
//   THE ERASER      SPEED. Blinks, and every attack is a stroke of chalk with the felt block at the end of it:
//                   flicks, a long wipe, a slam from above, a swipe up, the floor wiped clean. Block: a wall
//                   of scribble, with a cross through your attack.
(function () {
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const when = (f) => { const m = f.move, t = f.stateTime; return m && t >= m.startup - 3 && t <= m.startup + m.active + 8 ? { m, age: t - (m.startup - 3), life: m.active + 11 } : null; };
  const centre = (f, floorY, w) => ({ x: f.x + f.facing * (w.m.hitbox.x + w.m.hitbox.w / 2), y: floorY - f.y - (w.m.hitbox.y + w.m.hitbox.h / 2) });   // where the attack lands

  // ---------------------------------------------------------------- the attacks
  // a clock hand swung round a pivot at the shoulder, from angle a0 to a1 (radians, facing right; 0 = straight ahead)
  const hand = (len, col, a0, a1, up) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return;
    const u = Math.min(1, w.age / (w.m.active + 4)), a = a0 + (a1 - a0) * u, px = f.x + f.facing * 8, py = floorY - f.y - f.body.height * (up == null ? 0.6 : up);
    ctx.save(); ctx.translate(px, py); ctx.scale(f.facing, 1);
    for (let i = 5; i >= 0; i--) {
      ctx.globalAlpha = Math.max(0, (1 - w.age / w.life) * (1 - i * 0.17)); ctx.save(); ctx.rotate(a - i * 0.16 * Math.sign(a1 - a0));
      R(ctx, '#0a0810', 3, -3, len, 6); R(ctx, col, 4, -2, len - 2, 4); R(ctx, '#c8202c', len - 6, -3, 6, 6); ctx.restore();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  // a clock that spins: the face itself (the launcher), centred on where it hits
  const clockFace = (col) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return; const c = centre(f, floorY, w), r = 11 + w.age * 1.4;
    ctx.save(); ctx.translate(c.x, c.y - w.age * 2); ctx.globalAlpha = Math.max(0, 1 - w.age / w.life);
    ctx.fillStyle = '#0a0810'; ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.rotate(w.age * 0.6); R(ctx, '#0a0810', -1, -r + 2, 2, r - 2); ctx.rotate(-w.age * 0.4); R(ctx, '#c8202c', -1, -r + 4, 2, r - 4);
    ctx.restore(); ctx.globalAlpha = 1;
  };
  // rings of sound that spread from where the attack lands (vertical: tall rings, for a launcher; flat: for a quake)
  const burst = (reach, col, shape) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return; const c = centre(f, floorY, w);
    ctx.save(); ctx.translate(c.x, shape === 'flat' ? floorY - f.y : c.y); ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const r = w.age * (reach / w.life) * 1.5 - i * 8; if (r <= 2) continue;
      ctx.globalAlpha = Math.max(0, 1 - r / (reach * 1.05)); ctx.strokeStyle = i % 2 ? '#fff6d0' : col; ctx.beginPath();
      if (shape === 'flat') ctx.ellipse(f.facing * r * 0.7, -3, r * 0.9, 5 + r * 0.12, 0, Math.PI, 0, f.facing < 0); else if (shape === 'tall') ctx.ellipse(0, -r * 0.4, r * 0.5, r, 0, 0, 7); else ctx.ellipse(f.facing * r * 0.25, 0, r * 0.45, r * 0.8, 0, 0, 7);
      ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    if (shape === 'flat' && w.age === 2) RF.audio && RF.audio.sfx && RF.audio.sfx('rumble');
  };
  // a stroke of chalk from the body to where it lands, with the felt block at the end
  const chalk = (dust) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return; const c = centre(f, floorY, w), x0 = f.x + f.facing * 12, y0 = floorY - f.y - f.body.height * 0.55;
    const u = Math.min(1, w.age / (w.m.active + 3)), a = Math.max(0, 1 - w.age / w.life);
    ctx.globalAlpha = a;
    for (let i = 0; i < 16; i++) { const t = (i / 15) * u, xx = x0 + (c.x - x0) * t + f.facing * Math.sin(t * 9 + w.age) * 2, yy = y0 + (c.y - y0) * t + Math.sin(t * 7 + w.age * 0.6) * (dust ? 4 : 2); R(ctx, i % 3 ? '#f4f0e6' : '#b8b4a8', xx, yy, 3 + (i % 2), 3); }
    const bx = x0 + (c.x - x0) * u, by = y0 + (c.y - y0) * u;
    R(ctx, '#111', bx - 5, by - 7, 11, 14); R(ctx, '#6a4a2a', bx - 4, by - 6, 9, 5); R(ctx, '#e8e4d8', bx - 4, by - 1, 9, 5);
    ctx.globalAlpha = 1;
  };
  Object.assign(RF.MOVE_FX, {
    clockJab: hand(36, '#e8e0c8', -2.2, 0.3), clockSlash: hand(58, '#fff6d0', -2.3, 0.5), clockTick: hand(30, '#e8e0c8', -1.4, 1.6),
    clockDive: hand(52, '#fff6d0', -2.9, 1.2, 0.85), clockRewind: clockFace('#f4ecd0'), clockSweep: hand(60, '#e8e0c8', 0.5, -0.1, 0.12),
    bellTap: burst(52, '#e8b030'), bellToll: burst(86, '#ffd75a'), bellDrop: burst(80, '#ffd75a', 'flat'), bellUp: burst(70, '#e8b030', 'tall'), bellQuake: burst(96, '#c08a30', 'flat'),
    chalkFlick: chalk(false), chalkWipe: chalk(true),
  });

  // ---------------------------------------------------------------- blocking
  const guard = (f, floorY) => { const hurt = f.getHurtbox(); return hurt ? { hurt, base: floorY - f.y, top: floorY - f.y - hurt.h, mid: floorY - f.y - hurt.h / 2, k: f.shieldHit > 0 ? f.shieldHit / 12 : 0 } : null; };
  Object.assign(RF.BLOCK_FX, {
    // a clock face held up, the hands whirling; a hit stops it dead ("TICK.")
    timeBarrier(f, ctx, floorY, t) {
      const g = guard(f, floorY); if (!g) return; const x = f.x + f.facing * (f.body.width / 2 + 10), r = 15 + g.k * 3;
      ctx.save(); ctx.translate(x, g.mid - 6); ctx.globalAlpha = 0.55 + g.k * 0.45;
      ctx.fillStyle = '#0a0810'; ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, 7); ctx.fill(); ctx.fillStyle = g.k > 0.4 ? '#ffffff' : '#f4ecd0'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R(ctx, '#0a0810', Math.sin(a) * (r - 3), -Math.cos(a) * (r - 3), 2, 2); }
      const spin = g.k > 0 ? 0 : t * 0.5; ctx.rotate(spin); R(ctx, '#0a0810', -1, -r + 3, 2, r - 3); ctx.rotate(spin * 0.17); R(ctx, '#c8202c', -1, -r + 5, 2, r - 5);
      ctx.restore(); ctx.globalAlpha = 1;
      if (g.k > 0.4) RF.font.drawText(ctx, 'TICK.', f.x, g.top - 22, { align: 'center', color: '#f4ecd0', outline: '#000' });
    },
    // he pulls the bell down over his shoulders: a gold dome that rings when it is hit
    bellDome(f, ctx, floorY, t) {
      const g = guard(f, floorY); if (!g) return; const r = f.body.height * 0.62;
      ctx.save(); ctx.globalAlpha = 0.28 + 0.5 * g.k;
      const gr = ctx.createRadialGradient(f.x, g.mid, r * 0.4, f.x, g.mid, r); gr.addColorStop(0, 'rgba(255,200,80,0.05)'); gr.addColorStop(1, g.k > 0.4 ? 'rgba(255,255,255,0.9)' : 'rgba(232,176,48,0.75)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, g.base, r * 1.15, Math.PI, 0); ctx.fill();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, g.base, r * 1.15, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 1;
      if (g.k > 0) { ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { ctx.globalAlpha = g.k * (1 - i * 0.4); ctx.beginPath(); ctx.arc(f.x, g.base, r * (1.2 + (1 - g.k) * 0.5 + i * 0.2), Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); } ctx.lineWidth = 1; }
      ctx.restore(); ctx.globalAlpha = 1;
      if (g.k > 0.4) RF.font.drawText(ctx, 'DONG!', f.x, g.top - 22, { align: 'center', color: '#ffd75a', outline: '#000' });
    },
    // a wall of scribble drawn in front of him; each hit crosses itself out
    chalkWall(f, ctx, floorY, t) {
      const g = guard(f, floorY); if (!g) return; const x = f.x + f.facing * (f.body.width / 2 + 8), top = g.top + 4, h = g.hurt.h - 8, grow = Math.min(1, f.stateTime / 6);
      ctx.save(); ctx.globalAlpha = 0.5 + g.k * 0.5; ctx.strokeStyle = '#f4f0e6'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 6 * f.facing, top + h * (1 - grow), 12 * f.facing, h * grow);
      for (let i = 0; i < 7; i++) { const y = top + (i / 6) * h * grow; ctx.beginPath(); ctx.moveTo(x - 6 * f.facing, y + 2); ctx.lineTo(x + 6 * f.facing, y - 2 + (i % 2) * 4); ctx.stroke(); }
      if (g.k > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 9 * f.facing, top); ctx.lineTo(x + 9 * f.facing, top + h); ctx.moveTo(x + 9 * f.facing, top); ctx.lineTo(x - 9 * f.facing, top + h); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
      if (g.k > 0.4) RF.font.drawText(ctx, 'ERASED.', f.x, g.top - 22, { align: 'center', color: '#f4f0e6', outline: '#000' });
    },
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

  // ---------------------------------------------------------------- the roster
  const POSES = {   // a lunge, not a kick (no arms to swing): the effects are the attack; and a real block
    idle: [{}, { head: [0, -1], torso: [0, -1] }],
    light: [{ head: [-1, 0] }, { head: [2, 0], torso: [1, 0] }, { head: [1, 0] }],
    heavy: [{ head: [-2, -1], torso: [-1, 0] }, { head: [3, 1], torso: [3, 1] }, { head: [1, 0], torso: [1, 0] }],
    special: [{ head: [-1, -1] }, { head: [1, 0], torso: [1, 0] }, { head: [0, 0] }],
    lowLight: [{ crouch: true, head: [0, 0] }, { crouch: true, head: [2, 0], torso: [1, 0] }, { crouch: true, head: [1, 0] }],
    lowHeavy: [{ crouch: true, head: [-2, 0], torso: [-1, 0] }, { crouch: true, head: [3, 1], torso: [3, 1] }, { crouch: true, head: [1, 0], torso: [1, 0] }],
    uppercut: [{ head: [-1, 1] }, { head: [1, -2], torso: [1, -1] }, { head: [0, -1] }],
    block: [{ head: [-2, 2], torso: [-1, 1] }],
    crouchBlock: [{ crouch: true, head: [-2, 1], torso: [-1, 0] }],
  };
  const patch = {
    proctor: {
      blockFx: 'timeBarrier', teleport: 96, dashTime: 9, tpCols: ['#e8e0c8', '#c8202c'], stats: { damage: 1.2, damageReduction: 0.07 }, sprite: { hover: 7 },
      moves: {
        light: { fx: 'clockJab', fxSound: 'whoosh', startup: 6, active: 4, recovery: 12, damage: 5, pushback: 4, hitbox: { x: 10, y: 30, w: 50, h: 34 } },                                  // tick
        heavy: { fx: 'clockSlash', fxSound: 'clang', startup: 11, active: 6, recovery: 19, damage: 12, hitstun: 26, blockstun: 14, pushback: 5, knockback: 5, pull: 3.4, hitstop: 10, hitbox: { x: 8, y: 16, w: 72, h: 64 } },   // REWIND: it drags you in
        airLight: { fx: 'clockTick', fxSound: 'whoosh', startup: 4, active: 7, recovery: 6, damage: 4, hitbox: { x: 4, y: 10, w: 40, h: 40 } },
        airHeavy: { fx: 'clockDive', fxSound: 'clang', startup: 8, active: 8, recovery: 12, damage: 11, knockback: 8, hitbox: { x: 2, y: -16, w: 46, h: 62 } },                                // the hand, dropped from above
        launcher: { fx: 'clockRewind', fxSound: 'arcane', startup: 9, active: 5, recovery: 22, hitbox: { x: 2, y: 24, w: 46, h: 76 } },
        lowLight: { fx: 'clockJab', fxSound: 'whoosh', startup: 5, active: 3, recovery: 9, damage: 4, hitbox: { x: 10, y: 8, w: 46, h: 22 } },
        lowHeavy: { fx: 'clockSweep', fxSound: 'clang', startup: 11, active: 5, recovery: 22, damage: 10, hitbox: { x: 6, y: 0, w: 66, h: 14 } },                                               // the minute hand, along the floor
      },
      rivalQuote: { lopez: 'HEADMASTER. YOU ARE LATE TO YOUR OWN FIGHT.', riley: 'KEEPER. I KEEP TIME. YOU KEEP DOORS. WE SHOULD COMPARE NOTES.', brady: 'MS. BRADY. YOU TIMED ME. TWICE. HOW DARE YOU.' },
      ending: ['THE PROCTOR WON.', 'IT LOOKED AT ITS OWN FACE.', 'IT WAS TWO MINUTES TO MIDNIGHT.', 'IT WAS NEVER ANYTHING ELSE.', 'FOR THE FIRST TIME, THE CLOCK RAN.'],
    },
    ringer: {
      blockFx: 'bellDome', special: 'tollBell',
      moves: {
        light: { fx: 'bellTap', fxSound: 'bell', startup: 9, active: 5, recovery: 16, damage: 8, pushback: 6, hitbox: { x: 10, y: 28, w: 62, h: 44 } },
        heavy: { fx: 'bellToll', fxSound: 'boom', startup: 15, active: 7, recovery: 23, damage: 18, hitstun: 30, blockstun: 16, pushback: 10, knockback: 14, hitstop: 13, hitbox: { x: 6, y: 14, w: 92, h: 70 } },
        airLight: { fx: 'bellTap', fxSound: 'bell', startup: 6, active: 6, recovery: 9, damage: 7, hitbox: { x: 4, y: 6, w: 50, h: 46 } },
        airHeavy: { fx: 'bellDrop', fxSound: 'stomp', startup: 10, active: 8, recovery: 16, damage: 16, knockback: 9, hitstop: 12, hitbox: { x: 0, y: -14, w: 66, h: 56 } },                     // the ground pound
        launcher: { fx: 'bellUp', fxSound: 'bell', startup: 12, active: 5, recovery: 26, damage: 9, hitbox: { x: 2, y: 20, w: 58, h: 86 } },
        lowLight: { fx: 'bellTap', fxSound: 'bell', startup: 7, active: 4, recovery: 12, damage: 6, hitbox: { x: 8, y: 6, w: 56, h: 26 } },
        lowHeavy: { fx: 'bellQuake', fxSound: 'stomp', startup: 14, active: 6, recovery: 26, damage: 14, hitbox: { x: 0, y: 0, w: 96, h: 16 } },                                              // the quake, along the floor
      },
      rivalQuote: { lopez: '...', olu: 'DONG.', sirven: 'THE BELL. IS. HIS.' },
      ending: ['THE BELL RINGER WON.', 'IT SET THE BELL DOWN.', 'THE SCHOOL WAS SO QUIET', 'THAT YOU COULD HEAR THE ECHO', 'OF EVERY BELL IT HAD EVER RUNG.'],
    },
    eraser: {
      blockFx: 'chalkWall', teleport: 96, dashTime: 9, tpCols: ['#f4f0e6', '#b8b4a8'], stats: { damage: 0.93, attackSpeed: 1.12, damageReduction: 0.02 },
      moves: {
        light: { fx: 'chalkFlick', fxSound: 'paper', startup: 5, active: 4, recovery: 10, damage: 4, pushback: 4, hitbox: { x: 10, y: 40, w: 58, h: 24 } },
        heavy: { fx: 'chalkWipe', fxSound: 'paper', startup: 9, active: 5, recovery: 17, damage: 12, hitstun: 24, blockstun: 13, pushback: 6, knockback: 8, hitstop: 9, hitbox: { x: 8, y: 26, w: 70, h: 44 } },
        airLight: { fx: 'chalkFlick', fxSound: 'paper', startup: 4, active: 6, recovery: 6, damage: 4, hitbox: { x: 6, y: 10, w: 44, h: 30 } },
        airHeavy: { fx: 'chalkWipe', fxSound: 'paper', startup: 7, active: 7, recovery: 10, damage: 10, hitbox: { x: 4, y: -12, w: 48, h: 50 } },                                                    // the block, brought down
        launcher: { fx: 'chalkWipe', fxSound: 'paper', startup: 8, active: 5, recovery: 20, hitbox: { x: 4, y: 28, w: 40, h: 70 } },
        lowLight: { fx: 'chalkFlick', fxSound: 'paper', startup: 4, active: 3, recovery: 8, damage: 3, hitbox: { x: 8, y: 6, w: 50, h: 20 } },
        lowHeavy: { fx: 'chalkWipe', fxSound: 'paper', startup: 10, active: 5, recovery: 20, damage: 9, hitbox: { x: 4, y: 0, w: 74, h: 14 } },                                                   // the floor, wiped
      },
      rivalQuote: { lopez: 'SHHHH. HEADMASTER. YOU WERE NEVER ON THE ROLL.', nicholas: 'WHO ARE YOU? WHO WAS I ABOUT TO ERASE?' },
      ending: ['THE ERASER WON.', 'IT ERASED THE BOARD.', 'THEN THE DESKS. THEN THE CHAIRS.', 'THEN IT ERASED ITSELF.', 'NOBODY ASKED WHERE IT WENT.'],
    },
  };
  for (const id of Object.keys(patch)) {
    const i = RF.EXTRAS.findIndex((c) => c.id === id); if (i < 0) continue;
    const d = RF.EXTRAS.splice(i, 1)[0], p = patch[id];
    d.moves = {}; for (const k of Object.keys(p.moves)) d.moves[k] = Object.assign({}, p.moves[k]);
    for (const k of ['special', 'teleport', 'dashTime', 'tpCols', 'rivalQuote', 'ending', 'blockFx']) if (p[k] !== undefined) d[k] = p[k];
    if (p.stats) d.stats = Object.assign({}, d.stats, p.stats);
    d.sprite = Object.assign({}, d.sprite, p.sprite || {}, { poses: POSES });
    d.lieutenant = false; d.archetype = id === 'ringer' ? 'tank' : id === 'eraser' ? 'light' : 'balanced';
    RF.CHARACTERS.push(d);
  }
})();
