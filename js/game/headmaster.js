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
      footCol: 25,
      shoulder: [33, 31],
      crouchDrop: 12,
      sleeveColor: 'col4',
      sleeveShade: 0,
      handColor: 'col4',
      legColor: 'pants0',
      footColor: 'shoes0',
      hideWhenPosed: [],      // the front fist becomes the punching arm
      legend: { 'A': 'col0', 'B': 'col1', 'C': 'col2', 'D': 'col3', 'E': 'col4', 'F': 'col5', 'G': 'col6', 'H': 'col7', 'I': 'col8', 'J': 'col9', 'K': 'cola', 'L': 'colb', 'M': 'colc', 'N': 'cold', 'O': 'cole', 'P': 'colf', 'Q': 'colg', 'R': 'colh', 'S': 'coli', 'T': 'colj', 'U': 'colk', 'V': 'coll', 'W': 'colm', 'X': 'coln', 'Y': 'colo', 'Z': 'pants0', 'a': 'pants8', 'b': 'pants9', 'c': 'pantsd', 'd': 'pantse', 'e': 'pantsf', 'f': 'pantsa', 'g': 'pantsg', 'h': 'pantsh', 'i': 'pants3', 'j': 'pantsi', 'k': 'pantsk', 'l': 'pantsl', 'm': 'pantsn', 'n': 'pants5', 'o': 'pantsm', 'p': 'pantsb', 'q': 'pantsj', 'r': 'pantso', 's': 'pantsc', 't': 'pants4', 'u': 'pantsp', 'v': 'pantsq', 'w': 'pants1', 'x': 'pants7', 'y': 'pants6', 'z': 'shoes0', '0': 'shoesc', '1': 'shoes1', '2': 'shoesd', '3': 'shoesf', '4': 'shoesg', '5': 'shoesh', '6': 'shoesb', '7': 'shoesi', '8': 'shoesj', '9': 'shoesk', '!': 'shoesl', '@': 'shoesn', '#': 'shoeso', '$': 'shoes5', '%': 'shoesm', '^': 'shoese' },
      palette: {
        col0: '#08060c',
        col1: '#14101a',
        col2: '#ede5cd',
        col3: '#302941',
        col4: '#faf4e0',
        col5: '#1b1726',
        col6: '#583075',
        col7: '#0d0b13',
        col8: '#08070d',
        col9: '#09070d',
        cola: '#0a080f',
        colb: '#171421',
        colc: '#13101a',
        cold: '#14111c',
        cole: '#15111d',
        colf: '#15121d',
        colg: '#16121e',
        colh: '#16131f',
        coli: '#181421',
        colj: '#181522',
        colk: '#191523',
        coll: '#1a1624',
        colm: '#1d1928',
        coln: '#1a1625',
        colo: '#1b1625',
        pants0: '#08060c',
        pants1: '#14101a',
        pants3: '#302941',
        pants4: '#faf4e0',
        pants5: '#1b1726',
        pants6: '#583075',
        pants7: '#0d0b13',
        pants8: '#08070d',
        pants9: '#09070d',
        pantsa: '#0a080f',
        pantsb: '#171421',
        pantsc: '#13101a',
        pantsd: '#14111c',
        pantse: '#15111d',
        pantsf: '#15121d',
        pantsg: '#16121e',
        pantsh: '#16131f',
        pantsi: '#181421',
        pantsj: '#181522',
        pantsk: '#191523',
        pantsl: '#1a1624',
        pantsm: '#1d1928',
        pantsn: '#1a1625',
        pantso: '#1b1625',
        pantsp: '#fefae1',
        pantsq: '#795b97',
        shoes0: '#08060c',
        shoes1: '#14101a',
        shoes5: '#1b1726',
        shoesb: '#171421',
        shoesc: '#13101a',
        shoesd: '#14111c',
        shoese: '#15111d',
        shoesf: '#15121d',
        shoesg: '#16121e',
        shoesh: '#16131f',
        shoesi: '#181421',
        shoesj: '#181522',
        shoesk: '#191523',
        shoesl: '#1a1624',
        shoesm: '#1d1928',
        shoesn: '#1a1625',
        shoeso: '#1b1625',
      },
      grid: [
        '..................................................',
        '......................AAAAAAA.....................',
        '....................AABBBBBBBAA...................',
        '..................AABBBBBBBBBBBAA.................',
        '.................ABBBBCCCCCCCBBBBA................',
        '................ABBBCCCCCCCCCDCBBBA...............',
        '...............ABBBCCCCEEFEECDCCBBBA..............',
        '..............ABBBCCCFEEEBEEDFCCCBBBA.............',
        '..............ABBCCCEEEBEBEEDEECCCBBA.............',
        '.............ABBCCCEEEEBEBEDEEEECCCBBA............',
        '.............ABBCCFEEEEEBBEDEEEEFCCBBA............',
        '............ABBCCCEEEEEEBBEEDEEEECCCBBA...........',
        '............ABBCCEEEEEEEBBEEEDEEEECCBBA...........',
        '............ABBCCEEEEEEEGGGEEEDEEECCBBA...........',
        '............ABBCCFEEEEEEGGGEEEDEEFCCBBA...........',
        '............ABBCCEEEEEEEGGGEEDEEEECCBBA...........',
        '............ABBCCEEEEEEEEEEEEDEEEECCBBA...........',
        '............ABBCCCEEEEEEEEEEDEEEECCCBBA...........',
        '.............ABBCCFEEEEEEEEEDEEEFCCBBA............',
        '.............ABBCCCEEEEEEEEEEDEECCCBBA............',
        '..............ABBCCCEEEEEEEEEDECCCBBA.............',
        '..............ABBBCCCFEEEEEEEFDCCBBBA.............',
        '...............ABBBCCCCEEFEECCDCBBBA..............',
        '................ABBBCCCCCCCCCCCDBBA...............',
        '................AHBBBBCCCCCCCBBBBHA...............',
        '...............AHHHHBBBBBBBBBBBHHHHA..............',
        '...............AHHHHHHBBBBBBBHHHHHHA..............',
        '..............AIIJJKKKKKKLKKKHHHHHHHA.............',
        '...............AMMMNOPQRRSTUVVFFWWAA..............',
        '...............AMMMNOPQRRSTUVVFFWWA...............',
        '..............AAMIMNOPQRDLSUUVXFFWWAA.............',
        '.............AIIJJNOPQRRDLSTUUVXFFFWWA............',
        '.............AIIJJNOPQRRDLSTUUVXFFFWWA............',
        '.............AIIJJNOPQRRDLSTUUVXFFFWWA............',
        '.............AIIJJNNPPQRDLSSUUUVXFFDWWA...........',
        '............AIIJJJNPPQRRDLSSUUVVXFFDWWA...........',
        '............AIIJJJNPPQRRDLSSUUVVXFFDWWA...........',
        '............AIIJJNNPPQRRDLSSUUVVXFFFDWA...........',
        '............AIIJJNNOPQRRDLSSTUUVVYFFDWWA..........',
        '............AIIJJNNOPQRRDLSSTUUVVYFFDWWA..........',
        '............AIIJJNNOPQRRDLSSTUDVVYFFDWWA..........',
        '............AIIJJNNOPQRRDLSSTUDVVYFFDWWA..........',
        '...........AIIIJJNOPPQRRDLSSTUDVVXFFFDWWA.........',
        '...........AIIIJJNOPPQRRDLSSTUDVVXFFFDWWA.........',
        '...........AIIIJJNOPPQRRDLSSTUDVVXFFFDWWA.........',
        '...........AIIIJJNOPPKRRDLSSTUDVVXFFFDWWA.........',
        '...........AIIIJJNNPPKQRDRLKSUDUVVXFFDWWWA........',
        '...........AIIIJJNNPPKQRDRLKSUUDVHXFFDWWWA........',
        '...........AIIIJJNNPPKQRDRLKSUUDVHXFFFDWWA........',
        '...........AIIIJJNNPPKQRDRLKSUUDVHXFFFDWWA........',
        '..........AIIIJJJNOPPKRRDRLKSTUDVHVYFFDWWWA.......',
        '..........AIIIJJNNOPPKRRDRLKSTUDVHVYFFDWWWA.......',
        '..........AIIIJJNNOPPKRRDRLKSTUDVHVYFFDWWWA.......',
        '..........AIIIJJNNOPPKRRDRLKSTUDVHVYFFFDWWA.......',
        '..........AIIIJJNNOPPKQRDRLKSSUDUHVXYFFDWWWA......',
        '..........AIIIJJNNOPPKQRDRLKSSUDUHVXYFFDWWWA......',
        '..........AIIIJJNNOPPKQRDRLKSSUDUHVXYFFDWWWA......',
        '.........AIIIJJJNNPPPKRRDRLKSTUDUHVXYFFDWWWA......',
        '.........AIIIJJJNNPPKQRRDRLKSTUDUHVXYFFFDWWA......',
        '.........AIIIJJJNNPPKQRRDRKSSTUDKVVXYFFFDWWA......',
        '.........ZaaabbbccdefghhihfjjjkkikllmnnnioooZ.....',
        '.........ZaaabbbccdefghhihfjjjkkikllmnnnioooZ.....',
        '..........ZaaabbcccefeghhifpjjqkikllmrnnioooZ.....',
        '..........ZaaabbcccefeghhifpjjqkikllmrnnioooZ.....',
        '..........ZaaabbcccefeghhifpjjqkikllmrnnniooZ.....',
        '..........ZaaabbbccefeghhifpjjqkikllmrnnniooZ.....',
        '...........ZaaabbccdfegghifpjjjkikllmrnnniooZ.....',
        '...........ZaaabbcccfeeghifhpjjqikkllmrnnnoooZ....',
        '..........ZsaabbbccdfeghhifpjjjkikkllmnnnnoooZ....',
        '..........ZsaabbbccdfeghhifpjjjkikkllmnnnnoooZ....',
        '..........ZssabbbccdfeghhifpjjjkikkllmnntnuouZ....',
        '..........ZvsvbbbccdfeghhifpjjjkikkllmnntZuZuZ....',
        '..........ZvsvbscccdfegghifhpjjqikklllmntZtZZuZ...',
        '..........ZvsvbscccdfegghifhpjjqfiklllmntZZuZuZ...',
        '..........ZvsvbscccdfegghifhpjjqfiklllmnZtZuZuZ...',
        '..........ZvsvbscccdfeeghifhpjjjfikkllmrZtZtZZuZ..',
        '..........ZvsvbscccdfeeghifhpjjjfikkllmrZtZtZZuZ..',
        '..........ZvsvbscccdfeeghifhpjjjfikkllmrZtZtZZuZ..',
        '..........ZvsvbscccdfeeghifhhpjjfikkkllmZtZZtZZuZ.',
        '.........ZsvsvbccccdfegghifhpjjjfikklllmrtZZtZZuZ.',
        '.........ZsvsvbccccdfegghifhpjjjfikklllmrZtZtZZuZ.',
        '.........ZsvsvbwcccdfegghifhppjjfikkklllmZtZtZ.ZuZ',
        '.........ZsssvbwcccdfegghifhppjjfikkklllmZtZtZ.ZuZ',
        '.........ZsssbscccdfeeghhihpjjjfkikllmrnnZtZZuZ.Z.',
        '.........ZsssbscccdfeeghhihpjjjfkikllmrnnZZ.ZuZ...',
        '.........ZsssbscccdfeeghhihpjjjfkikllmrnnZ..ZuZ...',
        '.........ZsssbcccdefghhhhijjqkkxllinnnoooZ...Z....',
        '.........ZsssbcccdefghhhhijjqkkxllinnnoooZ........',
        '.........ZsssbcccdefghhhhijjqkkxllinnnoooZ........',
        '.........ZsssbcccdefghhhhijjqkkxllinnnoooZ........',
        '.........ZsssbcccdefghhhhijjqkkxllinnnoooZ........',
        '........ZssssbccceefghhhhijjqkkfllirnnnoooZ.......',
        '........ZssssbccceefghhhhijjqkkfllirnnnoooZ.......',
        '........ZssssbccceefghhhhijjqkkfllmrnnnoooZ.......',
        '........ZsyyyyyvvvvvvvvvvvvvvvvvvvvvvvvvvoZ.......',
        '........ZsyyyyyvvvvvvvvvvvvvvvvvvvvvvvvvvoZ.......',
        '........z00001222333455556778999!!@#$$$%%%z.......',
        '........z00001222333455556778999!!@#$$$%%%z.......',
        '.........z000z122^334z5556777z99!!@#$z$%%%z.......',
        '.........z000zz22z334zz55z778zz!!z#$$zz%%z........',
        '..........z0z.z22zz3z.z55zz7z.z9!zz$z.z%%z........',
        '..........z0z..z2zz3z..z5zz7z..z!zz$z..z%z........',
        '...........z....z..z....z..z....z..z....z.........',
        '..................................................',
        '..................................................',
        '..................................................',
      ],
      poses: {
        idle: [{}, { head: [0, -1], torso: [0, -1] }],
        light: [{ head: [-1, 0], torso: [-1, 0] }, { head: [5, 1], torso: [4, 1] }, { head: [2, 0], torso: [2, 0] }],
        heavy: [{ head: [-3, -1], torso: [-2, -1] }, { head: [8, 2], torso: [6, 2] }, { head: [3, 1], torso: [2, 1] }],
        special: [{ head: [-2, -2], torso: [-1, -1] }, { head: [3, 0], torso: [2, 0] }, { head: [1, 0] }],
      },
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
      footCol: 33,
      shoulder: [54, 30],
      crouchDrop: 12,
      sleeveColor: 'col8',
      sleeveShade: 0,
      handColor: 'col8',
      legColor: 'pants6',
      footColor: 'shoes2',
      hideWhenPosed: [],      // the front fist becomes the punching arm
      legend: { 'A': 'col0', 'B': 'col1', 'C': 'col2', 'D': 'col3', 'E': 'col4', 'F': 'col5', 'G': 'col6', 'H': 'col7', 'I': 'col8', 'J': 'col9', 'K': 'cola', 'L': 'colb', 'M': 'colc', 'N': 'cold', 'O': 'cole', 'P': 'colf', 'Q': 'colg', 'R': 'colh', 'S': 'coli', 'T': 'colj', 'U': 'colk', 'V': 'coll', 'W': 'colm', 'X': 'coln', 'Y': 'colo', 'Z': 'colp', 'a': 'pants0', 'b': 'pantsb', 'c': 'pantsf', 'd': 'pantsd', 'e': 'pantsg', 'f': 'pants4', 'g': 'pantsp', 'h': 'pantsk', 'i': 'pantsh', 'j': 'pantsn', 'k': 'pantsl', 'l': 'pantsj', 'm': 'pantsi', 'n': 'pantse', 'o': 'pantso', 'p': 'pantsc', 'q': 'pants1', 'r': 'pantsm', 's': 'pants5', 't': 'pants6', 'u': 'shoes0', 'v': 'shoes1', 'w': 'shoes2', 'x': 'shoes3', 'y': 'shoes4', 'z': 'shoes5', '0': 'shoes6', '1': 'shoesk', '2': 'shoesh', '3': 'shoesl', '4': 'shoesi', '5': 'shoese', '6': 'shoeso' },
      palette: {
        col0: '#08060c',
        col1: '#1f1d24',
        col2: '#242229',
        col3: '#26242c',
        col4: '#282531',
        col5: '#292632',
        col6: '#2a2733',
        col7: '#654530',
        col8: '#d19c3d',
        col9: '#0e0b0e',
        cola: '#967753',
        colb: '#262330',
        colc: '#5b556a',
        cold: '#272431',
        cole: '#595368',
        colf: '#272330',
        colg: '#282432',
        colh: '#504a5d',
        coli: '#575166',
        colj: '#564f64',
        colk: '#4d485a',
        coll: '#534e61',
        colm: '#2d2938',
        coln: '#524c60',
        colo: '#5e5668',
        colp: '#464153',
        pants0: '#08060c',
        pants1: '#1f1d24',
        pants4: '#282531',
        pants5: '#292632',
        pants6: '#2a2733',
        pantsb: '#262330',
        pantsc: '#5b556a',
        pantsd: '#272431',
        pantse: '#595368',
        pantsf: '#272330',
        pantsg: '#282432',
        pantsh: '#504a5d',
        pantsi: '#575166',
        pantsj: '#564f64',
        pantsk: '#4d485a',
        pantsl: '#534e61',
        pantsm: '#2d2938',
        pantsn: '#524c60',
        pantso: '#5e5668',
        pantsp: '#464153',
        shoes0: '#08060c',
        shoes1: '#1f1d24',
        shoes2: '#242229',
        shoes3: '#26242c',
        shoes4: '#282531',
        shoes5: '#292632',
        shoes6: '#2a2733',
        shoese: '#595368',
        shoesh: '#504a5d',
        shoesi: '#575166',
        shoesk: '#4d485a',
        shoesl: '#534e61',
        shoeso: '#5e5668',
      },
      grid: [
        '.........................ABBBCCCCDDDEEFGGA........................',
        '.........................ABBBCCCCDDDEEFGGA........................',
        '.........................ABBBCCCCDDDEEFGGA........................',
        '.........................ABBBCCCCDDDEEFGGA........................',
        '..........................AAAAABCDEGAAAAA.........................',
        '...........................AAAABCDEGAAAA..........................',
        '..........................AHHHHIIIIIIIIIA.........................',
        '..........................AHHHHIIIJIIIIIA.........................',
        '.........................AHHHHKIIIJIIIIIIA........................',
        '.........................AHHHHKIIJIIIIIIIA........................',
        '........................AHHHHKKIIJIIIIIIIIA.......................',
        '........................AHHHHKKIIJIIIIIIIIA.......................',
        '.......................AHHHHHKIIJIIIIIIIIIIA......................',
        '.......................AHHHHKKIIJIIIIIIIIIIA......................',
        '......................AHHHHHKKIIIJIIIIIIIIIIA.....................',
        '......................AHHHHKKKIIIJIIIIIIIIIIA.....................',
        '......................AHHHHKKKIIIIJIIIIIIIIIA.....................',
        '.....................AHHHHHKKKIIIIJIIIIIIIIIIA....................',
        '.....................AHHHHKKKKIIIIIJIIIIIIIIIA....................',
        '.....................AHHHHKKKKIIIIIJIIIIIIIIIA....................',
        '.....................AHHHHKKKKIIIIJIIIIIIIIIIA....................',
        '....................AHHHHHKKKIIIIIJIIIIIIIIIIIA...................',
        '...................ALHHHHKKKKIIIIIJIIIIIIIIIIIMA..................',
        '.................AALLHHHHKKKKIIIIJIIIIIIIIIIIIMMA.................',
        '................ALLNNHHHHKKKIIIIIJIIIIIIIIIIIIOMMAA...............',
        '..............AALLPNHHHHHKKKIIIIIIJIIIIIIIIIIIIOMMMA..............',
        '.............ALLPNNQHHHHKKKIIIIIIIJIIIIIIIIIIIIOOMMMA.............',
        '...........AALLPNNQEHHHHKKIIIIIIIIIJIIIIIIIIIIIOOOMMMA............',
        '..........ALLPNNQHHIIIIIIIIIIIIIIIIJIIIIIIIIIIIIHHOMMMA...........',
        '........AALLPNNQEHHHHHHHHHHHHHHHHHHHJHHHHHHHHHHHHHOOMMMAA.........',
        '.......ALLPNBBBBCHHHHHHHHHHHHHHHHHHHJHHHHHHHHHHHHHOOOOMMMA........',
        '.......ALLLNBRRBCHHHHHAAAAAAAAAAAAAAAAAAAAAAAHHHHHSOOOMMMMA.......',
        '......ALLLPNBBBBCFFGGGGAAAAAAAAAAAAAAAAAAAAATTTTSSSSOOOMMMMA......',
        '......ALLLPNBBBBCFFGGGGAAAAAIIIAAAAAIIIAAAAATTTTSSSSOOOMMMMA......',
        '.....ALLLPNNQQEQFCCCCCGUAAAAIIIAAAAAIIIAAAATTTTSSSSOOOOMMMMA......',
        '.....ALLLPNNQQEQFCVVCCUUAAAAAAAADDDAAAAAAAATTTTSSSSOOOOMMMMA......',
        '....ALLLPNNQQEQFFCCCCCUUUAAAAAADDDDDAAAAAAVVTTTTSSSSOOOOMMMMA.....',
        '....ALLLPNNQQEQFFCCCCCUUUAAAAAADDDDDAAAAAAVVTTTTSSSSOOOOMMMMA.....',
        '....ALLLPNNNQEEFFFGGGGCCCCCUUUWDDDDDRXXXVWWWWWWWWSSSSOOOOMMMMA....',
        '...ALLLPNNNQEEQFFGGGGUCSSCCWWWWDDDDDWWWWWYVVVTTTTSSSSSOOOOMMMMA...',
        '...ALLLPNNNQEEQFFGGGGGCCCCCUUUWUDDDRRXXXXVYVVTTTTTSSSSSOOOYMMMMA..',
        '..ALLLPNNNQQEQFFFGGGGUCCCCCUUUWRRRRRRXXXVVYVVTTTTTSSSSSOOOYMMMMA..',
        '..ALLLPNNNQQEQFFFGGGGUUUUUUCCCDDRRRRRXXXVVYVVTTTTTSSSSSOOOYMMMMA..',
        '.ALLLPNNNQQEQFFFGGGGUUUUUUUCYYDDRRRRXXXXVVYVVTTTTTSSSSOOOOYMMMMA..',
        '.ALLLPNNNQQEQFFFGGGGUUUUUUUCCDDDRRRRXXXXVVYVVTTTTTSSSSOOOOYMMMMA..',
        '.ALLLPNNNQQEQFFFGGGGUUUUUUUCCDDDRRRRXXXXVWWWWWWWWTSSSSOOOOYMMMMA..',
        '.ALLLPNNNQQEQFFFGGGGUUUUUUWWWWWWDDDDDWWWWVYVVTTTTTSSSSOOOOOYMMMA..',
        '.ALLLPNNNQQEEQFFGGGGGGGGGWUUUUWRDYYDDXXXXVYVVVTTTTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGGGZUUUUUUUUUUWRDDDDDXXXXVVYVVTTTTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGGGZUUUUUUUUUUWRDDDDDXXXXVVYVVTTTTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGGGZUUUUUUUUUUWRRRRRRDDDDDVYVVTTTTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGGGZUUUUUUUUUUWRRRRRRDYYDDVYVVTTTTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGGZZUUUUUUUUUUWRRRRRRDDDDDWWWWWWWTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGGZZUUUUUUWWWWWWWWWWWDDDDDVYVVTTTTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGGGGGGGGGWUUUUWRRRRRRXXXXVDEEEETTTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGGZZUUUUUUUUUUWRRRRRRXXXXVDYYEETTTSSSSSOOOOYMMMMA.',
        '.ALLLPNNNQQEEQFFGZZZUUUUUUUUUUWRRRRRRXXXXVDEEEETTTSSSSSOOOOYMMMMA.',
        '..ALLLPNNNQQEQFFFZZZUUUUUUUUUUWURRRRRXXXXVDEEEETTTTSSSSOOOOYMMMMA.',
        '..ALLLPNNNQQEQFFFZZZUUUUUUUUUUWURRRRRXXXXVVVYVTEEEEESSSOOOOOYMMMA.',
        '..ALLLPNNNQQEQFFFZZZUUUUUUUUUUWURRRRRXXXXWWWWWWEYYEESSSOOOOOYMMMA.',
        '..ALLLPNNNQQEEQFZZZZZUUUUUWWWWWWWWWWWWWWWXVVYVVEEEEESSSSOOOOYMMMMA',
        '..ALLLPNNNQQEEQFZZGGGGGGGGUUUUWURRRRRRXXXXVVVVVEEEEESSSSOOOOYMMMMA',
        '..ALLLPNNNQQEEQFZZZZZUUUUUUUUUWURRRRRRXXXXVVVVVTTTTSESSSOOOOYMMMMA',
        '..ALLLPNNNQQEEQFZZZZZUUUUUUUUUUURRRRRRXXXXVVVVVTTTTSESSSOOOOYMMMMA',
        '..abbbcdddeeffegggggghhhhhhhhhhhiiiiiijjjjkkkkkllllmfmmmnnnnoppppa',
        '..abbbcdddeeffegggggghhhhhhhhhhhiiiiiijjjjkkkkkllllmmmmmnnnnnppppa',
        '..abbbcdddeeagegggggghhhhhhhhhhhiiiiiijjjjkkkkkllllmmmooonnnnppppa',
        '..abbbcdddeeaagggggghhhhhhhhhhhhiiiiijjjjkkkkklllllmooooooonppppa.',
        '..abbbcdddeeaaggggggghhhhhhhhhhhiiiiiijjjjkkkkkllllmooooooonnppppa',
        '..abbbcdddeeaaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqllmooooooonnppppa',
        '.abbbcdddeeffaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqllrrrooorrrrrrppa',
        'abbbcddddeffesaatttttttttrrrrrraaaiiiijjjjkkkkkllllrrrrrrrrrrrrppp',
        'abbbcddddeffesaatttttttttrrrrrra.aiiiijjjjkkkkklllllmmmmmnnnnnpppp',
        'bbbcddddeffesssattttttttrrrrrrra.aiiijjjjkkkkkllllllmmmmmnnnnnpppp',
        'bbbqqqqqqqqqsssattttttttrrrrrrra.aiiijjjjkkkkkllllllmmmmmnnnnnpppp',
        'bbbqqqqqqqqqsssattttttttrrrrrrra..aiijjjjkkkkklllllrrrrrrrrrrrrppp',
        'bbbcddddeffessstttttttttrrrrrrra..aiijjjjkkkkklllllrrrrrrrrrrrrppa',
        'bbbcddddeffessstttttttttrrrrrrra..aiijjjjkkkkklllllmmmmmnnnnnppppa',
        'abbbcdddeeffesatttttttttrrrrrrra..aiijjjjkkkkklllllmmmmmnnnnnppppa',
        'abbbcdddeeffesatttttttttrrrrrrra..aiijjjkkkkklllllmmmmmnnnnnppppa.',
        '.abbbcdddeefeaasttttttttrrrrrrra..aijjjjkkkkklllllmmmmnnnnnppppa..',
        '..abbbcdddefa.astttttttttrrrrrra..aijjjjkkkklllllmmmmmnnnnppppa...',
        '...aabbbcdaa..assttttttttrrrrrra..aijjjkkkkkllllmmmmaannppppaa....',
        '.....aaaaa....abbcddefsstttttrra..aijjjkkklllmmmnnpppaaaaaaa......',
        '..............abbcddefsstttttrra..aijjjkkklllmmmnnpppa............',
        '..............abbcddefsstttttrra..aijjjkkklllmmmnnpppa............',
        '..............abbcddefsstttttrra..aijjjkkklllmmmnnpppa............',
        '..............abbcddefsstttttrra..aijjjkkklllmmmnnpppa............',
        '..............abbcddefsstttttrra..aijjjkkklllmmmnnpppa............',
        '..............abbcddefsstttttrra...ajjjkkklllmmmnnpppa............',
        '.............abbcddefsstttttrrra...ajjkkklllmmmnnnpppa............',
        '.............abbcddefsstttttrrra...ajjkkklllmmmnnnpppa............',
        '.............abbcddefesttttttrra...aijjkkklllmmmnnnpppa...........',
        '...........aaabbcddefesttttttrra..aaijjkkklllmmmnnnpppaaaa........',
        '..........uvvvvvvvvwwwwwwwwwwwwwuuxxxxxxxxyyyyyyyzzz000000u.......',
        '..........uvv12222333333344455wwuuxx6666666666666666666600u.......',
        '..........uvv12222333333344455wwuuxx6666666666666666666600u.......',
        '..........uvvvvvvvvwwwwwwwwwwwwwuuxxxxxxxxyyyyyyyzzz000000u.......',
        '..........uvvvvvvvvwwwwwwwwwwwwwuuxxxxxxxxyyyyyyyzzz000000u.......',
        '..........uvvvvvvvvwwwwwwwwwwwwwuuxxxxxxxxyyyyyyyzzz000000u.......',
        '..........uvvvvvvvvwwwwwwwwwwwwwuuxxxxxxxxyyyyyyyzzz000000u.......',
        '..........uvvvvvvvvwwwwwwwwwwwwwuuxxxxxxxxyyyyyyyzzz000000u.......',
        '..........uvvvvvvvvwwwwwwwwwwwwwuuxxxxxxxxyyyyyyyzzz000000u.......',
        '...........uuuuuuuuuuuuuuuuuuuuu..uuuuuuuuuuuuuuuuuuuuuuuu........',
      ],
      poses: {
        idle: [{}, { head: [0, -1], torso: [0, -1] }],
        light: [{ head: [-1, 0], torso: [-1, 0] }, { head: [5, 1], torso: [4, 1] }, { head: [2, 0], torso: [2, 0] }],
        heavy: [{ head: [-3, -1], torso: [-2, -1] }, { head: [8, 2], torso: [6, 2] }, { head: [3, 1], torso: [2, 1] }],
        special: [{ head: [-2, -2], torso: [-1, -1] }, { head: [3, 0], torso: [2, 0] }, { head: [1, 0] }],
      },
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
      footCol: 25,
      shoulder: [34, 25],
      crouchDrop: 12,
      sleeveColor: 'col0',
      sleeveShade: 0,
      handColor: 'col0',
      legColor: 'pants0',
      footColor: 'shoesq',
      hideWhenPosed: [],      // the front fist becomes the punching arm
      legend: { 'A': 'col0', 'B': 'col1', 'C': 'col2', 'D': 'col3', 'E': 'col4', 'F': 'col5', 'G': 'col6', 'H': 'col7', 'I': 'col8', 'J': 'col9', 'K': 'cola', 'L': 'colb', 'M': 'colc', 'N': 'cold', 'O': 'cole', 'P': 'colf', 'Q': 'colg', 'R': 'colh', 'S': 'coli', 'T': 'colj', 'U': 'colk', 'V': 'coll', 'W': 'colm', 'X': 'coln', 'Y': 'colo', 'Z': 'colp', 'a': 'pants0', 'b': 'pants1', 'c': 'pants4', 'd': 'pantse', 'e': 'pantsa', 'f': 'pants5', 'g': 'pantsf', 'h': 'pantsg', 'i': 'pantsc', 'j': 'pantsh', 'k': 'pantsm', 'l': 'pants8', 'm': 'pants9', 'n': 'pantsl', 'o': 'pantsj', 'p': 'pants2', 'q': 'pants7', 'r': 'pants6', 's': 'pantsb', 't': 'pantsd', 'u': 'pantsk', 'v': 'pants3', 'w': 'pantsi', 'x': 'shoes0', 'y': 'shoesq', 'z': 'shoeso' },
      palette: {
        col0: '#08060c',
        col1: '#b6b2aa',
        col2: '#f5f1e7',
        col3: '#c6c3ba',
        col4: '#b9b5ad',
        col5: '#979389',
        col6: '#c1bdb3',
        col7: '#c4c0b6',
        col8: '#dbd7ce',
        col9: '#e1ddd3',
        cola: '#bebab1',
        colb: '#a7a196',
        colc: '#cfcbc2',
        cold: '#d7d3ca',
        cole: '#bbb7ae',
        colf: '#a2998b',
        colg: '#cac7be',
        colh: '#d3cfc6',
        coli: '#e6e2d8',
        colj: '#efebe1',
        colk: '#b5afa3',
        coll: '#eae6dc',
        colm: '#aea99e',
        coln: '#5d4735',
        colo: '#95836e',
        colp: '#1e0f13',
        pants0: '#08060c',
        pants1: '#b6b2aa',
        pants2: '#f5f1e7',
        pants3: '#c6c3ba',
        pants4: '#b9b5ad',
        pants5: '#979389',
        pants6: '#c1bdb3',
        pants7: '#c4c0b6',
        pants8: '#dbd7ce',
        pants9: '#e1ddd3',
        pantsa: '#bebab1',
        pantsb: '#a7a196',
        pantsc: '#cfcbc2',
        pantsd: '#d7d3ca',
        pantse: '#bbb7ae',
        pantsf: '#a2998b',
        pantsg: '#cac7be',
        pantsh: '#d3cfc6',
        pantsi: '#e6e2d8',
        pantsj: '#efebe1',
        pantsk: '#b5afa3',
        pantsl: '#eae6dc',
        pantsm: '#aea99e',
        shoes0: '#08060c',
        shoeso: '#95836e',
        shoesq: '#78726b',
      },
      grid: [
        '....................................AA..........',
        '..................................AABCA.........',
        '......................AAAAA.....AABDAACA........',
        '....................AABEFGHAA..AIJAA..ACA.......',
        '...................ABEFKGDDLMAANAA.....ACA......',
        '..................ABFOKGHPQQMRAA........ACA.....',
        '.................AFOGDQLNIJSOTCA.........A......',
        '................ABEKHPQMNIUJVVTHAAAA............',
        '...............ABEOFHDQQLRNIIUSVVKGHAAAA........',
        '...............ABFOKGHPQQMMWNNIJUAAAKGGHA.......',
        '..............AFEOGHPQMRNWIJJSOTTCA.AAAA........',
        '..............ABEOFHDQMLNNIJBSVTTHA.............',
        '..............ABFOGHDLMRNNUJJSVKTCA.............',
        '..............ABEOGPDQMRWNIJJEVATCA.............',
        '..............ABEFGHDQLRNAAAAAAAGCA.............',
        '..............AFEOGAAAMAANAAJXXAACA.............',
        '..............ABEOFAAAMAXNXXJAAAAHA.............',
        '...............AFEKGAXXXAAAAAAAGCA..............',
        '...............ABEKPAAAAAAAAAATTCA..............',
        '................AFEKHDLMNIJAVVTCA...............',
        '.................ABEFHQMRWIJSVGCA...............',
        '................AAABOGDLMNIJBVGHA...............',
        '...............AFFKGDLMRNIUSVKTHA...............',
        '...............ABEKPPLMRWIJBVKTCAA..............',
        '.............AABEOFPDQMRWWIJJSOKTCAAA...........',
        '...........AABEOFFHDQQLLRNNIUUSSVTTCHA..........',
        '..........ABEOKGGHDQLLMRNNUUJJSVVTGGCA..........',
        '..........ABEEFFGHPLQMMRWWIIJJBSOOTTCCA.........',
        '..........ABFFKKPPDQQMLLNNIIUUSSVVTTCCA.........',
        '.........AFFEOKGHDDQLLRRNNWUJJSSVVTTHHA.........',
        '.........ABEEOKGHDLLMMRRWWIIJJBEVVKGCCA.........',
        '.........ABEEOFGPPDQQMLWNNIIUUJSOOVTTCCA........',
        '.........ABEFFKPHDDQLLMRNNWUJJJSVVVTTCHA........',
        '.........AFFEOKGHDPLQMMRWWIIJJBBVVVTGHCA........',
        '........AFEEOKGHPPQQMMLWNNIIUUSSVVKKTCCA........',
        '........ABBEOKFPHDDQLLMRNNWUIJJSEOVTTTCCA.......',
        '........ABBEFFGGHDLLQMMRWWIIIJUBSVVTTTHHA.......',
        '........ABFFOKGGPPDQQMLWNNIIUUJSSVVTKGCCA.......',
        '........AFBEOKGPHDDQLLMRNNWUIJJSEVOKTTCCA.......',
        '.......ABBEOKKPHDDLLMMMRWWNIIJUBSEVVTTTCHA......',
        '.......ABBEOFFGHPPQQMMLWNNNIUUJJSSVVTTGHCA......',
        '.......ABBFFKKPPDDQQLLMRNNWWIJJJBSVVKGTCCA......',
        '.......AFFEOKGGHDDLLMMRRWWIIJJBBSVOKTTCCA.......',
        '.......ABBEOKGGHPPQQMMLWNNIIUUJSSVVTTTCCA.......',
        '......ABBEOKFPPPDQQMLLRNNNWUJJJSEOVTTTHHAAAAAAA.',
        '......ABBEFFKKGHHDPLQQMMLLRNNNWUJYYYYYYYYYYYYYYA',
        '......ABFFEOKKGHPPDQQQLLMRRNWWIIJXXXXXXXXXXYYYYA',
        '......AFBEEOKKPPHDDQLLMMMRWWNNIIUXXXXXXXXXXYYYYA',
        '......ABBEEOFFGHHDPLQQMMLLRNNNWUJXXXXXXXXXXYYYYA',
        '......ABBEFFKKAHPPDQQQLLMRRNWWIIJXXXXXXXXXXYYYYA',
        '.......AFFEOOKAPHHDDLLQMMRWWNNIIUZZZZZZZZZZZZZZA',
        '.......ABBEOOKAGHHPPQQQMLLRNNNWUIZXXXXXXXXXXXXZA',
        '.......ABBEOFFAGPPDDQQLLMRRNWWIIIZZZZZZZZZZZZZZA',
        '.......ABBFFOKAPHHDDLLQMMRWWNNIIUZZZZZZZZZZZZZZA',
        '.......AFFEOOKAGHHPPQQQMLLRNNNWUIZAAAAAAAAAAAAZA',
        '.......ABBEOOKAAPPDDQQLLMRRNWWIIIZZZZZZZZZZZZZZA',
        '.......abcdefgaahiijkkllmmbdnoopqaaaaaaaaaaaaaa.',
        '........abffdeaarqgghhiissjttluuma..a......apa..',
        '........afccdea.avssijjttllmubwnna.apa......a...',
        '........abcdera.asiijttluabbnnooppa.a...a.......',
        '.......afbcdffa.avhhiisktatllmmmbca....apa......',
        '.......afcaeaa..ahiikktlmamwnnerppa...a.a.......',
        '......afacaea..avhssijjtaalmubwwnna..apa...a....',
        '......afbaada..agghhhiija.akllmmmma...a...apa...',
        '......afcaaea..ahiijjtkka.awwnnorqpa.......a....',
        '.....afacaara..ahiijkklla.awnneeoppa............',
        '.....afaca.aqa.ahiskttlla.awddnooppa............',
        '.....afaa..aqa.assijttlla..annnoopqa............',
        '.....afa...aqa.ahiijttkua..annnorqpa............',
        '....afa....aqa.ahiijkklla..awndeooppa...........',
        '....afa....aqa.ahiskttlla..acdnoooppa...........',
        '.....a.....aba.afgvhhiija..amwwnoorqa...........',
        '...........abaafrqvhhiska...awwnerppa...........',
        '............a.abcdergsha....ambdnoppa...........',
        '..............abcdfgqvha....aumwnnopqa..........',
        '..............abfferqvha....ammwnnrrpa..........',
        '..............afcderqvsa.....amwdeoppa..........',
        '..............abcderggha.....abbnnoppa..........',
        '..............abcdfgqvha.....amwnnopqa..........',
        '..............abfferqvha.....amwnnrrpa..........',
        '..............afcderqvsa.....amwdeoppa..........',
        '.............abcderqgsa......aubwnooppa.........',
        '.............abcdefgvha......amwwnoorqa.........',
        '.............abcffrqvha......amwwnerppa.........',
        '.............affderqvha......amwcdooppa.........',
        '.............abcderqgsa......aubwnooppa.........',
        '.............abcdefgva........awwnoorqa.........',
        '.............abcffrqva........awwnerppa.........',
        '.............affderqva........awcdooppa.........',
        '.............abcderqga........abwnooppa.........',
        '............abcderggva........amwnnorrpa........',
        '............abcdffrqva........amwndeoppa........',
        '...........aabfferrqaa........ambdnooppaaa......',
        '..........xyyyyyyyyyyyx......xyyyyyzzzzzzzx.....',
        '..........xyyyyyyyyyyyx......xyyyyyzzzzzzzx.....',
        '.........xyyyyyyyyyyyyx......xyyyyyyzzzzzzzx....',
        '.........xyyyyyyyyyyyyx.....xyyyyyyyzzzzzzzx....',
        '........xyyyyyyyyyyyyyx.....xyyyyyyyzzzzzzzzx...',
      ],
      poses: {
        idle: [{}, { head: [0, -1], torso: [0, -1] }],
        light: [{ head: [-1, 0], torso: [-1, 0] }, { head: [5, 1], torso: [4, 1] }, { head: [2, 0], torso: [2, 0] }],
        heavy: [{ head: [-3, -1], torso: [-2, -1] }, { head: [8, 2], torso: [6, 2] }, { head: [3, 1], torso: [2, 1] }],
        special: [{ head: [-2, -2], torso: [-1, -1] }, { head: [3, 0], torso: [2, 0] }, { head: [1, 0] }],
      },
    }));
})();
