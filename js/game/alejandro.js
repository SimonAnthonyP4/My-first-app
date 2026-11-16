// ALEJANDRO, ALL ROCK. His specials already moved the rock (js/game/rocks.js); now every button does.
//   LIGHT            STONE FIST     his fist goes to stone on the way out and chips fly where it lands
//   HEAVY            CRAG HAMMER    a boulder on the end of his climbing rope, swung overhand. Long reach
//   UP + HEAVY       STALAGMITE     he lifts a hand and a pillar of rock comes up under them (launcher)
//   AIR LIGHT        SCREE KICK     a kick that brings a spray of gravel down with it
//   AIR HEAVY        METEOR DROP    he comes down behind a boulder, glowing at the edge
//   DOWN + LIGHT     PEBBLE SKIP    three stones skipped along the floor
//   DOWN + HEAVY     FAULT LINE     a punch into the floor: a crack runs out and teeth of rock snap up along it (sweep)
//   DOWN, FWD + HEAVY   BOULDER ROLL   (was Dyno) he rolls through them inside a boulder
//   DOWN, BACK + HEAVY  SUMMIT         (was Free Solo) a column of rock carries him up into them
(function () {
  const C = { d: '#2e261f', m: '#5e5040', l: '#8c7a5e', hi: '#c0ae8c', dark: '#171210' };
  const rng = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (u) => 1 - (1 - u) * (1 - u);
  const poly = (ctx, pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
  const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  // A boulder: a lumpy seven-sided stone with a lit face and a shadowed one. `rot` tumbles it.
  function rock(ctx, x, y, r, seed = 0, rot = 0) {
    if (r < 1) return;
    const at = (i, k = 1) => { const a = rot + (i / 7) * Math.PI * 2, rr = r * (0.8 + rng(seed + (i % 7)) * 0.28) * k; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; };
    const ring = (k) => [0, 1, 2, 3, 4, 5, 6].map((i) => at(i, k));
    poly(ctx, ring(1 + 1.4 / r), C.dark);
    poly(ctx, ring(1), C.m);
    // the light comes from up and to the left, whatever way the stone has rolled
    let litAt = at(0), best = -1e9;
    for (let i = 0; i < 7; i++) {
      const p = at(i), q = at(i + 1), l = -(((p[0] + q[0]) / 2 - x) * 0.55 + ((p[1] + q[1]) / 2 - y) * 0.83) / r;
      if (l > best) { best = l; litAt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
      if (l > 0.3) poly(ctx, [[x, y], p, q], C.l); else if (l < -0.3) poly(ctx, [[x, y], p, q], C.d);
    }
    R(ctx, x + (litAt[0] - x) * 0.6 - 1, y + (litAt[1] - y) * 0.6 - 1, Math.max(2, r * 0.3), Math.max(1, r * 0.16), C.hi);
    R(ctx, x + r * 0.15, y + r * 0.1, Math.max(1, r * 0.22), 1, C.dark);
    if (r > 14) {   // a big one shows its cracks
      ctx.strokeStyle = C.dark; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = rot + rng(seed + 30 + i) * 6.283, a2 = a + 0.5 + rng(seed + 40 + i), r1 = r * (0.25 + rng(seed + 50 + i) * 0.2), r2 = r * 0.78;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos((a + a2) / 2) * (r1 + r2) * 0.5 + 2, y + Math.sin((a + a2) / 2) * (r1 + r2) * 0.5); ctx.lineTo(x + Math.cos(a2) * r2, y + Math.sin(a2) * r2); ctx.stroke();
      }
      for (let i = 0; i < 5; i++) { const a = rot + rng(seed + 60 + i) * 6.283, rr = r * (0.3 + rng(seed + 70 + i) * 0.5); R(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 2, 2, i % 2 ? C.hi : C.d); }
    }
  }
  // Chips thrown off an impact: out, up, and down again.
  function chips(ctx, x, y, age, n, seed, dir = 0, power = 1) {
    if (age < 0 || age > 16) return;
    for (let i = 0; i < n; i++) {
      const a = rng(seed + i * 3), b = rng(seed + i * 3 + 1), vx = (a - 0.5) * 5 * power + dir * 2.2 * power, vy = (1.5 + b * 3.2) * power;
      const s = b > 0.6 ? 3 : 2;
      ctx.globalAlpha = clamp(1.3 - age / 13, 0, 1);
      R(ctx, x + vx * age, y - vy * age + 0.3 * age * age, s, s, i % 3 === 0 ? C.hi : i % 3 === 1 ? C.l : C.m);
    }
    ctx.globalAlpha = 1;
  }
  const dust = (ctx, x, y, age, w = 10) => {
    if (age < 0 || age > 14) return;
    ctx.fillStyle = '#b8a888'; ctx.globalAlpha = clamp(0.55 - age / 26, 0, 1);
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * (w * 0.5 + age * 0.8), y - 2 - age * 0.25, 3 + age * 0.35, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  };
  // where a move is in its life: a = frames since it went active (negative while winding up)
  const when = (f, lead = 3, tail = 10) => { const m = f.move, t = f.stateTime; return m && t >= m.startup - lead && t <= m.startup + m.active + tail ? { m, a: t - m.startup, h: m.hitbox } : null; };

  Object.assign(RF.MOVE_FX, {
    // STONE FIST
    stoneJab(f, ctx, floorY) {
      const w = when(f, 3, 8); if (!w) return; const { m, a, h } = w, d = f.facing;
      const out = a < 0 ? ease((a + 3) / 3) : a <= m.active ? 1 : clamp(1 - (a - m.active) / 6, 0, 1);
      const x = f.x + d * (h.x + h.w * (0.25 + 0.68 * out)), y = floorY - f.y - h.y - h.h / 2;
      if (a <= m.active + 3) rock(ctx, x, y, 5.5, 2, a * 0.2 * d);
      for (let i = 1; i <= 3 && a < 2; i++) { ctx.globalAlpha = 0.5 - i * 0.13; R(ctx, x - d * (5 + i * 6) - (d < 0 ? 0 : 6), y - 3 + i, 6, 2, C.hi); }
      ctx.globalAlpha = 1;
      chips(ctx, f.x + d * (h.x + h.w), y, a, 5, 11, d, 0.8);
    },

    // CRAG HAMMER
    cragHammer(f, ctx, floorY) {
      const w = when(f, 5, 8); if (!w) return; const { m, a, h } = w, d = f.facing;
      const u = clamp((a + 5) / 7, 0, 1), reach = h.x + h.w - 8, hx = f.x + d * 8, hy = floorY - f.y - 62;
      const pos = (uu) => { const ang = -2.25 + ease(clamp(uu, 0, 1)) * 2.95; return [hx + d * Math.cos(ang) * reach, hy + Math.sin(ang) * reach * 0.78 + 4]; };
      const [ex, ey] = pos(u);
      for (let i = 3; i >= 1; i--) { const [px, py] = pos(u - i * 0.1); ctx.globalAlpha = 0.34 - i * 0.08; rock(ctx, px, py, 8, 4, u * 5 * d); }   // the swing, smeared
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + ex) / 2 - d * 4, (hy + ey) / 2 - 10 * (1 - u), ex, ey); ctx.stroke();
      ctx.strokeStyle = '#e07030'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + ex) / 2 - d * 4, (hy + ey) / 2 - 10 * (1 - u), ex, ey); ctx.stroke(); ctx.lineWidth = 1;
      rock(ctx, ex, ey, 8.5, 4, u * 5 * d);
      if (a >= 0) { chips(ctx, ex + d * 6, ey + 4, a, 8, 23, d, 1.1); dust(ctx, ex + d * 4, Math.min(floorY, ey + 14), a); }
    },

    // STALAGMITE
    stalagmite(f, ctx, floorY) {
      const w = when(f, 4, 14); if (!w) return; const { m, a, h } = w, d = f.facing, x = Math.round(f.x + d * (h.x + h.w * 0.55));
      if (a < 0) {   // the floor splits first
        ctx.strokeStyle = C.hi; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + (a + 4) / 8;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4, floorY); ctx.lineTo(x + i * 9, floorY - 1 + i); ctx.lineTo(x + i * 13, floorY + 1); ctx.stroke(); }
        ctx.lineWidth = 1; ctx.globalAlpha = 1; return;
      }
      const up = ease(clamp(a / 3, 0, 1)), sink = a > m.active + 4 ? clamp(1 - (a - m.active - 4) / 9, 0, 1) : 1, hh = (h.y + h.h - 6) * up * sink;
      const spike = (cx, ww, tall) => { if (tall < 2) return;
        poly(ctx, [[cx - ww - 1, floorY], [cx - ww * 0.6 - 1, floorY - tall * 0.55], [cx, floorY - tall - 2], [cx + ww * 0.5 + 1, floorY - tall * 0.6], [cx + ww + 1, floorY]], C.dark);
        poly(ctx, [[cx - ww, floorY], [cx - ww * 0.6, floorY - tall * 0.55], [cx, floorY - tall], [cx + ww * 0.5, floorY - tall * 0.6], [cx + ww, floorY]], C.m);
        poly(ctx, [[cx - ww, floorY], [cx - ww * 0.6, floorY - tall * 0.55], [cx, floorY - tall], [cx - ww * 0.1, floorY]], C.d);
        poly(ctx, [[cx + ww * 0.5, floorY - tall * 0.6], [cx, floorY - tall], [cx + ww * 0.12, floorY - tall * 0.42]], C.hi);
        for (let i = 1; i < 4; i++) R(ctx, cx - ww * 0.3 + i * 2, floorY - tall * (0.2 + i * 0.17), Math.max(2, ww * 0.5), 1, C.dark); };
      spike(x - 13, 5, hh * 0.42); spike(x + 13, 6, hh * 0.55); spike(x, 10, hh);
      if (a < 3) { ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.fillRect(x - 12, floorY - hh - 6, 24, hh + 6); }
      chips(ctx, x, floorY - 4, a, 9, 31, 0, 1.25); dust(ctx, x, floorY, a, 16);
    },

    // SCREE KICK
    screeKick(f, ctx, floorY) {
      const w = when(f, 1, 6); if (!w) return; const { a, h } = w, d = f.facing;
      const x = f.x + d * (h.x + h.w * 0.8), y = floorY - f.y - h.y - h.h * 0.35;
      for (let i = 0; i < 9; i++) {
        const u = ((a + 4) * 0.12 + rng(i + 40) * 0.9) % 1, s = rng(i + 50) > 0.5 ? 3 : 2;
        ctx.globalAlpha = 1 - u;
        R(ctx, x - d * u * 30 + (rng(i + 60) - 0.5) * 10, y - u * 22 + (rng(i + 70) - 0.5) * 12, s, s, i % 3 ? C.l : C.hi);
      }
      ctx.globalAlpha = 1;
      rock(ctx, x, y, 3.5, 6, a * 0.5);
    },

    // METEOR DROP
    meteorDrop(f, ctx, floorY) {
      const w = when(f, 4, 6); if (!w) return; const { m, a, h } = w, d = f.facing;
      const grow = clamp((a + 4) / 4, 0, 1), x = f.x + d * (h.x + h.w * 0.55), y = floorY - f.y - h.y - h.h * 0.4;
      if (a <= m.active + 2) {
        for (let i = 0; i < 6; i++) {   // the heat coming off the leading edge
          const u = ((a + 6) * 0.2 + i * 0.17) % 1;
          ctx.globalAlpha = (1 - u) * 0.8 * grow; R(ctx, x - d * (6 + u * 26) + (i - 3) * 3, y - 10 - u * 24, 3, 6, i % 2 ? '#ffb040' : '#ff6a20');
        }
        ctx.globalAlpha = 0.35 * grow; ctx.fillStyle = '#ff8a30'; ctx.beginPath(); ctx.arc(x + d * 2, y + 3, 14 * grow, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        rock(ctx, x, y, 11.5 * grow, 8, a * 0.3 * d);
      } else chips(ctx, x, y, a - m.active - 2, 10, 44, d, 1.2);   // and it breaks up when he lets go of it
    },

    // PEBBLE SKIP
    pebbleSkip(f, ctx, floorY) {
      const w = when(f, 1, 8); if (!w) return; const { a, h } = w, d = f.facing, x0 = f.x + d * (h.x + 4), len = h.w + 4;
      for (let i = 0; i < 3; i++) {
        const u = clamp((a + 1 - i * 1.5) / 7, 0, 1); if (u <= 0 || u >= 1) continue;
        const x = x0 + d * len * u, y = floorY - f.y - 3 - Math.abs(Math.sin(u * Math.PI * 2.5)) * (9 - i * 2);
        rock(ctx, x, y, 2.6 - i * 0.3, 12 + i, a * 0.8);
        if (Math.abs(Math.sin(u * Math.PI * 2.5)) < 0.3) { ctx.globalAlpha = 0.5; R(ctx, x - 3, floorY - f.y - 2, 6, 1, C.hi); ctx.globalAlpha = 1; }
      }
    },

    // FAULT LINE
    faultLine(f, ctx, floorY) {
      const w = when(f, 5, 12); if (!w) return; const { m, a, h } = w, d = f.facing, x0 = f.x + d * 10, len = h.x + h.w - 6, by = floorY - f.y;
      const run = clamp((a + 5) / 5, 0, 1), n = Math.max(3, Math.floor(len / 6));
      ctx.strokeStyle = C.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, by - 1);
      for (let i = 1; i <= n * run; i++) ctx.lineTo(x0 + d * len * (i / n), by - 1 + (i % 2 ? 2 : -1)); ctx.stroke();
      ctx.strokeStyle = C.hi; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, by - 1);
      for (let i = 1; i <= n * run; i++) ctx.lineTo(x0 + d * len * (i / n), by - 1 + (i % 2 ? 2 : -1)); ctx.stroke();
      if (a < 0) return;
      const sink = a > m.active + 3 ? clamp(1 - (a - m.active - 3) / 8, 0, 1) : 1;
      for (let i = 0; i < 5; i++) {   // the teeth come up one after another, away from him
        const up = ease(clamp((a - i * 0.8) / 2.5, 0, 1)) * sink, cx = x0 + d * len * (0.2 + i * 0.2), tall = (9 + (i % 2) * 6 + i * 1.5) * up, ww = 4 + (i % 2);
        if (tall < 1) continue;
        poly(ctx, [[cx - ww - 1, by], [cx + d * 2, by - tall - 2], [cx + ww + 1, by]], C.dark);
        poly(ctx, [[cx - ww, by], [cx + d * 2, by - tall], [cx + ww, by]], C.m);
        poly(ctx, [[cx - ww, by], [cx + d * 2, by - tall], [cx - 1, by]], d > 0 ? C.d : C.l);
        poly(ctx, [[cx + 1, by], [cx + d * 2, by - tall], [cx + ww, by]], d > 0 ? C.l : C.d);
      }
      chips(ctx, x0 + d * len * 0.55, by - 4, a, 9, 61, d, 1); dust(ctx, x0 + d * len * 0.5, by, a, len * 0.5);
    },
  });

  // ---------------------------------------------------------------- the heavy command moves, in rock
  const rush = RF.SPECIAL_KINDS.rush, rising = RF.SPECIAL_KINDS.rising;
  // BOULDER ROLL: Dyno, but he is inside a boulder for it.
  RF.SPECIAL_KINDS.boulderRoll = Object.assign({}, rush, {
    start(f, scene) { rush.start(f, scene); RF.audio.sfx('rumble'); },
    anim() { return ['crouch', 0]; },
    draw(f, ctx, floorY, frame) {
      const s = f.special, t = f.stateTime, end = s.startup + s.duration, d = f.facing;
      if (t < s.startup - 4 || t > end + 14) return;
      const cx = f.x + d * 2, cy = floorY - f.y - 36;
      if (t <= end) {
        const grow = ease(clamp((t - (s.startup - 4)) / 4, 0, 1));
        if (t >= s.startup) for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.3 - i * 0.07; rock(ctx, cx - d * i * 12, cy, 36, 3, (t - i * 1.5) * 0.36 * d); }
        ctx.globalAlpha = 1;
        rock(ctx, cx, cy, 38 * grow, 3, t * 0.36 * d);
        if (t >= s.startup && f.grounded) for (let i = 0; i < 4; i++) R(ctx, cx - d * (30 + ((t * 5 + i * 9) % 26)), floorY - 2 - ((t * 3 + i * 5) % 9), 3, 3, i % 2 ? C.l : C.hi);
      } else {   // it comes apart around him
        const a = t - end;
        for (let i = 0; i < 6; i++) { const ang = i * 1.05 + 0.4, r = a * (2.2 + rng(i + 80)); ctx.globalAlpha = clamp(1 - a / 13, 0, 1); rock(ctx, cx + Math.cos(ang) * r * 2, cy + Math.sin(ang) * r * 1.4 - a * 1.2 + a * a * 0.25, 11 - a * 0.4, 20 + i, a * 0.3 * (i % 2 ? 1 : -1)); }
        ctx.globalAlpha = 1;
      }
    },
  });
  // SUMMIT: Free Solo, on a column of rock that comes up under his boots.
  RF.SPECIAL_KINDS.pillarRise = Object.assign({}, rising, {
    start(f, scene) { rising.start(f, scene); f.specialData.fromX = f.x; RF.audio.sfx('rumble'); },
    update(f, scene) {
      const s = f.special, d = f.specialData;
      if (f.stateTime === s.startup) { d.fromX = f.x; scene.shake = Math.max(scene.shake, 5); scene.effects.spawn('dust', f.x, 1); }
      if (f.stateTime >= s.startup) d.top = Math.max(d.top || 0, f.y);
      rising.update(f, scene);
    },
    draw(f, ctx, floorY, frame) {
      const s = f.special, t = f.stateTime, d = f.specialData, a = t - s.startup;
      if (a < 0 || a > 34) return;
      const x = Math.round(d.fromX), topY = Math.min(f.y, d.top || 0), crumble = a > 16 ? clamp((a - 16) / 16, 0, 1) : 0;
      const h = Math.max(f.y, (d.top || 0) * (1 - crumble * 0.15));
      ctx.save(); ctx.globalAlpha = 1 - crumble;
      for (let y = 0; y < h; y += 14) {   // stacked blocks of it, each a little off the last
        const i = Math.floor(y / 14), o = (rng(i + 7) - 0.5) * 6 + (crumble ? (i % 2 ? 1 : -1) * crumble * 12 : 0), ww = 22 - Math.min(8, i * 1.2), hh = Math.min(14, h - y) + 1;
        R(ctx, x - ww / 2 + o - 1, floorY - y - hh, ww + 2, hh + 1, C.dark); R(ctx, x - ww / 2 + o, floorY - y - hh + 1, ww, hh - 1, C.m);
        R(ctx, x - ww / 2 + o, floorY - y - hh + 1, 5, hh - 1, C.d); R(ctx, x + ww / 2 + o - 4, floorY - y - hh + 1, 4, hh - 1, C.l); R(ctx, x - ww / 2 + o + 6, floorY - y - hh + 1, ww - 10, 1, C.hi);
      }
      ctx.restore();
      chips(ctx, x, floorY - 4, a, 10, 91, 0, 1.3);
    },
  });
  RF.COMMANDS.boulderRoll = Object.assign({}, RF.COMMANDS.dyno, { name: 'Boulder Roll', kind: 'boulderRoll', callout: 'BOULDER ROLL!', color: C.hi, sound: 'rumble' });
  RF.COMMANDS.summitPillar = Object.assign({}, RF.COMMANDS.freeSolo, { name: 'Summit', kind: 'pillarRise', callout: 'SUMMIT!', color: C.hi, sound: 'stomp' });

  // ---------------------------------------------------------------- and the fighter himself
  const al = RF.getCharacter && RF.getCharacter('alejandro');
  if (!al) return;
  Object.assign(al.moves, {
    light: { fx: 'stoneJab', fxSound: 'whoosh', damage: 4.5, pushback: 1.5, hitbox: { x: 10, y: 52, w: 32, h: 14 } },
    heavy: { startup: 9, active: 4, recovery: 16, fx: 'cragHammer', fxSound: 'whoosh', damage: 11, hitstun: 24, blockstun: 12, pushback: 3, knockback: 8, hitstop: 9, hitbox: { x: 10, y: 34, w: 54, h: 32 } },
    airLight: { fx: 'screeKick', fxSound: 'whoosh', damage: 4.5 },
    airHeavy: { fx: 'meteorDrop', fxSound: 'whoosh', damage: 10, hitstop: 8, hitbox: { x: 2, y: -10, w: 42, h: 36 } },
    launcher: { fx: 'stalagmite', fxSound: 'stomp', hitbox: { x: 6, y: 22, w: 34, h: 66 } },
    lowLight: { fx: 'pebbleSkip', fxSound: 'whoosh', hitbox: { x: 12, y: 4, w: 28, h: 16 } },
    lowHeavy: { fx: 'faultLine', fxSound: 'rumble', hitbox: { x: 8, y: 0, w: 50, h: 14 } },
  });
  al.commandsHeavy = { qcf: 'boulderRoll', qcb: 'summitPillar' };
  al.sprite.poses = Object.assign({}, al.sprite.poses, {
    // the hammer is an overhand swing, not a kick
    heavy: [{ arm: 'up', head: [-1, 0] }, { arm: 'slam', head: [3, 1], torso: [2, 1] }, { arm: 'forwardShort', head: [1, 0] }],
    // a hand to the floor, then lifted: the rock follows it
    uppercut: [{ crouch: true, arm: 'low' }, { arm: 'up', head: [1, -1], torso: [0, -1] }, { arm: 'up', head: [0, -1], torso: [0, -1] }],
    // fist into the ground
    lowHeavy: [{ crouch: true, arm: 'up' }, { crouch: true, arm: 'slam', head: [3, 2], torso: [2, 1] }, { crouch: true, arm: 'low' }],
  });
})();
