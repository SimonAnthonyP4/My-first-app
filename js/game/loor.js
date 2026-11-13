// CHRIS LOOR (boxer, pizza place, Ecuador): the PIZZA DELIVERY special's art.
// His block is the boxer's high guard (game/blocks.js: two gloves up at his chin, bouncing on his toes).
// A full boxer's moveset: every attack is a different punch (a jab, a hook, an uppercut, a body shot, an
// overhand from above, a low sweeping hook), and four command specials with the pizza delivery on top:
//   DOWN, FORWARD + LIGHT  JAB FLURRY      six fast jabs, stepping in    + HEAVY  HAYMAKER RUSH  a charging right
//   DOWN, BACK    + LIGHT  BOB & WEAVE     slips it, counters            + HEAVY  GAZELLE PUNCH  a leaping uppercut
(function () {
  // PIZZA DELIVERY: a spinning pizza box that pops open into a flying slice cloud.
  RF.PROJECTILE_ART.pizza = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 4; i++) { ctx.fillStyle = `rgba(255,170,60,${0.4 - i * 0.08})`; ctx.fillRect(Math.round(x - dir * i * 7), Math.round(y - 2), 5, 3); }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(t * 0.35 * dir);
    ctx.fillStyle = '#2a1a0a'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8a040'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c82828'; for (const [dx, dy] of [[-3, -2], [2, -3], [3, 2], [-2, 3], [0, 0]]) ctx.fillRect(dx - 1, dy - 1, 2, 2);
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(-7, -0.5, 14, 1); ctx.fillRect(-0.5, -7, 1, 14);   // the slices
    ctx.restore();
  };
  RF.SPECIALS.pizzaDelivery = {
    name: 'Pizza Delivery',
    description: 'Spins a whole pizza across the screen like a discus. Thirty minutes or it is free.',
    kind: 'projectile',
    startup: 10,
    recovery: 15,
    speed: 7,
    size: 15,
    height: 0.6,
    damage: 14,
    hitstun: 26, blockstun: 13, pushback: 6, hitstop: 9,
    art: 'pizza', sound: 'whoosh', hitText: 'EXTRA CHEESE!',
    colors: ['#ffe27a', '#e8a040', '#c82828'],
  };

  // ---------------------------------------------------------------- the punches
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const when = (f) => { const m = f.move, t = f.stateTime; return m && t >= m.startup - 3 && t <= m.startup + m.active + 8 ? { m, age: t - (m.startup - 3), life: m.active + 11 } : null; };
  const lerp = (a, b, u) => a + (b - a) * u, ease = (u) => 1 - (1 - u) * (1 - u);
  const gloveAt = (ctx, x, y, face, hot) => {            // a boxing glove, fist toward the way he is facing
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face, 1);
    R(ctx, '#2a0808', -6, -5, 13, 11, 0); R(ctx, hot ? '#ff6a58' : '#d02030', -5, -4, 11, 9, 0); R(ctx, '#a01020', -5, 2, 11, 3, 0); R(ctx, '#f4f0e6', -8, -3, 3, 7, 0); R(ctx, '#ffb0a8', -1, -3, 4, 2, 0);
    ctx.restore();
  };
  // path(u, m, cx, cy) -> [forward, height] of the glove along the punch; the glove, an afterimage trail, and a spark where it lands
  const punch = (path, opt = {}) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return; const m = w.m, h = m.hitbox, cx = h.x + h.w * 0.75, cy = h.y + h.h / 2;
    const u = Math.min(1, w.age / (m.active + 2)), a = Math.max(0, 1 - w.age / w.life), at = (uu) => { const p = path(Math.max(0, uu), m, cx, cy); return [f.x + f.facing * p[0], floorY - f.y - p[1]]; };
    ctx.save();
    for (let i = 5; i >= 1; i--) { const [x, y] = at(u - i * 0.1); ctx.globalAlpha = a * (0.5 - i * 0.07); R(ctx, opt.trail || '#ffe0d0', x - 3 * f.facing, y - 1, 6, 2, 0); }       // speed streaks
    if (u > 0.75) { const [x, y] = at(1), k = (u - 0.75) * 4; ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; for (let r = 0; r < 4; r++) { const an = r * 1.57 + 0.4; ctx.beginPath(); ctx.moveTo(x + f.facing * 9 + Math.cos(an) * 4, y + Math.sin(an) * 4); ctx.lineTo(x + f.facing * 9 + Math.cos(an) * (7 + k * 6), y + Math.sin(an) * (7 + k * 6)); ctx.stroke(); } }
    ctx.restore(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
  };
  Object.assign(RF.MOVE_FX, {
    boxJab: punch((u, m, cx, cy) => [lerp(8, cx, ease(u)), cy + 1]),
    boxHook: punch((u, m, cx, cy) => { const th = lerp(-2.3, 0.35, ease(u)), rad = cx - 2; return [6 + rad * Math.cos(th), cy + rad * 0.5 * Math.sin(th) + 3]; }, { trail: '#ffd0a0' }),
    boxUppercut: punch((u, m, cx, cy) => [lerp(10, cx * 0.85, ease(u)), lerp(m.hitbox.y * 0.5 + 8, m.hitbox.y + m.hitbox.h - 6, ease(u))], { trail: '#ffe27a' }),
    boxBody: punch((u, m, cx, cy) => [lerp(8, cx, ease(u)), cy], { trail: '#ffb060' }),
    boxOverhand: punch((u, m, cx, cy) => [lerp(-2, cx, ease(u)), lerp(cy + 34, cy, u * u)], { trail: '#ffd0a0' }),
    boxSweep: punch((u, m, cx, cy) => [lerp(-4, cx, ease(u)), cy + (1 - ease(u)) * 10 + 2], { trail: '#e8d8c0' }),
  });

  // ---------------------------------------------------------------- JAB FLURRY: six fast jabs, stepping in
  RF.SPECIAL_KINDS.flurry = {
    start(f) { f.vx = 0; f.specialData.n = 0; f.specialData.land = 0; },
    update(f, scene) {
      const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
      const k = t - s.startup;
      if (k >= 0 && k % s.interval === 0 && d.n < s.hits) {
        const i = d.n++, last = i === s.hits - 1;
        const gap = Math.abs(opp.x - f.x) - (f.body.width + opp.body.width) / 2;
        if (gap > s.reach - 6) f.x += f.facing * Math.min(s.step, gap - (s.reach - 6));               // steps in on every punch
        RF.audio.sfx(last ? 'heavy' : 'whoosh'); d.at = [i, scene.frame];
        const hurt = opp.getHurtbox();
        const box = { x: f.facing > 0 ? f.x : f.x - f.body.width / 2 - s.reach, y: f.y + f.body.height * (0.35 + 0.18 * (i % 3) * (i % 2 ? 1 : 0.5)), w: f.body.width / 2 + s.reach, h: 16 };
        if (hurt && !opp.isKO && RF.util.rectsOverlap(box, hurt)) {
          const mv = RF.specialMove(f, s);
          scene.applyHit(f, opp, last ? Object.assign({}, mv, { damage: s.finalDamage * f.stats.damage, launch: 5, hitstun: 30, pushback: 7 }) : mv, last ? 'heavy' : 'hit', f.x + f.facing * (f.body.width / 2 + s.reach * 0.6), f.y + f.body.height * 0.62);
        }
      }
      if (t >= s.startup + s.hits * s.interval + s.recovery) f.setState('idle');
    },
    anim(f) { const s = f.special, t = f.stateTime; if (t < s.startup) return ['special', 0]; return ['light', Math.floor((t - s.startup) / 2) % 2 ? 2 : 1]; },
    draw(f, ctx, floorY) {
      const d = f.specialData; if (!d.at) return; const [i, fr] = d.at, a = f.scene.frame - fr; if (a > 5) return;
      const y = floorY - f.y - f.body.height * (0.6 - 0.07 * (i % 3)), x = f.x + f.facing * (f.body.width / 2 + 14 + a * 3);
      ctx.globalAlpha = 1 - a / 6; for (let r = 1; r < 4; r++) R(ctx, '#ffe0d0', x - f.facing * (8 + r * 7), y - 1, 5, 2, 0); ctx.globalAlpha = 1;
    },
  };

  // ---------------------------------------------------------------- the command moves
  const hit = (dmg, extra = {}) => Object.assign({ damage: dmg, hitstun: 24, blockstun: 12, pushback: 5, hitstop: 7 }, extra);
  Object.assign(RF.COMMANDS, {
    jabFlurry: Object.assign({ name: 'Jab Flurry', kind: 'flurry', startup: 6, hits: 6, interval: 4, step: 4, reach: 24, recovery: 16, finalDamage: 7, color: '#ff4030' }, hit(2.6, { hitstun: 15, blockstun: 9, pushback: 1.5, hitstop: 3 })),
    haymaker: Object.assign({ name: 'Haymaker Rush', kind: 'rush', startup: 10, speed: 7.5, duration: 15, reach: 18, recovery: 20, color: '#ff3030', anim: 'heavy' }, hit(15, { pushback: 9, launch: 4, hitstun: 30 })),
    bobWeave: Object.assign({ name: 'Bob & Weave', kind: 'counter', startup: 2, window: 24, recovery: 15, color: '#ff4030', callout: 'TOO SLOW!' }, hit(12, { launch: 4 })),
    gazelle: Object.assign({ name: 'Gazelle Punch', kind: 'rising', startup: 4, rise: 9.5, forward: 2.2, reach: 20, recovery: 20, invuln: 8, color: '#ffe27a' }, hit(12, { launch: 7 })),
  });
  const me = RF.getCharacter('loor');
  if (me) Object.assign(me, { commands: { qcf: 'jabFlurry', qcb: 'bobWeave' }, commandsHeavy: { qcf: 'haymaker', qcb: 'gazelle' }, taunt: 'GLOVES UP, MI AMIGO.', voicePitch: 1.0 });
})();
