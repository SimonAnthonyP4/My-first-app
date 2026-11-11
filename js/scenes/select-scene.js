// Character select: both players pick at the same time with their own keys.
// Shows bio, origin, stats and special for whoever each cursor is on.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384;
  const SLOTS = 30, COLS = 10, SLOT = 22, GAP = 2; // 10 x 3 grid
  const GRID_X = (W - (COLS * SLOT + (COLS - 1) * GAP)) / 2, GRID_Y = 18;
  const PCOL = ['#ff4a3a', '#4a8aff'];
  const ARCH = { tank: ['TANK', '#ff9a40'], light: ['LIGHT', '#60e0ff'], boss: ['BOSS', '#ffd040'], balanced: ['ALL-ROUND', '#80e080'], sorcerer: ['SORCERER', '#ff70b0'], rich: ['RICH KID', '#60d060'], angel: ['ANGEL', '#fff2a0'], defender: ['DEFENSIVE', '#80c0ff'], boxer: ['BOXER', '#ff6050'], golfer: ['GOLFER', '#80ffb0'], menace: ['MENACE', '#ff4060'], hyper: ['HYPER', '#40e8ff'], maestro: ['MAESTRO', '#c080ff'], genius: ['OMNISCIENT', '#00ffd0'], daredevil: ['DAREDEVIL', '#ff8030'], linebacker: ['LINEBACKER', '#60ff60'], skater: ['SKATER', '#ff60a0'], admin: ['ASST. PRINCIPAL', '#ffd030'] };

  // Stat bars normalised to 0..1 for display only.
  const STAT_BARS = [
    ['SPEED', (s) => s.walkSpeed / 3],
    ['POWER', (s) => (s.damage - 0.5) / 1],
    ['DEFENSE', (s) => (s.damageReduction + 0.3) / 0.6],
    ['ATK SPD', (s) => (s.attackSpeed - 0.5) / 1],
  ];

  class SelectScene {
    constructor(game, prev) {
      RF.audio.playSong('menu');
      this.game = game;
      this.t = 0;
      // Fill up to 8 slots; empty ones are "coming soon" until the full roster lands.
      this.slots = [];
      for (let i = 0; i < Math.max(SLOTS, RF.CHARACTERS.length); i++) this.slots.push(RF.CHARACTERS[i] || null);
      const idx = (def, fallback) => (def ? Math.max(0, this.slots.findIndex((d) => d && d.id === def.id)) : fallback);
      this.cursor = [idx(prev && prev.p1, 0), idx(prev && prev.p2, 1)];
      this.cpu = !!(prev && prev.cpu);
      this.stage = prev && prev.stage;
      this.arcade = !!(prev && (prev.arcade || prev.survival));
      this.survivalMode = !!(prev && prev.survival);
      this.training = !!(prev && prev.training);
      this.tag = !!(prev && prev.tag);   // TAG TEAM: everyone picks two
      this.picks = [[], []];             // tag team: the first pick of each side (slot numbers)
      this.labels = this.cpu ? ['P1', this.training ? 'DUMMY' : 'CPU'] : ['P1', 'P2'];
      RF.announcer.say('CHOOSE YOUR FIGHTER');
      this.ready = [false, false];
      this.costume = (prev && prev.costumes) ? [...prev.costumes] : [0, 0];
      this.readyTime = 0;
      // Light attack picks, block cancels. Enter/Space also pick and Backspace
      // cancels (Enter for P1, numpad Enter for P2). In VS CPU mode the single
      // player can use either side's keys.
      const C = RF.CONTROLS;
      const withMenuKeys = (m, confirm, back) => Object.assign({}, m, { light: [...m.light, ...confirm], block: [...m.block, ...back] });
      const both = {};
      for (const a in C.p1) both[a] = [...C.p1[a], ...C.p2[a]];
      this.inputs = this.cpu
        ? [withMenuKeys(both, ['Enter', 'NumpadEnter', 'Space', 'Pad1Cross', 'Pad2Cross'], ['Backspace'])]
        : [withMenuKeys(C.p1, ['Enter', 'Space', 'Pad1Cross'], ['Backspace']), withMenuKeys(C.p2, ['NumpadEnter', 'Pad2Cross'], [])];
      this.notice = [0, 0]; // frames left to show "coming soon" after picking an empty slot
      this.sprites = new Map();
      this.flash = [0, 0]; // white flash on the preview when a player locks in
    }

    sprite(def, costume = 0) {
      const key = def.id + ':' + costume;
      if (!this.sprites.has(key)) this.sprites.set(key, RF.createSprite(RF.costume(def, costume)));
      return this.sprites.get(key);
    }

    // P2's costume, bumped along if both players picked the same fighter AND costume.
    costumesFor() {
      const [a, b] = this.costume, p1 = this.slots[this.cursor[0]], p2 = this.slots[this.cursor[1]];
      return [a, p1 && p2 && p1.id === p2.id && a === b ? (b + 1) % RF.COSTUMES.length : b];
    }

    update() {
      const kb = this.game.kb;
      this.t++;
      this.notice = this.notice.map((n) => Math.max(0, n - 1));
      this.flash = this.flash.map((n) => Math.max(0, n - 1));
      if (kb.justPressed('Escape') && !this.ready[0] && !this.ready[1]) {
        return this.game.setScene(new RF.TitleScene(this.game));
      }
      if (this.tag && !this.ready[0] && !this.picks[0].length && !this.picks[1].length && kb.justPressed(...RF.CONTROLS.p1.throw, ...RF.CONTROLS.p2.throw)) {
        RF.audio.sfx('select'); // tag team: THROW switches between playing the computer and a second player
        return this.game.setScene(new SelectScene(this.game, { tag: true, cpu: !this.cpu }));
      }
      if (this.cpu) this.updateCpuMode(kb);
      else for (let p = 0; p < 2; p++) this.updateCursor(p, (act) => kb.justPressed(...this.inputs[p][act]));
      if (this.ready[0] && this.ready[1]) {
        if (++this.readyTime > 45) this.startFight();
      } else {
        this.readyTime = 0;
      }
    }

    // VS CPU: player 1 picks their own fighter first, then the CPU's.
    // Block steps back one pick.
    updateCpuMode(kb) {
      const pressed = (act) => kb.justPressed(...this.inputs[0][act]);
      if (!this.ready[0]) return this.updateCursor(0, pressed);
      if (this.survivalMode) return RF.startSurvival(this.game, this.slots[this.cursor[0]], this.costume[0]);
      if (this.arcade) return RF.startArcade(this.game, this.slots[this.cursor[0]], this.costume[0]); // the tower picks your opponents
      if (!this.ready[1]) {
        if (pressed('block') && !this.picks[1].length) { this.ready[0] = false; this.picks[0].pop(); return; }
        return this.updateCursor(1, pressed);
      }
      if (pressed('block')) { this.ready[1] = false; this.picks[1].pop(); }
    }

    updateCursor(p, pressed) {
      if (this.ready[p]) {
        if (pressed('block')) { this.ready[p] = false; this.picks[p].pop(); }
        return;
      }
      if (this.tag && this.picks[p].length && pressed('block')) { this.picks[p].pop(); RF.audio.sfx('block'); return; } // undo the first pick
      let c = this.cursor[p];
      const n = this.slots.length, rows = Math.ceil(n / COLS);
      if (pressed('left')) c = (c % COLS === 0) ? c + COLS - 1 : c - 1;
      if (pressed('right')) c = (c % COLS === COLS - 1) ? c - COLS + 1 : c + 1;
      if (pressed('up')) c = (c - COLS + rows * COLS) % (rows * COLS);
      if (pressed('down')) c = (c + COLS) % (rows * COLS);
      if (pressed('heavy')) { this.costume[p] = (this.costume[p] + 1) % RF.COSTUMES.length; RF.audio.sfx('move'); }
      const moved = Math.min(c, n - 1) !== this.cursor[p];
      this.cursor[p] = Math.min(c, n - 1);
      if (moved) RF.audio.sfx('move');
      if (pressed('light')) {
        const need = this.tag ? 2 : 1;
        if (this.slots[this.cursor[p]] && this.picks[p].includes(this.cursor[p])) RF.audio.sfx('block'); // a team needs two different fighters
        else if (this.slots[this.cursor[p]]) { this.picks[p].push(this.cursor[p]); this.ready[p] = this.picks[p].length >= need; if (!this.tag) this.picks[p] = []; this.notice[p] = 0; this.flash[p] = 12; RF.audio.sfx('select'); }
        else { this.notice[p] = 90; RF.audio.sfx('block'); }
      }
    }

    startFight() {
      const p1 = this.slots[this.cursor[0]], p2 = this.slots[this.cursor[1]];
      if (this.tag) { // the first pick leads, the second waits on the bench; player 2's copies of player 1's fighters wear the alternate colours
        const [a, b] = this.picks.map((pk) => pk.map((i) => this.slots[i])), alt = (d) => (a.some((x) => x.id === d.id) ? 1 : 0);
        return this.game.setScene(new RF.StageSelectScene(this.game, { p1: a[0], p2: b[0], costumes: [0, alt(b[0])], tag: { p1b: a[1], p2b: b[1], costumes: [0, alt(b[1])] }, cpu: this.cpu, stage: this.stage }));
      }
      this.game.setScene(new RF.StageSelectScene(this.game, { p1, p2, costumes: this.costumesFor(), cpu: this.cpu, training: this.training, stage: this.stage }));
    }

    render(ctx) {
      RF.drawMenuBackdrop(ctx, this.t, 0.72);
      T(ctx, this.tag ? 'TAG TEAM: PICK TWO FIGHTERS' : 'SELECT YOUR FIGHTER', W / 2, 5, { align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });

      // Grid
      this.slots.forEach((def, i) => {
        const x = GRID_X + (i % COLS) * (SLOT + GAP), y = GRID_Y + Math.floor(i / COLS) * (SLOT + GAP);
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 1, y - 1, SLOT + 2, SLOT + 2);
        const hov = [0, 1].find((p) => p < (this.arcade ? 1 : 2) && this.cursor[p] === i);
        const g = ctx.createLinearGradient(0, y, 0, y + SLOT);
        g.addColorStop(0, hov === undefined ? (def ? '#4a1c14' : '#1a0a08') : hov === 0 ? '#8a2a20' : '#2a3a8a');
        g.addColorStop(1, def ? '#1a0806' : '#100604');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, SLOT, SLOT);
        if (def) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, SLOT, SLOT);
          ctx.clip();
          this.sprite(def).draw(ctx, 'idle', 0, x + SLOT / 2 - 2, y + 6 + def.body.height, 1);
          if (hov === undefined) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y, SLOT, SLOT); } // others dimmed
          ctx.restore();
          ctx.fillStyle = (ARCH[def.archetype] || [0, '#a08878'])[1]; // fighter-type stripe
          ctx.fillRect(x, y + SLOT - 2, SLOT, 2);
        } else {
          T(ctx, '?', x + SLOT / 2, y + SLOT / 2 - 7, { scale: 2, align: 'center', color: '#4a2a20' });
        }
      });
      // Cursors (P1 outer frame, P2 inner frame, so both show on the same slot)
      for (let p = 0; p < (this.arcade ? 1 : 2); p++) {
        const i = this.cursor[p];
        const x = GRID_X + (i % COLS) * (SLOT + GAP), y = GRID_Y + Math.floor(i / COLS) * (SLOT + GAP);
        const blink = this.ready[p] || Math.floor(this.t / 6) % 4 !== 0;
        if (!blink) continue;
        const o = p === 0 ? -2 : 1;
        ctx.strokeStyle = this.ready[p] ? '#ffd030' : PCOL[p];
        ctx.lineWidth = 2;
        ctx.strokeRect(x + o, y + o, SLOT - o * 2, SLOT - o * 2);
        T(ctx, this.labels[p], p === 0 ? x + 1 : x + SLOT - 1, y + SLOT - 9, { align: p === 0 ? 'left' : 'right', color: PCOL[p], outline: '#000' });
      }
      ctx.lineWidth = 1;
      if (this.tag) this.picks.forEach((pk, p) => pk.forEach((i, n) => { // tag team: who is already on each team
        const x = GRID_X + (i % COLS) * (SLOT + GAP), y = GRID_Y + Math.floor(i / COLS) * (SLOT + GAP), bx = p === 0 ? x : x + SLOT - 8;
        ctx.fillStyle = '#000'; ctx.fillRect(bx, y, 8, 9); ctx.fillStyle = PCOL[p]; ctx.fillRect(bx + 1, y + 1, 6, 7);
        T(ctx, String(n + 1), bx + 1, y + 1, { color: '#ffffff' });
      }));

      // Big previews either side of the grid
      for (let p = 0; p < (this.arcade ? 1 : 2); p++) {
        const def = this.slots[this.cursor[p]];
        const x = p === 0 ? 32 : W - 32;
        if (!def) {
          T(ctx, '?', x, 50, { scale: 4, align: 'center', color: '#3a2018' });
          continue;
        }
        const cos = this.costumesFor()[p];
        const anim = this.ready[p] ? 'victory' : 'idle';
        const glow = ctx.createRadialGradient(x, 70, 4, x, 70, 46);
        glow.addColorStop(0, p === 0 ? 'rgba(255,74,58,0.3)' : 'rgba(74,138,255,0.3)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.fillRect(x - 46, 20, 92, 86);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(x, 101, 22, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        this.sprite(def, cos).draw(ctx, anim, Math.floor(this.t / 18) % 2, x, 101, p === 0 ? 1 : -1, this.flash[p] > 5 ? 'white' : null);
        if (this.tag && this.picks[p].length) { // tag team: the first pick, waiting behind
          const d1 = this.slots[this.picks[p][0]];
          ctx.save(); ctx.translate(p === 0 ? x - 18 : x + 18, 99); ctx.scale(0.6, 0.6); this.sprite(d1).draw(ctx, 'idle', 0, 0, 0, p === 0 ? 1 : -1); ctx.restore();
        }
        if (this.ready[p]) { // READY! stamp across their legs
          ctx.fillStyle = '#000'; ctx.fillRect(x - 25, 80, 50, 12);
          ctx.fillStyle = '#ffd030'; ctx.fillRect(x - 24, 81, 48, 10);
          T(ctx, 'READY!', x, 83, { align: 'center', color: '#200000' });
        }

      }

      this.drawInfo(ctx, 0);
      if (this.arcade) this.drawArcadeInfo(ctx); else this.drawInfo(ctx, 1);
      // Costume tags on the panels' top edges
      for (let p = 0; p < (this.arcade ? 1 : 2); p++) {
        if (!this.slots[this.cursor[p]]) continue;
        const cos = this.costumesFor()[p], x = p === 0 ? 32 : W - 32;
        if (this.ready[p] && !cos) continue;
        const label = RF.COSTUMES[cos].name + (this.ready[p] ? '' : ' (HEAVY)'), tw = RF.font.textWidth(label) + 6;
        const lx = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, x)); // keep the tag on screen
        ctx.fillStyle = '#000'; ctx.fillRect(lx - tw / 2, 101, tw, 9);
        T(ctx, label, lx, 102, { align: 'center', color: cos ? '#ffd030' : '#a08878' });
      }

      if (this.ready[0] && this.ready[1]) {
        if (this.readyTime < 8) { ctx.fillStyle = `rgba(255,240,200,${(8 - this.readyTime) / 10})`; ctx.fillRect(0, 0, W, 224); }
        T(ctx, 'VS', W / 2, 78, { scale: 3, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      }
      let hint = this.ready[0] && this.ready[1] ? 'GET READY...' : 'LIGHT/ENTER = SELECT - HEAVY = COSTUME - BLOCK = CANCEL';
      if (this.tag && !(this.ready[0] && this.ready[1])) {
        const who = this.cpu && this.ready[0] ? 'THE CPU TEAM' : 'YOUR TEAM', n = this.picks[this.cpu && this.ready[0] ? 1 : 0].length;
        hint = this.cpu ? who + ': PICK FIGHTER ' + (n + 1) + ' OF 2 - BLOCK = UNDO' : 'PICK TWO EACH - LIGHT = SELECT - BLOCK = UNDO';
        if (!this.picks[0].length && !this.picks[1].length && !this.ready[0]) hint += ' - THROW = ' + (this.cpu ? '2 PLAYERS' : 'VS CPU');
      }
      if (!this.tag && this.cpu && this.ready[0] && !this.ready[1]) hint = this.training ? 'NOW PICK THE TRAINING DUMMY (F OR ENTER)' : 'NOW PICK YOUR CPU OPPONENT (F OR ENTER)';
      if (this.notice[0] || this.notice[1]) hint = 'THAT FIGHTER IS COMING SOON - PICK ANOTHER ONE';
      T(ctx, hint, W / 2, 214, { align: 'center', color: '#a08878', outline: '#000' });
    }

    drawArcadeInfo(ctx) {
      const x = W / 2 + 4, y = 106, w = W / 2 - 8;
      RF.drawPanel(ctx, x, y, w, 104, '#c8a040');
      T(ctx, this.survivalMode ? 'SURVIVAL' : 'ARCADE', x + 6, y + 4, { scale: 2, color: RF.TITLE_COLORS, outline: '#000' });
      (this.survivalMode
        ? ['ONE HEALTH BAR. ENDLESS FIGHTS.', 'ONE ROUND EACH, 30% HEALED AFTER', 'EVERY WIN.', 'THE CPU GETS TOUGHER AS YOUR', 'STREAK GROWS.', '', 'BEST STREAK: ' + RF.records.data.best.survival]
        : ['CLIMB THE TOWER: 5 OPPONENTS,', 'EACH ONE TOUGHER THAN THE LAST.', '', 'THEN THE FINAL BOSS,', 'KING SIRVEN, IN HIS OWN OFFICE.', '', 'LOSE? CONTINUE AND TRY AGAIN.'])
        .forEach((l, i) => T(ctx, l, x + 6, y + 24 + i * 9, { color: i >= 3 && i <= 4 ? '#ff9a40' : '#e0d8d0', outline: '#000' }));
    }

    drawInfo(ctx, p) {
      const def = this.slots[this.cursor[p]];
      const x = p === 0 ? 4 : W / 2 + 4, y = 106, w = W / 2 - 8, h = 104;
      RF.drawPanel(ctx, x, y, w, h, this.ready[p] ? '#c8a040' : PCOL[p]);
      const L = x + 6;
      if (!def) {
        T(ctx, '???', L, y + 6, { scale: 2, color: '#6a4a40', outline: '#000' });
        T(ctx, 'COMING SOON', L, y + 26, { color: '#a08878', outline: '#000' });
        T(ctx, 'MORE TEACHERS ARE', L, y + 40, { color: '#806860', outline: '#000' });
        T(ctx, 'ON THE WAY...', L, y + 49, { color: '#806860', outline: '#000' });
        return;
      }
      const [arch0] = ARCH[def.archetype] || [def.archetype.toUpperCase()];
      const room = w - 24 - RF.font.textWidth(arch0) - (this.ready[p] ? 48 : 0);
      const big = RF.font.textWidth(def.name, 2) <= room; // long names drop to small type
      T(ctx, def.name, L, big ? y + 4 : y + 8, { scale: big ? 2 : 1, color: '#ffffff', outline: '#000' });
      const [arch, archCol] = ARCH[def.archetype] || [def.archetype.toUpperCase(), '#fff'];
      T(ctx, arch, x + w - 6, y + 8, { align: 'right', color: archCol, outline: '#000' });
      if (this.ready[p]) T(ctx, 'READY!', x + w - 6 - RF.font.textWidth(arch) - 8, y + 8, { align: 'right', color: '#ffd030', outline: '#000' });
      T(ctx, 'FROM: ' + def.origin, L, y + 20, { color: '#c8a888', outline: '#000' });
      RF.font.wrap(def.bio, 29).slice(0, 2).forEach((line, i) => T(ctx, line, L, y + 29 + i * 8, { color: '#e0d8d0' }));

      STAT_BARS.forEach(([label, fn], i) => {
        const sx = L + (i % 2) * 88, sy = y + 47 + Math.floor(i / 2) * 9;
        T(ctx, label, sx, sy, { color: '#a89080' });
        const v = Math.max(0.05, Math.min(1, fn(def.stats)));
        const bx = sx + 44, bw = 38;
        ctx.fillStyle = '#000';
        ctx.fillRect(bx, sy, bw, 6);
        ctx.fillStyle = '#ffd030';
        ctx.fillRect(bx + 1, sy + 1, Math.round((bw - 2) * v), 4);
      });

      const sp = RF.SPECIALS[def.special];
      T(ctx, 'SPECIAL: ' + sp.name, L, y + 67, { color: '#8ff0ff', outline: '#000' });
      RF.font.wrap(sp.description, 29).slice(0, 3).forEach((line, i) => T(ctx, line, L, y + 76 + i * 8, { color: '#d0d8e0' }));
    }
  }

  RF.SelectScene = SelectScene;
})();
