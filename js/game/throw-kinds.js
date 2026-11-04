// Throw animations/behaviour. Each kind implements:
//   update(att, def, t, scene) -> true when the throw is finished
//       runs every frame of the throw; positions the victim (def) relative to
//       the thrower (att), picks the victim's pose (def.thrownPose) and deals
//       damage through scene.throwHit(att, def, damage, release?)
//   anim(att, t) -> [animation, frame] for the thrower
//   draw(att, def, ctx, floorY, frame)   optional extra effects
(function () {
  // Hold the victim just in front of the thrower (`extra` pixels further out).
  function hold(att, def, extra = 0, y = 0) {
    const dist = (att.body.width + def.body.width) / 2 + extra;
    def.x = att.x + att.facing * dist;
    def.y = y;
    def.facing = -att.facing;
  }

  RF.THROW_KINDS = {
    // Bruiser: lift overhead, carry over, slam down behind.
    overhead: {
      update(att, def, t, scene) {
        const T = att.throwCfg;
        if (t < 8) { hold(att, def); def.thrownPose = ['hit', 0]; return false; }
        if (t < 28) {
          const u = (t - 8) / 20, a = Math.PI * u;
          def.x = att.x + att.facing * Math.cos(a) * 26;
          def.y = Math.sin(a) * (att.body.height + 6) + 8; // hoisted right over his head
          def.thrownPose = u < 0.25 || u > 0.75 ? ['ko', 0] : ['ko', 1];
          return false;
        }
        if (t === 28) {
          def.x = att.x - att.facing * 30;
          def.y = 0;
          scene.shake = 12;
          scene.effects.spawn('dust', def.x, 1);
          scene.effects.spawn('shock', def.x, 4);
          scene.throwHit(att, def, T.damage, { vx: -att.facing * 2, vy: 3 });
        }
        return t >= 42;
      },
      anim(att, t) { return ['throw', t < 8 ? 0 : t < 28 ? 1 : 2]; },
    },

    // Viper: knee, knee, knee, kick away.
    flurry: {
      update(att, def, t, scene) {
        const T = att.throwCfg;
        const knees = [];
        for (let i = 0; i < T.hits; i++) knees.push(8 + i * 10);
        const finish = 8 + T.hits * 10;
        const sinceKnee = Math.min(...knees.map((k) => (t >= k ? t - k : 99)));
        hold(att, def, sinceKnee < 3 ? 2 : 0); // jolts back on each knee
        def.thrownPose = ['hit', 0];
        if (knees.includes(t)) {
          scene.effects.spawn('hit', def.x - att.facing * 4, 30);
          scene.throwHit(att, def, T.damagePerHit);
        }
        if (t === finish) {
          scene.effects.spawn('heavy', def.x - att.facing * 6, 40);
          scene.shake = 6;
          scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 4, vy: 5 });
        }
        return t >= finish + 14;
      },
      anim(att, t) {
        const T = att.throwCfg, finish = 8 + T.hits * 10;
        if (t < 8) return ['throw', 0];
        if (t >= finish && t < finish + 8) return ['heavy', 1];
        return (t - 8) % 10 < 4 ? ['heavy', 0] : ['throw', 0]; // knee up
      },
    },

    // Dr. Astuto: victim on one pan of a giant balance scale, the AP GOV book
    // dropped on the other, victim catapulted sky-high and back down.
    balance: {
      scaleX(att) { return att.x + att.facing * 46; },
      update(att, def, t, scene) {
        const T = att.throwCfg, k = RF.THROW_KINDS.balance, sx = k.scaleX(att);
        const nearPan = sx - att.facing * 28;
        if (t < 8) { hold(att, def); def.thrownPose = ['hit', 0]; return false; }
        if (t < 16) { // set them on the near pan
          const u = (t - 8) / 8;
          def.x = def.x + (nearPan - def.x) * u;
          def.y = 18 * u;
          def.thrownPose = ['hit', 0];
          return false;
        }
        if (t < 28) { def.x = nearPan; def.y = 18; return false; } // the book falls onto the far pan
        if (t === 28) {
          RF.audio.sfx('heavy');
          scene.shake = 8;
          scene.throwHit(att, def, 0);
          def.flash = 0;
        }
        if (t < 58) { // catapulted!
          const u = (t - 28) / 30;
          def.y = 18 + Math.sin(u * Math.PI) * 120;
          def.x = nearPan + att.facing * u * 10;
          def.thrownPose = ['ko', 0];
          if (t === 30) scene.throwHit(att, def, T.launchDamage);
          return false;
        }
        if (t === 58) {
          def.y = 0;
          scene.shake = 14;
          scene.effects.spawn('dust', def.x, 1);
          scene.effects.spawn('shock', def.x, 4);
          scene.throwHit(att, def, T.landDamage, { vx: att.facing * 2, vy: 2 });
        }
        return t >= 72;
      },
      anim(att, t) { return t < 16 ? ['throw', 0] : t < 28 ? ['throw', 1] : ['throw', 2]; },
      draw(att, def, ctx, floorY) {
        const t = att.stateTime;
        if (t < 8 || t > 66) return;
        const k = RF.THROW_KINDS.balance, sx = Math.round(k.scaleX(att)), f = att.facing;
        const tilt = t < 28 ? 0 : 0.35;            // far side sinks once the book lands
        const cy = floorY - 48;                     // beam pivot
        // post and base
        ctx.fillStyle = '#111'; ctx.fillRect(sx - 3, cy, 6, floorY - cy); ctx.fillRect(sx - 14, floorY - 4, 28, 4);
        ctx.fillStyle = '#c8a040'; ctx.fillRect(sx - 2, cy, 4, floorY - cy); ctx.fillRect(sx - 13, floorY - 3, 26, 2);
        // beam
        const ex = Math.cos(tilt) * 30, ey = Math.sin(tilt) * 30;
        const far = [sx + f * ex, cy + ey], near = [sx - f * ex, cy - ey];
        RF.electric.line(ctx, near[0], near[1], far[0], far[1], 4, '#111');
        RF.electric.line(ctx, near[0], near[1], far[0], far[1], 2, '#e0b850');
        // pans hanging from each end
        for (const [px, py] of [near, far]) {
          ctx.fillStyle = '#8a7030'; ctx.fillRect(Math.round(px), Math.round(py), 1, 12);
          ctx.fillStyle = '#111'; ctx.fillRect(Math.round(px) - 12, Math.round(py) + 12, 24, 4);
          ctx.fillStyle = '#e0b850'; ctx.fillRect(Math.round(px) - 11, Math.round(py) + 12, 22, 2);
        }
        // the textbook falling onto (then sitting on) the far pan
        const by = t < 28 ? (far[1] + 4) * ((t - 16) / 12) : far[1] + 4;
        RF.PROJECTILE_ART.textbook(ctx, Math.round(far[0]), Math.round(by), 0, f);
        RF.font.drawText(ctx, 'CHECKS', sx - 30, cy - 26, { color: '#ffffff', outline: '#000' });
        RF.font.drawText(ctx, 'BALANCES', sx + 2, cy - 18, { color: '#ffffff', outline: '#000' });
      },
    },

    // Jauregui: plot them on a bell curve, pelt them with data points, throw the outlier out.
    stats: {
      update(att, def, t, scene) {
        const T = att.throwCfg, finish = 14 + T.ticks * 9;
        hold(att, def, t > 10 ? 6 : 0);
        def.thrownPose = ['hit', 0];
        for (let i = 0; i < T.ticks; i++) {
          if (t === 14 + i * 9) {
            scene.effects.spawn('hit', def.x + (Math.random() - 0.5) * 10, 30 + Math.random() * 40);
            scene.throwHit(att, def, T.damagePerTick);
          }
        }
        if (t === finish) {
          scene.effects.spawnText('P < 0.05: REJECTED!', def.x, def.body.height + 18, '#ff6050');
          scene.shake = 6;
          scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 5, vy: 5 });
        }
        return t >= finish + 16;
      },
      anim(att, t) { return t < 10 ? ['throw', 0] : t < 14 + att.throwCfg.ticks * 9 ? ['throw', 1] : ['throw', 2]; },
      draw(att, def, ctx, floorY, frame) {
        const t = att.stateTime, finish = 14 + att.throwCfg.ticks * 9;
        if (t < 6 || t > finish + 2) return;
        // Bell curve chart behind the victim; they're the dot way out on the tail.
        const grow = Math.min(1, (t - 6) / 8);
        const cx = att.x + att.facing * 10, base = floorY - 96, w = 90 * grow, h = 34 * grow;
        ctx.fillStyle = 'rgba(10,20,30,0.75)';
        ctx.fillRect(Math.round(cx - w / 2 - 4), Math.round(base - h - 6), Math.round(w + 8), Math.round(h + 12));
        ctx.fillStyle = '#c8d8e8';
        ctx.fillRect(Math.round(cx - w / 2), base, Math.round(w), 1); // x axis
        for (let i = 0; i <= w; i++) {
          const u = (i / Math.max(1, w)) * 6 - 3, y = Math.exp(-u * u / 2) * h;
          ctx.fillStyle = Math.abs(u) > 2 ? '#ff6050' : '#9fe8ff'; // the tails are red
          ctx.fillRect(Math.round(cx - w / 2 + i), Math.round(base - y), 1, 2);
        }
        if (grow >= 1) {
          RF.font.drawText(ctx, 'OUTLIER', cx + att.facing * 30, base - 30, { align: 'center', color: '#ff6050', outline: '#000' });
          const dx = cx + att.facing * 42;
          ctx.fillStyle = '#ff2a1a'; ctx.fillRect(Math.round(dx) - 2, base - 4, 4, 4);
          // data points raining down on the victim
          for (let i = 0; i < 6; i++) {
            const fy = ((frame * 3 + i * 23) % 60);
            ctx.fillStyle = i % 2 ? '#9fe8ff' : '#ffffff';
            ctx.fillRect(Math.round(def.x - 10 + i * 4), Math.round(base + 4 + fy), 2, 2);
          }
        }
      },
    },

    // Dr. Weissenberg: grab and electrocute, then blast away.
    shock: {
      update(att, def, t, scene) {
        const T = att.throwCfg;
        const finish = 12 + T.ticks * 7;
        // Victim convulses while the current runs through them.
        const shaking = t >= 8 && t < finish;
        hold(att, def, shaking ? (t % 2 ? 2 : -2) : 0);
        def.thrownPose = shaking && t % 6 < 3 ? ['ko', 0] : ['hit', 0];
        if (shaking && t % 8 === 0) def.flash = 2;
        if (t === 8) RF.audio.sfx('zap');
        for (let i = 0; i < T.ticks; i++) {
          if (t === 12 + i * 7) {
            scene.effects.spawn('zap', def.x + (Math.random() - 0.5) * 16, 20 + Math.random() * 40);
            scene.throwHit(att, def, T.damagePerTick);
          }
        }
        if (t === finish) {
          RF.audio.sfx('bolt');
          scene.flash = 5;
          scene.shake = 8;
          for (let i = 0; i < 3; i++) scene.effects.spawn('zap', def.x, 20 + i * 15);
          scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 5, vy: 4 });
        }
        return t >= finish + 14;
      },
      anim(att, t) {
        const finish = 12 + att.throwCfg.ticks * 7;
        if (t < finish) return ['throw', 0];
        return ['special', 1];
      },
      draw(att, def, ctx, floorY, frame) {
        const t = att.stateTime, finish = 12 + att.throwCfg.ticks * 7;
        if (t < 6 || t >= finish + 4) return;
        const el = RF.electric;
        const hx = att.x + att.facing * 18, hy = floorY - att.y - 44;
        const seed = Math.floor(frame / 2) * 9.3;
        el.glow(ctx, hx, hy, 14, 0.7);
        // Arcs from his hands into the victim's body.
        for (let i = 0; i < 3; i++) {
          const ty = floorY - 18 - i * 18;
          el.bolt(ctx, [hx, hy], [def.x, ty], { seed: seed + i * 31, amp: 5, thick: 0.6, forks: 1 });
        }
        el.crackle(ctx, def.x, floorY - 40, 18, seed + 5, 4);
      },
    },
  };
})();
