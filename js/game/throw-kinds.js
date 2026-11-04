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
