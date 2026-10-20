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
