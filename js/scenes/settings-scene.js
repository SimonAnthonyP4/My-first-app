// Settings menu. The options themselves are defined in js/core/settings.js.
(function () {
  const T = (...a) => RF.font.drawText(...a);

  class SettingsScene {
    constructor(game) {
      this.game = game;
      this.t = 0;
      const back = () => game.setScene(new RF.TitleScene(game));
      this.back = back;
      this.menu = new RF.ListMenu([
        ...RF.SETTINGS.map((s) => ({ label: s.label, setting: s })),
        { label: 'RESET TO DEFAULTS', onSelect: () => RF.settings.reset() },
        { label: 'BACK', onSelect: back },
      ]);
    }

    update() {
      this.t++;
      if (this.game.kb.justPressed('Escape', 'Backspace')) return this.back();
      this.menu.update(this.game.kb);
    }

    render(ctx) {
      const W = RF.CONFIG.WIDTH;
      RF.drawMenuBackdrop(ctx, this.t, 0.75);
      RF.drawTitle(ctx, 'SETTINGS', 18);
      RF.drawPanel(ctx, 40, 46, W - 80, 128);
      const items = this.menu.items;
      this.menu.draw(ctx, W / 2 + 10, 60, this.t, { spacing: 18 });
      const hint = {
        ROUND_TIME: 'HOW LONG EACH ROUND LASTS',
        ROUNDS_TO_WIN: 'ROUNDS NEEDED TO WIN THE MATCH',
        PERFECT_BLOCK_WINDOW: 'HOW TIGHT THE PERFECT BLOCK TIMING IS',
        SHOW_HITBOXES: 'DRAW ATTACK AND BODY BOXES FOR BALANCE TESTING',
      }[(items[this.menu.index].setting || {}).id];
      if (hint) T(ctx, hint, W / 2, 186, { align: 'center', color: '#a08878', outline: '#000' });
      T(ctx, 'LEFT/RIGHT TO CHANGE - ESC TO GO BACK', W / 2, 208, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  RF.SettingsScene = SettingsScene;
})();
