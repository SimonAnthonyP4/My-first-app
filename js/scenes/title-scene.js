// Main menu. A PRESS ANY BUTTON screen first (the logo, burning, with fighters waiting in the dark at the
// edges); then the menu proper:
//   top     the logo (drawn once to its own canvas: bone white down to bright blood red, a hard dark edge, so
//           every letter reads; the blood only runs from the bottoms of the letters)
//   left    one panel: where you are, the rows, and what the chosen row does in a fixed place under them.
//           The red bar glides between rows; a new page slides its rows in one after another.
//   right   the featured fighter standing on a plate with their name, what they are, and what they say
//   bottom  your rank, and a tip
// The short menu opens into groups (FIGHT, CHALLENGES, EXTRAS) instead of one long list.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const SPLASH_SCALE = 5, SPLASH_Y = 52, MENU_SCALE = 4, MENU_Y = 11;            // the logo, on each screen
  const PX = 14, PW = 172, PY = 58, ITEM_Y = PY + 23, ITEM_GAP = 15;              // the menu panel
  const LOGO_COLORS = ['#ffffff', '#fff0e8', '#ffd0c0', '#ff8068', '#f03a28', '#d81810', '#b00c0c'];

  class TitleScene {
    constructor(game) {
      if (RF.towerModsOff) RF.towerModsOff(); // a rift tower floor's rules never leak out of the tower
      RF.audio.playSong('menu');
      this.game = game;
      this.t = 0;
      this.shake = 0;
      RF.unlocks.check();   // a trophy for anything newly earned
      this.splash = !RF.booted;           // PRESS ANY BUTTON, once per visit
      const go = (make) => () => this.go(make());
      const sub = (title, items) => () => this.open(title, items);
      const back = { label: 'BACK', desc: '', onSelect: () => this.close() };
      // the groups
      const FIGHT = [
        { label: 'VERSUS', desc: 'TWO PLAYERS, ONE KEYBOARD OR TWO CONTROLLERS', onSelect: go(() => new RF.SelectScene(game)) },
        { label: 'VS CPU', desc: 'YOU AGAINST THE COMPUTER', onSelect: go(() => new RF.SelectScene(game, { cpu: true })) },
        { label: 'TAG TEAM', desc: '2 VS 2 - SWAP FIGHTERS MID-MATCH', onSelect: go(() => new RF.SelectScene(game, { cpu: true, tag: true })) },
        { label: 'ONLINE', desc: 'PLAY A FRIEND ON ANOTHER COMPUTER', onSelect: () => (RF.online.active ? RF.online.end('LEFT ONLINE MATCH') : RF.online.openMenu(game)) },
        { label: 'TRAINING', desc: 'PRACTICE COMBOS AND TRIALS', onSelect: go(() => new RF.SelectScene(game, { cpu: true, training: true })) },
        back,
      ];
      const CHALLENGES = [
        { label: 'ARCADE', desc: 'FIVE OPPONENTS, THEN THE BOSS', onSelect: go(() => new RF.SelectScene(game, { cpu: true, arcade: true })) },
        { label: 'RIFT TOWER', desc: 'BOSS RUSH: 10 FLOORS, NEW RULES EACH ONE', onSelect: go(() => new RF.SelectScene(game, { cpu: true, tower: true })) },
        { label: 'SURVIVAL', desc: 'ONE HEALTH BAR. HOW FAR CAN YOU GO?', onSelect: go(() => new RF.SelectScene(game, { cpu: true, survival: true })) },
        { label: 'TOURNAMENT', desc: 'A BRACKET FOR 4 OR 8 - PARTY MODE', onSelect: go(() => new RF.TournamentSetupScene(game)) },
        back,
      ];
      const EXTRAS = [
        { label: 'UNLOCKS', desc: 'COSTUMES AND MODES YOU HAVE EARNED', onSelect: go(() => new RF.UnlocksScene(game)) },
        { label: 'RECORDS', desc: 'YOUR STATS AND ACHIEVEMENTS', onSelect: go(() => new RF.RecordsScene(game)) },
        { label: 'PARTY MODS', desc: 'BIG HEADS, LOW GRAVITY, ITEM DROPS AND MORE', onSelect: go(() => new RF.ModsScene(game)) },
        { label: 'HOW TO PLAY', desc: 'CONTROLS, COMBOS AND SPECIALS', onSelect: go(() => new RF.InfoScene(game, 'howto')) },
        { label: 'CREDITS', desc: 'WHO MADE TERRAMANIA', onSelect: go(() => new RF.InfoScene(game, 'credits')) },
        back,
      ];
      this.root = new RF.ListMenu([
        { label: 'STORY', desc: 'THE LAST BELL - A CINEMATIC CAMPAIGN', onSelect: go(() => new RF.StoryMenuScene(game)) },
        { label: 'FIGHT', desc: 'VERSUS, VS CPU, TAG TEAM, ONLINE, TRAINING', onSelect: sub('FIGHT', FIGHT) },
        { label: 'CHALLENGES', desc: 'ARCADE, RIFT TOWER, SURVIVAL, TOURNAMENT', onSelect: sub('CHALLENGES', CHALLENGES) },
        { label: 'EXTRAS', desc: 'UNLOCKS, RECORDS, PARTY MODS, HOW TO PLAY', onSelect: sub('EXTRAS', EXTRAS) },
        { label: 'SETTINGS', desc: 'DIFFICULTY, SOUND, CONTROLLER', onSelect: go(() => new RF.SettingsScene(game)) },
      ]);
      this.menu = this.root; this.group = null; this.slide = 0;
      if (RF.titleAt) { // come back to where you left the menu
        const g = { FIGHT, CHALLENGES, EXTRAS }[RF.titleAt.group];
        this.root.index = RF.titleAt.root || 0;
        if (g) { this.open(RF.titleAt.group, g, true); this.menu.index = Math.min(g.length - 1, RF.titleAt.index || 0); }
      }
      this.fire = new RF.FireField(W, H, 2); // decay 2 = flames about a quarter of the screen tall
      this.logos = { [SPLASH_SCALE]: this.buildLogo(SPLASH_SCALE), [MENU_SCALE]: this.buildLogo(MENU_SCALE) };
      // The featured fighter changes every few seconds.
      this.showcase = RF.CHARACTERS.map((d) => RF.createSprite(d));
      this.pick = Math.floor(Math.random() * RF.CHARACTERS.length);
      this.swapT = 0; // frames left of the flash when the fighter changes
      this.tipN = Math.floor(Math.random() * 99);
      const n = RF.CHARACTERS.length, r0 = Math.floor(Math.random() * n);
      this.lineup = [0, 1, 2, 3].map((i) => (r0 + i * Math.max(1, Math.floor(n / 4))) % n);   // four of them, waiting in the dark on the first screen
      // Let the fire build up before the first frame is shown.
      for (let i = 0; i < 60; i++) this.stepFire(0);
    }

    open(title, items, quiet) { this.menu = new RF.ListMenu(items); this.group = title; this.slide = quiet ? 0 : 10; }
    close() { this.menu = this.root; this.group = null; this.slide = 10; }
    go(scene) {
      RF.titleAt = { group: this.group, index: this.menu.index, root: this.root.index };
      this.game.setScene(scene);
    }

    // The logo at one size, drawn once: a hard dark edge, then the letters. Also where its top edges are (the
    // fire rises off those) and where the bottoms of the letters are (the blood runs from those).
    buildLogo(scale) {
      const PAD = 4, h = 7 * scale + PAD * 2 + 2, [c, ctx] = RF.util.makeCanvas(W, h), name = RF.CONFIG.TITLE;
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2], [3, 3], [2, 3], [3, 2]]) RF.font.drawText(ctx, name, W / 2 + dx, PAD + dy, { scale, align: 'center', color: dx === 3 || dy === 3 ? '#000000' : '#1c0000' });
      RF.font.drawText(ctx, name, W / 2, PAD, { scale, align: 'center', color: LOGO_COLORS });
      const [m, mctx] = RF.util.makeCanvas(W, h); RF.font.drawText(mctx, name, W / 2, PAD, { scale, align: 'center', color: '#ffffff' });
      const data = mctx.getImageData(0, 0, W, h).data, on = (x, y) => y >= 0 && y < h && data[(y * W + x) * 4 + 3] > 0, top = [], drips = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
        if (on(x, y) && !on(x, y - 1)) top.push([x, y - PAD]);
        if (on(x, y) && !on(x, y + 1) && y >= PAD + 7 * scale - 1 && x % (scale * 2) === 1 && (x * 7) % 3 !== 0) drips.push([x, y - PAD + 1]);   // (only the feet of the letters)
      }
      return { img: c, pad: PAD, top, drips, scale };
    }

    stepFire(logoDrop) {
      this.fire.igniteBottom();
      const lg = this.logos[this.splash ? SPLASH_SCALE : MENU_SCALE], ly = this.splash ? SPLASH_Y : MENU_Y;
      if (logoDrop === 0) for (const [x, y] of lg.top) if (Math.random() < 0.6) this.fire.ignite(x, y + ly, 9 + ((Math.random() * 9) | 0)); // short licks off the letters
      this.fire.step();
    }

    update() {
      this.t++;
      const kb = this.game.kb;
      if (RF.online && RF.online.menuOpen) return; // the ONLINE panel is open on top
      // Attract mode: leave the menu alone and the CPU plays a demo match.
      this.idle = kb.down.size > 0 ? 0 : (this.idle || 0) + 1;
      if (this.idle > 60 * 20) {
        const pick = () => RF.CHARACTERS[Math.floor(Math.random() * RF.CHARACTERS.length)];
        const p1 = pick(), p2 = pick();
        return this.game.setScene(new RF.FightScene(this.game, { p1, p2, p2Alt: p1.id === p2.id, cpu: true, demo: true, cpuLevel: 'hard',
          stage: RF.STAGES[Math.floor(Math.random() * RF.STAGES.length)].id }));
      }
      const drop = this.logoDrop();
      if (this.t === 22) { this.shake = 18; RF.audio.sfx('ko'); RF.audio.sfx('boom'); }
      if (this.t > 60 && this.t % 400 === 0) RF.audio.sfx('rumble');   // thunder with the red lightning
      if (this.shake > 0) this.shake--;
      if (this.slide > 0) this.slide--;
      if (this.flashT > 0) this.flashT--;
      this.stepFire(drop);
      if (this.swapT > 0) this.swapT--;
      if (this.t % 270 === 0 && RF.CHARACTERS.length > 1) { this.swapT = 12; this.pick = (this.pick + 1 + Math.floor(Math.random() * (RF.CHARACTERS.length - 1))) % RF.CHARACTERS.length; }
      if (this.t % 420 === 0) this.tipN++;
      if (this.splash) { // PRESS ANY BUTTON
        if (this.t > 34 && (RF.menuPressed(kb, 'confirm') || (RF.touch && RF.touch.takeTap()) || [...kb.down].some((c) => !/^(Meta|Alt|Control|Shift)/.test(c)) && this.t > 40)) {
          this.splash = false; RF.booted = true; this.shake = 8; this.slide = 14; this.flashT = 10; RF.audio.sfx('select'); RF.audio.sfx('heavy');
        }
        return;
      }
      if (this.group && RF.menuPressed(kb, 'back')) { RF.audio.sfx('block'); return this.close(); }
      this.menu.update(kb);
      if (this.menu && this.menu.items) { const key = this.group + ':' + this.menu.index; if (key !== this.descKey) { this.descKey = key; this.descAt = this.t; } }   // (the description fades in when the row changes)
    }

    logoDrop() { return Math.max(0, 22 - this.t) * 7; } // logo slams down from above

    drawLogo(ctx, scale, ly, t) {
      const lg = this.logos[scale], drop = this.logoDrop(), R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      if (!drop) lg.drips.forEach(([dx, dy], i) => {                              // blood, from the feet of the letters only
        const len = Math.round(Math.min(2 + (i * 13) % (scale * 3), Math.max(0, (t - 30 - i * 3) * 0.2)) + Math.sin(t / 30 + i) * 1.2);
        if (len > 0) { R('#6a0202', dx, ly + dy, 2, len); R('#c01010', dx, ly + dy, 1, len); R('#c01010', dx, ly + dy + len, 2, 2); }
      });
      ctx.drawImage(lg.img, 0, ly - lg.pad - drop);
      T(ctx, 'NO RULES. NO MERCY. NO LUNCH.', W / 2, ly + 7 * scale + (scale > 4 ? 9 : 6) - drop, { align: 'center', color: '#ff5040', outline: '#000' });
    }

    render(ctx) {
      const t = this.t;
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.6));
      // Backdrop: the cafeteria in deep shadow, then fire over it.
      RF.drawMenuBackdrop(ctx, t, 0.86);
      ctx.drawImage(this.fire.render(), 0, 0);
      const glow = ctx.createLinearGradient(0, H - 90, 0, H);
      glow.addColorStop(0, 'rgba(200,10,0,0)'); glow.addColorStop(1, 'rgba(200,10,0,0.3)');
      ctx.fillStyle = glow; ctx.fillRect(0, H - 90, W, 90);
      // chains hanging in the top corners, swaying
      for (const [cx0, dir] of [[10, 1], [W - 10, -1], [26, 1], [W - 26, -1]]) for (let k = 0; k < (cx0 === 10 || cx0 === W - 10 ? 8 : 4); k++) {
        const sx = Math.round(cx0 + Math.sin(t / 50 + cx0) * k * 0.5 * dir), sy = k * 6 - 2;
        ctx.fillStyle = '#0a0a0c'; ctx.fillRect(sx - 2, sy, 5, 7); ctx.fillStyle = k % 2 ? '#6a6a72' : '#4a4a52'; ctx.fillRect(sx - 1, sy + 1, 3, 5); ctx.fillStyle = '#0a0a0c'; ctx.fillRect(sx, sy + 2, 1, 3);
      }
      // red lightning: a flash every few seconds
      const lt = t % 400;
      if (t > 60 && (lt < 4 || (lt > 8 && lt < 11))) { ctx.fillStyle = 'rgba(255,40,30,0.22)'; ctx.fillRect(0, 0, W, H); }

      if (this.splash) { // ---- PRESS ANY BUTTON
        // four of them, waiting in the dark at the edges
        this.lineup.forEach((ci, i) => {
          const def = RF.CHARACTERS[ci], left = i < 2, x = left ? 30 + i * 52 : W - 30 - (i - 2) * 52, k = Math.min(1, 92 / def.body.height) * (i % 2 ? 0.92 : 1.05), dir = left ? 1 : -1, a = Math.min(1, Math.max(0, (t - 40 - i * 8) / 30));
          if (a <= 0) return;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(x + dir * 2, 214); ctx.scale(k, k); this.showcase[ci].draw(ctx, 'idle', Math.floor((t + i * 9) / 20) % 2, 0, 0, dir, '#8a1408'); ctx.restore();   // the fire catches their edge
          ctx.save(); ctx.globalAlpha = a; ctx.translate(x, 214); ctx.scale(k, k); this.showcase[ci].draw(ctx, 'idle', Math.floor((t + i * 9) / 20) % 2, 0, 0, dir, '#070103'); ctx.restore();
        });
        ctx.restore(); RF.drawGrit(ctx, t);
        ctx.save(); if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.6));
        this.drawLogo(ctx, SPLASH_SCALE, SPLASH_Y, t);
        if (t < 30 && t > 20) { ctx.fillStyle = `rgba(255,220,150,${(30 - t) / 12})`; ctx.fillRect(0, 0, W, H); } // impact flash
        if (t > 34) {
          const k = 0.55 + 0.45 * Math.abs(Math.sin(t / 22));
          ctx.globalAlpha = k; RF.drawSlash(ctx, W / 2, 142, 190, 20, t); ctx.globalAlpha = 1;
          T(ctx, 'PRESS ANY BUTTON', W / 2, 144, { scale: 2, align: 'center', color: '#ffffff', outline: '#200000' });
        }
        T(ctx, RF.CHARACTERS.length + ' FIGHTERS   ' + RF.STAGES.length + ' STAGES   A ' + RF.STORY.chapters.filter((c) => !c.side).length + '-CHAPTER STORY', W / 2, 178, { align: 'center', color: '#d8c4b8', outline: '#000' });
        ctx.restore();
        return;
      }

      this.drawShowcase(ctx, t, false);
      ctx.restore();
      RF.drawGrit(ctx, t);
      // (everything you read is drawn after the grain and the vignette, so it stays crisp right to the edges)
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.6));
      this.drawLogo(ctx, MENU_SCALE, MENU_Y, t);
      this.drawShowcase(ctx, t, true);
      this.drawMenu(ctx, t);
      ctx.restore();
      this.drawFooter(ctx, t);
      if (t < 30 && t > 20) { ctx.fillStyle = `rgba(255,220,150,${(30 - t) / 12})`; ctx.fillRect(0, 0, W, H); } // impact flash
      if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashT / 14})`; ctx.fillRect(0, 0, W, H); }
    }

    // The featured fighter, standing on a plate with their name, what they are, and what they say.
    drawShowcase(ctx, t, plate) {
      const def = RF.CHARACTERS[this.pick]; if (!def) return;
      const sp = this.showcase[this.pick], cx = 304, feet = 160, k = Math.min(1.2, 100 / def.body.height), rise = this.swapT ? this.swapT * 3 : 0, a = this.swapT ? 1 - this.swapT / 12 : 1;
      if (plate) return this.drawPlate(ctx, def, a);
      ctx.save(); ctx.globalAlpha = 0.3 * a; ctx.translate(cx + 20, feet + 40); ctx.scale(k * 1.9, k * 1.9); sp.draw(ctx, 'idle', 0, 0, 0, -1, '#1a0202'); ctx.restore();          // their shadow, huge, on the wall
      ctx.fillStyle = 'rgba(255,90,40,0.2)'; ctx.beginPath(); ctx.ellipse(cx, feet + 1, 50, 7, 0, 0, 7); ctx.fill();                                                           // the light they stand in
      ctx.save(); ctx.translate(cx, feet + rise); ctx.scale(k, k); sp.draw(ctx, 'idle', Math.floor(t / 18) % 2, 0, 0, -1, this.swapT > 7 ? '#ff2010' : null); ctx.restore();
    }
    drawPlate(ctx, def, a) {
      const px = 206, py = 162, ph = 42, name = def.name.toUpperCase(), big = RF.font.textWidth(name, 2) <= W - px - 22;
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(px + 10, py - 1); ctx.lineTo(W, py - 1); ctx.lineTo(W, py + ph + 1); ctx.lineTo(px - 1, py + ph + 1); ctx.fill();
      ctx.fillStyle = 'rgba(10,3,4,0.94)'; ctx.beginPath(); ctx.moveTo(px + 11, py); ctx.lineTo(W, py); ctx.lineTo(W, py + ph); ctx.lineTo(px + 1, py + ph); ctx.fill();
      ctx.fillStyle = '#c01010'; ctx.fillRect(px + 10, py, W - px - 10, 2);
      ctx.globalAlpha = a;
      T(ctx, name, W - 8, py + 5, { scale: big ? 2 : 1, align: 'right', color: '#ffffff', outline: '#000' });
      const ay = py + (big ? 21 : 14);
      T(ctx, (def.archetype || '').toUpperCase(), W - 8, ay, { align: 'right', color: '#ff5040', outline: '#000' });
      if (def.quote) RF.font.wrap('"' + def.quote + '"', 27).slice(0, big ? 1 : 2).forEach((l, i) => T(ctx, l, W - 8, ay + 10 + i * 8, { align: 'right', color: '#d8c8b8', outline: '#000' }));
      ctx.globalAlpha = 1;
    }

    // The panel: where you are, the rows, and what the chosen row does.
    drawMenu(ctx, t) {
      const items = this.menu.items, n = items.length, slide = this.slide, sx = Math.round(PX - slide * slide * 2.2), ph = 23 + n * ITEM_GAP + 27;
      ctx.fillStyle = '#000'; ctx.fillRect(sx - 1, PY - 1, PW + 2, ph + 2);
      ctx.fillStyle = 'rgba(10,3,4,0.92)'; ctx.fillRect(sx, PY, PW, ph);
      ctx.fillStyle = '#c01010'; ctx.fillRect(sx, PY, PW, 2); ctx.fillRect(sx, PY, 2, ph);
      T(ctx, this.group || 'MAIN MENU', sx + 10, PY + 8, { color: this.group ? '#ffd030' : '#f0e4d8', outline: '#000' });
      T(ctx, (this.menu.index + 1) + ' / ' + n, sx + PW - 8, PY + 8, { align: 'right', color: '#7a6460', outline: '#000' });
      ctx.fillStyle = '#4a1612'; ctx.fillRect(sx + 8, PY + 18, PW - 16, 1);
      this.menu.area = { x0: sx, x1: sx + PW, y0: ITEM_Y - 4, step: ITEM_GAP };   // (for taps)
      // the bar glides to the chosen row
      const target = ITEM_Y + this.menu.index * ITEM_GAP;
      this.curY = this.curY == null || this.curMenu !== this.menu ? target : this.curY + (target - this.curY) * 0.45; this.curMenu = this.menu;
      RF.drawSlash(ctx, sx + PW / 2 + 2, Math.round(this.curY), PW - 16, 11, t);
      items.forEach((item, i) => {
        const sel = i === this.menu.index, y = ITEM_Y + i * ITEM_GAP, off = Math.max(0, slide * 9 - i * 12), back = item.label === 'BACK';
        if (sel) RF.drawSkull(ctx, sx + 11 - off, y, t);
        T(ctx, item.label, sx + 26 - off + (sel ? 2 : 0), y, { outline: '#000', color: sel ? '#ffffff' : back ? '#8a7470' : '#d8c8c0' });
        if (this.menu === this.root && i > 0 && i < 4) T(ctx, '>', sx + PW - 16, y, { color: sel ? '#ffffff' : '#7a5a54', outline: '#000' }); // opens a group
      });
      const dy = ITEM_Y + n * ITEM_GAP, cur = items[this.menu.index], desc = cur.desc || (cur.label === 'BACK' ? 'BACK TO THE MAIN MENU' : '');
      ctx.fillStyle = '#4a1612'; ctx.fillRect(sx + 8, dy - 2, PW - 16, 1);
      ctx.globalAlpha = Math.min(1, 0.25 + (t - (this.descAt || 0)) / 8);
      RF.font.wrap(desc, 26).slice(0, 2).forEach((l, i) => T(ctx, l, sx + 10, dy + 4 + i * 9, { color: '#c8b4a4', outline: '#000' }));
      ctx.globalAlpha = 1;
    }

    // The bottom edge: your rank, and a tip that changes.
    drawFooter(ctx, t) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 205, W, 19); ctx.fillStyle = '#4a1612'; ctx.fillRect(0, 205, W, 1);
      RF.profile.draw(ctx, 4, 207, 112);
      const mods = RF.MOD_SETTINGS.filter((m) => RF.CONFIG[m.id]).length, tip = RF.tip(this.tipN), ta = Math.min(1, (t % 420) / 20, (420 - (t % 420)) / 20);
      if (mods) T(ctx, mods + ' PARTY MOD' + (mods > 1 ? 'S' : '') + ' ON', W - 6, 208, { align: 'right', color: '#ff9a40', outline: '#000' });
      ctx.globalAlpha = Math.max(0, ta); RF.font.wrap('TIP: ' + tip, 42).slice(0, mods ? 1 : 2).forEach((l, i) => T(ctx, l, 122, (mods ? 216 : 208) + i * 8, { color: '#a89488', outline: '#000' })); ctx.globalAlpha = 1;
    }
  }

  RF.TitleScene = TitleScene;
})();
