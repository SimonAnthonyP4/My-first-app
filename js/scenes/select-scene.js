// Character select: both players pick at the same time with their own keys.
// Shows bio, origin, stats and special for whoever each cursor is on.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384;
  const SLOTS = 38, COLS = 19, SLOT = 18, GAP = 2; // the roster: 19 x 2, along the bottom
  const GRID_X = (W - (COLS * SLOT + (COLS - 1) * GAP)) / 2, GRID_Y = 176;
  const FEET = 138, SIDE = 130;                    // where the big fighters stand; how wide each side is
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
      if (RF.towerModsOff) RF.towerModsOff();
      this.arcade = !!(prev && (prev.arcade || prev.survival || prev.tower));
      this.towerMode = !!(prev && prev.tower);
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
      return [a, p1 && p2 && p1.id === p2.id && a === b ? RF.nextCostume(b) : b];
    }

    // Touch: tap a portrait in the roster to move your cursor there; tap the same one again to pick it.
    tapSelect() {
      const tap = RF.touch && RF.touch.takeTap();
      const p = this.cpu && this.ready[0] ? 1 : 0;                      // VS CPU: you pick yours, then theirs
      if (!tap || tap.y < GRID_Y - 5 || this.ready[p]) return;
      const col = Math.floor((tap.x - GRID_X) / (SLOT + GAP)), row = Math.floor((tap.y - GRID_Y) / (SLOT + GAP)), i = row * COLS + col;
      if (col < 0 || col >= COLS || row < 0 || i >= this.slots.length) return;
      if (this.cursor[p] === i) RF.touch.pulse(RF.CONTROLS.p1.light[0]);
      else { this.cursor[p] = i; RF.audio.sfx('move'); }
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
      this.tapSelect();
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
      if (this.towerMode) return RF.startRiftTower(this.game, this.slots[this.cursor[0]], this.costume[0]);
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
      if (pressed('heavy')) { this.costume[p] = RF.nextCostume(this.costume[p]); RF.audio.sfx('move'); }
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
      const t = this.t, H = 224, sides = this.arcade ? 1 : 2;
      const RGB = ['255,60,40', this.arcade ? '255,200,60' : '60,120,255'], COL = [PCOL[0], this.arcade ? '#ffc83c' : PCOL[1]];
      // ---- backdrop: black, a red wedge for player 1 and a blue one for player 2, stripes racing down them
      ctx.fillStyle = '#040204'; ctx.fillRect(0, 0, W, H);
      for (let p = 0; p < 2; p++) {
        const x0 = p ? W : 0, d = p ? -1 : 1;
        ctx.save(); ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + d * (SIDE + 26), 0); ctx.lineTo(x0 + d * (SIDE - 14), H); ctx.lineTo(x0, H); ctx.clip();
        const g = ctx.createLinearGradient(x0, 0, x0 + d * (SIDE + 26), 0); g.addColorStop(0, `rgba(${RGB[p]},0.5)`); g.addColorStop(1, `rgba(${RGB[p]},0.06)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(${RGB[p]},0.13)`;
        for (let k = 0; k < 9; k++) { const y = ((k * 34 + t * (1.2 + (k % 3) * 0.5)) % (H + 80)) - 60, x = x0 + d * (10 + ((k * 37) % (SIDE - 10))); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 5, y); ctx.lineTo(x + d * 5 - d * 8, y + 46); ctx.lineTo(x - d * 8, y + 46); ctx.fill(); }
        ctx.restore();
        ctx.strokeStyle = `rgba(${RGB[p]},0.8)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + d * (SIDE + 26), 0); ctx.lineTo(x0 + d * (SIDE - 14), H); ctx.stroke(); ctx.lineWidth = 1;
      }

      // ---- the two fighters: a giant shadow behind, the fighter in front, a name slashed across their feet
      for (let p = 0; p < sides; p++) {
        const def = this.slots[this.cursor[p]], x = p === 0 ? 62 : W - 62, dir = p === 0 ? 1 : -1;
        if (!def) { T(ctx, '?', x, 60, { scale: 6, align: 'center', color: 'rgba(255,255,255,0.15)' }); continue; }
        const cos = this.costumesFor()[p], sp = this.sprite(def, cos), k = Math.min(1.4, 118 / def.body.height);
        const pop = this.flash[p] > 0 ? 1 + this.flash[p] * 0.012 : 1, frame = Math.floor(t / 18) % 2;
        ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(x - dir * 14, FEET + 40); ctx.scale(k * 2.1, k * 2.1); sp.draw(ctx, 'idle', 0, 0, 0, dir, p === 0 ? '#2a0604' : (this.arcade ? '#2a1c04' : '#04102a')); ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(x, FEET + 1, 30, 4, 0, 0, Math.PI * 2); ctx.fill();
        const glow = ctx.createRadialGradient(x, FEET, 2, x, FEET, 46); glow.addColorStop(0, `rgba(${RGB[p]},0.5)`); glow.addColorStop(1, `rgba(${RGB[p]},0)`);
        ctx.fillStyle = glow; ctx.fillRect(x - 46, FEET - 14, 92, 20);
        if (this.tag && this.picks[p].length) { // tag team: the first pick, waiting behind
          const d1 = this.slots[this.picks[p][0]];
          ctx.save(); ctx.globalAlpha = 0.8; ctx.translate(x - dir * 34, FEET - 2); ctx.scale(0.8, 0.8); this.sprite(d1).draw(ctx, 'idle', 0, 0, 0, dir, '#000000'); ctx.globalAlpha = 0.55; this.sprite(d1).draw(ctx, 'idle', 0, 0, 0, dir); ctx.restore();
        }
        ctx.save(); ctx.translate(x, FEET); ctx.scale(k * pop, k * pop);
        sp.draw(ctx, this.ready[p] ? 'victory' : 'idle', frame, 0, 0, dir, this.flash[p] > 5 ? 'white' : null); ctx.restore();
        // the name: a black slash with a coloured edge
        const bx = p === 0 ? 0 : W - SIDE, by = FEET + 4;
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx + SIDE + 6, by); ctx.lineTo(bx + SIDE - 2, by + 19); ctx.lineTo(bx - 4, by + 19); ctx.fill();
        ctx.fillStyle = this.ready[p] ? '#ffd030' : COL[p]; ctx.fillRect(bx, by, SIDE, 2);
        const big = RF.font.textWidth(def.name, 2) <= SIDE - 12;
        T(ctx, def.name.toUpperCase(), p === 0 ? 6 : W - 6, by + (big ? 4 : 7), { scale: big ? 2 : 1, align: p === 0 ? 'left' : 'right', color: '#ffffff', outline: '#000' });
        const tagline = this.ready[p] ? 'LOCKED IN' : RF.COSTUMES[cos].name + (cos ? '' : ' - HEAVY: COSTUME');
        T(ctx, tagline, p === 0 ? 6 : W - 6, by + 21, { align: p === 0 ? 'left' : 'right', color: this.ready[p] ? '#ffd030' : cos ? '#ffd030' : '#a89490', outline: '#000' });
      }

      // ---- the middle: who they are
      T(ctx, this.tag ? 'TAG TEAM: PICK TWO' : this.towerMode ? 'RIFT TOWER' : this.survivalMode ? 'SURVIVAL' : this.arcade ? 'ARCADE' : 'CHOOSE YOUR FIGHTER', W / 2, 4, { align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      this.drawInfo(ctx, 0);
      if (this.arcade) this.drawArcadeInfo(ctx); else this.drawInfo(ctx, 1);
      const both = this.ready[0] && this.ready[1];
      if (!this.arcade) {
        const s = both ? 3 + Math.max(0, 8 - this.readyTime) * 0.25 : 2, w = Math.sin(t / 9) * (both ? 0 : 1);
        T(ctx, 'VS', W / 2, 78 + w - s * 3, { scale: Math.round(s), align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      }

      // ---- the roster
      ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, GRID_Y - 5, W, H - GRID_Y + 5);
      ctx.fillStyle = '#c01010'; ctx.fillRect(0, GRID_Y - 5, W, 1);
      this.slots.forEach((def, i) => {
        const x = GRID_X + (i % COLS) * (SLOT + GAP), y = GRID_Y + Math.floor(i / COLS) * (SLOT + GAP);
        const hov = [0, 1].find((p) => p < sides && this.cursor[p] === i), lift = hov === undefined ? 0 : 2;
        ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1 - lift, SLOT + 2, SLOT + 2);
        const g = ctx.createLinearGradient(0, y - lift, 0, y + SLOT);
        g.addColorStop(0, hov === undefined ? (def ? '#3a1410' : '#140808') : hov === 0 ? '#b02a1c' : (this.arcade ? '#b08020' : '#2040b0'));
        g.addColorStop(1, def ? '#120504' : '#0a0403');
        ctx.fillStyle = g; ctx.fillRect(x, y - lift, SLOT, SLOT);
        if (def) {
          ctx.save(); ctx.beginPath(); ctx.rect(x, y - lift, SLOT, SLOT); ctx.clip();
          this.sprite(def).draw(ctx, 'idle', 0, x + SLOT / 2 - 2, y - lift + 5 + def.body.height, 1);
          if (hov === undefined) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, y, SLOT, SLOT); } // others dimmed
          ctx.restore();
          ctx.fillStyle = (ARCH[def.archetype] || [0, '#a08878'])[1]; ctx.fillRect(x, y - lift + SLOT - 2, SLOT, 2); // fighter-type stripe
        } else T(ctx, '?', x + SLOT / 2, y + SLOT / 2 - 7, { scale: 2, align: 'center', color: '#3a1c16' });
      });
      // cursors: corner brackets that breathe (P1 outside, P2 inside, so both show on one slot)
      for (let p = 0; p < sides; p++) {
        const i = this.cursor[p], x = GRID_X + (i % COLS) * (SLOT + GAP), y = GRID_Y + Math.floor(i / COLS) * (SLOT + GAP) - 2;
        const o = (p === 0 ? 2 : -1) + (this.ready[p] ? 0 : Math.round(Math.sin(t / 5 + p) * 1)), c = this.ready[p] ? '#ffd030' : COL[p], L = 6;
        ctx.fillStyle = c;
        for (const [cx, cy, sx, sy] of [[x - o, y - o, 1, 1], [x + SLOT + o, y - o, -1, 1], [x - o, y + SLOT + o, 1, -1], [x + SLOT + o, y + SLOT + o, -1, -1]]) { ctx.fillRect(Math.min(cx, cx + sx * L), cy - (sy < 0 ? 2 : 0), L, 2); ctx.fillRect(cx - (sx < 0 ? 2 : 0), Math.min(cy, cy + sy * L), 2, L); }
        T(ctx, this.labels[p], p === 0 ? x + 1 : x + SLOT - 1, y + SLOT - 8, { align: p === 0 ? 'left' : 'right', color: c, outline: '#000' });
      }
      if (this.tag) this.picks.forEach((pk, p) => pk.forEach((i, n) => { // tag team: who is already on each team
        const x = GRID_X + (i % COLS) * (SLOT + GAP), y = GRID_Y + Math.floor(i / COLS) * (SLOT + GAP), bx = p === 0 ? x : x + SLOT - 8;
        ctx.fillStyle = '#000'; ctx.fillRect(bx, y, 8, 9); ctx.fillStyle = PCOL[p]; ctx.fillRect(bx + 1, y + 1, 6, 7);
        T(ctx, String(n + 1), bx + 1, y + 1, { color: '#ffffff' });
      }));

      // ---- what to press (only when it is not obvious)
      let hint = '';
      if (this.tag && !both) {
        const who = this.cpu && this.ready[0] ? 'THE CPU TEAM' : 'YOUR TEAM', n = this.picks[this.cpu && this.ready[0] ? 1 : 0].length;
        hint = this.cpu ? who + ': PICK FIGHTER ' + (n + 1) + ' OF 2' : 'PICK TWO EACH';
        if (!this.picks[0].length && !this.picks[1].length && !this.ready[0]) hint += ' - THROW = ' + (this.cpu ? '2 PLAYERS' : 'VS CPU');
      }
      if (!this.tag && this.cpu && this.ready[0] && !this.ready[1]) hint = this.training ? 'NOW PICK THE TRAINING DUMMY' : 'NOW PICK YOUR OPPONENT';
      if (this.notice[0] || this.notice[1]) hint = 'THAT FIGHTER IS COMING SOON';
      if (both) hint = 'GET READY...';
      if (hint) { const tw = RF.font.textWidth(hint) + 12; ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(W / 2 - tw / 2, 14, tw, 11); T(ctx, hint, W / 2, 16, { align: 'center', color: '#ffd030', outline: '#000' }); }
      if (both && this.readyTime < 8) { ctx.fillStyle = `rgba(255,240,220,${(8 - this.readyTime) / 10})`; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = (t >> 2) % 3; y < H; y += 3) ctx.fillRect(0, y, W, 1);   // scanlines
    }

    // the mode's rules, where player 2's card would be
    drawArcadeInfo(ctx) {
      const x = 256, y = 30, w = 124;
      const rec = RF.towerRecord ? RF.towerRecord() : {};
      const lines = this.towerMode
        ? ['TEN FLOORS OF RIFT', 'FIGHTERS. EVERY ONE', 'CHANGES THE RULES.', 'THEN: OMEGA LOPEZ.', '', rec.cleared ? 'TOWER CLEARED' : 'BEST: FLOOR ' + (rec.best || 0)]
        : this.survivalMode
        ? ['ONE HEALTH BAR.', 'ENDLESS FIGHTS, ONE', 'ROUND EACH. THE CPU', 'GETS TOUGHER.', '', 'BEST STREAK: ' + RF.records.data.best.survival]
        : ['FIVE OPPONENTS,', 'EACH ONE TOUGHER.', 'THEN KING SIRVEN,', 'IN HIS OWN OFFICE.', '', 'LOSE? TRY AGAIN.'];
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, 106); ctx.fillStyle = '#ffc83c'; ctx.fillRect(x, y, w, 2);
      lines.forEach((l, i) => T(ctx, l, x + 5, y + 8 + i * 10, { color: i === 3 ? '#ff9a40' : i === 5 ? '#ffd030' : '#e0d8d0', outline: '#000' }));
    }

    // one player's card in the middle column: type, where from, the bio, four stats, the special
    drawInfo(ctx, p) {
      const def = this.slots[this.cursor[p]];
      const solo = this.arcade, w = solo ? 120 : 124, x = solo ? 132 : W / 2 - 62, y = solo ? 30 : (p === 0 ? 28 : 100), h = solo ? 106 : 44;
      const c = this.ready[p] ? '#ffd030' : (p === 0 ? PCOL[0] : PCOL[1]);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = c; ctx.fillRect(p === 0 || solo ? x : x + w - 2, y, 2, h);
      const L = x + 6;
      if (!def) { T(ctx, 'COMING SOON', L, y + 6, { color: '#6a4a40', outline: '#000' }); return; }
      const [arch, archCol] = ARCH[def.archetype] || [def.archetype.toUpperCase(), '#ffffff'];
      T(ctx, arch, L, y + 3, { color: archCol, outline: '#000' });
      if (RF.font.textWidth(arch) + RF.font.textWidth(def.origin) + 16 <= w) T(ctx, def.origin.toUpperCase(), x + w - 4, y + 3, { align: 'right', color: '#8a7a78', outline: '#000' });   // where from, when there is room
      STAT_BARS.forEach(([label, fn], i) => {
        const sx = L + (i % 2) * 59, sy = y + 13 + Math.floor(i / 2) * 8, v = Math.max(0.05, Math.min(1, fn(def.stats)));
        T(ctx, label.slice(0, 3), sx, sy, { color: '#a89490' });
        ctx.fillStyle = '#000'; ctx.fillRect(sx + 21, sy, 32, 6);
        ctx.fillStyle = v > 0.75 ? '#ff5030' : '#ffd030'; ctx.fillRect(sx + 22, sy + 1, Math.round(30 * v), 4);
      });
      const sp = RF.SPECIALS[def.special];
      T(ctx, sp.name.toUpperCase(), L, y + 31, { color: '#8ff0ff', outline: '#000' });
      if (solo) { // room for the whole story
        RF.font.wrap(def.bio.toUpperCase(), 19).slice(0, 3).forEach((l, i) => T(ctx, l, L, y + 44 + i * 9, { color: '#e0d8d0', outline: '#000' }));
        RF.font.wrap(sp.description.toUpperCase(), 19).slice(0, 3).forEach((l, i) => T(ctx, l, L, y + 76 + i * 9, { color: '#a8c0c8', outline: '#000' }));
      }
    }
  }

  RF.SelectScene = SelectScene;
})();
