// The UNLOCKS screen: what can be earned, what has been, and how.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  class UnlocksScene {
    constructor(game) { RF.audio.playSong('menu'); this.game = game; this.t = 0; RF.unlocks.check(); }
    update() {
      this.t++;
      if (RF.menuPressed(this.game.kb, 'back') || RF.menuPressed(this.game.kb, 'confirm')) this.game.setScene(new RF.TitleScene(this.game));
    }
    render(ctx) {
      const W = RF.CONFIG.WIDTH;
      RF.drawMenuBackdrop(ctx, this.t, 0.8);
      RF.drawTitle(ctx, 'UNLOCKS', 12, 2);
      const got = RF.UNLOCKS.filter((u) => u.test()).length;
      T(ctx, got + ' OF ' + RF.UNLOCKS.length + ' EARNED', W / 2, 34, { align: 'center', color: '#a89490', outline: '#000' });
      RF.drawPanel(ctx, 20, 46, W - 40, 150);
      RF.UNLOCKS.forEach((u, i) => {
        const y = 54 + i * 28, on = u.test();
        ctx.fillStyle = on ? 'rgba(200,16,16,0.35)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(26, y - 2, W - 52, 25);
        RF.drawSkull(ctx, 32, y + 3, on ? this.t : 0);
        T(ctx, u.name, 48, y, { color: on ? '#ffffff' : '#6a5a58', outline: '#000' });
        T(ctx, u.kind, W - 32, y, { align: 'right', color: on ? '#e02818' : '#4a3a38', outline: '#000' });
        T(ctx, on ? 'UNLOCKED' : u.how, 48, y + 11, { color: on ? '#80d080' : '#a89490', outline: '#000' });
      });
      T(ctx, 'ESC / ENTER = BACK', W / 2, 206, { align: 'center', color: '#8a7a78', outline: '#000' });
    }
  }
  RF.UnlocksScene = UnlocksScene;
})();
