// Main menu.
(function () {
  const T = (...a) => RF.font.drawText(...a);

  class TitleScene {
    constructor(game) {
      this.game = game;
      this.t = 0;
      this.menu = new RF.ListMenu([
        { label: 'FIGHT NOW', onSelect: () => game.setScene(new RF.SelectScene(game)) },
        { label: 'HOW TO PLAY', onSelect: () => game.setScene(new RF.InfoScene(game, 'howto')) },
        { label: 'SETTINGS', onSelect: () => game.setScene(new RF.SettingsScene(game)) },
        { label: 'CREDITS', onSelect: () => game.setScene(new RF.InfoScene(game, 'credits')) },
      ]);
    }

    update() {
      this.t++;
      this.menu.update(this.game.kb);
    }

    render(ctx) {
      const W = RF.CONFIG.WIDTH;
      RF.drawMenuBackdrop(ctx, this.t, 0.72);
      // Title drops in, then gently pulses.
      const drop = Math.max(0, 40 - this.t) * 2;
      T(ctx, RF.CONFIG.TITLE, W / 2, 34 - drop, { scale: 4, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      T(ctx, 'A FIGHT TO THE DEATH... AT LUNCH', W / 2, 70, { align: 'center', color: '#c04030', outline: '#000' });
      this.menu.draw(ctx, W / 2, 104, this.t, { spacing: 18, scale: 1 });
      T(ctx, 'W/S OR ARROWS TO MOVE - ENTER OR LIGHT ATTACK TO SELECT', W / 2, 208, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  RF.TitleScene = TitleScene;
})();
