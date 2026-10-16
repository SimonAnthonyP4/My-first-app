// Sprite-sheet renderer for real art. Configure in characters.js:
//
// sprite: {
//   type: 'sheet',
//   src: 'assets/sprites/bruiser.png',
//   frameWidth: 128, frameHeight: 128,  // every cell in the sheet is this size
//   anchorX: 64, anchorY: 124,          // pixel in a cell that sits on the fighter's feet
//   animations: { idle: { row: 0 }, walk: { row: 1 }, ... },  // one row per animation,
//                                                             // frames left to right
//   palette: { ... },                   // optional: placeholder used while the image loads
// }
//
// Frames are drawn facing right; the game mirrors them for the other side.
(function () {
  class SheetSprite {
    constructor(cfg, fallback) {
      this.cfg = cfg;
      this.fallback = fallback;
      this.ready = false;
      this.img = new Image();
      this.img.onload = () => { this.ready = true; };
      this.img.onerror = () => console.warn('Could not load sprite sheet', cfg.src);
      this.img.src = cfg.src;
    }

    draw(ctx, anim, frame, x, y, facing) {
      const c = this.cfg;
      const a = c.animations[anim];
      if (!this.ready || !a) {
        if (this.fallback) this.fallback.draw(ctx, anim, frame, x, y, facing);
        return;
      }
      const count = a.frames || RF.ANIMATIONS[anim];
      const sx = (frame % count) * c.frameWidth, sy = a.row * c.frameHeight;
      x = Math.round(x);
      y = Math.round(y);
      ctx.save();
      ctx.translate(x, y);
      if (facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(this.img, sx, sy, c.frameWidth, c.frameHeight, -c.anchorX, -c.anchorY, c.frameWidth, c.frameHeight);
      ctx.restore();
    }
  }

  RF.SheetSprite = SheetSprite;
})();
