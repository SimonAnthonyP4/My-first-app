// Placeholder pixel-art fighters generated from a skeleton + palette.
// Every frame is baked once into a small canvas, so drawing is just a blit —
// the same interface a real sprite sheet uses (see sheet-sprite.js).
(function () {
  const { shade, makeCanvas } = RF.util;
  const D2R = Math.PI / 180;
  const BASE = { thigh: 17, shin: 17, torso: 26, upper: 13, fore: 13, head: 6, foot: 6 };

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (v, k) => [v[0] * k, v[1] * k];
  const limbDir = (deg) => [Math.sin(deg * D2R), Math.cos(deg * D2R)];

  function thickLine(ctx, a, b, w, color) {
    ctx.fillStyle = color;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len * 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
    }
  }

  function disc(ctx, c, r, color, rowFilter) {
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      if (rowFilter && !rowFilter(dy)) continue;
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r + r * 0.6) ctx.fillRect(Math.round(c[0] + dx), Math.round(c[1] + dy), 1, 1);
      }
    }
  }

  function skeleton(pose, body) {
    const s = body.scale;
    const L = {};
    for (const k in BASE) L[k] = BASE[k] * s;
    const hip = [pose.hipX || 0, 0];
    const leg = (t, sh) => {
      const knee = add(hip, mul(limbDir(t), L.thigh));
      const ankle = add(knee, mul(limbDir(sh), L.shin));
      const sd = limbDir(sh);
      const toe = add(ankle, mul([sd[1], -sd[0]], L.foot)); // foot points forward of the shin
      return { knee, ankle, toe };
    };
    const lean = pose.lean * D2R;
    const up = [Math.sin(lean), -Math.cos(lean)];
    const shoulder = add(hip, mul(up, L.torso));
    const mid = add(hip, mul(up, L.torso * 0.5));
    const head = add(shoulder, mul(up, L.head + 2));
    const armRoot = add(shoulder, mul(up, -3 * s));
    const arm = (u, f, off) => {
      const root = add(armRoot, [off, 0]);
      const elbow = add(root, mul(limbDir(u), L.upper));
      const hand = add(elbow, mul(limbDir(f), L.fore));
      return { root, elbow, hand };
    };
    return {
      L, hip, mid, shoulder, head,
      bLeg: leg(pose.bThigh, pose.bShin),
      fLeg: leg(pose.fThigh, pose.fShin),
      bArm: arm(pose.bUpper, pose.bFore, -2 * s),
      fArm: arm(pose.fUpper, pose.fFore, 1 * s),
    };
  }

  function bakeFrame(pose, body, pal) {
    const sk = skeleton(pose, body);
    const s = body.scale, bulk = body.bulk;
    const legW = Math.max(3, Math.round(6 * s * bulk));
    const armW = Math.max(3, Math.round(5 * s * bulk));
    const torsoW = Math.round(12 * s * bulk);
    const headR = Math.round(sk.L.head);
    const fistW = armW + 2;

    // Bounds of everything we draw -> canvas size and anchor (feet position).
    const pts = [sk.hip, sk.shoulder, sk.head, sk.bLeg.knee, sk.bLeg.ankle, sk.bLeg.toe, sk.fLeg.knee,
      sk.fLeg.ankle, sk.fLeg.toe, sk.bArm.elbow, sk.bArm.hand, sk.fArm.elbow, sk.fArm.hand];
    const m = Math.ceil(Math.max(torsoW, headR * 2) / 2) + 3;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    // The floor sits under the lowest drawn point (feet normally, body when lying down).
    let ground = Math.max(sk.bLeg.ankle[1], sk.fLeg.ankle[1], sk.bLeg.toe[1], sk.fLeg.toe[1]) + legW / 2;
    ground = Math.max(ground, sk.head[1] + headR, sk.shoulder[1] + torsoW / 2 - 2, sk.hip[1] + torsoW / 2 - 2,
      sk.bArm.hand[1] + fistW / 2, sk.fArm.hand[1] + fistW / 2, sk.bArm.elbow[1] + armW / 2, sk.fArm.elbow[1] + armW / 2);

    const ox = Math.ceil(-minX + m), oy = Math.ceil(-minY + m);
    const [canvas, ctx] = makeCanvas(Math.ceil(maxX - minX + m * 2), Math.ceil(Math.max(maxY, ground) - minY + m * 2));
    const o = (p) => [p[0] + ox, p[1] + oy];
    const OL = pal.outline;

    const part = (a, b, w, color) => {
      thickLine(ctx, o(a), o(b), w + 2, OL);
      thickLine(ctx, o(a), o(b), w, color);
    };
    const drawLeg = (leg, dark) => {
      const pants = dark ? shade(pal.pants, -0.3) : pal.pants;
      const shoe = dark ? shade(pal.shoes, -0.3) : pal.shoes;
      part(sk.hip, leg.knee, legW, pants);
      part(leg.knee, leg.ankle, legW - 1, pants);
      part(leg.ankle, leg.toe, Math.max(2, legW - 2), shoe);
    };
    const drawArm = (arm, dark) => {
      const d = (c) => (dark ? shade(c, -0.3) : c);
      part(arm.root, arm.elbow, armW, d(pal.sleeves || pal.skin));
      part(arm.elbow, arm.hand, armW - 1, d(pal.skin));
      const h = o(arm.hand);
      ctx.fillStyle = OL;
      ctx.fillRect(Math.round(h[0] - fistW / 2) - 1, Math.round(h[1] - fistW / 2) - 1, fistW + 2, fistW + 2);
      ctx.fillStyle = d(pal.gloves);
      ctx.fillRect(Math.round(h[0] - fistW / 2), Math.round(h[1] - fistW / 2), fistW, fistW);
    };

    drawLeg(sk.bLeg, true);
    drawArm(sk.bArm, true);

    // Torso: slightly narrower at the waist, simple highlight down the front.
    const torsoCol = pal.top || pal.skin;
    thickLine(ctx, o(sk.hip), o(sk.mid), Math.round(torsoW * 0.85) + 2, OL);
    thickLine(ctx, o(sk.mid), o(sk.shoulder), torsoW + 2, OL);
    thickLine(ctx, o(sk.hip), o(sk.mid), Math.round(torsoW * 0.85), torsoCol);
    thickLine(ctx, o(sk.mid), o(sk.shoulder), torsoW, torsoCol);
    thickLine(ctx, o(add(sk.mid, [torsoW * 0.2, 0])), o(add(sk.shoulder, [torsoW * 0.2, 2])),
      Math.max(1, Math.round(torsoW * 0.25)), shade(torsoCol, 0.18));
    const belt = o(sk.hip);
    ctx.fillStyle = pal.belt;
    ctx.fillRect(Math.round(belt[0] - torsoW * 0.45), Math.round(belt[1] - 2 * s), Math.round(torsoW * 0.9), Math.max(2, Math.round(3 * s)));

    // Head: skin disc, hair on top/back, optional mask over the lower face, eye.
    const hc = o(sk.head);
    disc(ctx, hc, headR + 1, OL);
    disc(ctx, hc, headR, pal.skin);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, hc[0] - 1, canvas.height); // back half of the head
    ctx.rect(0, 0, canvas.width, hc[1] - Math.ceil(headR * 0.35)); // top of the head
    ctx.clip();
    disc(ctx, hc, headR, pal.hair);
    ctx.restore();
    if (pal.mask) disc(ctx, hc, headR, pal.mask, (dy) => dy >= 1);
    ctx.fillStyle = pal.eyes;
    ctx.fillRect(Math.round(hc[0] + headR * 0.4), Math.round(hc[1] - 1), Math.max(1, Math.round(s)), 1);

    drawLeg(sk.fLeg, false);
    drawArm(sk.fArm, false);

    return { canvas, anchorX: ox, anchorY: Math.round(oy + ground) };
  }

  class ProceduralSprite {
    constructor(def) {
      this.frames = {};
      for (const anim in RF.ANIMATIONS) {
        this.frames[anim] = RF.POSES[anim].map((pose) => bakeFrame(pose, def.body, def.sprite.palette));
      }
    }

    draw(ctx, anim, frame, x, y, facing) {
      const list = this.frames[anim];
      const f = list[frame % list.length];
      x = Math.round(x);
      y = Math.round(y);
      if (facing >= 0) {
        ctx.drawImage(f.canvas, x - f.anchorX, y - f.anchorY);
      } else {
        ctx.save();
        ctx.translate(x, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(f.canvas, -f.anchorX, y - f.anchorY);
        ctx.restore();
      }
    }
  }

  RF.ProceduralSprite = ProceduralSprite;
})();
