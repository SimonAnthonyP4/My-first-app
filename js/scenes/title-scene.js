// Main menu: the TERRAMANIA logo burning in real pixel fire, fighters lit by the
// flames on either side, and a flaming cursor.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const LOGO_SCALE = 5, LOGO_Y = 26;
  const ITEM_Y = 92, ITEM_GAP = 10;

  class TitleScene {
    constructor(game) {
      RF.audio.playSong('menu');
      this.game = game;
      this.t = 0;
      this.shake = 0;
      this.menu = new RF.ListMenu([
        { label: 'FIGHT NOW', desc: 'TWO PLAYERS, ONE KEYBOARD', onSelect: () => this.go(new RF.SelectScene(game)) },
        { label: 'ONLINE', desc: 'PLAY A FRIEND ON ANOTHER COMPUTER', onSelect: () => (RF.online.active ? RF.online.end('LEFT ONLINE MATCH') : RF.online.openMenu(game)) },
        { label: 'VS CPU', desc: 'YOU AGAINST THE COMPUTER', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true })) },
        { label: 'ARCADE', desc: 'CLIMB THE TOWER, BEAT THE BOSS', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true, arcade: true })) },
        { label: 'TOURNAMENT', desc: 'A BRACKET FOR 4 OR 8 - PARTY MODE', onSelect: () => this.go(new RF.TournamentSetupScene(game)) },
        { label: 'SURVIVAL', desc: 'ONE HEALTH BAR. HOW FAR CAN YOU GO?', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true, survival: true })) },
        { label: 'TRAINING', desc: 'PRACTICE COMBOS AND TRIALS', onSelect: () => this.go(new RF.SelectScene(game, { cpu: true, training: true })) },
        { label: 'PARTY MODS', desc: 'BIG HEADS, LOW GRAVITY AND MORE', onSelect: () => this.go(new RF.ModsScene(game)) },
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
      if (this.t === 22) { this.shake = 14; RF.audio.sfx('ko'); }
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
        this.showcase[idx].draw(ctx, i === 0 ? 'victory' : 'idle', bob, 0, 0, i === 0 ? 1 : -1, this.swapT > 6 ? '#ffd080' : null);
        ctx.restore();
        // name tag under each fighter
        const tw = RF.font.textWidth(def.name) + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(Math.round(x - tw / 2), 209, tw, 11);
        ctx.fillStyle = '#ff7a2a'; ctx.fillRect(Math.round(x - tw / 2), 209, tw, 1);
        T(ctx, def.name, x, 211, { align: 'center', color: '#ffe0b0', outline: '#000' });
      }
      const glow = ctx.createLinearGradient(0, H - 90, 0, H);
      glow.addColorStop(0, 'rgba(255,90,0,0)');
      glow.addColorStop(1, 'rgba(255,90,0,0.25)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, H - 90, W, 90);

      // Logo: dark outline, molten gradient, white-hot flicker
      const drop = this.logoDrop();
      const molten = ['#ffffff', '#fff6b0', '#ffd040', '#ff9a10', '#ff5a00', '#d02000', '#7a0800'];
      T(ctx, RF.CONFIG.TITLE, W / 2, LOGO_Y - drop + 1, { scale: LOGO_SCALE, align: 'center', color: '#1a0000' });
      T(ctx, RF.CONFIG.TITLE, W / 2, LOGO_Y - drop, { scale: LOGO_SCALE, align: 'center', color: molten, outline: '#2a0000' });
      if (this.t < 30 && this.t > 20) {
        ctx.fillStyle = `rgba(255,220,150,${(30 - this.t) / 12})`;
        ctx.fillRect(0, 0, W, H); // impact flash
      }
      T(ctx, 'NO RULES. NO MERCY. NO LUNCH.', W / 2, LOGO_Y + 42, { align: 'center', color: '#ffb060', outline: '#000' });
      const desc = this.menu.items[this.menu.index].desc;
      if (desc) T(ctx, desc, W / 2, LOGO_Y + 52, { align: 'center', color: '#c8a090', outline: '#000' });

      // Menu plate + items
      ctx.fillStyle = 'rgba(10,0,0,0.65)';
      ctx.fillRect(W / 2 - 74, ITEM_Y - 8, 148, ITEM_GAP * this.menu.items.length + 6);
      ctx.fillStyle = '#8a2a0a';
      ctx.fillRect(W / 2 - 74, ITEM_Y - 8, 148, 1);
      ctx.fillRect(W / 2 - 74, ITEM_Y - 2 + ITEM_GAP * this.menu.items.length - 1, 148, 1);
      this.menu.items.forEach((item, i) => {
        const sel = i === this.menu.index, y = ITEM_Y + i * ITEM_GAP;
        if (sel) {
          // Burning highlight bar behind the chosen item
          const g = ctx.createLinearGradient(W / 2 - 70, 0, W / 2 + 70, 0);
          g.addColorStop(0, 'rgba(255,60,0,0)');
          g.addColorStop(0.5, 'rgba(255,90,0,0.45)');
          g.addColorStop(1, 'rgba(255,60,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(W / 2 - 70, y - 2, 140, 11);
          this.drawFlame(ctx, W / 2 - RF.font.textWidth(item.label) / 2 - 12, y + 7);
          this.drawFlame(ctx, W / 2 + RF.font.textWidth(item.label) / 2 + 12, y + 7);
        }
        T(ctx, item.label, W / 2 + (sel ? Math.round(Math.sin(this.t / 5)) : 0), y, {
          align: 'center', outline: '#000',
          color: sel ? ['#ffffff', '#fff6b0', '#ffe060', '#ffc030', '#ff9a10', '#ff7000', '#e04000'] : '#b8a090',
        });
      });
      ctx.restore();

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
