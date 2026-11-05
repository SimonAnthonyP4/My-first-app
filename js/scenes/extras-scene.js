// PARTY MODS and RECORDS screens.
(function () {
  const T = (...a) => RF.font.drawText(...a);

  class ModsScene {
    constructor(game) {
      RF.audio.playSong('menu');
      this.game = game; this.t = 0;
      const back = () => game.setScene(new RF.TitleScene(game));
      this.back = back;
      this.menu = new RF.ListMenu([
        ...RF.MOD_SETTINGS.map((s) => ({ label: s.label, setting: s })),
        { label: 'ALL OFF', onSelect: () => RF.MOD_SETTINGS.forEach((s) => { RF.CONFIG[s.id] = false; }) },
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
      RF.drawTitle(ctx, 'PARTY MODS', 18);
      RF.drawPanel(ctx, 40, 40, W - 80, 130);
      this.menu.draw(ctx, W / 2 + 10, 50, this.t, { spacing: 14 });
      const s = this.menu.items[this.menu.index].setting;
      if (s) T(ctx, s.hint, W / 2, 180, { align: 'center', color: '#ffd030', outline: '#000' });
      const on = RF.MOD_SETTINGS.filter((m) => RF.CONFIG[m.id]).length;
      T(ctx, on ? on + ' MOD' + (on > 1 ? 'S' : '') + ' ACTIVE - THEY APPLY TO EVERY MODE' : 'MIX AND MATCH FOR CHAOS WITH FRIENDS', W / 2, 194, { align: 'center', color: '#a08878', outline: '#000' });
      T(ctx, 'LEFT/RIGHT TO TOGGLE - ESC TO GO BACK', W / 2, 208, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  class RecordsScene {
    constructor(game) {
      RF.audio.playSong('menu');
      this.game = game; this.t = 0; this.page = 0;
    }
    update() {
      this.t++;
      const kb = this.game.kb;
      if (RF.menuPressed(kb, 'left') || RF.menuPressed(kb, 'right')) { this.page = 1 - this.page; RF.audio.sfx('move'); }
      if (RF.menuPressed(kb, 'back') || RF.menuPressed(kb, 'confirm')) this.game.setScene(new RF.TitleScene(this.game));
    }
    render(ctx) {
      const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT, d = RF.records.data;
      RF.drawMenuBackdrop(ctx, this.t, 0.8);
      const got = RF.ACHIEVEMENTS.filter((a) => d.unlocked[a.id]).length;
      RF.drawTitle(ctx, this.page === 0 ? 'ACHIEVEMENTS ' + got + '/' + RF.ACHIEVEMENTS.length : 'RECORDS', 6);
      RF.drawPanel(ctx, 10, 30, W - 20, 172);
      if (this.page === 0) {
        RF.ACHIEVEMENTS.forEach((a, i) => { // one row each: trophy, name, how to get it
          const x = 18, y = 34 + Math.round(i * 9.6), on = !!d.unlocked[a.id];
          ctx.fillStyle = on ? '#ffd030' : '#3a2a20'; ctx.fillRect(x, y, 7, 7);
          if (on) { ctx.fillStyle = '#fff6b0'; ctx.fillRect(x + 2, y + 2, 3, 3); }
          T(ctx, a.name, x + 11, y, { color: on ? '#ffd030' : '#806860', outline: '#000' });
          T(ctx, a.desc, x + 112, y, { color: on ? '#e0d8d0' : '#6a5a50' });
        });
      } else {
        const wins = (id) => d.wins[id] || 0, played = (id) => d.played[id] || 0;
        const totalW = RF.CHARACTERS.reduce((n, c) => n + wins(c.id), 0), totalP = RF.CHARACTERS.reduce((n, c) => n + played(c.id), 0);
        const lines = [
          ['MATCHES PLAYED', totalP], ['MATCHES WON', totalW], ['LONGEST COMBO', d.best.combo + ' HITS'],
          ['BEST SURVIVAL STREAK', d.best.survival], ['PERFECT BLOCKS', d.counts.perfect || 0], ['TAUNTS', d.counts.taunt || 0],
          ['COMBO TRIALS CLEARED', d.trials.length + '/' + RF.TRIALS.length],
        ];
        lines.forEach(([k, v], i) => { T(ctx, k, 20, 38 + i * 11, { color: '#c8a888', outline: '#000' }); T(ctx, String(v), 170, 38 + i * 11, { align: 'right', color: '#fff', outline: '#000' }); });
        T(ctx, 'WINS BY FIGHTER', 280, 36, { align: 'center', color: '#ffd030', outline: '#000' });
        RF.CHARACTERS.forEach((c, i) => {
          const y = 48 + i * 12.5;
          T(ctx, c.name, 196, y, { color: wins(c.id) ? '#e0d8d0' : '#806860', outline: '#000' });
          T(ctx, wins(c.id) + '/' + played(c.id), 366, y, { align: 'right', color: '#fff', outline: '#000' });
        });
      }
      if (Math.floor(this.t / 30) % 2 === 0) T(ctx, 'LEFT/RIGHT: ' + (this.page === 0 ? 'RECORDS' : 'ACHIEVEMENTS') + '   ESC: BACK', W / 2, H - 12, { align: 'center', color: '#a08878', outline: '#000' });
    }
  }

  RF.ModsScene = ModsScene;
  RF.RecordsScene = RecordsScene;
})();
