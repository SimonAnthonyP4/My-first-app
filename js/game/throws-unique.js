// ===================== ONE-OF-A-KIND THROWS =====================
// Eleven fighters used to borrow somebody else's grab (mostly Bruiser's lift-and-slam). Each one now has
// a throw of their own. Same rules as js/game/throw-kinds.js: update() moves the victim and deals the
// damage, anim() poses the thrower, draw() paints the props.
(function () {
  const K = RF.THROW_KINDS;
  const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const say = (scene, text, x, y, color) => scene.effects.spawnText(text, x, y, color || '#ffffff');
  function hold(att, def, extra = 0, y = 0) {
    def.x = att.x + att.facing * ((att.body.width + def.body.width) / 2 + extra);
    def.y = y; def.facing = -att.facing;
  }
  // A victim the throw draws itself (spun, clipped, squashed): hidden from the normal pass, painted here.
  function drawVictim(def, ctx, floorY, o = {}) {
    const h = def.body.height;
    ctx.save();
    ctx.translate(Math.round(def.x), Math.round(floorY - def.y - h / 2));
    if (o.rot) ctx.rotate(o.rot);
    if (o.sx || o.sy) ctx.scale(o.sx || 1, o.sy || 1);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    def.sprite.draw(ctx, o.anim || 'hit', o.frame || 0, 0, h / 2, def.facing, o.tint);
    ctx.restore();
  }

  // ---- Chris Loor: HAND-TOSSED. Three to the body, then spun on his glove like pizza dough. ORDER UP! ----
  K.doughToss = {
    update(att, def, t, scene) {
      const T = att.throwCfg;
      if (t < 34) {
        const jolt = [10, 18, 26].some((k) => t >= k && t < k + 3) ? 3 : 0;
        hold(att, def, jolt); def.thrownPose = ['hit', 0];
        if (t === 10 || t === 18 || t === 26) { scene.effects.spawn('hit', def.x - att.facing * 6, 34); scene.throwHit(att, def, T.bodyDamage); }
        if (t === 30) { say(scene, 'HAND-TOSSED!', att.x, att.body.height + 22, '#ffd060'); RF.audio.sfx('whoosh'); }
        return false;
      }
      if (t < 70) {
        // up off his glove, spinning, a little higher each toss
        const i = Math.floor((t - 34) / 12), u = ((t - 34) % 12) / 12;
        def.hidden = true;
        def.x = att.x + att.facing * 10; def.y = att.body.height - 14 + Math.sin(u * Math.PI) * (22 + i * 14);
        if ((t - 34) % 12 === 0 && t > 34) { scene.throwHit(att, def, T.tossDamage); RF.audio.sfx('whoosh'); }
        return false;
      }
      if (t === 70) {
        def.hidden = false; def.y = 34; def.x = att.x + att.facing * 20; def.thrownPose = ['ko', 0];
        say(scene, 'ORDER UP!', att.x, att.body.height + 26, '#ff5030');
        scene.shake = 12; scene.effects.spawn('heavy', def.x, 50);
        scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 4, vy: 9 });
      }
      return t >= 84;
    },
    anim(att, t) {
      if (t < 8) return ['throw', 0];
      if (t < 34) return (t - 10) % 8 < 4 ? ['lowLight', 1] : ['light', 0];
      if (t < 70) return ['uppercut', 1];
      return ['uppercut', 2];
    },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime;
      if (t < 34 || t >= 70 || !def.hidden) return;
      drawVictim(def, ctx, floorY, { rot: (t - 34) * 0.55 * att.facing, anim: 'ko', frame: 0 });
      // flour coming off them
      for (let i = 0; i < 6; i++) {
        const a = (t * 0.55 + i * 1.05), r = 20 + ((t * 3 + i * 7) % 16);
        ctx.globalAlpha = 0.8 - ((t * 3 + i * 7) % 16) / 22;
        R(ctx, def.x + Math.cos(a) * r, floorY - def.y - def.body.height / 2 + Math.sin(a) * r, 2, 2, '#fff6e0');
      }
      ctx.globalAlpha = 1;
    },
  };

  // ---- Olu: ALREADY WRITTEN. He never lays a hand on them. The light does it. ----
  K.written = {
    update(att, def, t, scene) {
      const T = att.throwCfg;
      const lift = t < 58 ? Math.min(40, t * 2.2) : t < 64 ? 40 + (t - 58) * 9 : Math.max(0, 94 - (t - 64) * 16);
      hold(att, def, 12, lift);
      def.thrownPose = t < 64 ? ['hit', 0] : ['ko', 0];
      if (t === 4) RF.audio.sfx('arcane');
      if (t === 16) { say(scene, 'IT WAS ALREADY WRITTEN.', att.x, att.body.height + 22, '#ffe890'); scene.throwHit(att, def, T.lineDamage); }
      if (t === 32) { say(scene, 'I WROTE IT.', att.x, att.body.height + 12, '#ffffff'); scene.throwHit(att, def, T.lineDamage); }
      if (t === 46) scene.throwHit(att, def, T.lineDamage);
      if (t === 70) {
        def.y = 0; scene.shake = 16; scene.flash = 5; RF.audio.sfx('bolt');
        scene.effects.spawn('shock', def.x, 4); scene.effects.spawn('dust', def.x, 1);
        scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 3, vy: 4 });
      }
      return t >= 86;
    },
    anim(att, t) { return t < 60 ? ['idle', (t >> 4) % 2] : ['special', t < 70 ? 1 : 2]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime;
      if (t > 78) return;
      const x = Math.round(def.x), top = floorY - def.y - def.body.height;
      // the light from above
      const a = t < 8 ? t / 8 : t > 70 ? Math.max(0, 1 - (t - 70) / 8) : 1;
      const g = ctx.createLinearGradient(0, 0, 0, floorY);
      g.addColorStop(0, `rgba(255,236,150,${0.55 * a})`); g.addColorStop(1, `rgba(255,236,150,${0.12 * a})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(x + 24, floorY); ctx.lineTo(x - 24, floorY); ctx.fill();
      // a halo that was not theirs to wear
      ctx.strokeStyle = `rgba(255,232,120,${a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, top - 6 + Math.sin(frame / 5) * 1.5, 11, 3.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
      // the words, rising off them
      for (let i = 0; i < 7; i++) {
        const u = ((t * 2 + i * 13) % 60) / 60;
        ctx.globalAlpha = a * (1 - u);
        R(ctx, x - 18 + ((i * 37) % 36), floorY - def.y - 8 - u * (def.body.height + 30), 4 + (i % 3) * 2, 1, '#fff4c0');
      }
      ctx.globalAlpha = 1;
      if (t >= 64 && t < 74) { // and then the full stop
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 6, 0);
        for (let y = 20; y < floorY; y += 20) ctx.lineTo(x + ((y / 20) % 2 ? -7 : 7), y);
        ctx.lineTo(x, floorY); ctx.stroke(); ctx.lineWidth = 1;
      }
    },
  };

  // ---- Riley: RANDOM BAG CHECK. Wanded three times, then shown the way out of the universe. ----
  K.bagCheck = {
    update(att, def, t, scene) {
      const T = att.throwCfg;
      hold(att, def, 6); def.thrownPose = ['hit', 0];
      if (t === 4) say(scene, 'RANDOM BAG CHECK.', att.x, att.body.height + 34, '#ffd030');
      if (t === 16 || t === 30 || t === 44) {
        say(scene, 'BEEP!', def.x, def.body.height + 6 + ((t - 16) / 14) * 7, '#ff4040');
        RF.audio.sfx('select'); RF.audio.sfx('zap'); scene.throwHit(att, def, T.beepDamage);
      }
      if (t === 54) say(scene, 'YOU CANNOT BRING THAT IN HERE.', att.x, att.body.height + 22, '#ffffff');
      if (t === 72) {
        say(scene, 'HAVE A SAFE DAY.', att.x, att.body.height + 24, '#80ffb0');
        scene.shake = 10; RF.audio.sfx('whoosh');
        scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 9, vy: 4 });
      }
      return t >= 86;
    },
    anim(att, t) { return t < 54 ? ['light', (t - 16 + 140) % 14 < 5 ? 1 : 0] : t < 72 ? ['throw', 0] : ['heavy', 1]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime, d = att.facing;
      if (t >= 8 && t < 54) { // the wand, swept up and down them
        const x = Math.round(def.x - d * (def.body.width / 2 + 5)), y = floorY - 12 - (0.5 + 0.5 * Math.sin((t - 8) / 14 * Math.PI * 2 - 1.2)) * (def.body.height - 16);
        const beep = [16, 30, 44].some((k) => t >= k && t < k + 5);
        R(ctx, x - 2, y - 9, 5, 19, '#111'); R(ctx, x - 1, y - 8, 3, 17, '#30343c'); R(ctx, x - 1, y - 8, 3, 3, beep ? '#ff3030' : '#40d060');
        R(ctx, x - 2 - d * 4, y + 9, 5 + 4, 4, '#111');
        if (beep) { ctx.strokeStyle = '#ff5050'; ctx.beginPath(); ctx.arc(x, y - 7, 5 + (t % 5) * 2, 0, Math.PI * 2); ctx.stroke(); }
      }
      if (t >= 54) { // the way out: a doorway onto nothing
        const u = Math.min(1, (t - 54) / 10), x = Math.round(att.x + d * 74), w = 26, h = Math.round(64 * u), y = floorY - h;
        R(ctx, x - w / 2 - 2, y - 2, w + 4, h + 2, '#111'); R(ctx, x - w / 2, y, w, h, '#0a0620');
        for (let i = 0; i < 9; i++) if ((i * 23) % 64 < h - 2) R(ctx, x - w / 2 + 2 + ((i * 17 + frame) % (w - 4)), y + 2 + ((i * 23) % 64) % Math.max(1, h - 4), 1, 1, i % 3 ? '#ffffff' : '#b090ff');
        if (u >= 1) { R(ctx, x - 12, y - 12, 24, 9, '#111'); R(ctx, x - 11, y - 11, 22, 7, '#0c5020'); RF.font.drawText(ctx, 'EXIT', x, y - 10, { align: 'center', color: '#60ff90' }); }
      }
    },
  };

  // ---- The Proctor: POP QUIZ. A desk, a test, a clock. PENCILS DOWN. ----
  K.popQuiz = {
    update(att, def, t, scene) {
      const T = att.throwCfg;
      hold(att, def, 8); def.thrownPose = ['hit', t >= 20 && t < 60 && t % 14 < 4 ? 1 : 0];
      if (t === 6) { say(scene, 'POP QUIZ.', att.x, att.body.height + 22, '#ffffff'); RF.audio.sfx('paper'); }
      if (t === 20 || t === 34 || t === 48) { say(scene, 'TICK.', def.x + 18 * att.facing, def.body.height + 26, '#e8e0c8'); RF.audio.sfx('select'); scene.throwHit(att, def, T.tickDamage); }
      if (t === 58) say(scene, 'PENCILS DOWN.', att.x, att.body.height + 22, '#ff5050');
      if (t === 68) {
        scene.shake = 12; RF.audio.sfx('heavy'); say(scene, 'F.', def.x, def.body.height + 12, '#ff2020');
        scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 7, vy: 5 });
      }
      return t >= 82;
    },
    anim(att, t) { return t < 58 ? ['idle', 0] : t < 68 ? ['throw', 1] : ['heavy', 1]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime;
      if (t < 6 || t > 74) return;
      const d = att.facing, x = Math.round(def.x - d * 10), y = floorY - 30;
      // the desk and the test on it
      R(ctx, x - 15, y - 1, 30, 5, '#111'); R(ctx, x - 14, y, 28, 3, '#b08040'); R(ctx, x - 14, y, 28, 1, '#d0a060');
      R(ctx, x - 12, y + 3, 2, 27, '#3a3a40'); R(ctx, x + 10, y + 3, 2, 27, '#3a3a40');
      R(ctx, x - 6, y - 3, 12, 3, '#f4f0e4'); if (t % 14 < 7 && t < 58) R(ctx, x + 2, y - 8, 1, 6, '#ffd030');
      // the clock over it: two minutes, going
      const cx = x, cy = floorY - def.body.height - 22, a = -Math.PI / 2 + Math.min(1, (t - 6) / 52) * Math.PI * 2;
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4f0e4'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,32,44,0.35)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 9, -Math.PI / 2, a); ctx.fill();
      ctx.strokeStyle = '#c8202c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); ctx.stroke(); ctx.lineWidth = 1;
      if (t >= 64) { // graded
        const s = t < 68 ? 3 : 2;
        RF.font.drawText(ctx, 'F', x, y - 14 - s * 2, { align: 'center', color: '#ff2020', outline: '#000', scale: s });
      }
    },
  };

  // ---- The Bell Ringer: BELL JAR. The bell goes over them. Then it is rung. ----
  K.tolls = {
    strikes: [28, 42, 56],
    update(att, def, t, scene) {
      const T = att.throwCfg, hit = this.strikes.find((k) => t >= k && t < k + 6);
      hold(att, def, 10); def.thrownPose = ['hit', hit ? 1 : 0];
      if (hit) def.x += (t % 2 ? 2 : -2);
      if (this.strikes.includes(t)) {
        say(scene, 'DONG!', def.x, def.body.height + 26 + this.strikes.indexOf(t) * 8, '#ffd870');
        RF.audio.sfx('gong'); RF.audio.sfx('clang'); scene.shake = 9; scene.throwHit(att, def, T.tollDamage);
      }
      if (t === 74) { scene.shake = 8; scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 6, vy: 4 }); }
      return t >= 88;
    },
    anim(att, t) { return t < 24 ? ['throw', 1] : K.tolls.strikes.some((k) => t >= k - 3 && t < k + 5) ? ['heavy', 1] : t < 66 ? ['heavy', 0] : ['throw', 2]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime;
      if (t < 8 || t > 74) return;
      // the bell: lowered over them, rung, lifted away
      const down = floorY - 12, up = -50, h = def.body.height + 14, w = def.body.width + 26;
      const y = t < 24 ? up + (down - up) * ((t - 8) / 16) : t < 64 ? down : down + (up - down) * ((t - 64) / 10);
      const struck = this.strikes.find((k) => t >= k && t < k + 8), sw = struck != null ? Math.sin((t - struck) * 1.6) * 3 * (1 - (t - struck) / 8) : 0;
      const x = Math.round(def.x + sw);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 5, y + 1); ctx.lineTo(x - w / 2 + 2, y - h * 0.3); ctx.quadraticCurveTo(x - w / 2 + 4, y - h - 2, x, y - h - 3); ctx.quadraticCurveTo(x + w / 2 - 4, y - h - 2, x + w / 2 - 2, y - h * 0.3); ctx.lineTo(x + w / 2 + 5, y + 1); ctx.fill();
      ctx.fillStyle = '#b8862c'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 3, y); ctx.lineTo(x - w / 2 + 3, y - h * 0.3); ctx.quadraticCurveTo(x - w / 2 + 5, y - h, x, y - h - 1); ctx.quadraticCurveTo(x + w / 2 - 5, y - h, x + w / 2 - 3, y - h * 0.3); ctx.lineTo(x + w / 2 + 3, y); ctx.fill();
      ctx.fillStyle = '#e8c060'; ctx.fillRect(x - w / 2 + 6, Math.round(y - h * 0.82), 3, Math.round(h * 0.6));
      R(ctx, x - w / 2 - 3, y - 5, w + 6, 2, '#7a5418'); R(ctx, x - w / 2 + 3, y - h * 0.45, w - 6, 1, '#7a5418');
      R(ctx, x - 2, 0, 4, Math.max(0, y - h - 2), '#3a2c18');
      if (struck != null) { // the ring going out of it
        ctx.strokeStyle = `rgba(255,216,112,${1 - (t - struck) / 8})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y - h / 2, w / 2 + 6 + (t - struck) * 4, h / 2 + (t - struck) * 3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
      }
    },
  };

  // ---- The Eraser: RUBBED OUT. Erased from the shoes up. Put back, wrong. ----
  K.rubbedOut = {
    update(att, def, t, scene) {
      const T = att.throwCfg;
      if (t < 46) {
        hold(att, def, 6); def.thrownPose = ['hit', 0]; def.hidden = t >= 12;   // (not before they have had their chance to break it)
        if (t === 12 || t === 22 || t === 32) RF.audio.sfx('paper');
        if (t === 18 || t === 32) scene.throwHit(att, def, T.rubDamage);
        if (t === 44) say(scene, 'WHO?', att.x, att.body.height + 20, '#e8e4dc');
        return false;
      }
      if (t < 66) { def.hidden = true; def.x = att.x + att.facing * 44; def.y = 92; def.thrownPose = ['ko', 0]; return false; } // being drawn back in, up there
      if (t < 74) { def.hidden = false; def.y = Math.max(0, 92 - (t - 66) * 13); def.thrownPose = ['ko', 0]; return false; }
      if (t === 74) {
        def.y = 0; scene.shake = 12; RF.audio.sfx('boom'); scene.effects.spawn('dust', def.x, 1);
        say(scene, 'PUT BACK WRONG.', def.x, def.body.height + 10, '#ffffff');
        scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 2, vy: 4 });
      }
      return t >= 88;
    },
    anim(att, t) { return t < 46 ? ['light', (t >> 2) % 2 ? 1 : 2] : t < 66 ? ['throw', 1] : ['idle', 0]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime, h = def.body.height;
      if (t >= 12 && t < 46) { // what is left of them, above the line
        const gone = Math.min(1, (t - 12) / 28) * (h + 10), line = Math.round(floorY - gone);
        ctx.save(); ctx.beginPath(); ctx.rect(def.x - 60, 0, 120, line); ctx.clip();
        def.sprite.draw(ctx, 'hit', 0, Math.round(def.x), floorY, def.facing);
        ctx.restore();
        for (let i = 0; i < 10; i++) { // chalk dust along the line
          const u = ((t * 5 + i * 17) % 20) / 20;
          ctx.globalAlpha = 1 - u; R(ctx, def.x - 16 + ((i * 29 + t * 3) % 32), line + u * 12 - 2, 2, 2, i % 2 ? '#ffffff' : '#d8d2c6');
        }
        ctx.globalAlpha = 1;
        R(ctx, def.x - 14 + Math.sin(t * 0.9) * 10, line - 5, 16, 7, '#111'); R(ctx, def.x - 13 + Math.sin(t * 0.9) * 10, line - 4, 14, 5, '#e89aa8'); // the eraser itself
      }
      if (t >= 50 && t < 66) { // sketched back in, upside down, in chalk
        const u = (t - 50) / 16;
        ctx.save(); ctx.beginPath(); ctx.rect(def.x - 60, floorY - def.y - h - 10, 120, (h + 20) * u); ctx.clip();
        drawVictim(def, ctx, floorY, { anim: 'ko', frame: 0, tint: u < 0.8 ? 'white' : undefined, alpha: 0.5 + u * 0.5 });
        ctx.restore();
      }
    },
  };

  // ---- The Judge: CONTEMPT OF COURT. Order. Order. Order. Guilty. ----
  K.contempt = {
    bangs: [14, 28, 42],
    update(att, def, t, scene) {
      const T = att.throwCfg;
      hold(att, def, 6); def.thrownPose = ['hit', this.bangs.some((k) => t >= k && t < k + 5) ? 1 : 0];
      if (this.bangs.includes(t)) { say(scene, 'ORDER!', att.x, att.body.height + 16 + this.bangs.indexOf(t) * 8, '#ffffff'); RF.audio.sfx('clang'); scene.shake = 7; scene.effects.spawn('hit', def.x, def.body.height - 4); scene.throwHit(att, def, T.bangDamage); }
      if (t === 54) say(scene, 'GUILTY.', att.x, att.body.height + 28, '#ffd030');
      if (t === 66) { scene.shake = 16; scene.flash = 3; RF.audio.sfx('boom'); scene.effects.spawn('shock', def.x, 4); scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 6, vy: 6 }); }
      return t >= 80;
    },
    anim(att, t) { return K.contempt.bangs.some((k) => t >= k - 2 && t < k + 5) || (t >= 62 && t < 72) ? ['heavy', 1] : ['heavy', 0]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime;
      if (t < 6 || t > 72) return;
      // the gavel: up, and down on their head
      const next = [...this.bangs, 66].find((k) => t <= k + 4), big = next === 66, u = next == null ? 1 : Math.max(0, Math.min(1, 1 - (next - t) / 9));
      const s = big ? 1.7 : 1, px = def.x - att.facing * 26, py = floorY - def.body.height - 18 * s, ang = (-1.5 + u * 1.5) * att.facing;
      ctx.save(); ctx.translate(Math.round(px), Math.round(py)); ctx.rotate(ang); ctx.scale(att.facing, 1);
      R(ctx, -1, -3, 28 * s, 5, '#111'); R(ctx, 0, -2, 26 * s, 3, '#8a5a2c');
      R(ctx, 20 * s, -11 * s, 13 * s, 22 * s, '#111'); R(ctx, 20 * s + 1, -11 * s + 1, 13 * s - 2, 22 * s - 2, '#6a3c18'); R(ctx, 20 * s + 1, -11 * s + 3, 13 * s - 2, 2, '#e8c060'); R(ctx, 20 * s + 1, 11 * s - 5, 13 * s - 2, 2, '#e8c060');
      ctx.restore();
    },
  };

  // ---- Escudero: PHOTO SHOOT. Three poses, three flashes, one look at the pictures. No. Delete. ----
  K.photoShoot = {
    shots: [[14, 'WORK IT!', ['victory', 0]], [30, 'CHIN UP!', ['block', 0]], [46, 'GIVE ME DRAMA!', ['ko', 0]]],
    update(att, def, t, scene) {
      const T = att.throwCfg;
      hold(att, def, 10);
      let pose = ['hit', 0];
      for (const [k, , p] of this.shots) if (t >= k - 6 && t < k + 10) pose = p;
      def.thrownPose = pose;
      if (def.thrownPose[0] === 'ko') def.y = 4;
      this.shots.forEach(([k, line], i) => { if (t !== k) return;
        say(scene, line, att.x, att.body.height + 34 - i * 9, '#ff80d0'); scene.flash = 3; RF.audio.sfx('perfect'); scene.throwHit(att, def, T.flashDamage);
      });
      if (t === 60) say(scene, 'HMM. NO. DELETE.', att.x, att.body.height + 8, '#ffffff');
      if (t === 72) { scene.shake = 10; RF.audio.sfx('special'); scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 8, vy: 4 }); }
      return t >= 86;
    },
    anim(att, t) { return K.photoShoot.shots.some(([k]) => t >= k - 4 && t < k + 6) ? ['light', 1] : t < 58 ? ['idle', 0] : t < 68 ? ['throw', 0] : ['heavy', 1]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime, d = att.facing, RB = ['#ff3040', '#ff9020', '#ffe030', '#40d060', '#3090ff', '#a050e0'];
      // the pictures as they come out
      this.shots.forEach(([k], i) => {
        if (t < k + 2 || t > 76) return;
        const u = Math.min(1, (t - k - 2) / 8), gone = t >= 66 ? (t - 66) * (3 + i) : 0;
        const x = Math.round(att.x - 20 + i * 20), y = Math.round(floorY - att.body.height - 14 - u * 22 + gone * gone * 0.3);
        ctx.save(); ctx.translate(x, y); ctx.rotate((i - 1) * 0.18 + gone * 0.1);
        R(ctx, -9, -11, 18, 22, '#111'); R(ctx, -8, -10, 16, 20, '#f4f0e4'); R(ctx, -6, -8, 12, 12, u < 1 ? '#888078' : RB[i * 2]);
        if (u >= 1) R(ctx, -2, -5, 4, 8, '#201820');
        if (t >= 62 && t < 66) { ctx.strokeStyle = '#e02020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(7, 9); ctx.moveTo(7, -9); ctx.lineTo(-7, 9); ctx.stroke(); ctx.lineWidth = 1; }
        ctx.restore();
      });
      // the flash
      for (const [k] of this.shots) if (t >= k && t < k + 4) {
        const x = att.x + d * 16, y = floorY - att.body.height + 18;
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1 - (t - k) / 4;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - 0.12) * 26, y + Math.sin(a - 0.12) * 26); ctx.lineTo(x + Math.cos(a + 0.12) * 26, y + Math.sin(a + 0.12) * 26); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      // deleted: a rainbow, straight through them
      if (t >= 68 && t < 80) {
        const u = (t - 68) / 12, x0 = att.x + d * 12, len = 30 + u * 150, y = floorY - att.body.height * 0.62;
        ctx.globalAlpha = 1 - u * 0.7;
        RB.forEach((c, i) => R(ctx, d > 0 ? x0 : x0 - len, y + i * 3 + Math.sin(t + i) * 1, len, 3, c));
        ctx.globalAlpha = 1;
      }
    },
  };

  // ---- David P.: STILL LIFE. Framed, painted over in three colours, and it is not his best work. ----
  K.stillLife = {
    strokes: [[28, '#e03838'], [40, '#3070e0'], [52, '#f0c020']],
    update(att, def, t, scene) {
      const T = att.throwCfg;
      hold(att, def, 10); def.thrownPose = ['hit', 0];
      if (t === 6) say(scene, 'HOLD STILL.', att.x, att.body.height + 20, '#ffffff');
      if (t >= 8 && t < 26 && t % 6 === 2) RF.audio.sfx('scribble');
      for (const [k] of this.strokes) if (t === k) { RF.audio.sfx('scribble'); scene.effects.spawn('hit', def.x, 40); scene.throwHit(att, def, T.strokeDamage); }
      if (t === 60) say(scene, 'NOT MY BEST WORK.', att.x, att.body.height + 20, '#c8c8c8');
      if (t === 70) { RF.audio.sfx('paper'); scene.shake = 10; say(scene, 'REJECTED!', def.x, def.body.height + 14, '#ff4040'); scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 7, vy: 5 }); }
      return t >= 84;
    },
    anim(att, t) { return t < 26 ? ['light', (t >> 2) % 2 ? 1 : 0] : K.stillLife.strokes.some(([k]) => t >= k - 3 && t < k + 5) ? ['heavy', 1] : t < 68 ? ['idle', 0] : ['heavy', 1]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime;
      if (t < 8 || t > 78) return;
      const w = def.body.width + 30, h = def.body.height + 22;
      let cx = Math.round(def.x), cy = floorY - h / 2 + 4, k = 1, rot = 0;
      if (t >= 70) { const u = (t - 70) / 8; k = 1 - u * 0.8; rot = u * 3 * att.facing; cx += att.facing * u * 40; cy -= u * 30; }   // crumpled up and thrown out
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(k, k);
      // the three strokes, straight across them
      for (const [s0, col] of this.strokes) if (t >= s0 - 3) {
        const u = Math.min(1, (t - s0 + 3) / 6), i = this.strokes.findIndex((s) => s[0] === s0), y = -h / 2 + 14 + i * (h - 28) / 2;
        ctx.globalAlpha = 0.8; ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(-w / 2 + 4, y + 6); ctx.lineTo(-w / 2 + 4 + (w - 8) * u, y - 6 + (i % 2 ? 12 : 0)); ctx.lineTo(-w / 2 + 4 + (w - 8) * u, y + 2 + (i % 2 ? 12 : 0)); ctx.lineTo(-w / 2 + 4, y + 13); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // the frame, drawn on one side at a time
      const p = Math.min(1, (t - 8) / 18) * 4, side = (i) => Math.max(0, Math.min(1, p - i));
      const F = (x, y, ww, hh) => { R(ctx, x - 1, y - 1, ww + 2, hh + 2, '#111'); R(ctx, x, y, ww, hh, '#c89838'); R(ctx, x, y, ww, 1, '#f0d070'); };
      if (side(0)) F(-w / 2, -h / 2, Math.round(w * side(0)), 4);
      if (side(1)) F(w / 2 - 4, -h / 2, 4, Math.round(h * side(1)));
      if (side(2)) F(w / 2 - Math.round(w * side(2)), h / 2 - 4, Math.round(w * side(2)), 4);
      if (side(3)) F(-w / 2, h / 2 - Math.round(h * side(3)), 4, Math.round(h * side(3)));
      if (t >= 56 && t < 70) RF.font.drawText(ctx, 'DAVID P.', w / 2 - 6, h / 2 - 13, { align: 'right', color: '#ffffff', outline: '#000' });
      ctx.restore();
    },
  };

  // ---- Javan: FLY EAGLES FLY. The whole chant, one letter at a time, and then he kicks the extra point. ----
  K.fightSong = {
    update(att, def, t, scene) {
      const T = att.throwCfg, L = 'EAGLES';
      hold(att, def, 4 + ((t - 10) % 7 < 2 && t >= 10 && t < 52 ? 3 : 0)); def.thrownPose = ['hit', 0];
      for (let i = 0; i < 6; i++) if (t === 10 + i * 7) {
        say(scene, L[i] + '!', def.x - att.facing * 30 + att.facing * i * 12, def.body.height + 12 + (i % 2) * 8, i % 2 ? '#ffffff' : '#30c070');
        scene.effects.spawn('hit', def.x - att.facing * 5, 40); scene.throwHit(att, def, T.letterDamage);
      }
      if (t === 54) { say(scene, 'EAGLES!', att.x, att.body.height + 30, '#30c070'); RF.audio.sfx('fanfare'); }
      if (t === 64) { scene.shake = 12; RF.audio.sfx('boom'); scene.throwHit(att, def, T.puntDamage, { vx: att.facing * 8, vy: 9 }); }
      if (t === 76) say(scene, "IT'S GOOD!", att.x + att.facing * 80, 130, '#ffd030');
      return t >= 84;
    },
    anim(att, t) { return t < 8 ? ['throw', 0] : t < 52 ? ((t - 10) % 7 < 3 ? ['light', 1] : ['light', 0]) : t < 62 ? ['victory', 0] : ['heavy', 1]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime;
      if (t < 50) return;
      // the uprights, down the field
      const x = Math.round(att.x + att.facing * 96), a = Math.min(1, (t - 50) / 8);
      ctx.globalAlpha = a;
      R(ctx, x - 2, floorY - 46, 5, 46, '#111'); R(ctx, x - 1, floorY - 46, 3, 46, '#f0c818');
      R(ctx, x - 22, floorY - 49, 45, 5, '#111'); R(ctx, x - 21, floorY - 48, 43, 3, '#f0c818');
      R(ctx, x - 22, floorY - 110, 5, 62, '#111'); R(ctx, x - 21, floorY - 110, 3, 62, '#f0c818');
      R(ctx, x + 18, floorY - 110, 5, 62, '#111'); R(ctx, x + 19, floorY - 110, 3, 62, '#f0c818');
      ctx.globalAlpha = 1;
    },
  };

  // ---- Donald Trump: THE WALL. Built around them, three rows, very tall. And they are paying for it. ----
  K.theWall = {
    rows: [[12, 'WE BUILD IT.'], [26, 'VERY TALL.'], [40, 'TREMENDOUS.']],
    update(att, def, t, scene) {
      const T = att.throwCfg;
      hold(att, def, 12); def.thrownPose = ['hit', 0];
      this.rows.forEach(([k, line], i) => { if (t !== k) return; say(scene, line, att.x, att.body.height + 34 - i * 9, '#ffffff'); RF.audio.sfx('stomp'); scene.shake = 5; scene.throwHit(att, def, T.rowDamage); });
      if (t === 54) { say(scene, "AND YOU'RE PAYING FOR IT.", att.x, att.body.height + 8, '#ffd030'); RF.audio.sfx('cash'); }
      if (t === 68) { scene.shake = 14; RF.audio.sfx('boom'); scene.effects.spawn('dust', def.x, 1); scene.throwHit(att, def, T.finisherDamage, { vx: att.facing * 6, vy: 4 }); }
      return t >= 84;
    },
    anim(att, t) { return K.theWall.rows.some(([k]) => t >= k - 3 && t < k + 6) ? ['light', 1] : t < 52 ? ['idle', 0] : t < 66 ? ['victory', 0] : ['heavy', 1]; },
    draw(att, def, ctx, floorY, frame) {
      const t = att.stateTime, d = att.facing;
      if (t < 10 || t > 82) return;
      const bw = 12, bh = 7, cols = 4, perRow = 3, x0 = Math.round(def.x + d * 2 - (cols * bw) / 2) + 3;
      const built = this.rows.filter(([k]) => t >= k).length * perRow + (() => { const nx = this.rows.find(([k]) => t < k); return nx ? Math.max(0, Math.min(perRow, Math.floor((t - (nx[0] - 10)) / 2.5))) : 0; })();
      const fall = t >= 68 ? (t - 68) : 0;
      for (let r = 0; r < Math.min(built, 9); r++) for (let c = 0; c < cols; c++) {
        let x = x0 + c * bw - (r % 2 ? bw / 2 : 0), y = floorY - (r + 1) * bh;
        if (fall) { const s = (c * 7 + r * 13) % 9 - 4; x += d * fall * (1.5 + r * 0.35) + s * fall * 0.25; y += fall * fall * 0.28 - fall * (r * 0.5); if (y > floorY - bh) y = floorY - bh; }
        R(ctx, x, y, bw, bh, '#111'); R(ctx, x + 1, y + 1, bw - 2, bh - 2, (r + c) % 3 ? '#b04a30' : '#c45a38'); R(ctx, x + 1, y + 1, bw - 2, 1, '#d87a58');
      }
      if (t >= 54 && t < 68) { // the invoice
        const x = Math.round(def.x - d * 2), y = floorY - def.body.height - 26 + Math.min(16, (t - 54) * 2);
        R(ctx, x - 9, y - 1, 18, 22, '#111'); R(ctx, x - 8, y, 16, 20, '#f4f0e4'); for (let i = 0; i < 3; i++) R(ctx, x - 5, y + 3 + i * 4, 10, 1, '#8a8a8a');
        RF.font.drawText(ctx, '$', x, y + 12, { align: 'center', color: '#108030' });
      }
    },
  };

  Object.assign(RF.THROWS, {
    handTossed: { name: 'Hand-Tossed', description: 'Three shots to the body, then spins them on his glove like pizza dough, higher every toss. ORDER UP!', kind: 'doughToss', bodyDamage: 2, tossDamage: 2, finisherDamage: 7 },
    alreadyWritten: { name: 'Already Written', description: 'Never lays a hand on them. The light lifts them, he reads them what was written, and then it puts them down. Hard.', kind: 'written', lineDamage: 2.5, finisherDamage: 9 },
    bagCheck: { name: 'Random Bag Check', description: 'Wands them three times (BEEP!), tells them they cannot bring that in here, and shows them the exit from the universe.', kind: 'bagCheck', beepDamage: 2.5, finisherDamage: 9 },
    popQuiz: { name: 'Pop Quiz', description: 'A desk, a test and two minutes that hurt. PENCILS DOWN. Graded on the spot: F.', kind: 'popQuiz', tickDamage: 2.5, finisherDamage: 9 },
    forWhomItTolls: { name: 'Bell Jar', description: 'Lowers the great bell over them and rings it three times. They will still be hearing it tomorrow.', kind: 'tolls', tollDamage: 3.5, finisherDamage: 6 },
    rubbedOut: { name: 'Rubbed Out', description: 'Erases them from the shoes up. WHO? Then draws them back in, upside down, a long way off the floor.', kind: 'rubbedOut', rubDamage: 2.5, finisherDamage: 11 },
    contemptOfCourt: { name: 'Contempt of Court', description: 'ORDER! ORDER! ORDER! Three raps of the gavel on their head, a verdict, and the big gavel.', kind: 'contempt', bangDamage: 3, finisherDamage: 8 },
    flyEaglesFly: { name: 'Fly Eagles Fly', description: 'Spells the whole chant into them, a letter at a time. E! A! G! L! E! S! Then kicks the extra point with them. IT\'S GOOD!', kind: 'fightSong', letterDamage: 1.3, puntDamage: 8 },
    theWall: { name: 'The Wall', description: 'Builds a wall around them, three rows, very tall, tremendous. Hands them the bill. Then it falls on them.', kind: 'theWall', rowDamage: 3, finisherDamage: 8 },
  });
})();
