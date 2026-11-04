// Character-specific visual effects, attached by name in characters.js:
//   a move with  fx: '<name>'   draws RF.MOVE_FX[name] while it's out
//   a fighter with blockFx: '<name>' draws RF.BLOCK_FX[name] while blocking
(function () {
  const E = () => RF.electric;

  RF.MOVE_FX = {
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
