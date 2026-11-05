// Character select: both players pick at the same time with their own keys.
// Modern layout: a 4 x 4 grid in the middle, each player's column on either side
// with a big portrait, tags, segmented stat bars and their special.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const SLOTS = 16, COLS = 4, SLOT = 26, GAP = 3; // 4 x 4 grid in the middle
  const GRID_W = COLS * SLOT + (COLS - 1) * GAP;
  const GRID_X = Math.floor((W - GRID_W) / 2), GRID_Y = 24;
  const SIDE = 126; // width of each player's column
  const PCOL = ['#ff3040', '#3a8aff'];
  const PRGB = ['255,48,64', '58,138,255'];
  const PBASE = [['#2a0610', '#080004'], ['#06122e', '#000208']];
  const ARCH = RF.ARCHETYPES;
  const HOT = ['#ffffff', '#ffffff', '#ffffff', '#f0f0f0', '#e0e0e0', '#c8c8c8', '#a0a0a0'];

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
      this.flash = [0, 0]; // white flash on lock-in
      this.shake = 0;
      this.moved = [99, 99]; // frames since each cursor moved (name slide-in)
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
      if (this.shake > 0) this.shake--;
      this.moved = this.moved.map((n) => n + 1);
      if (kb.justPressed('Escape') && !this.ready[0] && !this.ready[1]) {
        return this.game.setScene(new RF.TitleScene(this.game));
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
        if (pressed('block')) { this.ready[0] = false; return; }
        return this.updateCursor(1, pressed);
      }
      if (pressed('block')) this.ready[1] = false;
    }

    updateCursor(p, pressed) {
      if (this.ready[p]) {
        if (pressed('block')) this.ready[p] = false;
        return;
      }
      let c = this.cursor[p];
      const n = this.slots.length, rows = Math.ceil(n / COLS);
      if (pressed('left')) c = (c % COLS === 0) ? c + COLS - 1 : c - 1;
      if (pressed('right')) c = (c % COLS === COLS - 1) ? c - COLS + 1 : c + 1;
      if (pressed('up')) c = (c - COLS + rows * COLS) % (rows * COLS);
      if (pressed('down')) c = (c + COLS) % (rows * COLS);
      if (pressed('heavy')) { this.costume[p] = (this.costume[p] + 1) % RF.COSTUMES.length; RF.audio.sfx('move'); }
      const moved = Math.min(c, n - 1) !== this.cursor[p];
      this.cursor[p] = Math.min(c, n - 1);
      if (moved) { RF.audio.sfx('move'); this.moved[p] = 0; }
      if (pressed('light')) {
        if (this.slots[this.cursor[p]]) { this.ready[p] = true; this.notice[p] = 0; this.flash[p] = 14; this.shake = 5; RF.audio.sfx('select'); }
        else { this.notice[p] = 90; RF.audio.sfx('block'); }
      }
    }

    startFight() {
      const p1 = this.slots[this.cursor[0]], p2 = this.slots[this.cursor[1]];
      this.game.setScene(new RF.StageSelectScene(this.game, { p1, p2, costumes: this.costumesFor(), cpu: this.cpu, training: this.training, stage: this.stage }));
    }

    slotPos(i) {
      return [GRID_X + (i % COLS) * (SLOT + GAP), GRID_Y + Math.floor(i / COLS) * (SLOT + GAP)];
    }

    render(ctx) {
      const sides = this.arcade ? 1 : 2;
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.5));
      // Backdrop: dark middle, a red column for P1 and a blue one for P2 (gold in arcade/survival).
      RF.drawSpeedBackdrop(ctx, this.t, { base: ['#0c0608', '#020001'], color: '255,255,255' });
      RF.drawSpeedBackdrop(ctx, this.t, { x: 0, w: SIDE + 6, dir: 1, color: PRGB[0], base: PBASE[0] });
      RF.drawSpeedBackdrop(ctx, this.t, { x: W - SIDE - 6, w: SIDE + 6, dir: -1, color: this.arcade ? '255,200,60' : PRGB[1], base: this.arcade ? ['#2a1a04', '#060300'] : PBASE[1] });
      ctx.fillStyle = PCOL[0]; RF.slantRect(ctx, SIDE + 4, 0, 2, H, 0);
      ctx.fillStyle = this.arcade ? '#ffd030' : PCOL[1]; RF.slantRect(ctx, W - SIDE - 6, 0, 2, H, 0);

      // Header
      ctx.fillStyle = '#000'; RF.slantRect(ctx, GRID_X - 6, 4, GRID_W + 12, 13, 4);
      ctx.fillStyle = '#ff2a3a'; ctx.fillRect(GRID_X - 6, 17, GRID_W + 16, 1);
      RF.slantText(ctx, 'SELECT FIGHTER', W / 2 + 3, 7, { align: 'center', color: '#ffffff' });

      this.drawGrid(ctx, sides);
      this.drawSide(ctx, 0);
      if (this.arcade) this.drawArcadeInfo(ctx); else this.drawSide(ctx, 1);
      this.drawCenter(ctx);
      ctx.restore();

      // Footer hint bar
      let hint = this.ready[0] && this.ready[1] ? 'GET READY...' : 'LIGHT/ENTER = SELECT - HEAVY = COSTUME - BLOCK = CANCEL';
      if (this.cpu && this.ready[0] && !this.ready[1]) hint = this.training ? 'NOW PICK THE TRAINING DUMMY (F OR ENTER)' : 'NOW PICK YOUR CPU OPPONENT (F OR ENTER)';
      if (this.notice[0] || this.notice[1]) hint = 'THAT FIGHTER IS COMING SOON - PICK ANOTHER ONE';
      ctx.fillStyle = '#000'; ctx.fillRect(0, H - 11, W, 11);
      ctx.fillStyle = '#ff2a3a'; ctx.fillRect(0, H - 12, W, 1);
      T(ctx, hint, W / 2, H - 9, { align: 'center', color: '#d8c8c8' });
      RF.drawScreenFinish(ctx);
      if (this.readyTime > 0 && this.readyTime < 7) { // both locked in: white flash
        ctx.fillStyle = `rgba(255,255,255,${(7 - this.readyTime) / 9})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // 4 x 4 portraits; hovered ones light up in the player's colour.
    drawGrid(ctx, sides) {
      this.slots.forEach((def, i) => {
        const [x, y] = this.slotPos(i);
        const hov = [0, 1].filter((p) => p < sides && this.cursor[p] === i);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, SLOT + 2, SLOT + 2);
        const g = ctx.createLinearGradient(0, y, 0, y + SLOT);
        g.addColorStop(0, hov.length ? `rgba(${PRGB[hov[0]]},0.7)` : 'rgba(70,36,46,0.6)');
        g.addColorStop(1, 'rgba(8,3,5,0.95)');
        ctx.fillStyle = g; ctx.fillRect(x, y, SLOT, SLOT);
        if (!def) {
          T(ctx, '?', x + SLOT / 2, y + SLOT / 2 - 7, { scale: 2, align: 'center', color: '#4a2a30' });
          return;
        }
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, SLOT, SLOT); ctx.clip();
        this.sprite(def).draw(ctx, 'idle', 0, x + SLOT / 2 - 1, y + 5 + def.body.height, 1);
        if (!hov.length) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(x, y, SLOT, SLOT); }
        ctx.restore();
        ctx.fillStyle = (ARCH[def.archetype] || [0, '#888'])[1];
        ctx.fillRect(x, y + SLOT - 2, SLOT, 2);
      });
      // Cursors: corner brackets (P1 outside, P2 inside) with a name tab.
      for (let p = 0; p < sides; p++) {
        const [x, y] = this.slotPos(this.cursor[p]);
        if (!this.ready[p] && Math.floor(this.t / 6) % 5 === 0) continue;
        const o = p === 0 ? -3 : 1, pulse = this.ready[p] ? 0 : Math.round(Math.sin(this.t / 5) + 1);
        const c = this.ready[p] ? '#ffd030' : PCOL[p];
        this.brackets(ctx, x + o - pulse, y + o - pulse, SLOT - o * 2 + pulse * 2, c);
        const lab = this.labels[p], lw = RF.font.textWidth(lab) + 5;
        const tx = p === 0 ? x - 3 : x + SLOT + 3 - lw, ty = p === 0 && y > GRID_Y ? y - 12 : y + SLOT + 3;
        ctx.fillStyle = c; RF.slantRect(ctx, tx, ty, lw, 9, 2);
        T(ctx, lab, tx + lw / 2 + 1, ty + 1, { align: 'center', color: '#000' });
      }
    }

    brackets(ctx, x, y, s, c) {
      const L = 7, k = 2;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, L, k); ctx.fillRect(x, y, k, L);
      ctx.fillRect(x + s - L, y, L, k); ctx.fillRect(x + s - k, y, k, L);
      ctx.fillRect(x, y + s - k, L, k); ctx.fillRect(x, y + s - L, k, L);
      ctx.fillRect(x + s - L, y + s - k, L, k); ctx.fillRect(x + s - k, y + s - L, k, L);
    }

    // A slanted chip; returns its width.
    chip(ctx, text, x, y, bg, fg = '#000') {
      const w = RF.font.textWidth(text) + 8;
      ctx.fillStyle = bg; RF.slantRect(ctx, x, y, w, 10, 3);
      T(ctx, text, x + w / 2 + 1, y + 2, { align: 'center', color: fg });
      return w;
    }

    // One player's column: name, tags, a big portrait, stat bars and special.
    drawSide(ctx, p) {
      const def = this.slots[this.cursor[p]];
      const left = p === 0, x0 = left ? 0 : W - SIDE, cx = x0 + SIDE / 2;
      const edge = left ? 6 : W - 6, align = left ? 'left' : 'right';
      const col = this.ready[p] ? '#ffd030' : PCOL[p];
      if (!def) {
        RF.slantText(ctx, '???', edge, 6, { scale: 2, align, color: '#6a4a40', outline: '#000' });
        T(ctx, 'COMING SOON', edge, 30, { align, color: '#a08878', outline: '#000' });
        return;
      }
      const e = 1 - Math.pow(1 - Math.min(1, this.moved[p] / 8), 3);
      const dx = (1 - e) * (left ? -30 : 30);
      // name + underline
      // big type; long names get squeezed sideways to fit instead of shrinking
      const nw = RF.font.textWidth(def.name, 2), squeeze = Math.min(1, (SIDE - 14) / nw);
      ctx.save();
      ctx.translate(Math.round(edge + dx), 0); ctx.scale(squeeze, 1);
      RF.slantText(ctx, def.name, 0, 5, { scale: 2, align, color: HOT, outline: '#000' });
      ctx.restore();
      ctx.fillStyle = col; RF.slantRect(ctx, x0 + (left ? 4 : 6), 21, SIDE - 10, 2, 2);
      // tags: player label + archetype
      const [an, ac] = ARCH[def.archetype] || [String(def.archetype).toUpperCase(), '#ffffff'];
      const lab = this.labels[p];
      if (left) {
        const w1 = this.chip(ctx, lab, 6, 26, col);
        this.chip(ctx, an, 6 + w1 + 3, 26, ac);
      } else {
        const wa = RF.font.textWidth(an) + 8, wl = RF.font.textWidth(lab) + 8;
        this.chip(ctx, an, W - 8 - wa, 26, ac);
        this.chip(ctx, lab, W - 8 - wa - 3 - wl, 26, col);
      }

      // portrait with a spotlight and a coloured afterimage
      const s = Math.min(1.35, 98 / def.body.height), feet = 138, fx = Math.round(cx + (left ? 4 : -4) + dx * 1.5);
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, 38, SIDE, 104); ctx.clip();
      const rg = ctx.createRadialGradient(fx, feet - 44, 4, fx, feet - 44, 70);
      rg.addColorStop(0, `rgba(${PRGB[p]},0.38)`); rg.addColorStop(1, `rgba(${PRGB[p]},0)`);
      ctx.fillStyle = rg; ctx.fillRect(x0, 38, SIDE, 104);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.ellipse(fx, feet, 26, 4, 0, 0, Math.PI * 2); ctx.fill();
      const spr = this.sprite(def, this.costumesFor()[p]), anim = this.ready[p] ? 'victory' : 'idle', fr = Math.floor(this.t / 14);
      const face = left ? 1 : -1;
      ctx.translate(fx, feet); ctx.scale(s, s);
      ctx.globalAlpha = 0.45; spr.draw(ctx, anim, fr, -6 * face, 0, face, PCOL[p]); ctx.globalAlpha = 1;
      spr.draw(ctx, anim, fr, 0, 0, face, this.flash[p] > 7 ? 'white' : undefined);
      ctx.restore();
      // READY stamp
      if (this.ready[p]) {
        ctx.globalAlpha = 1 - Math.max(0, this.flash[p] - 7) / 8;
        ctx.fillStyle = '#000'; RF.slantRect(ctx, x0 + 8, 100, SIDE - 16, 17, 8);
        ctx.fillStyle = '#ffd030'; RF.slantRect(ctx, x0 + 6, 98, SIDE - 16, 17, 8);
        RF.slantText(ctx, 'READY!', cx + 4, 100, { scale: 2, align: 'center', color: '#000' });
        ctx.globalAlpha = 1;
      }

      // stats as segmented bars
      STAT_BARS.forEach(([label, fn], i) => {
        const sy = 144 + i * 8, lx = x0 + 6;
        T(ctx, label, lx, sy, { color: '#b0a0a4' });
        const segs = Math.round(Math.max(0.05, Math.min(1, fn(def.stats))) * 10);
        for (let k = 0; k < 10; k++) {
          ctx.fillStyle = k < segs ? (k >= 8 ? '#ffffff' : col) : 'rgba(255,255,255,0.1)';
          RF.slantRect(ctx, lx + 48 + k * 7, sy, 5, 6, 1);
        }
      });
      // special
      const sp = RF.SPECIALS[def.special];
      RF.slantText(ctx, sp.name, x0 + 7, 178, { color: '#8ff0ff', outline: '#000' });
      const lines = RF.font.wrap(sp.description, 20);
      if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].slice(0, 17).trim().replace(/[.,]+$/, '') + '...'; }
      lines.forEach((l, i) => T(ctx, l, x0 + 6, 187 + i * 8, { color: '#c8d0d8' }));
    }

    // Under the grid: game mode, a big VS and the chosen costumes.
    drawCenter(ctx) {
      const cx = W / 2;
      const mode = this.training ? 'TRAINING' : this.survivalMode ? 'SURVIVAL' : this.arcade ? 'ARCADE' : this.cpu ? 'VS CPU' : 'VERSUS';
      const mw = RF.font.textWidth(mode) + 12;
      ctx.fillStyle = '#ff2a3a'; RF.slantRect(ctx, cx - mw / 2, 142, mw, 10, 3);
      T(ctx, mode, cx + 1, 144, { align: 'center', color: '#ffffff' });
      // VS: red/blue split, punches in when both lock
      const both = this.ready[0] && this.ready[1];
      const k = both ? Math.max(1, 1.8 - this.readyTime * 0.1) : 1 + Math.sin(this.t / 10) * 0.04;
      ctx.save();
      ctx.translate(cx, 172); ctx.scale(k, k);
      ctx.globalAlpha = 0.8;
      RF.slantText(ctx, 'VS', -2, -10, { scale: 3, align: 'center', color: '#ff2a3a' });
      RF.slantText(ctx, 'VS', 2, -9, { scale: 3, align: 'center', color: '#3a8aff' });
      ctx.globalAlpha = 1;
      RF.slantText(ctx, 'VS', 0, -10, { scale: 3, align: 'center', color: both ? RF.TITLE_COLORS : HOT, outline: '#000' });
      ctx.restore();
      // costumes
      const cos = this.costumesFor();
      for (let p = 0; p < (this.arcade ? 1 : 2); p++) {
        if (!this.slots[this.cursor[p]]) continue;
        T(ctx, this.labels[p] + ': ' + RF.COSTUMES[cos[p]].name, cx, 190 + p * 9, { align: 'center', color: cos[p] ? '#ffd030' : PCOL[p], outline: '#000' });
      }
    }

    drawArcadeInfo(ctx) {
      const x0 = W - SIDE, L = x0 + 6;
      // the boss waiting at the top, as a gold silhouette
      if (!this.survivalMode) {
        const me = this.slots[this.cursor[0]], boss = RF.getCharacter(me && me.id === 'sirven' ? 'dabalsa' : 'sirven');
        if (boss) {
          ctx.save();
          ctx.beginPath(); ctx.rect(x0, 0, SIDE, H); ctx.clip();
          ctx.translate(x0 + SIDE / 2 + 10, 206); ctx.scale(1.4, 1.4);
          ctx.globalAlpha = 0.2;
          this.sprite(boss).draw(ctx, 'idle', Math.floor(this.t / 14), 0, 0, -1, '#ffd030');
          ctx.restore();
        }
      }
      RF.slantText(ctx, this.survivalMode ? 'SURVIVAL' : 'ARCADE', W - 6, 5, { scale: 2, align: 'right', color: RF.TITLE_COLORS, outline: '#000' });
      ctx.fillStyle = '#ffd030'; RF.slantRect(ctx, x0 + 6, 21, SIDE - 10, 2, 2);
      (this.survivalMode
        ? ['ONE HEALTH BAR.', 'ENDLESS FIGHTS.', '', 'ONE ROUND EACH,', '30% HEALED AFTER', 'EVERY WIN.', '', 'THE CPU GETS', 'TOUGHER AS YOUR', 'STREAK GROWS.', '', 'BEST STREAK: ' + RF.records.data.best.survival]
        : ['CLIMB THE TOWER:', '5 OPPONENTS, EACH', 'TOUGHER THAN THE', 'LAST ONE.', '', 'THEN THE FINAL', 'BOSS, IN HIS OWN', 'OFFICE.', '', 'LOSE? CONTINUE', 'AND TRY AGAIN.'])
        .forEach((l, i) => T(ctx, l, L, 32 + i * 10, { color: /BOSS|BEST/.test(l) ? '#ffd030' : '#e8dcd0', outline: '#000' }));
    }
  }

  RF.SelectScene = SelectScene;
})();
