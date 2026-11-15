// Stage select: live preview of the highlighted stage, plus a RANDOM option. It opens on player one's home
// turf (RF.HOME_STAGE), marks both fighters' home stages on the strip, and UP / DOWN skips five at a time.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const PREVIEW_SCALE = 0.58;

  class StageSelectScene {
    constructor(game, opts) {
      RF.audio.playSong('menu');
      this.game = game;
      this.opts = opts; // fight options from character select (p1, p2, p2Alt, cpu...)
      this.t = 0;
      this.options = [...RF.STAGES.map((s) => s.id), 'random'];
      this.homes = [RF.homeStage(opts.p1), RF.homeStage(opts.p2)];
      const prev = this.options.indexOf(opts.stage || this.homes[0]);
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
      const tap = RF.touch && RF.touch.takeTap();                      // tap the sides to flip through, the picture to fight
      if (tap && tap.y > 22 && tap.y < 205) { if (tap.x < RF.CONFIG.WIDTH * 0.3) this.index = (this.index - 1 + n) % n; else if (tap.x > RF.CONFIG.WIDTH * 0.7) this.index = (this.index + 1) % n; else RF.touch.pulse(RF.CONTROLS.p1.light[0]); }
      if (RF.menuPressed(kb, 'left')) this.index = (this.index - 1 + n) % n;
      if (RF.menuPressed(kb, 'right')) this.index = (this.index + 1) % n;
      if (RF.menuPressed(kb, 'up')) this.index = (this.index - 5 + n) % n;
      if (RF.menuPressed(kb, 'down')) this.index = (this.index + 5) % n;
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
      // Whose house this is
      const who = [0, 1].filter((i) => this.homes[i] && this.homes[i] === id).map((i) => (i ? this.opts.p2 : this.opts.p1).name.toUpperCase());
      if (who.length) T(ctx, 'HOME TURF: ' + [...new Set(who)].join(' + '), W / 2, ny + 18, { align: 'center', color: this.t % 40 < 30 ? '#ffd030' : '#c89a20', outline: '#000' });
      // Position strip: one mark for every stage; the two home stages are marked in each player's colour
      const n = this.options.length, gap = Math.min(10, Math.floor(340 / n)), x0 = Math.round(W / 2 - (n * gap) / 2);
      this.options.forEach((sid, i) => {
        const mine = sid === this.homes[0], theirs = sid === this.homes[1];
        ctx.fillStyle = i === this.index ? '#ffd030' : mine ? '#ff6a30' : theirs ? '#40a0ff' : '#4a2a20';
        ctx.fillRect(x0 + i * gap, ny + (i === this.index ? 28 : 29), gap - 3, i === this.index ? 5 : 3);
      });
      T(ctx, (this.index + 1) + ' / ' + n, W - 10, 14, { align: 'right', color: '#806860', outline: '#000' });
      T(ctx, 'LEFT/RIGHT CHOOSE - UP/DOWN SKIP 5 - ENTER FIGHT - ESC BACK', W / 2, 212, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  RF.StageSelectScene = StageSelectScene;
})();
