// Animation list shared by ALL sprite types. A sprite sheet must provide
// exactly these animations with these frame counts (see README).
//   light/heavy frames: 0 = startup, 1 = active (hitting), 2 = recovery
//   ko frames:          0 = falling, 1 = lying on the floor
//   special frames:     0 = wind-up, 1 = thrust forward (projectiles, rushes),
//                       2 = slam into the floor
RF.ANIMATIONS = {
  idle: 2, walk: 4, jump: 1, light: 3, heavy: 3, block: 1, hit: 1, ko: 2, victory: 2,
  special: 3,
};

// Poses for the procedural placeholder sprites, drawn facing right.
// Angles are in degrees. Limbs: 0 = pointing straight down, positive rotates
// toward the front (90 = straight forward, 180 = straight up).
// lean: torso tilt, 0 = upright, positive = leaning forward.
// b* = back limb, f* = front limb. hipX shifts the body horizontally.
(function () {
  const guard = { bUpper: 25, bFore: 160, fUpper: 40, fFore: 145 };
  const stance = { bThigh: -18, bShin: -6, fThigh: 24, fShin: 2 };

  const P = (o) => Object.assign({ lean: 8 }, stance, guard, o);

  RF.POSES = {
    idle: [
      P({}),
      P({ lean: 6, bThigh: -21, bShin: -3, fThigh: 28, fShin: -2, bFore: 155, fFore: 140 }),
    ],
    walk: [
      P({ bThigh: -26, bShin: -14, fThigh: 26, fShin: 6 }),
      P({ bThigh: -6, bShin: -32, fThigh: 10, fShin: 4 }),
      P({ bThigh: 22, bShin: 6, fThigh: -22, fShin: -12 }),
      P({ bThigh: 6, bShin: 4, fThigh: -6, fShin: -32 }),
    ],
    jump: [
      P({ lean: 12, bThigh: 55, bShin: -50, fThigh: 85, fShin: -15 }),
    ],
    light: [
      P({ lean: 4, fUpper: -10, fFore: 120 }),
      P({ lean: 16, fUpper: 88, fFore: 90, bUpper: 10, bFore: 150 }),
      P({ lean: 10, fUpper: 60, fFore: 120 }),
    ],
    heavy: [
      P({ lean: -8, fThigh: 95, fShin: -5, bThigh: -8, bShin: -2 }),
      P({ lean: -26, fThigh: 108, fShin: 108, bThigh: -6, bShin: 0, bUpper: 10, bFore: 140, fUpper: -20, fFore: 100 }),
      P({ lean: -6, fThigh: 60, fShin: 10, bThigh: -10, bShin: -2 }),
    ],
    block: [
      P({ lean: -6, fUpper: 70, fFore: 170, bUpper: 55, bFore: 175 }),
    ],
    hit: [
      P({ lean: -22, hipX: -3, fUpper: -35, fFore: 20, bUpper: -45, bFore: 10, fThigh: 18, fShin: 8 }),
    ],
    ko: [
      P({ lean: -55, fThigh: 50, fShin: 20, bThigh: 30, bShin: 0, fUpper: -80, fFore: -60, bUpper: -100, bFore: -80 }),
      P({ lean: -90, hipX: 18, fThigh: 85, fShin: 90, bThigh: 80, bShin: 95, fUpper: -95, fFore: -100, bUpper: -60, bFore: -95 }),
    ],
    special: [
      P({ lean: -10, fUpper: -40, fFore: 50, bUpper: -50, bFore: 30, bThigh: -28, bShin: -10, fThigh: 30, fShin: 0 }),
      P({ lean: 18, fUpper: 88, fFore: 92, bUpper: 78, bFore: 96, bThigh: -38, bShin: -22, fThigh: 42, fShin: 2 }),
      P({ lean: 40, fUpper: 30, fFore: 10, bUpper: 20, bFore: 5, bThigh: -45, bShin: -70, fThigh: 80, fShin: -5 }),
    ],
    victory: [
      P({ lean: 0, fUpper: 170, fFore: 178, bUpper: 30, bFore: -40, bThigh: -14, fThigh: 14, fShin: 0, bShin: 0 }),
      P({ lean: 2, fUpper: 160, fFore: 195, bUpper: 30, bFore: -40, bThigh: -14, fThigh: 14, fShin: 0, bShin: 0 }),
    ],
  };
})();
