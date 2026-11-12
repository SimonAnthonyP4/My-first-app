// MR. URBANIK, the psychology teacher: everything he does, he does with his mind. His arms stay
// folded. This file has his powers; the hooks they need sit in fighter.js and fight-scene.js.
//
//   LONG RANGE   light and heavy are mind pushes that reach across most of the stage; his
//                special, MIND BREAK, reaches ALL of it (it cannot miss, only be blocked)
//   MADNESS      anything that lands from MIND BREAK scrambles the target's mind for 4 seconds:
//                left and right are swapped (RF.mirrorInput, used by Fighter.update)
//   TELEPATHIC   he never raises a guard: a psychic barrier takes the hit instead. No chip damage,
//   BLOCK        and every block feeds his meter (fighter.js: def.psychicBlock)
//   FORESIGHT    some hits simply do not happen: he has already stepped aside (fighter.js:
//                def.autoEvade, with a cooldown so it can't carry a whole match)
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const TEAL = '#40e8d0', VIOLET = '#b070ff';

  // left and right swapped (MADNESS)
  RF.mirrorInput = (inp) => {
    const sw = (a) => (a === 'left' ? 'right' : a === 'right' ? 'left' : a);
    return new Proxy(inp, { get(t, k) {
      const v = t[k];
      if (typeof v !== 'function') return v;
      return ['held', 'pressed', 'lastPress', 'consume'].includes(k) ? (a, ...r) => v.call(t, sw(a), ...r) : v.bind(t);
    } });
  };

  // ---- MIND BREAK: a hit across the whole stage ----
  RF.SPECIAL_KINDS.mindbreak = {
    start(f) { f.vx = 0; f.specialData.fired = false; },
    update(f, scene) {
      const s = f.special, t = f.stateTime, opp = scene.opponentOf(f), d = f.specialData;
      if (t === 1) { RF.audio.sfx('arcane'); scene.effects.spawnText(s.callout, f.x, f.body.height + 18, TEAL); }
      if (t === s.startup && opp.getHurtbox && opp.getHurtbox()) {
        d.fired = true; f.psy = { t: 0, tx: opp.x, ty: opp.y + opp.body.height * 0.85 };
        RF.audio.sfx('zap'); scene.flash = 4;
        scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, opp.body.height * 0.85);
        if (opp.state === 'hitstun' || opp.state === 'knockdown') { opp.madT = f.superActive ? 420 : 240; scene.effects.spawnText('MADNESS!', opp.x, opp.body.height + 28, VIOLET); }
      }
      if (t >= s.startup + s.recovery) f.setState('idle');
    },
    anim(f) { return ['special', f.stateTime < f.special.startup ? 0 : 1]; },
  };

  // ---- MIND PUSH / MIND CRUSH: a ring of force that travels out from his head ----
  Object.assign(RF.MOVE_FX, {
    psyPulse(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup - 4 || t > m.startup + m.active + 10) return;
      const reach = m.hitbox.x + m.hitbox.w, a = Math.max(0, t - m.startup + 4), x0 = f.x + f.facing * 8, y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      const x = x0 + f.facing * Math.min(reach, a * (reach / 7));
      ctx.globalAlpha = Math.max(0, 0.9 - a / 18);
      for (let i = 0; i < 3; i++) { const rr = 5 + i * 5 + a * 0.4; ctx.strokeStyle = i % 2 ? VIOLET : TEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rr * 0.55, rr, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.lineWidth = 1; ctx.globalAlpha = 1;
    },
  });
  RF.PROJECTILE_ART.psyBolt = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 6; i++) { ctx.globalAlpha = 0.5 - i * 0.07; R(ctx, i % 2 ? VIOLET : TEAL, x - dir * i * 7, y - 1 + Math.sin(t / 2 + i) * 2, 5, 2); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 4, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = VIOLET; ctx.beginPath(); ctx.ellipse(x, y, 7 + Math.sin(t / 3), 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    R(ctx, '#ffffff', x - 1, y - 1, 3, 3);
  };

  // ---- the finisher: a therapy session ----
  RF.FINISHERS.session = {
    name: 'Session Over',
    duration: 230,
    update(att, vic, t, scene) {
      att.finisherAnim = t < 150 ? ['special', 1] : ['victory', (t >> 3) % 2];
      vic.y = t < 20 ? 0 : t < 150 ? Math.min(46, (t - 20) * 0.9) : Math.max(0, 46 - (t - 150) * 3);
      if (t === 6) { RF.audio.sfx('arcane'); scene.effects.spawnText('TELL ME ABOUT YOUR MOTHER.', att.x, att.body.height + 24, TEAL); }
      if (t === 70) scene.effects.spawnText('...AND YOUR FATHER.', att.x, att.body.height + 34, VIOLET);
      if (t === 120) { scene.effects.spawnText('INTERESTING.', att.x, att.body.height + 24, '#ffffff'); RF.audio.sfx('zap'); }
      if (t >= 20 && t < 150 && t % 9 === 0) scene.effects.spawn('zap', vic.x + (Math.random() - 0.5) * 20, 10 + Math.random() * vic.body.height);
      if (t === 150) { RF.audio.sfx('ko'); scene.flash = 8; scene.shake = 10; }
      if (t === 185) scene.effects.spawnText('OUR TIME IS UP.', att.x, att.body.height + 28, '#ffffff');
    },
    drawVictim(vic, ctx, floorY, t, frame) {
      const x = Math.round(vic.x);
      if (t < 20) return vic.sprite.draw(ctx, 'dazed', 0, x, floorY, vic.facing);
      if (t < 150) {
        ctx.save(); ctx.translate(x, Math.round(floorY - vic.y - vic.body.height * 0.5)); ctx.rotate(Math.sin(t / 9) * 0.5 + t * 0.02);
        vic.sprite.draw(ctx, 'hit', 0, 0, vic.body.height * 0.5, vic.facing); ctx.restore();
        for (let i = 0; i < 3; i++) { const a = t / 8 + i * 2.1; ctx.fillStyle = i % 2 ? VIOLET : TEAL; T(ctx, '?', x + Math.cos(a) * 20 - 2, floorY - vic.y - vic.body.height - 6 + Math.sin(a) * 5, { color: i % 2 ? VIOLET : TEAL, outline: '#000' }); }
        return;
      }
      vic.sprite.draw(ctx, 'ko', 1, x, floorY - vic.y, vic.facing);
    },
  };

  // ---- drawn over the fighters: glowing eyes, the barrier, the beam, madness, foresight ----
  RF.drawMind = (scene, ctx, floorY) => {
    for (const f of scene.fighters) {
      if (f.def.id === 'urbanik' && !f.hidden && !(f.dismembered)) {
        const eyeY = floorY - f.y - f.body.height * (f.state === 'crouch' ? 0.62 : 0.93), eyeX = f.x + f.facing * 2;
        const active = ['attack', 'special', 'block', 'blockstun', 'finishing', 'throwing'].includes(f.state) || f.evadeFx > 0;
        if (active) {
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(scene.frame / 2);
          const g = ctx.createRadialGradient(eyeX, eyeY, 1, eyeX, eyeY, 13); g.addColorStop(0, 'rgba(120,255,240,0.7)'); g.addColorStop(1, 'rgba(120,255,240,0)');
          ctx.fillStyle = g; ctx.fillRect(eyeX - 14, eyeY - 14, 28, 28); ctx.globalAlpha = 1;
          R(ctx, '#e8fffb', eyeX - 3 + (f.facing > 0 ? 2 : -1), eyeY - 1, 2, 2); R(ctx, '#e8fffb', eyeX + 1 + (f.facing > 0 ? 2 : -1), eyeY - 1, 2, 2);
        }
        // the telepathic barrier: a bubble of rings in front of him instead of a raised guard
        if (f.state === 'block' || f.state === 'blockstun') {
          const k = f.shieldHit > 0 ? f.shieldHit / 12 : 0, cx = f.x + f.facing * 14, cy = floorY - f.y - f.body.height * 0.5, r = f.body.height * 0.58;
          ctx.globalAlpha = 0.28 + 0.4 * k;
          const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r); g.addColorStop(0, 'rgba(120,255,240,0)'); g.addColorStop(1, k > 0.4 ? 'rgba(255,255,255,0.9)' : 'rgba(120,200,255,0.8)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.62, r, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = TEAL; ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.62, r, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (f.psy) { // MIND BREAK's beam: a jagged line from his eyes to theirs
          f.psy.t++;
          if (f.psy.t > 18) f.psy = null;
          else {
            const x1 = eyeX + f.facing * 3, x2 = f.psy.tx, y2 = floorY - f.psy.ty, n = 18;
            for (const [col, w] of [[VIOLET, 5], [TEAL, 3], ['#ffffff', 1]]) {
              ctx.globalAlpha = 1 - f.psy.t / 18; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, eyeY);
              for (let i = 1; i <= n; i++) ctx.lineTo(x1 + (x2 - x1) * i / n, eyeY + (y2 - eyeY) * i / n + (i < n ? (Math.random() - 0.5) * 8 : 0));
              ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.lineWidth = 1;
          }
        }
      }
      if (f.evadeFx > 0) { // FORESIGHT: where he was, fading
        f.evadeFx--; ctx.globalAlpha = f.evadeFx / 18 * 0.45;
        if (f.evadeFrom != null) f.sprite.draw(ctx, 'idle', 0, f.evadeFrom, floorY - f.y, f.facing, TEAL);
        ctx.globalAlpha = 1;
      }
      if (f.madT > 0) { // MADNESS: stars and question marks spinning round the head
        for (let i = 0; i < 4; i++) {
          const a = scene.frame / 7 + i * 1.57, x = f.x + Math.cos(a) * 13, y = floorY - f.y - f.body.height - 4 + Math.sin(a) * 4;
          T(ctx, i % 2 ? '?' : '*', Math.round(x) - 2, Math.round(y), { color: i % 2 ? VIOLET : TEAL, outline: '#000' });
        }
        if (f.madT < 60 && (scene.frame >> 2) % 2) T(ctx, 'CLEARING...', f.x, floorY - f.y - f.body.height - 16, { align: 'center', color: '#a89490', outline: '#000' });
      }
    }
  };
})();
