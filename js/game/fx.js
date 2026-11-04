// Character-specific visual effects, attached by name in characters.js:
//   a move with  fx: '<name>'   draws RF.MOVE_FX[name] while it's out
//   a fighter with blockFx: '<name>' draws RF.BLOCK_FX[name] while blocking
(function () {
  const E = () => RF.electric;

  RF.MOVE_FX = {
    // El Escobedo's jetpack: strapped to his back, flames roaring out of two nozzles.
    jetpack(f, ctx, floorY, frame) {
      const px = Math.round(f.x - f.facing * 13), top = Math.round(floorY - f.y - 70);
      ctx.fillStyle = '#111'; ctx.fillRect(px - 6, top - 1, 12, 24);
      ctx.fillStyle = '#7a8088'; ctx.fillRect(px - 5, top, 10, 22);
      ctx.fillStyle = '#b8c0c8'; ctx.fillRect(px - 4, top + 2, 3, 18);          // shine
      ctx.fillStyle = '#c02020'; ctx.fillRect(px - 5, top + 5, 10, 2);          // stripe
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(px - 5, top + 22, 4, 4); ctx.fillRect(px + 1, top + 22, 4, 4); // nozzles
      for (const nx of [px - 3, px + 3]) {
        const len = 8 + ((frame + nx) % 3) * 4;
        ctx.fillStyle = '#ff5a10'; ctx.fillRect(nx - 2, top + 26, 4, len);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(nx - 1, top + 26, 2, Math.round(len * 0.6));
        ctx.fillStyle = '#ffffff'; ctx.fillRect(nx - 1, top + 26, 2, 2);
      }
    },

    // Ranged lightning: charges in the hand, then a forked bolt rips forward
    // and stops at whatever it hits.
    lightning(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime, el = E();
      const hx = Math.round(f.x + f.facing * m.fxHand[0]), hy = Math.round(floorY - f.y - m.fxHand[1]);
      const seed = Math.floor(frame / 2) * 17.3 + f.side * 100;
      if (t < m.startup) {
        // Charging: a swelling ball of sparks in his hands.
        const p = t / m.startup;
        el.glow(ctx, hx, hy, 6 + p * 10, 0.35 + p * 0.4);
        el.crackle(ctx, hx, hy, 5 + p * 9, seed, 2 + Math.round(p * 4));
        return;
      }
      const sinceActive = t - m.startup;
      if (sinceActive >= m.active + 4) return; // bolt fully gone
      const fade = sinceActive >= m.active; // last few frames: thin afterglow
      const reach = f.fxHitDist != null ? f.fxHitDist : m.hitbox.x + m.hitbox.w;
      const ex = Math.round(f.x + f.facing * reach), ey = hy + Math.round((RF.util.hash(seed) - 0.5) * 6);
      // Light thrown on the floor under the bolt
      ctx.fillStyle = 'rgba(90,170,255,0.12)';
      ctx.fillRect(Math.min(hx, ex), floorY - 3, Math.abs(ex - hx), 4);
      if (!fade) {
        el.glow(ctx, hx, hy, 16, 0.7);
        el.bolt(ctx, [hx, hy], [ex, ey], { seed, amp: 7, thick: 1.2, forks: 5 });
        el.bolt(ctx, [hx, hy], [ex, ey + 2], { seed: seed + 50, amp: 10, thick: 0.4, forks: 1 }); // second arc
        el.glow(ctx, ex, ey, 14, 0.8);
        el.crackle(ctx, ex, ey, 9, seed + 7, 3);
      } else {
        el.bolt(ctx, [hx, hy], [ex, ey], { seed, amp: 9, thick: 0.35, forks: 0 });
      }
    },
  };

  // Custom-drawn projectiles (a projectile config with art: '<name>').
  RF.PROJECTILE_ART = {
    // El Escobedo's quadcopter drone: spinning rotors, blinking lights.
    drone(ctx, x, y, t, dir) {
      const bob = Math.round(Math.sin(t / 3));
      y += bob;
      ctx.fillStyle = '#111'; ctx.fillRect(x - 9, y - 3, 18, 7);
      ctx.fillStyle = '#4a5058'; ctx.fillRect(x - 8, y - 2, 16, 5);              // body
      ctx.fillStyle = '#2a8ad8'; ctx.fillRect(x + dir * 3 - 2, y - 1, 4, 2);      // camera
      ctx.fillStyle = '#111'; ctx.fillRect(x - 12, y - 5, 4, 2); ctx.fillRect(x + 8, y - 5, 4, 2); // arms
      const blade = t % 2 ? 7 : 3;                                               // rotor blur
      ctx.fillStyle = 'rgba(220,230,240,0.8)';
      ctx.fillRect(x - 10 - blade / 2, y - 7, blade, 1); ctx.fillRect(x + 10 - blade / 2, y - 7, blade, 1);
      ctx.fillStyle = t % 10 < 5 ? '#ff2a1a' : '#40ff60';                        // blinking LED
      ctx.fillRect(x - dir * 7, y + 2, 2, 2);
    },

    // Dr. Astuto's AP GOV textbook, tumbling end over end.
    textbook(ctx, x, y, t, dir) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.round(t / 3) * (Math.PI / 4) * dir);
      ctx.fillStyle = '#111'; ctx.fillRect(-8, -10, 16, 20);                       // outline
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-7, -9, 14, 18);                     // pages
      ctx.fillStyle = '#8a2418'; ctx.fillRect(-6, -9, 13, 8);                      // APUSH (red)
      ctx.fillStyle = '#26304a'; ctx.fillRect(-6, 0, 13, 9);                       // AP GOV (navy)
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-4, -6, 8, 1); ctx.fillRect(-4, 3, 8, 1);  // title lines
      ctx.fillRect(-2, 5, 1, 3); ctx.fillRect(0, 5, 1, 3); ctx.fillRect(2, 5, 1, 3);      // columns
      ctx.restore();
      // motion streaks
      ctx.fillStyle = 'rgba(232,220,192,0.35)';
      for (let i = 1; i <= 3; i++) ctx.fillRect(Math.round(x - dir * (8 + i * 5)), Math.round(y - 4 + i * 2), 4, 1);
    },
  };

  RF.BLOCK_FX = {
    // A crackling half-dome of electricity in front of him. Flares up when hit.
    electricShield(f, ctx, floorY, frame) {
      const hurt = f.getHurtbox();
      if (!hurt) return;
      const strength = f.shieldHit > 0 ? f.shieldHit / 12 : 0;
      const ry = hurt.h / 2 + 6;
      const cx = f.x + f.facing * 6, cy = floorY - f.y - hurt.h / 2;
      const seed = Math.floor(frame / 2) * 7.7 + f.side * 50;
      E().shield(ctx, cx, cy, 16 + strength * 4, ry, f.facing, seed, strength);
    },
  };
})();
