// "Pixel puppet" sprites: a fighter drawn by hand as ONE standing frame (e.g. in
// Piskel), animated by moving its parts (head, body, legs) and adding blocky
// arms/legs in the same style. Lets you put hand-drawn art in the game without
// drawing every animation frame.
//
// Character config (see characters.js, Dr. Weissenberg):
//   sprite: {
//     type: 'pixel',
//     scale: 3,                  // each art pixel = 3 game pixels
//     legend: { H: 'hair', ... } // grid letter -> palette colour name ('.' = empty)
//     palette: { hair: '#...', ... },
//     grid: [ '...', ... ],      // the drawing, facing right, one string per row
//     neckRow, waistRow          // first row of the body / first row of the legs
//     shoulder: [col, row],      // where arms attach
//     sideHand: [[col, row], ...]// hand pixels in the drawing (hidden when an arm is posed)
//     footCol                    // column the fighter stands on (anchor)
//     crouchDrop                 // art pixels the body sinks when crouching
//   }
(function () {
  const { shade, makeCanvas } = RF.util;
  const MARGIN_X = 8, MARGIN_TOP = 3, EXTRA_W = 12, EXTRA_H = 1; // canvas padding, in art pixels

  // Arms, as art-pixel cells relative to the shoulder: [dx, dy]; the last cell is the hand.
  const ARMS = {
    forward: [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]],
    forwardShort: [[1, 1], [2, 1], [3, 1], [4, 1]],
    back: [[-1, 1], [-2, 1], [-3, 1], [-4, 1]],
    block: [[1, 1], [2, 1], [3, 1], [3, 0], [3, -1], [3, -2], [3, -3]],
    up: [[1, 0], [2, 0], [3, 0], [4, 0], [4, -1], [4, -2], [4, -3], [4, -4], [4, -5], [4, -6]],
    flail: [[-1, 0], [-2, -1], [-3, -2], [-4, -3]],
    low: [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3]],
  };

  // Frame recipes for every animation. Offsets are in game pixels.
  //   head/torso/legsOff: [dx, dy]   arm/backArm: ARMS key   legs: leg mode
  //   crouch: sink the body           rotate: lying on the floor (KO)
  const F = (o) => o;
  const PUPPET_POSES = {
    idle: [F({}), F({ head: [0, 1], torso: [0, 1] })],
    walk: [
      F({ legs: 'stride', stride: 3, head: [0, -1], torso: [0, -1] }),
      F({}),
      F({ legs: 'stride', stride: -3, head: [0, -1], torso: [0, -1] }),
      F({}),
    ],
    jump: [F({ legs: 'tuck', arm: 'flail' })],
    light: [
      F({ arm: 'back', head: [-1, 0] }),
      F({ arm: 'forward', head: [2, 0], torso: [1, 0] }),
      F({ arm: 'forwardShort', head: [1, 0] }),
    ],
    heavy: [
      F({ legs: 'chamber', head: [-2, 0], arm: 'back' }),
      F({ legs: 'kick', head: [-4, 0], torso: [-2, 0], arm: 'back' }),
      F({ legs: 'chamber', head: [-1, 0] }),
    ],
    block: [F({ arm: 'block', head: [-1, 0] })],
    hit: [F({ arm: 'flail', head: [-4, 0], torso: [-2, 0] })],
    ko: [F({ arm: 'flail', legs: 'tuck', head: [-5, 0], torso: [-3, 0] }), F({ rotate: true })],
    victory: [F({ arm: 'up' }), F({ arm: 'up', armOff: [0, -2], head: [0, -1] })],
    special: [
      F({ arm: 'back', backArm: 'back', head: [-2, 1], torso: [-1, 1] }),
      F({ arm: 'forward', backArm: 'low', head: [2, 0], torso: [1, 0] }),
      F({ arm: 'forward', backArm: 'low', head: [2, 0], torso: [1, 0] }),
    ],
    crouch: [F({ crouch: true })],
    crouchBlock: [F({ crouch: true, arm: 'block' })],
    lowLight: [
      F({ crouch: true, arm: 'back' }),
      F({ crouch: true, arm: 'forward', head: [2, 0] }),
      F({ crouch: true, arm: 'forwardShort' }),
    ],
    lowHeavy: [
      F({ crouch: true, arm: 'back' }),
      F({ crouch: true, legs: 'sweep', head: [-2, 0], arm: 'back' }),
      F({ crouch: true }),
    ],
  };

  class PixelPuppetSprite {
    constructor(def) {
      const s = def.sprite;
      this.s = s;
      this.U = s.scale;
      // Split the drawing into parts.
      this.cells = { head: [], torso: [], legs: [] };
      const hand = new Set((s.sideHand || []).map(([c, r]) => c + ',' + r));
      s.grid.forEach((row, r) => {
        [...row].forEach((ch, c) => {
          if (ch === '.' || ch === ' ') return;
          const color = s.palette[s.legend[ch]];
          const cell = { c, r, color, hand: hand.has(c + ',' + r) };
          if (r < s.neckRow) this.cells.head.push(cell);
          else if (r >= s.waistRow && ['pants', 'shoes'].includes(s.legend[ch])) this.cells.legs.push(cell);
          else this.cells.torso.push(cell);
        });
      });
      this.rows = s.grid.length;
      this.cols = Math.max(...s.grid.map((r) => r.length));
      this.sleeve = shade(s.palette[s.sleeveColor || 'coat'], -0.28);
      this.handColor = s.palette.skin;
      this.pantsColor = s.palette.pants;
      this.shoeColor = s.palette.shoes;

      this.frames = {};
      for (const anim in RF.ANIMATIONS) {
        this.frames[anim] = PUPPET_POSES[anim].map((p) => (p.rotate ? this.bakeLying() : this.bake(p)));
      }
    }

    // Draw one frame recipe to a canvas.
    bake(p) {
      const U = this.U, s = this.s;
      const W = (this.cols + MARGIN_X + EXTRA_W) * U, H = (this.rows + MARGIN_TOP + EXTRA_H) * U;
      const [canvas, ctx] = makeCanvas(W, H);
      const ox = MARGIN_X * U, oy = MARGIN_TOP * U;
      const drop = p.crouch ? (s.crouchDrop || 5) * U : 0;
      const put = (c, r, color, dx = 0, dy = 0) => {
        ctx.fillStyle = color;
        ctx.fillRect(ox + c * U + dx, oy + r * U + dy, U, U);
      };
      const off = (k) => p[k] || [0, 0];
      const torsoOff = [off('torso')[0], off('torso')[1] + drop];
      const headOff = [off('head')[0], off('head')[1] + drop];

      const drawArm = (name, dark, extra = [0, 0]) => {
        if (!name) return;
        const cells = ARMS[name];
        const [sc, sr] = s.shoulder;
        const dx = torsoOff[0] + extra[0], dy = torsoOff[1] + extra[1];
        cells.forEach(([cx, cy], i) => {
          const isHand = i === cells.length - 1;
          let col = isHand ? this.handColor : this.sleeve;
          if (dark) col = shade(col, -0.3);
          put(sc + cx, sr + cy, col, dx, dy);
        });
      };

      // Back arm, legs, body, head, front arm.
      drawArm(p.backArm, true, p.armOff || [0, 0]);
      this.drawLegs(p, put, drop, false);
      const posedArm = !!p.arm;
      for (const cell of this.cells.torso) {
        const color = cell.hand && posedArm ? s.palette[s.legend[s.coatChar || 'W']] : cell.color;
        put(cell.c, cell.r, color, torsoOff[0], torsoOff[1]);
      }
      for (const cell of this.cells.head) put(cell.c, cell.r, cell.color, headOff[0], headOff[1]);
      this.drawLegs(p, put, drop, true); // a kicking leg goes in front of the body
      drawArm(p.arm, false, p.armOff || [0, 0]);

      return { canvas, anchorX: Math.round(ox + s.footCol * U), anchorY: oy + this.rows * U };
    }

    // Called twice: front=false for everything behind the body, front=true for
    // a leg that kicks out in front of it.
    drawLegs(p, put, drop, front) {
      const s = this.s, legs = this.cells.legs, wr = s.waistRow;
      const dark = (c) => shade(c, -0.3);
      const mode = p.crouch && !p.legs ? 'crouch' : p.legs || 'stand';
      const lo = p.legsOff || [0, 0];
      const hip = legs.filter((c) => c.r === wr);
      const pants = this.pantsColor, shoes = this.shoeColor;
      const [hc, hr] = [s.footCol + 1, wr]; // front hip (art pixels)

      const kicking = ['sweep', 'chamber', 'kick'].includes(mode);
      if (front && !kicking) return;
      if (front) {
        if (mode === 'sweep') {
          const row = this.rows - 1;
          for (let i = 1; i <= 6; i++) put(hc + i, row, pants);
          put(hc + 7, row, shoes); put(hc + 7, row - 1, shoes);
        } else if (mode === 'chamber') {
          [[1, -1], [2, -2], [2, -1], [3, -1], [3, 0], [3, 1], [3, 2]].forEach(([dx, dy]) => put(hc + dx, hr + dy, pants));
          put(hc + 3, hr + 3, shoes); put(hc + 4, hr + 3, shoes);
        } else {
          for (let i = 0; i < 5; i++) { put(hc + 1 + i, hr - 1 - i, pants); put(hc + 1 + i, hr - i, pants); }
          put(hc + 6, hr - 6, shoes); put(hc + 6, hr - 5, shoes); put(hc + 7, hr - 6, shoes);
        }
        return;
      }
      switch (mode) {
        case 'stride': // back leg (darker) and front leg spread apart
          for (const c of legs) {
            const d = c.r === wr ? 0 : -p.stride;
            put(c.c, c.r, dark(c.color), lo[0] + d, lo[1]);
          }
          for (const c of legs) put(c.c, c.r, c.color, lo[0] + (c.r === wr ? 0 : p.stride), lo[1]);
          break;
        case 'tuck': // knees pulled up for a jump
          for (const c of legs) {
            if (c.r > wr + 2) continue;
            put(c.c, c.r, c.color, lo[0], lo[1]);
          }
          for (const c of legs) if (c.color === shoes) put(c.c + 1, c.r - 3, c.color, lo[0], lo[1]);
          break;
        case 'crouch':
        case 'sweep': {
          // Hips sink onto the shoes; knees poke forward.
          for (const c of hip) put(c.c, c.r, c.color, 0, drop);
          for (const c of hip) put(c.c + 1, c.r, c.color, 0, drop);
          for (const c of legs) if (c.r === this.rows - 1) put(c.c + 1, c.r, c.color);
          break;
        }
        case 'chamber': // back leg standing; the raised front knee is drawn in the front pass
        case 'kick':    // back leg standing; the kicking leg is drawn in the front pass
          for (const c of legs) put(c.c, c.r, dark(c.color));
          break;
        default: // stand
          for (const c of legs) put(c.c, c.r, c.color, lo[0], lo[1]);
      }
    }

    // KO: the standing pose turned on its back, head away from the opponent.
    bakeLying() {
      const stand = this.bake({});
      const U = this.U;
      const len = this.rows * U, thick = (this.cols + 2) * U;
      const [canvas, ctx] = makeCanvas(len + 12, thick + 4);
      const backEdge = (MARGIN_X + 1) * U;               // x of the figure's back in the stand canvas
      const midY = MARGIN_TOP * U + len / 2;             // vertical middle of the figure
      ctx.translate(Math.round((len + 12) / 2), thick + 3);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(stand.canvas, -backEdge, -midY);
      return { canvas, anchorX: Math.round((len + 12) / 2), anchorY: thick + 4 };
    }

    draw(ctx, anim, frame, x, y, facing, tint) {
      const list = this.frames[anim] || this.frames.idle;
      RF.drawBakedFrame(ctx, list[frame % list.length], x, y, facing, tint);
    }
  }

  RF.PUPPET_POSES = PUPPET_POSES;
  RF.PixelPuppetSprite = PixelPuppetSprite;
})();
