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

  RF.FINISHERS = {
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
