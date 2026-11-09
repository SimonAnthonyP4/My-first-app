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

  // Say hello when a controller is plugged in / paired.
  window.addEventListener('gamepadconnected', (e) => {
    const n = [...navigator.getGamepads()].filter((p) => p && p.connected).length;
    const ps = /dualsense|054c|playstation|wireless controller/i.test(e.gamepad.id);
    game.toast = { text: 'P' + Math.min(n, 2) + ' ' + (ps ? 'PS5 ' : '') + 'CONTROLLER CONNECTED', t: 180 };
  });
  window.addEventListener('gamepaddisconnected', () => { game.toast = { text: 'CONTROLLER DISCONNECTED', t: 150 }; });

  // Safety: a circle or oval with a negative size throws an error in the browser; clamp
  // them to zero instead, so a shrinking effect can never crash a frame.
  const P = CanvasRenderingContext2D.prototype, arc0 = P.arc, ell0 = P.ellipse;
  P.arc = function (x, y, r, ...rest) { return arc0.call(this, x, y, Math.max(0, r || 0), ...rest); };
  P.ellipse = function (x, y, rx, ry, ...rest) { return ell0.call(this, x, y, Math.max(0, rx || 0), Math.max(0, ry || 0), ...rest); };

  // If something ever goes wrong in one frame, log it and keep the game running
  // (an uncaught error would stop the loop and freeze the game).
  let errors = 0;
  const safely = (fn) => { try { fn(); } catch (e) { if (errors++ < 5) console.error('Frame error (game keeps running):', e); } };

  const game = {
    kb: new RF.Keyboard(),
    scene: null,
    setScene(scene) { this.scene = scene; },
    manualStep: false, // automated tests set this and call game.step() themselves
    toast: null,
    step() {
      this.kb.pollPads();
      if (this.kb.justPressed('KeyM')) {
        this.toast = { text: RF.audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON', t: 90 };
      }
      if (this.toast && --this.toast.t <= 0) this.toast = null;
      if (this.achievement && --this.achievement.t <= 0) this.achievement = null;
      this.scene.update();
      this.kb.tick();
    },
  };
  RF.game = game;

  game.setScene(new RF.TitleScene(game));

  // HIGH-REFRESH SMOOTHING: the game updates 60 times a second. On a 120/144 Hz screen,
  // draw the fighters and camera part-way between the last two updates instead of
  // showing each update twice (which judders). Off on 60 Hz screens (no added delay).
  let refresh = 16.7;
  const snap = { scene: null, list: [] };
  const remember = () => {
    const sc = game.scene;
    snap.scene = sc;
    snap.list = sc && sc.fighters ? sc.fighters.map((f) => [f.x, f.y]) : [];
    snap.cam = sc && sc.cam ? [sc.cam.x, sc.cam.z] : null;
  };
  const withInterpolation = (alpha, draw) => {
    const sc = game.scene;
    if (refresh > 12.5 || alpha <= 0 || snap.scene !== sc || !sc.fighters || (RF.online && RF.online.active)) return draw();
    const saved = sc.fighters.map((f) => [f.x, f.y]), cam = sc.cam ? [sc.cam.x, sc.cam.z] : null;
    sc.fighters.forEach((f, i) => {
      const p = snap.list[i];
      if (p && Math.abs(f.x - p[0]) < 40 && Math.abs(f.y - p[1]) < 40) { f.x = p[0] + (f.x - p[0]) * alpha; f.y = p[1] + (f.y - p[1]) * alpha; }
    });
    if (cam && snap.cam) { sc.cam.x = snap.cam[0] + (cam[0] - snap.cam[0]) * alpha; sc.cam.z = snap.cam[1] + (cam[1] - snap.cam[1]) * alpha; }
    try { draw(); } finally {
      sc.fighters.forEach((f, i) => { f.x = saved[i][0]; f.y = saved[i][1]; });
      if (cam) { sc.cam.x = cam[0]; sc.cam.z = cam[1]; }
    }
  };

  let last = performance.now(), acc = 0;
  function loop(now) {
    let dt = Math.min(now - last, 250); // avoid a huge catch-up after the tab was hidden
    last = now;
    if (dt > 0 && dt < 50) refresh = refresh * 0.95 + dt * 0.05; // how fast this screen refreshes
    // Frame times jitter by a millisecond or two; treating "about one frame" as
    // exactly one frame stops the occasional doubled/skipped update (judder).
    if (Math.abs(dt - STEP) < 2) dt = STEP;
    acc += dt;
    while (acc >= STEP) {
      if (!game.manualStep) { remember(); safely(() => (RF.online && RF.online.active ? RF.online.tick() : game.step())); }
      acc -= STEP;
    }
    safely(() => withInterpolation(game.manualStep ? 0 : acc / STEP, () => game.scene.render(ctx)));
    if (RF.online) safely(() => RF.online.drawOverlay(ctx));
    if (game.achievement) { // ACHIEVEMENT UNLOCKED pop-up (top centre)
      const a = game.achievement, tIn = Math.min(1, (240 - a.t) / 12), tOut = Math.min(1, a.t / 12), y = Math.round(-30 + 34 * Math.min(tIn, tOut));
      ctx.fillStyle = '#000'; ctx.fillRect(WIDTH / 2 - 92, y - 1, 184, 26);
      ctx.fillStyle = '#3a2a08'; ctx.fillRect(WIDTH / 2 - 91, y, 182, 24);
      ctx.fillStyle = '#ffd030'; ctx.fillRect(WIDTH / 2 - 91, y, 182, 1);
      RF.font.drawText(ctx, 'ACHIEVEMENT UNLOCKED', WIDTH / 2, y + 3, { align: 'center', color: '#ffd030' });
      RF.font.drawText(ctx, a.a.name, WIDTH / 2, y + 13, { align: 'center', color: '#ffffff' });
    }
    if (game.toast) {
      RF.font.drawText(ctx, game.toast.text, WIDTH - 6, HEIGHT - 12, { align: 'right', color: '#ffd030', outline: '#000' });
    }
    safely(() => RF.audio.update());
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
