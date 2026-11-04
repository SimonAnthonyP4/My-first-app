// Boot: canvas scaling, fixed-timestep game loop, current scene.
// Scenes (fight, and later menus/character select) implement update() and render(ctx).
(function () {
  const { WIDTH, HEIGHT, FPS } = RF.CONFIG;
  const STEP = 1000 / FPS;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function resize() {
    const help = document.getElementById('help');
    const availH = window.innerHeight - (help ? help.offsetHeight : 0);
    let scale = Math.min((window.innerWidth - 32) / WIDTH, availH / HEIGHT); // 32 = side gutters
    if (scale >= 2) scale = Math.floor(scale); // whole-number scaling keeps pixels crisp
    canvas.style.width = Math.floor(WIDTH * scale) + 'px';
    canvas.style.height = Math.floor(HEIGHT * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  const game = {
    kb: new RF.Keyboard(),
    scene: null,
    setScene(scene) { this.scene = scene; },
    manualStep: false, // automated tests set this and call game.step() themselves
    toast: null,
    step() {
      if (this.kb.justPressed('KeyM')) {
        this.toast = { text: RF.audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON', t: 90 };
      }
      if (this.toast && --this.toast.t <= 0) this.toast = null;
      this.scene.update();
      this.kb.tick();
    },
  };
  RF.game = game;

  game.setScene(new RF.TitleScene(game));

  let last = performance.now(), acc = 0;
  function loop(now) {
    let dt = Math.min(now - last, 250); // avoid a huge catch-up after the tab was hidden
    last = now;
    // Frame times jitter by a millisecond or two; treating "about one frame" as
    // exactly one frame stops the occasional doubled/skipped update (judder).
    if (Math.abs(dt - STEP) < 2) dt = STEP;
    acc += dt;
    while (acc >= STEP) {
      if (!game.manualStep) game.step();
      acc -= STEP;
    }
    game.scene.render(ctx);
    if (game.toast) {
      RF.font.drawText(ctx, game.toast.text, WIDTH - 6, HEIGHT - 12, { align: 'right', color: '#ffd030', outline: '#000' });
    }
    RF.audio.update();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
