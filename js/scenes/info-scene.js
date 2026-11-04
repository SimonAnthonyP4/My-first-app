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
      next: 'combos',
      draw(ctx, W) {
        RF.drawPanel(ctx, 12, 34, W - 24, 98);
        const rows = [['MOVE', 'left'], ['JUMP', 'up'], ['CROUCH', 'down'], ['LIGHT ATTACK', 'light'], ['HEAVY ATTACK', 'heavy'], ['BLOCK (HOLD)', 'block'], ['THROW (UP CLOSE)', 'throw']];
        T(ctx, 'PLAYER 1', 170, 38, { align: 'center', color: '#ff6050', outline: '#000' });
        T(ctx, 'PLAYER 2', 296, 38, { align: 'center', color: '#60a0ff', outline: '#000' });
        rows.forEach(([label, action], i) => {
          const y = 49 + i * 11;
          T(ctx, label, 22, y, { color: '#d8c8c0', outline: '#000' });
          const fmt = (p) => (action === 'left' ? keys(p, 'left') + ' / ' + keys(p, 'right') : keys(p, action));
          T(ctx, fmt('p1'), 170, y, { align: 'center', color: '#fff', outline: '#000' });
          T(ctx, fmt('p2'), 296, y, { align: 'center', color: '#fff', outline: '#000' });
        });
        RF.drawPanel(ctx, 12, 135, W - 24, 68, '#2a5a8a');
        T(ctx, 'PERFECT BLOCK', W / 2, 138, { align: 'center', color: '#8ff0ff', outline: '#000' });
        RF.font.wrap('TAP BLOCK JUST BEFORE AN ATTACK LANDS. YOU TAKE NO DAMAGE, THE ATTACKER STAGGERS, AND YOUR FIGHTER UNLEASHES THEIR SPECIAL MOVE.', 58)
          .forEach((line, i) => T(ctx, line, W / 2, 148 + i * 8, { align: 'center', color: '#e8e0d8', outline: '#000' }));
        T(ctx, 'HIGH/LOW AND THROWS', W / 2, 172, { align: 'center', color: '#ffb060', outline: '#000' });
        RF.font.wrap('SWEEPS: CROUCH-BLOCK. JUMP-INS: BLOCK STANDING. THROWS BEAT BLOCKING - PRESS THROW WHEN GRABBED TO BREAK FREE.', 58)
          .forEach((line, i) => T(ctx, line, W / 2, 182 + i * 8, { align: 'center', color: '#e8e0d8', outline: '#000' }));
      },
    },
    combos: {
      title: 'COMBOS AND SUPERS',
      draw(ctx, W) {
        const rows = [
          ['COMBOS', '#ffd030', 'LIGHT ATTACKS THAT HIT CAN CHAIN INTO MORE ATTACKS: LIGHT, LIGHT, HEAVY.'],
          ['LAUNCHER', '#ff9a40', 'UP + HEAVY: AN UPPERCUT THAT POPS THEM INTO THE AIR. HOLD UP AS IT HITS TO JUMP AFTER THEM.'],
          ['AIR COMBOS', '#8ff0ff', 'IN THE AIR, CHAIN LIGHT, LIGHT, HEAVY. THE AIR HEAVY SPIKES THEM INTO A FLOOR BOUNCE - HIT THEM AGAIN!'],
          ['SUPER', '#ffd030', 'HIT AND GET HIT TO FILL THE METER. WHEN FULL, PRESS LIGHT + HEAVY TOGETHER (EVEN TO END A COMBO) FOR A POWERED-UP SPECIAL.'],
          ['DASH', '#c0ff80', 'DOUBLE-TAP FORWARD TO DASH IN, BACK TO SLIP AWAY (BRIEFLY UNTOUCHABLE).'],
          ['COUNTER!', '#ff6050', 'HIT THEM WHILE THEY ARE STARTING AN ATTACK FOR EXTRA DAMAGE AND STUN.'],
        ];
        RF.drawPanel(ctx, 12, 34, W - 24, 170);
        let y = 40;
        for (const [title, col, text] of rows) {
          T(ctx, title, 20, y, { color: col, outline: '#000' });
          RF.font.wrap(text, 46).forEach((line, i) => T(ctx, line, 92, y + i * 8, { color: '#e8e0d8', outline: '#000' }));
          y += Math.max(1, RF.font.wrap(text, 46).length) * 8 + 6;
        }
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
      RF.audio.playSong('menu');
      this.game = game;
      this.page = PAGES[page];
      this.t = 0;
    }

    update() {
      this.t++;
      if (RF.menuPressed(this.game.kb, 'confirm') && this.page.next) this.game.setScene(new InfoScene(this.game, this.page.next));
      else if (RF.menuPressed(this.game.kb, 'back') || RF.menuPressed(this.game.kb, 'confirm')) {
        this.game.setScene(new RF.TitleScene(this.game));
      }
    }

    render(ctx) {
      const W = RF.CONFIG.WIDTH;
      RF.drawMenuBackdrop(ctx, this.t, 0.78);
      RF.drawTitle(ctx, this.page.title, 16);
      this.page.draw(ctx, W);
      if (Math.floor(this.t / 30) % 2 === 0) {
        T(ctx, this.page.next ? 'ENTER: COMBOS AND SUPERS   ESC: BACK' : 'PRESS ENTER OR ESC TO GO BACK', W / 2, 210, { align: 'center', color: '#a08878', outline: '#000' });
      }
    }
  }

  RF.InfoScene = InfoScene;
})();
