// Shared bits for menu screens: menu keys, a vertical list menu, backdrop, panels.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const C = RF.CONTROLS;

  RF.TITLE_COLORS = ['#ffffff', '#f0d8d0', '#e88070', '#e02818', '#b80c0c', '#7a0404', '#400000'];   // bone white bleeding into dark red

  // Menus accept either player's keys, plus Enter/Space/Escape.
  const MENU_KEYS = {
    up: [...C.p1.up, ...C.p2.up],
    down: [...C.p1.down, ...C.p2.down],
    left: [...C.p1.left, ...C.p2.left],
    right: [...C.p1.right, ...C.p2.right],
    confirm: ['Enter', 'NumpadEnter', 'Space', ...C.p1.light, ...C.p2.light, 'Pad1Cross', 'Pad2Cross'],
    back: ['Escape', 'Backspace', ...C.p1.block, ...C.p2.block],
  };
  RF.menuPressed = (kb, action) => kb.justPressed(...MENU_KEYS[action]);

  // items: [{ label, onSelect?, setting? }] — a `setting` (from RF.SETTINGS)
  // shows its value and changes with left/right.
  class ListMenu {
    constructor(items) {
      this.items = items;
      this.index = 0;
    }

    // A tap (or mouse click) on a row picks it. Rows are found from `this.area`, set by draw() or by
    // a scene that draws its own list: { x0, x1, y0, step, first, count }.
    tapped() {
      const tap = RF.touch && RF.touch.takeTap(), a = this.area;
      if (!tap || !a) return -1;
      const row = Math.floor((tap.y - a.y0) / a.step), i = (a.first || 0) + row;
      return row >= 0 && i < (a.first || 0) + (a.count == null ? this.items.length : a.count) && i < this.items.length && tap.x >= a.x0 && tap.x <= a.x1 ? i : -1;
    }

    update(kb) {
      const n = this.items.length;
      const before = this.index;
      const hit = this.tapped();
      if (hit >= 0) {                                                  // tap = pick it and use it
        this.index = hit;
        const it = this.items[hit];
        if (it.setting) { RF.settings.cycle(it.setting, 1); RF.audio.sfx('move'); }
        else if (it.onSelect) { RF.audio.sfx('select'); it.onSelect(); }
        return;
      }
      if (RF.menuPressed(kb, 'up')) this.index = (this.index - 1 + n) % n;
      if (RF.menuPressed(kb, 'down')) this.index = (this.index + 1) % n;
      if (this.index !== before) RF.audio.sfx('move');
      const item = this.items[this.index];
      if (item.setting) {
        const left = RF.menuPressed(kb, 'left'), right = RF.menuPressed(kb, 'right') || RF.menuPressed(kb, 'confirm');
        if (left) RF.settings.cycle(item.setting, -1);
        if (right) RF.settings.cycle(item.setting, 1);
        if (left || right) RF.audio.sfx('move');
      } else if (RF.menuPressed(kb, 'confirm') && item.onSelect) {
        RF.audio.sfx('select');
        item.onSelect();
      }
    }

    draw(ctx, x, y, t, opts = {}) {
      const spacing = opts.spacing || 14;
      this.area = { x0: x - 135, x1: x + 135, y0: y - Math.floor((spacing - 7) / 2) - 1, step: spacing };
      this.items.forEach((item, i) => {
        const sel = i === this.index;
        const color = sel ? '#ffffff' : '#8a7a78';
        const yy = y + i * spacing;
        if (sel) RF.drawSlash(ctx, x, yy, Math.max(120, RF.font.textWidth(item.label, opts.scale || 1) + 60), 7 * (opts.scale || 1) + 4, t);
        if (item.setting) {
          T(ctx, item.label, x - 8, yy, { align: 'right', color, outline: '#000' });
          const v = RF.settings.valueLabel(item.setting);
          T(ctx, sel ? '< ' + v + ' >' : v, x + 8, yy, { color: sel ? '#ffffff' : '#d8c8c0', outline: '#000' });
        } else {
          T(ctx, item.label, x, yy, { align: 'center', color, outline: '#000', scale: opts.scale || 1 });
          if (sel) {
            const w = RF.font.textWidth(item.label, opts.scale || 1);
            const bob = Math.floor(t / 8) % 2;
            RF.drawSkull(ctx, Math.round(x - w / 2 - 14 - bob), yy + ((opts.scale || 1) - 1) * 3, t);
            RF.drawSkull(ctx, Math.round(x + w / 2 + 7 + bob), yy + ((opts.scale || 1) - 1) * 3, t);
          }
        }
      });
    }
  }
  RF.ListMenu = ListMenu;

  // A blood-red slash behind the chosen item: a slanted bar with a torn edge.
  RF.drawSlash = (ctx, cx, y, w, h, t) => {
    const l = Math.round(cx - w / 2), top = y - 2, k = 0.82 + 0.18 * Math.sin(t / 6);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(l + 5, top - 1); ctx.lineTo(l + w + 7, top - 1); ctx.lineTo(l + w - 3, top + h + 1); ctx.lineTo(l - 5, top + h + 1); ctx.fill();
    const g = ctx.createLinearGradient(l, 0, l + w, 0);
    g.addColorStop(0, `rgba(90,0,0,${k})`); g.addColorStop(0.5, `rgba(200,10,10,${k})`); g.addColorStop(1, `rgba(90,0,0,${k})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(l + 6, top); ctx.lineTo(l + w + 5, top); ctx.lineTo(l + w - 4, top + h); ctx.lineTo(l - 3, top + h); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,100,0.7)'; ctx.fillRect(l + 8, top, w - 6, 1);
    for (let i = 0; i < 5; i++) { const dx = l + 10 + ((i * 53) % (w - 20)), len = 2 + ((i * 7 + (t >> 3)) % 4); ctx.fillStyle = '#7a0404'; ctx.fillRect(dx, top + h, 1, len); } // it drips
  };
  // A tiny skull: the menu cursor.
  RF.drawSkull = (ctx, x, y, t) => {
    const P = ['.#####.', '#######', '#.###.#', '#.###.#', '###.###', '.#####.', '.#.#.#.'];
    const hot = Math.floor(t / 10) % 2;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      const on = P[r][c] === '#';
      ctx.fillStyle = on ? '#f0e8dc' : ((r === 2 || r === 3) && (c === 1 || c === 5) ? (hot ? '#ff2010' : '#a00808') : null);
      if (ctx.fillStyle && (on || ((r === 2 || r === 3) && (c === 1 || c === 5)))) ctx.fillRect(x + c, y + r, 1, 1);
    }
  };
  // Film-grain vignette, ash, and scratches: laid over every menu.
  RF.drawGrit = (ctx, t) => {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
    const v = ctx.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 230);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { // ash drifting down
      const x = (i * 61 + Math.sin(t / 40 + i) * 12 + 400) % W, y = (t * (0.25 + (i % 5) * 0.09) + i * 37) % H;
      ctx.fillStyle = i % 4 ? 'rgba(160,150,150,0.35)' : 'rgba(255,90,40,0.6)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = (t >> 2) % 3; y < H; y += 3) ctx.fillRect(0, y, W, 1); // scanlines
  };

  // Darkened, animated first stage behind all menus.
  let backdrop = null;
  RF.drawMenuBackdrop = (ctx, t, darkness = 0.6) => {
    if (!backdrop) backdrop = new RF.StageRenderer(RF.STAGES[0]);
    backdrop.draw(ctx, t);
    ctx.fillStyle = `rgba(6,0,0,${Math.min(0.94, darkness + 0.1)})`;
    ctx.fillRect(0, 0, RF.CONFIG.WIDTH, RF.CONFIG.HEIGHT);
    RF.drawGrit(ctx, t);
  };

  RF.drawPanel = (ctx, x, y, w, h, border = '#7a0808') => {
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(8,2,2,0.94)';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#e02818';                                   // bolted corners
    for (const [cx, cy] of [[x, y], [x + w - 3, y], [x, y + h - 3], [x + w - 3, y + h - 3]]) ctx.fillRect(cx, cy, 3, 3);
  };

  RF.drawTitle = (ctx, text, y, scale = 2) => {
    T(ctx, text, RF.CONFIG.WIDTH / 2, y, { scale, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
  };
})();
