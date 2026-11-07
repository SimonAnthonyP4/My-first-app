// Behaviour for each special-move `kind` (numbers live in config/specials.js).
// A kind implements:
//   start(f, scene)         called once when the special begins
//   update(f, scene)        every frame while f.state === 'special'
//   onLand(f, scene)        optional, when the user touches the floor
//   anim(f) -> [anim, frame]
// Use scene.applyHit(...) to deal damage and scene.spawnProjectile(...) to shoot.
(function () {
  const { clamp } = RF.util;

  // Converts special config into the move format used by scene.applyHit.
  // A super (full meter, LIGHT + HEAVY) powers the special up.
  RF.specialMove = (f, s) => ({
    damage: s.damage * f.stats.damage * (f.superActive ? RF.CONFIG.SUPER_DAMAGE : f.exActive ? RF.CONFIG.EX_DAMAGE : 1),
    tag: f.superActive ? 'super' : f.exActive ? 'ex' : 'special', // for combo trials
    hitstun: s.hitstun, blockstun: s.blockstun, pushback: s.pushback, hitstop: s.hitstop,
    launch: s.launch || 0,
    special: true,
  });

  RF.SPECIAL_KINDS = {
    projectile: {
      start(f) { f.vx = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime;
        if (t === s.startup) scene.spawnProjectile(f, s);
        if (t >= s.startup + s.recovery) f.setState('idle');
      },
      anim(f) {
        const t = f.stateTime, s = f.special;
        return ['special', t < s.startup ? 0 : 1];
      },
    },

    // Alejandro: BELAY YANK - throws a rope with a grappling hook across the screen; if it
    // catches them, it yanks them right in front of him for a follow-up.
    grapple: {
      start(f) { f.vx = 0; f.specialData.len = 0; f.specialData.caught = null; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
        if (t === s.startup) RF.audio.sfx('whoosh');
        if (t >= s.startup && !d.caught && !d.back) {
          d.len = Math.min(s.range, d.len + s.speed);
          const tip = f.x + f.facing * (12 + d.len), ty = f.y + f.body.height * 0.6;
          if (Math.abs(opp.x - tip) < opp.body.width / 2 + 4 && ty > opp.y && ty < opp.y + opp.body.height && !opp.isKO && !['finished', 'thrown'].includes(opp.state)) {
            const r = scene.applyHit(f, opp, RF.specialMove(f, s), 'hit', tip, ty);
            d.back = true; // one catch per throw
            if (r === 'hit') { d.caught = opp; RF.audio.sfx('clang'); scene.effects.spawnText('GOT YOU!', f.x, f.body.height + 18, '#ff8030'); }
          }
          if (d.len >= s.range) d.back = true;
        }
        if (d.back && !d.caught) d.len = Math.max(0, d.len - s.speed * 1.5);
        if (d.caught) { // reel them in
          const want = f.x + f.facing * (f.body.width / 2 + d.caught.body.width / 2 + 6);
          d.caught.x += (want - d.caught.x) * 0.3; d.caught.y = Math.max(0, d.caught.y * 0.7);
          d.caught.stun = Math.max(d.caught.stun, 16); d.len = Math.abs(d.caught.x - f.x) - 12;
          if (Math.abs(d.caught.x - want) < 2 || t > s.startup + 50) { d.caught = null; d.done = t; d.len = 0; }
        }
        const end = d.done ? d.done + 4 : (d.back && !d.caught && d.len <= 0 ? t : null);
        if (end != null && t >= end + s.recovery * 0.3) f.setState('idle');
        if (t > s.startup + 120) f.setState('idle');
      },
      anim(f) { return ['special', f.stateTime < f.special.startup ? 0 : 1]; },
      draw(f, ctx, floorY) {
        const d = f.specialData;
        if (!d.len) return;
        const hx = f.x + f.facing * 12, y = Math.round(floorY - f.y - f.body.height * 0.6), tip = hx + f.facing * d.len;
        ctx.strokeStyle = '#e07030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, y);
        ctx.quadraticCurveTo((hx + tip) / 2, y + 6, tip, y); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = '#111'; ctx.fillRect(Math.round(tip) - 3, y - 4, 7, 8);
        ctx.fillStyle = '#c8c8d0'; ctx.fillRect(Math.round(tip) - 2, y - 3, 5, 6); // the carabiner/hook
        ctx.fillStyle = '#111'; ctx.fillRect(Math.round(tip) - 1, y - 1, 3, 2);
      },
    },

    // Lopez Tuero: RIEMANN SUM - a row of glowing rectangles (a Riemann sum under the curve)
    // erupts from the floor under the opponent, one after another; the last one launches.
    riemann: {
      start(f) { f.vx = 0; f.specialData.tx = null; f.specialData.hitBars = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
        if (t === s.startup) { d.tx = opp.x; RF.audio.sfx('zap'); scene.effects.spawnText('RIEMANN SUM!', f.x, f.body.height + 18, '#00ffd0'); }
        if (d.tx == null) return;
        for (let i = 0; i < s.bars; i++) {
          if (t !== s.startup + 6 + i * s.interval) continue;
          const bx = d.tx + f.facing * (i - (s.bars - 1) / 2) * 11, h = s.barHeight + i * 5;
          RF.audio.sfx(i === s.bars - 1 ? 'heavy' : 'move');
          if (Math.abs(opp.x - bx) < 8 + opp.body.width / 2 && opp.y < h && !opp.isKO) {
            const last = i === s.bars - 1, mv = RF.specialMove(f, s);
            scene.applyHit(f, opp, last ? Object.assign({}, mv, { damage: s.finalDamage * f.stats.damage, launch: 7, hitstun: 30 }) : mv, last ? 'heavy' : 'hit', opp.x, Math.min(h, 40));
          }
        }
        if (t === s.startup + 6 + (s.bars - 1) * s.interval + 4) scene.effects.spawnText('Σ = YOU LOSE.', d.tx, 120, '#00ffd0');
        if (t >= s.startup + 6 + s.bars * s.interval + s.recovery) f.setState('idle');
      },
      anim(f) { const t = f.stateTime, s = f.special; return t < s.startup ? ['special', 0] : ['victory', 0]; },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (d.tx == null) return;
        // the curve they're summing under
        ctx.strokeStyle = 'rgba(0,255,208,0.55)'; ctx.beginPath();
        for (let k = -45; k <= 45; k += 3) { const x = d.tx + k, y = floorY - (s.barHeight + 18) - Math.cos(k / 30) * 14 + (k * f.facing) * 0.25; k === -45 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
        for (let i = 0; i < s.bars; i++) {
          const t0 = s.startup + 6 + i * s.interval, a = t - t0;
          if (a < -4 || a > 22) continue;
          const bx = Math.round(d.tx + f.facing * (i - (s.bars - 1) / 2) * 11), full = s.barHeight + i * 5;
          const h = a < 0 ? 2 : a < 4 ? full * (a / 4) : a > 14 ? full * Math.max(0, 1 - (a - 14) / 8) : full;
          ctx.fillStyle = '#05302a'; ctx.fillRect(bx - 6, floorY - h - 1, 12, h + 1);
          ctx.fillStyle = i % 2 ? '#00ffd0' : '#00b0a0'; ctx.fillRect(bx - 5, Math.round(floorY - h), 10, Math.round(h));
          ctx.fillStyle = '#e0fff8'; ctx.fillRect(bx - 5, Math.round(floorY - h), 10, 1);
        }
      },
    },

    // Wuttke: GRAND PIANO - conducts a grand piano out of the sky onto them. A shadow
    // warns where it lands; it smashes into a shower of keys.
    pianoDrop: {
      start(f, scene) { f.vx = 0; f.specialData.tx = null; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
        if (t === 4) { d.tx = opp.x; RF.audio.sfx('whoosh'); scene.effects.spawnText('FORTISSIMO!', f.x, f.body.height + 18, '#c080ff'); }
        if (t === s.startup + s.fall) { // impact
          d.landed = t;
          scene.shake = Math.max(scene.shake, 14); RF.audio.sfx('boom'); RF.audio.sfx('clang');
          if (Math.abs(opp.x - d.tx) < s.width / 2 + opp.body.width / 2 && opp.y < 60) scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, 30);
          scene.effects.spawnText('PLONK!', d.tx, 70, '#ffffff');
          scene.effects.spawn('dust', d.tx - 16, 1); scene.effects.spawn('dust', d.tx + 16, 1);
        }
        if (t >= s.startup + s.fall + s.recovery) f.setState('idle');
      },
      anim(f) { const t = f.stateTime, s = f.special; return t < s.startup + s.fall ? ['victory', (t >> 3) % 2] : ['special', 1]; },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (d.tx == null) return;
        const u = Math.min(1, (t - 4) / (s.startup + s.fall - 4)), x = d.tx;
        if (!d.landed) { // shadow growing on the floor
          ctx.fillStyle = `rgba(0,0,0,${0.2 + u * 0.4})`;
          ctx.beginPath(); ctx.ellipse(x, floorY, 10 + u * 16, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
        const y = d.landed ? floorY : floorY - (1 - u * u) * 220, age = d.landed ? t - d.landed : 0;
        if (age > 16) return;
        RF.drawGrandPiano(ctx, x, y, age > 8 ? (age - 8) / 8 : 0);
      },
    },

    // Gabriel: MIND SLAM - telekinesis. Grabs them from across the screen with his mind,
    // lifts them into the air, then slams them into the floor. Blocking breaks the grip.
    telekinesis: {
      start(f) { f.vx = 0; f.specialData.target = null; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
        if (t === s.startup) {
          const dist = Math.abs(opp.x - f.x), ok = !opp.isKO && !['finished', 'thrown', 'ko', 'knockdown'].includes(opp.state);
          if (dist <= s.range && ok && !opp.isBlockingAgainst(f, RF.specialMove(f, s))) {
            d.target = opp; RF.audio.sfx('arcane');
            scene.effects.spawnText(s.callout, f.x, f.body.height + 18, s.color);
          } else if (dist <= s.range && ok) { scene.effects.spawnText('MIND BLOCKED', opp.x, opp.body.height + 10, '#ffffff'); RF.audio.sfx('shield'); }
        }
        const tg = d.target;
        if (tg) {
          const u = t - s.startup;
          if (u < s.lift) { // floating, helpless, drifting toward him
            tg.state = null; tg.setState('hitstun'); tg.stun = 30; tg.vx = tg.vy = 0; tg.pushVx = 0;
            tg.y = Math.min(s.height, u * 3);
            tg.x += (f.x + f.facing * 70 - tg.x) * 0.04;
          } else if (u === s.lift) { // SLAM
            scene.applyHit(f, tg, RF.specialMove(f, s), 'heavy', tg.x, tg.y + tg.body.height / 2);
            tg.vy = -12;
            scene.shake = Math.max(scene.shake, 12); RF.audio.sfx('boom');
            d.target = null;
          }
        }
        if (t >= s.startup + s.lift + s.recovery) f.setState('idle');
      },
      anim(f) { const t = f.stateTime, s = f.special; return t < s.startup ? ['special', 0] : t < s.startup + s.lift ? ['block', 0] : ['special', 1]; },
      draw(f, ctx, floorY, frame) {
        const tg = f.specialData.target, s = f.special;
        if (f.stateTime < s.startup) { // charging: a cyan glow around his hand
          ctx.fillStyle = `rgba(64,232,255,${0.3 + 0.2 * Math.sin(frame / 2)})`;
          ctx.beginPath(); ctx.arc(f.x + f.facing * 18, floorY - f.y - 62, 6 + (frame % 4), 0, Math.PI * 2); ctx.fill();
        }
        if (!tg) return;
        const hx = f.x + f.facing * 18, hy = floorY - f.y - 62, tx = tg.x, ty = floorY - tg.y - tg.body.height / 2;
        ctx.strokeStyle = '#40e8ff'; ctx.globalAlpha = 0.7;
        for (let i = 0; i < 3; i++) { // wavy psychic beams from hand to target
          ctx.beginPath(); ctx.moveTo(hx, hy);
          for (let k = 1; k <= 8; k++) { const u = k / 8; ctx.lineTo(hx + (tx - hx) * u, hy + (ty - hy) * u + Math.sin(frame / 2 + k + i * 2) * 4); }
          ctx.stroke();
        }
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#40e8ff';
        ctx.beginPath(); ctx.ellipse(tx, ty, tg.body.width * 0.9, tg.body.height * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      },
    },

    // Tyler: HOLE IN ONE - tees the ball up, waggles three times, FORE!, then drives it.
    teeShot: {
      start(f) { f.vx = 0; f.specialData.teeX = f.x + f.facing * 20; },
      update(f, scene) {
        const s = f.special, t = f.stateTime;
        if (t === 2 || t === 7) RF.audio.sfx('move');                   // waggle... waggle...
        if (t === s.startup - 6) scene.effects.spawnText('FORE!', f.x, f.body.height + 18, '#ffffff');
        if (t === s.startup) { scene.spawnProjectile(f, s); RF.audio.sfx('heavy'); }
        if (t >= s.startup + s.recovery) f.setState('idle');
      },
      anim(f) {
        const t = f.stateTime, s = f.special;
        if (t < s.startup - 8) return ['light', (t >> 2) % 2 ? 0 : 2];  // the waggle
        if (t < s.startup) return ['special', 0];                       // backswing
        return ['special', t < s.startup + 8 ? 1 : 2];                  // and through
      },
      draw(f, ctx, floorY) {
        const t = f.stateTime, s = f.special;
        if (t >= s.startup) return;
        const x = Math.round(f.specialData.teeX);
        ctx.fillStyle = '#e8d8a0'; ctx.fillRect(x, floorY - 4, 1, 4);            // the tee
        ctx.fillStyle = '#111'; ctx.fillRect(x - 2, floorY - 8, 5, 5);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, floorY - 7, 3, 3);        // the ball
      },
    },

    // Nicholas: PROBLEM SET - sprint in, a doubling flurry of punches, an exponential uppercut.
    punchRush: {
      start(f) { f.vx = 0; f.specialData.phase = 'wind'; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
        const gap = Math.abs(opp.x - f.x) - (f.body.width + opp.body.width) / 2;
        if (d.phase === 'wind' && t >= s.startup) { d.phase = 'dash'; d.t0 = t; RF.audio.sfx('whoosh'); }
        if (d.phase === 'dash') {
          f.vx = f.facing * s.speed;
          if (t % 3 === 0) scene.effects.spawn('dust', f.x - f.facing * 8, 1);
          if (gap < 6 || t - d.t0 > s.dash) { f.vx = 0; d.phase = 'punch'; d.t0 = t; d.n = 0; }
        }
        if (d.phase === 'punch') {
          f.vx = 0;
          const k = t - d.t0;
          if (k % s.interval === 0 && d.n < s.punches) {
            d.n++;
            if (opp.getHurtbox() && gap < 22) {
              scene.applyHit(f, opp, RF.specialMove(f, s), 'hit', opp.x - f.facing * 6, opp.body.height * (0.5 + (d.n % 2) * 0.15));
              scene.effects.spawnText(String(Math.pow(2, d.n - 1)), opp.x + (d.n % 2 ? -8 : 8), opp.body.height + 4 + d.n * 3, '#ffd030');
            }
          }
          if (k === s.punches * s.interval + 6) {
            const mv = RF.specialMove(f, s); mv.damage = s.finalDamage * f.stats.damage * (f.superActive ? RF.CONFIG.SUPER_DAMAGE : f.exActive ? RF.CONFIG.EX_DAMAGE : 1); mv.launch = 8; mv.hitstun = 34; mv.hitstop = 12;
            if (opp.getHurtbox() && gap < 26) { scene.applyHit(f, opp, mv, 'heavy', opp.x, opp.body.height * 0.7); scene.effects.spawnText('EXPONENTIAL!', opp.x, opp.body.height + 34, '#ff4040'); }
            d.phase = 'recover'; d.t0 = t;
          }
        }
        if (d.phase === 'recover' && t - d.t0 >= s.recovery) f.setState('idle');
        if (t > 200) f.setState('idle');
      },
      anim(f) {
        const d = f.specialData, t = f.stateTime;
        if (d.phase === 'wind') return ['crouch', 0];
        if (d.phase === 'dash') return ['walk', (t >> 1) % 4];
        if (d.phase === 'punch') return [(t >> 2) % 2 ? 'light' : 'heavy', 1];
        return ['uppercut', 1];
      },
    },

    // Ruano: DIVINE TOUCH - clouds part, a painted hand from the heavens touches the opponent.
    heavenHand: {
      start(f, scene) { f.vx = 0; f.specialData.tx = scene.opponentOf(f).x; RF.audio.sfx('bell'); },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
        if (t < s.startup) d.tx += (opp.x - d.tx) * 0.12; // the light follows them while the clouds open
        if (t === s.startup + s.reach) {
          scene.flash = 8; scene.shake = 10; RF.audio.sfx('perfect'); RF.audio.sfx('boom');
          if (opp.getHurtbox() && Math.abs(opp.x - d.tx) < opp.body.width / 2 + 14) scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', d.tx, opp.body.height * 0.8);
        }
        if (t >= s.startup + s.reach + s.recovery) f.setState('idle');
      },
      anim(f) { return ['throw', 1]; }, // arms raised to the sky
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime, d = f.specialData, x = Math.round(d.tx);
        const open = Math.min(1, t / s.startup), end = s.startup + s.reach + s.recovery, fade = t > end - 12 ? (end - t) / 12 : 1;
        ctx.save(); ctx.globalAlpha = Math.max(0, fade);
        ctx.fillStyle = `rgba(255,245,200,${0.35 * open})`; ctx.fillRect(x - 18 * open, 0, 36 * open, floorY); // beam of light
        for (let i = 0; i < 8; i++) { // clouds
          const cx = x + (i - 3.5) * 14 * (0.6 + open * 0.6), cy = 18 + (i % 2) * 6;
          ctx.fillStyle = '#f4f0f8'; ctx.beginPath(); ctx.arc(cx, cy, 10 + (i % 3) * 3, 0, Math.PI * 2); ctx.fill();
        }
        if (t >= s.startup) { // the hand, reaching down with one finger
          const u = Math.min(1, (t - s.startup) / s.reach), hy = 20 + (floorY - 120) * u;
          ctx.fillStyle = '#111'; ctx.fillRect(x - 9, 0, 18, hy + 1);
          ctx.fillStyle = '#f0c8a8'; ctx.fillRect(x - 8, 0, 16, hy);       // arm
          ctx.fillStyle = '#e8b890'; ctx.fillRect(x - 8, hy - 14, 16, 14);  // hand
          ctx.fillStyle = '#111'; ctx.fillRect(x - 2, hy, 5, 22);
          ctx.fillStyle = '#f0c8a8'; ctx.fillRect(x - 1, hy, 3, 21);        // the finger
          if (t >= s.startup + s.reach && t < s.startup + s.reach + 10) { // the spark of creation
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, hy + 24, 10 - (t - s.startup - s.reach), 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.restore();
        if (t >= s.startup && t < s.startup + 40) RF.font.drawText(ctx, 'DIVINE TOUCH', RF.CONFIG.WIDTH / 2, 50, { scale: 2, align: 'center', outline: '#000',
          color: ['#ffffff', '#fffbe0', '#fff2a0', '#ffe680', '#ffd040', '#e8b420', '#c8961e'] });
      },
    },

    // ---------- command-special kinds (js/config/commands.js) ----------

    // RUSH: charges forward and hits whatever is in front (shoulder charges, flying elbows...).
    rush: {
      start(f) { f.vx = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (t === s.startup) { f.vx = f.facing * s.speed; if (s.hop) f.vy = s.hop; RF.audio.sfx(s.sound || 'whoosh'); scene.effects.spawn('dust', f.x - f.facing * 8, 1); }
        if (t >= s.startup && t < s.startup + s.duration && !d.hit) {
          const opp = scene.opponentOf(f), hurt = opp.getHurtbox();
          const box = { x: f.facing > 0 ? f.x : f.x - f.body.width / 2 - s.reach, y: f.y + f.body.height * 0.2, w: f.body.width / 2 + s.reach, h: f.body.height * 0.7 };
          if (hurt && RF.util.rectsOverlap(box, hurt)) {
            d.hit = true; f.vx *= 0.2;
            scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', f.x + f.facing * f.body.width / 2, f.body.height * 0.5);
          }
        }
        if (t === s.startup + s.duration && f.grounded) f.vx = 0;
        if (t >= s.startup + s.duration && f.grounded) f.vx *= 0.7;
        if (t >= s.startup + s.duration + s.recovery && f.grounded) f.setState('idle');
      },
      anim(f) { const s = f.special; return f.stateTime < s.startup ? ['crouch', 0] : [s.anim || 'light', 1]; },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime;
        if (t < s.startup || t > s.startup + s.duration) return;
        const y0 = floorY - f.y - f.body.height * 0.55;
        for (let i = 0; i < 7; i++) { // speed streaks in the move's colour
          ctx.fillStyle = s.color || '#ffffff'; ctx.globalAlpha = 0.7 - i * 0.09;
          ctx.fillRect(Math.round(f.x - f.facing * (10 + i * 8)), Math.round(y0 - 16 + ((i * 13 + frame) % 32)), 7, 2);
        }
        ctx.globalAlpha = 1;
      },
    },

    // TELEPORT: vanish in a puff and reappear on the other side of the opponent,
    // optionally striking as you arrive.
    teleport: {
      start(f) { f.vx = 0; RF.audio.sfx(f.special.sound || 'whoosh'); },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
        if (t === s.startup) {
          d.from = f.x;
          const b = scene.stageDef.bounds, dir = Math.sign(opp.x - f.x) || f.facing;
          let x = s.behind ? opp.x + dir * (opp.body.width / 2 + f.body.width / 2 + 6) : opp.x - dir * (opp.body.width / 2 + f.body.width / 2 + 10);
          if (x < b.left + f.body.width / 2 || x > b.right - f.body.width / 2) x = opp.x - dir * (opp.body.width / 2 + f.body.width / 2 + 6); // no room: land in front
          f.x = x; f.y = 0; f.hidden = true; d.at = x;
        }
        if (t === s.startup + 6) { f.hidden = false; f.faceOpponent(opp); scene.effects.spawn('dust', f.x, 1); }
        if (s.damage && t === s.startup + 6 + (s.strikeDelay || 4) && !d.hit) {
          const hurt = opp.getHurtbox();
          if (hurt && Math.abs(opp.x - f.x) < f.body.width / 2 + opp.body.width / 2 + (s.reach || 18)) {
            d.hit = true; scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', (f.x + opp.x) / 2, f.body.height * 0.55);
          }
        }
        if (t >= s.startup + 6 + (s.strikeDelay || 4) + s.recovery) { f.hidden = false; f.setState('idle'); }
      },
      anim(f) { const s = f.special, t = f.stateTime; return t < s.startup ? ['crouch', 0] : t < s.startup + 6 + (s.strikeDelay || 4) ? ['idle', 0] : [s.anim || 'light', 1]; },
      draw(f, ctx, floorY, frame) { // a puff where you left and where you arrive
        const s = f.special, t = f.stateTime, d = f.specialData;
        const puff = (x, age) => { if (age < 0 || age > 16) return;
          for (let i = 0; i < 10; i++) { const a = i * 0.63, r = 4 + age * 1.2;
            ctx.fillStyle = s.color || '#c0c0c0'; ctx.globalAlpha = 1 - age / 16;
            ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(floorY - f.body.height / 2 + Math.sin(a) * r * 1.6), 3, 3); }
          ctx.globalAlpha = 1; };
        if (t < s.startup) puff(f.x, t);
        if (d.from != null) { puff(d.from, t - s.startup); puff(d.at, t - s.startup - 4); }
        if (t >= s.startup && t < s.startup + 20 && s.callout) RF.font.drawText(ctx, s.callout, d.at ?? f.x, floorY - f.body.height - 22, { align: 'center', color: s.color || '#fff', outline: '#000' });
      },
    },

    // RISING: an anti-air that launches upward (briefly untouchable at the start).
    rising: {
      start(f) { f.vx = 0; f.specialData.landedAt = null; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (t === s.startup) { f.vy = s.rise; f.vx = f.facing * (s.forward || 1); RF.audio.sfx(s.sound || 'whoosh'); }
        if (t >= s.startup && !d.hit && f.vy > -2) {
          const opp = scene.opponentOf(f), hurt = opp.getHurtbox();
          const box = { x: f.facing > 0 ? f.x - 4 : f.x - f.body.width / 2 - s.reach, y: f.y + f.body.height * 0.4, w: f.body.width / 2 + s.reach + 4, h: f.body.height * 0.9 };
          if (hurt && RF.util.rectsOverlap(box, hurt)) { d.hit = true; scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, opp.y + opp.body.height * 0.6); }
        }
        if (d.landedAt != null && t - d.landedAt >= s.recovery) f.setState('idle');
        if (t > 150) f.setState('idle');
      },
      onLand(f) { if (f.specialData.landedAt == null && f.stateTime > f.special.startup + 2) { f.specialData.landedAt = f.stateTime; f.vx = 0; } },
      anim(f) { return f.stateTime < f.special.startup ? ['crouch', 0] : f.specialData.landedAt != null ? ['crouch', 0] : ['uppercut', 1]; },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime;
        if (t < s.startup || f.specialData.landedAt != null) return;
        for (let i = 0; i < 6; i++) { // a column of energy under the rising fighter
          ctx.fillStyle = s.color || '#fff'; ctx.globalAlpha = 0.6 - i * 0.08;
          ctx.fillRect(Math.round(f.x - 6 + ((i * 7 + frame) % 12)), Math.round(floorY - f.y + i * 6), 2, 6);
        }
        ctx.globalAlpha = 1;
      },
    },

    // COUNTER: a stance. Get hit during it and you strike back instead (see FightScene.applyHit).
    counter: {
      start(f) { f.vx = 0; RF.audio.sfx('shield'); },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (d.countered) { if (t - d.countered >= 22) f.setState('idle'); return; }
        if (t >= s.startup + s.window + s.recovery) f.setState('idle');
      },
      anim(f) { const s = f.special, d = f.specialData; return d.countered ? ['heavy', 1] : f.stateTime < s.startup + s.window ? ['block', 0] : ['idle', 0]; },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime;
        if (f.specialData.countered || t < s.startup || t >= s.startup + s.window) return;
        ctx.strokeStyle = s.color || '#fff'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(frame / 2);
        ctx.strokeRect(Math.round(f.x - f.body.width / 2 - 4), Math.round(floorY - f.y - f.body.height - 4), f.body.width + 8, f.body.height + 6);
        ctx.globalAlpha = 1;
        if (s.callout) RF.font.drawText(ctx, s.callout, f.x, floorY - f.y - f.body.height - 16, { align: 'center', color: s.color || '#fff', outline: '#000' });
      },
    },

    // Anthony: BRO BATCH - a portal over the opponent rains giant protein bars.
    barRain: {
      start(f, scene) { f.vx = 0; f.specialData.tx = scene.opponentOf(f).x; RF.audio.sfx(f.special.look === 'money' ? 'cash' : 'arcane'); },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
        if (t < s.startup) { d.tx += (opp.x - d.tx) * 0.15; return; } // the portal tracks them while it opens
        for (let i = 0; i < s.bars; i++) {
          const landAt = s.startup + i * s.interval + s.fall;
          if (t !== landAt) continue;
          const mega = i === s.bars - 1, x = d.tx + (mega ? 0 : ((i % 3) - 1) * 10);
          scene.shake = Math.max(scene.shake, mega ? 12 : 4);
          RF.audio.sfx(mega ? 'boom' : 'stomp');
          scene.effects.spawn('dust', x, 1);
          if (opp.getHurtbox() && Math.abs(opp.x - x) < opp.body.width / 2 + (mega ? 22 : 12)) {
            const mv = RF.specialMove(f, s);
            if (mega) { mv.damage = s.megaDamage * f.stats.damage * (f.superActive ? RF.CONFIG.SUPER_DAMAGE : f.exActive ? RF.CONFIG.EX_DAMAGE : 1); mv.launch = 7; mv.hitstop = 10; mv.hitstun = 34; }
            scene.applyHit(f, opp, mv, 'heavy', x, 30);
          }
        }
        if (t >= s.startup + (s.bars - 1) * s.interval + s.fall + s.recovery) f.setState('idle');
      },
      anim(f) { return ['throw', f.stateTime < f.special.startup ? 1 : 1]; }, // both arms raised
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime, d = f.specialData, top = 58;
        const open = Math.min(1, t / s.startup), close = t > s.startup + (s.bars - 1) * s.interval + s.fall ? Math.max(0, 1 - (t - (s.startup + (s.bars - 1) * s.interval + s.fall)) / 12) : 1;
        const rx = 34 * open * close, ry = 8 * open * close;
        if (rx > 1) { // the portal
          ctx.fillStyle = 'rgba(40,0,20,0.85)'; ctx.beginPath(); ctx.ellipse(d.tx, top, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ff70a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(d.tx, top, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#ffe0ea'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(d.tx, top, Math.max(1, rx - 4), Math.max(1, ry - 2), frame / 10, 0, Math.PI * 2); ctx.stroke();
        }
        for (let i = 0; i < s.bars; i++) { // the bars
          const start = s.startup + i * s.interval, u = (t - start) / s.fall;
          if (u < 0 || t > start + s.fall + 10) continue;
          const mega = i === s.bars - 1, k = mega ? 2 : 1;
          const x = d.tx + (mega ? 0 : ((i % 3) - 1) * 10), y = u >= 1 ? floorY - 6 * k : top + (floorY - top - 6 * k) * u * u;
          (s.look === 'money' ? RF.drawGoldBar : RF.drawProteinBar)(ctx, x, y, k, u >= 1 ? 0 : (t * 0.4 + i) * (i % 2 ? 1 : -1));
          if (s.look === 'money' && u < 1) for (let j = 0; j < 4; j++) { // cash fluttering down with it
            ctx.fillStyle = '#9ac070'; ctx.fillRect(Math.round(x - 20 + j * 13 + Math.sin(t / 4 + j) * 4), Math.round(y - 14 - j * 6), 6, 3);
          }
        }
        if (t >= s.startup && t < s.startup + 40) RF.font.drawText(ctx, s.callout || 'BRO BATCH!', RF.CONFIG.WIDTH / 2, 50, { scale: 3, align: 'center', outline: '#000',
          color: s.look === 'money' ? ['#ffffff', '#fff6b0', '#ffe060', '#ffc030', '#e8b420', '#c8961e', '#8a6a10'] : ['#ffffff', '#ffe0ea', '#ffb0c8', '#ff80a8', '#ff5080', '#e02060', '#a01040'] });
      },
    },

    // Simon: leaps across the stage knee-first.
    flyingKnee: {
      start(f) { f.vx = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (t === s.startup) { f.vy = s.rise; f.vx = f.facing * s.speed; d.air = true; RF.audio.sfx('whoosh'); scene.effects.spawn('dust', f.x, 1); }
        if (d.air && !d.hit) {
          const opp = scene.opponentOf(f), hurt = opp.getHurtbox();
          const kx = f.x + f.facing * f.body.width * 0.6, ky = f.y + f.body.height * 0.45;
          if (hurt && Math.abs(kx - opp.x) < opp.body.width / 2 + 10 && ky > hurt.y - 6 && ky < hurt.y + hurt.h + 6) {
            d.hit = true;
            f.vx *= 0.3;
            scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', kx, ky);
          }
        }
        if (d.landedAt && t - d.landedAt >= s.recovery) f.setState('idle');
        if (d.air && t > s.startup + 2 && f.grounded && !d.landedAt) { d.landedAt = t; f.vx = 0; scene.effects.spawn('dust', f.x, 1); }
        if (t > 120) f.setState('idle'); // safety
      },
      anim(f) { return f.stateTime < f.special.startup ? ['crouch', 0] : f.specialData.landedAt ? ['crouch', 0] : ['uppercut', 1]; },
      draw(f, ctx, floorY, frame) { // speed lines + a flash on the knee
        if (!f.specialData.air || f.specialData.landedAt) return;
        const kx = f.x + f.facing * f.body.width * 0.6, ky = floorY - f.y - f.body.height * 0.45;
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(255,${200 - i * 20},80,${0.7 - i * 0.1})`;
          ctx.fillRect(Math.round(kx - f.facing * (8 + i * 7)), Math.round(ky - 8 + i * 3), 6, 1);
        }
        ctx.fillStyle = frame % 4 < 2 ? '#ffffff' : '#ffd060';
        ctx.fillRect(Math.round(kx) - 2, Math.round(ky) - 2, 4, 4);
      },
    },

    // Holbrook: a continent-sized tectonic plate slides across the floor.
    plate: {
      start(f) { f.vx = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime;
        if (t === 1) RF.audio.sfx('rumble');
        if (t < s.startup) { scene.shake = Math.max(scene.shake, 2); return; }
        const a = t - s.startup;
        if (a < s.travel) {
          scene.shake = Math.max(scene.shake, 5);
          const edge = f.x + f.facing * (f.body.width / 2 + a * s.speed), opp = scene.opponentOf(f);
          if (!f.specialData.hit && opp.getHurtbox() && opp.y < 50 && f.facing * (edge - (opp.x - f.facing * opp.body.width / 2)) >= 0) {
            f.specialData.hit = true;
            scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, 20);
          }
        }
        if (a >= s.travel + s.recovery) f.setState('idle');
      },
      anim(f) { return ['special', f.stateTime < f.special.startup ? 0 : 2]; },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime, dir = f.facing;
        if (t < s.startup) { // cracks spreading from his feet
          ctx.fillStyle = '#1a0a00';
          for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(f.x + dir * i * t * 1.4), floorY - 1, 5, 2);
          return;
        }
        const a = t - s.startup, fade = a > s.travel ? Math.max(0, 1 - (a - s.travel) / s.recovery) : 1;
        if (fade <= 0) return;
        const edge = f.x + dir * (f.body.width / 2 + Math.min(a, s.travel) * s.speed), len = 170, top = floorY - 26;
        ctx.save(); ctx.globalAlpha = fade;
        // the landmass: a slab with a rugged coast, green lowlands, brown mountains, snowy peaks
        const xs = (u) => edge - dir * u;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.moveTo(xs(-4), floorY + 2);
        for (let u = 0; u <= len; u += 8) ctx.lineTo(xs(u), top - 2 + Math.round(4 * Math.sin(u / 11)) + (u < 12 ? 12 - u : 0));
        ctx.lineTo(xs(len), floorY + 2); ctx.fill();
        ctx.fillStyle = '#5a8a30';
        ctx.beginPath(); ctx.moveTo(xs(0), floorY);
        for (let u = 0; u <= len; u += 8) ctx.lineTo(xs(u), top + Math.round(4 * Math.sin(u / 11)) + (u < 12 ? 12 - u : 0));
        ctx.lineTo(xs(len), floorY); ctx.fill();
        ctx.fillStyle = '#7a5a30'; ctx.fillRect(Math.min(xs(0), xs(len)), floorY - 10, len, 10);   // the rock strata
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(Math.min(xs(0), xs(len)), floorY - 5, len, 2);
        for (let i = 0; i < 4; i++) { // mountain ranges
          const mx = xs(30 + i * 36), mh = 16 + (i % 2) * 8;
          ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.moveTo(mx - 12, top + 4); ctx.lineTo(mx, top - mh); ctx.lineTo(mx + 12, top + 4); ctx.fill();
          ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.moveTo(mx - 4, top - mh + 6); ctx.lineTo(mx, top - mh); ctx.lineTo(mx + 4, top - mh + 6); ctx.fill();
        }
        // spray of rubble and ocean foam at the leading edge
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = i % 2 ? '#e8f4ff' : '#7a5a30';
          ctx.fillRect(Math.round(edge + dir * (2 + (i * 5 + frame) % 14)), floorY - 4 - ((i * 7 + frame * 2) % 26), 2, 2);
        }
        ctx.restore();
        if (a < s.travel) RF.font.drawText(ctx, 'CONTINENTAL DRIFT!', RF.CONFIG.WIDTH / 2, 50, { scale: 2, align: 'center', outline: '#000',
          color: ['#ffffff', '#d0ffb0', '#a0e070', '#70c040', '#50a030', '#3a8020', '#206010'] });
      },
    },

    // A giant PA speaker drops from the ceiling and blasts the whole screen.
    screenWave: {
      start(f) { f.vx = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime;
        if (t === s.startup) RF.audio.sfx('pa');
        if (t === s.startup + s.delay) {
          scene.shake = 14; scene.flash = 4;
          const opp = scene.opponentOf(f);
          if (opp.getHurtbox()) scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, opp.body.height / 2);
        }
        if (t >= s.startup + s.delay + s.recovery) f.setState('idle');
      },
      anim(f) { return ['throw', f.stateTime < f.special.startup ? 1 : 2]; }, // points to the ceiling
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime, W = RF.CONFIG.WIDTH;
        if (t < 4) return;
        const drop = Math.min(1, (t - 4) / 12), sx = W / 2, sy = Math.round(-30 + 64 * drop);
        // the speaker horn hanging from the ceiling
        ctx.fillStyle = '#111'; ctx.fillRect(sx - 1, 0, 3, sy - 10);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(sx - 8, sy - 12); ctx.lineTo(sx + 8, sy - 12); ctx.lineTo(sx + 22, sy + 8); ctx.lineTo(sx - 22, sy + 8); ctx.fill();
        ctx.fillStyle = '#9aa0a8'; ctx.beginPath(); ctx.moveTo(sx - 7, sy - 11); ctx.lineTo(sx + 7, sy - 11); ctx.lineTo(sx + 20, sy + 7); ctx.lineTo(sx - 20, sy + 7); ctx.fill();
        ctx.fillStyle = '#2a2a30'; ctx.fillRect(sx - 18, sy + 5, 36, 3);
        if (t >= s.startup) {
          const a = t - s.startup;
          for (let i = 0; i < 6; i++) { // sound waves rolling over the entire screen
            const r = (a * 9 + i * 34) % 260;
            ctx.strokeStyle = `rgba(255,230,140,${Math.max(0, 0.7 - r / 300)})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(sx, sy + 8, r, r * 0.7, 0, 0, Math.PI); ctx.stroke();
          }
          ctx.lineWidth = 1;
          if (a < s.delay + 30) RF.font.drawText(ctx, 'ATTENTION STUDENTS!', W / 2, sy + 18, { scale: 2, align: 'center', outline: '#000',
            color: ['#ffffff', '#fff6b0', '#ffe060', '#ffc030', '#ff9a10', '#ff7000', '#e04000'] });
        }
      },
    },

    // Deploys a little auto-turret in front that fires a burst of shots.
    turret: {
      start(f) { f.vx = 0; },
      turretX(f) { return f.x + f.facing * f.special.offset; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, k = RF.SPECIAL_KINDS.turret;
        if (t === s.startup) { RF.audio.sfx('grab'); scene.effects.spawn('dust', k.turretX(f), 1); }
        for (let i = 0; i < s.shots; i++) {
          if (t === s.startup + 10 + i * s.interval) {
            // Fire from the turret's barrel, not from his hands.
            const shooter = { x: k.turretX(f) - f.facing * f.body.width * 0.7, y: 0, facing: f.facing, body: f.body, stats: f.stats, side: f.side };
            scene.spawnProjectile(shooter, Object.assign({}, s.shot, { owner: f }));
            const p = scene.projectiles[scene.projectiles.length - 1];
            p.owner = f;
          }
        }
        if (t >= s.startup + 10 + s.shots * s.interval + s.recovery) f.setState('idle');
      },
      anim(f) { return ['throw', f.stateTime < f.special.startup ? 0 : 2]; },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime;
        if (t < s.startup - 4) return;
        const x = Math.round(RF.SPECIAL_KINDS.turret.turretX(f)), fy = floorY;
        const up = Math.min(1, (t - s.startup + 4) / 8); // unfolds
        const h = Math.round(26 * up);
        ctx.fillStyle = '#111';                                     // tripod
        ctx.fillRect(x - 9, fy - 2, 18, 2); ctx.fillRect(x - 1, fy - h, 3, h);
        ctx.fillStyle = '#5a6068'; ctx.fillRect(x - 7, fy - 2, 14, 1);
        if (up < 1) return;
        ctx.fillStyle = '#111'; ctx.fillRect(x - 8, fy - 38, 16, 14);
        ctx.fillStyle = '#6a7480'; ctx.fillRect(x - 7, fy - 37, 14, 12);  // housing
        ctx.fillStyle = '#ffb020'; ctx.fillRect(x - 7, fy - 30, 14, 2);   // hazard stripe
        ctx.fillStyle = '#111'; ctx.fillRect(f.facing > 0 ? x + 7 : x - 17, fy - 34, 10, 4); // barrel
        ctx.fillStyle = t % 8 < 4 ? '#ff2a1a' : '#5a0a0a'; ctx.fillRect(x - 2, fy - 36, 3, 2); // sensor light
        const shotT = (t - s.startup - 10) % s.interval;
        if (t >= s.startup + 10 && t < s.startup + 10 + s.shots * s.interval && shotT < 3) {
          ctx.fillStyle = '#fff6b0'; ctx.fillRect(f.facing > 0 ? x + 17 : x - 23, fy - 36, 6, 8); // muzzle flash
        }
      },
    },

    // Something huge falls from the sky onto where the opponent is standing.
    drop: {
      start(f) { f.vx = 0; f.specialData.targetX = null; f.specialData.impact = false; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (t === s.startup) { d.targetX = scene.opponentOf(f).x; RF.audio.sfx('whoosh'); }
        if (t === s.startup + s.fall) {
          d.impact = true;
          scene.shake = 12;
          RF.audio.sfx('heavy');
          scene.effects.spawn('dust', d.targetX - s.width / 2, 1);
          scene.effects.spawn('dust', d.targetX + s.width / 2, 1);
          const opp = scene.opponentOf(f), hurt = opp.getHurtbox();
          const box = { x: d.targetX - s.width / 2, y: 0, w: s.width, h: s.height };
          if (hurt && RF.util.rectsOverlap(box, hurt)) scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, 30);
        }
        if (t >= s.startup + s.fall + s.recovery) f.setState('idle');
      },
      anim(f) {
        const s = f.special, t = f.stateTime;
        return ['throw', t < s.startup + s.fall ? 1 : 2]; // points to the sky, then brings it down
      },
      draw(f, ctx, floorY) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (d.targetX == null) return;
        const p = Math.min(1, (t - s.startup) / s.fall);
        const x = Math.round(d.targetX), bottom = Math.round(-20 + (floorY + 20) * p * p);
        const w = s.width;
        // Shadow growing on the floor
        ctx.fillStyle = `rgba(0,0,0,${0.15 + p * 0.35})`;
        ctx.beginPath(); ctx.ellipse(x, floorY + 1, (w / 2) * (0.4 + p * 0.6), 3, 0, 0, Math.PI * 2); ctx.fill();
        if (t > s.startup + s.fall + 14) {
          // Stamped onto the floor
          RF.font.drawText(ctx, s.label, x, floorY - 4, { align: 'center', color: '#c01818' });
          return;
        }
        // The giant rubber stamp: wooden handle, red rubber block with the word on it
        ctx.fillStyle = '#111'; ctx.fillRect(x - 7, bottom - 52, 14, 30); ctx.fillRect(x - 13, bottom - 60, 26, 10);
        ctx.fillStyle = '#7a4a22'; ctx.fillRect(x - 6, bottom - 51, 12, 29); ctx.fillRect(x - 12, bottom - 59, 24, 8);
        ctx.fillStyle = '#111'; ctx.fillRect(x - w / 2 - 1, bottom - 23, w + 2, 24);
        ctx.fillStyle = '#5a5a60'; ctx.fillRect(x - w / 2, bottom - 22, w, 8);
        ctx.fillStyle = '#c01818'; ctx.fillRect(x - w / 2, bottom - 14, w, 14);
        RF.font.drawText(ctx, s.label, x, bottom - 12, { align: 'center', color: '#ffffff' });
      },
    },

    // A volley of projectiles thrown one after another at different heights.
    volley: {
      start(f) { f.vx = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime;
        for (let i = 0; i < s.heights.length; i++) {
          if (t === s.startup + i * s.interval) {
            scene.spawnProjectile(f, Object.assign({}, s, { height: s.heights[i], size: (s.sizes && s.sizes[i]) || s.size }));
            if (s.callouts) scene.effects.spawnText(s.callouts[i], f.x, f.body.height + 8 + (i % 2) * 8, '#e8dcc0');
            if (s.stompShake) { scene.shake = Math.max(scene.shake, s.stompShake + i * 2); RF.audio.sfx('stomp'); scene.effects.spawn('dust', f.x + f.facing * 10, 1); }
          }
        }
        if (t >= s.startup + s.heights.length * s.interval + s.recovery) f.setState('idle');
      },
      anim(f) {
        const s = f.special, t = f.stateTime;
        if (t < s.startup) return ['special', 0];
        return ['special', Math.floor((t - s.startup) / s.interval) % 2 ? 1 : 2];
      },
    },

    // A bolt of electricity fired straight ahead from the hands.
    beam: {
      start(f) { f.vx = 0; f.specialData.len = 0; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (t === s.startup) RF.audio.sfx(s.sound || 'zap');
        if (t === s.startup) d.len = s.range; // shown at full reach until it connects
        if (t === s.startup + (s.hitDelay || 0)) { // a lunging snake bites a few frames after it shoots out
          const opp = scene.opponentOf(f);
          const x0 = f.x + f.facing * s.handX, y = f.y + s.handY;
          const box = { x: f.facing > 0 ? x0 : x0 - s.range, y: y - s.thickness / 2, w: s.range, h: s.thickness };
          const hurt = opp.getHurtbox();
          if (hurt && RF.util.rectsOverlap(box, hurt)) {
            // The bolt stops at whoever it hits.
            d.len = Math.max(8, f.facing > 0 ? hurt.x - x0 + 4 : x0 - (hurt.x + hurt.w) + 4);
            const res = scene.applyHit(f, opp, RF.specialMove(f, s), 'zap', opp.x, y);
            if (res === 'hit') for (let i = 0; i < 4; i++) scene.effects.spawn(s.hitEffect || 'zap', opp.x + (Math.random() - 0.5) * opp.body.width, opp.y + Math.random() * opp.body.height);
          }
        }
        if (t >= s.startup + s.active + s.recovery) f.setState('idle');
      },
      anim(f) {
        const s = f.special;
        return ['special', f.stateTime < s.startup ? 0 : 1];
      },
      drawSerpent(f, ctx, hx, hy, t, frame) {
        const s = f.special, L = RF.electric.line;
        if (t < s.startup) { // the snake coils, glowing, ready to strike
          for (let i = 0; i < 10; i++) {
            const a = i * 0.7 + frame * 0.2, r = 4 + i * 0.6;
            ctx.fillStyle = i % 2 ? '#4aa86a' : '#2e7a48';
            ctx.fillRect(Math.round(hx + Math.cos(a) * r), Math.round(hy + Math.sin(a) * r), 3, 3);
          }
          return;
        }
        if (t >= s.startup + s.active) return;
        const len = f.specialData.len, out = Math.min(1, (t - s.startup + 1) / ((s.hitDelay || 4) + 1)); // shoots out fast
        const reach = len * out, n = Math.max(2, Math.round(reach / 6));
        let px = hx, py = hy;
        for (let i = 1; i <= n; i++) {
          const u = i / n, x = hx + f.facing * reach * u, y = hy + Math.sin(u * Math.PI * 3 + frame * 0.5) * 7 * (1 - u * 0.6);
          const w = Math.round(10 - u * 3);
          L(ctx, px, py, x, y, w + 2, '#0a1e0f');
          L(ctx, px, py, x, y, w, i % 2 ? '#4aa86a' : '#3a8a58');
          L(ctx, px, py, x, y, 2, '#c8e8a0'); // belly
          px = x; py = y;
        }
        // head with open jaws and fangs
        ctx.fillStyle = '#0a1e0f'; ctx.fillRect(Math.round(px - 8), Math.round(py - 8), 16, 16);
        ctx.fillStyle = '#4aa86a'; ctx.fillRect(Math.round(px - 7), Math.round(py - 7), 14, 6);
        ctx.fillStyle = '#3a8a58'; ctx.fillRect(Math.round(px - 7), Math.round(py + 2), 14, 5);
        ctx.fillStyle = '#7a0010'; ctx.fillRect(Math.round(px - 6), Math.round(py - 1), 12, 3);   // open mouth
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(px + f.facing * 4), Math.round(py - 1), 1, 3); ctx.fillRect(Math.round(px + f.facing * 1), Math.round(py - 1), 1, 3);
        ctx.fillStyle = '#ff2010'; ctx.fillRect(Math.round(px - f.facing * 3), Math.round(py - 6), 2, 2); // eye
      },
      draw(f, ctx, floorY, frame) {
        const s = f.special, t = f.stateTime, el = RF.electric;
        const hx = Math.round(f.x + f.facing * s.handX), hy = Math.round(floorY - f.y - s.handY);
        const seed = Math.floor(frame / 2) * 13.7;
        if (s.look === 'serpent') return RF.SPECIAL_KINDS.beam.drawSerpent(f, ctx, hx, hy, t, frame);
        if (t < s.startup) {
          // Charging: electricity gathers around his whole body, then his hands.
          const p = t / s.startup;
          el.crackle(ctx, f.x, hy - 6, 18 - p * 6, seed, 4);
          el.glow(ctx, hx, hy, 8 + p * 14, 0.3 + p * 0.5);
          return;
        }
        if (t < s.startup + s.active) {
          const x1 = hx + f.facing * f.specialData.len;
          // Full-power surge: a thick forked main bolt, two wild side arcs, blinding ends.
          ctx.fillStyle = 'rgba(90,170,255,0.18)';
          ctx.fillRect(Math.min(hx, x1), floorY - 4, Math.abs(x1 - hx), 5);
          el.glow(ctx, hx, hy, 24, 0.85);
          el.bolt(ctx, [hx, hy], [x1, hy], { seed, amp: 9, thick: 1.8, forks: 7 });
          el.bolt(ctx, [hx, hy], [x1, hy - 4], { seed: seed + 40, amp: 14, thick: 0.5, forks: 2 });
          el.bolt(ctx, [hx, hy], [x1, hy + 4], { seed: seed + 80, amp: 14, thick: 0.5, forks: 2 });
          el.glow(ctx, x1, hy, 20, 0.9);
          el.crackle(ctx, x1, hy, 12, seed + 3, 4);
        }
      },
    },

    slam: {
      start(f) { f.vx = 0; f.specialData.landedAt = null; },
      update(f, scene) {
        const s = f.special, t = f.stateTime, d = f.specialData;
        if (t === s.startup) {
          // Leap so we come down roughly on top of the opponent.
          const opp = scene.opponentOf(f);
          const airTime = (2 * s.leapPower) / RF.CONFIG.GRAVITY;
          f.vy = s.leapPower;
          f.vx = clamp((opp.x - f.x) / airTime, -s.maxLeapSpeed, s.maxLeapSpeed);
        }
        if (d.landedAt !== null && t - d.landedAt >= s.recovery) f.setState('idle');
      },
      onLand(f, scene) {
        const s = f.special, d = f.specialData;
        if (d.landedAt !== null) return;
        d.landedAt = f.stateTime;
        f.vx = 0;
        scene.shake = 12;
        scene.effects.spawn('shock', f.x - s.radius * 0.6, 4);
        scene.effects.spawn('shock', f.x + s.radius * 0.6, 4);
        const wave = { x: f.x - s.radius, y: 0, w: s.radius * 2, h: s.height };
        const opp = scene.opponentOf(f);
        const hurt = opp.getHurtbox();
        if (hurt && RF.util.rectsOverlap(wave, hurt)) {
          scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, 10);
        }
      },
      anim(f) {
        const s = f.special, d = f.specialData;
        if (f.stateTime < s.startup) return ['special', 0];
        if (d.landedAt === null) return ['jump', 0];
        return ['special', 2];
      },
    },
  };
})();
