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
  RF.specialMove = (f, s) => ({
    damage: s.damage * f.stats.damage,
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
