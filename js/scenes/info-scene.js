// Static text pages: How to Play and Credits.
(function () {
  const T = (...a) => RF.font.drawText(...a);

  function keyName(code) {
    return code.replace(/^Key/, '').replace(/^Numpad/, 'NUM').replace(/^Arrow/, '')
      .replace('Comma', ',').replace('Period', '.').replace('Slash', '/').replace('Semicolon', ';').replace('Quote', "'");
  }
  const keys = (p, action) => RF.CONTROLS[p][action].filter((c) => !c.startsWith('Pad')).map(keyName).join(' OR ');

  const PAGES = {
    howto: {
      title: 'HOW TO PLAY',
      next: 'combos',
      draw(ctx, W) {
        RF.drawPanel(ctx, 12, 34, W - 24, 98);
        const rows = [['MOVE', 'left'], ['JUMP', 'up'], ['CROUCH', 'down'], ['LIGHT ATTACK', 'light'], ['HEAVY ATTACK', 'heavy'], ['BLOCK (HOLD)', 'block'], ['THROW (UP CLOSE)', 'throw'], ['DASH', 'dash'], ['EX SPECIAL (1 BAR)', 'ex']];
        T(ctx, 'PLAYER 1', 170, 38, { align: 'center', color: '#ff6050', outline: '#000' });
        T(ctx, 'PLAYER 2', 296, 38, { align: 'center', color: '#60a0ff', outline: '#000' });
        rows.forEach(([label, action], i) => {
          const y = 48 + i * 9;
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
    controller: {
      title: 'CONTROLLER',
      draw(ctx, W) {
        RF.drawPanel(ctx, 12, 34, W - 24, 170);
        T(ctx, 'PS5 / PS4 / XBOX CONTROLLERS WORK TOO', W / 2, 40, { align: 'center', color: '#8ff0ff', outline: '#000' });
        T(ctx, 'CONTROLLER 1 = PLAYER 1, CONTROLLER 2 = PLAYER 2', W / 2, 50, { align: 'center', color: '#a8b8c8', outline: '#000' });
        const rows = [
          ['D-PAD / L-STICK', 'MOVE, UP JUMP, DOWN CROUCH', '#fff'],
          ['SQUARE', 'LIGHT ATTACK', '#ff7ac8'],
          ['TRIANGLE', 'HEAVY ATTACK', '#40e0a0'],
          ['CIRCLE OR L1', 'BLOCK', '#ff5050'],
          ['CROSS', 'THROW', '#6aa0ff'],
          ['R1', 'DASH (HOLD BACK = BACKDASH)', '#ffffff'],
          ['L2', 'EX SPECIAL (1 BAR)', '#60e0ff'],
          ['R2', 'SUPER / COMBO BREAKER', '#ffd030'],
          ['UP + TRIANGLE', 'LAUNCHER', '#ff9a40'],
          ['CREATE / TOUCHPAD', 'TAUNT', '#fff'],
          ['OPTIONS', 'PAUSE', '#fff'],
          ['MENUS', 'CROSS = OK, CIRCLE = BACK', '#fff'],
        ];
        rows.forEach(([b, what, col], i) => {
          const y = 62 + i * 9;
          T(ctx, b, W / 2 - 30, y, { align: 'right', color: col, outline: '#000' });
          T(ctx, what, W / 2 - 16, y, { color: '#e8e0d8', outline: '#000' });
        });
        T(ctx, 'NOT DETECTED? PRESS ANY BUTTON ON IT IN THE GAME.', W / 2, 180, { align: 'center', color: '#a08878', outline: '#000' });
        T(ctx, 'CONNECT BY USB OR BLUETOOTH FIRST.', W / 2, 190, { align: 'center', color: '#a08878', outline: '#000' });
      },
    },
    combos: {
      title: 'COMBOS AND SUPERS',
      next: 'controller',
      draw(ctx, W) {
        const rows = [
          ['KOMBOS', '#ff4040', 'L,L,H = KOMBO! (BIG KNOCKBACK). L,L,L,H = BRUTAL KOMBO: LAUNCHES - HOLD UP TO CHASE.'],
          ['COMBOS', '#ffd030', 'A HEAVY THAT HITS CAN CANCEL INTO EX, SUPER OR (UP+HEAVY) LAUNCHER.'],
          ['LAUNCHER', '#ff9a40', 'UP + HEAVY POPS THEM UP. HOLD UP AS IT HITS TO JUMP AFTER THEM.'],
          ['AIR COMBOS', '#8ff0ff', 'AIR LIGHT, LIGHT, HEAVY. THE AIR HEAVY SPIKES THEM INTO A FLOOR BOUNCE.'],
          ['WALL BOUNCE', '#ffb060', 'A HEAVY IN THE CORNER BOUNCES THEM OFF THE WALL. KEEP THE COMBO GOING!'],
          ['METER', '#60c0ff', '3 BARS. 1 = EX SPECIAL (THROW IN A COMBO, OR DOWN+THROW). 2 = COMBO BREAKER (LIGHT+HEAVY WHILE HIT). 3 = SUPER (LIGHT+HEAVY).'],
          ['TECH', '#c0ff80', 'KNOCKED DOWN? BLOCK AS YOU LAND TO ROLL UP. DOUBLE-TAP OR R1 TO DASH.'],
        ];
        RF.drawPanel(ctx, 12, 34, W - 24, 170);
        let y = 40;
        for (const [title, col, text] of rows) {
          T(ctx, title, 20, y, { color: col, outline: '#000' });
          RF.font.wrap(text, 46).forEach((line, i) => T(ctx, line, 92, y + i * 8, { color: '#e8e0d8', outline: '#000' }));
          y += Math.max(1, RF.font.wrap(text, 46).length) * 8 + 5;
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
        T(ctx, this.page.next ? 'ENTER: NEXT PAGE   ESC: BACK' : 'PRESS ENTER OR ESC TO GO BACK', W / 2, 210, { align: 'center', color: '#a08878', outline: '#000' });
      }
    }
  }

  RF.InfoScene = InfoScene;
})();
