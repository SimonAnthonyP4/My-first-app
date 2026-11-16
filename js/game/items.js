// ITEM DROPS (party mod): every so often something drops onto the stage. Walk into it to take it.
//   PIZZA          heals a quarter of your health
//   SODA           fills 40 of your meter
//   ENERGY DRINK   FIRED UP: 1.5x damage for 8 seconds
// Items drop in the middle of the stage, wait about ten seconds and then vanish. Training, tag
// matches and the story's scripted fights do not drop items.
(function () {
  const FIRST = 360, EVERY = [600, 900], LIFE = 660, MAX = 2, BOOST = 480;
  const KINDS = ['pizza', 'soda', 'energy'];
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  RF.itemsReset = (scene) => { scene.items = []; scene.itemT = FIRST; };

  RF.itemsTick = (scene) => {
    if (!RF.CONFIG.MOD_ITEMS || scene.phase !== 'fight' || scene.training || scene.tag || scene.opts.story) return;
    if (!scene.items) RF.itemsReset(scene);
    const b = scene.stageDef.bounds, floor = 0;
    if (--scene.itemT <= 0) {
      scene.itemT = EVERY[0] + Math.random() * (EVERY[1] - EVERY[0]);
      if (scene.items.length < MAX) {
        const kind = scene.fighters.some((f) => f.health < f.maxHealth * 0.5) && Math.random() < 0.45 ? 'pizza' : KINDS[(Math.random() * 3) | 0];
        scene.items.push({ kind, x: b.left + 60 + Math.random() * (b.right - b.left - 120), y: 190, vy: 0, t: 0 });
        RF.audio.sfx('whoosh');
      }
    }
    for (const f of scene.fighters) if (f.boostT > 0) f.boostT--;
    for (const it of scene.items) {
      it.t++;
      if (it.y > floor) { it.vy -= 0.35; it.y = Math.max(floor, it.y + it.vy); if (it.y === floor && it.vy < -2) { it.vy = -it.vy * 0.35; it.y = 0.5; scene.effects.spawn('dust', it.x, 1); } }
      for (const f of scene.fighters) {
        if (it.gone || f.health <= 0 || it.y > 26 || Math.abs(f.x - it.x) > 15 || f.y > 30) continue;
        it.gone = true;
        const txt = { pizza: ['PIZZA!', '#ffd040'], soda: ['SODA!', '#ff6060'], energy: ['FIRED UP!', '#60ff80'] }[it.kind];
        if (it.kind === 'pizza') f.health = Math.min(f.maxHealth, f.health + f.maxHealth * 0.25);
        else if (it.kind === 'soda') f.gainMeter(40);
        else f.boostT = BOOST;
        scene.effects.spawnText(txt[0], f.x, f.body.height + 22, txt[1]);
        RF.audio.sfx('select');
      }
    }
    scene.items = scene.items.filter((it) => !it.gone && it.t < LIFE);
  };

  // behind and in front of the fighters
  RF.drawItems = (scene, ctx, floorY) => {
    if (!scene.items) return;
    for (const it of scene.items) {
      if (it.t > LIFE - 120 && (it.t >> 3) % 2) continue;                    // blinks before it vanishes
      const x = Math.round(it.x), y = Math.round(floorY - it.y), bob = it.y <= 1 ? Math.round(Math.sin(it.t / 10) * 1.5) : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, floorY + 1, 7, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x, y - 2 + bob);
      const glow = ctx.createRadialGradient(0, -6, 1, 0, -6, 15); glow.addColorStop(0, 'rgba(255,255,200,0.45)'); glow.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = glow; ctx.fillRect(-16, -22, 32, 32);
      if (it.kind === 'pizza') {          // a slice
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(8, -12); ctx.lineTo(0, 2); ctx.fill();
        ctx.fillStyle = '#ffc840'; ctx.beginPath(); ctx.moveTo(-7, -11); ctx.lineTo(7, -11); ctx.lineTo(0, 0); ctx.fill();
        R(ctx, '#e8a020', -7, -13, 14, 3); R(ctx, '#d02020', -3, -8, 3, 3); R(ctx, '#d02020', 2, -6, 3, 3); R(ctx, '#d02020', -1, -3, 2, 2);
      } else if (it.kind === 'soda') {    // a cup with a straw
        R(ctx, '#111', -5, -13, 11, 15); R(ctx, '#e02828', -4, -12, 9, 13); R(ctx, '#f4f0e4', -4, -8, 9, 3);
        R(ctx, '#111', -6, -14, 13, 3); R(ctx, '#f4f0e4', -5, -14, 11, 1); R(ctx, '#fff', 1, -20, 2, 7); R(ctx, '#e02828', 1, -20, 5, 2);
      } else {                            // an energy drink can
        R(ctx, '#111', -4, -15, 9, 17); R(ctx, '#20c060', -3, -14, 7, 15); R(ctx, '#0a5a30', -3, -14, 2, 15); R(ctx, '#c8d0d8', -3, -14, 7, 2);
        R(ctx, '#ffe040', 0, -11, 2, 5); R(ctx, '#ffe040', -1, -7, 3, 2); R(ctx, '#ffe040', 0, -5, 2, 4);
      }
      ctx.restore();
    }
    for (const f of scene.fighters) {       // FIRED UP: flames at the feet
      if (!(f.boostT > 0) || f.health <= 0) continue;
      for (let i = 0; i < 6; i++) { const a = (scene.frame * 1.7 + i * 9) % 22; ctx.fillStyle = i % 2 ? '#ff9a20' : '#ffe040'; ctx.globalAlpha = Math.max(0, 1 - a / 22); ctx.fillRect(Math.round(f.x - 12 + i * 5), Math.round(floorY - f.y - 2 - a), 2, 3); }
      ctx.globalAlpha = 1;
    }
  };
})();
