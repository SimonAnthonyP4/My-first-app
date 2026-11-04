// Global rules of the game. Character-specific numbers live in characters.js,
// attack frame data lives in moves.js.
RF.CONFIG = {
  TITLE: 'RETRO FIGHTER', // working title, shown on the main menu
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
  MAX_CHAIN: 3,           // light attacks that connect can be cancelled into another attack this many times
  COMBO_SCALING: 0.1,     // each extra hit in a combo does 10% less damage...
  COMBO_MIN_SCALE: 0.5,   // ...down to half damage       // fraction of damage that still gets through a block
  INPUT_BUFFER: 6,        // frames an attack press is remembered

  // Perfect block: press block no more than this many frames before a hit
  // lands to trigger your special move (8 frames = ~0.13 s).
  PERFECT_BLOCK_WINDOW: 8,
  PERFECT_BLOCK_COOLDOWN: 30, // presses closer together than this don't count (no mashing)
  PERFECT_BLOCK_STAGGER: 40,  // frames the attacker is stunned after being perfect-blocked

  MUSIC_VOLUME: 0.7,      // 0..1
  SFX_VOLUME: 0.8,        // 0..1
  CPU_LEVEL: 'normal',    // easy / normal / hard (see ai.js)
  SHOW_HITBOXES: false,
};
