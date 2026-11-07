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
  problemSet: {
    name: 'Problem Set',
    description: 'Sprints in and unloads a flurry that doubles every hit - 1, 2, 4, 8... - then an EXPONENTIAL uppercut.',
    kind: 'punchRush',
    startup: 6,
    dash: 24,            // max frames sprinting in
    speed: 8,
    punches: 7,
    interval: 4,
    recovery: 18,
    damage: 2.4,         // per punch
    finalDamage: 9,
    hitstun: 18, blockstun: 8, pushback: 0.6, hitstop: 3,
    launch: 0,
  },
  filibuster: {
    name: 'Filibuster',
    description: 'Starts talking and never stops: a relentless stream of BLAH BLAH BLAH that hits again and again.',
    kind: 'volley',
    startup: 10,
    interval: 5,
    recovery: 18,
    heights: [0.8, 0.6, 0.85, 0.5, 0.75, 0.55, 0.9, 0.65],
    speed: 5.5,
    size: 12,
    damage: 3.2,         // per BLAH
    hitstun: 18, blockstun: 8, pushback: 1.5, hitstop: 3,
    glyphs: ['BLAH'],
    callouts: ['BLAH', 'BLAH', 'AND ANOTHER THING', 'BLAH', 'FURTHERMORE', 'BLAH', 'IN CONCLUSION', 'JUST KIDDING'],
    colors: ['#ffffff', '#ffd8a0', '#c08040'],
  },
  divineTouch: {
    name: 'Divine Touch',
    description: 'The clouds part over the opponent and a giant painted hand reaches down and strikes them with holy light.',
    kind: 'heavenHand',
    startup: 20,         // the clouds part
    reach: 22,           // frames for the hand to come down
    recovery: 24,
    damage: 18,
    hitstun: 36, blockstun: 18, pushback: 4, hitstop: 14,
    launch: 6,
  },
  makeItRain: {
    name: 'Make It Rain',
    description: 'Opens his wallet over the opponent: gold bars and cash rain down. The last one is a giant 24-karat bar.',
    kind: 'barRain', look: 'money', callout: 'MAKE IT RAIN!',
    startup: 14, bars: 6, interval: 7, fall: 14, recovery: 20,
    damage: 3.5, megaDamage: 9,
    hitstun: 26, blockstun: 10, pushback: 1, hitstop: 4,
    launch: 0,
  },
  broBatch: {
    name: 'Bro Batch',
    description: 'Opens a portal above the opponent and rains down a fresh batch of giant BRO BATCH protein bars. The last one is a MEGA bar.',
    kind: 'barRain',
    startup: 16,         // the portal opens over their head
    bars: 6,             // how many bars fall
    interval: 7,         // frames between bars
    fall: 14,            // frames each bar takes to land
    recovery: 20,
    damage: 3.5,         // per bar
    megaDamage: 9,       // the final MEGA bar
    hitstun: 26, blockstun: 10, pushback: 1, hitstop: 4,
    launch: 0,
  },
  flyingKnee: {
    name: 'Flying Knee',
    description: 'Launches off the back foot and flies across the stage knee-first.',
    kind: 'flyingKnee',
    startup: 6,          // crouch, then spring
    speed: 7,            // forward speed of the leap
    rise: 6.5,           // upward speed of the leap
    recovery: 10,        // after landing
    damage: 15,
    hitstun: 32, blockstun: 14, pushback: 6, hitstop: 12,
    launch: 7,
  },
  continentalDrift: {
    name: 'Continental Drift',
    description: 'The ground splits and a whole continent slides across the floor like a tectonic plate, flattening the opponent.',
    kind: 'plate',
    startup: 14,         // the earth rumbles
    speed: 7,            // how fast the plate slides
    travel: 44,          // frames it keeps sliding
    recovery: 16,
    damage: 16,
    hitstun: 34, blockstun: 16, pushback: 6, hitstop: 10,
    launch: 7,
  },
  paBlast: {
    name: 'Attention Students',
    description: 'A giant PA speaker drops from the ceiling and blasts the whole screen. Nowhere to run.',
    kind: 'screenWave',
    startup: 16,         // speaker comes down
    delay: 10,           // then the blast hits, wherever they are
    recovery: 26,
    damage: 15,
    hitstun: 34, blockstun: 16, pushback: 5, hitstop: 10,
    launch: 3,
  },
  iambicPentameter: {
    name: 'Iambic Pentameter',
    description: 'Five rhythmic stomps send shockwaves along the floor. The fifth is huge.',
    kind: 'volley',
    startup: 10,
    interval: 12,        // one beat per stomp
    recovery: 20,
    heights: [0.06, 0.06, 0.06, 0.06, 0.06],
    sizes: [12, 12, 12, 12, 22],
    callouts: ['DA-DUM', 'DA-DUM', 'DA-DUM', 'DA-DUM', 'DA-DUM!'],
    stompShake: 6,
    speed: 4.5,
    size: 12,
    damage: 5,
    hitstun: 20, blockstun: 10, pushback: 3, hitstop: 5,
    art: 'shockwave',
    colors: ['#ffffff', '#e8d0a0', '#8a6a4a'],
    sound: 'stomp',
  },
  serpentStrike: {
    name: 'Serpent Strike',
    description: 'The snake in her jar grows huge and lunges across the screen to bite.',
    kind: 'beam',
    look: 'serpent',
    sound: 'hiss',
    hitDelay: 4,         // frames to lunge out before it bites
    hitEffect: 'hit',
    startup: 14,
    active: 18,
    recovery: 18,
    range: 190,
    thickness: 18,
    handX: 22,
    handY: 50,
    damage: 16,
    hitstun: 32, blockstun: 16, pushback: 4, hitstop: 10,
    colors: ['#ffffff', '#4aa86a', '#2e7a48'],
  },
  sentryTurret: {
    name: 'Sentry Turret',
    description: 'Deploys a mini auto-turret that fires a burst of four shots.',
    kind: 'turret',
    startup: 12,         // building it
    offset: 30,          // how far in front of him it's set down
    shots: 4,
    interval: 8,         // frames between shots
    recovery: 16,
    shot: {
      speed: 6.5, size: 8, height: 0.36,
      damage: 5, hitstun: 16, blockstun: 8, pushback: 2, hitstop: 3,
      colors: ['#ffffff', '#9ff0ff', '#2a8ad8'], sound: 'block',
    },
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
  belayYank: {
    name: 'Belay Yank',
    description: 'Throws a climbing rope with a hook across the screen. If it catches them, it reels them right in front of him for a follow-up.',
    kind: 'grapple',
    startup: 8,
    speed: 9,            // pixels the rope flies per frame
    range: 190,
    recovery: 14,
    damage: 7,
    hitstun: 40, blockstun: 12, pushback: 0, hitstop: 6,
  },
  riemannSum: {
    name: 'Riemann Sum',
    description: 'A row of glowing rectangles erupts from the floor under them, one after another. The last one launches. SUM = YOU LOSE.',
    kind: 'riemann',
    startup: 10,
    bars: 7,
    interval: 4,         // frames between bars
    barHeight: 30,
    recovery: 16,
    damage: 3,           // per bar
    finalDamage: 8,
    hitstun: 20, blockstun: 8, pushback: 0.5, hitstop: 3,
  },
  grandPiano: {
    name: 'Grand Piano',
    description: 'Conducts a grand piano out of the sky onto their head. FORTISSIMO! PLONK!',
    kind: 'pianoDrop',
    startup: 12,
    fall: 22,            // frames the piano falls (the shadow warns where)
    recovery: 18,
    width: 48,
    damage: 18,
    hitstun: 34, blockstun: 16, pushback: 3, hitstop: 14,
  },
  mindSlam: {
    name: 'Mind Slam',
    description: 'Telekinesis! Grabs them with his mind from across the screen, lifts them up and SLAMS them. Blocking breaks the grip.',
    kind: 'telekinesis',
    startup: 12,
    range: 200,          // how far his mind reaches
    lift: 34,            // frames they float before the slam
    height: 70,
    recovery: 16,
    damage: 17,
    hitstun: 30, blockstun: 14, pushback: 3, hitstop: 12,
    callout: 'COME HERE!', color: '#40e8ff',
  },
  cigToss: {
    name: 'Cig Toss',
    description: 'Takes one last drag and flicks his lit cigarette straight at your face. TSSSS!',
    kind: 'projectile',
    startup: 10,
    recovery: 18,
    speed: 6.5,
    size: 10,
    height: 0.78,
    damage: 15,
    hitstun: 28, blockstun: 14, pushback: 5, hitstop: 10,
    art: 'cigarette', sound: 'whoosh', hitText: 'TSSSSS!',
    colors: ['#ffffff', '#f0e8dd', '#ff7020'],
  },
  holeInOne: {
    name: 'Hole in One',
    description: 'Tees up, waggles, yells FORE! and drives a golf ball straight at your face.',
    kind: 'teeShot',
    startup: 18,         // a quick double waggle first (it's part of the joke)
    recovery: 20,
    speed: 8,
    size: 8,
    height: 0.55,
    damage: 15,
    hitstun: 28, blockstun: 14, pushback: 5, hitstop: 10,
    art: 'golfBall', sound: 'whoosh', hitText: 'HOLE IN ONE!',
    colors: ['#ffffff', '#e8e8e8', '#a0a0a0'],
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
