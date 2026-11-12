// Settings menu. The options themselves are defined in js/core/settings.js.
(function () {
  const T = (...a) => RF.font.drawText(...a);

  class SettingsScene {
    constructor(game) {
      RF.audio.playSong('menu');
      this.game = game;
      this.t = 0;
      const back = () => game.setScene(new RF.TitleScene(game));
      this.back = back;
      this.main = new RF.ListMenu([
        ...RF.SETTINGS.filter((s) => !s.touch).map((s) => ({ label: s.label, setting: s })),
        { label: 'TOUCH CONTROLS...', onSelect: () => { this.menu = this.touch; } },
        { label: 'RESET TO DEFAULTS', onSelect: () => RF.settings.reset() },
        { label: 'BACK', onSelect: back },
      ]);
      // the on-screen controller for phones and tablets gets its own page
      this.touch = new RF.ListMenu([
        ...RF.SETTINGS.filter((s) => s.touch).map((s) => ({ label: s.label, setting: s })),
        { label: 'BACK', onSelect: () => { this.menu = this.main; } },
      ]);
      this.menu = this.main;
    }

    update() {
      this.t++;
      if (this.game.kb.justPressed('Escape', 'Backspace')) return this.menu === this.touch ? (this.menu = this.main) : this.back();
      this.menu.update(this.game.kb);
    }

    render(ctx) {
      const W = RF.CONFIG.WIDTH;
      RF.drawMenuBackdrop(ctx, this.t, 0.75);
      const onTouch = this.menu === this.touch;
      RF.drawTitle(ctx, onTouch ? 'TOUCH CONTROLS' : 'SETTINGS', 18);
      RF.drawPanel(ctx, 40, 36, W - 80, 156);
      const items = this.menu.items;
      this.menu.draw(ctx, W / 2 + 10, 41, this.t, { spacing: onTouch ? 16 : 11 });
      const hint = {
        ROUND_TIME: 'HOW LONG EACH ROUND LASTS',
        ROUNDS_TO_WIN: 'ROUNDS NEEDED TO WIN THE MATCH',
        PERFECT_BLOCK_WINDOW: 'HOW TIGHT THE PERFECT BLOCK TIMING IS',
        MUSIC_VOLUME: 'BACKGROUND MUSIC VOLUME (M MUTES ALL SOUND)',
        SFX_VOLUME: 'HITS, BLOCKS AND MENU SOUNDS',
        CPU_LEVEL: 'HOW TOUGH THE VS CPU OPPONENT IS',
        SHOW_HITBOXES: 'DRAW ATTACK AND BODY BOXES FOR BALANCE TESTING',
        TOUCH_MODE: 'AUTO: SHOWN ON PHONES, HIDDEN WITH A KEYBOARD',
        TOUCH_SIZE: 'HOW BIG THE ON-SCREEN BUTTONS ARE',
        TOUCH_SWAP: 'WHICH SIDE THE MOVEMENT STICK IS ON',
      }[(items[this.menu.index].setting || {}).id];
      if (hint) T(ctx, hint, W / 2, 196, { align: 'center', color: '#a08878', outline: '#000' });
      T(ctx, RF.touch && RF.touch.active ? 'TAP A ROW TO CHANGE IT' : 'LEFT/RIGHT TO CHANGE - ESC TO GO BACK', W / 2, 208, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  RF.SettingsScene = SettingsScene;
})();
