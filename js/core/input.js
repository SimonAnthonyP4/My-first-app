// Keyboard handling. Uses KeyboardEvent.code (physical key position), so the
// split layout works the same on QWERTY/AZERTY/etc.
(function () {
  const BLOCK_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Quote', 'Backquote']);

  class Keyboard {
    constructor(target = window) {
      this.down = new Set();
      this.pressedAt = new Map(); // code -> frame number when last pressed
      this.frame = 0;
      target.addEventListener('keydown', (e) => {
        if (BLOCK_DEFAULT.has(e.code) || this.gameKeys.has(e.code)) e.preventDefault();
        if (!this.down.has(e.code)) this.pressedAt.set(e.code, this.frame);
        this.down.add(e.code);
      });
      target.addEventListener('keyup', (e) => this.down.delete(e.code));
      target.addEventListener('blur', () => this.down.clear());
      this.gameKeys = new Set();
    }

    tick() { this.frame++; }
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
      return t > consumed && this.kb.frame - t <= buffer;
    }

    consume(action) { this.consumedAt[action] = this.kb.frame; }
  }

  RF.Keyboard = Keyboard;
  RF.PlayerInput = PlayerInput;
})();
