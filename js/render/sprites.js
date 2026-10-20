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
  if (s.type === 'sheet') {
    return new RF.SheetSprite(s, s.palette ? new RF.ProceduralSprite(def) : null);
  }
  return new RF.ProceduralSprite(def);
};
