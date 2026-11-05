// Draw a pre-baked frame ({ canvas, anchorX, anchorY }) with its anchor at
// (x, y), mirrored when facing left.
RF.drawBakedFrame = function (ctx, f, x, y, facing, tint) {
  x = Math.round(x);
  y = Math.round(y);
  if (tint) {
    // Solid-colour silhouette (white hit flash, green slime...), made once and reused.
    const color = tint === 'white' ? '#ffffff' : tint;
    f.tints = f.tints || {};
    if (!f.tints[color]) {
      const [c, cx] = RF.util.makeCanvas(f.canvas.width, f.canvas.height);
      cx.drawImage(f.canvas, 0, 0);
      cx.globalCompositeOperation = 'source-in';
      cx.fillStyle = color;
      cx.fillRect(0, 0, c.width, c.height);
      f.tints[color] = c;
    }
    f = { canvas: f.tints[color], anchorX: f.anchorX, anchorY: f.anchorY };
  }
  if (facing >= 0) {
    ctx.drawImage(f.canvas, x - f.anchorX, y - f.anchorY);
  } else {
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(f.canvas, -f.anchorX, y - f.anchorY);
    ctx.restore();
  }
};

// Alternate costume for mirror matches: same fighter, clothes hue-shifted.
RF.altCostume = function (def) {
  const KEEP = /skin|^(eyes|outline|rulerHand)/; // (bare legs are named pants...skin) // skin tones etc. keep their colour
  const pal = Object.assign({}, def.sprite.palette);
  for (const k in pal) {
    if (pal[k] && !KEEP.test(k)) pal[k] = RF.util.hueShift(pal[k], 150);
  }
  return Object.assign({}, def, { sprite: Object.assign({}, def.sprite, { palette: pal }) });
};

// Costumes: pick one on character select with HEAVY. Each one recolours the
// fighter's palette (skin and eyes keep their colour, except SHADOW and GOLDEN).
(function () {
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const lum = (h) => { const [r, g, b] = rgb(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
  const KEEP = /skin|^(eyes|outline|rulerHand)/; // (bare legs are named pants...skin)
  const EYES = /^eyes/;
  RF.COSTUMES = [
    { name: 'CLASSIC' },
    { name: 'REMIX', map: (h, k) => (KEEP.test(k) ? h : RF.util.hueShift(h, 150)) },
    { name: 'TOXIC', map: (h, k) => (KEEP.test(k) ? h : RF.util.hueShift(h, 75)) },
    { name: 'SHADOW', map: (h, k) => { // a living silhouette: everything dark, eyes glow
      if (EYES.test(k)) return '#e8f8ff';
      const l = lum(h); return hex(14 + l * 50, 14 + l * 52, 22 + l * 80);
    } },
    { name: 'GOLDEN', map: (h, k) => { // a solid gold statue
      if (EYES.test(k)) return '#3a1a00';
      const l = Math.min(1, lum(h) * 1.4);
      return l < 0.5 ? hex(60 + l * 2 * 160, 30 + l * 2 * 120, l * 2 * 10) : hex(220 + (l - 0.5) * 70, 150 + (l - 0.5) * 200, 10 + (l - 0.5) * 300);
    } },
  ];
  RF.costume = function (def, n) {
    n = ((n | 0) % RF.COSTUMES.length + RF.COSTUMES.length) % RF.COSTUMES.length;
    if (!n) return def;
    const c = RF.COSTUMES[n], pal = {};
    for (const k in def.sprite.palette) pal[k] = def.sprite.palette[k] ? c.map(def.sprite.palette[k], k) : def.sprite.palette[k];
    return Object.assign({}, def, { costume: n, sprite: Object.assign({}, def.sprite, { palette: pal }) });
  };
})();

// Picks the right renderer for a character's sprite config.
// Every renderer has the same interface: draw(ctx, anim, frame, x, y, facing).
RF.createSprite = function (def) {
  const s = def.sprite;
  if (s.type === 'pixel') return new RF.PixelPuppetSprite(def);
  if (s.type === 'sheet') {
    return new RF.SheetSprite(s, s.palette ? new RF.ProceduralSprite(def) : null);
  }
  return new RF.ProceduralSprite(def);
};
