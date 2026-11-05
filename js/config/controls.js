// Key bindings. Values are KeyboardEvent.code names; each action can have
// several keys. Full list of codes:
// https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
//
// Controllers (PS5 DualSense etc.): the first controller is player 1, the second is
// player 2. Its buttons are named Pad1Square, Pad1Triangle, Pad1Circle, Pad1Cross,
// Pad1L1, Pad1R1, Pad1L2, Pad1R2, Pad1Up/Down/Left/Right (D-pad or left stick).
// Default layout:
//   D-pad / left stick  move, up = jump, down = crouch
//   SQUARE  light       TRIANGLE  heavy       CIRCLE / L1  block      CROSS  throw
//   R1  dash (hold back for a backdash)      L2  EX special (1 bar)
//   R2  SUPER (light + heavy at once; also the combo breaker while you're being hit)
//   CREATE / touchpad  taunt                  OPTIONS  pause
const pad = (n, ...names) => names.map((b) => 'Pad' + n + b);
RF.CONTROLS = {
  p1: {
    left: ['KeyA', ...pad(1, 'Left')],
    right: ['KeyD', ...pad(1, 'Right')],
    up: ['KeyW', ...pad(1, 'Up')],
    down: ['KeyS', ...pad(1, 'Down')],
    light: ['KeyF', ...pad(1, 'Square', 'R2')],
    heavy: ['KeyG', ...pad(1, 'Triangle', 'R2')],
    block: ['KeyH', ...pad(1, 'Circle', 'L1')],
    throw: ['KeyT', ...pad(1, 'Cross')],
    taunt: ['KeyR', ...pad(1, 'Create', 'Touchpad')],
    dash: ['KeyQ', ...pad(1, 'R1')],
    ex: ['KeyE', ...pad(1, 'L2')],
  },
  p2: {
    left: ['ArrowLeft', ...pad(2, 'Left')],
    right: ['ArrowRight', ...pad(2, 'Right')],
    up: ['ArrowUp', ...pad(2, 'Up')],
    down: ['ArrowDown', ...pad(2, 'Down')],
    // Numpad for full keyboards, , . / as a laptop-friendly alternative.
    light: ['Numpad1', 'Comma', ...pad(2, 'Square', 'R2')],
    heavy: ['Numpad2', 'Period', ...pad(2, 'Triangle', 'R2')],
    block: ['Numpad3', 'Slash', ...pad(2, 'Circle', 'L1')],
    throw: ['Numpad4', 'KeyL', ...pad(2, 'Cross')],
    taunt: ['Numpad5', 'KeyK', ...pad(2, 'Create', 'Touchpad')],
    dash: ['Numpad0', 'Quote', ...pad(2, 'R1')],
    ex: ['Numpad6', 'Semicolon', ...pad(2, 'L2')],
  },
};
