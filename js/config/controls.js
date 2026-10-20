// Key bindings. Values are KeyboardEvent.code names; each action can have
// several keys. Full list of codes:
// https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
RF.CONTROLS = {
  p1: {
    left: ['KeyA'],
    right: ['KeyD'],
    up: ['KeyW'],
    down: ['KeyS'],        // menus only (no crouch yet)
    light: ['KeyF'],
    heavy: ['KeyG'],
    block: ['KeyH'],
  },
  p2: {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    // Numpad for full keyboards, , . / as a laptop-friendly alternative.
    light: ['Numpad1', 'Comma'],
    heavy: ['Numpad2', 'Period'],
    block: ['Numpad3', 'Slash'],
  },
};
