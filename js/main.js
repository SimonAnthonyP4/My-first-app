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
    let scale = Math.min(window.innerWidth / WIDTH, availH / HEIGHT);
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
    step() {
      this.scene.update();
      this.kb.tick();
    },
  };
  RF.game = game;

  game.setScene(new RF.TitleScene(game));

  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(now - last, 250); // avoid a huge catch-up after the tab was hidden
    last = now;
    while (acc >= STEP) {
      if (!game.manualStep) game.step();
      acc -= STEP;
    }
    game.scene.render(ctx);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
