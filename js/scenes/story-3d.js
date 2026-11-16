// STORY MODE: the 3D camera. A scene becomes a real space: a textured floor running to the
// horizon in true perspective, the stage standing as a wall in that space (animated, drawn in
// perspective slices, with a faint reflection on shiny floors), and every actor a billboard at
// their own depth. The camera has a yaw, a distance, a height, a focal length and a roll, and
// moves between two sets of those over time.
//
//   { cam3d: [who, 'preset'] }          who = an actor key, or [a, b] to aim between two
//   { cam3d: [who, 'preset', { ...overrides }] }   or  { cam3d: [who, { yaw, dist, ... }] }
//   presets: flyin orbit crane pullback truck low top push spiral reveal whirl rise drop
//            vertigo (a real dolly zoom) hero still wide tilt
//            ots ([over, at]: from BEHIND the listener, past their shoulder)   two ([a, b]: both in frame)
//            behind (their back, looking where they look)   follow (behind, as they walk)
//            face (straight at them)   circle (all the way round)   otsf (the old front ots)
//            oner flyover descend worship (paths through several positions)   crash snap (crash zooms)
//            float (a slow roll, for the ones above)   march (along the ranks)   judge (up at the bench)   court (the whole room)
// A move can pass through more than two positions: yaw / dist / height / shift / f / roll may each be
// a list of any length ([from, to] is the simple case), and the camera glides through all of them.
// The army ({ crowd } in story-cine.js) is drawn here, in the same depth order as the actors.
// Loaded after story-scene.js; replaces its simpler draw3D.
(function () {
  const K = RF.storyKit, P = RF.StoryScene.prototype, W = 384, H = 224, CAM3 = K.CAM3, drawRift = K.drawRift;

  Object.assign(CAM3, {
    push: { yaw: [0.12, -0.05], dist: [290, 170], height: [58, 54], frames: 320 },
    spiral: { yaw: [-1.1, 0.5], dist: [340, 190], height: [160, 52], frames: 320 },
    reveal: { yaw: [1.25, 0.15], dist: [120, 230], height: [40, 62], frames: 240 },
    whirl: { yaw: [-1.2, 1.2], dist: [170, 170], height: [48, 48], frames: 100 },
    rise: { yaw: [0, 0.1], dist: [190, 270], height: [6, 130], frames: 260 },
    drop: { yaw: [0.4, 0], dist: [310, 190], height: [240, 58], frames: 240 },
    vertigo: { yaw: [0, 0], dist: [150, 420], height: [52, 52], f: [260, 728], frames: 220 },
    hero: { yaw: [0.5, 0.2], dist: [140, 118], height: [10, 14], frames: 220 },
    still: { yaw: [0.2, 0.2], dist: [220, 220], height: [60, 60], frames: 1 },
    wide: { yaw: [-0.25, 0.25], dist: [430, 430], height: [110, 110], frames: 420 },
    tilt: { yaw: [-0.2, 0.2], dist: [200, 180], height: [50, 50], roll: [-0.14, 0.14], frames: 260 },
    behind: {}, follow: {}, face: {}, circle: {}, otsf: {},   // filled in by cam3dStep (they depend on the actors)
    // ---- paths through several positions ----
    oner: { yaw: [-2.3, -1.3, -0.4, 0.14], dist: [250, 210, 180, 132], height: [18, 58, 74, 52], frames: 560 },        // from behind their back, round the side, to their face
    flyover: { yaw: [0.1, -0.06, 0.04, 0], dist: [640, 470, 300, 188], height: [210, 150, 96, 62], frames: 520 },       // in over everyone's heads, down to the one at the end
    descend: { yaw: [0.9, 0.5, 0.2, 0.1], dist: [150, 210, 230, 200], height: [300, 210, 110, 60], frames: 420 },
    worship: { yaw: [-0.5, -0.15, 0.2, 0.5], dist: [128, 118, 118, 128], height: [3, 4, 4, 6], aim: 60, frames: 520 },  // from the floor, looking up
    march: { yaw: [1.15, 1.05], dist: [260, 240], height: [70, 62], shift: [-190, 190], frames: 420 },                 // low, along the ranks
    judge: { yaw: [0.06, -0.06], dist: [250, 200], height: [4, 8], aim: 56, f: [240, 300], frames: 420 },
    float: { yaw: [-0.18, 0.18], dist: [190, 176], height: [70, 62], roll: [-0.07, 0.07], frames: 520 },
    crash: { yaw: [0.1, 0.02], dist: [520, 128], height: [90, 52], frames: 26 },
    court: { yaw: [-0.1, 0.1], dist: [330, 310], height: [84, 78], aim: 18, frames: 700 },                          // the whole room, held wide
    snap: { yaw: [0, 0], dist: [300, 116], height: [56, 52], f: [230, 330], frames: 12 },
  });

  // { cam3d: [who, preset | params, overrides?] }
  P.cam3dStep = function (s) {
    const [who, spec, extra] = s.cam3d;
    const keys = (Array.isArray(who) ? who : [who]).map((k) => this.resolve(k));
    const sh = Object.assign({ type: '3d', a: keys, t0: this.t, shift: [0, 0] }, CAM3.orbit, typeof spec === 'string' ? CAM3[spec] : spec);
    const A = this.actors[keys[0]], B = this.actors[keys[1]];
    if (spec === 'ots' && A && B) {
      // a real over-the-shoulder: the camera stands BEHIND the listener (their back and shoulder
      // dark in the foreground) and looks past them at the speaker
      const dx = B.x - A.x, dz = (B.z || 0) - (A.z || 0), d = Math.hypot(dx, dz);
      Object.assign(sh, { a: [keys[1]], over: keys[0], yaw0: Math.atan2(-dx, dz), yaw: [0.3, 0.2], dist: [d + 86, d + 70], height: [58, 56], aim: 50, frames: 260 });
    }
    if (spec === 'otsf' && A && B) { // the old one: from the front, beside the listener
      const d = Math.hypot(A.x - B.x, (A.z || 0) - (B.z || 0)), side = A.x < B.x ? -1 : 1;
      Object.assign(sh, { a: [keys[1]], over: keys[0], yaw0: side * 1.0, yaw: [-0.08, 0.08], dist: [d * 0.85 + 100, d * 0.85 + 84], height: [50, 52], frames: 260 });
    }
    // shots that depend on which way the subject faces
    if (spec === 'behind' && A) Object.assign(sh, { yaw0: -A.facing * Math.PI / 2, yaw: [0.56 * A.facing, 0.36 * A.facing], dist: [180, 132], height: [64, 58], aim: 50, frames: 240 });   // off to one side, so what they face is in view
    if (spec === 'follow' && A) Object.assign(sh, { yaw0: -A.facing * Math.PI / 2, yaw: [-0.22 * A.facing, 0.22 * A.facing], dist: [128, 128], height: [58, 58], aim: 46, frames: 300 });
    if (spec === 'face' && A) Object.assign(sh, { yaw0: A.facing * Math.PI / 2, yaw: [0.22, 0.06], dist: [230, 124], height: [50, 52], aim: 48, frames: 240 });
    if (spec === 'circle') Object.assign(sh, { yaw: [0, Math.PI * 2], dist: [185, 185], height: [78, 56], frames: 400 });
    if (spec === 'two' && A && B) {
      const d = Math.hypot(A.x - B.x, (A.z || 0) - (B.z || 0));
      Object.assign(sh, { yaw: [-0.3, 0.3], dist: [d * 0.9 + 190, d * 0.9 + 160], height: [56, 56], frames: 320 });
    }
    Object.assign(sh, extra || {});
    this.shot = sh; this.insert = null;
    return true;
  };

  // ---- per-stage setup: colours, a floor texture, a buffer for the animated wall ----
  const GLOSSY = new Set(['hallway', 'court', 'cafeteria', 'office', 'musicroom', 'brobatch', 'post', 'tribunal', 'pizzeria', 'throne']);
  const ROUGH = new Set(['field', 'golf', 'cliff', 'miami']);
  const OUTDOOR = new Set(['field', 'golf', 'cliff', 'miami', 'nyc', 'parking', 'skatepark', 'oblock']);   // no room here: the surroundings stand far off
  function prep(st, def, fy, ctx) {
    if (st.k3) return st.k3;
    const k = st.k3 = {};
    const bctx = st.bg.getContext('2d');
    const px = (x, y) => { try { return bctx.getImageData(Math.round(x), Math.round(Math.min(H - 1, y)), 1, 1).data; } catch (e) { return [58, 58, 68]; } };
    const col = (d, m = 1) => `rgb(${Math.min(255, d[0] * m) | 0},${Math.min(255, d[1] * m) | 0},${Math.min(255, d[2] * m) | 0})`;
    const f1 = px(W / 2, fy + 12), sky = px(W / 2, 4);
    k.floor = col(f1); k.sky = col(sky, 0.5);
    k.gloss = GLOSSY.has(def.id) ? 0.17 : ROUGH.has(def.id) ? 0 : 0.06;
    // a 64x64 tile: checker + grout indoors, speckle on grass / sand, speckle + a painted line on asphalt
    const [tex, t] = RF.util.makeCanvas(64, 64);
    t.fillStyle = col(f1); t.fillRect(0, 0, 64, 64);
    const rnd = RF.util.rng ? RF.util.rng(def.id.length * 131 + 7) : Math.random;
    if (ROUGH.has(def.id)) {
      for (let i = 0; i < 260; i++) { t.fillStyle = col(f1, 0.82 + rnd() * 0.36); t.fillRect((rnd() * 64) | 0, (rnd() * 64) | 0, 1 + ((rnd() * 2) | 0), 1); }
      t.fillStyle = col(f1, 0.88); t.fillRect(0, 0, 64, 3); // mowing stripe
    } else if (GLOSSY.has(def.id)) {
      t.fillStyle = col(f1, 1.12); t.fillRect(0, 0, 32, 32); t.fillRect(32, 32, 32, 32);
      t.fillStyle = col(f1, 0.7); t.fillRect(0, 0, 64, 1); t.fillRect(0, 32, 64, 1); t.fillRect(0, 0, 1, 64); t.fillRect(32, 0, 1, 64);
    } else {
      for (let i = 0; i < 160; i++) { t.fillStyle = col(f1, 0.8 + rnd() * 0.4); t.fillRect((rnd() * 64) | 0, (rnd() * 64) | 0, 1, 1); }
      t.fillStyle = col(f1, 1.5); t.fillRect(30, 0, 3, 40);
    }
    k.pat = ctx.createPattern(tex, 'repeat');
    const [buf, bc] = RF.util.makeCanvas(W, H); k.buf = buf; k.bc = bc;
    return k;
  }

  // Where the camera is for this shot, this frame (the same numbers drive the drawn sets below and
  // the real 3D ones in story-gl.js): its position C, the point it looks at, and its lens.
  P.cam3 = function (sh) {
    const keys = Array.isArray(sh.a) ? sh.a : [sh.a], subs = keys.map((k) => this.actors[k]).filter(Boolean);
    if (subs.length) { sh.ax = subs.reduce((s, a) => s + a.x, 0) / subs.length; sh.az = subs.reduce((s, a) => s + (a.z || 0), 0) / subs.length; }
    if (sh.ax == null) return null;
    const ay = subs.length ? subs.reduce((s, a) => s + (a.y || 0) + ((a.def.sprite && a.def.sprite.hover) || 0) * 0.6 + Math.max(0, a.def.body.height * (a.scale || 1) - 86) * 0.6, 0) / subs.length : 0;
    const u0 = Math.min(1, (this.t - sh.t0) / (sh.frames || 1)), u = u0 * u0 * (3 - 2 * u0);
    const L = (p) => {
      if (!p) return 0;
      const n = p.length - 1;
      if (n < 1) return p[0];
      if (n === 1) return p[0] + (p[1] - p[0]) * u;
      const f = Math.min(n - 1e-6, u * n), i = Math.floor(f), t = f - i, a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(n, i + 2)];
      return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    };
    const hh = this.handheld || 0, tight = Math.max(0, (this.barH == null ? 30 : this.barH) - 30);
    const yaw = (sh.yaw0 || 0) + L(sh.yaw) + Math.sin(this.t / 53) * 0.012 * hh;
    let dist = Math.max(40, L(sh.dist)), F = (sh.f ? L(sh.f) : 260) * (1 - tight / 80), cy = Math.cos(yaw), sn = Math.sin(yaw);
    const tx = sh.ax + L(sh.shift), tz = sh.az;   // the point on the floor the lens is aimed over
    const C = { x: tx + sn * dist, y: Math.max(4, L(sh.height) + ay * 0.45 + Math.sin(this.t / 37) * 1.2 * hh), z: tz - cy * dist };
    const out = this.bgDef && OUTDOOR.has(this.bgDef.id), WZ = 84, XL = out ? -620 : -330, XR = W - XL, ZF = out ? -760 : -460;
    const cx2 = Math.max(XL + 26, Math.min(XR - 26, C.x)), cz2 = Math.max(ZF + 26, Math.min(WZ - 18, C.z));
    if (cx2 !== C.x || cz2 !== C.z) {
      C.x = cx2; C.z = cz2;
      const d2 = Math.max(30, Math.hypot(C.x - tx, tz - C.z));
      sn = (C.x - tx) / d2; cy = (tz - C.z) / d2;
      if (d2 < dist) F *= Math.max(0.42, d2 / dist);
      dist = d2;
    }
    return { keys, subs, C, tx, tz, ty: (sh.aim == null ? 44 : sh.aim) + tight * 0.5 + ay, F, dist, cy, sn, roll: sh.roll ? L(sh.roll) : 0, over: this.actors[sh.over] };
  };

  P.draw3D = function (ctx, sh, fy) {
    if (RF.storyGL && RF.storyGL.draw(this, ctx, sh, fy)) return;   // a set built in real 3D (story-gl.js), where there is one and the device can
    const keys = Array.isArray(sh.a) ? sh.a : [sh.a], subs = keys.map((k) => this.actors[k]).filter(Boolean);
    if (subs.length) { sh.ax = subs.reduce((s, a) => s + a.x, 0) / subs.length; sh.az = subs.reduce((s, a) => s + (a.z || 0), 0) / subs.length; }
    // someone raised off the floor (on a throne), or much taller than a person: look up at them
    const ay = subs.length ? subs.reduce((s, a) => s + (a.y || 0) + ((a.def.sprite && a.def.sprite.hover) || 0) * 0.6 + Math.max(0, a.def.body.height * (a.scale || 1) - 86) * 0.6, 0) / subs.length : 0;
    if (sh.ax == null) return; // (if the subject has gone - folded away, shattered - the camera stays where they were)
    const u0 = Math.min(1, (this.t - sh.t0) / (sh.frames || 1)), u = u0 * u0 * (3 - 2 * u0);
    const L = (p) => {
      if (!p) return 0;
      const n = p.length - 1;
      if (n < 1) return p[0];
      if (n === 1) return p[0] + (p[1] - p[0]) * u;
      // several positions: a curve through all of them, easing in at the first and out at the last
      const f = Math.min(n - 1e-6, u * n), i = Math.floor(f), t = f - i, a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(n, i + 2)];
      return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    };
    const ax = sh.ax, az = sh.az;
    const hh = this.handheld || 0;
    const yaw = (sh.yaw0 || 0) + L(sh.yaw) + Math.sin(this.t / 53) * 0.012 * hh;
    const tight = Math.max(0, (this.barH == null ? 30 : this.barH) - 30);   // bars closed in: a wider lens, aimed a little higher, so a shot composed for the normal frame keeps its headroom
    let dist = Math.max(40, L(sh.dist)), F = (sh.f ? L(sh.f) : 260) * (1 - tight / 80); const roll = sh.roll ? L(sh.roll) : 0;
    let cy = Math.cos(yaw), sn = Math.sin(yaw);
    const C = { x: ax + L(sh.shift) + sn * dist, y: Math.max(4, L(sh.height) + ay * 0.45 + Math.sin(this.t / 37) * 1.2 * hh), z: az - cy * dist };
    // the set is a room: the camera stays inside its walls, and keeps looking at its subject
    const out = this.bgDef && OUTDOOR.has(this.bgDef.id), WZ = 84, XL = out ? -620 : -330, XR = W - XL, ZF = out ? -760 : -460;
    const cx2 = Math.max(XL + 26, Math.min(XR - 26, C.x)), cz2 = Math.max(ZF + 26, Math.min(WZ - 18, C.z));
    if (cx2 !== C.x || cz2 !== C.z) {
      C.x = cx2; C.z = cz2;
      const d2 = Math.max(30, Math.hypot(C.x - ax, az - C.z)), want = [(C.x - ax) / d2, (az - C.z) / d2];
      sn = want[0]; cy = want[1];
      if (d2 < dist) F *= Math.max(0.42, d2 / dist);   // pressed against a wall: a wider lens keeps the subject the same size
      dist = d2;
    }
    const lift = (C.y - (sh.aim == null ? 44 : sh.aim) - tight * 0.5 - ay) * F / dist;
    const kx = this.shake ? (Math.random() - 0.5) * this.shake : 0, ky = this.shake ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
    const proj = (x, y, z) => {
      const dx = x - C.x, dz = z - C.z, rz = -dx * sn + dz * cy;
      if (rz < 14) return null;
      const k = F / rz;
      return { x: W / 2 + (dx * cy + dz * sn) * k + kx, y: H / 2 + (C.y - y) * k - lift + ky, k, rz };
    };
    this.view = { kind: '3d', proj };

    ctx.save();
    if (roll) { ctx.translate(W / 2, H / 2); ctx.rotate(roll); ctx.scale(1.16, 1.16); ctx.translate(-W / 2, -H / 2); }
    const st = this.stage, k3 = st ? prep(st, this.bgDef, fy, ctx) : null;
    const hyRaw = H / 2 - lift + ky, hy = Math.max(0, Math.min(H, hyRaw));

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, hy)); sky.addColorStop(0, '#04030a'); sky.addColorStop(1, k3 ? k3.sky : '#14001e');
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, hy + 20);
    // the floor: a tiled texture laid out in perspective, one thin strip of screen at a time
    ctx.fillStyle = k3 ? k3.floor : '#1a1028'; ctx.fillRect(-20, hy, W + 40, H - hy + 20);
    if (k3 && k3.pat && k3.pat.setTransform && typeof DOMMatrix === 'function') {
      for (let y = Math.ceil(hy) + 1; y < H + 2; y += 2) {
        const rz = C.y * F / (y - hyRaw);
        if (rz > 1500 || rz < 4) continue;
        const k = F / rz, Px = C.x - sn * rz, Pz = C.z + cy * rz;      // the ground point under this strip's centre
        const a = cy * k, c = sn * k, b = -sn * k, d = cy * k;          // world (x, z) -> screen along the strip
        k3.pat.setTransform(new DOMMatrix([a, b, c, d, W / 2 + kx - (Px * a + Pz * c), y - (Px * b + Pz * d)]));
        ctx.fillStyle = k3.pat; ctx.fillRect(-20, y, W + 40, 2);
      }
    }
    const fog = ctx.createLinearGradient(0, hy, 0, H); fog.addColorStop(0, 'rgba(0,0,0,0.62)'); fog.addColorStop(0.5, 'rgba(0,0,0,0.12)'); fog.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fog; ctx.fillRect(-20, hy, W + 40, H - hy + 20);

    // the stage as a wall behind the actors (five tiles wide, mirrored, so it never runs out)
    if (k3) {
      st.draw(k3.bc, this.t);
      // a darker copy of the stage for the other three walls (they are in shadow)
      if (!k3.dim) { const m = RF.util.makeCanvas(W, H); k3.dim = m[0]; k3.dc = m[1]; }
      k3.dc.drawImage(k3.buf, 0, 0); k3.dc.fillStyle = out ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.5)'; k3.dc.fillRect(0, 0, W, H);
      const SL = 8, hz = this.bgDef.horizon || fy;   // (a stage with a `horizon`: its painted floor is left out, so what is on its back wall stands on the real floor)
      // one wall from (x0, z0) to (x1, z1), in thin upright slices of the stage picture
      const wall = (x0, z0, x1, z1, tex, gloss) => {
        const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / SL), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
        for (let i = 0; i < n; i++) {
          const px = x0 + ux * i * SL, pz = z0 + uz * i * SL, qx = px + ux * SL, qz = pz + uz * SL;
          const b0 = proj(px, 0, pz), b1 = proj(qx, 0, qz);
          if (!b0 || !b1) continue;
          const xa = Math.min(b0.x, b1.x), w = Math.abs(b1.x - b0.x) + 0.7;
          if (xa > W + 8 || xa + w < -8) continue;
          const near = b0.k > b1.k ? proj(px, hz, pz) : proj(qx, hz, qz), up = b0.k > b1.k ? proj(px, hz + 220, pz) : proj(qx, hz + 220, qz), base = Math.max(b0.y, b1.y);
          if (!near || !up) continue;
          const m = (((i * SL) % (2 * W)) + 2 * W) % (2 * W), sx = Math.max(0, Math.min(W - SL, m < W ? m : 2 * W - m - SL));   // mirror every other tile
          const hgt = base - near.y;
          ctx.drawImage(tex, sx, 0, SL, 2, xa, up.y, w, near.y - up.y + 0.5);              // the wall carries on upward
          ctx.drawImage(tex, sx, 0, SL, hz, xa, near.y, w, hgt);
          if (gloss) { ctx.globalAlpha = gloss; ctx.drawImage(tex, sx, hz * 0.45, SL, hz * 0.55, xa, base + hgt * 0.55, w, -hgt * 0.55); ctx.globalAlpha = 1; } // reflection
        }
      };
      wall(XL, ZF, XR, ZF, k3.dim, 0);                         // the wall behind the usual camera
      wall(XL, WZ, XL, ZF, k3.dim, 0); wall(XR, ZF, XR, WZ, k3.dim, 0);   // the side walls
      wall(-W, WZ, 2 * W, WZ, k3.buf, k3.gloss);                         // the stage itself
      if (XL < -W) wall(XL, WZ, -W, WZ, k3.dim, 0);
      if (XR > 2 * W) wall(2 * W, WZ, XR, WZ, k3.dim, 0);
    }
    if (this.tintCol) { ctx.fillStyle = this.tintCol; ctx.fillRect(-20, -20, W + 40, H + 40); }
    if (this.riftFx) {
      const r = this.riftFx, kk = r.closing ? Math.max(0, 1 - r.closing / 2) : Math.min(1, r.t / 16), p = proj(r.x, 50 * r.size, 30), g = proj(r.x, 0, 30);
      if (g) { ctx.globalAlpha = 0.28 * kk; ctx.fillStyle = '#a050ff'; ctx.beginPath(); ctx.ellipse(g.x, g.y, 70 * r.size * g.k, 12 * r.size * g.k, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      if (p) drawRift(ctx, p.x, p.y, r.size * p.k * kk, this.t);
    }

    // everyone, far to near (the army is in the same list: hundreds of them, each one a ready-made picture)
    const list = Object.values(this.actors).filter((a) => !a.stage).map((a) => ({ a, p: proj(a.x, 0, a.z || 0) })).filter((o) => o.p);
    const subP = subs.map((a) => proj(a.x, 0, a.z || 0)).filter(Boolean), over = this.actors[sh.over];
    const crowd = this.crowd && K.crowdFrame ? this.crowd : null;
    const thin = K.lowFx && crowd && crowd.list.length > 160;   // (a slow device: every other one)
    if (crowd) for (const c of crowd.list) { if (thin && c.odd) continue; const p = proj(c.x, 0, c.z); if (p && p.x > -40 && p.x < W + 40 && p.rz < 1250) list.push({ c, p }); }
    list.sort((m, n) => n.p.rz - m.p.rz);
    for (const { a, c, p } of list) {
      if (c) {
        let clear = 1;
        for (const sp of subP) if (p.rz < sp.rz - 4) { const w = p.k + sp.k; clear = Math.min(clear, Math.max(0, (Math.abs(p.x - sp.x) - 15 * w) / (3 * w))); }
        clear *= Math.max(0, Math.min(1, (p.rz - 44) / 56));                                // right against the lens: out of the way
        if (clear <= 0.02) continue;
        const tone = p.rz < Math.max(74, dist * 0.5) ? 2 : p.rz > dist * 1.7 ? 1 : 0;       // close to the lens: a dark shape. Far off: dimmer
        const img = K.crowdFrame(crowd, c, this.t, tone), sz = p.k * (c.scale || 1), face = cy >= 0 ? c.facing : -c.facing;
        if (!img) continue;
        ctx.globalAlpha = 0.3 * clear; ctx.fillStyle = '#000'; ctx.fillRect(Math.round(p.x - 11 * p.k), Math.round(p.y), Math.max(1, Math.round(22 * p.k)), Math.max(1, Math.round(2.4 * p.k)));
        ctx.globalAlpha = clear * (c.alpha == null ? 1 : c.alpha);
        ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.scale(face * sz, sz); ctx.drawImage(img, -K.CROWD_W / 2, -K.CROWD_H + 2); ctx.restore();
        ctx.globalAlpha = 1;
        continue;
      }
      // nobody stands in front of the person the shot is about: anyone who would is faded out of it
      let clear = 1;
      if (!subs.includes(a) && a !== over) for (const sp of subP) if (p.rz < sp.rz - 4) { const w = p.k + sp.k; clear = Math.min(clear, Math.max(0, (Math.abs(p.x - sp.x) - 15 * w) / (3 * w))); }
      if (clear <= 0.02) continue;
      let anim = a.anim, frame = 0;
      const tt = a.frozen || this.t;   // (frozen in time: they hold the frame they were on)
      if (a.wlen) { anim = a.dashing ? 'jump' : 'walk'; frame = a.dashing ? 0.5 : (a.wt / 5) % 4; }
      else if (a.zlen) { anim = 'walk'; frame = (a.zt / 5) % 4; }
      else if (a.ylen) { anim = 'jump'; frame = 0.3; }
      else if (anim === 'idle') frame = ((tt + a.seed) / (a.def.idleRate || 12)) % (a.def.idleFrames || 2);
      else if (anim === 'victory' || anim === 'taunt' || anim === 'dazed') frame = Math.floor((tt + a.seed) / 16) % 2;
      else if (anim === 'walk') frame = ((tt - (a.at || 0)) / 5) % 4;
      else frame = Math.min(1, (tt - (a.at || 0)) / 8);
      const jx = a.trembleT > 0 ? ((this.t >> 1) % 2 ? 0.8 : -0.8) : 0, bob = a.talk && anim === 'idle' && tt % 16 < 8 ? 1 : 0;
      const face = cy >= 0 ? a.facing : -a.facing;
      const back = -sn * a.facing > 0.5 && a.sprite.drawBack;   // the camera is behind them: show their back
      const alpha = clear * (a.foldT ? Math.max(0, 1 - a.foldT / 60) : a.appearT && a.appearT < 50 ? a.appearT / 50 : a.ghost ? 0.55 : 1);
      const tint = a.hitT > 4 ? '#ffffff' : a.ghost ? '#2a2038' : (a.foldT && this.t % 6 < 3) ? '#c080ff' : null;
      ctx.save(); ctx.translate(p.x + jx, p.y);
      ctx.globalAlpha = 0.35 * alpha; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 1, 15 * p.k, 3.5 * p.k, 0, 0, Math.PI * 2); ctx.fill();
      const sz = p.k * (a.scale || 1);
      if (k3 && k3.gloss && !a.y) { ctx.save(); ctx.globalAlpha = k3.gloss * alpha; ctx.scale(sz, -sz * 0.85); (back ? a.sprite.drawBack : a.sprite.draw).call(a.sprite, ctx, anim, frame, 0, 0, face, tint); ctx.restore(); } // reflection
      ctx.globalAlpha = alpha;
      ctx.scale(sz, sz);
      if ('filter' in ctx) { if (p.rz < Math.max(74, dist * 0.66)) ctx.filter = 'brightness(0.36)'; else if (p.rz > dist * 1.7) ctx.filter = 'brightness(0.72)'; } // someone close to the lens is a dark shape; far people fade
      RF.hoverShadow = !a.y;
      (back ? a.sprite.drawBack : a.sprite.draw).call(a.sprite, ctx, anim, frame, 0, -a.y - bob, face, tint);
      RF.hoverShadow = true;
      ctx.filter = 'none';
      if (a.rift) RF.MOVE_FX.riftAura({ x: 0, y: a.y, body: a.def.body, state: 'idle' }, ctx, 0, this.t);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const f of this.flies) {
      const art = RF.PROJECTILE_ART[f.art], p = proj(f.x, f.y, 0);
      if (art && p) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k, p.k); art(ctx, 0, 0, f.t, f.dir, { w: 14, h: 10, cfg: {} }, 0); ctx.restore(); }
    }
    for (const q of this.shards) { const p = proj(q.x, q.y, 0); if (p) { ctx.globalAlpha = Math.min(1, q.life / 30); ctx.fillStyle = q.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(2 * p.k)), Math.max(1, Math.round(2 * p.k))); } }
    // dust in the air: it slides past as the camera moves, which is most of what sells the depth
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i++) {
      const p = proj((i * 97) % 520 - 70, 18 + (i * 53) % 130 + Math.sin(this.t / 40 + i) * 6, (i * 71) % 300 - 170);
      if (p && p.rz < 700) { ctx.globalAlpha = Math.min(0.3, 30 / p.rz + 0.05); ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };
})();
