// Main menu: a modern fighting-game front end. Glitching chrome logo, slanted
// menu bars that slide out, a big featured fighter on a red slash (left/right
// browses the roster), speed stripes, embers and a scrolling ticker.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const LOGO_X = 12, LOGO_Y = 10, LOGO_S = 3;
  const ITEM_X = 10, ITEM_Y = 52, ITEM_GAP = 14, ITEM_W = 112, ITEM_H = 11;
  const SWAP = 270; // frames each featured fighter stays up
  const HOT = ['#ffffff', '#ffffff', '#ffe8e0', '#ffb0a0', '#ff6060', '#ff2a3a', '#c00818'];

  class TitleScene {
    constructor(game) {
      RF.audio.playSong('menu');
      this.game = game;
      this.t = 0;
      this.shake = 0;
      const go = (s) => () => this.go(s());
      this.menu = new RF.ListMenu([
        { label: 'FIGHT NOW', desc: 'TWO PLAYERS. ONE KEYBOARD. SETTLE IT.', onSelect: go(() => new RF.SelectScene(game)) },
        { label: 'VS CPU', desc: 'YOU AGAINST THE MACHINE.', onSelect: go(() => new RF.SelectScene(game, { cpu: true })) },
        { label: 'ARCADE', desc: 'CLIMB THE TOWER. TOPPLE THE KING.', onSelect: go(() => new RF.SelectScene(game, { cpu: true, arcade: true })) },
        { label: 'SURVIVAL', desc: 'ONE LIFE BAR. HOW LONG CAN YOU LAST?', onSelect: go(() => new RF.SelectScene(game, { cpu: true, survival: true })) },
        { label: 'TRAINING', desc: 'LAB TIME: COMBO TRIALS AND A DUMMY.', onSelect: go(() => new RF.SelectScene(game, { cpu: true, training: true })) },
        { label: 'PARTY MODS', desc: 'BIG HEADS, LOW GRAVITY, TURBO...', onSelect: go(() => new RF.ModsScene(game)) },
        { label: 'RECORDS', desc: 'YOUR STATS AND ACHIEVEMENTS.', onSelect: go(() => new RF.RecordsScene(game)) },
        { label: 'HOW TO PLAY', desc: 'CONTROLS, COMBOS AND SPECIAL MOVES.', onSelect: go(() => new RF.InfoScene(game, 'howto')) },
        { label: 'SETTINGS', desc: 'TWEAK THE GAME TO YOUR TASTE.', onSelect: go(() => new RF.SettingsScene(game)) },
        { label: 'CREDITS', desc: 'THE PEOPLE BEHIND TERRAMANIA.', onSelect: go(() => new RF.InfoScene(game, 'credits')) },
      ]);
      this.slide = this.menu.items.map((_, i) => (i === 0 ? 1 : 0));
      this.lastIndex = 0;
      this.descT = 0;
      this.showcase = RF.CHARACTERS.map((d) => RF.createSprite(d));
      this.feature = Math.floor(Math.random() * RF.CHARACTERS.length);
      this.featureT = 0;
    }

    go(scene) {
      this.game.setScene(scene);
    }

    setFeature(i) {
      const n = RF.CHARACTERS.length;
      this.feature = ((i % n) + n) % n;
      this.featureT = 0;
    }

    update() {
      this.t++;
      const kb = this.game.kb;
      // Attract mode: leave the menu alone and the CPU plays a demo match.
      this.idle = kb.down.size > 0 ? 0 : (this.idle || 0) + 1;
      if (this.idle > 60 * 20) {
        const pick = () => RF.CHARACTERS[Math.floor(Math.random() * RF.CHARACTERS.length)];
        const p1 = pick(), p2 = pick();
        return this.go(new RF.FightScene(this.game, { p1, p2, p2Alt: p1.id === p2.id, cpu: true, demo: true, cpuLevel: 'hard',
          stage: RF.STAGES[Math.floor(Math.random() * RF.STAGES.length)].id }));
      }
      if (this.t === 16) { this.shake = 12; RF.audio.sfx('ko'); }
      if (this.shake > 0) this.shake--;
      // Featured fighter: rotates on its own; left/right browse the roster.
      this.featureT++;
      if (RF.menuPressed(kb, 'left')) { this.setFeature(this.feature - 1); RF.audio.sfx('move'); }
      else if (RF.menuPressed(kb, 'right')) { this.setFeature(this.feature + 1); RF.audio.sfx('move'); }
      else if (this.featureT > SWAP) this.setFeature(this.feature + 1);
      this.menu.update(kb);
      if (this.menu.index !== this.lastIndex) { this.lastIndex = this.menu.index; this.descT = this.t; }
      this.slide = this.slide.map((s, i) => s + ((i === this.menu.index ? 1 : 0) - s) * 0.35);
    }

    logoDrop() { return Math.max(0, 16 - this.t) * 8; } // logo slams down from above

    render(ctx) {
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.6));
      RF.drawSpeedBackdrop(ctx, this.t, { dir: -1 });
      this.drawFeature(ctx);
      this.drawLogo(ctx);
      this.drawMenu(ctx);
      ctx.restore();

      const mods = RF.MOD_SETTINGS.filter((m) => RF.CONFIG[m.id]).length;
      if (mods) RF.slantText(ctx, mods + ' PARTY MOD' + (mods > 1 ? 'S' : '') + ' ON', W - 8, H - 24, { align: 'right', color: '#ffd040', outline: '#000' });
      const r = RF.records.data, got = Object.keys(r.unlocked).length;
      RF.drawTicker(ctx, this.t, `${RF.CHARACTERS.length} FIGHTERS   ///   BEST COMBO ${r.best.combo} HITS   ///   BEST SURVIVAL STREAK ${r.best.survival}   ///   ACHIEVEMENTS ${got}/${RF.ACHIEVEMENTS.length}   ///   NO RULES. NO MERCY. NO LUNCH.   ///   `);
      RF.drawScreenFinish(ctx);
      if (this.t > 14 && this.t < 26) { // impact flash when the logo lands
        ctx.fillStyle = `rgba(255,255,255,${(26 - this.t) / 14})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // A big red slash on the right with the featured fighter sliding in on it.
    drawFeature(ctx) {
      const def = RF.CHARACTERS[this.feature];
      if (!def) return;
      const ft = this.featureT;
      // the slash
      const g = ctx.createLinearGradient(230, 0, W, H);
      g.addColorStop(0, 'rgba(220,20,40,0.75)'); g.addColorStop(1, 'rgba(70,0,12,0.35)');
      ctx.fillStyle = g; RF.slantRect(ctx, 244, 0, 200, H, 56);
      ctx.fillStyle = '#ff3040'; RF.slantRect(ctx, 238, 0, 3, H, 56);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; RF.slantRect(ctx, 234, 0, 1, H, 56);
      // their name, huge and faint, scrolling behind them
      ctx.save();
      ctx.beginPath(); ctx.rect(240, 0, W - 240, H); ctx.clip();
      ctx.globalAlpha = 0.13;
      const big = def.name + '  ', bw = RF.font.textWidth(big, 6), off = (this.t * 0.5) % bw;
      for (let x = 240 - off; x < W; x += bw) T(ctx, big, Math.round(x), 74, { scale: 6, color: '#ffffff' });
      ctx.restore();
      // the fighter: slides in from the right, flashes white as they land
      const p = Math.min(1, ft / 14), e = 1 - Math.pow(1 - p, 3);
      const x = 308 + (1 - e) * 110, s = Math.min(1.7, 150 / def.body.height);
      const frame = Math.floor(this.t / 12);
      ctx.save();
      ctx.translate(Math.round(x), 207);
      ctx.scale(s, s);
      ctx.globalAlpha = 0.5;
      this.showcase[this.feature].draw(ctx, 'idle', frame, 7, 0, -1, '#ff1830'); // red afterimage
      ctx.globalAlpha = 1;
      this.showcase[this.feature].draw(ctx, ft < 18 && ft > 10 ? 'victory' : 'idle', frame, 0, 0, -1, ft < 5 ? 'white' : undefined);
      ctx.restore();
      // name plate
      const nameScale = RF.font.textWidth(def.name, 2) <= 128 ? 2 : 1;
      ctx.fillStyle = '#000'; RF.slantRect(ctx, 236, 8, 160, 19, 8);
      ctx.fillStyle = '#ff2a3a'; RF.slantRect(ctx, 236, 27, 160, 2, 1);
      RF.slantText(ctx, def.name, W - 8 - (1 - e) * 30, nameScale === 2 ? 11 : 14, { scale: nameScale, align: 'right', color: HOT, outline: '#000' });
      const arch = (RF.ARCHETYPES && RF.ARCHETYPES[def.archetype]) || [String(def.archetype).toUpperCase(), '#ffd040'];
      const aw = RF.font.textWidth(arch[0]) + 8;
      ctx.fillStyle = arch[1]; RF.slantRect(ctx, W - 10 - aw, 33, aw, 10, 3);
      T(ctx, arch[0], W - 10 - aw / 2 + 1, 35, { align: 'center', color: '#000' });
      T(ctx, def.origin.length > 26 ? def.origin.slice(0, 25) + '.' : def.origin, W - 8, 47, { align: 'right', color: '#ffd0c8', outline: '#000' });
      if (Math.floor(this.t / 40) % 2) T(ctx, '< >  BROWSE FIGHTERS', W - 8, H - 24, { align: 'right', color: '#ffb0a0', outline: '#000' });
    }

    // Chrome logo with a red/cyan split and the odd glitch.
    drawLogo(ctx) {
      const y = LOGO_Y - this.logoDrop(), title = RF.CONFIG.TITLE, o = { scale: LOGO_S };
      ctx.globalAlpha = 0.75;
      T(ctx, title, LOGO_X - 2, y, Object.assign({ color: '#00d8ff' }, o));
      T(ctx, title, LOGO_X + 2, y + 1, Object.assign({ color: '#ff1030' }, o));
      ctx.globalAlpha = 1;
      T(ctx, title, LOGO_X, y, Object.assign({ color: HOT, outline: '#1a0004' }, o));
      // glitch: every few seconds a few slices of the logo jump sideways
      const gt = this.t % 200;
      if (this.t > 40 && gt < 7) {
        for (let k = 0; k < 3; k++) {
          const band = y + ((k * 7 + gt * 3) % 21), dx = (((k + gt) % 2) ? 1 : -1) * (3 + k * 2);
          ctx.save(); ctx.beginPath(); ctx.rect(0, band, W / 2 + 20, 2 + k); ctx.clip();
          T(ctx, title, LOGO_X + dx, y, Object.assign({ color: k % 2 ? '#00e8ff' : '#ffffff' }, o));
          ctx.restore();
        }
      }
      // tagline bar
      ctx.fillStyle = '#d01024'; RF.slantRect(ctx, LOGO_X - 6, 36, 188, 10, 5);
      ctx.fillStyle = '#000'; RF.slantRect(ctx, LOGO_X - 6, 46, 188, 1, 0);
      RF.slantText(ctx, 'NO RULES. NO MERCY. NO LUNCH.', LOGO_X + 2, 38, { color: '#ffffff' });
    }

    // Slanted bars: the chosen one slides out, glows red and gets chevrons.
    drawMenu(ctx) {
      this.menu.items.forEach((item, i) => {
        const s = this.slide[i], sel = i === this.menu.index;
        const y = ITEM_Y + i * ITEM_GAP, x = ITEM_X + Math.round(s * 8), w = ITEM_W + Math.round(s * 20);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; RF.slantRect(ctx, x + 2, y + 2, w, ITEM_H, 4);
        if (s > 0.05) {
          const g = ctx.createLinearGradient(x, 0, x + w, 0);
          g.addColorStop(0, `rgba(255,42,58,${s})`); g.addColorStop(1, `rgba(120,0,16,${s * 0.8})`);
          ctx.fillStyle = g; RF.slantRect(ctx, x, y, w, ITEM_H, 4);
        } else {
          ctx.fillStyle = 'rgba(24,6,10,0.85)'; RF.slantRect(ctx, x, y, w, ITEM_H, 4);
        }
        ctx.fillStyle = sel ? '#ffffff' : '#5a1a24'; RF.slantRect(ctx, x, y, 2, ITEM_H, 4);
        T(ctx, String(i + 1).padStart(2, '0'), x + 6, y + 2, { color: sel ? '#ffd0d0' : '#6a4048' });
        RF.slantText(ctx, item.label, x + 22, y + 2, { color: sel ? '#ffffff' : '#c8b0b4', outline: '#000' });
        if (sel) {
          const c = Math.floor(this.t / 5) % 3;
          for (let k = 0; k < 3; k++) T(ctx, '>', x + w - 20 + k * 5, y + 2, { color: k === c ? '#ffffff' : '#ff8090' });
        }
      });
      // description of the highlighted item, typed out
      const desc = this.menu.items[this.menu.index].desc || '', n = Math.floor((this.t - this.descT) * 1.5);
      const dy = ITEM_Y + this.menu.items.length * ITEM_GAP + 3;
      ctx.fillStyle = '#ff2a3a'; ctx.fillRect(ITEM_X, dy + 1, 3, 7);
      T(ctx, desc.slice(0, n), ITEM_X + 7, dy + 1, { color: '#ffc8c0', outline: '#000' });
    }
  }

  RF.TitleScene = TitleScene;
})();
