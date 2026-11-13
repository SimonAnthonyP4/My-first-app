// THE HEADMASTER'S SIDE (story mode's villains). Not on the roster: they live in RF.EXTRAS and
// RF.getCharacter finds them there.
//
//   RF.emperorDef(def)    Lopez Tuero as THE HEADMASTER: an iron crown, a torn red cape, his coat
//                         gone black, his skin gone grey. The crown and cape are real pixels added
//                         to the drawing, so every pose, every camera angle and every fight has them.
//   RF.crownDef(def)      anyone he has taken: the same crown, their colours drained
//   RF.forgottenDef(def)  THE FORGOTTEN, his army: the students he kept, so long that he no longer
//                         remembers their faces. Grey, and where the face was there is nothing.
//   THE PROCTOR, THE BELL RINGER, THE ERASER   his three lieutenants, drawn for this (tools: none -
//                         their sprites were drawn in code, like Donald Trump's)
(function () {
  const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = (h) => { const [r, g, b] = rgb(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
  const POOL = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*+=~?<>()[]{}:;,|-_/'];

  RF.EXTRAS = [];
  const getCharacter = RF.getCharacter;
  RF.getCharacter = (id) => getCharacter(id) || RF.EXTRAS.find((c) => c.id === id);

  // Add rows above the head (a crown) and columns behind the back (a cape) to a pixel drawing.
  function augment(def, o) {
    const s = def.sprite;
    if (!s || s.type !== 'pixel') return Object.assign({}, def, { costume: o.tag, crowned: true });
    const H = s.grid.length, W = Math.max(...s.grid.map((r) => r.length)), TOP = o.crown ? (o.big ? 8 : 5) : 0, LEFT = o.cape ? 10 : 0;
    const legend = Object.assign({}, s.legend), palette = {}, free = POOL.filter((c) => !(c in legend)), ch = {};
    for (const k in s.palette) palette[k] = s.palette[k] && s.palette[k][0] === '#' ? o.map(s.palette[k], k) : s.palette[k];
    for (const [n, col] of Object.entries(o.extra || {})) { const c = free.shift(); ch[n] = c; legend[c] = n; palette[n] = col; }
    const g = []; for (let r = 0; r < H + TOP; r++) g.push(new Array(W + LEFT).fill('.'));
    s.grid.forEach((row, r) => [...row].forEach((c, x) => { if (c !== ' ') g[r + TOP][x + LEFT] = c; }));
    const on = (r, c) => r >= 0 && r < H && c >= 0 && c < (s.grid[r] || '').length && s.grid[r][c] !== '.' && s.grid[r][c] !== ' ';
    const span = (r) => { let a = -1, b = -1; for (let c = 0; c < W; c++) if (on(r, c)) { if (a < 0) a = c; b = c; } return [a, b]; };
    const set = (r, c, n) => { if (r >= 0 && r < H + TOP && c >= 0 && c < W + LEFT) g[r][c] = ch[n]; };
    if (o.crown) { // a band across the brow, and spikes: a jagged iron crown with one red stone
      let r0 = 0; while (r0 < H && span(r0)[0] < 0) r0++;
      const neck = s.neckRow != null ? s.neckRow : Math.round(H * 0.19);
      let [a, b] = span(Math.min(H - 1, r0 + Math.max(2, Math.round((neck - r0) * 0.3))));
      if (b - a > W * 0.6) { const m = (a + b) / 2; a = Math.round(m - W * 0.2); b = Math.round(m + W * 0.2); }   // (wide hats and hair: keep the crown head-sized)
      a -= 1; b += 1;
      const base = r0 + TOP + 1, n = o.big ? 5 : 3, mid = Math.round((a + b) / 2);   // (pressed down onto the head, not floating over it)
      for (let c = a; c <= b; c++) { set(base, c + LEFT, 'crownA'); set(base - 1, c + LEFT, c === a || c === b ? 'crownA' : 'crownB'); }
      for (let i = 0; i < n; i++) {
        const cx = Math.round(a + (b - a) * (i / (n - 1))), h = (o.big ? [5, 3, 6, 3, 5] : [3, 4, 3])[i];
        for (let k = 0; k < h; k++) { set(base - 2 - k, cx + LEFT, k === h - 1 ? 'crownB' : 'crownA'); if (k < h - 2) set(base - 2 - k, cx + LEFT + (cx < mid ? 1 : -1), 'crownA'); }
      }
      set(base - 1, mid + LEFT, 'gem'); set(base, mid + LEFT, 'gem');
    }
    if (o.cape) { // from the shoulders to the floor, wider as it falls, torn along the hem
      const neck = (s.neckRow != null ? s.neckRow : Math.round(H * 0.19)) + 1;
      for (let r = neck; r < H - 1; r++) {
        let c0 = span(r)[0]; if (c0 < 0) continue;
        const u = (r - neck) / (H - neck), w = Math.round(2 + 7 * u);
        for (let k = 1; k <= w; k++) {
          const c = c0 - k + LEFT; if (r > H - 3 - ((c * 7) % 5)) continue;            // the torn hem
          set(r + TOP, c, k === w ? 'capeD' : ((c + (r >> 2)) % 4 === 0 ? 'capeB' : k <= 2 ? 'capeC' : 'capeA'));
        }
      }
    }
    const sh = (p) => (p ? [p[0] + LEFT, p[1] + TOP] : p);
    const sprite = Object.assign({}, s, { grid: g.map((r) => r.join('')), legend, palette, shoulder: sh(s.shoulder), footCol: (s.footCol || 0) + LEFT,
      sideHand: (s.sideHand || []).map(sh), neckRow: s.neckRow != null ? s.neckRow + TOP : undefined, waistRow: s.waistRow != null ? s.waistRow + TOP : undefined });
    if (sprite.neckRow === undefined) delete sprite.neckRow;
    if (sprite.waistRow === undefined) delete sprite.waistRow;
    return Object.assign({}, def, { costume: o.tag, crowned: true, sprite }, o.over || {});
  }
  const IRON = { crownA: '#17131f', crownB: '#5a4a72', gem: '#ff2a3c' };

  // ---- other people: the same drawings in different clothes (alumni, the 2016 class, the Forgotten
  // once they have faces). Skin and brown hair keep their colour; everything else is turned round the
  // colour wheel. RF.costume(def, 'alt1' | 'alt2' | 'alt3'), or { costume: 'alt1' } in a story cast.
  const ALT = { alt1: 140, alt2: 215, alt3: 290 };
  const hx = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('');
  const recolour = (c, deg) => {
    const n = parseInt(c.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (d < 0.05) {                                                            // black, grey and white cloth: a tint of the new colour
      if (l < 0.07 || l > 0.93) return c;
      const t = (deg / 60) % 6, x = 1 - Math.abs((t % 2) - 1), k = 0.34 * (1 - Math.abs(2 * l - 1)), m = l - k / 2;
      const [R, G, B] = t < 1 ? [k, k * x, 0] : t < 2 ? [k * x, k, 0] : t < 3 ? [0, k, k * x] : t < 4 ? [0, k * x, k] : t < 5 ? [k * x, 0, k] : [k, 0, k * x];
      return hx(R + m, G + m, B + m);
    }
    const sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const hue = 60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
    if (hue >= 8 && hue <= 38 && sat >= 0.28) return c;                        // skin and brown hair stay
    return RF.util.hueShift(c, deg);
  };
  const costume0 = RF.costume;
  RF.costume = function (def, n) {
    if (!ALT[n]) return costume0(def, n);
    if (!def.sprite || !def.sprite.palette) return def;
    const pal = {};
    for (const k in def.sprite.palette) { const c = def.sprite.palette[k]; pal[k] = typeof c === 'string' && c.length === 7 && c[0] === '#' ? recolour(c, ALT[n]) : c; }
    return Object.assign({}, def, { costume: n, sprite: Object.assign({}, def.sprite, { palette: pal }) });
  };

  RF.emperorDef = (def) => augment(def, { tag: 'emperor', crown: true, big: true, cape: true,
    extra: Object.assign({ capeA: '#5a0a16', capeB: '#2c040a', capeC: '#8c1424', capeD: '#12020a' }, IRON),
    map: (h) => { const l = lum(h); return l < 0.5 ? hex(14 + l * 76, 8 + l * 44, 22 + l * 96) : hex(118 + l * 120, 112 + l * 112, 132 + l * 112); },   // black coat, ash-grey skin
    over: { name: 'THE HEADMASTER', rift: false, emperor: true } });
  RF.crownDef = (def) => augment(def, { tag: 'crown', crown: true, extra: IRON,
    map: (h) => { const [r, g, b] = rgb(h), l = lum(h) * 255; return hex((r * 0.45 + l * 0.55) * 0.72 + 6, (g * 0.45 + l * 0.55) * 0.66, (b * 0.45 + l * 0.55) * 0.78 + 14); },    // their colours, drained
    over: { name: 'CROWNED ' + def.name.toUpperCase() } });
  RF.forgottenDef = (def) => {
    const d = augment(def, { tag: 'forgotten', extra: {}, map: (h) => { const v = 34 + lum(h) * 150; return hex(v * 0.84, v * 0.87, v); } });
    d.sprite = Object.assign({}, d.sprite, { faceless: true }); d.name = 'THE FORGOTTEN'; d.crowned = false; d.forgotten = true;
    return d;
  };

  // ---- no face: the head keeps its hair, and where the face was there is one flat colour ----
  const P = RF.PixelPuppetSprite.prototype, draw0 = P.draw;
  P.facelessOf = function (f) {
    if (f.blank) return f.blank;
    const s = this.s, U = this.U, Wd = f.canvas.width, Hd = f.canvas.height, [c, x] = RF.util.makeCanvas(Wd, Hd);
    x.drawImage(f.canvas, 0, 0);
    let img; try { img = x.getImageData(0, 0, Wd, Hd); } catch (e) { return (f.blank = f); }
    const d = img.data, neck = s.neckRow != null ? s.neckRow : Math.round(this.rows * 0.19);
    const row = (y) => { let a = -1, b = -1; for (let i = 0; i < Wd; i++) if (d[(y * Wd + i) * 4 + 3] > 40) { if (a < 0) a = i; b = i; } return [a, b]; };
    let top = 0; while (top < Hd && row(top)[0] < 0) top++;
    const yNeck = top + Math.round(neck * U * 1.0), y0 = top + Math.round((yNeck - top) * 0.32);
    for (let y = y0; y < yNeck; y++) {
      const [a, b] = row(y); if (a < 0) continue;
      const lo = Math.round(a + (b - a) * 0.3), hi = Math.round(b - (b - a) * 0.08);                 // the face is toward the front
      for (let i = lo; i <= hi; i++) { const o = (y * Wd + i) * 4; if (d[o + 3] < 40) continue; const v = 150 - 26 * ((y - y0) / Math.max(1, yNeck - y0)) + 10 * Math.sin(i * 1.3); d[o] = v * 0.9; d[o + 1] = v * 0.92; d[o + 2] = v; }
    }
    x.putImageData(img, 0, 0);
    return (f.blank = { canvas: c, anchorX: f.anchorX, anchorY: f.anchorY });
  };
  P.draw = function (ctx, anim, frame, x, y, facing, tint) {
    if (!this.s.faceless) return draw0.call(this, ctx, anim, frame, x, y, facing, tint);
    if (!this.recipes[anim]) anim = 'idle';
    const list = this.frameList(anim), loop = anim === 'idle' || anim === 'walk';
    let i = Math.round(frame * 3);                                   // (3 baked frames per pose step, as in pixel-puppet-sprite.js)
    i = loop ? ((i % list.length) + list.length) % list.length : Math.max(0, Math.min(list.length - 1, i));
    RF.drawBakedFrame(ctx, this.facelessOf(list[i]), x, y, facing, tint);
  };

  // ---- what the lieutenants throw ----
  RF.PROJECTILE_ART.clockHand = function (ctx, x, y, t, dir) {       // THE PROCTOR: a clock hand, spinning
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5 * dir);
    ctx.fillStyle = '#0a0810'; ctx.fillRect(-11, -2, 22, 4); ctx.fillStyle = '#e8e0c8'; ctx.fillRect(-10, -1, 20, 2); ctx.fillStyle = '#c8202c'; ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  };
  RF.PROJECTILE_ART.chalkDust = function (ctx, x, y, t, dir) {       // THE ERASER: a cloud that takes what it touches
    for (let i = 0; i < 9; i++) { const a = t * 0.3 + i * 0.7; ctx.fillStyle = i % 3 ? 'rgba(240,238,230,0.75)' : 'rgba(180,176,168,0.6)'; ctx.fillRect(Math.round(x + Math.cos(a) * (4 + i) - dir * i * 2), Math.round(y + Math.sin(a * 1.4) * (3 + i * 0.6)), 4, 4); }
  };
  Object.assign(RF.SPECIALS, {
    timesUp: { name: "Time's Up", description: 'A clock hand, thrown. It was always going to hit you.', kind: 'projectile', startup: 12, recovery: 18, speed: 7, size: 14, height: 0.66, damage: 14, hitstun: 26, blockstun: 13, pushback: 6, hitstop: 9, art: 'clockHand', sound: 'whoosh', hitText: "TIME'S UP.", colors: ['#ffffff', '#e8e0c8', '#c8202c'] },
    wipeOut: { name: 'Wipe Out', description: 'A cloud of chalk dust. What it touches is a little less there.', kind: 'projectile', startup: 11, recovery: 18, speed: 5.5, size: 16, height: 0.6, damage: 13, hitstun: 28, blockstun: 13, pushback: 5, hitstop: 9, art: 'chalkDust', sound: 'paper', hitText: 'ERASED.', colors: ['#ffffff', '#e8e4dc', '#b8b2a6'] },
  });

  const LT = (o, sprite) => Object.assign({
    archetype: 'lieutenant', origin: 'The Throne Between', intro: 'walk', throw: 'liftSlam', brutality: { name: 'DISMISSED', color: '#b070ff' },
    ending: ['THE HEADMASTER IS PLEASED.'], idleFrames: 2, idleRate: 20, lieutenant: true,
  }, o, { sprite });

  RF.EXTRAS.push(LT({
    id: 'proctor', name: 'The Proctor', health: 128, bio: 'A clock where a face should be. It has been two minutes to midnight for twelve years.',
    quote: 'PENCILS DOWN.', winQuote: 'TIME.', special: 'timesUp', finisher: 'venomMelt',
    tauntLines: ['PENCILS DOWN.', 'YOU MAY NOT LEAVE EARLY.', 'TWO MINUTES REMAIN. FOREVER.', 'EYES ON YOUR OWN LIFE.'],
    commands: { qcf: 'multiverseSwap', qcb: 'restCounter' },
    stats: { walkSpeed: 2.5, jumpPower: 9, damage: 1.08, damageReduction: 0.08, attackSpeed: 1.1 },
    moves: { light: { damage: 6, pushback: 4, hitbox: { x: 12, y: 30, w: 34, h: 26 } },
      heavy: { startup: 10, active: 5, recovery: 17, damage: 13, hitstun: 26, blockstun: 14, pushback: 6, knockback: 10, hitstop: 10, hitbox: { x: 10, y: 24, w: 44, h: 40 }, fxSound: 'whoosh' } },
    body: { scale: 1, bulk: 1, width: 28, height: 102, crouchHeight: 0.72 },
  }, 
{
      type: 'pixel',
      scale: 1,
      limbScale: 4,
      crouchSquash: true,
      noArms: true,
      footCol: 26,
      shoulder: [34, 31],
      crouchDrop: 12,
      sleeveColor: 'col0',
      sleeveShade: 0,
      handColor: 'col0',
      legColor: 'pantsc',
      footColor: 'shoes0',
      hideWhenPosed: [],      // the front fist becomes the punching arm
      legend: { 'A': 'col0', 'B': 'col1', 'C': 'col2', 'D': 'col3', 'E': 'col4', 'F': 'col5', 'G': 'col6', 'H': 'col7', 'I': 'col8', 'J': 'col9', 'K': 'cola', 'L': 'colb', 'M': 'colc', 'N': 'cold', 'O': 'cole', 'P': 'colf', 'Q': 'colg', 'R': 'colh', 'S': 'coli', 'T': 'colj', 'U': 'colk', 'V': 'coll', 'W': 'colm', 'X': 'coln', 'Y': 'colo', 'Z': 'colp', 'a': 'pants0', 'b': 'pants9', 'c': 'pantsa', 'd': 'pantsd', 'e': 'pantse', 'f': 'pantsg', 'g': 'pants5', 'h': 'pantsh', 'i': 'pantsb', 'j': 'pantsi', 'k': 'pantsj', 'l': 'pantsk', 'm': 'pantsl', 'n': 'pantsn', 'o': 'pantso', 'p': 'pants6', 'q': 'pantsc', 'r': 'pants1', 's': 'pantsm', 't': 'pantsp', 'u': 'pantsq', 'v': 'pantsf', 'w': 'shoes0', 'x': 'shoesc', 'y': 'shoesd', 'z': 'shoese', '0': 'shoesf', '1': 'shoesg', '2': 'shoesh', '3': 'shoesi', '4': 'shoesj', '5': 'shoesk', '6': 'shoesl', '7': 'shoesm', '8': 'shoesn', '9': 'shoeso', '!': 'shoesp' },
      palette: {
        col0: '#08060c',
        col1: '#0e0b14',
        col2: '#14101a',
        col3: '#1e1828',
        col4: '#ece4cc',
        col5: '#42315c',
        col6: '#faf5e0',
        col7: '#1e1824',
        col8: '#552b55',
        col9: '#09070e',
        cola: '#0a070f',
        colb: '#0b0912',
        colc: '#16121e',
        cold: '#171320',
        cole: '#181422',
        colf: '#191423',
        colg: '#191524',
        colh: '#1a1625',
        coli: '#1b1626',
        colj: '#1b1726',
        colk: '#1c1727',
        coll: '#1d1829',
        colm: '#1e192a',
        coln: '#1f1a2c',
        colo: '#201b2d',
        colp: '#211c2f',
        pants0: '#08060c',
        pants1: '#0e0b14',
        pants5: '#42315c',
        pants6: '#faf5e0',
        pants9: '#09070e',
        pantsa: '#0a070f',
        pantsb: '#0b0912',
        pantsc: '#16121e',
        pantsd: '#171320',
        pantse: '#181422',
        pantsf: '#191423',
        pantsg: '#191524',
        pantsh: '#1a1625',
        pantsi: '#1b1626',
        pantsj: '#1b1726',
        pantsk: '#1c1727',
        pantsl: '#1d1829',
        pantsm: '#1e192a',
        pantsn: '#1f1a2c',
        pantso: '#201b2d',
        pantsp: '#211c2f',
        pantsq: '#5f4585',
        shoes0: '#08060c',
        shoesc: '#16121e',
        shoesd: '#171320',
        shoese: '#181422',
        shoesf: '#191423',
        shoesg: '#191524',
        shoesh: '#1a1625',
        shoesi: '#1b1626',
        shoesj: '#1b1726',
        shoesk: '#1c1727',
        shoesl: '#1d1829',
        shoesm: '#1e192a',
        shoesn: '#1f1a2c',
        shoeso: '#201b2d',
        shoesp: '#211c2f',
      },
      grid: [
        '....................................................',
        '....................................................',
        '.......................AAAAAAA.AAAAA................',
        '.....................AABBBBBBBACCCCCAA..............',
        '...................AABBBDDDDDCCCCCCCCCA.............',
        '..................ABBBDDDDDDCCCEEEEECCCA............',
        '.................ABBBDDDDDDCCCEEEEEEEFCCA...........',
        '................ABBBDDDDDDCCCEEEGGHGEFCCCA..........',
        '...............ABBBDDDDDDDCCEEEGHGGCFEECCA..........',
        '...............ABBDDDDDDDCCEEEGGGGGCFGEECCA.........',
        '..............ABBBDDDDDDDCCEEGGGGGGFGGGECCA.........',
        '..............ABBBDDDDDDDCCEEGHCGGGFGGHECCA.........',
        '.............ABBBDDDDDDDCCEEGGGGCGCGFGGGECCA........',
        '.............ABBBDDDDDDDCCEEGGGGCGCGGFGGECCA........',
        '.............ABBBDDDDDDDCCEEGGGGGIIIGGFGECCA........',
        '.............ABBBDDDDDDDCCEEGHGGGIIIGGFHECCA........',
        '.............ABBBDDDDDDDCCEEGGGGGIIIGFGGECCA........',
        '.............ABBBDDDDDDDCCEEGGGGGGGGGFGGECCA........',
        '.............ABBBDDDDDDDCCEEGGGGGGGGFGGGECCA........',
        '..............ABBBDDDDDDDCCEEGHGGGGGFGHECCA.........',
        '..............ABBBDDDDDDDCCEEGGGGGGGFGGECCA.........',
        '...............ABBDDDDDDDCCEEEGGGGGGGFEECCA.........',
        '...............ABBBDDDDDDDCCEEEGHGGGHFECCA..........',
        '................ABBBDDDDDDCCCEEEGGHGEEFCCA..........',
        '.................ABBBDDDDDDCCCEEEEEEECFCA...........',
        '..................ABBBDDDDDDCCCEEEEECCCA............',
        '...................ABBBBDDDDDCCCCCCCCCA.............',
        '..................AJJJKKLLLLLLLCCCCCBBA.............',
        '...................AMMNNOPQRSTUVWAAAABA.............',
        '...................AMMNOQRTUVWXYZA...A..............',
        '..................AMJNOPQRTUVWWFYZAAA...............',
        '.................AAJJNNOPQRSTUVWWXYYZA..............',
        '................AJJJKOOQQRFTUVVWWXXYZZA.............',
        '................AJJJKOOQQRFTUVVWWXXYZZA.............',
        '................AJJJKNOPQQFSTUVFWWXXFZZA............',
        '................AJJJKNOPQQFSTUVFWWXXYFZA............',
        '................AJJJKNOOQQFSTUUFVWWXXFZZA...........',
        '................AJJJKNOOQQFSTUUFVWWXXYFZA...........',
        '................AJJJKNOOQQFRSTUVFVWWXXFZZA..........',
        '................AJJJKNOOQQFRSTUVFVWWXXYFZA..........',
        '...............AJJJJKOOOQQFRSTUVFVWWXXYFZZA.........',
        '...............AJJJJKOOOQQFRSTUVFVWWXXYYFZA.........',
        '...............AJJJJKNOOQQFRSTUUFVVWWXXYFZZA........',
        '...............AJJJJKNOOQQFRSTUUFVVWWXXYYFZA........',
        '...............AJJJJKNOOPQFRRSTUFVVWWWXXYFZZA.......',
        '...............AJJJJKKOOPQFRRSTUFVVWAWXXYYFZA.......',
        '...............AJJJJKKOOPKFQRSTLFVVVAWWXXYFZZA......',
        '...............AJJJJKKOOPKQFRSTLFVVVAAWXXYYFZA......',
        '...............AJJJJKKOOOKQFRRSLFUVVVAWWXXYFZZA.....',
        '...............AJJJJKKOOOKQFRRSLFUVVVAAWXXYYFZA.....',
        '...............AJJJJKKOOOKQFRRSLFUVVVAAWXXXYFZZA....',
        '...............AJJJJKKOOOKQFRRSLFUVVVA.AXXXYYFZA....',
        '...............AJJJJKKNOOKQFQRSLFUUVVA.AWXXXYFZZA...',
        '...............AJJJJKKNOOKQFQRSLFUUVVA..AXXXYYFZA..A',
        '..............AJJJJJKKNOOKQFQQRLSFTUUA..AWWWXXFYYAAG',
        '..............AJJJJJKKOOOKQFQRRLSFUUVA...AWXXXYYYAGA',
        '..............AJJJJJKKOOOKQFQRRLTFUUVVA..AWXXYYYZGA.',
        '..............AJJJJJKKOOOKQFQRRLTFUUVVA...AXXYYYGZA.',
        '..............AJJJJJKKOOOKQFQRRLSFUUVVA....AXXYGGGZA',
        '..............AJJJJJKKOOOKQFQRRLSFUUVVA....AXXYYYGGA',
        '..............abbbbbccdeecfgffhijgkllma.....annooapp',
        '..............abbbbbccdeecfgffhijgkllma.....annoa.ap',
        '..............aqbbbbccdeecfgffhijgkllma......ana..ap',
        '..............aqbbccccffhikglmmrsgnotta.......a....a',
        '..............aqbbccccffhikglmmrsgnotta.............',
        '..............aqqbccccffhikglmmrsgnotta.............',
        '..............aqqbccccffhikglmmrsgnotta.............',
        '..............aqqbccccffhikglmmrsgnotta.............',
        '.............aqqqcccccffhikglmmrsgnnotta............',
        '.............aqqqduuccffhikglmmrssgnotta............',
        '.............aqqqduuevffhikglmmrssgnotta............',
        '.............aqqqduuevffijkglmisssgnotta............',
        '.............aqqqduuevffijkglmisssgnotta............',
        '.............aqqqduuevffijkglmisssgnotta............',
        '.............aqqqduuevffijkglmisssgnotta............',
        '.............aqqqduuevffijkglmisssgnotta............',
        '.............aqqqduuevffijklgmisssgnotta............',
        '.............aqqqduuevffijklgmisssgnotta............',
        '.............aqqqduuevffijklgmisssgnotta............',
        '............aqqqddceefffijklgmimssgnootta...........',
        '............aqqqddceefffijklgmimssgnootta...........',
        '............aqqqddceefffijklgmimssgnootta...........',
        '............aqqqddceefffijklgmimssgnootta...........',
        '............aqqqddceefffijklgmimssgnootta...........',
        '............aqqqddceefffijklgmimssgnootta...........',
        '............aqqqddceefffijklgmimssngootta...........',
        '............aqqqddceefffijklgmimssngootta...........',
        '............aqqqddceefffijklgmimssngootta...........',
        '............aqqqddceefffijklgmimssngootta...........',
        '............aqqqddceefffijklgmimssngootta...........',
        '............aqqqddceefffijklgmimssngootta...........',
        '...........aqqqdddcevfffijkllmimsssgnootta..........',
        '...........aqqqdddcevfffijkllmimsssgnootta..........',
        '...........aqqqdddcevfffijkllmimsssnnootta..........',
        '...........aquuuuuuuuuuuuuuuuuuuuuuuuuuuua..........',
        '...........aquuuuuuuuuuuuuuuuuuuuuuuuuuuua..........',
        '...........wxxxyyyzz0111234556667778899!!w..........',
        '...........wxxxyyyzz0111234556667778899!!w..........',
        '............wxxxwyyzz111w3455666w78899!!w...........',
        '............wxxxwwyzw111ww45w666ww88w9!!w...........',
        '.............wxw.wyzww1w.w45ww6w.w88ww!w............',
        '.............wxw..wzww1w..w5ww6w..w8ww!w............',
        '..............w....w..w....w..w....w..w.............',
        '....................................................',
        '....................................................',
        '....................................................',
      ],
    }));
  RF.EXTRAS.push(LT({
    id: 'ringer', name: 'The Bell Ringer', health: 172, bio: 'It carries the bell on its shoulders. It has never once let it stop.',
    quote: '...', winQuote: '...', special: 'seismicSlam', finisher: 'pileDriver', armor: true,
    tauntLines: ['...', 'DONG.'],
    commands: { qcf: 'blitz', qcb: 'hulkLeap' },
    stats: { walkSpeed: 2.2, jumpPower: 8.4, damage: 1.22, damageReduction: 0.14, attackSpeed: 0.92 },
    moves: { light: { damage: 7, pushback: 5, hitbox: { x: 14, y: 34, w: 34, h: 30 } },
      heavy: { startup: 13, active: 6, recovery: 20, damage: 16, hitstun: 28, blockstun: 15, pushback: 8, knockback: 12, hitstop: 12, hitbox: { x: 10, y: 20, w: 48, h: 48 }, fxSound: 'stomp' } },
    body: { scale: 1, bulk: 1.5, width: 44, height: 100, crouchHeight: 0.78 },
  }, 
{
      type: 'pixel',
      scale: 1,
      limbScale: 4,
      crouchSquash: true,
      noArms: true,
      footCol: 34,
      shoulder: [50, 33],
      crouchDrop: 12,
      sleeveColor: 'col7',
      sleeveShade: 0,
      handColor: 'col7',
      legColor: 'pantsc',
      footColor: 'shoes4',
      hideWhenPosed: [],      // the front fist becomes the punching arm
      legend: { 'A': 'col0', 'B': 'col1', 'C': 'col2', 'D': 'col3', 'E': 'col4', 'F': 'col5', 'G': 'col6', 'H': 'col7', 'I': 'col8', 'J': 'col9', 'K': 'cola', 'L': 'colb', 'M': 'colc', 'N': 'cold', 'O': 'cole', 'P': 'colf', 'Q': 'colg', 'R': 'colh', 'S': 'coli', 'T': 'colj', 'U': 'colk', 'V': 'coll', 'W': 'colm', 'X': 'coln', 'Y': 'colo', 'Z': 'pants0', 'a': 'pantsa', 'b': 'pantsd', 'c': 'pantsf', 'd': 'pantsg', 'e': 'pantsb', 'f': 'pantsh', 'g': 'pantse', 'h': 'pantsj', 'i': 'pantso', 'j': 'pantsn', 'k': 'pantsk', 'l': 'pantsc', 'm': 'pants1', 'n': 'pantsi', 'o': 'pantsl', 'p': 'pants5', 'q': 'shoes0', 'r': 'shoes1', 's': 'shoes2', 't': 'shoes3', 'u': 'shoes4', 'v': 'shoes5', 'w': 'shoese', 'x': 'shoesj', 'y': 'shoesn', 'z': 'shoesk', '0': 'shoesm' },
      palette: {
        col0: '#08060c',
        col1: '#201e25',
        col2: '#24222a',
        col3: '#26242c',
        col4: '#292630',
        col5: '#2b2835',
        col6: '#6a4223',
        col7: '#c28b2f',
        col8: '#100d11',
        col9: '#e0ac4a',
        cola: '#262330',
        colb: '#474254',
        colc: '#5a5469',
        cold: '#272431',
        cole: '#4f495c',
        colf: '#282432',
        colg: '#282531',
        colh: '#4c4658',
        coli: '#2e2a39',
        colj: '#524c5f',
        colk: '#585366',
        coll: '#2a2735',
        colm: '#5d5568',
        coln: '#565064',
        colo: '#544e63',
        pants0: '#08060c',
        pants1: '#201e25',
        pants5: '#2b2835',
        pantsa: '#262330',
        pantsb: '#474254',
        pantsc: '#5a5469',
        pantsd: '#272431',
        pantse: '#4f495c',
        pantsf: '#282432',
        pantsg: '#282531',
        pantsh: '#4c4658',
        pantsi: '#2e2a39',
        pantsj: '#524c5f',
        pantsk: '#585366',
        pantsl: '#2a2735',
        pantsn: '#565064',
        pantso: '#544e63',
        shoes0: '#08060c',
        shoes1: '#201e25',
        shoes2: '#24222a',
        shoes3: '#26242c',
        shoes4: '#292630',
        shoes5: '#2b2835',
        shoese: '#4f495c',
        shoesj: '#524c5f',
        shoesk: '#585366',
        shoesm: '#5d5568',
        shoesn: '#565064',
      },
      grid: [
        '.......................ABBBBCCCDDDEEEEFA............................',
        '.......................ABBBBCCCDDDEEEEFA............................',
        '.......................ABBBBCCCDDDEEEEFA............................',
        '.......................ABBBBCCCDDDEEEEFA............................',
        '........................AAAAABCDEFAAAAA.............................',
        '.........................AAAABCDEFAAAA..............................',
        '........................AGGGGHHHHHHHHHA.............................',
        '........................AGGGHHHIHHHHHHA.............................',
        '.......................AGGGGHHHIHHHJHHHA............................',
        '.......................AGGGHHHIHHHHJHHHA............................',
        '......................AGGGGHHHIHHHHHJHHHA...........................',
        '......................AGGGHHHHIHHHHHJHHHA...........................',
        '.....................AGGGHHHHIHHHHHHJJHHHA..........................',
        '.....................AGGGHHHHIHHHHHHHJHHHA..........................',
        '....................AGGGHHHHHHIHHHHHHJHHHHA.........................',
        '....................AGGGHHHHHHIHHHHHHJJHHHA.........................',
        '...................AGGGHHHHHHHHIHHHHHHJHHHA.........................',
        '...................AGGGHHHHHHHHIHHHHHHJHHHHA........................',
        '..................AGGGHHHHHHHHHHIHHHHHJJHHHA........................',
        '..................AGGGHHHHHHHHHHIHHHHHJJHHHA........................',
        '..................AGGGHHHHHHHHHIHHHHHHHJHHHA........................',
        '.................AGGGGHHHHHHHHHIHHHHHHHJJHHHA.......................',
        '.................AGGGHHHHHHHHHHIHHHHHHHJJHHHA.......................',
        '..............AAAGGGGHHHHHHHHHIHHHHHHHHHJHHHA.......................',
        '.............AKLLGGGGHHHHHHHHHIHHHHHHHHHJJHHMAA.....................',
        '............AKKNGGGGGHHHHHHHHHHIHHHHHHHHHJHHHMMA....................',
        '...........AKKNNGGGGHHHHHHHHHHHIHHHHHHHHHHHHHMMMA...................',
        '..........AAKKNNGGGGHHHHHHHHHHHHIHHHHHHHHHHHHMMMMA..................',
        '.........ABBBGGJJJJJJJJJJJJJJJJJIJJJJJJJJJJJJJGGMMA.................',
        '.........ABOOGGGGGGGGGGGGGGGGGGGGIGGGGGGGGGGGGGGMMMAA...............',
        '........AKBBBGGGGGGGGGGGGGGGGGGGGIGGGGGGGGGGGGGGMMMMMA..............',
        '.......AKKBBBGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAAAAAAAAMMMMA.............',
        '......AKKKNNNPQBBBCCRRRRRRROOOSOAAAAAAAAAAAAAAAAAAMMMMMA............',
        '......AKKKNNNPQBTTCCRRRRRRROOOSOOAAAAAHJHAAAHJHAAMMMMMMA............',
        '.....AKKKNNNPQPBBCCCRRRRRROOOOSOTAAAAAHHHAAAHHHAAMMMMMMA............',
        '....AKKKNNNPQQPBBCCCRRRRRROOOOSOTAAAAAAEEEAAAAAAUMMMMMMA............',
        '...AKKKNNNPQQPPQVVVRCCCCCOOOOOSTTAAAAAEEEEEAAAAAUMMMMMMA............',
        '...AKKKNNNPQQPPQVVVRCUUCCOOOOOSTTTAAAAEEEEEAAAAUUMMMMMMAA...........',
        '...AKKKNNNPPQPPPVVVRCCCCCROOOOOSTTAAAADEEEEAAAAUUUMMWMMMMA..........',
        '...AKKKNNNPPQPPPVVLRCCCCCFFFSSSSSSSSSSDDEEEXXXXUUUUMMWMMMMA.........',
        '...AKKKNNNPPQPPPVVVVVVVVFCCCCCOSOOTTTTTDEEYYXXXXUUUUMWMMMMMA........',
        '....AKKKNNNPPQPPPVLLRRRRRCUUCCOSOOTTTTTTTYYYXXXXUUUUMMWMMMMA........',
        '....AKKKNNNPPQPPPVLLRRRRRCCCCCOSOOOTTTTTTYYYYXXXXUUUUMWMMMMMA.......',
        '...AKKKKNNNPQQPPQVLRRRRRRCCCCCOSOOTTTTTTTYYYYXXXXUUUUMMWMMMMA.......',
        '...AKKKKNNNPQQPPQLLLRRRRRRROOOCCDDDTTTTTTTYYYYXXXUUUUUMWMMMMMA......',
        '..AKKKKNNNPQQPPPVLLRRRRRRRROOOCWWDDTTTTTTYSSSSXXXUUUUUMMWMMMMA......',
        '..AKKKKNNNPQQPPPVLLRRRRRRFFFFSCCDDDSSSSSSSYYYYWXXXUUUUUMWMMMMMA.....',
        '..AKKKKNNNPQQPPPVVVVVVVVVRROOOCCDDDTTTTTTTYYYYWXXXUUUUUMMWMMMMA.....',
        '..AKKKKNNNPPQPPPQLLRRRRRRRRROOOSOOODDDDDTTTYYYYWXXXUUUUMMWMMMMMA....',
        '..AKKKKNNNPPQPPPLLLRRRRRRRRROOOSOOODWWDDTTTYYYYWXXXUUUUMMMWMMMMA....',
        '..AKKKKNNNPPQPPPLLLLRRRRRRRROOOSOOODDDDDTTTYYYYWXXXXUUUUMMWMMMMMA...',
        '..AKKKKNNNPPQPPPLLLLRRRRRRRROOOSOOODDDDDTTTYYYYWXXXXUUUUMMMWMMMMA...',
        '..AKKKKNNNPPQQPPLLLLRRRRRRRRROOSOOOOTTTTDDDDESSSSSSXUUUUUMMWMMMMMA..',
        '..AKKKKNNNPPQQPPLLLLRRRRRVFFFFFSSSSSSSSSDWWDEYYWXXXXUUUUUMMMWMMMMA..',
        '..AKKKKNNNPPQQPLPVVVVVVVVRRRROOOSOOOOTTTDDDDDYYWYXXXXUUUUUMMMMMMMMA.',
        '..AKKKKNNNPPQQPLLLLLRRRRRRRRROOOSOOOOTTTDDDDDYYYWXXXXUUUUUMMMMMMMMA.',
        '..AKKKKNNNPPQQPLLLLLRRRRRRRRROOOSOOOOTTTTTTTTEEEEEXXXXUAUUUWWWMMMMMA',
        '..AKKKKNNNPPQQPLLLLLRRRRRRRRROOOSOOOOTTTTTTTTEWWEEXXXXAAUWWWWWWWMMMA',
        '..AKKKKNNNNPQQPLLLLLLRRRRRRRRROOSOOOOOTTTTTTTDEEEEYXXXAUUWWWWWWWMMMM',
        '...AKKKKNNNPPQLLLLLLLRRRRRRRRROOSOOOOOTTTTSSSDEEEESXXAAUUWWWWWWWMMMM',
        '...AKKKKNNNPPQLLLLLLLRRRRVVFFFFFSSSSSSSSSSTTTTYYYYEEEEXUUSSWWWSSSSSS',
        '...AKKKKNNNPPQLLPPVVVVVVVRRRRROOSOOOOOTTTTTTTTYYYYEWWEXUUSSSSSSSSSSS',
        '...AKKKKNNNPPQLLLLLLLRRRRRRRRROOSOOOOOTTTTTTTTYYYYEEEEXUUUUUMMMMMMMM',
        '...AKKKKNNNPPQLLLLLLLRRRRRRRRROOOOOOOOTTTTTTTTYYYYEEEEXUUUUUMMMMMMMM',
        '...ZaaaabbbccdeeeeeeefffffffffgggggggghhhhhhhhiiiiZZZZjkkkkkllllllll',
        '...ZaaaabbbccdeeeeeeefffffffffgggggggghhhhhhhhiiimZ..Zjkknnnnnnnnnnn',
        '...ZaaaabbbccdeeeeeeefffffffffgggggggghhhhhhhhiimmZ..Zjkknnnnnnnnnnn',
        '...ZaaaabbbccdeeeeeeefffffffffgggggggghhhhhhhhiimmZ...Zkkkkkllllllll',
        '...ZaaaabbbcceeeeeeeefffffffffgggggggghhhhhhhhimmmZ...Zkkkkkllllllll',
        '...ZaaaabbbccmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmZ....ZkkkllllllllZ',
        '...ZaaaabbbccmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmZ.....ZkllllllllZ.',
        '...ZaaaabbbccZcccdoooooooopppppZZgggghhhhhhhiiiiijZ......ZlllllllZ..',
        '..ZaaaabbbccdcccdoooooooopppppnZZggghhhhhhhiiiiijjZ.......ZlllllZ...',
        '.ZaaabbbcdccdooooooopppnnnnnnnnZZhiiijjjkkkkllllllZ........ZZZZZ....',
        '.ZaaabbbcdccdooooooopppnnnnnnnnZZhiiijjjkkkkllllllZ.................',
        'ZaaabbbcdcccoooooooppppnnnnnnnZ..ZiiijjjkkkkllllllZ.................',
        'ZaaabbbcddccoooooooppppnnnnnnnZ..ZiiijjjjkkkkllllllZ................',
        'ZaaabbbcddccoooooooppppnnnnnnnZ..ZiiijjjjkkkkllllllZ................',
        'ZaaabbbcddccoooooooppppnnnnnnnZ..ZiiijjjjkkkkllllllZ................',
        'ZaaabbbcddccoooooooppppnnnnnnnZ..ZiiijjjjkkkkllllllZ................',
        '.ZaaabbbcddccoooooooppppnnnnnnZ...ZiiijjjjkkkkllllllZ...............',
        '.ZaaabbbcddccoooooooppppnnnnnnZ...ZiiijjjjkkkkllllllZ...............',
        '..ZaaabbbcdcccoooooooppppnnnnnZ...ZiiiijjjkkkkllllllZ...............',
        '...ZaaabbbcdccdooooooopppnnnnnZ...ZhiiijjjkkkkllllllZ...............',
        '....ZZaaabbZZdccooooooopppnnnnZ...ZhiiiijjjkkkllllllZ...............',
        '......ZZZZZ.ZaaabbcdccooooooppZ....ZhhhiiijjjkkklllllZ..............',
        '............ZaaabbcdccooooooppZ....ZhhhiiijjjkkklllllZ..............',
        '............ZaaabbcdccooooooppZ....ZhhhiiijjjkkklllllZ..............',
        '............ZaaabbcdccooooooppZ....ZhhhiiijjjkkklllllZ..............',
        '............ZaaabbcdccoooooopZ......ZhhiiijjjkkklllllZ..............',
        '...........ZaaabbcdccdoooooppZ......ZhhhiiijjkkkklllllZ.............',
        '...........ZaaabbcdccdoooooppZ......ZhhhiiijjkkkklllllZ.............',
        '...........ZaaabbcdccdoooooppZ......ZhhhiiijjkkkklllllZ.............',
        '........ZZZZaaabbcdccdoooooppZ......ZhhhiiijjkkkklllllZZZZZZZZZZ....',
        '.......qrrrrrrrrrrrrrsssssssssq....qtttttttttuuuuuuuuuuuuuuuuvvvq...',
        '.......qrrwwwxxxxxxxxyyyyzzzssq....qtt000000000000000000000000vvq...',
        '.......qrrwwwxxxxxxxxyyyyzzzssq....qtt000000000000000000000000vvq...',
        '.......qrrrrrrrrrrrrrsssssssssq....qtttttttttuuuuuuuuuuuuuuuuvvvq...',
        '.......qrrrrrrrrrrrrrsssssssssq....qtttttttttuuuuuuuuuuuuuuuuvvvq...',
        '.......qrrrrrrrrrrrrrsssssssssq....qtttttttttuuuuuuuuuuuuuuuuvvvq...',
        '.......qrrrrrrrrrrrrrsssssssssq....qtttttttttuuuuuuuuuuuuuuuuvvvq...',
        '.......qrrrrrrrrrrrrrsssssssssq....qtttttttttuuuuuuuuuuuuuuuuvvvq...',
        '.......qrrrrrrrrrrrrrsssssssssq....qtttttttttuuuuuuuuuuuuuuuuvvvq...',
        '........qqqqqqqqqqqqqqqqqqqqqq......qqqqqqqqqqqqqqqqqqqqqqqqqqqq....',
      ],
    }));
  RF.EXTRAS.push(LT({
    id: 'eraser', name: 'The Eraser', health: 118, bio: 'It does not hurt people. It removes them. Nobody remembers who it has removed.',
    quote: 'SHHHH.', winQuote: 'WHO?', special: 'wipeOut', finisher: 'venomMelt',
    tauntLines: ['SHHHH.', 'WHO?', 'YOU WERE NEVER ON THE ROLL.', 'NO ONE WILL ASK WHERE YOU WENT.'],
    commands: { qcf: 'smokeScreen', qcb: 'slipCounter' },
    stats: { walkSpeed: 3.3, jumpPower: 10.4, damage: 1.0, damageReduction: 0.04, attackSpeed: 1.22 },
    moves: { light: { damage: 5, pushback: 4, hitbox: { x: 12, y: 44, w: 34, h: 18 } },
      heavy: { startup: 9, active: 5, recovery: 15, damage: 13, hitstun: 26, blockstun: 14, pushback: 6, knockback: 9, hitstop: 10, hitbox: { x: 10, y: 34, w: 42, h: 30 }, fxSound: 'paper' } },
    body: { scale: 1, bulk: 0.9, width: 26, height: 94, crouchHeight: 0.7 },
  }, 
{
      type: 'pixel',
      scale: 1,
      limbScale: 4,
      crouchSquash: true,
      noArms: true,
      footCol: 24,
      shoulder: [31, 26],
      crouchDrop: 12,
      sleeveColor: 'col0',
      sleeveShade: 0,
      handColor: 'col0',
      legColor: 'pants0',
      footColor: 'shoesq',
      hideWhenPosed: [],      // the front fist becomes the punching arm
      legend: { 'A': 'col0', 'B': 'col1', 'C': 'col2', 'D': 'col3', 'E': 'col4', 'F': 'col5', 'G': 'col6', 'H': 'col7', 'I': 'col8', 'J': 'col9', 'K': 'cola', 'L': 'colb', 'M': 'colc', 'N': 'cold', 'O': 'cole', 'P': 'colf', 'Q': 'colg', 'R': 'colh', 'S': 'coli', 'T': 'colj', 'U': 'colk', 'V': 'coll', 'W': 'colm', 'X': 'coln', 'Y': 'colo', 'Z': 'colp', 'a': 'pants0', 'b': 'pants4', 'c': 'pantsn', 'd': 'pants5', 'e': 'pants6', 'f': 'pantsa', 'g': 'pantsl', 'h': 'pants9', 'i': 'pantsi', 'j': 'pants2', 'k': 'pantsb', 'l': 'pantsc', 'm': 'pantsd', 'n': 'pantsg', 'o': 'pantso', 'p': 'pantse', 'q': 'pantsf', 'r': 'pants3', 's': 'pantsk', 't': 'pants8', 'u': 'pantsm', 'v': 'pantsj', 'w': 'pants1', 'x': 'pantsh', 'y': 'pants7', 'z': 'pantsq', '0': 'shoes0', '1': 'shoesq', '2': 'shoes1' },
      palette: {
        col0: '#08060c',
        col1: '#88847b',
        col2: '#d1cdc4',
        col3: '#f4f0e5',
        col4: '#a8a49b',
        col5: '#aeaaa2',
        col6: '#b1ada5',
        col7: '#979389',
        col8: '#c2bdb4',
        col9: '#c5c1b8',
        cola: '#b4b0a7',
        colb: '#d6d2c9',
        colc: '#dbd7ce',
        cold: '#e1ddd4',
        cole: '#eae6dc',
        colf: '#efebe0',
        colg: '#b7b3aa',
        colh: '#bebab0',
        coli: '#cbc7bf',
        colj: '#e6e2d8',
        colk: '#8f8b81',
        coll: '#a09b90',
        colm: '#a6a196',
        coln: '#aaa79e',
        colo: '#bbb6ad',
        colp: '#3a2b22',
        pants0: '#08060c',
        pants1: '#88847b',
        pants2: '#d1cdc4',
        pants3: '#f4f0e5',
        pants4: '#a8a49b',
        pants5: '#aeaaa2',
        pants6: '#b1ada5',
        pants7: '#979389',
        pants8: '#c2bdb4',
        pants9: '#c5c1b8',
        pantsa: '#b4b0a7',
        pantsb: '#d6d2c9',
        pantsc: '#dbd7ce',
        pantsd: '#e1ddd4',
        pantse: '#eae6dc',
        pantsf: '#efebe0',
        pantsg: '#b7b3aa',
        pantsh: '#bebab0',
        pantsi: '#cbc7bf',
        pantsj: '#e6e2d8',
        pantsk: '#8f8b81',
        pantsl: '#a09b90',
        pantsm: '#a6a196',
        pantsn: '#aaa79e',
        pantso: '#bbb6ad',
        pantsq: '#736e67',
        shoes0: '#08060c',
        shoes1: '#88847b',
        shoesq: '#736e67',
      },
      grid: [
        '.......AABCDAA........A...........................',
        '......AEFGAHIJA....AAADAAA........................',
        '.......AAA.ABAKAAAACLMNOPDAA......................',
        '............ABAKQRJSCLMNTOPDAAAAA.................',
        '...........ABBUUHHHVVWWEXFGKQYRIJA................',
        '...........AEXFKQYRIJSWEXFGKQYRIJA................',
        '...........ABBUUHHHVVWCLLMNTOPPDA.................',
        '...........AEXGKQYIJSSCLLMNTOPPDA.................',
        '...........ABBUUHHHVVWCLLMNTOPPDA.................',
        '..........AEXFKQYRIJSSEXFFZZZYRIJA................',
        '..........AEBUUUHHVVVWEXFAAAAAAAJA................',
        '..........AEXFGQYRIJJSWEXAAAAAAAIDA...............',
        '..........AEBUUUHHHVVWCCLMMNNTOPDDA...............',
        '..........AEXFGQYRIJJSCCLMMNNTOPDDA...............',
        '...........ABBUUHHHVVWCCLMMNTOPPDA................',
        '...........AEXFKQYRIJSWEZZZZZZZZJA................',
        '...........ABBUUHHHVVWWEXZZZZZZIJA................',
        '............AEXGKQYIJSWEXFGKQYRIJA................',
        '...........ABBUUHHHVVWCLLMNTOPPDA.................',
        '............AEXGKYRIJSCCLMNTTPPDA.................',
        '...........ABBUUHHHVVWCLLMNTOPPDA.................',
        '............AAEAAAAAAJWWEXFKQYRIJA................',
        '.............AEFUHRJSCXFNTOPJAAAA.................',
        '.............ABBGQRIVWCLMNQYPDA...................',
        '............AAEFGQHVJSCLFKTOPDAAAAA...............',
        '..........AAEXFGUHRIJJWWCLMMKQTOPDDA..............',
        '.........AEXFGKHYRIJVVSCCLFGNNTOOPIJA.............',
        '.........AEXFGUQYRHVJSSCEXLMMNNTYRPDDA............',
        '........AEXFUUQQHHIJJSWWCLLMGKKQTOPPDDA...........',
        '........AEBBGGUHYRIIVVSSCCXFMMNNTTOPIIDA..........',
        '........ABXFGGKQYRHVJJSSEELLMMKNTTYRPDDAAAAAAAAAAA',
        '........AEXXFFGKUHYYRRVVJJSSWWCCXXLMMMNNAAAAAAAAAA',
        '.......AEXXFUUUUQYYRHHIJJJVWSCCCLLMMMMKKAZZZZZZZZA',
        '.......AEXBUFGKKQYHHRIIJVVSSSCEEALMMGGNNAZZZZZZZZA',
        '.......ABBXFFGKKHHYRRIVVJJSSWWCCALFFMMNNAZZZZZZZZA',
        '.......AEXXFFGUUQYYRHHIJJJVWSCCCXAMMMMNNAZZZZZZZZA',
        '......AEXXFFUUKQQYHHIIJJVVSSCCEXLAMMMNKQAZZZZZZZZA',
        '......AEXXBUGKKQHHYRIIVVJSSSWECLLAAMGKNNATTOOPPPDA',
        '......AEBBFFGKUUQYYRHVJJJSWWCCCLXA.AMNNNATTOOPPPDA',
        '.....ABBXFFGGUQQYYHHIIJJVVSSCCEXLLA.ANNNATOOOPPPDA',
        '.....AEXXFFGUKQQHHRRIIVVJSSSWECLLLA..AKQATOOOPPPDA',
        '.....AEXXFUUGKUHYYRRVVJJJSWWCCCLXFA...ANATOOOPPPDA',
        '.....AEXBBFGUUQQYYHHIIJJVVSSCCEXLLA....AATOOOPPPDA',
        '....AEBBFFGGAQQYHHRIIJVVSSSCEELLLMA....AAAAAAAAAAA',
        '....ABXXFFGKAQHHRRIIVVJSSSWECLLMFGA.....AALAAAMAAA',
        '....AEXXFFUUAHYYRRHVJJJSWWCCCLXFMA.......ALAMAMA..',
        '....AEXXUUGKAQYYHHIIJJVVSSCCEXLMMA.......ALAMAMA..',
        '....AEBBFFGKAQHHRRIIVVJSSSWECLLMFA.......ALAMAMA..',
        '.....AEXXFGGAUQYYRHVJJSSWWCCLLFFMA........AAMAA...',
        '.....AEXFGUUAAIIVVSCCLXFMNNTYRPDDA..........A.....',
        '.....AEXUUKQAAHVJSSCEXLMMNQQOOPDJA................',
        '.....ABBFGKQAAIIJSWWCLLMGKNTOORIDA................',
        '.....AEXFGKQAAIIVVSCCLXFMNNTYRPDDA................',
        '.....AEXFGUHAAHVJSSCEXMMNNQYOPDDA.................',
        '.....AEXUUKQAAIJJSWECLMMKKTOOPIJA.................',
        '......ABXFGKA.AIVVSCCLFFNNTTRRDDA.................',
        '......abcdefa.aghhijbcklmmnopqrra.................',
        '......abcdssa.athhuujkklefvvpqtha.................',
        '.....awcsefna..ahiuujkklammvoxqrra................',
        '.....awcaeaa...aggijjkklamnnppqrra................',
        '....awcaafa...aghiijjkdaafvvpqqrha................',
        '....awcaafa...ahhiijbckaammvvpxtrra...............',
        '...awca.afa...ahhiubjkka.amvooqqrra...............',
        '...awca.afa...ahguijjkka.afnvpqqrra...............',
        '...awca..ana..aghiijjjca.ammvvpqttra..............',
        '..awca...aoa..ahiiijbcka.amvvpoxqrra..............',
        '..awca...aoa..ahiiuujkka..avnopqqrra..............',
        '.awaa....aoa.ahhguijjka...afvvppqqtha.............',
        '.awa.....aoa.aggiiijjka...amvvppxtrra.............',
        '..a......aba.afnoxttgga....almnnppqrra............',
        '.........aba.afnoxyghia....aefmvppqrha............',
        '..........a..abcssnoxta....allmmvpxtra............',
        '.............awwdefooxa....akllmnopqrra...........',
        '............awcdefnoyga.....alefvvpqrra...........',
        '............abcdefyyxta.....admmvvpqtha...........',
        '............abcdssnoxa......allmmvoxqrra..........',
        '............abwsefnoxa......allmfnppqrra..........',
        '............awcdefnoya.......aefmvppqrha..........',
        '...........abcdefnyyta.......almmvppxtra..........',
        '...........abcdessooxa.......allmvooqqrra.........',
        '...........abcssfnooa.........alfnvpqqrra.........',
        '...........awwdefnooa.........aemvvpqqtha.........',
        '..........awcdefnnya..........ammvvpxtrra.........',
        '..........abcdeesyoa...........ammnopqqrra........',
        '..........abcdssfnoa...........affvvpqqrha........',
        '..........abwweefna............ammvvpqttra........',
        '.........awwddefnoa.............amvvoxqrra........',
        '.........abcddefyya.............amnopqqrra........',
        '.........abcddssna..............afvvppqqtha.......',
        '........abcdssfnoa..............amvvppxtrra.......',
        '........abwwdefna................avvoxqqrra.......',
        '........awcddefna................anoppqqrra.......',
        '.....aaaabccdessa................amvvppqttraaaa...',
        '....azzzzzzzzzzzza...............awwwwwwwwwwwwwa..',
        '....01111111111110...............022222222222220..',
        '...011111111111110...............0122222222222220.',
        '...011111111111110..............01122222222222220.',
        '..0111111111111110..............011222222222222220',
      ],
    }));
})();
