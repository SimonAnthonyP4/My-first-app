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
    description: 'Leaps at the opponent and pounds the floor. The shockwave launches them.',
    kind: 'slam',
    startup: 8,          // crouch before the leap
    leapPower: 8.5,      // jump speed
    maxLeapSpeed: 4.5,   // max horizontal speed while leaping at the opponent
    recovery: 24,        // frames stuck after landing
    radius: 48,          // shockwave reaches this far either side of the landing spot
    height: 26,          // ...and this high off the floor (jump over it!)
    damage: 18,
    hitstun: 30, blockstun: 18, pushback: 4, hitstop: 10,
    launch: 5,           // pops the victim into the air
  },
  teslaSurge: {
    name: 'Tesla Surge',
    description: 'Fires a crackling bolt of electricity from his hands straight across the screen.',
    kind: 'beam',
    startup: 14,         // charging up (sparks crackle around him)
    active: 16,          // frames the bolt is out
    recovery: 18,
    range: 200,          // how far the bolt reaches
    thickness: 14,       // how tall the bolt's hit area is
    handX: 20,           // where the bolt starts: in front of the feet...
    handY: 44,           // ...and this high off the floor
    damage: 15,
    hitstun: 34, blockstun: 16, pushback: 3, hitstop: 10,
    colors: ['#ffffff', '#9ff0ff', '#3a8cff'],
  },
  veto: {
    name: 'VETO',
    description: 'Strikes it down: a giant VETO stamp slams down from the sky onto the opponent.',
    kind: 'drop',
    label: 'VETO',
    startup: 10,         // points to the sky
    fall: 20,            // frames the stamp takes to fall (it lands where they WERE standing)
    recovery: 22,
    width: 44,           // how wide it hits
    height: 70,          // how tall its hit area is
    damage: 17,
    hitstun: 30, blockstun: 16, pushback: 3, hitstop: 10,
    launch: 3,
  },
  popQuiz: {
    name: 'Pop Quiz',
    description: 'Hurls a volley of five math symbols at every height. Pencils down!',
    kind: 'volley',
    startup: 10,
    interval: 6,         // frames between throws
    recovery: 18,
    heights: [0.75, 0.45, 0.9, 0.25, 0.6], // throw heights, as a fraction of her height
    speed: 5,
    size: 12,
    damage: 5,           // per symbol
    hitstun: 18, blockstun: 10, pushback: 2.5, hitstop: 4,
    glyphs: ['Σ', 'Π', '√', '∞', '÷', '±', 'Δ', '∫'],
    colors: ['#ffffff', '#fff2a0', '#c8b060'],
    sound: 'whoosh',
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
