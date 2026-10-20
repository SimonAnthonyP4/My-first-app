// ===================== SPECIAL MOVES =====================
// Each character has exactly one special (characters.js -> `special: '<id>'`).
// It fires automatically when that character PERFECT BLOCKS: block pressed
// within RF.CONFIG.PERFECT_BLOCK_WINDOW frames before an attack lands.
//
// `kind` picks the behaviour code in js/game/special-kinds.js; the other
// numbers here are balance knobs for that kind. Damage is multiplied by the
// user's `damage` stat and reduced by the target's `damageReduction`, same as
// normal attacks. Frame counts are at 60 per second.
RF.SPECIALS = {
  seismicSlam: {
    name: 'Seismic Slam',
    description: 'Leaps at the opponent and pounds the floor. The shockwave launches anyone standing nearby.',
    kind: 'slam',
    startup: 8,          // crouch before the leap
    leapPower: 7,        // jump speed
    maxLeapSpeed: 4.5,   // max horizontal speed while leaping at the opponent
    recovery: 24,        // frames stuck after landing
    radius: 48,          // shockwave reaches this far either side of the landing spot
    height: 26,          // ...and this high off the floor (jump over it!)
    damage: 18,
    hitstun: 30, blockstun: 18, pushback: 4, hitstop: 10,
    launch: 5,           // pops the victim into the air
  },
  venomSpit: {
    name: 'Venom Spit',
    description: 'Spits a glob of venom that streaks across the screen.',
    kind: 'projectile',
    startup: 10,
    recovery: 22,
    speed: 5.5,          // pixels per frame
    size: 12,
    height: 0.62,        // launch height as a fraction of the user's body height
    damage: 16,
    hitstun: 26, blockstun: 16, pushback: 5, hitstop: 8,
    colors: ['#d8ff9a', '#7cff4a', '#2e9a1e'],
  },
};
