// Picks the right renderer for a character's sprite config.
// Every renderer has the same interface: draw(ctx, anim, frame, x, y, facing).
RF.createSprite = function (def) {
  const s = def.sprite;
  if (s.type === 'sheet') {
    return new RF.SheetSprite(s, s.palette ? new RF.ProceduralSprite(def) : null);
  }
  return new RF.ProceduralSprite(def);
};
