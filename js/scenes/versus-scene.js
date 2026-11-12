// Short "P1 VS P2" splash before the fight starts.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const DURATION = 130;

  class VersusScene {
    constructor(game, opts) {
      this.game = game;
      this.opts = opts;
      this.t = 0;
      this.banter = RF.banterFor(opts.p1.id, opts.p2.id);
      this.duration = this.banter ? 210 : DURATION;
      const cos = opts.costumes || [0, opts.p2Alt ? 1 : 0];
      this.sprites = [RF.createSprite(RF.costume(opts.p1, cos[0])), RF.createSprite(RF.costume(opts.p2, cos[1]))];
      const tc = (opts.tag && opts.tag.costumes) || [0, 0];
      this.partners = opts.tag ? [RF.createSprite(RF.costume(opts.tag.p1b, tc[0])), RF.createSprite(RF.costume(opts.tag.p2b, tc[1]))] : null; // tag team
    }

    update() {
      this.t++;
      for (const s of this.sprites) if (s.warm) s.warm(2); // build the fight's frames during the intro (no hitch later)
      if (this.t === 12) RF.announcer.say(this.opts.tag ? 'TAG TEAM!' : this.opts.p1.name + ' versus ' + this.opts.p2.name, { rate: 0.9 });
      if (this.t > 20 && RF.menuPressed(this.game.kb, 'confirm')) this.t = this.duration;
      if (this.t >= this.duration) this.game.setScene(new RF.FightScene(this.game, this.opts));
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
        if (this.partners) { // the partner, a step behind
          ctx.save(); ctx.translate(x + (p === 0 ? -46 : 46), 186); ctx.scale(1.2, 1.2);
          this.partners[p].draw(ctx, 'idle', Math.floor((this.t + 9) / 20) % 2, 0, 0, p === 0 ? 1 : -1, '#000000'); ctx.restore();
          ctx.save(); ctx.globalAlpha = 0.7; ctx.translate(x + (p === 0 ? -46 : 46), 186); ctx.scale(1.2, 1.2);
          this.partners[p].draw(ctx, 'idle', Math.floor((this.t + 9) / 20) % 2, 0, 0, p === 0 ? 1 : -1); ctx.restore();
        }
        ctx.save();
        ctx.translate(x, 190);
        ctx.scale(1.6, 1.6);
        this.sprites[p].draw(ctx, 'idle', Math.floor(this.t / 20) % 2, 0, 0, p === 0 ? 1 : -1);
        ctx.restore();
        const tagName = this.partners && defs[p].name + ' & ' + (p === 0 ? this.opts.tag.p1b : this.opts.tag.p2b).name;
        if (tagName) T(ctx, tagName, Math.max(RF.font.textWidth(tagName) / 2 + 4, Math.min(W - RF.font.textWidth(tagName) / 2 - 4, x)), 199, { align: 'center', color: '#fff', outline: '#000' });
        else T(ctx, defs[p].name, x, 196, { scale: 2, align: 'center', color: '#fff', outline: '#000' });
        T(ctx, p === 1 && this.opts.cpu ? 'CPU' : 'PLAYER ' + (p + 1), x, 214, { align: 'center', color: p === 0 ? '#ff6050' : '#60a0ff', outline: '#000' });
      }
      if (this.t > 18) {
        const pop = Math.max(0, 28 - this.t);
        T(ctx, 'VS', W / 2, 70 - pop, { scale: 6 + Math.floor(pop / 4), align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      }
      // Rival banter: speech bubbles, P1 first, then the reply.
      if (this.banter) [0, 1].forEach((p) => {
        const start = p === 0 ? 50 : 110;
        if (this.t < start) return;
        const lines = RF.font.wrap(this.banter[p], 22), x = p === 0 ? 96 : W - 96, y = p === 0 ? 24 : 46;
        const w = Math.max(...lines.map((l) => RF.font.textWidth(l))) + 10, h = lines.length * 9 + 6;
        ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#f0e8d8'; ctx.fillRect(x - w / 2, y, w, h);
        ctx.fillRect(x - 3, y + h, 6, 4); // tail
        lines.forEach((l, i) => T(ctx, l, x, y + 4 + i * 9, { align: 'center', color: '#1a0a08' }));
      });
      const stage = RF.getStage(this.opts.stage);
      T(ctx, 'STAGE: ' + stage.name, W / 2, 12, { align: 'center', color: '#c8a888', outline: '#000' });
      if (!this.banter && RF.tip && this.t > 30) { if (this.tipN == null) this.tipN = Math.floor(Math.random() * RF.TIPS.length); RF.font.wrap('TIP: ' + RF.tip(this.tipN), 40).forEach((l, i) => T(ctx, l, W / 2, 24 + i * 9, { align: 'center', color: '#8a7a78', outline: '#000' })); }
    }
  }

  RF.VersusScene = VersusScene;
})();
