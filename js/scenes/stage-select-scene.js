// Stage select: live preview of the highlighted stage, plus a RANDOM option.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const PREVIEW_SCALE = 0.62;

  class StageSelectScene {
    constructor(game, opts) {
      RF.audio.playSong('menu');
      this.game = game;
      this.opts = opts; // fight options from character select (p1, p2, p2Alt, cpu...)
      this.t = 0;
      this.options = [...RF.STAGES.map((s) => s.id), 'random'];
      const prev = this.options.indexOf(opts.stage);
      this.index = prev >= 0 ? prev : 0;
      this.renderers = {};
      this.chosen = null;
    }

    renderer(id) {
      if (!this.renderers[id]) this.renderers[id] = new RF.StageRenderer(RF.getStage(id));
      return this.renderers[id];
    }

    update() {
      const kb = this.game.kb;
      this.t++;
      if (this.chosen) {
        if (++this.chosenTime > 30) {
          this.game.setScene(new RF.VersusScene(this.game, Object.assign({}, this.opts, { stage: this.chosen })));
        }
        return;
      }
      const n = this.options.length;
      const before = this.index;
      if (RF.menuPressed(kb, 'left') || RF.menuPressed(kb, 'up')) this.index = (this.index - 1 + n) % n;
      if (RF.menuPressed(kb, 'right') || RF.menuPressed(kb, 'down')) this.index = (this.index + 1) % n;
      if (before !== this.index) RF.audio.sfx('move');
      if (RF.menuPressed(kb, 'back')) return this.game.setScene(new RF.SelectScene(this.game, this.opts));
      if (RF.menuPressed(kb, 'confirm')) {
        let id = this.options[this.index];
        if (id === 'random') id = RF.STAGES[Math.floor(Math.random() * RF.STAGES.length)].id;
        this.chosen = id;
        this.chosenTime = 0;
        RF.audio.sfx('select');
      }
    }

    render(ctx) {
      const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
      RF.drawMenuBackdrop(ctx, this.t, 0.85);
      RF.drawTitle(ctx, 'SELECT STAGE', 8, 2);

      // Preview
      const id = this.chosen || this.options[this.index];
      const pw = Math.round(W * PREVIEW_SCALE), ph = Math.round(H * PREVIEW_SCALE);
      const px = Math.round((W - pw) / 2), py = 30;
      RF.drawPanel(ctx, px - 3, py - 3, pw + 6, ph + 6, this.chosen ? '#ffd030' : '#8a3a20');
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      ctx.translate(px, py);
      ctx.scale(PREVIEW_SCALE, PREVIEW_SCALE);
      if (id === 'random') {
        ctx.fillStyle = '#100404';
        ctx.fillRect(0, 0, W, H);
        T(ctx, '?', W / 2, 70, { scale: 10, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      } else {
        this.renderer(id).draw(ctx, this.t);
      }
      ctx.restore();

      // Name with arrows
      const name = id === 'random' ? 'RANDOM' : RF.getStage(id).name;
      const ny = py + ph + 10;
      T(ctx, name, W / 2, ny, { scale: 2, align: 'center', color: this.chosen ? '#ffd030' : '#ffffff', outline: '#000' });
      if (!this.chosen) {
        const w = RF.font.textWidth(name, 2), bob = Math.floor(this.t / 8) % 2;
        T(ctx, '<', W / 2 - w / 2 - 14 - bob, ny + 3, { color: '#ff5020', outline: '#000' });
        T(ctx, '>', W / 2 + w / 2 + 9 + bob, ny + 3, { color: '#ff5020', outline: '#000' });
      }
      // Position dots
      this.options.forEach((_, i) => {
        ctx.fillStyle = i === this.index ? '#ffd030' : '#4a2a20';
        ctx.fillRect(W / 2 - this.options.length * 5 + i * 10, ny + 20, 6, 3);
      });
      T(ctx, 'LEFT/RIGHT TO CHOOSE - ENTER TO FIGHT - ESC TO GO BACK', W / 2, 212, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  RF.StageSelectScene = StageSelectScene;
})();
