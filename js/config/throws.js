// ===================== THROWS =====================
// Press THROW when you're right next to the opponent to grab them. Throws
// can't be blocked (they beat blocking), but:
//   - they only work up close (RF.CONFIG.THROW_RANGE),
//   - a missed grab leaves you open for a moment,
//   - the victim can break free by pressing THROW within
//     RF.CONFIG.THROW_BREAK_WINDOW frames of being grabbed.
//
// Each character has their own throw (characters.js -> `throw: '<id>'`).
// `kind` picks the animation/behaviour in js/game/throw-kinds.js. Damage is
// scaled by the thrower's `damage` stat and the victim's `damageReduction`.
RF.THROWS = {
  liftSlam: {
    name: 'Lunch Line Slam',
    description: 'Hoists the opponent over his head and slams them into the floor behind him.',
    kind: 'overhead',
    damage: 14,
  },
  snakeBite: {
    name: 'Snake Bite',
    description: 'Holds the opponent for three quick knee strikes, then kicks them away.',
    kind: 'flurry',
    hits: 3,
    damagePerHit: 3,
    finisherDamage: 5,
  },
  outlierRemoval: {
    name: 'Outlier Removal',
    description: 'Plots the opponent on a bell curve, marks them as an outlier and throws them off the chart.',
    kind: 'stats',
    ticks: 3,
    damagePerTick: 2,
    finisherDamage: 8,
  },
  defibrillator: {
    name: 'Defibrillator',
    description: 'Grabs the opponent and pumps electricity through them, then blasts them away.',
    kind: 'shock',
    ticks: 4,
    damagePerTick: 2,
    finisherDamage: 6,
  },
};
