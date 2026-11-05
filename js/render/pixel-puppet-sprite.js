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
//   Optional, for finer art (Jauregui):
//     limbScale: 3               // added arms/legs are drawn in blocks this many art pixels big
//     crouchSquash: true         // squash the legs when crouching instead of folding them
//     hideWhenPosed: ['ruler']   // palette names hidden while an arm is posed (props in hand)
//     weapon: { color, length }  // something held in the posed hand (e.g. a ruler)
//     sleeveColor, sleeveShade   // colour of added sleeves
//     poses: { walk: [...] }     // replace any animation's frame recipes (e.g. a hobbling walk)
//   Any palette name starting with 'pants' or 'shoes' counts as legs.
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
    slam: [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5]], // swinging down hard
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
    throw: [
      F({ arm: 'forward', backArm: 'low', head: [1, 0] }),
      F({ arm: 'up', backArm: 'up', head: [-1, 0] }),
      F({ arm: 'forwardShort', backArm: 'low', head: [2, 1], torso: [1, 1] }),
    ],
    uppercut: [
      F({ crouch: true, arm: 'back' }),
      F({ arm: 'up', legs: 'chamber', head: [2, -4], torso: [1, -4] }),
      F({ arm: 'up', head: [1, -1], torso: [0, -1] }),
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
      this.k = s.limbScale || 1;
      this.cells = { head: [], torso: [], legs: [] };
      const hand = new Set((s.sideHand || []).map(([c, r]) => c + ',' + r));
      const hide = new Set(s.hideWhenPosed || []);
      this.minCol = Infinity;
      s.grid.forEach((row, r) => {
        [...row].forEach((ch, c) => {
          if (ch === '.' || ch === ' ') return;
          const name = s.legend[ch];
          const color = s.palette[name];
          const cell = { c, r, color, hand: hand.has(c + ',' + r), prop: hide.has(name), shoe: /^shoes/.test(name) };
          this.minCol = Math.min(this.minCol, c);
          const isLeg = /^(pants|shoes)/.test(name);
          if (r < s.neckRow && !cell.prop) this.cells.head.push(cell);
          else if (r >= s.waistRow && isLeg) this.cells.legs.push(cell);
          else this.cells.torso.push(cell);
        });
      });
      this.rows = s.grid.length;
      this.cols = Math.max(...s.grid.map((r) => r.length));
      this.sleeve = shade(s.palette[s.sleeveColor || 'coat'], s.sleeveShade == null ? -0.28 : s.sleeveShade);
      this.handColor = s.palette.skin;
      this.pantsColor = s.palette.pants;
      this.shoeColor = s.palette.shoes;

      this.frames = {};
      for (const anim in RF.ANIMATIONS) {
        const recipes = (s.poses && s.poses[anim]) || PUPPET_POSES[anim];
        this.frames[anim] = recipes.map((p) => (p.rotate ? this.bakeLying() : this.bake(p)));
      }
    }

    // Draw one frame recipe to a canvas.
    bake(p) {
      const U = this.U, s = this.s, k = this.k;
      const W = (this.cols + (MARGIN_X + EXTRA_W) * k) * U, H = (this.rows + (MARGIN_TOP + EXTRA_H) * k) * U;
      const [canvas, ctx] = makeCanvas(W, H);
      const ox = MARGIN_X * k * U, oy = MARGIN_TOP * k * U;
      const drop = p.crouch ? (s.crouchDrop || 5) * U : 0;
      // put: one art pixel (h = optional height in game pixels); blk: a k x k limb block.
      const put = (c, r, color, dx = 0, dy = 0, h = U) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(ox + c * U + dx), Math.round(oy + r * U + dy), U, h);
      };
      const blk = (c, r, color, dx = 0, dy = 0) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(ox + c * U + dx), Math.round(oy + r * U + dy), U * k, U * k);
      };
      const off = (k) => p[k] || [0, 0];
      const torsoOff = [off('torso')[0], off('torso')[1] + drop];
      const headOff = [off('head')[0], off('head')[1] + drop];

      const drawArm = (name, dark, extra = [0, 0]) => {
        if (!name) return;
        const cells = ARMS[name];
        const [sc, sr] = s.shoulder;
        const dx = torsoOff[0] + extra[0], dy = torsoOff[1] + extra[1];
        // Held weapon (e.g. a ruler) sticks out of the hand, continuing the arm's direction.
        if (s.weapon && s.weapon.kind === 'book' && !dark) {
          // A big book gripped in the hand (Mr. Dabalsa's Shakespeare).
          const [hx, hy] = cells[cells.length - 1], w = s.weapon;
          const bx = ox + (sc + hx * k + k / 2) * U + dx - (w.w * U) / 2, by = oy + (sr + hy * k + k / 2) * U + dy - (w.h * U) / 2;
          ctx.fillStyle = '#111'; ctx.fillRect(Math.round(bx - U), Math.round(by - U), (w.w + 2) * U, (w.h + 2) * U);
          ctx.fillStyle = w.color; ctx.fillRect(Math.round(bx), Math.round(by), w.w * U, w.h * U);
          ctx.fillStyle = w.trim; ctx.fillRect(Math.round(bx + U), Math.round(by + U), (w.w - 2) * U, U);
          ctx.fillRect(Math.round(bx + U), Math.round(by + (w.h - 2) * U), (w.w - 2) * U, U);
          ctx.fillRect(Math.round(bx + (w.w / 2 - 1) * U), Math.round(by + (w.h / 2 - 2) * U), 3 * U, 4 * U); // the Bard's face
        } else if (s.weapon && s.weapon.kind === 'globe' && !dark) {
          // A desk globe held up in the hand (Holbrook): ocean, continents, brass meridian.
          const [hx, hy] = cells[cells.length - 1], R = s.weapon.r;
          const gx = ox + (sc + hx * k + k / 2) * U + dx, gy = oy + (sr + hy * k + k / 2 - R) * U + dy;
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(gx, gy, (R + 1) * U, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#335975'; ctx.beginPath(); ctx.arc(gx, gy, R * U, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#a49238';
          [[-0.4, -0.3, 0.45], [0.35, 0.1, 0.5], [-0.1, 0.5, 0.3]].forEach(([u, v, z]) => ctx.fillRect(Math.round(gx + u * R * U), Math.round(gy + v * R * U), Math.round(z * R * U), Math.round(z * R * U * 0.8)));
          ctx.strokeStyle = '#b8742a'; ctx.lineWidth = Math.max(1, U);
          ctx.beginPath(); ctx.arc(gx, gy, (R + 1.5) * U, -Math.PI * 0.75, Math.PI * 0.6); ctx.stroke();
          ctx.lineWidth = 1;
        } else if (s.weapon && !dark) {
          const n = cells.length, [hx, hy] = cells[n - 1], [px, py] = cells[n - 2] || [0, 0];
          const dirX = Math.sign(hx - px), dirY = Math.sign(hy - py) || (dirX ? 0 : -1);
          const cx0 = sc + hx * k + k / 2, cy0 = sr + hy * k + k / 2;
          ctx.fillStyle = s.weapon.color;
          for (let i = 0; i < s.weapon.length; i++) {
            const wx = cx0 + dirX * i - (dirY ? 1 : 0), wy = cy0 + dirY * i - (dirX ? 1 : 0);
            ctx.fillRect(Math.round(ox + wx * U + dx), Math.round(oy + wy * U + dy), U * (dirY ? 2 : 1), U * (dirX ? 2 : 1));
          }
        }
        cells.forEach(([cx, cy], i) => {
          const isHand = i === cells.length - 1;
          let col = isHand ? this.handColor : this.sleeve;
          if (dark) col = shade(col, -0.3);
          blk(sc + cx * k, sr + cy * k, col, dx, dy);
        });
      };

      // Back arm, legs, body, head, front arm.
      drawArm(p.backArm, true, p.armOff || [0, 0]);
      this.drawLegs(p, put, blk, drop, false);
      const posedArm = !!p.arm;
      for (const cell of this.cells.torso) {
        if (cell.prop && posedArm) continue; // the prop moves to the posed hand
        const color = cell.hand && posedArm ? s.palette[s.legend[s.coatChar || 'W']] : cell.color;
        put(cell.c, cell.r, color, torsoOff[0], torsoOff[1]);
      }
      for (const cell of this.cells.head) put(cell.c, cell.r, cell.color, headOff[0], headOff[1]);
      this.drawLegs(p, put, blk, drop, true); // a kicking leg goes in front of the body
      drawArm(p.arm, false, p.armOff || [0, 0]);

      return { canvas, anchorX: Math.round(ox + s.footCol * U), anchorY: oy + this.rows * U };
    }

    // Called twice: front=false for everything behind the body, front=true for
    // a leg that kicks out in front of it.
    drawLegs(p, put, blk, drop, front) {
      const s = this.s, legs = this.cells.legs, wr = s.waistRow, k = this.k, U = this.U;
      const dark = (c) => shade(c, -0.3);
      const mode = p.crouch && !p.legs ? 'crouch' : p.legs || 'stand';
      const lo = p.legsOff || [0, 0];
      const hip = legs.filter((c) => c.r === wr);
      const pants = this.pantsColor, shoes = this.shoeColor;
      const [hc, hr] = [s.footCol + k, wr]; // front hip (art pixels)
      const B = (dx, dy, color) => blk(hc + dx * k, hr + dy * k, color); // limb block relative to the hip

      const kicking = ['sweep', 'chamber', 'kick'].includes(mode);
      if (front && !kicking) return;
      if (front) {
        if (mode === 'sweep') {
          const row = this.rows - k;
          for (let i = 1; i <= 6; i++) blk(hc + i * k, row, pants);
          blk(hc + 7 * k, row, shoes); blk(hc + 7 * k, row - k, shoes);
        } else if (mode === 'chamber') {
          [[1, -1], [2, -2], [2, -1], [3, -1], [3, 0], [3, 1], [3, 2]].forEach(([dx, dy]) => B(dx, dy, pants));
          B(3, 3, shoes); B(4, 3, shoes);
        } else {
          for (let i = 0; i < 5; i++) { B(1 + i, -1 - i, pants); B(1 + i, -i, pants); }
          B(6, -6, shoes); B(6, -5, shoes); B(7, -6, shoes);
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
        case 'tuck': { // knees pulled up for a jump: thighs, then the shoes tucked up under them
          const keep = wr + 2 * k, shoes = legs.filter((c) => c.shoe);
          for (const c of legs) if (c.r <= keep) put(c.c, c.r, c.color, lo[0], lo[1]);
          const shoeTop = Math.min(...shoes.map((c) => c.r));
          const lift = Math.max(3 * k, shoeTop - keep - 1);
          for (const c of shoes) put(c.c + k, c.r - lift, c.color, lo[0], lo[1]);
          break;
        }
        case 'crouch':
        case 'sweep': {
          if (s.crouchSquash) {
            // Squash the legs into the space left under the sunken body; knees forward a little.
            const legH = this.rows - wr, f = (legH - drop / U) / legH;
            for (const c of legs) {
              const nr = wr + drop / U + (c.r - wr) * f;
              const knee = Math.round(Math.sin(((c.r - wr) / legH) * Math.PI) * k);
              put(c.c + knee, nr, c.color, 0, 0, Math.ceil(U * f) + 1);
            }
            break;
          }
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
      const U = this.U, k = this.k;
      const len = this.rows * U, thick = (this.cols + 2) * U;
      const [canvas, ctx] = makeCanvas(len + 12, thick + 4);
      const backEdge = (MARGIN_X * k + this.minCol + 1) * U; // x of the figure's back in the stand canvas
      const midY = MARGIN_TOP * k * U + len / 2;             // vertical middle of the figure
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
