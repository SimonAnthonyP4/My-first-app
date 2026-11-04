// Behaviour for each special-move `kind` (numbers live in config/specials.js).
// A kind implements:
//   start(f, scene)         called once when the special begins
//   update(f, scene)        every frame while f.state === 'special'
//   onLand(f, scene)        optional, when the user touches the floor
//   anim(f) -> [anim, frame]
// Use scene.applyHit(...) to deal damage and scene.spawnProjectile(...) to shoot.
(function () {
  const { clamp } = RF.util;

  // Converts special config into the move format used by scene.applyHit.
  RF.specialMove = (f, s) => ({
    damage: s.damage * f.stats.damage,
    hitstun: s.hitstun, blockstun: s.blockstun, pushback: s.pushback, hitstop: s.hitstop,
    launch: s.launch || 0,
    special: true,
  });

  // Pixel-crisp jagged line, re-randomised every couple of frames.
  function bolt(ctx, x0, y0, x1, seed, amp, w, color) {
    ctx.fillStyle = color;
    const dir = Math.sign(x1 - x0) || 1, len = Math.abs(x1 - x0);
    let px = x0, py = y0;
    for (let d = 0; d < len; d += 6) {
      const nx = x0 + dir * Math.min(len, d + 6);
      const ny = y0 + (d + 6 >= len ? 0 : Math.round((RF.util.hash(seed + d * 0.37) - 0.5) * amp * 2));
      const steps = Math.max(Math.abs(nx - px), Math.abs(ny - py));
      for (let i = 0; i <= steps; i++) {
        const t = steps ? i / steps : 0;
        ctx.fillRect(Math.round(px + (nx - px) * t - w / 2), Math.round(py + (ny - py) * t - w / 2), w, w);
      }
      px = nx; py = ny;
    }
  }

  RF.SPECIAL_KINDS = {
    projectile: {
      start(f) { f.vx = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime;
        if (t === s.startup) scene.spawnProjectile(f, s);
        if (t >= s.startup + s.recovery) f.setState('idle');
      },
      anim(f) {
        const t = f.stateTime, s = f.special;
        return ['special', t < s.startup ? 0 : 1];
      },
    },

    // A bolt of electricity fired straight ahead from the hands.
    beam: {
      start(f) { f.vx = 0; f.specialData.len = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (t === s.startup) {
          RF.audio.sfx('zap');
          const opp = scene.opponentOf(f);
          const x0 = f.x + f.facing * s.handX, y = f.y + s.handY;
          const box = { x: f.facing > 0 ? x0 : x0 - s.range, y: y - s.thickness / 2, w: s.range, h: s.thickness };
          const hurt = opp.getHurtbox();
          d.len = s.range;
          if (hurt && RF.util.rectsOverlap(box, hurt)) {
            // The bolt stops at whoever it hits.
            d.len = Math.max(8, f.facing > 0 ? hurt.x - x0 + 4 : x0 - (hurt.x + hurt.w) + 4);
            const res = scene.applyHit(f, opp, RF.specialMove(f, s), 'zap', opp.x, y);
            if (res === 'hit') for (let i = 0; i < 4; i++) scene.effects.spawn('zap', opp.x + (Math.random() - 0.5) * opp.body.width, opp.y + Math.random() * opp.body.height);
          }
        }
        if (t >= s.startup + s.active + s.recovery) f.setState('idle');
      },
      anim(f) {
        const s = f.special;
        return ['special', f.stateTime < s.startup ? 0 : 1];
      },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime;
        const hx = Math.round(f.x + f.facing * s.handX), hy = Math.round(floorY - f.y - s.handY);
        if (t < s.startup) {
          // Charging: sparks crackle around his hands and body.
          for (let i = 0; i < 6; i++) {
            const a = RF.util.hash(frame * 3.1 + i) * Math.PI * 2, r = 4 + RF.util.hash(frame + i * 7) * 14;
            ctx.fillStyle = i % 2 ? s.colors[1] : s.colors[0];
            ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(hy - 8 + Math.sin(a) * r), 2, 2);
          }
          return;
        }
        if (t < s.startup + s.active) {
          const seed = Math.floor(frame / 2) * 13.7;
          const x1 = hx + f.facing * f.specialData.len;
          bolt(ctx, hx, hy, x1, seed, 6, 5, 'rgba(58,140,255,0.55)');
          bolt(ctx, hx, hy, x1, seed, 6, 3, s.colors[1]);
          bolt(ctx, hx, hy, x1, seed, 6, 1, s.colors[0]);
          bolt(ctx, hx, hy, x1, seed + 50, 9, 1, s.colors[1]); // a stray second arc
          ctx.fillStyle = s.colors[0];
          ctx.fillRect(hx - 3, hy - 3, 6, 6); // glowing hands
        }
      },
    },

    slam: {
      start(f) { f.vx = 0; f.specialData.landedAt = null; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (t === s.startup) {
          // Leap so we come down roughly on top of the opponent.
          const opp = scene.opponentOf(f);
          const airTime = (2 * s.leapPower) / RF.CONFIG.GRAVITY;
          f.vy = s.leapPower;
          f.vx = clamp((opp.x - f.x) / airTime, -s.maxLeapSpeed, s.maxLeapSpeed);
        }
        if (d.landedAt !== null && t - d.landedAt >= s.recovery) f.setState('idle');
      },
      onLand(f, scene) {
        const s = f.special, d = f.specialData;
        if (d.landedAt !== null) return;
        d.landedAt = f.stateTime;
        f.vx = 0;
        scene.shake = 12;
        scene.effects.spawn('shock', f.x - s.radius * 0.6, 4);
        scene.effects.spawn('shock', f.x + s.radius * 0.6, 4);
        const wave = { x: f.x - s.radius, y: 0, w: s.radius * 2, h: s.height };
        const opp = scene.opponentOf(f);
        const hurt = opp.getHurtbox();
        if (hurt && RF.util.rectsOverlap(wave, hurt)) {
          scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, 10);
        }
      },
      anim(f) {
        const s = f.special, d = f.specialData;
        if (f.stateTime < s.startup) return ['special', 0];
        if (d.landedAt === null) return ['jump', 0];
        return ['special', 2];
      },
    },
  };
})();
