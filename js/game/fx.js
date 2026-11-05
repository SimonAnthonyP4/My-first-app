// Character-specific visual effects, attached by name in characters.js:
//   a move with  fx: '<name>'   draws RF.MOVE_FX[name] while it's out
//   a fighter with blockFx: '<name>' draws RF.BLOCK_FX[name] while blocking
(function () {
  const E = () => RF.electric;

  RF.MOVE_FX = {
    // Holbrook's light, MIGRATION: flow-map arrows stream out of his hand and a flock of
    // migrating birds sweeps back toward him, dragging the opponent along.
    migration(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime, reach = m.hitbox.x + m.hitbox.w;
      const hx = f.x + f.facing * 10, hy = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      const ph = t < m.startup ? t / m.startup : 1, fade = Math.max(0, 1 - Math.max(0, t - m.startup - m.active) / 8);
      if (fade <= 0) return;
      // three curved migration-flow arrows (dashed, like a map)
      for (let k = -1; k <= 1; k++) {
        const len = reach * ph, bow = k * 10;
        ctx.strokeStyle = `rgba(${k ? 255 : 255},${k ? 200 : 120},${k ? 80 : 60},${0.9 * fade})`;
        ctx.lineWidth = k ? 1 : 2;
        ctx.setLineDash([3, 2]); ctx.lineDashOffset = -frame;
        ctx.beginPath(); ctx.moveTo(hx, hy);
        ctx.quadraticCurveTo(hx + f.facing * len / 2, hy + bow - 8, hx + f.facing * len, hy + bow / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const ex = hx + f.facing * len, ey = hy + bow / 2; // arrow head
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.moveTo(ex + f.facing * 4, ey); ctx.lineTo(ex - f.facing * 2, ey - 3); ctx.lineTo(ex - f.facing * 2, ey + 3); ctx.fill();
      }
      ctx.lineWidth = 1;
      // the flock: chevrons flying back toward him
      for (let i = 0; i < 7; i++) {
        const u = ((t * 3 + i * 9) % reach) / reach;
        const bx = hx + f.facing * reach * (1 - u) * ph, by = hy - 14 + (i % 3) * 9 + Math.sin(t / 2 + i) * 2;
        const flap = (frame + i) % 6 < 3 ? 2 : 0;
        ctx.fillStyle = `rgba(30,20,20,${fade})`;
        ctx.fillRect(Math.round(bx) - 3, Math.round(by) - flap, 2, 1); ctx.fillRect(Math.round(bx) - 1, Math.round(by) + 1 - flap / 2, 2, 1);
        ctx.fillRect(Math.round(bx) + 1, Math.round(by) - flap, 2, 1);
      }
      if (t === m.startup + 1 && f.scene) RF.audio.sfx('birds');
    },

    // Super specials: the fighter burns with golden energy.
    superAura(f, ctx, floorY, frame) {
      const h = f.body.height, baseY = floorY - f.y;
      for (let i = 0; i < 16; i++) {
        const life = (frame * 1.6 + i * 13) % 30, u = life / 30;
        const x = f.x + (RF.util.hash(i * 7.7) - 0.5) * f.body.width * 1.8;
        const y = baseY - u * (h + 20) + 4;
        ctx.fillStyle = i % 3 === 0 ? `rgba(255,255,220,${1 - u})` : `rgba(255,${150 + (i % 4) * 25},20,${0.8 * (1 - u)})`;
        const sz = 2 + (i % 3);
        ctx.fillRect(Math.round(x), Math.round(y), sz, sz + 2);
      }
    },

    // King Sirven: a golden crown that never leaves his head, and royal sparkles.
    royalAura(f, ctx, floorY, frame, layer) {
      const sp = f.def.sprite, U = sp.scale;
      const baseY = floorY - f.y;
      if (layer === 'back') {
        for (let i = 0; i < 6; i++) {
          const life = (frame * 0.6 + i * 23) % 50, u = life / 50;
          if (u > 0.8) continue;
          const x = f.x + (RF.util.hash(i * 5.1) - 0.5) * f.body.width * 1.5, y = baseY - 10 - u * f.body.height;
          ctx.fillStyle = i % 2 ? '#ffe680' : '#ffffff';
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
          if (frame % 20 < 10) { ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); }
        }
        return;
      }
      if (f.isKO || f.state === 'thrown' || f.state === 'finished') return;
      // crown on the top of his head
      // follow the head as the puppet animates
      const [anim, fr] = f.animFrame();
      const recipes = (sp.poses && sp.poses[anim]) || RF.PUPPET_POSES[anim] || [{}];
      const rc = recipes[Math.min(fr, recipes.length - 1)] || {};
      if (rc.rotate) return;
      const [hx, hy] = rc.head || [0, 0];
      const [cc, cr] = sp.crownAt;
      const cx = Math.round(f.x + f.facing * ((cc + 0.5 - sp.footCol) * U + hx));
      const cy = Math.round(baseY - (sp.grid.length - cr) * U + hy + (rc.crouch ? sp.crouchDrop * U : 0));
      ctx.fillStyle = '#111'; ctx.fillRect(cx - 8, cy - 9, 16, 10);
      ctx.fillStyle = '#e8b420'; ctx.fillRect(cx - 7, cy - 4, 14, 4);                    // band
      ctx.fillRect(cx - 7, cy - 8, 3, 4); ctx.fillRect(cx - 1, cy - 9, 3, 5); ctx.fillRect(cx + 4, cy - 8, 3, 4); // points
      ctx.fillStyle = '#fff2a0'; ctx.fillRect(cx - 6, cy - 4, 12, 1);
      ctx.fillStyle = '#d02030'; ctx.fillRect(cx - 1, cy - 3, 2, 2);                     // ruby
      ctx.fillStyle = '#2a6ae0'; ctx.fillRect(cx - 5, cy - 3, 1, 1); ctx.fillRect(cx + 4, cy - 3, 1, 1);
    },

    // Lady Landa's aura: dark purple smoke rising off her, red glow from her eyes.
    // Called twice per frame: layer 'back' (smoke, behind her) and 'front' (eye glow).
    darkAura(f, ctx, floorY, frame, layer) {
      const h = f.body.height, baseY = floorY - f.y;
      if (layer === 'back') {
        ctx.fillStyle = 'rgba(60,0,90,0.18)';
        ctx.beginPath(); ctx.ellipse(Math.round(f.x), baseY, f.body.width, 4, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 12; i++) {
          const life = (frame * 0.8 + i * 17) % 60, u = life / 60;
          const x = f.x + (RF.util.hash(i * 3.3) - 0.5) * f.body.width * 1.6 + Math.sin((frame + i * 25) / 12) * 3;
          const y = baseY - u * (h + 16);
          ctx.fillStyle = `rgba(${70 + (i % 3) * 20},0,${100 + (i % 2) * 40},${0.45 * (1 - u)})`;
          const sz = 3 + (i % 3);
          ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
        }
        return;
      }
      // eyes (sprite.eye = [col, row] in the drawing): pulse a red glow
      const [ec, er] = f.def.sprite.eye || [0, 0];
      const ex = f.x + f.facing * (ec + 0.5 - f.def.sprite.footCol), ey = baseY - (f.def.sprite.grid.length - er) + (f.crouching ? f.def.sprite.crouchDrop : 0);
      if (f.isKO || f.state === 'thrown' || f.state === 'finished') return;
      const a = 0.25 + 0.2 * Math.sin(frame / 6);
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 7);
      g.addColorStop(0, `rgba(255,40,20,${a + 0.3})`);
      g.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ex - 7, ey - 7, 14, 14);
    },

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

  // A rolling shockwave along the floor (Mr. Dabalsa's stomps). Bigger shots = bigger waves.
  RF.PROJECTILE_ART.shockwave = function (ctx, x, y, t, dir, p) {
    const s = p ? p.w / 12 : 1, floor = y + (p ? p.h / 2 : 6);
    for (let i = 0; i < 3; i++) {
      const h = Math.round((10 + i * 4) * s), w = Math.round((5 + i * 3) * s);
      ctx.fillStyle = ['rgba(255,240,200,0.9)', 'rgba(200,160,110,0.7)', 'rgba(120,90,60,0.5)'][i];
      ctx.fillRect(Math.round(x - dir * i * 4 * s - w / 2), Math.round(floor - h), w, h);
    }
    for (let i = 0; i < 4; i++) { // flying debris
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(Math.round(x - dir * (6 + i * 5)), Math.round(floor - 6 - ((t * 3 + i * 7) % 14) * s), 2, 2);
    }
  };

  // Holbrook's URBAN SPRAWL: a city erupting out of the ground and spreading forward,
  // skyscrapers at the leading edge, suburbs sprawling out behind.
  RF.PROJECTILE_ART.sprawl = function (ctx, x, y, t, dir, p, floorY) {
    const bottom = floorY - p.y, H = p.h, W = p.w;
    // cracked ground under the wave
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(Math.round(x - dir * (W / 2 + 40)), bottom - 1, W + 40, 3);
    // suburbs left behind (little houses)
    for (let i = 1; i <= 5; i++) {
      const hx = Math.round(x - dir * (W / 2 + i * 9)), hh = 5 + (i % 2) * 2;
      ctx.fillStyle = '#111'; ctx.fillRect(hx - 4, bottom - hh - 1, 9, hh + 1);
      ctx.fillStyle = ['#c86a40', '#d8b070', '#a0a8b0'][i % 3]; ctx.fillRect(hx - 3, bottom - hh, 7, hh);
      ctx.fillStyle = '#7a2a18'; ctx.fillRect(hx - 4, bottom - hh - 3, 9, 3);
    }
    // the skyline: buildings get taller toward the leading edge
    const n = Math.max(3, Math.round(W / 7));
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), bw = 6 + (i % 3);
      const bh = Math.round(H * (0.35 + 0.65 * u) * (0.75 + 0.25 * RF.util.hash(i * 7.1)) * Math.min(1, t / 8));
      const bx = Math.round(x - dir * W / 2 + dir * u * W) - (dir < 0 ? bw : 0);
      ctx.fillStyle = '#0a0a10'; ctx.fillRect(bx - 1, bottom - bh - 1, bw + 2, bh + 1);
      ctx.fillStyle = ['#4a5a78', '#5a6a88', '#3a4a64', '#6a6a7a'][i % 4]; ctx.fillRect(bx, bottom - bh, bw, bh);
      ctx.fillStyle = '#ffe080';                                           // lit windows
      for (let wy = bottom - bh + 3; wy < bottom - 3; wy += 4) for (let wx = bx + 1; wx < bx + bw - 1; wx += 3)
        if (RF.util.hash(wx * 3.1 + wy * 1.7 + Math.floor(t / 10)) > 0.45) ctx.fillRect(wx, wy, 1, 2);
      if (i === n - 1 && bh > 30) { ctx.fillStyle = '#ff3030'; ctx.fillRect(bx + Math.floor(bw / 2), bottom - bh - 5, 1, 4); } // antenna light
    }
    // dust thrown up at the leading edge
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(160,130,100,${0.5 - i * 0.07})`;
      ctx.fillRect(Math.round(x + dir * (W / 2 + 2 + i * 3)), bottom - 4 - ((t + i * 5) % 10), 3, 3);
    }
  };

  // King Sirven's pink DETENTION slip, fluttering as it flies.
  RF.PROJECTILE_ART.detentionSlip = function (ctx, x, y, t, dir) {
    const tilt = Math.round(Math.sin(t / 3) * 2);
    ctx.fillStyle = '#111'; ctx.fillRect(x - 13, y - 7 + tilt, 26, 14);
    ctx.fillStyle = '#ff9ac8'; ctx.fillRect(x - 12, y - 6 + tilt, 24, 12);
    ctx.fillStyle = '#d0507a'; ctx.fillRect(x - 12, y - 6 + tilt, 24, 2);
    RF.font.drawText(ctx, 'DETENTION', x, y - 3 + tilt, { align: 'center', color: '#5a0a2a' });
    ctx.fillStyle = 'rgba(255,154,200,0.35)';
    for (let i = 1; i <= 3; i++) ctx.fillRect(Math.round(x - dir * (14 + i * 5)), Math.round(y - 2 + i), 4, 1);
  };

  RF.PROJECTILE_ART.voidOrb = function (ctx, x, y, t, dir) {
    // Lady Landa's purple energy blast: swirling violet orb with a black core.
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
    g.addColorStop(0, 'rgba(230,160,255,0.9)');
    g.addColorStop(0.45, 'rgba(150,40,220,0.55)');
    g.addColorStop(1, 'rgba(80,0,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - 16, 32, 32);
    for (let i = 1; i <= 6; i++) { // trailing sparks
      ctx.fillStyle = i % 2 ? 'rgba(200,120,255,0.6)' : 'rgba(120,40,200,0.5)';
      ctx.fillRect(Math.round(x - dir * (6 + i * 4)), Math.round(y + Math.sin((t + i) * 0.9) * 4), 2, 2);
    }
    ctx.fillStyle = '#1a0628'; ctx.fillRect(x - 4, y - 4, 8, 8);           // dark core
    ctx.fillStyle = '#f0d0ff'; ctx.fillRect(x - 2, y - 2, 3, 3);
    for (let i = 0; i < 4; i++) {                                           // orbiting motes
      const a = t * 0.4 + (i * Math.PI) / 2;
      ctx.fillStyle = '#e8b0ff';
      ctx.fillRect(Math.round(x + Math.cos(a) * 9), Math.round(y + Math.sin(a) * 6), 2, 2);
    }
  };

  // Shared geometry for block effects: centre in front of the fighter, size from the hurtbox.
  function guardBox(f, floorY) {
    const hurt = f.getHurtbox();
    if (!hurt) return null;
    return {
      hurt, base: floorY - f.y, top: floorY - f.y - hurt.h,
      mid: floorY - f.y - hurt.h / 2, front: f.x + f.facing * (f.body.width / 2 + 4),
      strength: f.shieldHit > 0 ? f.shieldHit / 12 : 0,
    };
  }

  RF.BLOCK_FX = {
    // Holbrook: SOVEREIGN BORDER - a towering wall of glowing border lines with continent
    // outlines inside it. Attackers who hit it get shoved back across the border.
    sovereignBorder(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const h = Math.round(g.hurt.h * 1.35), w = 30, fl = g.strength;
      const x = Math.round(g.front + f.facing * 8 - w / 2), top = g.base - h;
      ctx.save();
      // the glowing field
      ctx.fillStyle = `rgba(40,200,180,${0.16 + fl * 0.3})`; ctx.fillRect(x, top, w, h);
      // latitude / longitude grid
      ctx.strokeStyle = `rgba(120,255,230,${0.25 + fl * 0.3})`;
      for (let yy = top + 6; yy < g.base; yy += 10) { ctx.beginPath(); ctx.moveTo(x, yy + 0.5); ctx.lineTo(x + w, yy + 0.5); ctx.stroke(); }
      for (let xx = x + 5; xx < x + w; xx += 10) { ctx.beginPath(); ctx.moveTo(xx + 0.5, top); ctx.lineTo(xx + 0.5, g.base); ctx.stroke(); }
      // continent outlines drifting through it
      const CONT = [
        [[0, 0], [5, -2], [9, 1], [8, 6], [10, 11], [6, 16], [3, 12], [1, 6]],          // africa-ish
        [[0, 0], [4, 0], [7, 3], [5, 8], [3, 14], [1, 10], [-1, 4]],                    // south america-ish
        [[0, 0], [8, -1], [12, 2], [9, 5], [4, 6], [1, 3]],                             // eurasia-ish
      ];
      ctx.strokeStyle = `rgba(200,255,120,${0.75 + fl * 0.25})`;
      CONT.forEach((pts, i) => {
        const ox = x + 4 + (i % 2) * 12, oy = top + 8 + ((frame * 0.3 + i * 28) % (h - 20));
        ctx.beginPath(); pts.forEach(([px, py], j) => (j ? ctx.lineTo : ctx.moveTo).call(ctx, ox + px, oy + py)); ctx.closePath(); ctx.stroke();
      });
      // the border itself: thick dashed lines on both edges, glowing
      ctx.setLineDash([5, 3]); ctx.lineDashOffset = frame / 2;
      ctx.strokeStyle = fl > 0.3 ? '#ffffff' : '#ff4060'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 0.5, top); ctx.lineTo(x + 0.5, g.base); ctx.moveTo(x + w - 0.5, top); ctx.lineTo(x + w - 0.5, g.base); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
      // border posts with little flags on top
      for (const px of [x, x + w]) {
        ctx.fillStyle = '#e8e0d0'; ctx.fillRect(px - 1, top - 8, 2, 8);
        ctx.fillStyle = (frame >> 3) % 2 ? '#d02020' : '#c01818'; ctx.fillRect(px + 1, top - 8, 5, 3);
      }
      ctx.restore();
      if (fl > 0.4) RF.font.drawText(ctx, 'SOVEREIGN BORDER', f.x, top - 20, { align: 'center', color: '#80ffe0', outline: '#000' });
    },

    // King Sirven: a gold royal shield with his crown crest.
    royalShield(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const w = 24, h = Math.round(g.hurt.h * 0.5);
      const x = Math.round(g.front + f.facing * 6 - w / 2), y = Math.round(g.mid - h / 2 - 8);
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.moveTo(x - 1, y - 1); ctx.lineTo(x + w + 1, y - 1); ctx.lineTo(x + w + 1, y + h * 0.6); ctx.lineTo(x + w / 2, y + h + 2); ctx.lineTo(x - 1, y + h * 0.6); ctx.fill();
      ctx.fillStyle = g.strength > 0.3 ? '#fff2a0' : '#e8b420';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * 0.6); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h * 0.6); ctx.fill();
      ctx.fillStyle = '#7a1020'; ctx.fillRect(x + 3, y + 3, w - 6, Math.round(h * 0.45));      // royal red field
      ctx.fillStyle = '#e8b420';                                                              // crown crest
      ctx.fillRect(x + w / 2 - 6, y + 10, 12, 3); ctx.fillRect(x + w / 2 - 6, y + 6, 2, 4); ctx.fillRect(x + w / 2 - 1, y + 5, 2, 5); ctx.fillRect(x + w / 2 + 4, y + 6, 2, 4);
      if (g.strength > 0.4) RF.font.drawText(ctx, 'DETENTION!', x + w / 2, y - 12, { align: 'center', color: '#ff9ac8', outline: '#000' });
    },

    // Mr. Dabalsa: the Complete Works of Shakespeare, held open as a shield.
    bookGuard(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const flap = g.strength > 0 ? Math.round(Math.sin(frame * 1.3) * 3) : 0;
      const w = 30, h = Math.round(g.hurt.h * 0.45);
      const x = Math.round(g.front + f.facing * 6 - w / 2), y = Math.round(g.mid - h / 2 - 14);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = '#6c201c'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);         // cover
      ctx.fillStyle = '#f0e6cc'; ctx.fillRect(x + 1, y + 1 + flap, w / 2 - 2, h - 2); // left page
      ctx.fillStyle = '#e6dabc'; ctx.fillRect(x + w / 2 + 1, y + 1 - flap, w / 2 - 2, h - 2); // right page
      ctx.fillStyle = '#3a1a10'; ctx.fillRect(x + w / 2 - 1, y, 2, h);             // spine
      ctx.fillStyle = 'rgba(60,30,20,0.55)';
      for (let i = 0; i < Math.floor((h - 6) / 4); i++) {                          // lines of verse
        ctx.fillRect(x + 3, y + 4 + i * 4 + flap, w / 2 - 6 - (i % 3) * 2, 1);
        ctx.fillRect(x + w / 2 + 3, y + 4 + i * 4 - flap, w / 2 - 6 - ((i + 1) % 3) * 2, 1);
      }
      ctx.fillStyle = '#eb9128'; ctx.fillRect(x - 1, y - 1, w + 2, 1); ctx.fillRect(x - 1, y + h, w + 2, 1); // gilt edges
      if (g.strength > 0.4) RF.font.drawText(ctx, 'ALAS!', x + w / 2, y - 12, { align: 'center', color: '#e8dcc0', outline: '#000' });
    },

    // Bruiser: a dented steel cafeteria tray held up as a shield. Clang!
    lunchTray(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const shake = g.strength > 0 ? (frame % 2 ? 2 : -2) : 0;
      const x = Math.round(g.front + shake), h = Math.round(g.hurt.h * 0.55), y = Math.round(g.mid - h / 2 - 6);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 3, y - 1, 7, h + 2);
      ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x - 2, y, 5, h);
      ctx.fillStyle = '#d8dce0'; ctx.fillRect(x - 1, y + 2, 1, h - 4);       // shine
      ctx.fillStyle = '#6a7078'; ctx.fillRect(x, y + Math.round(h * 0.3), 2, 3); // dent
      ctx.fillStyle = '#b05020'; ctx.fillRect(x + f.facing * 1, y + Math.round(h * 0.65), 1, 3); // old ketchup
      if (g.strength > 0.5) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + f.facing * 4, y + h / 2 - 4, 2, 8); }
    },

    // Viper: three ninja stars spinning in a wall in front of him.
    shurikenWall(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const spin = frame * (0.4 + g.strength * 0.6);
      for (let i = 0; i < 3; i++) {
        const cx = g.front + f.facing * 2, cy = g.top + 10 + i * (g.hurt.h - 20) / 2;
        for (let k = 0; k < 4; k++) {
          const a = spin + (k * Math.PI) / 2 + i;
          RF.electric.line(ctx, cx, cy, cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 3, '#111');
          RF.electric.line(ctx, cx, cy, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 1, '#c8d0d8');
        }
        ctx.fillStyle = '#2e8b3e'; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);
      }
    },

    // Jauregui: a giant glowing protractor.
    protractorShield(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const r = g.hurt.h / 2 + 4, cx = f.x + f.facing * 6, cy = g.mid;
      ctx.fillStyle = `rgba(255,230,120,${0.12 + g.strength * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, f.facing < 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = g.strength > 0.3 ? '#ffffff' : '#ffe080';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, f.facing < 0); ctx.stroke();
      ctx.lineWidth = 1;
      for (let d = 0; d <= 180; d += 15) { // degree ticks
        const a = -Math.PI / 2 + (d / 180) * Math.PI, len = d % 45 === 0 ? 6 : 3;
        const ca = Math.cos(a) * f.facing, sa = Math.sin(a);
        RF.electric.line(ctx, cx + ca * r, cy + sa * r, cx + ca * (r - len), cy + sa * (r - len), 1, '#ffe080');
      }
      RF.font.drawText(ctx, g.strength > 0 ? '0' : '90', cx + f.facing * (r - 12), cy - 4, { align: 'center', color: '#ffe080', outline: '#000' });
    },

    // Dr. Astuto: the Constitution, unrolled in front of him like a shield.
    constitutionScroll(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const flutter = g.strength > 0 ? Math.round(Math.sin(frame) * 2) : 0;
      const w = 22, h = Math.round(g.hurt.h * 0.62);
      const x = Math.round(g.front + f.facing * 4 - w / 2 + flutter), y = Math.round(g.mid - h / 2 - 4);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = '#e8d8a8'; ctx.fillRect(x, y, w, h);                          // parchment
      ctx.fillStyle = '#c8b078'; ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y + h - 3, w, 3); // rolled ends
      ctx.fillStyle = '#6a4a20'; ctx.fillRect(x - 2, y - 2, w + 4, 2); ctx.fillRect(x - 2, y + h, w + 4, 2);
      RF.font.drawText(ctx, 'WE', x + w / 2, y + 6, { align: 'center', color: '#3a2a10' });
      RF.font.drawText(ctx, 'THE', x + w / 2, y + 15, { align: 'center', color: '#3a2a10' });
      ctx.fillStyle = 'rgba(60,40,10,0.6)';
      for (let i = 0; i < Math.floor((h - 34) / 4); i++) ctx.fillRect(x + 3, y + 26 + i * 4, w - 6 - (i % 3) * 3, 1); // writing
      if (g.strength > 0.4) RF.font.drawText(ctx, 'DENIED', x + w / 2, y - 10, { align: 'center', color: '#c01818', outline: '#000' });
    },

    // El Escobedo: a hard-light force field of glowing hexagons.
    hexBarrier(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const cols = 2, rows = Math.max(3, Math.round(g.hurt.h / 14));
      const x0 = g.front + f.facing * 2, s = 7;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = x0 + f.facing * (c * s * 1.5), cy = g.top + 6 + r * s * 1.7 + (c % 2) * s * 0.85;
          const lit = g.strength > 0.2 || RF.util.hash(r * 7 + c + Math.floor(frame / 6)) > 0.2;
          ctx.strokeStyle = lit ? `rgba(110,200,255,${0.55 + g.strength * 0.45})` : 'rgba(60,120,200,0.25)';
          ctx.fillStyle = `rgba(80,170,255,${0.1 + g.strength * 0.25})`;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3;
            const px = cx + Math.cos(a) * s, py = cy + Math.sin(a) * s;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    },

    // Lady Landa: a giant ghostly serpent rears up in front of her. Lunges and hisses when hit.
    serpentGuard(f, ctx, floorY, frame) {
      const hurt = f.getHurtbox();
      if (!hurt) return;
      const strike = f.shieldHit > 0 ? f.shieldHit / 12 : 0;
      const base = floorY - f.y, top = base - hurt.h - 8;
      const cx = f.x + f.facing * 16;
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14, y = base - u * (base - top);
        pts.push([cx + f.facing * Math.sin(u * Math.PI * 2 + frame / 10) * 5, y]);
      }
      const L = RF.electric.line;
      for (let i = 1; i < pts.length; i++) {
        const w = Math.round(9 - i * 0.35);
        L(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w + 2, 'rgba(10,30,15,0.7)');
        L(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, i % 2 ? 'rgba(60,150,90,0.75)' : 'rgba(40,120,70,0.75)');
      }
      // head: lunges forward with its mouth open when something hits the guard
      const [hx0, hy] = pts[pts.length - 1];
      const hx = hx0 + f.facing * (4 + strike * 14);
      ctx.fillStyle = '#0a1e0f'; ctx.fillRect(Math.round(hx - 7), Math.round(hy - 6), 14, 10);
      ctx.fillStyle = '#4aa86a'; ctx.fillRect(Math.round(hx - 6), Math.round(hy - 5), 12, 8);
      ctx.fillStyle = '#ff2010'; ctx.fillRect(Math.round(hx + f.facing * 2), Math.round(hy - 4), 2, 2);  // eye
      if (strike > 0 || frame % 40 < 8) {                                                               // tongue / fangs
        ctx.fillStyle = '#d02040'; ctx.fillRect(Math.round(f.facing > 0 ? hx + 6 : hx - 12), Math.round(hy + 1), 6, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(hx + f.facing * 4), Math.round(hy + 3), 1, 3);
      }
    },

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
