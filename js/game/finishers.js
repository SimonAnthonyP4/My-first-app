// FINISHERS. When the match-deciding blow lands, the loser is left dazed and
// the screen yells FINISH THEM! Walk up and press THROW to do your finisher.
// (Any normal hit, or waiting too long, just knocks them out instead.)
//
// characters.js -> `finisher: '<id>'`. Each finisher:
//   name, duration (frames)
//   update(att, vic, t, scene)               poses/moves the fighters, sounds, shakes
//   drawVictim(vic, ctx, floorY, t, frame)    draws the victim (replaces their sprite)
//   drawFx(att, vic, ctx, floorY, t, frame)   optional extra effects on top
//   drawBack(att, vic, ctx, floorY, t, frame) optional effects behind the fighters
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

  // A big glass specimen jar. fill = how much preserving fluid (0..1).
  function specimenJar(ctx, x, bottom, w, h, lid, fill, frame) {
    x = Math.round(x); bottom = Math.round(bottom);
    ctx.fillStyle = 'rgba(180,210,220,0.22)'; ctx.fillRect(x - w / 2, bottom - h, w, h); // glass
    if (fill > 0) {
      ctx.fillStyle = 'rgba(140,200,90,0.35)';
      ctx.fillRect(x - w / 2 + 1, bottom - Math.round(h * fill), w - 2, Math.round(h * fill));
      for (let i = 0; i < 4; i++) { // bubbles
        const by = bottom - ((frame * 0.7 + i * 11) % Math.max(1, h * fill));
        ctx.fillStyle = 'rgba(220,255,200,0.6)';
        ctx.fillRect(x - w / 2 + 4 + i * (w / 5), Math.round(by), 2, 2);
      }
    }
    ctx.fillStyle = '#111';
    ctx.fillRect(x - w / 2 - 1, bottom - h, 1, h); ctx.fillRect(x + w / 2, bottom - h, 1, h); ctx.fillRect(x - w / 2, bottom, w, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - w / 2 + 3, bottom - h + 4, 2, h - 10); // glint
    if (lid) {
      ctx.fillStyle = '#111'; ctx.fillRect(x - w / 2 - 2, bottom - h - 7, w + 4, 8);
      ctx.fillStyle = '#5a5048'; ctx.fillRect(x - w / 2 - 1, bottom - h - 6, w + 2, 6);
    }
  }

  // A brown bear, mid-charge (facing right).
  function bear(ctx, x, floorY, facing, frame) {
    ctx.save();
    ctx.translate(Math.round(x), floorY);
    ctx.scale(facing * 1.6, 1.6); // a big bear
    const leg = frame % 8 < 4 ? 2 : -2;
    ctx.fillStyle = '#111'; ctx.fillRect(-22, -32, 44, 22); ctx.fillRect(14, -36, 16, 16);
    ctx.fillStyle = '#6a4224'; ctx.fillRect(-21, -31, 42, 20);                 // body
    ctx.fillStyle = '#5a3418'; ctx.fillRect(-21, -18, 42, 6);
    ctx.fillStyle = '#6a4224'; ctx.fillRect(15, -35, 14, 14);                  // head
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(25, -29, 6, 6);                    // snout
    ctx.fillStyle = '#111'; ctx.fillRect(29, -29, 2, 2); ctx.fillRect(22, -33, 2, 2); // nose, eye
    ctx.fillStyle = '#5a3418'; ctx.fillRect(15, -38, 4, 4); ctx.fillRect(23, -38, 4, 4); // ears
    ctx.fillStyle = '#ffffff'; ctx.fillRect(26, -24, 1, 2); ctx.fillRect(29, -24, 1, 2); // teeth
    ctx.fillStyle = '#4a2a10';                                                  // legs
    ctx.fillRect(-18 + leg, -11, 7, 11); ctx.fillRect(-8 - leg, -11, 7, 11);
    ctx.fillRect(6 + leg, -11, 7, 11); ctx.fillRect(14 - leg, -11, 7, 11);
    ctx.restore();
  }

  // Red theatre curtains. open: 0 = closed, 1 = fully open.
  function curtains(ctx, open) {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT, half = W / 2;
    const w = Math.round(half * (1 - open));
    for (const [x0, dir] of [[0, 1], [W, -1]]) {
      const x = dir > 0 ? x0 : x0 - w;
      ctx.fillStyle = '#7a0a14'; ctx.fillRect(x, 0, w, H);
      ctx.fillStyle = '#9a1a24';
      for (let i = 0; i < w; i += 12) ctx.fillRect(x + i, 0, 4, H);              // folds
      ctx.fillStyle = '#c8a040'; ctx.fillRect(x, H - 10, w, 2);                  // gold trim
    }
    ctx.fillStyle = '#5a0a10'; ctx.fillRect(0, 0, W, 10);                         // valance
    ctx.fillStyle = '#c8a040'; ctx.fillRect(0, 10, W, 2);
  }

  // A golden throne (drawn behind the king).
  function throne(ctx, x, floorY, rise) {
    const h = Math.round(70 * rise);
    if (h <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, RF.CONFIG.WIDTH, floorY); ctx.clip();
    const top = floorY - h;
    ctx.fillStyle = '#111'; ctx.fillRect(x - 21, top - 1, 42, h + 1);
    ctx.fillStyle = '#c8961e'; ctx.fillRect(x - 20, top, 40, h);
    ctx.fillStyle = '#8a1424'; ctx.fillRect(x - 14, top + 8, 28, h - 30);           // red velvet back
    ctx.fillStyle = '#e8b420'; ctx.fillRect(x - 20, top, 40, 4); ctx.fillRect(x - 24, floorY - 26, 48, 6); // trim + seat
    ctx.fillRect(x - 3, top - 6, 6, 6);                                             // finial
    ctx.restore();
  }

  RF.FINISHERS = {
    // Nicholas: FINAL BELL - ding ding, a blur of punches, a star punch into orbit, a 10-count.
    // Fernando: LAST DRAG - one long drag, flicks the cigarette onto them, they catch fire... BOOM.
    // He lights a fresh one off what's left. HEH HEH HEH.
    lastDrag: {
      name: 'Last Drag',
      duration: 230,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 40 ? ['taunt', 0] : t < 56 ? ['special', 0] : t < 70 ? ['special', 1] : t < 200 ? ['idle', (t >> 4) % 2] : ['victory', (t >> 3) % 2];
        if (t === 10) scene.effects.spawnText('*LONG DRAG*', att.x, att.body.height + 24, '#c8c8c8');
        if (t === 56) { RF.audio.sfx('whoosh'); scene.effects.spawnText('HEH.', att.x, att.body.height + 22, '#ff9ac8'); }
        if (t === 72) { RF.audio.sfx('hiss'); scene.effects.spawnText('TSSSSS...', vic.x, vic.body.height + 14, '#ff9020'); }
        if (t === 130) { RF.audio.sfx('boom'); scene.shake = 18; scene.flash = 8; }
        if (t === 150) scene.effects.spawnText('SMOKING HOT.', att.x, att.body.height + 24, '#ff7020');
        if (t === 175) { RF.audio.sfx('laugh'); scene.effects.spawnText('HEH HEH HEH HEH.', att.x, att.body.height + 34, '#ff9ac8'); }
      },
      drawVictim(vic, ctx, floorY, t, frame, att) {
        if (t < 130) {
          drawPose(vic, ctx, vic.x, floorY, ['dazed', 0], t > 72 ? '#ff6010' : null, t > 72 ? 0.3 + 0.2 * Math.sin(t / 2) : 0);
          if (t > 72) for (let i = 0; i < 10; i++) { // on fire
            const a = (t * 3 + i * 17) % 40, x = vic.x + ((i * 7) % 24) - 12, y = floorY - ((i * 13) % vic.body.height) - a * 0.5;
            ctx.fillStyle = a < 15 ? '#ffd040' : a < 28 ? '#ff7020' : '#c02010';
            ctx.fillRect(Math.round(x), Math.round(y), 2, 3);
          }
          if (t >= 56 && t < 72 && att) { // the cigarette arcing over
            const u = (t - 56) / 16, x = att.x + (vic.x - att.x) * u, y = floorY - 80 - Math.sin(u * Math.PI) * 30 + u * 30;
            RF.PROJECTILE_ART.cigarette(ctx, x, y, t, Math.sign(vic.x - att.x) || 1);
          }
          return;
        }
        // after the boom: a charred, smoking silhouette lying there
        ctx.save(); ctx.translate(Math.round(vic.x), floorY); ctx.scale(1, 0.35);
        vic.sprite.draw(ctx, 'ko', 1, 0, 0, vic.facing, '#1a1210');
        ctx.restore();
        for (let i = 0; i < 4; i++) { const a = (t + i * 15) % 60; ctx.globalAlpha = 0.5 - a / 120; ctx.fillStyle = '#909090'; ctx.fillRect(Math.round(vic.x - 10 + i * 7 + Math.sin(a / 8) * 2), Math.round(floorY - 6 - a * 0.6), 2, 2); }
        ctx.globalAlpha = 1;
      },
      drawFx(att, vic, ctx, floorY, t) {
        if (t < 130 || t > 160) return;
        const u = t - 130, r = 10 + u * 2.2;
        ctx.globalAlpha = Math.max(0, 1 - u / 30);
        ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(vic.x, floorY - 30, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6010'; ctx.beginPath(); ctx.arc(vic.x, floorY - 30, r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(vic.x, floorY - 30, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        if (u < 25) RF.font.drawText(ctx, 'KABOOM!', vic.x, floorY - 90, { scale: 2, align: 'center', color: '#ffd040', outline: '#000' });
      },
    },

    // Tyler: TEE TIME - they shrink down into a golf ball on a tee. Waggle, waggle... FORE!
    // A huge drive into the sky, and it drops into the cup across the screen. HOLE IN ONE!
    teeTime: {
      name: 'Tee Time',
      duration: 230,
      update(att, vic, t, scene) {
        if (t === 1) { this.startX = att.x; this.ballX = vic.x; }
        if (t < 40) att.x = this.startX + (this.ballX - att.facing * 26 - this.startX) * Math.min(1, t / 30);
        att.finisherAnim = t < 30 ? ['walk', (t >> 3) % 4] : t < 72 ? ['light', (t >> 3) % 2 ? 0 : 2] : t < 78 ? ['special', 0] : t < 150 ? ['special', 1] : ['victory', (t >> 3) % 2];
        if (t === 12) RF.audio.sfx('special');
        if (t === 45 || t === 55 || t === 65) RF.audio.sfx('move');
        if (t === 72) scene.effects.spawnText('FORE!', att.x, att.body.height + 24, '#ffffff');
        if (t === 80) { RF.audio.sfx('heavy'); RF.audio.sfx('boom'); scene.shake = 10; scene.flash = 4; }
        if (t === 150) { RF.audio.sfx('applause'); RF.announcer.say('HOLE IN ONE!'); }
        if (t === 150) scene.effects.spawnText('HOLE IN ONE!', RF.CONFIG.WIDTH / 2, 120, '#80ffb0');
        if (t === 175) scene.effects.spawnText('NO STRESS, BRO.', att.x, att.body.height + 24, '#ffffff');
      },
      drawVictim(vic, ctx, floorY, t) {
        if (t < 40) { // shrinking down...
          const k = Math.max(0.08, 1 - t / 40);
          ctx.save(); ctx.translate(Math.round(vic.x), floorY); ctx.scale(k, k);
          vic.sprite.draw(ctx, 'dazed', 0, 0, 0, vic.facing);
          ctx.restore();
          return;
        }
        const ball = (x, y) => {
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        };
        const x0 = this.ballX || vic.x;
        if (t < 80) { // ...into a golf ball on a tee
          ctx.fillStyle = '#e8d8a0'; ctx.fillRect(Math.round(x0), floorY - 4, 1, 4);
          return ball(Math.round(x0), floorY - 7);
        }
        const u = t - 80, dir = Math.sign(vic.x - (this.startX || 0)) || 1;
        const holeX = Math.max(20, Math.min(RF.CONFIG.WIDTH - 20, x0 + dir * 90));
        if (u < 70) { // up into the sky and down into the cup
          const p = u / 70, x = x0 + (holeX - x0) * p, y = floorY - 7 - Math.sin(p * Math.PI) * 170;
          ball(Math.round(x), Math.round(y));
        }
      },
      drawFx(att, vic, ctx, floorY, t) {
        if (t < 80) return;
        const x0 = this.ballX || vic.x, dir = Math.sign(vic.x - (this.startX || 0)) || 1;
        const hx = Math.round(Math.max(20, Math.min(RF.CONFIG.WIDTH - 20, x0 + dir * 90)));
        // the flag and the cup
        ctx.fillStyle = '#111'; ctx.fillRect(hx - 6, floorY - 2, 12, 3);
        ctx.fillStyle = '#e8e8e8'; ctx.fillRect(hx, floorY - 40, 1, 40);
        ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.moveTo(hx + 1, floorY - 40); ctx.lineTo(hx + 15, floorY - 35 + Math.sin(t / 5)); ctx.lineTo(hx + 1, floorY - 30); ctx.fill();
      },
    },

    finalBell: {
      name: 'Final Bell',
      duration: 240,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 14 ? ['idle', 0] : t < 84 ? [(t >> 2) % 2 ? 'light' : 'heavy', 1] : t < 100 ? ['uppercut', 1] : ['victory', (t >> 3) % 2];
        if (t === 2 || t === 10) RF.audio.sfx('bell');
        if (t >= 14 && t < 84 && t % 4 === 0) { RF.audio.sfx('hit'); scene.shake = 3; scene.effects.spawn('hit', vic.x - att.facing * 6, 30 + (t % 3) * 10); }
        if (t === 90) { RF.audio.sfx('super'); RF.audio.sfx('boom'); scene.shake = 16; scene.flash = 6; scene.effects.spawnText('MAX GAINS!', att.x, att.body.height + 26, '#ffd030'); }
        for (let n = 1; n <= 10; n++) if (t === 110 + n * 10) { scene.effects.spawnText(n === 10 ? '10... K.O.!' : String(n), RF.CONFIG.WIDTH / 2, 130, n === 10 ? '#ff4040' : '#ffffff'); RF.audio.sfx(n === 10 ? 'bell' : 'move'); }
      },
      drawVictim(vic, ctx, floorY, t) {
        if (t < 90) return drawPose(vic, ctx, vic.x + (t >= 14 && t % 4 < 2 ? 2 : -2) * Math.sign(vic.facing || 1), floorY, ['hit', 0]);
        const u = t - 90, y = floorY - u * u * 0.35 - u * 4; // straight up into orbit
        if (y < -80) return;
        ctx.save(); ctx.translate(Math.round(vic.x), Math.round(y)); ctx.rotate(u * 0.4);
        vic.sprite.draw(ctx, 'hit', 0, 0, vic.body.height / 2, vic.facing);
        ctx.restore();
      },
      drawFx(att, vic, ctx, floorY, t) {
        if (t < 14) { // ring ropes flash in
          ctx.fillStyle = '#c01818'; for (let i = 0; i < 3; i++) ctx.fillRect(0, floorY - 30 - i * 16, RF.CONFIG.WIDTH, 2);
        }
        if (t >= 130 && t < 230) { // twinkle where they left the atmosphere
          const x = Math.round(vic.x), r = t % 10 < 5 ? 5 : 3;
          ctx.fillStyle = '#fff'; ctx.fillRect(x - r, 14, r * 2 + 1, 1); ctx.fillRect(x, 14 - r, 1, r * 2 + 1);
        }
      },
    },

    // Tamayo: IMPEACHMENT - a giant gavel comes down three times. ORDER! ORDER! IMPEACHED!
    impeachment: {
      name: 'Impeachment',
      duration: 220,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 140 ? ['idle', 0] : ['victory', (t >> 3) % 2]; // arms crossed while the gavel works
        [40, 80, 120].forEach((hitT, i) => {
          if (t === hitT) {
            scene.shake = 10 + i * 4; scene.flash = 3; RF.audio.sfx('boom'); RF.audio.sfx('clang');
            scene.effects.spawnText(['ORDER!', 'ORDER!!', 'IMPEACHED!'][i], vic.x, 120 - i * 6, i === 2 ? '#ff4040' : '#ffffff');
          }
        });
        if (t === 150 || t === 175) RF.audio.sfx('laugh');
        if (t === 160) scene.effects.spawnText('HA HA HA! CASE CLOSED.', att.x, att.body.height + 20, '#ff9a40');
      },
      drawVictim(vic, ctx, floorY, t) {
        const squash = t < 40 ? 1 : t < 80 ? 0.75 : t < 120 ? 0.5 : 0.3; // flatter with every strike
        ctx.save(); ctx.translate(Math.round(vic.x), floorY); ctx.scale(1 + (1 - squash) * 0.6, squash);
        vic.sprite.draw(ctx, 'hit', 0, 0, 0, vic.facing);
        ctx.restore();
      },
      drawFx(att, vic, ctx, floorY, t) {
        if (t >= 140) return;
        const cycle = (t % 40) / 40, x = Math.round(vic.x);
        const up = cycle < 0.6 ? cycle / 0.6 : 1 - (cycle - 0.6) / 0.4; // raise slowly, slam fast
        const headY = Math.round(floorY - vic.body.height * (t < 80 ? 0.9 : 0.6) - 20 - up * 60);
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 3, headY - 70, 6, 70);          // handle
        ctx.fillStyle = '#111'; ctx.fillRect(x - 23, headY - 1, 46, 22);
        ctx.fillStyle = '#7a4a20'; ctx.fillRect(x - 22, headY, 44, 20);              // head of the gavel
        ctx.fillStyle = '#c8961e'; ctx.fillRect(x - 22, headY + 3, 44, 3); ctx.fillRect(x - 22, headY + 14, 44, 3);
      },
    },

    // Ruano: MASTERPIECE - she paints the loser into a gilded museum painting, plaque and all.
    masterpiece: {
      name: 'Masterpiece',
      duration: 230,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 30 ? ['idle', 0] : t < 120 ? ['light', (t >> 2) % 2 ? 1 : 2] : ['victory', (t >> 3) % 2];
        if (t === 4) RF.audio.sfx('bell');
        if (t > 30 && t < 120 && t % 10 === 0) RF.audio.sfx('paper');
        if (t === 130) { RF.audio.sfx('perfect'); scene.flash = 4; }
        if (t === 170) RF.audio.sfx('applause');
      },
      drawVictim(vic, ctx, floorY, t) {
        // fades into the canvas as she paints
        const a = t < 30 ? 1 : Math.max(0, 1 - (t - 30) / 90);
        if (a > 0) drawPose(vic, ctx, vic.x, floorY, ['hit', 0], null, a);
      },
      drawFx(att, vic, ctx, floorY, t, frame) {
        const x0 = Math.round(vic.x + Math.sign(vic.x - att.x || 1) * 22), w = 70, h = 96, top = floorY - h - 8; // clear of the painter
        const grow = Math.min(1, t / 26);
        // the gilded frame materializing around them
        ctx.save(); ctx.globalAlpha = grow;
        ctx.fillStyle = '#111'; ctx.fillRect(x0 - w / 2 - 6, top - 6, w + 12, h + 12);
        ctx.fillStyle = '#c8961e'; ctx.fillRect(x0 - w / 2 - 5, top - 5, w + 10, h + 10);
        ctx.fillStyle = '#ffd860'; ctx.fillRect(x0 - w / 2 - 5, top - 5, w + 10, 2);
        ctx.restore();
        // the canvas: transparent at first, filling in with paint strokes
        const paint = Math.min(1, Math.max(0, (t - 30) / 90));
        ctx.fillStyle = `rgba(236,222,190,${0.25 + paint * 0.75})`; ctx.fillRect(x0 - w / 2, top, w, h);
        if (paint > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(x0 - w / 2, top, w, h); ctx.clip();
          ctx.globalAlpha = paint;
          ctx.fillStyle = '#5a7ab0'; ctx.fillRect(x0 - w / 2, top, w, h * 0.45);       // sky
          ctx.fillStyle = '#c89a50'; ctx.fillRect(x0 - w / 2, top + h * 0.45, w, h * 0.55); // Spanish plain
          drawPose(vic, ctx, x0, top + h - 4, ['ko', 0], null, paint);                // the subject: them
          ctx.restore();
        }
        if (t > 30 && t < 120) for (let i = 0; i < 4; i++) { // flicks of paint off the brush
          ctx.fillStyle = ['#d02a2a', '#f0c020', '#2a5ad0', '#2a9a4a'][(i + (t >> 2)) % 4];
          ctx.fillRect(Math.round(x0 - w / 2 + ((t * 7 + i * 23) % w)), Math.round(top + ((t * 5 + i * 31) % h)), 3, 2);
        }
        if (t >= 130) { // museum plaque + spotlight
          ctx.fillStyle = 'rgba(255,250,220,0.12)'; ctx.beginPath(); ctx.moveTo(x0 - 10, 0); ctx.lineTo(x0 + 10, 0); ctx.lineTo(x0 + w / 2 + 14, floorY); ctx.lineTo(x0 - w / 2 - 14, floorY); ctx.fill();
          ctx.fillStyle = '#111'; ctx.fillRect(x0 - 41, top - 26, 82, 16);
          ctx.fillStyle = '#c8961e'; ctx.fillRect(x0 - 40, top - 25, 80, 14);
          RF.font.drawText(ctx, '"THE DEFEATED"', x0, top - 22, { align: 'center', color: '#2a1a08' });
          RF.font.drawText(ctx, 'RUANO, OIL ON CANVAS', x0, top - 36, { align: 'center', color: '#ffe680', outline: '#000' });
        }
      },
    },

    // Chris: BOUGHT OUT - he snaps his fingers and an avalanche of cash buries the loser.
    boughtOut: {
      name: 'Bought Out',
      duration: 220,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 24 ? ['throw', 1] : t < 150 ? ['idle', 0] : ['victory', (t >> 3) % 2];
        if (t === 20) RF.audio.sfx('cash');
        if (t > 30 && t < 110 && t % 10 === 0) RF.audio.sfx('paper');
        if (t === 110) { RF.audio.sfx('heavy'); scene.shake = 10; }
        if (t === 150) RF.audio.sfx('cash');
      },
      drawVictim(vic, ctx, floorY, t) { if (t < 96) drawPose(vic, ctx, vic.x, floorY, ['hit', 0]); },
      drawFx(att, vic, ctx, floorY, t, frame) {
        const x0 = Math.round(vic.x + Math.sign(vic.x - att.x || 1) * 18); // the pile lands on them, not on him
        // bills raining down
        if (t > 26 && t < 120) for (let i = 0; i < 40; i++) {
          const y = ((t - 26) * 4 + i * 37) % (floorY + 20) - 20, x = x0 - 50 + ((i * 29) % 100) + Math.sin(t / 5 + i) * 4;
          ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(t * 0.1 + i);
          ctx.fillStyle = '#111'; ctx.fillRect(-4, -2, 9, 5); ctx.fillStyle = i % 5 ? '#9ac070' : '#e8b420'; ctx.fillRect(-3, -1, 7, 3);
          ctx.restore();
        }
        // the pile of cash growing over them
        const pile = Math.min(1, Math.max(0, (t - 40) / 70)), ph = Math.round(pile * 70);
        if (ph > 0) {
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(x0, floorY, 46, ph + 1, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#7aa050'; ctx.beginPath(); ctx.ellipse(x0, floorY, 45, ph, 0, Math.PI, 0); ctx.fill();
          for (let i = 0; i < 36; i++) { // individual bills and coins in the pile
            const a = Math.PI + (i / 36) * Math.PI, rr = (0.3 + (i * 7 % 10) / 14) ;
            ctx.fillStyle = i % 4 ? '#9ac070' : '#e8b420';
            ctx.fillRect(Math.round(x0 + Math.cos(a) * 42 * rr), Math.round(floorY + Math.sin(a) * ph * rr), 6, 3);
          }
        }
        if (t >= 110) { // the BOUGHT OUT stamp
          const s = t < 116 ? 2 - (t - 110) / 6 : 1;
          ctx.save(); ctx.translate(x0, floorY - 90); ctx.rotate(-0.2); ctx.scale(s, s);
          ctx.strokeStyle = '#ffd030'; ctx.lineWidth = 2; ctx.strokeRect(-46, -9, 92, 18); ctx.lineWidth = 1;
          RF.font.drawText(ctx, 'BOUGHT OUT', 0, -4, { align: 'center', color: '#ffd030', outline: '#000' });
          ctx.restore();
        }
      },
    },

    // Anthony: BULK ORDER - a portal opens and a whole shipment of BRO BATCH crates
    // buries the loser. Stamped DELIVERED. He floats down onto the pile with a bar.
    bulkOrder: {
      name: 'Bulk Order',
      duration: 220,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 120 ? ['throw', 1] : ['victory', (t >> 3) % 2];
        if (t === 2) RF.audio.sfx('arcane');
        for (let i = 0; i < 9; i++) if (t === 30 + i * 8) { RF.audio.sfx(i === 8 ? 'boom' : 'stomp'); scene.shake = i === 8 ? 14 : 5; }
        if (t === 112) { RF.audio.sfx('heavy'); scene.effects.spawnText('DELIVERED!', vic.x, 100, '#ff4060'); }
        if (t === 170) RF.audio.sfx('applause');
      },
      drawVictim(vic, ctx, floorY, t) { if (t < 70) drawPose(vic, ctx, vic.x, floorY, ['hit', 0]); },
      drawFx(att, vic, ctx, floorY, t, frame) {
        const x0 = Math.round(vic.x + Math.sign(vic.x - att.x || 1) * 16), top = 52; // the pile lands on them, clear of him
        if (t < 120) { // the portal
          const o = Math.min(1, t / 20), c = t > 100 ? Math.max(0, 1 - (t - 100) / 20) : 1;
          ctx.fillStyle = 'rgba(40,0,20,0.85)'; ctx.beginPath(); ctx.ellipse(x0, top, 50 * o * c, 10 * o * c, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ff70a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x0, top, 50 * o * c + 1, 10 * o * c + 1, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
        }
        // crates stacking into a pyramid: 4 on the bottom, 3, then 2
        const SPOTS = [[-36, 0], [-12, 0], [12, 0], [36, 0], [-24, 1], [0, 1], [24, 1], [-12, 2], [12, 2]];
        SPOTS.forEach(([dx, row], i) => {
          const land = 30 + i * 8, u = Math.min(1, Math.max(0, (t - land + 14) / 14));
          if (u <= 0) return;
          const y = top + (floorY - 22 - row * 22 - top) * u * u, x = x0 + dx;
          ctx.fillStyle = '#111'; ctx.fillRect(x - 12, y - 1, 24, 23);
          ctx.fillStyle = '#b8864a'; ctx.fillRect(x - 11, y, 22, 21);
          ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 11, y + 7, 22, 1); ctx.fillRect(x - 11, y + 14, 22, 1);
          RF.font.drawText(ctx, 'BRO', x, y + 2, { align: 'center', color: '#1a1a22' });
          RF.font.drawText(ctx, 'BATCH', x, y + 11, { align: 'center', color: '#c0204a' });
        });
        if (t >= 112) { // the DELIVERED stamp
          const s = t < 118 ? 2 - (t - 112) / 6 : 1;
          ctx.save(); ctx.translate(x0, floorY - 50); ctx.rotate(-0.25); ctx.scale(s, s);
          ctx.strokeStyle = '#e02040'; ctx.lineWidth = 2; ctx.strokeRect(-40, -9, 80, 18); ctx.lineWidth = 1;
          RF.font.drawText(ctx, 'DELIVERED', 0, -4, { align: 'center', color: '#e02040' });
          ctx.restore();
        }
        if (t >= 140) RF.drawProteinBar(ctx, att.x + att.facing * 14, floorY - att.body.height * 0.55 - 14, 1, 0); // a well-earned snack
      },
    },

    // Simon: THE ART OF EIGHT LIMBS - fists, elbows, knees and shins, counted out
    // one by one, then a final kick that sends them into the sky.
    eightLimbs: {
      name: 'Art of Eight Limbs',
      duration: 210,
      update(att, vic, t, scene) {
        const LIMBS = [['FIST', 'light'], ['FIST', 'light'], ['ELBOW', 'light'], ['ELBOW', 'light'], ['KNEE', 'uppercut'], ['KNEE', 'uppercut'], ['SHIN', 'heavy'], ['SHIN', 'heavy']];
        const i = Math.floor((t - 20) / 11), sub = (t - 20) % 11;
        att.finisherAnim = t < 20 ? ['idle', (t >> 2) % 4] : i < 8 ? [LIMBS[i][1], sub < 4 ? 1 : 2] : t < 150 ? ['heavy', 1] : ['victory', (t >> 3) % 2];
        if (t >= 20 && i < 8 && sub === 0) {
          scene.effects.spawn(i >= 6 ? 'heavy' : 'hit', vic.x - att.facing * 6, 30 + (i % 3) * 12);
          scene.effects.spawnText((i + 1) + '! ' + LIMBS[i][0], vic.x, vic.body.height + 8 + (i % 2) * 10, i >= 6 ? '#ff4040' : '#ffd060');
          scene.shake = 4 + i; scene.hitstop = 0;
          RF.audio.sfx(i >= 6 ? 'heavy' : 'hit');
        }
        if (t === 110) { RF.audio.sfx('boom'); scene.shake = 16; scene.flash = 6; scene.effects.spawnText('ART OF EIGHT LIMBS!', att.x, att.body.height + 28, '#ffb030'); }
        if (t === 170) RF.audio.sfx('perfect'); // ding - a star in the sky
      },
      drawVictim(vic, ctx, floorY, t) {
        if (t < 110) {
          const jolt = t >= 20 && (t - 20) % 11 < 3 ? -3 : 0;
          return drawPose(vic, ctx, vic.x + jolt * Math.sign(vic.facing || 1) * -1, floorY, ['hit', 0]);
        }
        // kicked into orbit, spinning
        const u = t - 110, x = vic.x - vic.facing * u * 2.2, y = floorY - u * u * 0.22 - u * 3;
        if (y < -60) return;
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(u * 0.35);
        vic.sprite.draw(ctx, 'hit', 0, 0, vic.body.height / 2, vic.facing);
        ctx.restore();
      },
      drawFx(att, vic, ctx, floorY, t) {
        if (t >= 160 && t < 205) { // the twinkle where they disappeared
          const x = Math.round(vic.x - vic.facing * 110), y = 18, r = (t % 10 < 5) ? 5 : 3;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - r, y, r * 2 + 1, 1); ctx.fillRect(x, y - r, 1, r * 2 + 1);
          ctx.fillStyle = '#ffd060'; ctx.fillRect(x - 1, y - 1, 3, 3);
        }
      },
    },

    // Holbrook: a world map unrolls, a giant pushpin skewers the loser into it, and the
    // map is rolled up and filed away. ANNEXED.
    annexation: {
      name: 'Annexation',
      duration: 230,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 40 ? ['throw', 1] : t < 70 ? ['special', 1] : ['idle', 0];
        if (t === 4) RF.audio.sfx('paper');
        if (t === 84) { RF.audio.sfx('boom'); RF.audio.sfx('heavy'); scene.shake = 14; scene.flash = 5; }
        if (t === 100) scene.effects.spawnText('ANNEXED!', vic.x, 110, '#ff4040');
        if (t === 130) RF.audio.sfx('paper');
        if (t === 200) RF.audio.sfx('applause');
      },
      drawVictim(vic, ctx, floorY, t) {
        if (t < 84) return drawPose(vic, ctx, vic.x, floorY, ['hit', 0]);
        if (t >= 130) return; // rolled up inside the map
        ctx.save(); ctx.translate(Math.round(vic.x), floorY - 40); ctx.scale(1.15, 0.85);
        vic.sprite.draw(ctx, 'ko', 1, 0, 30, vic.facing); // flattened against the map
        ctx.restore();
      },
      drawBack(att, vic, ctx, floorY, t) { // the map, behind the victim
        const W = 170, H0 = 120, x = Math.round(vic.x - W / 2), top = floorY - H0 - 10;
        const unroll = Math.min(1, t / 30), roll = t > 130 ? Math.min(1, (t - 130) / 30) : 0;
        if (t > 175) return;
        const h = Math.round(H0 * unroll * (1 - roll)), y = top + Math.round(H0 * roll);
        ctx.fillStyle = '#111'; ctx.fillRect(x - 2, y - 2, W + 4, h + 4);
        ctx.fillStyle = '#4a7ab0'; ctx.fillRect(x, y, W, h);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, W, h); ctx.clip();
        ctx.fillStyle = '#a49238';
        [[20, 18, 30, 26], [24, 48, 14, 34], [70, 14, 46, 22], [78, 40, 22, 36], [124, 24, 32, 22], [138, 80, 20, 14]].forEach(([a, b, c, d]) => ctx.fillRect(x + a, top + b, c, d));
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x + i * W / 8, top); ctx.lineTo(x + i * W / 8, top + H0); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = '#c8a050'; ctx.fillRect(x - 6, y - 4, W + 12, 5); ctx.fillRect(x - 6, y + h - 1, W + 12, 5); // the rollers
        if (t > 160) RF.font.drawText(ctx, 'FILED UNDER: ANNEXED', vic.x, floorY - 30, { align: 'center', color: '#e8dcc0', outline: '#000' });
      },
      drawFx(att, vic, ctx, floorY, t) {
        if (t < 40 || t >= 130) return; // the giant pushpin
        const drop = Math.min(1, (t - 40) / 44), px = Math.round(vic.x), py = Math.round(-40 + (floorY - 70) * drop * drop);
        ctx.fillStyle = '#111'; ctx.fillRect(px - 1, py, 3, 40);
        ctx.fillStyle = '#c8c8d0'; ctx.fillRect(px, py, 1, 40);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(px, py - 6, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.arc(px, py - 6, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff8080'; ctx.fillRect(px - 5, py - 12, 4, 3);
      },
    },

    // King Sirven: a royal decree, a trapdoor, and he takes his throne.
    royalDecree: {
      name: 'Royal Decree',
      duration: 220,
      update(att, vic, t, scene) {
        att.finisherAnim = t < 40 ? ['throw', 1] : t < 150 ? ['idle', 0] : t < 175 ? ['throw', 2] : ['crouch', 0]; // sits on his throne
        if (t === 4) RF.audio.sfx('fanfare');
        if (t === 34) RF.audio.sfx('paper');
        if (t === 110) { RF.audio.sfx('block'); scene.shake = 6; }   // trapdoor bolt
        if (t === 112) RF.audio.sfx('ko');
        if (t === 190) RF.audio.sfx('fanfare');
      },
      drawVictim(vic, ctx, floorY, t, frame) {
        if (t < 112) return drawPose(vic, ctx, vic.x + (t > 60 ? (t % 4 < 2 ? 1 : -1) : 0), floorY, ['hit', 0]);
        // falls through the trapdoor into darkness
        const fall = (t - 112) * (t - 112) * 0.25;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, floorY - 140, RF.CONFIG.WIDTH, 140); ctx.clip(); // hidden once below the floor
        drawPose(vic, ctx, vic.x, floorY + fall, ['ko', 0]);
        ctx.restore();
      },
      drawBack(att, vic, ctx, floorY, t) {
        const dir = Math.sign(vic.x - att.x) || 1;
        throne(ctx, att.x - dir * 4, floorY, Math.min(1, Math.max(0, (t - 140) / 20)));
      },
      drawFx(att, vic, ctx, floorY, t, frame) {
        const W = RF.CONFIG.WIDTH;
        // heralds' trumpets
        if (t < 40) {
          for (const side of [-1, 1]) {
            const tx = W / 2 + side * 120, ty = 84;
            ctx.fillStyle = '#e8b420'; ctx.fillRect(tx - 14, ty, 28, 3); ctx.fillRect(side > 0 ? tx - 18 : tx + 12, ty - 4, 6, 11); // horn + bell
            ctx.fillStyle = '#8a1424'; ctx.fillRect(tx - 6, ty + 3, 12, 8);   // banner
            ctx.fillStyle = '#e8b420'; ctx.fillRect(tx - 2, ty + 5, 4, 3);
          }
        }
        // the decree
        if (t >= 30 && t < 120) {
          const u = Math.min(1, (t - 30) / 10), h = Math.round(44 * u);
          ctx.fillStyle = '#111'; ctx.fillRect(W / 2 - 71, 30, 142, h + 2);
          ctx.fillStyle = '#efe0b8'; ctx.fillRect(W / 2 - 70, 31, 140, h);
          ctx.fillStyle = '#8a6a30'; ctx.fillRect(W / 2 - 74, 29, 148, 3); ctx.fillRect(W / 2 - 74, 31 + h, 148, 3);
          if (u >= 1) {
            RF.font.drawText(ctx, 'ROYAL DECREE', W / 2, 36, { align: 'center', color: '#6a1010' });
            RF.font.drawText(ctx, 'YOU ARE HEREBY', W / 2, 50, { align: 'center', color: '#3a2a10' });
            RF.font.drawText(ctx, 'EXPELLED!', W / 2, 60, { align: 'center', color: '#c01818' });
            ctx.fillStyle = '#c01818'; ctx.beginPath(); ctx.arc(W / 2 + 54, 64, 5, 0, Math.PI * 2); ctx.fill(); // wax seal
          }
        }
        // the trapdoor under the victim
        if (t >= 106 && t < 150) {
          const x = Math.round(vic.x);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 18, floorY - 1, 36, 6);
          ctx.fillStyle = '#4a3420'; ctx.fillRect(x - 22, floorY - 2, 4, 3); ctx.fillRect(x + 18, floorY - 2, 4, 3); // hinged doors
        }
        if (t >= 150 && t < 205) RF.font.drawText(ctx, 'LONG LIVE THE KING', W / 2, 70, { scale: 2, align: 'center', outline: '#000',
          color: ['#ffffff', '#fff6b0', '#ffe060', '#ffc030', '#e8b420', '#c8961e', '#8a6a10'] });
      },
    },


    // Mr. Dabalsa: the most famous stage direction in Shakespeare.
    exitBear: {
      name: 'Exit, Pursued by a Bear',
      duration: 230,
      update(att, vic, t, scene) {
        // Calm throughout; takes a bow at the curtain call.
        att.finisherAnim = t < 190 ? ['idle', Math.floor(t / 20) % 2] : t < 215 ? ['throw', 2] : ['victory', Math.floor(t / 15) % 2];
        if (t === 2) RF.audio.sfx('gong');
        if (t === 40) RF.audio.sfx('roar');
        if (t === 90) RF.audio.sfx('roar');
        if (t === 175) RF.audio.sfx('applause');
        if (t === 195) RF.audio.sfx('applause');
        if (t === 205) RF.audio.sfx('applause');
        if (t === 150) scene.effects.spawnText('THE END.', att.x, att.body.height + 16, '#e8dcc0');
      },
      bearX(att, vic, t) {
        const dir = Math.sign(vic.x - att.x) || 1, W = RF.CONFIG.WIDTH;
        const start = dir > 0 ? -60 : W + 60; // the bear comes on from behind him
        return start + dir * Math.max(0, t - 40) * 4.2;
      },
      vicX(att, vic, t) {
        const dir = Math.sign(vic.x - att.x) || 1;
        return vic.x + dir * Math.max(0, t - 60) * 3.6; // runs for their life
      },
      drawVictim(vic, ctx, floorY, t, frame, att) {
        const x = this.vicX(att, vic, t);
        if (x < -40 || x > RF.CONFIG.WIDTH + 40) return;
        const dir = Math.sign(vic.x - att.x) || 1;
        const anim = t < 60 ? ['hit', 0] : ['walk', Math.floor(frame / 3) % 4];
        vic.sprite.draw(ctx, anim[0], anim[1], x, floorY, dir); // facing away: fleeing
      },
      drawFx(att, vic, ctx, floorY, t, frame) {
        const W = RF.CONFIG.WIDTH, dir = Math.sign(vic.x - att.x) || 1;
        // Spotlight on the stage
        if (t < 150) {
          const g = ctx.createRadialGradient(W / 2, floorY - 40, 10, W / 2, floorY - 40, 160);
          g.addColorStop(0, 'rgba(255,240,200,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, RF.CONFIG.HEIGHT);
        }
        // The stage direction, in a script typeface-ish box
        if (t > 10 && t < 150) {
          ctx.fillStyle = 'rgba(232,220,192,0.92)'; ctx.fillRect(W / 2 - 104, 34, 208, 16);
          ctx.fillStyle = '#111'; ctx.fillRect(W / 2 - 104, 50, 208, 1);
          RF.font.drawText(ctx, 'EXIT, PURSUED BY A BEAR.', W / 2, 39, { align: 'center', color: '#3a1010' });
        }
        if (t >= 40 && t < 160) bear(ctx, this.bearX(att, vic, t), floorY, dir, frame);
        // Curtains: open at the start, close on THE END, reopen for his curtain call.
        let open = 1;
        if (t < 12) open = t / 12;
        else if (t >= 150 && t < 170) open = 1 - (t - 150) / 20;
        else if (t >= 170 && t < 190) open = 0;
        else if (t >= 190 && t < 210) open = (t - 190) / 20;
        if (open < 1) curtains(ctx, open);
        if (t >= 170) RF.font.drawText(ctx, 'THE END', W / 2, 60, { scale: 4, align: 'center', color: '#c8a040', outline: '#2a0000' });
      },
    },


    // Lady Landa: shrinks them into a specimen jar for her collection.
    specimenJar: {
      name: 'Specimen Jar',
      duration: 200,
      jarX(att) { return att.x + att.facing * 34; },
      update(att, vic, t, scene) {
        att.finisherAnim = t < 60 ? ['special', 1] : t < 120 ? ['throw', 1] : ['victory', Math.floor(t / 15) % 2];
        if (t === 2) RF.audio.sfx('cackle');
        if (t === 15) RF.audio.sfx('special');
        if (t === 62) { RF.audio.sfx('block'); RF.audio.sfx('heavy'); scene.shake = 10; } // lid slams
        if (t > 80 && t < 170 && t % 16 === 0) RF.audio.sfx('move'); // tiny fists on glass
        if (t === 120) { RF.audio.sfx('cackle'); scene.effects.spawnText('INTO THE COLLECTION!', att.x, att.body.height + 20, '#c080ff'); }
      },
      drawVictim(vic, ctx, floorY, t, frame, att) {
        const k = RF.FINISHERS.specimenJar, jx = k.jarX(att), jarBottom = floorY - 34, jarH = 52;
        const p = Math.max(0, Math.min(1, (t - 15) / 45)); // shrinking and being sucked in
        const scale = 1 - p * 0.82;
        const x = vic.x + (jx - vic.x) * p, foot = floorY + (jarBottom - 3 - floorY) * p;
        const pound = t > 70 ? (Math.floor(t / 8) % 2 ? 1 : -1) : 0;
        ctx.save();
        if (p >= 1) { ctx.beginPath(); ctx.rect(jx - 15, jarBottom - jarH, 30, jarH); ctx.clip(); }
        ctx.translate(Math.round(x + pound), Math.round(foot));
        ctx.scale(scale, scale);
        vic.sprite.draw(ctx, t > 70 && Math.floor(t / 8) % 2 ? 'light' : 'hit', 1, 0, 0, vic.facing,
          p > 0.5 ? '#9ad070' : null);
        ctx.restore();
      },
      drawFx(att, vic, ctx, floorY, t, frame) {
        const k = RF.FINISHERS.specimenJar, jx = k.jarX(att), jarBottom = floorY - 34;
        const grow = Math.min(1, t / 12);
        const w = Math.round(32 * grow), h = Math.round(52 * grow);
        if (t > 15 && t < 60) { // purple swirl pulling them in
          for (let i = 0; i < 10; i++) {
            const a = frame * 0.3 + i * 0.63, r = 10 + ((frame + i * 7) % 30);
            ctx.fillStyle = i % 2 ? 'rgba(200,120,255,0.7)' : 'rgba(120,40,200,0.6)';
            ctx.fillRect(Math.round(jx + Math.cos(a) * r), Math.round(jarBottom - 26 + Math.sin(a) * r * 0.6), 2, 2);
          }
        }
        specimenJar(ctx, jx, jarBottom, w, h, t >= 62, t >= 62 ? Math.min(1, (t - 62) / 30) * 0.9 : 0, frame);
        if (t >= 90) { // the label
          ctx.fillStyle = '#e8dcc0'; ctx.fillRect(Math.round(jx) - 14, jarBottom - 22, 28, 12);
          RF.font.drawText(ctx, 'NO.47', jx, jarBottom - 20, { align: 'center', color: '#3a1010' });
          RF.font.drawText(ctx, 'SPECIMEN', jx, jarBottom - 66, { align: 'center', color: '#e8dcc0', outline: '#000' });
        }
        // she holds it up: a dark hand under the jar
        ctx.fillStyle = '#b67542'; ctx.fillRect(Math.round(jx) - 6, jarBottom + 1, 12, 4);
      },
    },


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
  // BRUTALITY: land 5 hits on a dazed opponent during FINISH THEM! and they
  // explode into a shower of their own pixels. characters.js -> `brutality`
  // ({ name, color }) names it and colours the extra burst.
  RF.FINISHERS.brutality = {
    name: 'BRUTALITY', banner: 'BRUTALITY!', duration: 190,
    update(att, vic, t, scene) {
      att.finisherAnim = ['victory', (t >> 3) % 2];
      if (t === 1) {
        const br = att.def.brutality || {};
        vic.brutalParts = explode(vic, br.color || '#e02020');
        scene.shake = 18; scene.flash = 8; scene.hitstop = 0;
        scene.gore.burst(vic.x, vic.body.height * 0.5, 0, 5); scene.gore.chunks(vic, vic.x, vic.body.height * 0.5, 24, 1.4);
        scene.gore.splatter(14); scene.gore.pool(vic.x, 2.2); scene.redFlash = 14;
        RF.audio.sfx('boom'); RF.audio.sfx('heavy'); RF.audio.sfx('ko');
        RF.announcer.say('BRUTALITY!');
        scene.game.kb.rumble(att.side, 1, 600);
      }
      if (t === 40) scene.effects.spawnText(((att.def.brutality || {}).name || 'BRUTALITY') + '!', att.x, att.body.height + 22, (att.def.brutality || {}).color || '#ff4040');
      for (const p of vic.brutalParts || []) {
        if (p.rest) continue;
        p.vy -= 0.35; p.x += p.vx; p.y += p.vy;
        if (p.y <= 0) { p.y = 0; p.vy *= -0.35; p.vx *= 0.6; if (Math.abs(p.vy) < 0.6) p.rest = true; }
      }
    },
    drawVictim(vic, ctx, floorY, t) {
      if (t < 1 || !vic.brutalParts) return drawPose(vic, ctx, vic.x, floorY, ['hit', 0]);
      for (const p of vic.brutalParts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(floorY - p.y - p.s), p.s, p.s); }
    },
  };

  // Break a fighter's sprite into flying pixel chunks (plus a burst in `color`).
  function explode(vic, color) {
    const S = 220, [c, cx] = RF.util.makeCanvas(S, S);
    vic.sprite.draw(cx, 'hit', 0, S / 2, S - 10, vic.facing);
    const data = cx.getImageData(0, 0, S, S).data, parts = [], step = 3, cyMid = S - 10 - vic.body.height / 2;
    for (let y = 0; y < S; y += step) for (let x = 0; x < S; x += step) {
      const i = (y * S + x) * 4;
      if (data[i + 3] < 128) continue;
      const dx = x - S / 2, dy = y - cyMid, d = Math.hypot(dx, dy) || 1, sp = 2 + Math.random() * 5;
      parts.push({ x: vic.x + dx, y: S - 10 - y, vx: (dx / d) * sp + (Math.random() - 0.5) * 2, vy: (-dy / d) * sp + 3 + Math.random() * 3, s: step, c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
    }
    for (let k = 0; k < 90; k++) { // the coloured burst
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
      parts.push({ x: vic.x, y: vic.body.height / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 4, s: 2, c: color });
    }
    return parts;
  }
})();
