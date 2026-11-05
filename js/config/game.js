// Global rules of the game. Character-specific numbers live in characters.js,
// attack frame data lives in moves.js.
RF.CONFIG = {
  TITLE: 'TERRAMANIA',    // shown on the main menu
  CREDITS: [
    ['DIRECTED BY', 'YOU AND YOUR FRIEND'],
    ['CODE', 'CLAUDE'],
    ['ART', 'PLACEHOLDER PIXELS (FOR NOW)'],
  ],

  WIDTH: 384,             // internal resolution (arcade-style), scaled up to fit the window
  HEIGHT: 224,
  FPS: 60,                // the simulation runs at a fixed 60 updates per second

  MAX_HEALTH: 100,        // starting health (the health bar shows it as a percentage)
  HEALTH_BY_ARCHETYPE: { tank: 175, light: 100 }, // tanks start at 175%. Bars stay the same size.
  ROUNDS_TO_WIN: 2,       // best of three
  ROUND_TIME: 99,         // seconds per round (0 = no time limit)

  GRAVITY: 0.55,
  BACKWALK_FACTOR: 0.8,   // walking away from the opponent is a bit slower
  JUMP_FORWARD_FACTOR: 1.1,
  JUMP_MIN_SPEED: 2.6,    // forward jumps travel at least this fast, so everyone can jump over the opponent
  CROUCH_HEIGHT: 0.62,    // crouching hurtbox height, as a fraction of standing height
  CHIP_DAMAGE: 0.1,
  THROW_RANGE: 16,        // how close (gap between bodies, in pixels) you must be to grab
  THROW_STARTUP: 4,       // frames the grab takes to reach out
  THROW_WHIFF: 22,        // frames you're stuck after a missed grab
  THROW_BREAK_WINDOW: 10, // frames the victim has to press THROW and break free
  FINISH_TIME: 300,       // frames the loser stays dazed waiting for a finisher (5 s)
  MAX_CHAIN: 3,           // light attacks that connect can be cancelled into another attack this many times
  COMBO_SCALING: 0.1,     // each extra hit in a combo does 10% less damage...
  COMBO_MIN_SCALE: 0.5,   // ...down to half damage       // fraction of damage that still gets through a block
  INPUT_BUFFER: 8,        // frames an attack press is remembered (hit-freeze frames don't count)

  // Air combos: a launcher (UP + HEAVY) pops the opponent up; hold UP to jump after
  // them and chain air attacks. Air heavy on an airborne opponent spikes them into a
  // floor bounce.
  LAUNCH_JUMP: 8.6,       // how high you jump after a launcher
  JUGGLE_GRAVITY: 0.42,   // juggled fighters fall a bit slower (floatier air combos)
  JUGGLE_LIMIT: 8,        // after this many hits in the air they fall out of the combo
  MAX_AIR_CHAIN: 4,       // air attacks that connect can be chained this many times
  DASH_WINDOW: 12,        // double-tap a direction within this many frames to dash
  COUNTER_DAMAGE: 1.25,   // hitting someone during their attack's startup = COUNTER!

  // Super meter: fills as you hit and get hit. When full, press LIGHT + HEAVY together
  // (also works to cancel a light attack that connected) for a powered-up special.
  SUPER_MAX: 300,         // 3 bars of 100
  METER_BAR: 100,
  METER_RATE: 2.2,        // how fast the meter fills
  EX_COST: 100,           // 1 bar: EX special (THROW during a combo, or DOWN + THROW)
  BREAKER_COST: 200,      // 2 bars: COMBO BREAKER (LIGHT + HEAVY while being comboed)
  EX_DAMAGE: 1.15,        // an EX special hits a little harder than a free one
  KNOCKDOWN_TIME: 34,     // frames lying on the floor after being knocked down
  TECH_WINDOW: 10,        // press BLOCK within this many frames of landing to quick-rise (TECH!)
  WAKEUP_TIME: 10,        // frames getting up (can't be hit)
  SUPER_DAMAGE: 1.6,      // a super special does this much more damage
  SUPER_INPUT_WINDOW: 5,  // frames between the two presses
  METER_GAIN: { light: 1.35 }, // light fighters build super meter faster (default 1)

  // Perfect block: press block no more than this many frames before a hit
  // lands to trigger your special move (8 frames = ~0.13 s).
  PERFECT_BLOCK_WINDOW: 8,
  PERFECT_BLOCK_COOLDOWN: 30, // presses closer together than this don't count (no mashing)
  PERFECT_BLOCK_STAGGER: 40,  // frames the attacker is stunned after being perfect-blocked

  MUSIC_VOLUME: 0.7,      // 0..1
  SFX_VOLUME: 0.8,        // 0..1
  CPU_LEVEL: 'normal',
  RUMBLE: true,
  ANNOUNCER: true,
  TRAINING_DUMMY: 'stand',
  TRAINING_TRIAL: 1,      // combo trial shown in training (0 = off) // training mode dummy: stand / block / crouch / jump / cpu        // the deep arena voice ("ROUND ONE... FIGHT!")           // controller vibration on hits    // easy / normal / hard (see ai.js)
  SHOW_HITBOXES: false,
};
