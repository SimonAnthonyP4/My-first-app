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
//     liftLeg: '^(pantslift|shoeslift)' // palette names of a raised leg (Simon): it moves on its own
//                                // with a recipe's liftOff: [dx, dy], and becomes the kicking leg
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

  // The same arms for detailed drawings, shaped like real arms: shoulder -> elbow -> hand, in
  // units of one arm SEGMENT (upper arm = forearm = 1), scaled to each fighter's height when the
  // sprite is built. A raised arm bends at the elbow and stays close to the head instead of
  // sticking out sideways and then straight up.
  const NAT = {
    forward: [[0.5, 0.12], [1.0, 0.2], [1.5, 0.15], [2.0, 0.1]],
    forwardShort: [[0.4, 0.3], [0.75, 0.55], [1.15, 0.4], [1.55, 0.2]],
    back: [[-0.4, 0.3], [-0.8, 0.5], [-1.2, 0.5], [-1.6, 0.45]],
    block: [[0.4, 0.35], [0.8, 0.6], [0.95, 0.1], [1.0, -0.4]],
    up: [[0.3, -0.4], [0.55, -0.85], [0.65, -1.35], [0.7, -1.85]],
    flail: [[-0.4, -0.3], [-0.8, -0.7], [-1.1, -1.1], [-1.3, -1.5]],
    low: [[0.35, 0.45], [0.65, 0.9], [1.1, 1.1], [1.55, 1.25]],
    slam: [[0.45, 0.3], [0.9, 0.55], [1.3, 0.95], [1.65, 1.35]],
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
    jump: [F({ legs: 'tuck', arm: 'flail' }), F({ arm: 'flail', head: [0, 1] })],   // tucked going up, legs down to land
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
    hit: [F({ arm: 'flail', head: [-4, 0], torso: [-2, 0] }), F({ head: [-1, 0], torso: [-1, 0] })], // the impact, then recovering
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

  // ---- in-between frames ----
  const SUB = 3;                                     // frames per pose step (1 pose + 2 in-betweens)
  const LOOPING = new Set(['idle', 'walk']);
  // An arm as a list of cells; named arms from ARMS, or an already-blended list.
  const armCells = (a, arms = ARMS) => (Array.isArray(a) ? a : arms[a]);
  // Resample an arm path (shoulder at [0,0] plus its cells) to n evenly spaced points.
  function resample(cells, n) {
    const pts = [[0, 0], ...cells], len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1] || 1, out = [];
    for (let k = 1; k <= n; k++) {
      const d = (k / n) * total; let j = 1;
      while (j < pts.length - 1 && len[j] < d) j++;
      const u = (d - len[j - 1]) / ((len[j] - len[j - 1]) || 1);
      out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]);
    }
    return out;
  }
  const lerp2 = (a, b, u) => [(a ? a[0] : 0) * (1 - u) + (b ? b[0] : 0) * u, (a ? a[1] : 0) * (1 - u) + (b ? b[1] : 0) * u];
  // A pose part-way (u = 0..1) between recipes p and q.
  function tween(p, q, u, arms) {
    const r = Object.assign({}, u < 0.5 ? p : q);
    if (p.rotate || q.rotate) return r;
    for (const k of ['head', 'torso', 'armOff', 'legsOff', 'liftOff']) if (p[k] || q[k]) r[k] = lerp2(p[k], q[k], u);
    const sp = p.legs === 'stride' ? p.stride : (!p.legs ? 0 : null), sq = q.legs === 'stride' ? q.stride : (!q.legs ? 0 : null);
    if (sp !== null && sq !== null && (p.legs === 'stride' || q.legs === 'stride')) { r.legs = 'stride'; r.stride = sp * (1 - u) + sq * u; }
    if (p.arm && q.arm) {
      const a = armCells(p.arm, arms), b = armCells(q.arm, arms);
      if (a && b) {
        const n = Math.max(a.length, b.length), ra = resample(a, n), rb = resample(b, n);
        r.arm = ra.map((c, i) => [c[0] + (rb[i][0] - c[0]) * u, c[1] + (rb[i][1] - c[1]) * u]);
        r.armName = (u < 0.5 ? p : q).armName || (typeof (u < 0.5 ? p : q).arm === 'string' ? (u < 0.5 ? p : q).arm : null);
      }
    }
    return r;
  }

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
      const liftRe = s.liftLeg ? new RegExp(s.liftLeg) : null;
      this.minCol = Infinity;
      // No waistRow given: the legs start at the first row of trousers / shoes.
      const waistRow = s.waistRow != null ? s.waistRow : s.grid.findIndex((row) => [...row].some((ch) => /^(pants|shoes)/.test(s.legend[ch] || '')));
      this.waistRow = waistRow < 0 ? s.grid.length : waistRow;
      s.grid.forEach((row, r) => {
        [...row].forEach((ch, c) => {
          if (ch === '.' || ch === ' ') return;
          const name = s.legend[ch];
          const color = s.palette[name];
          const cell = { c, r, color, hand: hand.has(c + ',' + r), prop: hide.has(name), shoe: /^shoes/.test(name), lift: !!(liftRe && liftRe.test(name)) };
          this.minCol = Math.min(this.minCol, c);
          const isLeg = /^(pants|shoes)/.test(name);
          if (r < s.neckRow && !cell.prop) this.cells.head.push(cell);
          else if (r >= this.waistRow && isLeg) this.cells.legs.push(cell);
          else this.cells.torso.push(cell);
        });
      });
      this.rows = s.grid.length;
      this.cols = Math.max(...s.grid.map((r) => r.length));
      // which arms: natural, sized to this fighter (one segment = about 15% of their height), or the
      // old blocky ones for the tiny early sprites (or `arms: 'classic'`)
      this.arms = ARMS;
      if (this.k >= 3 && s.arms !== 'classic') {
        const seg = (this.rows * (s.armLength || 0.152)) / this.k;
        this.arms = {}; for (const n in NAT) this.arms[n] = NAT[n].map(([x, y]) => [x * seg, y * seg]);
      }
      // A drawing that shows two separate legs: find the gap between them, so a knee / kick pose
      // can lift the FRONT leg instead of adding a third one. (liftLeg names it by hand instead.)
      if (!liftRe && this.cells.legs.length) {
        const byRow = new Map();
        for (const c of this.cells.legs) { if (!byRow.has(c.r)) byRow.set(c.r, []); byRow.get(c.r).push(c.c); }
        let crotch = null, gapRows = 0;
        for (const r of [...byRow.keys()].sort((a, b) => a - b)) {
          const cs = byRow.get(r).sort((a, b) => a - b); let best = 0, mid = null;
          for (let i = 1; i < cs.length; i++) if (cs[i] - cs[i - 1] - 1 > best) { best = cs[i] - cs[i - 1] - 1; mid = (cs[i] + cs[i - 1]) / 2; }
          if (best >= 2) { gapRows++; if (crotch == null) crotch = mid; }
        }
        if (crotch != null && gapRows > (this.rows - this.waistRow) * 0.4) {
          this.autoLift = true;
          this.frontHip = crotch + (Math.max(...this.cells.legs.filter((c) => c.r <= this.waistRow + 2).map((c) => c.c)) - crotch) / 2; // middle of the front thigh
          for (const c of this.cells.legs) { const cs = byRow.get(c.r); let split = crotch, best = 0; for (let i = 1; i < cs.length; i++) if (cs[i] - cs[i - 1] - 1 > best) { best = cs[i] - cs[i - 1] - 1; split = (cs[i] + cs[i - 1]) / 2; } c.front = c.c > split; }
        }
      }
      this.sleeve = shade(s.palette[s.sleeveColor || 'coat'], s.sleeveShade == null ? -0.28 : s.sleeveShade);
      this.handColor = s.palette[s.handColor || 'skin'];     // palette names; e.g. Simon's wrapped fists
      this.pantsColor = s.palette[s.legColor || 'pants'];     // colour of an added kicking leg
      this.shoeColor = s.palette[s.footColor || 'shoes'];

      this.bigHead = !!RF.CONFIG.MOD_BIGHEAD;          // party mod: Big Head Mode
      this.topPad = this.bigHead ? s.neckRow : 0;      // room above for the giant head
      const hc = this.cells.head.map((c) => c.c);
      this.headPivot = [hc.length ? (Math.min(...hc) + Math.max(...hc)) / 2 : 0, s.neckRow];
      // Frames are baked on first use, with in-between frames blended between every
      // pair of poses so animations flow instead of snapping (see frameList / tween).
      this.recipes = {};
      for (const anim in RF.ANIMATIONS) this.recipes[anim] = (s.poses && s.poses[anim]) || PUPPET_POSES[anim];
      this.baked = {};
    }

    // All baked frames of an animation: each pose plus SUB-1 blended in-betweens after it
    // (looping animations also blend the last pose back into the first).
    frameList(anim) {
      if (this.baked[anim]) return this.baked[anim];
      const rec = this.recipes[anim] || this.recipes.idle, n = rec.length, loop = LOOPING.has(anim), out = [], recs = [];
      for (let i = 0; i < n; i++) {
        const p = rec[i], q = rec[(i + 1) % n];
        out.push(p.rotate ? this.bakeLying() : this.bake(p)); recs.push(p);
        if (i === n - 1 && !loop) break;
        for (let k = 1; k < SUB; k++) {
          const tw = tween(p, q, k / SUB, this.arms);
          out.push(tw.rotate ? this.bakeLying() : this.bake(tw)); recs.push(tw);
        }
      }
      this.baked[anim] = out;
      (this.recipeLists = this.recipeLists || {})[anim] = recs;
      return out;
    }

    // Which built frame `draw(anim, frame)` would show: { anim, i }.
    poseAt(anim, frame) {
      if (!this.recipes[anim]) anim = 'idle';
      const list = this.frameList(anim), loop = LOOPING.has(anim);
      let i = Math.round(frame * SUB);
      i = loop ? ((i % list.length) + list.length) % list.length : Math.max(0, Math.min(list.length - 1, i));
      return { anim, i };
    }

    // A pose part-way between two built frames of (possibly) different animations, for
    // smooth move-to-move transitions. Cached; u is rounded to quarters.
    drawBlend(ctx, from, to, u, x, y, facing, tint) {
      u = Math.max(0.25, Math.min(0.75, Math.round(u * 4) / 4));
      const key = from.anim + from.i + '>' + to.anim + to.i + '@' + u;
      this.blends = this.blends || new Map();
      let f = this.blends.get(key);
      if (f === undefined) {
        this.frameList(from.anim); this.frameList(to.anim);
        const a = this.recipeLists[from.anim][from.i], b = this.recipeLists[to.anim][to.i];
        f = !a || !b || a.rotate || b.rotate ? null : this.bake(tween(a, b, u, this.arms));
        if (this.blends.size > 400) this.blends.clear();
        this.blends.set(key, f);
      }
      if (!f) return false;
      RF.drawBakedFrame(ctx, f, x, y, facing, tint);
      return true;
    }

    // Draw one frame recipe to a canvas.
    bake(p) {
      const U = this.U, s = this.s, k = this.k;
      // An arm thrown back behind the body ('back', 'flail') only shows as a fist poking out past
      // the head on a detailed drawing: it reads as a loose limb. Those keep their own drawn arms.
      if (k >= 3 && s.backArm !== true && ['back', 'flail'].includes(p.armName || p.arm)) p = Object.assign({}, p, { arm: null, armName: null });
      if (s.noArms) p = Object.assign({}, p, { arm: null, armName: null, backArm: null });   // (Urbanik: his arms stay folded)
      const W = (this.cols + (MARGIN_X + EXTRA_W) * k) * U, H = (this.rows + this.topPad + (MARGIN_TOP + EXTRA_H) * k) * U;
      const [canvas, ctx] = makeCanvas(W, H);
      const ox = MARGIN_X * k * U, oy = (MARGIN_TOP * k + this.topPad) * U;
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
      // Pixel-art limbs: a tapered tube through joint points (art pixels), with a dark outline
      // and light/shadow shading so arms and legs look round instead of flat blocks.
      const stampPass = (pts, rAt, fn) => {
        const hit = new Map(), segs = [];
        let total = 0;
        for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(L); total += L; }
        let acc = 0;
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = segs[i - 1], n = Math.max(1, Math.ceil(L / 0.8));
          for (let j = 0; j <= n; j++) {
            const u = j / n, cx = x0 + (x1 - x0) * u, cy = y0 + (y1 - y0) * u, r = rAt(total ? (acc + L * u) / total : 0), R = Math.ceil(r), rr = r * r + 0.3, inv = 1 / (r || 1);
            const bx = Math.round(cx), by = Math.round(cy);
            for (let iy = -R; iy <= R; iy++) for (let ix = -R; ix <= R; ix++) {
              const px = bx + ix, py = by + iy, ex = px - cx, ey = py - cy;
              if (ex * ex + ey * ey <= rr) hit.set((px + 2048) * 4096 + py + 2048, [px, py, ex * inv, ey * inv]);
            }
          }
          acc += L;
        }
        for (const v of hit.values()) fn(...v);
      };
      const limb = (pts, rAt, color, dx = 0, dy = 0) => {
        const outline = shade(color, -0.68), hi = shade(color, 0.2), lo = shade(color, -0.24);
        stampPass(pts, (u) => rAt(u) + 1, (px, py) => put(px, py, outline, dx, dy));
        stampPass(pts, rAt, (px, py, nx, ny) => { const l = -(nx * 0.55 + ny * 0.83); put(px, py, l > 0.42 ? hi : l < -0.5 ? lo : color, dx, dy); });
      };
      this.limb = limb;
      const off = (k) => p[k] || [0, 0];
      const torsoOff = [off('torso')[0], off('torso')[1] + drop];
      const headOff = [off('head')[0], off('head')[1] + drop];

      const drawArm = (name, dark, extra = [0, 0]) => {
        if (!name) return;
        const cells = Array.isArray(name) ? name : this.arms[name];
        if (!cells) return;
        const [sc, sr] = s.shoulder;
        const dx = torsoOff[0] + extra[0], dy = torsoOff[1] + extra[1];
        // A pose can swap what's in the hand (Fernando: cigarette normally, shotgun for the heavy).
        const wpn = p.weapon === undefined ? s.weapon : (p.weapon && s.weapons ? s.weapons[p.weapon] : null);
        // Held weapon (e.g. a ruler) sticks out of the hand, continuing the arm's direction.
        if (wpn && wpn.kind === 'shotgun' && !dark) {
          // A pump shotgun (Fernando): stock back past the hand, long barrel forward, wooden pump.
          const n = cells.length, [hx, hy] = cells[n - 1];
          const gx = ox + (sc + hx * k + k / 2) * U + dx, gy = oy + (sr + hy * k + k / 2) * U + dy;
          const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(gx + x * U), Math.round(gy + y * U), w * U, h * U); };
          R(-9, -2, 27, 5, '#111');            // outline
          R(-8, -1, 6, 3, '#6a3a1c');          // stock
          R(-2, -1, 19, 2, '#3a3a40');         // barrel
          R(-2, -1, 19, 1, '#8a8a94');         // shine
          R(5, 1, 7, 2, '#8a5228');            // pump
        } else if (wpn && wpn.kind === 'cig' && !dark) {
          // The cigarette between his fingers, glowing.
          const n = cells.length, [hx, hy] = cells[n - 1];
          const gx = ox + (sc + hx * k + k) * U + dx, gy = oy + (sr + hy * k) * U + dy;
          ctx.fillStyle = '#f0e8dd'; ctx.fillRect(Math.round(gx), Math.round(gy), 5 * U, U);
          ctx.fillStyle = '#ff7020'; ctx.fillRect(Math.round(gx + 5 * U), Math.round(gy), U, U);
        } else if (wpn && wpn.kind === 'book' && !dark) {
          // A big book gripped in the hand (Mr. Dabalsa's Shakespeare).
          const [hx, hy] = cells[cells.length - 1], w = wpn;
          const bx = ox + (sc + hx * k + k / 2) * U + dx - (w.w * U) / 2, by = oy + (sr + hy * k + k / 2) * U + dy - (w.h * U) / 2;
          ctx.fillStyle = '#111'; ctx.fillRect(Math.round(bx - U), Math.round(by - U), (w.w + 2) * U, (w.h + 2) * U);
          ctx.fillStyle = w.color; ctx.fillRect(Math.round(bx), Math.round(by), w.w * U, w.h * U);
          ctx.fillStyle = w.trim; ctx.fillRect(Math.round(bx + U), Math.round(by + U), (w.w - 2) * U, U);
          ctx.fillRect(Math.round(bx + U), Math.round(by + (w.h - 2) * U), (w.w - 2) * U, U);
          ctx.fillRect(Math.round(bx + (w.w / 2 - 1) * U), Math.round(by + (w.h / 2 - 2) * U), 3 * U, 4 * U); // the Bard's face
        } else if (wpn && wpn.kind === 'cash' && !dark) {
          // A fan of hundred-dollar bills (Chris).
          const [hx, hy] = cells[cells.length - 1];
          const gx = ox + (sc + hx * k + k / 2) * U + dx, gy = oy + (sr + hy * k) * U + dy;
          for (let i = 0; i < 4; i++) {
            ctx.save(); ctx.translate(Math.round(gx), Math.round(gy)); ctx.rotate(-0.9 + i * 0.35);
            ctx.fillStyle = '#111'; ctx.fillRect(-1, -12 * U, 6 * U, 12 * U);
            ctx.fillStyle = '#9ac070'; ctx.fillRect(0, -11 * U, 4 * U, 10 * U);
            ctx.fillStyle = '#5a8040'; ctx.fillRect(U, -7 * U, 2 * U, 2 * U);
            ctx.restore();
          }
        } else if (wpn && wpn.kind === 'globe' && !dark) {
          // A desk globe held up in the hand (Holbrook): ocean, continents, brass meridian.
          const [hx, hy] = cells[cells.length - 1], R = wpn.r;
          const gx = ox + (sc + hx * k + k / 2) * U + dx, gy = oy + (sr + hy * k + k / 2 - R) * U + dy;
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(gx, gy, (R + 1) * U, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#335975'; ctx.beginPath(); ctx.arc(gx, gy, R * U, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#a49238';
          [[-0.4, -0.3, 0.45], [0.35, 0.1, 0.5], [-0.1, 0.5, 0.3]].forEach(([u, v, z]) => ctx.fillRect(Math.round(gx + u * R * U), Math.round(gy + v * R * U), Math.round(z * R * U), Math.round(z * R * U * 0.8)));
          ctx.strokeStyle = '#b8742a'; ctx.lineWidth = Math.max(1, U);
          ctx.beginPath(); ctx.arc(gx, gy, (R + 1.5) * U, -Math.PI * 0.75, Math.PI * 0.6); ctx.stroke();
          ctx.lineWidth = 1;
        } else if (wpn && wpn.kind === 'walkie' && !dark && RF.drawWalkie) {
          // A walkie-talkie in the fist (Ms. Brady).
          const [hx, hy] = cells[cells.length - 1];
          RF.drawWalkie(ctx, ox + (sc + hx * k + k / 2) * U + dx, oy + (sr + hy * k + k) * U + dy, U);
        } else if (wpn && wpn.kind === 'skateboard' && !dark) {
          // A skateboard held by the tail (Bandy): the deck runs along the arm, wheels on one side.
          const n = cells.length, [hx, hy] = cells[n - 1], [px, py] = cells[n - 2] || [0, 0];
          const dirX = Math.sign(hx - px), dirY = Math.sign(hy - py) || (dirX ? 0 : -1);
          const cx0 = sc + hx * k + k / 2, cy0 = sr + hy * k + k / 2, L = wpn.length;
          const at = (wx, wy, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(ox + wx * U + dx), Math.round(oy + wy * U + dy), U * w, U * h); };
          const sx = dirY ? 1 : 0, sy = dirY && !dirX ? 0 : 1; // sideways (across the deck); both on a diagonal
          for (let i = -3; i < L; i++) {
            const wx = cx0 + dirX * i - sx * 2, wy = cy0 + dirY * i - sy * 2;
            at(wx - sx, wy - sy, '#111', 1 + sx * 4, 1 + sy * 4);                         // outline
            at(wx, wy, i % 9 < 2 ? '#ffd030' : '#ff3060', 1 + sx * 2, 1 + sy * 2);        // deck graphic
          }
          for (const i of [3, L - 6]) {                                                   // trucks + wheels
            const wx = cx0 + dirX * i + sx * 2, wy = cy0 + dirY * i + sy * 2;
            at(wx, wy, '#8a8a94', 1 + 3 * Math.abs(dirX), 1 + 3 * Math.abs(dirY));
            at(wx + sx, wy + sy, '#111', 2 + Math.abs(dirX) * 3, 2 + Math.abs(dirY) * 3);
            at(wx + sx, wy + sy, '#f0e8d8', 1 + Math.abs(dirX) * 3, 1 + Math.abs(dirY) * 3);
          }
        } else if (wpn && wpn.kind === 'club' && !dark) {
          // A golf club (Tyler): black grip, silver shaft along the arm, iron head at the end.
          const n = cells.length, [hx, hy] = cells[n - 1], [px, py] = cells[n - 2] || [0, 0];
          const dirX = Math.sign(hx - px), dirY = Math.sign(hy - py) || (dirX ? 0 : -1);
          const cx0 = sc + hx * k + k / 2, cy0 = sr + hy * k + k / 2, L = wpn.length;
          const at = (wx, wy, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(ox + wx * U + dx), Math.round(oy + wy * U + dy), U * w, U * h); };
          for (let i = 0; i < L; i++) at(cx0 + dirX * i - (dirY ? 1 : 0), cy0 + dirY * i - (dirX ? 1 : 0), i < 3 ? '#1c1818' : i % 4 === 0 ? '#8c9098' : '#d4d8e0', dirY ? 2 : 1, dirX ? 2 : 1);
          const ex = cx0 + dirX * L, ey = cy0 + dirY * L, sx = dirY ? 1 : 0, sy = dirY ? 0 : 1; // the head sticks out sideways
          at(ex - 1, ey - 1, '#111', 2 + sx * 3, 2 + sy * 3);
          at(ex, ey, '#a8acb4', 1 + sx * 3, 1 + sy * 3);
          at(ex, ey, '#e8ecf0', 1 + sx, 1 + sy);
        } else if (wpn && !dark) {
          const n = cells.length, [hx, hy] = cells[n - 1], [px, py] = cells[n - 2] || [0, 0];
          const dirX = Math.sign(hx - px), dirY = Math.sign(hy - py) || (dirX ? 0 : -1);
          const cx0 = sc + hx * k + k / 2, cy0 = sr + hy * k + k / 2;
          ctx.fillStyle = wpn.color;
          for (let i = 0; i < wpn.length; i++) {
            const wx = cx0 + dirX * i - (dirY ? 1 : 0), wy = cy0 + dirY * i - (dirX ? 1 : 0);
            ctx.fillRect(Math.round(ox + wx * U + dx), Math.round(oy + wy * U + dy), U * (dirY ? 2 : 1), U * (dirX ? 2 : 1));
          }
        }
        if (k < 2) { // tiny-scale sprites keep the simple blocks
          cells.forEach(([cx, cy], i) => {
            const isHand = i === cells.length - 1;
            let col = isHand ? this.handColor : this.sleeve;
            if (dark) col = shade(col, -0.3);
            blk(sc + cx * k, sr + cy * k, col, dx, dy);
          });
          return;
        }
        // Shoulder -> ... -> wrist as a tapered, shaded sleeve; then a fist.
        const P = ([cx, cy]) => [sc + cx * k + k / 2, sr + cy * k + k / 2];
        const pts = [P([0, 0]), ...cells.map(P)], n = pts.length, fist = pts[n - 1];
        const sleeve = dark ? shade(this.sleeve, -0.3) : this.sleeve, hand = dark ? shade(this.handColor, -0.3) : this.handColor;
        const armPts = pts.slice(0, n - 1).concat([[(pts[n - 2][0] + fist[0]) / 2, (pts[n - 2][1] + fist[1]) / 2]]);
        const thick = s.armThickness || 1, rArm = (u) => k * thick * (0.6 - 0.16 * u);
        const sl = s.sleeveLength == null ? 1 : s.sleeveLength;   // short sleeves: bare forearm below
        if (sl < 1) {
          limb(armPts, rArm, hand, dx, dy);
          // the sleeve: the first part of the arm, by length
          const cut = [armPts[0]]; let total = 0; for (let i = 1; i < armPts.length; i++) total += Math.hypot(armPts[i][0] - armPts[i - 1][0], armPts[i][1] - armPts[i - 1][1]);
          let need = total * sl;
          for (let i = 1; i < armPts.length && need > 0; i++) {
            const L = Math.hypot(armPts[i][0] - armPts[i - 1][0], armPts[i][1] - armPts[i - 1][1]), u = Math.min(1, need / L);
            cut.push([armPts[i - 1][0] + (armPts[i][0] - armPts[i - 1][0]) * u, armPts[i - 1][1] + (armPts[i][1] - armPts[i - 1][1]) * u]); need -= L;
          }
          if (cut.length > 1) limb(cut, (u) => rArm(u * sl) + 0.4, sleeve, dx, dy);
        } else limb(armPts, rArm, sleeve, dx, dy);
        const [px, py] = pts[n - 2], dirX = Math.sign(fist[0] - px), dirY = Math.sign(fist[1] - py);
        limb([[fist[0] - dirX * k * 0.15, fist[1] - dirY * k * 0.15], [fist[0] + dirX * k * 0.15, fist[1] + dirY * k * 0.15]], () => k * 0.62 * Math.max(1, (s.armThickness || 1) * 0.9), hand, dx, dy);
        if (!dark && k >= 3) { // knuckles: a little darker line across the front of the fist
          const kn = shade(hand, -0.3), fx = fist[0] + dirX * k * 0.35, fy = fist[1] + dirY * k * 0.35;
          for (let t = -1; t <= 1; t++) put(Math.round(fx + (dirY ? t : 0)), Math.round(fy + (dirX ? t : 0)), kn, dx, dy);
        }
      };

      // Back arm, legs, body, head, front arm.
      // An added back arm is only for drawings without one (the small early sprites); the detailed
      // ones already show both arms, and a second back arm reads as a third limb.
      if (s.backArm != null ? s.backArm : this.k < 3) drawArm(p.backArm, true, p.armOff || [0, 0]);
      const armName = p.armName || p.arm;
      const armBehind = armName === 'back' || armName === 'flail'; // a cocked-back arm sits behind the body
      if (armBehind) drawArm(p.arm, false, p.armOff || [0, 0]);
      this.drawLegs(p, put, blk, drop, false);
      const posedArm = !!p.arm;
      for (const cell of this.cells.torso) {
        if (cell.prop && posedArm) { // the prop moves to the posed hand (or fills in, e.g. crossed arms)
          if (s.propFill) put(cell.c, cell.r, s.palette[s.propFill], torsoOff[0], torsoOff[1]);
          continue;
        }
        const color = cell.hand && posedArm ? s.palette[s.legend[s.coatChar || 'W']] : cell.color;
        put(cell.c, cell.r, color, torsoOff[0], torsoOff[1]);
      }
      if (this.bigHead) { // BIG HEAD MODE: the head drawn 1.8x around the neck
        const [pc, pr] = this.headPivot, S = 1.8;
        for (const cell of this.cells.head) {
          ctx.fillStyle = cell.color;
          ctx.fillRect(Math.round(ox + (pc + (cell.c - pc) * S) * U + headOff[0]), Math.round(oy + (pr + (cell.r - pr) * S) * U + headOff[1]), Math.ceil(U * S), Math.ceil(U * S));
        }
      } else for (const cell of this.cells.head) put(cell.c, cell.r, cell.color, headOff[0], headOff[1]);
      this.drawLegs(p, put, blk, drop, true); // a kicking leg goes in front of the body
      if (!armBehind) drawArm(p.arm, false, p.armOff || [0, 0]);

      return { canvas, anchorX: Math.round(ox + s.footCol * U), anchorY: oy + this.rows * U };
    }

    // Called twice: front=false for everything behind the body, front=true for
    // a leg that kicks out in front of it.
    drawLegs(p, put, blk, drop, front) {
      const s = this.s, legs = this.cells.legs, wr = this.waistRow, k = this.k, U = this.U;
      const dark = (c) => shade(c, -0.3);
      const mode = p.crouch && !p.legs ? 'crouch' : p.legs || 'stand';
      const lo = p.legsOff || [0, 0];
      const hip = legs.filter((c) => c.r === wr);
      const pants = this.pantsColor, shoes = this.shoeColor;
      const [hc, hr] = [this.autoLift ? this.frontHip - k / 2 : s.footCol + k, wr]; // front hip (art pixels)
      const B = (dx, dy, color) => blk(hc + dx * k, hr + dy * k, color); // limb block relative to the hip

      const kicking = ['sweep', 'chamber', 'kick'].includes(mode);
      if (front && !kicking) return;
      if (front && k >= 2 && this.limb) { // a real leg: thigh, knee, shin, and a shoe
        const H = (x, y) => [hc + k / 2 + x * k, hr + k / 2 + y * k];
        let leg, shoe;
        if (mode === 'sweep') {
          const row = this.rows - k / 2 - (hr + k / 2);
          leg = [H(0, row / k - 1), H(3.2, row / k), H(6.2, row / k)]; shoe = [H(6.2, row / k), H(7.6, row / k - 0.5)];
        } else if (mode === 'chamber') {
          leg = [H(0, 0), H(3, -1.6), H(3.4, 2.2)]; shoe = [H(3.4, 2.4), H(4.8, 2.7)];
        } else {
          leg = [H(0, 0), H(3, -2.2), H(5.6, -5.3)]; shoe = [H(5.4, -5.4), H(6.8, -6.5)];
        }
        this.limb(leg, (u) => k * (s.legThickness || 1) * (0.78 - 0.2 * u), pants);
        this.limb(shoe, () => k * 0.52, shoes);
        return;
      }
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
          // the whole leg is squashed up toward the hips (knees forward), so nothing comes apart
          const legH = this.rows - wr, f = 0.62;
          for (const c of legs) {
            const knee = Math.round(Math.sin(((c.r - wr) / legH) * Math.PI) * k * 0.8);
            put(c.c + knee, wr + (c.r - wr) * f, c.color, lo[0], lo[1], Math.ceil(U * f) + 1);
          }
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
          for (const c of legs) if (!c.lift && !(this.autoLift && c.front)) put(c.c, c.r, this.autoLift ? c.color : dark(c.color)); // a raised leg IS the kicking leg
          break;
        default: { // stand (a raised leg can bob on its own)
          const lf = p.liftOff || [0, 0];
          for (const c of legs) put(c.c, c.r, c.color, lo[0] + (c.lift ? lf[0] : 0), lo[1] + (c.lift ? lf[1] : 0));
        }
      }
    }

    // KO: the standing pose turned on its back, head away from the opponent.
    bakeLying() {
      const stand = this.bake({});
      const U = this.U, k = this.k;
      const len = this.rows * U, thick = (this.cols + 2) * U;
      const [canvas, ctx] = makeCanvas(len + 12, thick + 4);
      const backEdge = (MARGIN_X * k + this.minCol + 1) * U; // x of the figure's back in the stand canvas
      const midY = (MARGIN_TOP * k + this.topPad) * U + len / 2;             // vertical middle of the figure
      ctx.translate(Math.round((len + 12) / 2), thick + 3);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(stand.canvas, -backEdge, -midY);
      return { canvas, anchorX: Math.round((len + 12) / 2), anchorY: thick + 4 };
    }

    // Build up to `n` not-yet-built animations; true once everything is built.
    warm(n = Infinity) {
      for (const anim in this.recipes) { if (this.baked[anim]) continue; if (n-- <= 0) return false; this.frameList(anim); }
      return true;
    }

    // `frame` may be fractional (e.g. 1.4 = 40% of the way from pose 1 to pose 2).
    draw(ctx, anim, frame, x, y, facing, tint) {
      if (!this.recipes[anim]) anim = 'idle';
      const list = this.frameList(anim), loop = LOOPING.has(anim);
      let i = Math.round(frame * SUB);
      i = loop ? ((i % list.length) + list.length) % list.length : Math.max(0, Math.min(list.length - 1, i));
      RF.drawBakedFrame(ctx, list[i], x, y, facing, tint);
    }
  }

  // ---- BACK VIEW (story mode's behind-the-back shots) ----
  // There is no drawing of anyone's back, so one is made from the front: the face is filled in
  // with the hair (or the bare scalp), and whatever sits on the chest - a tie, a logo, a zip -
  // is painted over with the colour of the clothes around it. Built once per frame, then kept.
  PixelPuppetSprite.prototype.backOf = function (f) {
    if (f.back) return f.back;
    const U = this.U, k = this.k, s = this.s, Wd = f.canvas.width, Hd = f.canvas.height;
    const [c, x] = makeCanvas(Wd, Hd); x.drawImage(f.canvas, 0, 0);
    let img; try { img = x.getImageData(0, 0, Wd, Hd); } catch (e) { return (f.back = f); }
    const d = img.data, oy = (MARGIN_TOP * k + this.topPad) * U;
    const neck = s.neckRow != null ? s.neckRow : Math.round(this.rows * 0.19);
    const yNeck = Math.min(Hd, Math.round(oy + (neck + 1) * U)), yWaist = Math.min(Hd, Math.round(oy + this.waistRow * U));
    const span = (y) => { let a = -1, b = -1; for (let i = 0; i < Wd; i++) if (d[(y * Wd + i) * 4 + 3] > 40) { if (a < 0) a = i; b = i; } return [a, b]; };
    const mode = (y0, y1, x0, x1) => { // the commonest colour in a box
      const n = new Map(); let best = null, bn = 0;
      for (let y = y0; y < y1; y++) for (let i = x0 == null ? 0 : x0; i < (x1 == null ? Wd : x1); i++) { const o = (y * Wd + i) * 4; if (d[o + 3] < 40) continue; const key = (d[o] >> 3) << 10 | (d[o + 1] >> 3) << 5 | (d[o + 2] >> 3); const v = (n.get(key) || 0) + 1; n.set(key, v); if (v > bn) { bn = v; best = [d[o], d[o + 1], d[o + 2]]; } }
      return best;
    };
    let top = 0; while (top < yNeck && span(top)[0] < 0) top++;
    const hair = mode(top, Math.max(top + 1, Math.round(top + (yNeck - top) * 0.34)));
    if (hair) for (let y = top; y < yNeck; y++) {       // the head: all hair, lighter down the middle
      const [a, b] = span(y); if (a < 0) continue;
      for (let i = a + 1; i < b; i++) { const o = (y * Wd + i) * 4; if (d[o + 3] < 40) continue; const sh = 0.78 + 0.26 * Math.sin(((i - a) / Math.max(1, b - a)) * Math.PI) - 0.1 * ((y - top) / Math.max(1, yNeck - top)); d[o] = hair[0] * sh; d[o + 1] = hair[1] * sh; d[o + 2] = hair[2] * sh; }
    }
    for (let y = yNeck; y < yWaist; y++) {              // the torso: plain cloth across the middle
      const [a, b] = span(y); if (a < 0 || b - a < 6) continue;
      const m = mode(y, y + 1, a, b + 1); if (!m) continue;
      const lo = Math.round(a + (b - a) * 0.2), hi = Math.round(b - (b - a) * 0.2);
      let same = 0, all = 0;                             // a patterned shirt has no "plain cloth": leave it alone
      for (let i = lo; i <= hi; i++) { const o = (y * Wd + i) * 4; if (d[o + 3] < 40) continue; all++; if (Math.abs(d[o] - m[0]) + Math.abs(d[o + 1] - m[1]) + Math.abs(d[o + 2] - m[2]) <= 70) same++; }
      if (same < all * 0.5) continue;
      for (let i = lo; i <= hi; i++) { const o = (y * Wd + i) * 4; if (d[o + 3] < 40) continue; if (Math.abs(d[o] - m[0]) + Math.abs(d[o + 1] - m[1]) + Math.abs(d[o + 2] - m[2]) > 70) { const sh = 0.9 + 0.1 * Math.sin(i * 0.9 + y * 0.6); d[o] = m[0] * sh; d[o + 1] = m[1] * sh; d[o + 2] = m[2] * sh; } }
    }
    x.putImageData(img, 0, 0);
    return (f.back = { canvas: c, anchorX: f.anchorX, anchorY: f.anchorY });
  };
  PixelPuppetSprite.prototype.drawBack = function (ctx, anim, frame, x, y, facing, tint) {
    if (!this.recipes[anim]) anim = 'idle';
    const list = this.frameList(anim), loop = LOOPING.has(anim);
    let i = Math.round(frame * SUB);
    i = loop ? ((i % list.length) + list.length) % list.length : Math.max(0, Math.min(list.length - 1, i));
    RF.drawBakedFrame(ctx, this.backOf(list[i]), x, y, facing, tint);
  };

  RF.PUPPET_POSES = PUPPET_POSES;
  RF.PixelPuppetSprite = PixelPuppetSprite;
})();
