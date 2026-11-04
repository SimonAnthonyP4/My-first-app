// FINISHERS. When the match-deciding blow lands, the loser is left dazed and
// the screen yells FINISH THEM! Walk up and press THROW to do your finisher.
// (Any normal hit, or waiting too long, just knocks them out instead.)
//
// characters.js -> `finisher: '<id>'`. Each finisher:
//   name, duration (frames)
//   update(att, vic, t, scene)               poses/moves the fighters, sounds, shakes
//   drawVictim(vic, ctx, floorY, t, frame)    draws the victim (replaces their sprite)
//   drawFx(att, vic, ctx, floorY, t, frame)   optional extra effects on top
(function () {
  const el = () => RF.electric;

  // Draw the victim's sprite in a pose, optionally tinted (e.g. white flash, green slime).
  function drawPose(vic, ctx, x, footY, pose, tint, alpha = 1) {
    vic.sprite.draw(ctx, pose[0], pose[1], x, footY, vic.facing);
    if (tint) {
      ctx.globalAlpha = alpha;
      vic.sprite.draw(ctx, pose[0], pose[1], x, footY, vic.facing, tint);
      ctx.globalAlpha = 1;
    }
  }

  // Upside down, feet at feetY, head pointing down.
  function drawUpsideDown(vic, ctx, x, feetY) {
    ctx.save();
    ctx.translate(0, feetY);
    ctx.scale(1, -1);
    vic.sprite.draw(ctx, 'hit', 0, x, 0, vic.facing);
    ctx.restore();
  }

  // X-ray skeleton, sized to the fighter.
  function skeleton(ctx, x, footY, h, facing) {
    const L = el().line, bone = '#f4f0dc', s = h / 76;
    const neck = footY - h * 0.78, hip = footY - h * 0.45;
    const skullR = Math.round(6 * s);
    ctx.fillStyle = bone;
    for (let dy = -skullR; dy <= skullR; dy++) {
      for (let dx = -skullR; dx <= skullR; dx++) {
        if (dx * dx + dy * dy <= skullR * skullR) ctx.fillRect(Math.round(x + dx), Math.round(neck - skullR - 1 + dy), 1, 1);
      }
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(x + facing * 2 - 1), Math.round(neck - skullR - 2), 2, 2); // eye socket
    ctx.fillRect(Math.round(x + facing * 4 - 1), Math.round(neck - skullR + 2), 3, 1); // teeth gap
    L(ctx, x, neck, x, hip, 2, bone); // spine
    for (let i = 0; i < 4; i++) {     // ribs
      const y = neck + 4 + i * 4 * s;
      L(ctx, x - 7 * s, y + 1, x + 7 * s, y + 1, 1, bone);
    }
    L(ctx, x - 6 * s, hip, x + 6 * s, hip, 2, bone); // pelvis
    L(ctx, x - 4 * s, hip, x - 6 * s, footY - 1, 2, bone); // legs
    L(ctx, x + 4 * s, hip, x + 6 * s, footY - 1, 2, bone);
    L(ctx, x - 7 * s, neck + 2, x - 10 * s, hip - 2, 2, bone); // arms
    L(ctx, x + 7 * s, neck + 2, x + 12 * s, neck - 6 * s, 2, bone);
  }

  // Chalk dust puff.
  function chalk(ctx, x, y, frame, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = RF.util.hash(i * 3.7 + Math.floor(frame / 3)) * Math.PI * 2, r = 2 + RF.util.hash(i + frame) * 6;
      ctx.fillStyle = 'rgba(240,240,230,0.7)';
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2);
    }
  }

  // Tricorn hat, for founding-father moments.
  function tricorn(ctx, x, y, facing) {
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 15, y + 2, 30, 6);
    ctx.fillRect(x - 10, y - 4, 20, 7);
    ctx.fillRect(x - 17, y, 5, 4); ctx.fillRect(x + 12, y, 5, 4); // upturned corners
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(x - 15, y + 7, 30, 1);
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x + facing * 8 - 1, y - 2, 3, 3); // cockade
  }

  // Red, white and blue fireworks bursts.
  function fireworks(ctx, t, bursts) {
    const colors = ['#ff3a2a', '#ffffff', '#4a7aff'];
    for (const [t0, x, y, ci] of bursts) {
      const a = t - t0;
      if (a < 0 || a > 30) continue;
      if (a < 6) { ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x, y + (6 - a) * 8, 2, 4); continue; } // rocket
      const r = (a - 6) * 2.2, fade = a > 22 && a % 2;
      if (fade) continue;
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        ctx.fillStyle = colors[(ci + i) % 3];
        ctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r + (a - 6) * 0.3), 2, 2);
      }
    }
  }

  // A 1950s Havana classic car (facing right; flipped for the other direction).
  function classicCar(ctx, x, floorY, facing, built, frame, driver) {
    // built: 0..1, how many parts have arrived
    ctx.save();
    ctx.translate(Math.round(x), floorY);
    ctx.scale(facing * 1.4, 1.4); // big enough to fit a grown teacher
    const part = (n) => built >= n;
    if (part(0.2)) { // body with tail fins
      ctx.fillStyle = '#111'; ctx.fillRect(-36, -22, 72, 16); ctx.fillRect(-38, -26, 8, 6);
      ctx.fillStyle = '#3ac8c0'; ctx.fillRect(-35, -21, 70, 14); ctx.fillRect(-37, -25, 6, 5);
      ctx.fillStyle = '#e8f0f0'; ctx.fillRect(-30, -16, 58, 2);                 // side stripe
    }
    if (part(0.4)) { // white roof and windows
      ctx.fillStyle = '#111'; ctx.fillRect(-20, -35, 34, 14);
      ctx.fillStyle = '#f4f4f0'; ctx.fillRect(-19, -34, 32, 13);
      ctx.fillStyle = '#7ac8e8'; ctx.fillRect(-16, -32, 12, 9); ctx.fillRect(-2, -32, 12, 9);
      if (driver) driver(ctx); // his head in the window
    }
    if (part(0.6)) { // chrome bumpers and headlight
      ctx.fillStyle = '#d8dce0'; ctx.fillRect(33, -12, 6, 5); ctx.fillRect(-40, -12, 6, 5);
      ctx.fillStyle = '#fff6b0'; ctx.fillRect(33, -20, 3, 4);
    }
    if (part(0.8)) { // whitewall wheels
      for (const wx of [-22, 20]) {
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(wx, -6, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(wx, -6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9aa0a8'; ctx.fillRect(wx - 1 + (frame % 2), -7, 2, 2);
      }
    }
    ctx.restore();
  }

  RF.FINISHERS = {
    // El Escobedo: builds a Havana classic car from spare parts, then floors it. DALE!
    havanaClassic: {
      name: 'Havana Classic',
      duration: 200,
      setup(att, vic) {
        const b = att.scene.stageDef.bounds;
        // Build the car behind him, with room to drive at the victim.
        const back = att.x - att.facing * 70;
        this.startX = Math.max(b.left + 40, Math.min(b.right - 40, back));
        this.hitX = vic.x;
      },
      carX(t) {
        if (t < 60) return this.startX;
        const u = Math.min(1, (t - 60) / 24);
        return this.startX + (this.hitX + 20 * Math.sign(this.hitX - this.startX || 1) - this.startX) * u * u;
      },
      update(att, vic, t, scene) {
        if (t === 1) this.setup(att, vic); // finisher time starts at 1
        att.finisherAnim = t < 50 ? ['light', Math.floor(t / 5) % 2] : ['idle', 0];
        if (t < 50 && t % 10 === 2) { RF.audio.sfx('drill'); scene.effects.spawn('hit', this.startX + (Math.random() - 0.5) * 50, 14 + Math.random() * 20); }
        if (t === 52) { att.hidden = true; RF.audio.sfx('honk'); }  // hops in
        if (t === 60) RF.audio.sfx('engine');
        if (t === 84) {
          RF.audio.sfx('heavy'); RF.audio.sfx('ko');
          scene.shake = 16; scene.flash = 4;
          scene.effects.spawnText('DALE!', vic.x, vic.body.height + 30, '#ffd040');
        }
        if (t === 150) { // pops back out next to his car
          att.hidden = false;
          att.x = this.carX(t) - Math.sign(this.hitX - this.startX || 1) * 46;
        }
        att.finisherAnim = t >= 150 ? ['victory', Math.floor(t / 15) % 2] : att.finisherAnim;
      },
      drawVictim(vic, ctx, floorY, t) {
        if (t < 84) return drawPose(vic, ctx, vic.x, floorY, ['hit', 0]);
        // Launched off the top of the screen, spinning
        const a = t - 84, dir = Math.sign(this.hitX - this.startX || 1);
        const x = vic.x + dir * a * 3, y = floorY - a * a * 0.12 - a * 5;
        if (y < -40) return;
        ctx.save();
        ctx.translate(x, y - vic.body.height / 2);
        ctx.rotate(a * 0.35 * dir);
        vic.sprite.draw(ctx, 'ko', 0, 0, vic.body.height / 2, vic.facing);
        ctx.restore();
      },
      drawFx(att, vic, ctx, floorY, t, frame) {
        const dir = Math.sign(this.hitX - this.startX || 1);
        const built = Math.min(1, t / 50);
        const x = this.carX(t);
        // parts flying in while he builds
        if (t < 50) {
          for (let i = 0; i < 4; i++) {
            const p = ((t + i * 12) % 24) / 24;
            const sx = x + (i % 2 ? -140 : 140) * (1 - p), sy = floorY - 60 * (1 - p) - 20;
            ctx.fillStyle = ['#3ac8c0', '#d8dce0', '#111', '#f4f4f0'][i];
            ctx.fillRect(Math.round(sx), Math.round(sy), 6, 4);
          }
        }
        const driver = t >= 52 && t < 150 ? (c) => { c.fillStyle = '#f7a870'; c.fillRect(-1, -31, 8, 7); c.fillStyle = '#211d1d'; c.fillRect(-1, -33, 8, 3); } : null;
        classicCar(ctx, x, floorY, dir, built, frame, driver);
        if (t >= 60 && t < 90) { // exhaust and speed lines
          ctx.fillStyle = 'rgba(160,160,160,0.6)';
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x - dir * (40 + i * 7)), floorY - 8 - (i % 2) * 3, 5, 4);
        }
        if (t >= 120 && t < 160 && t % 6 < 4) { // the victim's twinkle as they leave orbit
          const sx = vic.x + dir * 120;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(sx) - 4, 30, 9, 1); ctx.fillRect(Math.round(sx), 26, 1, 9);
        }
        if (t >= 84 && t < 150) RF.font.drawText(ctx, 'DALE!', RF.CONFIG.WIDTH / 2, 70, { scale: 5, align: 'center', outline: '#000',
          color: ['#ffffff', '#fff6b0', '#ffe060', '#ffc030', '#ff9a10', '#ff7000', '#e04000'] });
      },
    },


    // Dr. Astuto: tricorn on, the Liberty Bell drops on them, it cracks, fireworks. 1776!
    libertyBell: {
      name: 'Liberty Bell',
      duration: 210,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 44 ? ['throw', 1] : t < 150 ? ['idle', 0] : ['victory', Math.floor(t / 15) % 2];
        if (t === 4) scene.effects.spawnText('GIVE ME LIBERTY!', att.x, att.body.height + 22, '#ffffff');
        if (t === 22) RF.audio.sfx('whoosh');
        if (t === 42) { RF.audio.sfx('bell'); scene.shake = 18; scene.flash = 6; for (let i = -2; i <= 2; i++) scene.effects.spawn('dust', vic.x + i * 12, 1); }
        if (t === 70) { RF.audio.sfx('heavy'); scene.shake = 6; }  // the famous crack
        if (t === 76) RF.audio.sfx('bell');
        if (t >= 90 && t < 190 && t % 18 === 0) RF.audio.sfx('firework');
      },
      drawVictim(vic, ctx, floorY, t) {
        if (t < 42) drawPose(vic, ctx, vic.x, floorY, ['hit', 0]); // then they're under the bell
      },
      drawFx(att, vic, ctx, floorY, t) {
        const W = RF.CONFIG.WIDTH;
        tricorn(ctx, Math.round(att.x + att.facing * 8), Math.round(floorY - att.body.height - 4), att.facing);
        if (t < 20) return;
        // The bell: falls, then sits over the victim, cracked.
        const p = Math.min(1, (t - 20) / 22);
        const x = Math.round(vic.x), bottom = Math.round(-30 + (floorY + 30) * p * p);
        ctx.fillStyle = `rgba(0,0,0,${0.2 + p * 0.3})`;
        ctx.beginPath(); ctx.ellipse(x, floorY + 1, 26 * (0.4 + p * 0.6), 3, 0, 0, Math.PI * 2); ctx.fill();
        const sway = t > 42 && t < 90 ? Math.round(Math.sin((t - 42) / 4) * (1 - (t - 42) / 48) * 2) : 0;
        ctx.save();
        ctx.translate(x + sway, bottom);
        ctx.fillStyle = '#4a2a10'; ctx.fillRect(-20, -66, 40, 8);  // wooden yoke
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.moveTo(-15, -58); ctx.lineTo(15, -58); ctx.lineTo(19, -30); ctx.lineTo(27, -4); ctx.lineTo(27, 0); ctx.lineTo(-27, 0); ctx.lineTo(-27, -4); ctx.lineTo(-19, -30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#9a6a2a';
        ctx.beginPath(); ctx.moveTo(-14, -57); ctx.lineTo(14, -57); ctx.lineTo(18, -30); ctx.lineTo(25, -5); ctx.lineTo(-25, -5); ctx.lineTo(-18, -30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c8924a'; ctx.fillRect(-10, -54, 4, 44);     // shine
        ctx.fillStyle = '#6a4418'; ctx.fillRect(-26, -6, 52, 3);       // lip
        ctx.fillStyle = '#6a4418'; ctx.fillRect(-16, -48, 32, 2);      // inscription band
        if (t >= 70) {                                                // THE CRACK
          ctx.fillStyle = '#1a0e04';
          [[2, -30], [4, -26], [3, -22], [6, -18], [5, -14], [7, -10], [6, -6]].forEach(([cx, cy]) => ctx.fillRect(cx, cy, 2, 4));
        }
        ctx.restore();
        if (t >= 90) {
          fireworks(ctx, t, [[90, 70, 50, 0], [104, 300, 40, 1], [118, 180, 30, 2], [130, 110, 70, 1], [144, 260, 60, 0], [158, 190, 45, 1], [170, 60, 35, 2], [178, 320, 55, 0]]);
        }
        if (t >= 120) {
          RF.font.drawText(ctx, '1776', W / 2, 92, { scale: 4, align: 'center', outline: '#000',
            color: ['#ff3a2a', '#ff3a2a', '#ffffff', '#ffffff', '#ffffff', '#4a7aff', '#4a7aff'] });
        }
      },
    },


    // Jauregui: slaps a giant red F on them, then erases them from existence.
    failingGrade: {
      name: 'Final Grade: F',
      duration: 180,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 18 ? ['throw', 1] : t < 30 ? ['throw', 2] : t < 140 ? ['block', 0] : ['victory', Math.floor(t / 15) % 2];
        if (t === 22) { RF.audio.sfx('heavy'); scene.shake = 10; scene.flash = 3; } // STAMP
        if (t === 40) RF.audio.sfx('gong');
        if (t >= 50 && t < 130 && t % 10 === 0) RF.audio.sfx('whoosh'); // erasing
        if (t === 132) RF.audio.sfx('ko');
      },
      drawVictim(vic, ctx, floorY, t, frame) {
        const H = vic.body.height, top = floorY - H - 6;
        // Erased from the top down, starting once the grade is in.
        const erased = t < 50 ? 0 : Math.min(1, (t - 50) / 80);
        const cut = top + (H + 8) * erased;
        if (erased < 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, cut, RF.CONFIG.WIDTH, floorY + 10 - cut);
          ctx.clip();
          drawPose(vic, ctx, vic.x, floorY, ['hit', 0]);
          ctx.restore();
          if (erased > 0) {
            // The eraser rubbing along the cut line, chalk dust flying
            const ex = vic.x + Math.sin(t / 2) * 10;
            ctx.fillStyle = '#d8c8a0'; ctx.fillRect(Math.round(ex) - 9, Math.round(cut) - 5, 18, 6);
            ctx.fillStyle = '#4a3a2a'; ctx.fillRect(Math.round(ex) - 9, Math.round(cut) - 8, 18, 3);
            chalk(ctx, ex, cut, frame, 8);
          }
        }
        // The grade: a big red F stamped on them, left behind on the floor.
        if (t >= 22) {
          const s = t < 26 ? 6 - (t - 22) : 4;
          const fy = erased >= 1 ? floorY - 30 : floorY - H * 0.65;
          RF.font.drawText(ctx, 'F', vic.x, fy - s * 3, { scale: s, align: 'center', color: '#d01010', outline: '#ffffff' });
          if (t > 40) RF.font.drawText(ctx, erased >= 1 ? 'ABOLISHED' : 'SEE ME AFTER CLASS', vic.x, fy - s * 3 - 12, { align: 'center', color: '#ffffff', outline: '#000' });
        }
      },
      drawFx(att, vic, ctx, floorY, t) {
        if (t < 8 || t >= 22) return;
        // The graded paper flying from her hand to the victim
        const p = (t - 8) / 14;
        const x = att.x + (vic.x - att.x) * p, y = floorY - 70 + Math.sin(p * Math.PI) * -12;
        ctx.fillStyle = '#000'; ctx.fillRect(Math.round(x) - 7, Math.round(y) - 9, 14, 18);
        ctx.fillStyle = '#f4f0e0'; ctx.fillRect(Math.round(x) - 6, Math.round(y) - 8, 12, 16);
        ctx.fillStyle = '#d01010'; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 6, 2, 8); ctx.fillRect(Math.round(x) - 3, Math.round(y) - 6, 6, 2); ctx.fillRect(Math.round(x) - 3, Math.round(y) - 2, 4, 2);
      },
    },


    // Dr. Weissenberg: fried until you can see the skeleton, then a pile of ash.
    overcharge: {
      name: 'Overcharge',
      duration: 170,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 15 ? ['special', 0] : t < 110 ? ['special', 1] : ['victory', Math.floor(t / 15) % 2];
        if (t === 15) RF.audio.sfx('bolt');
        if (t >= 15 && t < 105) {
          if (t % 8 === 0) { scene.shake = 6; scene.flash = 2; }
          if (t % 20 === 0) RF.audio.sfx('zap');
          if (t % 6 === 0) scene.effects.spawn('zap', vic.x + (Math.random() - 0.5) * 20, 10 + Math.random() * vic.body.height);
        }
        if (t === 105) { RF.audio.sfx('ko'); scene.flash = 8; scene.shake = 14; }
      },
      drawVictim(vic, ctx, floorY, t, frame) {
        const x = vic.x, footY = floorY;
        if (t < 15) return drawPose(vic, ctx, x, footY, ['hit', 0]);
        if (t < 105) {
          if (frame % 6 < 3) {
            drawPose(vic, ctx, x, footY, ['hit', 0], '#0a1430', 0.9); // dark silhouette...
            skeleton(ctx, x, footY, vic.body.height, vic.facing);     // ...with the bones lit up
          } else {
            drawPose(vic, ctx, x, footY, ['hit', 0], '#ffffff', 0.8);
          }
          return;
        }
        // Pile of ash, settling, with dying embers and smoke.
        const p = Math.min(1, (t - 105) / 10);
        if (p < 1) skeleton(ctx, x, footY, vic.body.height * (1 - p), vic.facing);
        const w = 26 * p, colors = ['#1e1a18', '#2e2824', '#423a34'];
        colors.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.fillRect(Math.round(x - w / 2 + i * 3), Math.round(footY - 3 * p * (3 - i)), Math.max(0, Math.round(w - i * 6)), Math.round(3 * p));
        });
        for (let i = 0; i < 6; i++) {
          if (RF.util.hash(i * 7 + Math.floor(frame / 6)) > 0.5) {
            ctx.fillStyle = i % 2 ? '#ff7a10' : '#ffd040';
            ctx.fillRect(Math.round(x - 10 + RF.util.hash(i) * 20), Math.round(footY - 2 - RF.util.hash(i + 3) * 6), 1, 1);
          }
        }
        for (let i = 0; i < 5; i++) { // smoke
          const life = (frame * 0.5 + i * 13) % 50;
          ctx.fillStyle = `rgba(120,120,120,${0.35 * (1 - life / 50)})`;
          ctx.fillRect(Math.round(x - 6 + RF.util.hash(i + 9) * 12 + Math.sin((frame + i * 20) / 9) * 3), Math.round(footY - 8 - life), 3, 3);
        }
      },
      drawFx(att, vic, ctx, floorY, t, frame) {
        if (t < 15 || t >= 105) return;
        const E = el();
        const hx = att.x + att.facing * 20, hy = floorY - att.y - 44;
        const seed = Math.floor(frame / 2) * 11.3;
        E.glow(ctx, hx, hy, 22, 0.8);
        for (let i = 0; i < 3; i++) E.bolt(ctx, [hx, hy], [vic.x, floorY - 14 - i * 22], { seed: seed + i * 40, amp: 8, thick: 1, forks: 3 });
        // Lightning from the sky
        if (frame % 10 < 5) E.bolt(ctx, [vic.x + (RF.util.hash(seed) - 0.5) * 60, 0], [vic.x, floorY - vic.body.height], { seed: seed + 99, amp: 12, thick: 1.4, forks: 5 });
        E.glow(ctx, vic.x, floorY - vic.body.height / 2, 30, 0.5);
      },
    },

    // Bruiser: leaps up and drives them head-first into the floor.
    pileDriver: {
      name: 'Pile Driver',
      duration: 160,
      update(att, vic, t, scene) {
        if (t < 12) att.finisherAnim = ['throw', 0];
        else if (t < 44) {
          att.finisherAnim = ['throw', 1];
          att.y = t < 36 ? Math.sin(((t - 12) / 24) * (Math.PI / 2)) * 62 : 62 * (1 - (t - 36) / 8);
        } else if (t === 44) {
          att.y = 0;
          att.finisherAnim = ['throw', 2];
          scene.shake = 18;
          scene.flash = 4;
          RF.audio.sfx('heavy');
          RF.audio.sfx('ko');
          for (let i = -2; i <= 2; i++) scene.effects.spawn('dust', vic.x + i * 12, 1);
          scene.effects.spawn('shock', vic.x, 4);
        } else if (t > 100) att.finisherAnim = ['victory', Math.floor(t / 15) % 2];
        if (t === 12) RF.audio.sfx('whoosh');
        // The victim's final resting place: right in front of him.
        vic.x = att.x + att.facing * ((att.body.width + vic.body.width) / 2 + 2);
      },
      drawVictim(vic, ctx, floorY, t, frame, att) {
        const H = vic.body.height;
        if (t < 12) return drawPose(vic, ctx, vic.x, floorY, ['hit', 0]);
        if (t < 44) {
          // Held upside down above his head
          const feetY = floorY - att.y - att.body.height + 4 - H;
          return drawUpsideDown(vic, ctx, att.x + att.facing * 4, feetY);
        }
        // Buried head-first: only the legs stick out, kicking for a moment.
        const wiggle = t < 90 ? Math.round(Math.sin(t * 0.9) * 2 * (1 - (t - 44) / 46)) : 0;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, RF.CONFIG.WIDTH, floorY + 1);
        ctx.clip();
        drawUpsideDown(vic, ctx, vic.x + wiggle, floorY - H * 0.42);
        ctx.restore();
        ctx.fillStyle = '#1a1010'; // cracked floor around them
        ctx.fillRect(Math.round(vic.x - 14), floorY - 1, 28, 2);
        ctx.fillRect(Math.round(vic.x - 18), floorY + 1, 8, 1);
        ctx.fillRect(Math.round(vic.x + 10), floorY + 1, 9, 1);
      },
    },

    // Viper: spits a glob of venom and the victim melts into a puddle of goo.
    venomMelt: {
      name: 'Venom Melt',
      duration: 170,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 14 ? ['special', 0] : t < 30 ? ['special', 1] : t > 120 ? ['victory', Math.floor(t / 15) % 2] : ['idle', 0];
        if (t === 14) RF.audio.sfx('special');
        if (t === 24) { RF.audio.sfx('hit'); scene.effects.spawn('hit', vic.x, vic.body.height * 0.6); }
        if (t === 70) RF.audio.sfx('ko');
      },
      drawVictim(vic, ctx, floorY, t, frame) {
        const x = vic.x;
        const green = Math.max(0, Math.min(1, (t - 24) / 46));
        const melt = Math.max(0, Math.min(1, (t - 70) / 60));
        // Puddle grows as they melt
        if (melt > 0) {
          const pw = 8 + melt * 26;
          ctx.fillStyle = '#1e6a14';
          ctx.beginPath(); ctx.ellipse(x, floorY, pw, 2 + melt * 3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#5ad03a';
          ctx.beginPath(); ctx.ellipse(x - 2, floorY - 1, pw * 0.7, 1 + melt * 2, 0, 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 4; i++) { // bubbles
            if (RF.util.hash(i * 5 + Math.floor(frame / 8)) > 0.55) {
              ctx.fillStyle = '#b8ff8a';
              ctx.fillRect(Math.round(x - pw * 0.6 + RF.util.hash(i * 3) * pw * 1.2), floorY - 3 - (frame % 8 < 4 ? 1 : 0), 2, 2);
            }
          }
        }
        if (melt >= 1) return;
        ctx.save();
        ctx.translate(x, floorY);
        ctx.scale(1 + melt * 0.6, 1 - melt * 0.94);
        drawPose(vic, ctx, 0, 0, ['hit', 0], green > 0 ? '#4cff3a' : null, green * 0.75);
        ctx.restore();
        if (green > 0 && melt < 0.8) { // drips
          ctx.fillStyle = '#4cff3a';
          for (let i = 0; i < 5; i++) {
            const dy = ((frame * 0.8 + i * 9) % 20);
            ctx.fillRect(Math.round(x - 8 + i * 4), Math.round(floorY - vic.body.height * (1 - melt) * 0.6 + dy), 1, 2);
          }
        }
      },
      drawFx(att, vic, ctx, floorY, t) {
        if (t < 14 || t >= 24) return;
        const p = (t - 14) / 10;
        const x = att.x + (vic.x - att.x) * p, y = floorY - 46 + Math.sin(p * Math.PI) * -10;
        ctx.fillStyle = '#000'; ctx.fillRect(Math.round(x) - 6, Math.round(y) - 5, 12, 10);
        ctx.fillStyle = '#7cff4a'; ctx.fillRect(Math.round(x) - 5, Math.round(y) - 4, 10, 8);
        ctx.fillStyle = '#d8ff9a'; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 4, 3);
      },
    },
  };
})();
