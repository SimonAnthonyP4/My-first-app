// Keyboard handling. Uses KeyboardEvent.code (physical key position), so the
// split layout works the same on QWERTY/AZERTY/etc.
(function () {
  // Standard-layout button numbers -> names (PlayStation names; Xbox A/B/X/Y = Cross/Circle/Square/Triangle).
  const PAD_BUTTONS = [[0, 'Cross'], [1, 'Circle'], [2, 'Square'], [3, 'Triangle'], [4, 'L1'], [5, 'R1'], [6, 'L2'], [7, 'R2'], [8, 'Create'], [10, 'L3'], [11, 'R3'], [17, 'Touchpad']];
  const BLOCK_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Quote', 'Backquote']);

  class Keyboard {
    constructor(target = window) {
      this.down = new Set();
      this.pressedAt = new Map(); // code -> frame number when last pressed
      this.frame = 0;
      target.addEventListener('keydown', (e) => {
        if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return; // typing a room code
        if (BLOCK_DEFAULT.has(e.code) || this.gameKeys.has(e.code)) e.preventDefault();
        if (!this.down.has(e.code)) this.pressedAt.set(e.code, this.frame);
        this.down.add(e.code);
      });
      target.addEventListener('keyup', (e) => this.down.delete(e.code));
      target.addEventListener('blur', () => this.down.clear());
      this.gameKeys = new Set();
      this.padDown = new Set();
      this.pads = [];
      this.stickDir = [null, null]; // last 8-way stick sector per controller
    }

    tick() { this.frame++; }

    // ---- Game controllers (PS5 DualSense, PS4, Xbox, ...) via the Gamepad API ----
    // Each connected controller's buttons become virtual "keys" named
    // Pad1Square, Pad1Cross, Pad1Up, ... (Pad2... for the second controller), which
    // config/controls.js maps to actions just like keyboard keys. OPTIONS acts as Escape.
    pollPads() {
      const pads = (navigator.getGamepads ? [...navigator.getGamepads()] : []).filter((p) => p && p.connected);
      const now = new Set();
      pads.slice(0, 2).forEach((pad, i) => {
        const P = 'Pad' + (i + 1);
        const btn = (n) => { const b = pad.buttons[n]; return !!b && (b.pressed || b.value > 0.5); };
        const ax = (n) => pad.axes[n] || 0;
        PAD_BUTTONS.forEach(([n, name]) => { if (btn(n)) now.add(P + name); });
        // D-pad as-is; the left stick is read as a proper 8-way stick (like an arcade
        // joystick): a small round dead zone, 45-degree sectors, and a little stickiness
        // so a held direction doesn't flicker while you roll it (down -> down-forward -> forward).
        if (btn(12)) now.add(P + 'Up');
        if (btn(13)) now.add(P + 'Down');
        if (btn(14)) now.add(P + 'Left');
        if (btn(15)) now.add(P + 'Right');
        const sx = ax(0), sy = ax(1), mag = Math.hypot(sx, sy), prev = this.stickDir[i];
        if (mag > (prev != null ? 0.24 : 0.32)) {
          let sector = Math.round(Math.atan2(sy, sx) / (Math.PI / 4)); // 0=right, 2=down, 4/-4=left, -2=up
          const exact = Math.atan2(sy, sx) / (Math.PI / 4);
          if (prev != null && Math.abs(exact - prev) < 0.62) sector = prev;             // stick to the old sector near a border
          else if (prev != null && Math.abs(Math.abs(exact) - 4) < 0.62 && Math.abs(prev) === 4) sector = prev;
          this.stickDir[i] = sector;
          const s = ((sector % 8) + 8) % 8; // 0 right, 1 down-right, 2 down, 3 down-left, 4 left, 5 up-left, 6 up, 7 up-right
          if (s === 7 || s === 0 || s === 1) now.add(P + 'Right');
          if (s === 3 || s === 4 || s === 5) now.add(P + 'Left');
          if (s === 1 || s === 2 || s === 3) now.add(P + 'Down');
          if (s === 5 || s === 6 || s === 7) now.add(P + 'Up');
        } else this.stickDir[i] = null;
        if (btn(9)) now.add('Escape'); // OPTIONS = pause / back
      });
      // Turn changes into the same press/release bookkeeping keys get.
      for (const code of now) if (!this.padDown.has(code)) { this.pressedAt.set(code, this.frame); this.down.add(code); }
      for (const code of this.padDown) if (!now.has(code)) this.down.delete(code);
      this.padDown = now;
      this.pads = pads.slice(0, 2);
    }

    // Shake a controller (player 0 or 1). Strength 0..1, duration in ms.
    rumble(player, strength, ms) {
      const pad = this.pads && this.pads[player], act = pad && pad.vibrationActuator;
      if (!act || !RF.CONFIG.RUMBLE) return;
      try {
        act.playEffect(act.type || 'dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength * 1.2) }).catch(() => {});
      } catch (e) { /* not supported */ }
    }
    isDown(code) { return this.down.has(code); }
    lastPress(code) { return this.pressedAt.has(code) ? this.pressedAt.get(code) : -Infinity; }
    // True only on the update step in which the key went down (for menus / toggles).
    justPressed(...codes) { return codes.some((c) => this.lastPress(c) === this.frame); }
  }

  // One player's view of the keyboard, mapped to actions (see config/controls.js).
  // Presses are buffered for a few frames so an attack pressed slightly early
  // (e.g. during the previous attack's recovery) still comes out.
  class PlayerInput {
    constructor(kb, map) {
      this.kb = kb;
      this.map = map;
      this.consumedAt = {};
      for (const action in map) map[action].forEach((c) => kb.gameKeys.add(c));
    }

    held(action) {
      return (this.map[action] || []).some((c) => this.kb.isDown(c));
    }

    lastPress(action) {
      return Math.max(-Infinity, ...(this.map[action] || []).map((c) => this.kb.lastPress(c)));
    }

    pressed(action, buffer = RF.CONFIG.INPUT_BUFFER) {
      const t = this.lastPress(action);
      const consumed = action in this.consumedAt ? this.consumedAt[action] : -Infinity;
      return t > consumed && RF.bufferAge(this, t) <= buffer;
    }

    noteFrame(frozen) { RF.noteFrame(this, frozen); }

    consume(action) { this.consumedAt[action] = this.kb.frame; }
  }

  // Input buffering: a press stays "fresh" for INPUT_BUFFER frames of actual
  // gameplay. Frames frozen in hit-stop or a super cut-in don't age it, so an
  // attack pressed during the freeze still comes out right after.
  RF.noteFrame = (inp, frozen) => {
    if (!inp.frozenAt) { inp.frozenAt = new Map(); inp.frozen = 0; }
    inp.frozenAt.set(inp.kb.frame, inp.frozen);
    inp.frozenAt.delete(inp.kb.frame - 90);
    if (frozen) inp.frozen++;
  };
  RF.bufferAge = (inp, t) => {
    const raw = inp.kb.frame - t;
    if (!inp.frozenAt || !inp.frozenAt.has(t)) return raw;
    return raw - (inp.frozen - inp.frozenAt.get(t));
  };

  RF.Keyboard = Keyboard;
  RF.PlayerInput = PlayerInput;
})();
