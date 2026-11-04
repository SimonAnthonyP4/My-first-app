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
        const s = f.special, t = f.stateTime, el = RF.electric;
        const hx = Math.round(f.x + f.facing * s.handX), hy = Math.round(floorY - f.y - s.handY);
        const seed = Math.floor(frame / 2) * 13.7;
        if (t < s.startup) {
          // Charging: electricity gathers around his whole body, then his hands.
          const p = t / s.startup;
          el.crackle(ctx, f.x, hy - 6, 18 - p * 6, seed, 4);
          el.glow(ctx, hx, hy, 8 + p * 14, 0.3 + p * 0.5);
          return;
        }
        if (t < s.startup + s.active) {
          const x1 = hx + f.facing * f.specialData.len;
          // Full-power surge: a thick forked main bolt, two wild side arcs, blinding ends.
          ctx.fillStyle = 'rgba(90,170,255,0.18)';
          ctx.fillRect(Math.min(hx, x1), floorY - 4, Math.abs(x1 - hx), 5);
          el.glow(ctx, hx, hy, 24, 0.85);
          el.bolt(ctx, [hx, hy], [x1, hy], { seed, amp: 9, thick: 1.8, forks: 7 });
          el.bolt(ctx, [hx, hy], [x1, hy - 4], { seed: seed + 40, amp: 14, thick: 0.5, forks: 2 });
          el.bolt(ctx, [hx, hy], [x1, hy + 4], { seed: seed + 80, amp: 14, thick: 0.5, forks: 2 });
          el.glow(ctx, x1, hy, 20, 0.9);
          el.crackle(ctx, x1, hy, 12, seed + 3, 4);
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
