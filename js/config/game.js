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

  MAX_HEALTH: 100,        // identical for every character
  ROUNDS_TO_WIN: 2,       // best of three
  ROUND_TIME: 99,         // seconds per round (0 = no time limit)

  GRAVITY: 0.45,
  BACKWALK_FACTOR: 0.8,   // walking away from the opponent is a bit slower
  JUMP_FORWARD_FACTOR: 1.1,
  CHIP_DAMAGE: 0.1,       // fraction of damage that still gets through a block
  INPUT_BUFFER: 6,        // frames an attack press is remembered

  // Perfect block: press block no more than this many frames before a hit
  // lands to trigger your special move (8 frames = ~0.13 s).
  PERFECT_BLOCK_WINDOW: 8,
  PERFECT_BLOCK_COOLDOWN: 30, // presses closer together than this don't count (no mashing)
  PERFECT_BLOCK_STAGGER: 40,  // frames the attacker is stunned after being perfect-blocked

  SHOW_HITBOXES: false,
};
