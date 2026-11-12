// Main menu: the TERRAMANIA logo burning in real pixel fire, fighters lit by the
// flames on either side, and a flaming cursor.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const LOGO_SCALE = 5, LOGO_Y = 26;
  const ITEM_Y = 100, ITEM_GAP = 11, VISIBLE = 10; // the menu scrolls: ten items show at a time

  class TitleScene {
    constructor(game) {
      if (RF.towerModsOff) RF.towerModsOff(); // a rift tower floor's rules never leak out of the tower
      RF.audio.playSong('menu');
      this.game = game;
      this.t = 0;
      this.shake = 0;
      RF.unlocks.check();   // a trophy for anything newly earned
      this.menu = new RF.ListMenu([
        { label: 'STORY', desc: 'THE LAST BELL - A CINEMATIC CAMPAIGN', onSelect: () => this.go(new RF.StoryMenuScene(game)) },
        { label: 'FIGHT NOW', desc: 'TWO PLAYERS, ONE KEYBOARD', onSelect: () => this.go(new RF.SelectScene(game)) },
        { label: 'ONLINE', desc: 'PLAY A FRIEND ON ANOTHER COMPUTER', onSelect: () => (RF.online.active ? RF.online.end('LEFT ONLINE MATCH') : RF.online.openMenu(game)) },
        { label: 'VS CPU', desc: 'YOU AGAINST THE COMPUTER', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true })) },
        { label: 'TAG TEAM', desc: '2 VS 2 - SWAP FIGHTERS MID-MATCH', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true, tag: true })) },
        { label: 'ARCADE', desc: 'CLIMB THE TOWER, BEAT THE BOSS', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true, arcade: true })) },
        { label: 'RIFT TOWER', desc: 'BOSS RUSH: 10 FLOORS, NEW RULES EACH ONE', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true, tower: true })) },
        { label: 'TOURNAMENT', desc: 'A BRACKET FOR 4 OR 8 - PARTY MODE', onSelect: () => this.go(new RF.TournamentSetupScene(game)) },
        { label: 'SURVIVAL', desc: 'ONE HEALTH BAR. HOW FAR CAN YOU GO?', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true, survival: true })) },
        { label: 'TRAINING', desc: 'PRACTICE COMBOS AND TRIALS', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true, training: true })) },
        { label: 'PARTY MODS', desc: 'BIG HEADS, LOW GRAVITY AND MORE', onSelect: () => this.go(new RF.ModsScene(game)) },
        { label: 'UNLOCKS', desc: 'COSTUMES AND MODES YOU HAVE EARNED', onSelect: () => this.go(new RF.UnlocksScene(game)) },
        { label: 'RECORDS', desc: 'YOUR STATS AND ACHIEVEMENTS', onSelect: () => this.go(new RF.RecordsScene(game)) },
        { label: 'HOW TO PLAY', desc: 'CONTROLS, COMBOS AND SPECIALS', onSelect: () => this.go(new RF.InfoScene(game, 'howto')) },
        { label: 'SETTINGS', desc: 'DIFFICULTY, SOUND, CONTROLLER', onSelect: () => this.go(new RF.SettingsScene(game)) },
        { label: 'CREDITS', desc: 'WHO MADE TERRAMANIA', onSelect: () => this.go(new RF.InfoScene(game, 'credits')) },
      ]);
      this.fire = new RF.FireField(W, H, 2); // decay 2 = flames about a quarter of the screen tall
      this.logoPixels = this.buildLogoMask();
      // Two fighters flank the menu, changing every few seconds.
      this.showcase = RF.CHARACTERS.map((d) => RF.createSprite(d));
      this.pair = [0, Math.min(1, RF.CHARACTERS.length - 1)];
      this.swapT = 0; // frames left of the flash when the pair changes
      // Let the fire build up before the first frame is shown.
      for (let i = 0; i < 60; i++) this.stepFire(0);
    }

    go(scene) {
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
      if (logoDrop === 0) for (const [x, y] of this.logoPixels) this.fire.ignite(x, y + LOGO_Y, 12 + ((Math.random() * 12) | 0)); // short licks off the letters
      this.fire.step();
    }

    update() {
      this.t++;
      if (RF.online && RF.online.menuOpen) return; // the ONLINE panel is open on top
      // Attract mode: leave the menu alone and the CPU plays a demo match.
      this.idle = this.game.kb.down.size > 0 ? 0 : (this.idle || 0) + 1;
      if (this.idle > 60 * 20) {
        const pick = () => RF.CHARACTERS[Math.floor(Math.random() * RF.CHARACTERS.length)];
        const p1 = pick(), p2 = pick();
        return this.go(new RF.FightScene(this.game, { p1, p2, p2Alt: p1.id === p2.id, cpu: true, demo: true, cpuLevel: 'hard',
          stage: RF.STAGES[Math.floor(Math.random() * RF.STAGES.length)].id }));
      }
      const drop = this.logoDrop();
      if (this.t === 22) { this.shake = 18; RF.audio.sfx('ko'); RF.audio.sfx('boom'); }
      if (this.t > 60 && this.t % 400 === 0) RF.audio.sfx('rumble');   // thunder with the red lightning
      if (this.shake > 0) this.shake--;
      this.stepFire(drop);
      if (this.swapT > 0) this.swapT--;
      if (this.t % 240 === 0 && RF.CHARACTERS.length > 1) {
        this.swapT = 10;
        const n = RF.CHARACTERS.length;
        this.pair = [(this.pair[0] + 1) % n, (this.pair[1] + 1) % n];
        if (this.pair[0] === this.pair[1]) this.pair[1] = (this.pair[1] + 1) % n;
      }
      this.menu.update(this.game.kb);
    }

    logoDrop() { return Math.max(0, 22 - this.t) * 7; } // logo slams down from above

    render(ctx) {
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.6));
      // Backdrop: the cafeteria in deep shadow, then fire over it.
      RF.drawMenuBackdrop(ctx, this.t, 0.86);
      ctx.drawImage(this.fire.render(), 0, 0);

      // Fighters lit by the fire
      for (let i = 0; i < 2; i++) {
        const idx = this.pair[i], def = RF.CHARACTERS[idx];
        if (!def) continue;
        const x = i === 0 ? 52 : W - 52, y = 206;
        const bob = Math.floor(this.t / 18) % 2;
        ctx.save();
        const rise = this.swapT ? this.swapT * 3 : 0; // new fighters rise into place
        ctx.translate(x, y + rise);
        ctx.scale(1.35, 1.35);
        this.showcase[idx].draw(ctx, i === 0 ? 'victory' : 'idle', bob, 0, 0, i === 0 ? 1 : -1, this.swapT > 6 ? '#ff2010' : null);
        ctx.restore();
        // name tag under each fighter
        const tw = RF.font.textWidth(def.name) + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(Math.round(x - tw / 2), 209, tw, 11);
        ctx.fillStyle = '#c01010'; ctx.fillRect(Math.round(x - tw / 2), 209, tw, 1);
        T(ctx, def.name, x, 211, { align: 'center', color: '#f0e8dc', outline: '#000' });
      }
      const glow = ctx.createLinearGradient(0, H - 90, 0, H);
      glow.addColorStop(0, 'rgba(200,10,0,0)');
      glow.addColorStop(1, 'rgba(200,10,0,0.3)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, H - 90, W, 90);

      // chains hanging in the top corners, swaying
      for (const [cx0, dir] of [[18, 1], [W - 18, -1], [40, 1], [W - 40, -1]]) for (let k = 0; k < (cx0 === 18 || cx0 === W - 18 ? 9 : 5); k++) {
        const sx = Math.round(cx0 + Math.sin(this.t / 50 + cx0) * k * 0.5 * dir), sy = k * 6 - 2;
        ctx.fillStyle = '#0a0a0c'; ctx.fillRect(sx - 2, sy, 5, 7); ctx.fillStyle = k % 2 ? '#6a6a72' : '#4a4a52'; ctx.fillRect(sx - 1, sy + 1, 3, 5); ctx.fillStyle = '#0a0a0c'; ctx.fillRect(sx, sy + 2, 1, 3);
      }
      // red lightning: a flash every few seconds
      const lt = this.t % 400;
      if (this.t > 60 && (lt < 4 || (lt > 8 && lt < 11))) { ctx.fillStyle = 'rgba(255,40,30,0.22)'; ctx.fillRect(0, 0, W, H); }

      // Logo: dark outline, molten gradient, white-hot flicker
      const drop = this.logoDrop();
      const molten = ['#ffffff', '#f4e4dc', '#e8a090', '#e02818', '#b00c0c', '#780404', '#3a0000']; // bone to blood
      // blood running down from the letters
      if (!drop) for (let i = 0; i < 22; i++) {
        const dx = 70 + i * 11 + (i * 7) % 5, len = Math.min(dx > 98 && dx < 286 ? 5 + (i * 13) % 4 : 6 + (i * 13) % 22,   // short over the tagline
          Math.max(0, (this.t - 30 - i * 3) * 0.25)) + Math.sin(this.t / 30 + i) * 1.5;
        if (len > 0) { ctx.fillStyle = '#6a0202'; ctx.fillRect(dx, LOGO_Y + 33, 2, Math.round(len)); ctx.fillStyle = '#c01010'; ctx.fillRect(dx, LOGO_Y + 33, 1, Math.round(len)); ctx.fillRect(dx, LOGO_Y + 33 + Math.round(len), 2, 2); }
      }
      T(ctx, RF.CONFIG.TITLE, W / 2 + 2, LOGO_Y - drop + 3, { scale: LOGO_SCALE, align: 'center', color: '#000000' });
      T(ctx, RF.CONFIG.TITLE, W / 2, LOGO_Y - drop + 1, { scale: LOGO_SCALE, align: 'center', color: '#1a0000' });
      T(ctx, RF.CONFIG.TITLE, W / 2, LOGO_Y - drop, { scale: LOGO_SCALE, align: 'center', color: molten, outline: '#2a0000' });
      if (this.t < 30 && this.t > 20) {
        ctx.fillStyle = `rgba(255,220,150,${(30 - this.t) / 12})`;
        ctx.fillRect(0, 0, W, H); // impact flash
      }
      T(ctx, 'NO RULES. NO MERCY. NO LUNCH.', W / 2, LOGO_Y + 43, { align: 'center', color: '#e02818', outline: '#000' });
      const desc = this.menu.items[this.menu.index].desc;
      if (desc) T(ctx, desc, W / 2, LOGO_Y + 52, { align: 'center', color: '#a89490', outline: '#000' });

      // Menu plate + items: a black steel slab with blood-red rails
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      const n = this.menu.items.length, rows = Math.min(VISIBLE, n), first = Math.max(0, Math.min(n - rows, this.menu.index - Math.floor(rows / 2)));
      ctx.fillRect(W / 2 - 74, ITEM_Y - 8, 148, ITEM_GAP * rows + 6);
      ctx.fillStyle = '#c01010';
      ctx.fillRect(W / 2 - 74, ITEM_Y - 8, 148, 2);
      ctx.fillRect(W / 2 - 74, ITEM_Y - 2 + ITEM_GAP * rows - 2, 148, 2);
      ctx.fillStyle = '#3a0000'; ctx.fillRect(W / 2 - 74, ITEM_Y - 6, 1, ITEM_GAP * rows + 2); ctx.fillRect(W / 2 + 73, ITEM_Y - 6, 1, ITEM_GAP * rows + 2);
      for (const bx of [W / 2 - 72, W / 2 + 69]) for (const by of [ITEM_Y - 5, ITEM_Y + ITEM_GAP * rows - 7]) { ctx.fillStyle = '#5a5a60'; ctx.fillRect(bx, by, 3, 3); ctx.fillStyle = '#b0b0b8'; ctx.fillRect(bx, by, 1, 1); } // rivets
      const more = (y, up) => { ctx.fillStyle = this.t % 40 < 26 ? '#e02818' : '#5a0808'; ctx.beginPath(); ctx.moveTo(W / 2 + 62, y + (up ? 5 : 0)); ctx.lineTo(W / 2 + 70, y + (up ? 5 : 0)); ctx.lineTo(W / 2 + 66, y + (up ? 0 : 5)); ctx.fill(); };
      if (first > 0) more(ITEM_Y - 5, true);            // more above
      if (first + rows < n) more(ITEM_Y + ITEM_GAP * rows - 9, false); // more below
      this.menu.items.forEach((item, i) => {
        if (i < first || i >= first + rows) return;
        const sel = i === this.menu.index, y = ITEM_Y + (i - first) * ITEM_GAP;
        if (sel) {
          // A blood-red slash behind the chosen item, a skull on either side
          RF.drawSlash(ctx, W / 2, y, 132, 11, this.t);
          RF.drawSkull(ctx, Math.round(W / 2 - RF.font.textWidth(item.label) / 2 - 15), y, this.t);
          RF.drawSkull(ctx, Math.round(W / 2 + RF.font.textWidth(item.label) / 2 + 8), y, this.t);
        }
        T(ctx, item.label, W / 2 + (sel ? Math.round(Math.sin(this.t / 5)) : 0), y, {
          align: 'center', outline: '#000',
          color: sel ? '#ffffff' : '#7a6a68',
        });
      });
      ctx.restore();
      RF.drawGrit(ctx, this.t);

      const mods = RF.MOD_SETTINGS.filter((m) => RF.CONFIG[m.id]).length;
      if (mods) T(ctx, mods + ' PARTY MOD' + (mods > 1 ? 'S' : '') + ' ON', W - 6, H - 10, { align: 'right', color: '#ff9a40', outline: '#000' });
    }

    // Tiny animated flame used as the menu cursor.
    drawFlame(ctx, x, y) {
      const f = Math.floor(this.t / 4) % 3;
      const shapes = [[[0, -9], [-2, -6], [2, -5]], [[1, -10], [-2, -5], [2, -6]], [[-1, -9], [-2, -6], [2, -4]]][f];
      ctx.fillStyle = '#c42000'; ctx.fillRect(x - 3, y - 6, 6, 6);
      ctx.fillStyle = '#ff7a10'; ctx.fillRect(x - 2, y - 7, 4, 6);
      ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 1, y - 5, 2, 4);
      ctx.fillStyle = '#ff7a10';
      for (const [dx, dy] of shapes) ctx.fillRect(x + dx, y + dy, 1, 2);
    }
  }

  RF.TitleScene = TitleScene;
})();
