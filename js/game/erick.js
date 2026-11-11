// ERICK (Regal Kendall Village): the popcorn barrage art, his finisher NOW SHOWING, and the
// small hooks his W RIZZ needs. (His stage is stages/regal.js.)
(function () {
  const T = (...a) => RF.font.drawText(...a);

  // POPCORN BARRAGE: a spinning, buttery cloud of kernels.
  RF.PROJECTILE_ART.popcorn = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 4; i++) { ctx.fillStyle = `rgba(255,232,140,${0.45 - i * 0.09})`; ctx.fillRect(Math.round(x - dir * i * 7), Math.round(y - 2 + Math.sin(t / 2 + i) * 3), 4, 3); }
    for (let k = 0; k < 7; k++) {
      const a = t * 0.35 + k * 0.9, px = Math.round(x + Math.cos(a) * 8), py = Math.round(y + Math.sin(a * 1.3) * 7);
      ctx.fillStyle = '#3a2a10'; ctx.fillRect(px - 2, py - 2, 5, 5);
      ctx.fillStyle = k % 2 ? '#fff4c8' : '#ffe27a'; ctx.fillRect(px - 1, py - 1, 3, 3);
      ctx.fillStyle = '#f0b030'; ctx.fillRect(px, py + 1, 1, 1);
    }
  };

  // NOW SHOWING: the opponent becomes a movie poster... and is torn in half. NO REFUNDS.
  const poster = (ctx, x, bottom, vic, t, alpha) => {
    const w = 44, h = 66, l = Math.round(x - w / 2), top = bottom - h;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#111'; ctx.fillRect(l - 2, top - 2, w + 4, h + 4);
    const g = ctx.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, '#2a0a4a'); g.addColorStop(0.6, '#a01c3c'); g.addColorStop(1, '#ff9a30');
    ctx.fillStyle = g; ctx.fillRect(l, top, w, h);
    T(ctx, 'NOW', x, top + 3, { align: 'center', color: '#ffe27a', outline: '#000' }); T(ctx, 'SHOWING', x, top + 11, { align: 'center', color: '#ffffff', outline: '#000' });
    ctx.save(); ctx.beginPath(); ctx.rect(l, top + 20, w, h - 20); ctx.clip();
    ctx.translate(x, bottom - 2); ctx.scale(0.52, 0.52); vic.sprite.draw(ctx, 'hit', 0, 0, 0, vic.facing); ctx.restore();
    ctx.restore();
  };
  RF.FINISHERS.nowShowing = {
    name: 'Now Showing',
    duration: 210,
    update(att, vic, t, scene) {
      att.finisherAnim = t < 20 ? ['taunt', 0] : t < 130 ? ['special', 1] : ['victory', (t >> 3) % 2];
      if (t === 6) scene.effects.spawnText('ONE TICKET TO... THE END.', att.x, att.body.height + 24, '#ffe27a');
      if (t === 30) { RF.audio.sfx('super'); scene.flash = 8; scene.shake = 8; }
      if (t === 80) scene.effects.spawnText('NOW SHOWING!', att.x, att.body.height + 34, '#ff7ac8');
      if (t === 130) { RF.audio.sfx('paper'); RF.audio.sfx('heavy'); scene.shake = 14; scene.flash = 4; }
      if (t === 150) scene.effects.spawnText('NO REFUNDS.', att.x, att.body.height + 26, '#ffffff');
      if (t === 175) RF.audio.sfx('applause');
    },
    drawVictim(vic, ctx, floorY, t, frame) {
      if (t < 30) return vic.sprite.draw(ctx, 'dazed', 0, vic.x, floorY, vic.facing);
      if (t < 130) { // a projector beam, and the poster rising on its light box
        if (t < 50) { ctx.fillStyle = `rgba(255,240,180,${0.35 * (1 - (t - 30) / 20)})`; ctx.fillRect(Math.round(vic.x - 20), 0, 40, Math.round(floorY)); }
        return poster(ctx, vic.x, floorY - 6 + Math.sin(t / 10) * 1.5, vic, t, 1);
      }
      const u = Math.min(1, (t - 130) / 30);                                 // torn: the two halves fall away
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(vic.x + side * u * 14, floorY - 6 + u * 4); ctx.rotate(side * u * 0.5); ctx.translate(-vic.x, -(floorY - 6));
        ctx.beginPath(); ctx.rect(side < 0 ? vic.x - 60 : vic.x, -400, 60, 800); ctx.clip();   // each half of the same poster
        poster(ctx, vic.x, floorY - 6, vic, t, 1 - Math.max(0, (t - 170) / 40) * 0.6);
        ctx.restore();
      }
    },
  };
})();
