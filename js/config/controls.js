// Key bindings. Values are KeyboardEvent.code names; each action can have
// several keys. Full list of codes:
// https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
//
// Controllers (PS5 DualSense etc.): the first controller is player 1, the second is
// player 2. Its buttons are named Pad1Square, Pad1Triangle, Pad1Circle, Pad1Cross,
// Pad1L1, Pad1R1, Pad1L2, Pad1R2, Pad1Up/Down/Left/Right (D-pad or left stick).
// Default layout:
//   D-pad / left stick  move, up = jump, down = crouch
//   SQUARE  light       TRIANGLE  heavy       CIRCLE / R1  block
//   CROSS / L1  throw   R2  SUPER (light + heavy at once)   OPTIONS  pause
const pad = (n, ...names) => names.map((b) => 'Pad' + n + b);
RF.CONTROLS = {
  p1: {
    left: ['KeyA', ...pad(1, 'Left')],
    right: ['KeyD', ...pad(1, 'Right')],
    up: ['KeyW', ...pad(1, 'Up')],
    down: ['KeyS', ...pad(1, 'Down')],
    light: ['KeyF', ...pad(1, 'Square', 'R2')],
    heavy: ['KeyG', ...pad(1, 'Triangle', 'R2')],
    block: ['KeyH', ...pad(1, 'Circle', 'R1')],
    throw: ['KeyT', ...pad(1, 'Cross', 'L1')],
  },
  p2: {
    left: ['ArrowLeft', ...pad(2, 'Left')],
    right: ['ArrowRight', ...pad(2, 'Right')],
    up: ['ArrowUp', ...pad(2, 'Up')],
    down: ['ArrowDown', ...pad(2, 'Down')],
    // Numpad for full keyboards, , . / as a laptop-friendly alternative.
    light: ['Numpad1', 'Comma', ...pad(2, 'Square', 'R2')],
    heavy: ['Numpad2', 'Period', ...pad(2, 'Triangle', 'R2')],
    block: ['Numpad3', 'Slash', ...pad(2, 'Circle', 'R1')],
    throw: ['Numpad4', 'KeyL', ...pad(2, 'Cross', 'L1')],
  },
};
