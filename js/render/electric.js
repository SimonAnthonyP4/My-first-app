// High-voltage drawing helpers: forked lightning bolts and electric shields.
// Everything is drawn with square pixels so it matches the art. Shapes are
// re-randomised every couple of frames so the electricity flickers.
(function () {
  const { hash } = RF.util;

  // Pixel-crisp straight line.
  function line(ctx, x0, y0, x1, y1, w, color) {
    ctx.fillStyle = color;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      ctx.fillRect(Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t - w / 2), w, w);
    }
  }

  function polyline(ctx, pts, w, color) {
    for (let i = 1; i < pts.length; i++) line(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, color);
  }

  // Jagged path from a to b: random sideways kinks every `step` pixels.
  function jag(a, b, seed, amp, step = 7) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // perpendicular
    const n = Math.max(2, Math.round(len / step));
    const pts = [a];
    for (let i = 1; i < n; i++) {
      const t = i / n, off = (hash(seed + i * 1.37) - 0.5) * 2 * amp * Math.sin(Math.PI * t);
      pts.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
    }
    pts.push(b);
    return pts;
  }

  const GLOW = ['rgba(60,110,255,0.30)', 'rgba(90,170,255,0.65)', '#9fe8ff', '#ffffff'];

  // A bolt with a glow halo, a white-hot core and forks branching off it.
  // opts: { seed, amp, thick (1 = normal), forks, color }
  function bolt(ctx, a, b, opts = {}) {
    const seed = opts.seed || 0, amp = opts.amp || 6, k = opts.thick || 1;
    const main = jag(a, b, seed, amp);
    const widths = [Math.round(9 * k), Math.round(5 * k), Math.max(2, Math.round(3 * k)), Math.max(1, Math.round(1.5 * k))];
    widths.forEach((w, i) => polyline(ctx, main, w, GLOW[i]));
    // Forks: short jagged branches that split off and fade.
    const forks = opts.forks == null ? 4 : opts.forks;
    for (let f = 0; f < forks; f++) {
      const idx = 1 + Math.floor(hash(seed + f * 9.1) * (main.length - 2));
      const p = main[idx];
      const dir = Math.sign(b[0] - a[0]) || 1;
      const ang = (hash(seed + f * 3.3) - 0.5) * 2.2;
      const len = 10 + hash(seed + f * 5.7) * 22 * k;
      const end = [p[0] + dir * Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
      const fork = jag(p, end, seed + f * 11, 4, 5);
      polyline(ctx, fork, Math.max(1, Math.round(3 * k)), GLOW[1]);
      polyline(ctx, fork, 1, GLOW[2]);
    }
    return main;
  }

  // Soft round glow (for hands and impact points).
  function glow(ctx, x, y, r, alpha = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(220,245,255,${alpha})`);
    g.addColorStop(0.4, `rgba(90,170,255,${alpha * 0.5})`);
    g.addColorStop(1, 'rgba(40,80,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Little arcs crackling around a point (charging up).
  function crackle(ctx, x, y, r, seed, count = 4) {
    for (let i = 0; i < count; i++) {
      const a1 = hash(seed + i * 2.1) * Math.PI * 2, a2 = a1 + 0.6 + hash(seed + i * 4.3);
      const p = [x + Math.cos(a1) * r, y + Math.sin(a1) * r];
      const q = [x + Math.cos(a2) * r * 0.6, y + Math.sin(a2) * r * 0.6];
      const pts = jag(p, q, seed + i * 7, 3, 4);
      polyline(ctx, pts, 2, GLOW[1]);
      polyline(ctx, pts, 1, GLOW[3]);
    }
  }

  // Electric shield: a crackling half-dome in front of the fighter.
  // strength 0..1 makes it flare up when something hits it.
  function shield(ctx, cx, cy, rx, ry, facing, seed, strength = 0) {
    const pts = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / n; // top -> front -> bottom
      const jit = (hash(seed + i * 1.7) - 0.5) * (3 + strength * 4);
      pts.push([cx + facing * Math.cos(a) * (rx + jit), cy + Math.sin(a) * (ry + jit)]);
    }
    // Faint energy fill
    ctx.fillStyle = `rgba(90,170,255,${0.10 + strength * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry);
    pts.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fill();
    const k = 1 + strength;
    polyline(ctx, pts, Math.round(5 * k), GLOW[0]);
    polyline(ctx, pts, Math.round(3 * k), GLOW[1]);
    polyline(ctx, pts, Math.max(1, Math.round(1.5 * k)), strength > 0.3 ? GLOW[3] : GLOW[2]);
    // Arcs racing across the shield's surface
    for (let i = 0; i < 2 + Math.round(strength * 3); i++) {
      const i0 = Math.floor(hash(seed + i * 5.5) * n), i1 = Math.min(n, i0 + 2 + Math.floor(hash(seed + i * 8.1) * 4));
      const arc = jag(pts[i0], pts[i1], seed + i * 13, 4, 4);
      polyline(ctx, arc, 1, GLOW[3]);
    }
  }

  RF.electric = { line, bolt, glow, crackle, shield, jag, polyline };
})();
