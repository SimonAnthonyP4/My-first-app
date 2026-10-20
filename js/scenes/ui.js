// Shared bits for menu screens: menu keys, a vertical list menu, backdrop, panels.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const C = RF.CONTROLS;

  RF.TITLE_COLORS = ['#fff8c0', '#fff070', '#ffd030', '#ffa020', '#ff7010', '#e04010', '#a02008'];

  // Menus accept either player's keys, plus Enter/Space/Escape.
  const MENU_KEYS = {
    up: [...C.p1.up, ...C.p2.up],
    down: [...C.p1.down, ...C.p2.down],
    left: [...C.p1.left, ...C.p2.left],
    right: [...C.p1.right, ...C.p2.right],
    confirm: ['Enter', 'NumpadEnter', 'Space', ...C.p1.light, ...C.p2.light],
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

    update(kb) {
      const n = this.items.length;
      if (RF.menuPressed(kb, 'up')) this.index = (this.index - 1 + n) % n;
      if (RF.menuPressed(kb, 'down')) this.index = (this.index + 1) % n;
      const item = this.items[this.index];
      if (item.setting) {
        if (RF.menuPressed(kb, 'left')) RF.settings.cycle(item.setting, -1);
        if (RF.menuPressed(kb, 'right') || RF.menuPressed(kb, 'confirm')) RF.settings.cycle(item.setting, 1);
      } else if (RF.menuPressed(kb, 'confirm') && item.onSelect) {
        item.onSelect();
      }
    }

    draw(ctx, x, y, t, opts = {}) {
      const spacing = opts.spacing || 14;
      this.items.forEach((item, i) => {
        const sel = i === this.index;
        const color = sel ? '#ffd030' : '#b8a8a0';
        const yy = y + i * spacing;
        if (item.setting) {
          T(ctx, item.label, x - 8, yy, { align: 'right', color, outline: '#000' });
          const v = RF.settings.valueLabel(item.setting);
          T(ctx, sel ? '< ' + v + ' >' : v, x + 8, yy, { color: sel ? '#ffffff' : '#d8c8c0', outline: '#000' });
        } else {
          T(ctx, item.label, x, yy, { align: 'center', color, outline: '#000', scale: opts.scale || 1 });
          if (sel) {
            const w = RF.font.textWidth(item.label, opts.scale || 1);
            const bob = Math.floor(t / 8) % 2;
            T(ctx, '>', x - w / 2 - 12 - bob, yy + ((opts.scale || 1) - 1) * 3, { color: '#ff5020', outline: '#000' });
            T(ctx, '<', x + w / 2 + 6 + bob, yy + ((opts.scale || 1) - 1) * 3, { color: '#ff5020', outline: '#000' });
          }
        }
      });
    }
  }
  RF.ListMenu = ListMenu;

  // Darkened, animated first stage behind all menus.
  let backdrop = null;
  RF.drawMenuBackdrop = (ctx, t, darkness = 0.6) => {
    if (!backdrop) backdrop = new RF.StageRenderer(RF.STAGES[0]);
    backdrop.draw(ctx, t);
    ctx.fillStyle = `rgba(8,0,0,${darkness})`;
    ctx.fillRect(0, 0, RF.CONFIG.WIDTH, RF.CONFIG.HEIGHT);
  };

  RF.drawPanel = (ctx, x, y, w, h, border = '#6a2a1a') => {
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(14,4,4,0.92)';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  };

  RF.drawTitle = (ctx, text, y, scale = 2) => {
    T(ctx, text, RF.CONFIG.WIDTH / 2, y, { scale, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
  };
})();
