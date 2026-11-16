// OLU (O Block, Chicago - and a divine being): guns that reach across the stage, a halo, a dash that is
// almost a teleport, and a finisher where the verdict is read from above. His Philly shell block is
// his poses (config/characters.js, using the 'shell' arm in the renderer).
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const GOLD = '#ffd75a', WHITE = '#fff6d0', VIOLET = '#9a6aff';
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  // ---- the guns: a flash at the muzzle and a golden tracer to the end of the hitbox ----
  Object.assign(RF.MOVE_FX, {
    gunshot(f, ctx, floorY) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup - 1 || t > m.startup + m.active + 5) return;
      const age = t - (m.startup - 1), reach = m.hitbox.x + m.hitbox.w, y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2, x0 = f.x + f.facing * 24;
      const a = Math.max(0, 1 - age / (m.active + 6));
      ctx.globalAlpha = a;
      ctx.fillStyle = GOLD; ctx.fillRect(Math.min(x0, x0 + f.facing * reach), Math.round(y) - 1, reach, 2);
      ctx.fillStyle = WHITE; ctx.fillRect(Math.min(x0, x0 + f.facing * reach), Math.round(y), reach, 1);
      if (age < 4) { ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(x0, y, 6 - age, 0, 7); ctx.fill(); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x0, y, 3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
  });
  RF.PROJECTILE_ART.divineBullet = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 7; i++) { ctx.globalAlpha = 0.6 - i * 0.08; R(ctx, i % 2 ? GOLD : VIOLET, x - dir * i * 8, y - 1, 7, 2); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(x, y, 8, 4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = WHITE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 11 + Math.sin(t / 2), 6, 0, 0, 7); ctx.stroke();
    R(ctx, '#ffffff', x - 3, y - 1, 6, 2);
  };
  RF.SPECIALS.divineBarrage = {
    name: 'Divine Barrage',
    description: 'Unloads both pistols. Every bullet is a star from some other universe. It crosses the whole stage and it is not slow.',
    kind: 'projectile',
    startup: 8,
    recovery: 14,
    speed: 12,
    size: 14,
    height: 0.62,
    damage: 13,
    hitstun: 28, blockstun: 14, pushback: 7, hitstop: 10,
    art: 'divineBullet', sound: 'boom', hitText: 'JUDGED!',
    colors: ['#ffffff', '#ffd75a', '#9a6aff'],
  };

  // ---- the finisher: the verdict ----
  RF.FINISHERS.judgment = {
    name: 'Final Judgment',
    duration: 240,
    update(att, vic, t, scene) {
      att.finisherAnim = t < 150 ? ['special', 1] : ['victory', (t >> 3) % 2];
      vic.y = t < 20 ? 0 : t < 160 ? Math.min(52, (t - 20) * 0.8) : Math.max(0, 52 - (t - 160) * 3);
      if (t === 6) { RF.audio.sfx('arcane'); scene.effects.spawnText('YOU ARE BEING WEIGHED.', att.x, att.body.height + 24, GOLD); }
      if (t === 70) scene.effects.spawnText('IN EVERY UNIVERSE.', att.x, att.body.height + 34, VIOLET);
      if (t >= 20 && t < 150 && t % 10 === 0) { RF.audio.sfx('boom'); scene.effects.spawn('zap', vic.x + (Math.random() - 0.5) * 24, 10 + Math.random() * vic.body.height); scene.shake = 4; }
      if (t === 160) { RF.audio.sfx('ko'); scene.flash = 10; scene.shake = 12; }
      if (t === 190) scene.effects.spawnText('GUILTY. ALL OF THEM.', att.x, att.body.height + 28, '#ffffff');
    },
    drawVictim(vic, ctx, floorY, t) {
      const x = Math.round(vic.x);
      if (t < 20) return vic.sprite.draw(ctx, 'dazed', 0, x, floorY, vic.facing);
      if (t < 160) {
        const lift = vic.y; ctx.save(); ctx.globalAlpha = 0.4;                      // a pillar of light from above
        const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(1, 'rgba(255,230,140,0.9)');
        ctx.fillStyle = g; ctx.fillRect(x - 16, 0, 32, floorY); ctx.restore();
        vic.sprite.draw(ctx, 'hit', (t >> 3) % 2, x + Math.round(Math.sin(t / 3) * 1.5), floorY - lift, vic.facing);
        return;
      }
      vic.sprite.draw(ctx, 'ko', 1, x, floorY - vic.y, vic.facing);
    },
  };

  // ---- drawn over the fighters: the halo, and the dash that leaves a line of him behind ----
  RF.drawDivine = (scene, ctx, floorY) => {
    for (const f of scene.fighters) {
      if (f.def.id !== 'olu' || f.hidden) continue;
      const t = scene.frame, top = floorY - f.y - f.body.height * (f.state === 'crouch' ? 0.62 : 1);
      f.trail = f.trail || [];
      if (f.state === 'dash' && f.trailT !== t) { f.trail.push({ x: f.x, y: f.y, face: f.facing, life: 9 }); f.trailT = t; }
      f.trail = f.trail.filter((g) => g.life > 0);
      for (const g of f.trail) { ctx.globalAlpha = g.life / 9 * 0.5; f.sprite.draw(ctx, 'walk', 1, Math.round(g.x), floorY - g.y, g.face, g.life % 2 ? GOLD : VIOLET); g.life -= 0.5; }
      ctx.globalAlpha = 1;
      const hx = f.x + f.facing * 1, hy = top - 5 + Math.sin(t / 14) * 1.5;               // the halo: a gold ring that breathes
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 9);
      const g = ctx.createRadialGradient(hx, hy, 2, hx, hy, 18); g.addColorStop(0, 'rgba(255,225,120,0.55)'); g.addColorStop(1, 'rgba(255,225,120,0)');
      ctx.fillStyle = g; ctx.fillRect(hx - 19, hy - 19, 38, 38); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hx, hy, 11, 3.2, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(hx, hy, 11, 3.2, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = WHITE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(hx, hy - 0.5, 11, 3.2, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const a = t / 20 + i * 2.1; R(ctx, i % 2 ? GOLD : VIOLET, f.x + Math.cos(a) * 14, top + f.body.height * 0.5 + Math.sin(a * 1.3) * 22, 1, 1); }   // motes
    }
  };
})();
