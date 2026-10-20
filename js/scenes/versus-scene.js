// Short "P1 VS P2" splash before the fight starts.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const DURATION = 130;

  class VersusScene {
    constructor(game, opts) {
      this.game = game;
      this.opts = opts;
      this.t = 0;
      this.sprites = [RF.createSprite(opts.p1), RF.createSprite(opts.p2Alt ? RF.altCostume(opts.p2) : opts.p2)];
    }

    update() {
      this.t++;
      if (this.t > 20 && RF.menuPressed(this.game.kb, 'confirm')) this.t = DURATION;
      if (this.t >= DURATION) this.game.setScene(new RF.FightScene(this.game, this.opts));
    }

    render(ctx) {
      const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
      ctx.fillStyle = '#0a0000';
      ctx.fillRect(0, 0, W, H);
      // Diagonal split: red side for P1, blue for P2.
      const slide = Math.max(0, 20 - this.t) * 12;
      ctx.fillStyle = '#3a0806';
      ctx.beginPath();
      ctx.moveTo(-slide, 0); ctx.lineTo(W / 2 + 30 - slide, 0); ctx.lineTo(W / 2 - 30 - slide, H); ctx.lineTo(-slide, H);
      ctx.fill();
      ctx.fillStyle = '#08123a';
      ctx.beginPath();
      ctx.moveTo(W + slide, 0); ctx.lineTo(W / 2 + 34 + slide, 0); ctx.lineTo(W / 2 - 26 + slide, H); ctx.lineTo(W + slide, H);
      ctx.fill();

      const defs = [this.opts.p1, this.opts.p2];
      for (let p = 0; p < 2; p++) {
        const x = p === 0 ? 96 - slide : W - 96 + slide;
        ctx.save();
        ctx.translate(x, 190);
        ctx.scale(1.6, 1.6);
        this.sprites[p].draw(ctx, 'idle', Math.floor(this.t / 20) % 2, 0, 0, p === 0 ? 1 : -1);
        ctx.restore();
        T(ctx, defs[p].name, x, 196, { scale: 2, align: 'center', color: '#fff', outline: '#000' });
        T(ctx, 'PLAYER ' + (p + 1), x, 214, { align: 'center', color: p === 0 ? '#ff6050' : '#60a0ff', outline: '#000' });
      }
      if (this.t > 18) {
        const pop = Math.max(0, 28 - this.t);
        T(ctx, 'VS', W / 2, 70 - pop, { scale: 6 + Math.floor(pop / 4), align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      }
      const stage = RF.getStage(this.opts.stage);
      T(ctx, 'STAGE: ' + stage.name, W / 2, 12, { align: 'center', color: '#c8a888', outline: '#000' });
    }
  }

  RF.VersusScene = VersusScene;
})();
