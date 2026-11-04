// Draw a pre-baked frame ({ canvas, anchorX, anchorY }) with its anchor at
// (x, y), mirrored when facing left.
RF.drawBakedFrame = function (ctx, f, x, y, facing) {
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
};

// Alternate costume for mirror matches: same fighter, clothes hue-shifted.
RF.altCostume = function (def) {
  const KEEP = ['skin', 'eyes', 'outline'];
  const pal = Object.assign({}, def.sprite.palette);
  for (const k in pal) {
    if (pal[k] && !KEEP.includes(k)) pal[k] = RF.util.hueShift(pal[k], 150);
  }
  return Object.assign({}, def, { sprite: Object.assign({}, def.sprite, { palette: pal }) });
};

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
