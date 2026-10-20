// Health bars, timer, names and round-win markers. Both bars are always the
// same size: health is a percentage of RF.CONFIG.MAX_HEALTH for everyone.
(function () {
  const BAR_W = 150, BAR_H = 9, BAR_Y = 12, MARGIN = 14;
  const T = (...a) => RF.font.drawText(...a);

  class HUD {
    constructor() { this.trail = [1, 1]; }

    reset() { this.trail = [1, 1]; }

    update(fighters) {
      fighters.forEach((f, i) => {
        const pct = f.health / RF.CONFIG.MAX_HEALTH;
        // Red "damage trail" catches up with the yellow bar after a moment.
        if (this.trail[i] > pct) this.trail[i] = Math.max(pct, this.trail[i] - 0.006);
        else this.trail[i] = pct;
      });
    }

    draw(ctx, scene) {
      const W = RF.CONFIG.WIDTH;
      scene.fighters.forEach((f, i) => {
        const pct = f.health / RF.CONFIG.MAX_HEALTH;
        const x = i === 0 ? MARGIN : W - MARGIN - BAR_W;
        // Player 1's bar drains toward the left edge, player 2's toward the right.
        const fillW = (p) => Math.round(BAR_W * p);
        const fillX = (p) => (i === 0 ? x : x + BAR_W - fillW(p));

        ctx.fillStyle = '#000';
        ctx.fillRect(x - 2, BAR_Y - 2, BAR_W + 4, BAR_H + 4);
        ctx.fillStyle = '#c8a040';
        ctx.fillRect(x - 1, BAR_Y - 1, BAR_W + 2, BAR_H + 2);
        ctx.fillStyle = '#300808';
        ctx.fillRect(x, BAR_Y, BAR_W, BAR_H);
        ctx.fillStyle = '#e02020';
        ctx.fillRect(fillX(this.trail[i]), BAR_Y, fillW(this.trail[i]), BAR_H);
        const low = pct < 0.25 && Math.floor(scene.frame / 8) % 2;
        ctx.fillStyle = low ? '#ff8040' : '#f8d838';
        ctx.fillRect(fillX(pct), BAR_Y, fillW(pct), BAR_H);
        ctx.fillStyle = low ? '#ffc080' : '#fff4a0';
        ctx.fillRect(fillX(pct), BAR_Y, fillW(pct), 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(fillX(pct), BAR_Y + BAR_H - 2, fillW(pct), 2);

        // Name + round wins
        const nameOpts = { color: '#ffffff', outline: '#000', align: i === 0 ? 'left' : 'right' };
        T(ctx, f.def.name, i === 0 ? x : x + BAR_W, BAR_Y + BAR_H + 4, nameOpts);
        for (let r = 0; r < RF.CONFIG.ROUNDS_TO_WIN; r++) {
          const px = i === 0 ? x + BAR_W - 8 - r * 10 : x + r * 10 + 1;
          ctx.fillStyle = '#000';
          ctx.fillRect(px - 1, BAR_Y + BAR_H + 4, 9, 9);
          ctx.fillStyle = r < scene.wins[i] ? '#f8d838' : '#402020';
          ctx.fillRect(px, BAR_Y + BAR_H + 5, 7, 7);
        }
      });

      const secs = Math.max(0, Math.ceil(scene.timer / RF.CONFIG.FPS));
      T(ctx, Number.isFinite(secs) ? String(secs).padStart(2, '0') : '--', W / 2, BAR_Y - 3, {
        scale: 2, align: 'center', outline: '#000',
        color: secs <= 10 ? '#ff4040' : '#ffffff',
      });
    }
  }

  RF.HUD = HUD;
})();
