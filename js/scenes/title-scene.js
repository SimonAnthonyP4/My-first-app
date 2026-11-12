// Main menu: the TERRAMANIA logo burning and bleeding, a featured fighter lit by the flames,
// and a short menu that opens into groups (FIGHT, CHALLENGES, EXTRAS) instead of one long list.
// The first time it is shown there is a PRESS ANY BUTTON screen in front of it.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const LOGO_SCALE = 5, LOGO_Y = 22;
  const MENU_X = 20, MENU_W = 150, ITEM_Y = 104, ITEM_GAP = 14;

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
      this.logoPixels = this.buildLogoMask();
      // The featured fighter changes every few seconds.
      this.showcase = RF.CHARACTERS.map((d) => RF.createSprite(d));
      this.pick = Math.floor(Math.random() * RF.CHARACTERS.length);
      this.swapT = 0; // frames left of the flash when the fighter changes
      this.tipN = Math.floor(Math.random() * 99);
      // Let the fire build up before the first frame is shown.
      for (let i = 0; i < 60; i++) this.stepFire(0);
    }

    open(title, items, quiet) { this.menu = new RF.ListMenu(items); this.group = title; this.slide = quiet ? 0 : 10; }
    close() { this.menu = this.root; this.group = null; this.slide = 10; }
    go(scene) {
      RF.titleAt = { group: this.group, index: this.menu.index, root: this.root.index };
      this.game.setScene(scene);
    }

    // Pixels of the logo, used as a fire source so the flames rise off the letters.
    buildLogoMask() {
      const [c, ctx] = RF.util.makeCanvas(W, 60);
      RF.font.drawText(ctx, RF.CONFIG.TITLE, W / 2, 2, { scale: LOGO_SCALE, align: 'center', color: '#ffffff' });
      const data = ctx.getImageData(0, 0, W, 60).data;
      const pts = [];
      for (let y = 0; y < 60; y++) {
        for (let x = 0; x < W; x++) {
          // Only the top edge of each letter stroke burns; looks like flames licking upward.
          const on = data[(y * W + x) * 4 + 3] > 0, above = y > 0 && data[((y - 1) * W + x) * 4 + 3] > 0;
          if (on && !above) pts.push([x, y]);
        }
      }
      return pts;
    }

    stepFire(logoDrop) {
      this.fire.igniteBottom();
      if (logoDrop === 0) for (const [x, y] of this.logoPixels) this.fire.ignite(x, y + (this.splash ? LOGO_Y + 34 : LOGO_Y), 12 + ((Math.random() * 12) | 0)); // short licks off the letters
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
    }

    logoDrop() { return Math.max(0, 22 - this.t) * 7; } // logo slams down from above

    render(ctx) {
      const t = this.t;
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.6));
      // Backdrop: the cafeteria in deep shadow, then fire over it.
      RF.drawMenuBackdrop(ctx, t, 0.86);
      ctx.drawImage(this.fire.render(), 0, 0);

      // The featured fighter, big, on the right, lit by the fire
      const def = RF.CHARACTERS[this.pick];
      if (def && !this.splash) {
        const x = 296, y = 204, k = Math.min(1.5, 128 / def.body.height), rise = this.swapT ? this.swapT * 4 : 0;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(x + 26, y + 30 + rise); ctx.scale(k * 2, k * 2); this.showcase[this.pick].draw(ctx, 'idle', 0, 0, 0, -1, '#1a0202'); ctx.restore();
        ctx.save(); ctx.translate(x, y + rise); ctx.scale(k, k);
        this.showcase[this.pick].draw(ctx, 'idle', Math.floor(t / 18) % 2, 0, 0, -1, this.swapT > 7 ? '#ff2010' : null); ctx.restore();
        // their name on a slash, and what they say
        const nw = Math.max(RF.font.textWidth(def.name.toUpperCase()), RF.font.textWidth(def.archetype.toUpperCase())) + 16, nx = W - nw - 4;
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(nx + 6, 176); ctx.lineTo(W, 176); ctx.lineTo(W, 197); ctx.lineTo(nx - 2, 197); ctx.fill();
        ctx.fillStyle = '#c01010'; ctx.fillRect(nx + 5, 176, W - nx, 2);
        T(ctx, def.name.toUpperCase(), W - 6, 180, { align: 'right', color: '#ffffff', outline: '#000' });
        T(ctx, def.archetype.toUpperCase(), W - 6, 189, { align: 'right', color: '#e02818', outline: '#000' });
        if (def.quote && this.swapT === 0) RF.font.wrap('"' + def.quote + '"', 22).slice(0, 3).forEach((l, i) => T(ctx, l, 296, 88 + i * 9, { align: 'center', color: '#e8dcc8', outline: '#000' }));
      }
      const glow = ctx.createLinearGradient(0, H - 90, 0, H);
      glow.addColorStop(0, 'rgba(200,10,0,0)');
      glow.addColorStop(1, 'rgba(200,10,0,0.3)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, H - 90, W, 90);

      // chains hanging in the top corners, swaying
      for (const [cx0, dir] of [[18, 1], [W - 18, -1], [40, 1], [W - 40, -1]]) for (let k = 0; k < (cx0 === 18 || cx0 === W - 18 ? 9 : 5); k++) {
        const sx = Math.round(cx0 + Math.sin(t / 50 + cx0) * k * 0.5 * dir), sy = k * 6 - 2;
        ctx.fillStyle = '#0a0a0c'; ctx.fillRect(sx - 2, sy, 5, 7); ctx.fillStyle = k % 2 ? '#6a6a72' : '#4a4a52'; ctx.fillRect(sx - 1, sy + 1, 3, 5); ctx.fillStyle = '#0a0a0c'; ctx.fillRect(sx, sy + 2, 1, 3);
      }
      // red lightning: a flash every few seconds
      const lt = t % 400;
      if (t > 60 && (lt < 4 || (lt > 8 && lt < 11))) { ctx.fillStyle = 'rgba(255,40,30,0.22)'; ctx.fillRect(0, 0, W, H); }

      // Logo: dark outline, bone-to-blood gradient, blood running down from the letters
      const drop = this.logoDrop(), ly = this.splash ? LOGO_Y + 34 : LOGO_Y;
      const molten = ['#ffffff', '#f4e4dc', '#e8a090', '#e02818', '#b00c0c', '#780404', '#3a0000'];
      if (!drop) for (let i = 0; i < 22; i++) {
        const dx = 70 + i * 11 + (i * 7) % 5, len = Math.min(dx > 98 && dx < 286 && !this.splash ? 5 + (i * 13) % 4 : 6 + (i * 13) % 22, Math.max(0, (t - 30 - i * 3) * 0.25)) + Math.sin(t / 30 + i) * 1.5;
        if (len > 0) { ctx.fillStyle = '#6a0202'; ctx.fillRect(dx, ly + 33, 2, Math.round(len)); ctx.fillStyle = '#c01010'; ctx.fillRect(dx, ly + 33, 1, Math.round(len)); ctx.fillRect(dx, ly + 33 + Math.round(len), 2, 2); }
      }
      T(ctx, RF.CONFIG.TITLE, W / 2 + 2, ly - drop + 3, { scale: LOGO_SCALE, align: 'center', color: '#000000' });
      T(ctx, RF.CONFIG.TITLE, W / 2, ly - drop + 1, { scale: LOGO_SCALE, align: 'center', color: '#1a0000' });
      T(ctx, RF.CONFIG.TITLE, W / 2, ly - drop, { scale: LOGO_SCALE, align: 'center', color: molten, outline: '#2a0000' });
      if (t < 30 && t > 20) { ctx.fillStyle = `rgba(255,220,150,${(30 - t) / 12})`; ctx.fillRect(0, 0, W, H); } // impact flash
      if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashT / 14})`; ctx.fillRect(0, 0, W, H); }
      T(ctx, 'NO RULES. NO MERCY. NO LUNCH.', W / 2, ly + 43, { align: 'center', color: '#e02818', outline: '#000' });

      if (this.splash) { // ---- PRESS ANY BUTTON
        if (t > 34 && Math.floor(t / 24) % 2 === 0) T(ctx, 'PRESS ANY BUTTON', W / 2, 150, { scale: 2, align: 'center', color: '#ffffff', outline: '#200000' });
        T(ctx, RF.CHARACTERS.length + ' FIGHTERS   ' + RF.STAGES.length + ' STAGES   A ' + RF.STORY.chapters.filter((c) => !c.side).length + '-CHAPTER STORY', W / 2, 184, { align: 'center', color: '#a89490', outline: '#000' });
        ctx.restore(); RF.drawGrit(ctx, t);
        return;
      }

      // ---- the menu: a black steel slab on the left, sliding in
      const items = this.menu.items, n = items.length, sx = MENU_X - this.slide * this.slide * 1.6, top = ITEM_Y - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.84)';
      ctx.beginPath(); ctx.moveTo(sx - 30, top); ctx.lineTo(sx + MENU_W + 8, top); ctx.lineTo(sx + MENU_W - 6, top + n * ITEM_GAP + 16); ctx.lineTo(sx - 30, top + n * ITEM_GAP + 16); ctx.fill();
      ctx.fillStyle = '#c01010'; ctx.fillRect(sx - 30, top, MENU_W + 38, 2);
      for (const by of [top + 4, top + n * ITEM_GAP + 9]) { ctx.fillStyle = '#5a5a60'; ctx.fillRect(sx - 14, by, 3, 3); ctx.fillStyle = '#b0b0b8'; ctx.fillRect(sx - 14, by, 1, 1); } // rivets
      T(ctx, this.group || 'MAIN MENU', sx + 2, top - 9, { color: this.group ? '#ffd030' : '#8a7a78', outline: '#000' });
      this.menu.area = { x0: sx - 30, x1: sx + MENU_W + 8, y0: ITEM_Y - 3, step: ITEM_GAP };   // (for taps)
      items.forEach((item, i) => {
        const sel = i === this.menu.index, y = ITEM_Y + i * ITEM_GAP, x = sx + (sel ? 16 + Math.round(Math.sin(t / 5)) : 4);
        if (sel) {
          RF.drawSlash(ctx, sx + MENU_W / 2 - 8, y, MENU_W + 4, 11, t);
          RF.drawSkull(ctx, sx + 2, y, t);
        }
        T(ctx, item.label, x, y, { outline: '#000', color: sel ? '#ffffff' : item.label === 'BACK' ? '#5a4a48' : '#8a7a78' });
        if (item.label !== 'BACK' && this.menu === this.root && i > 0 && i < 4) T(ctx, '>', sx + MENU_W - 12, y, { color: sel ? '#ffffff' : '#4a3a38', outline: '#000' }); // opens a group
      });
      const desc = items[this.menu.index].desc;
      if (desc) T(ctx, desc, W / 2, LOGO_Y + 53, { align: 'center', color: '#a89490', outline: '#000' });
      ctx.restore();
      RF.drawGrit(ctx, t);

      // ---- the bottom edge: your rank, and a tip that changes
      RF.profile.draw(ctx, 6, 203, 118);
      const tip = RF.tip(this.tipN), ta = Math.min(1, (t % 420) / 20, (420 - (t % 420)) / 20);
      ctx.globalAlpha = Math.max(0, ta); RF.font.wrap('TIP: ' + tip, 41).slice(0, 2).forEach((l, i) => T(ctx, l, 130, 204 + i * 9, { color: '#8a7a78', outline: '#000' })); ctx.globalAlpha = 1;
      const mods = RF.MOD_SETTINGS.filter((m) => RF.CONFIG[m.id]).length;
      if (mods) T(ctx, mods + ' PARTY MOD' + (mods > 1 ? 'S' : '') + ' ON', 6, 193, { color: '#ff9a40', outline: '#000' });
    }
  }

  RF.TitleScene = TitleScene;
})();
