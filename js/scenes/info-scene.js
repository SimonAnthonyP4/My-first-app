// Static text pages: How to Play and Credits.
(function () {
  const T = (...a) => RF.font.drawText(...a);

  function keyName(code) {
    return code.replace(/^Key/, '').replace(/^Numpad/, 'NUM').replace(/^Arrow/, '')
      .replace('Comma', ',').replace('Period', '.').replace('Slash', '/');
  }
  const keys = (p, action) => RF.CONTROLS[p][action].map(keyName).join(' OR ');

  const PAGES = {
    howto: {
      title: 'HOW TO PLAY',
      draw(ctx, W) {
        RF.drawPanel(ctx, 12, 42, W - 24, 92);
        const rows = [['MOVE', 'left'], ['JUMP', 'up'], ['LIGHT ATTACK', 'light'], ['HEAVY ATTACK', 'heavy'], ['BLOCK (HOLD)', 'block']];
        T(ctx, 'PLAYER 1', 170, 48, { align: 'center', color: '#ff6050', outline: '#000' });
        T(ctx, 'PLAYER 2', 296, 48, { align: 'center', color: '#60a0ff', outline: '#000' });
        rows.forEach(([label, action], i) => {
          const y = 62 + i * 13;
          T(ctx, label, 22, y, { color: '#d8c8c0', outline: '#000' });
          const fmt = (p) => (action === 'left' ? keys(p, 'left') + ' / ' + keys(p, 'right') : keys(p, action));
          T(ctx, fmt('p1'), 170, y, { align: 'center', color: '#fff', outline: '#000' });
          T(ctx, fmt('p2'), 296, y, { align: 'center', color: '#fff', outline: '#000' });
        });
        RF.drawPanel(ctx, 12, 140, W - 24, 58, '#2a5a8a');
        T(ctx, 'PERFECT BLOCK', W / 2, 146, { align: 'center', color: '#8ff0ff', outline: '#000' });
        RF.font.wrap('TAP BLOCK JUST BEFORE AN ATTACK LANDS. YOU TAKE NO DAMAGE, THE ATTACKER STAGGERS, AND YOUR FIGHTER UNLEASHES THEIR SPECIAL MOVE. HOLDING OR MASHING BLOCK WON\'T DO IT - IT\'S ALL TIMING.', 56)
          .forEach((line, i) => T(ctx, line, W / 2, 158 + i * 9, { align: 'center', color: '#e8e0d8', outline: '#000' }));
      },
    },
    credits: {
      title: 'CREDITS',
      draw(ctx, W) {
        RF.CONFIG.CREDITS.forEach(([role, who], i) => {
          const y = 64 + i * 34;
          T(ctx, role, W / 2, y, { align: 'center', color: '#ff7040', outline: '#000' });
          T(ctx, who, W / 2, y + 12, { align: 'center', color: '#fff', outline: '#000', scale: 1 });
        });
      },
    },
  };

  class InfoScene {
    constructor(game, page) {
      this.game = game;
      this.page = PAGES[page];
      this.t = 0;
    }

    update() {
      this.t++;
      if (RF.menuPressed(this.game.kb, 'back') || RF.menuPressed(this.game.kb, 'confirm')) {
        this.game.setScene(new RF.TitleScene(this.game));
      }
    }

    render(ctx) {
      const W = RF.CONFIG.WIDTH;
      RF.drawMenuBackdrop(ctx, this.t, 0.78);
      RF.drawTitle(ctx, this.page.title, 16);
      this.page.draw(ctx, W);
      if (Math.floor(this.t / 30) % 2 === 0) {
        T(ctx, 'PRESS ENTER OR ESC TO GO BACK', W / 2, 210, { align: 'center', color: '#a08878', outline: '#000' });
      }
    }
  }

  RF.InfoScene = InfoScene;
})();
