// 5x7 bitmap pixel font. Text is rendered once to an offscreen canvas and cached.
(function () {
  const GLYPHS = {
    A: '01110 10001 10001 11111 10001 10001 10001',
    B: '11110 10001 10001 11110 10001 10001 11110',
    C: '01110 10001 10000 10000 10000 10001 01110',
    D: '11110 10001 10001 10001 10001 10001 11110',
    E: '11111 10000 10000 11110 10000 10000 11111',
    F: '11111 10000 10000 11110 10000 10000 10000',
    G: '01110 10001 10000 10111 10001 10001 01111',
    H: '10001 10001 10001 11111 10001 10001 10001',
    I: '01110 00100 00100 00100 00100 00100 01110',
    J: '00111 00010 00010 00010 00010 10010 01100',
    K: '10001 10010 10100 11000 10100 10010 10001',
    L: '10000 10000 10000 10000 10000 10000 11111',
    M: '10001 11011 10101 10101 10001 10001 10001',
    N: '10001 10001 11001 10101 10011 10001 10001',
    O: '01110 10001 10001 10001 10001 10001 01110',
    P: '11110 10001 10001 11110 10000 10000 10000',
    Q: '01110 10001 10001 10001 10101 10010 01101',
    R: '11110 10001 10001 11110 10100 10010 10001',
    S: '01111 10000 10000 01110 00001 00001 11110',
    T: '11111 00100 00100 00100 00100 00100 00100',
    U: '10001 10001 10001 10001 10001 10001 01110',
    V: '10001 10001 10001 10001 10001 01010 00100',
    W: '10001 10001 10001 10101 10101 10101 01010',
    X: '10001 10001 01010 00100 01010 10001 10001',
    Y: '10001 10001 10001 01010 00100 00100 00100',
    Z: '11111 00001 00010 00100 01000 10000 11111',
    0: '01110 10001 10011 10101 11001 10001 01110',
    1: '00100 01100 00100 00100 00100 00100 01110',
    2: '01110 10001 00001 00010 00100 01000 11111',
    3: '11111 00010 00100 00010 00001 10001 01110',
    4: '00010 00110 01010 10010 11111 00010 00010',
    5: '11111 10000 11110 00001 00001 10001 01110',
    6: '00110 01000 10000 11110 10001 10001 01110',
    7: '11111 00001 00010 00100 01000 01000 01000',
    8: '01110 10001 10001 01110 10001 10001 01110',
    9: '01110 10001 10001 01111 00001 00010 01100',
    '.': '00000 00000 00000 00000 00000 01100 01100',
    '!': '00100 00100 00100 00100 00100 00000 00100',
    '?': '01110 10001 00001 00010 00100 00000 00100',
    ':': '00000 01100 01100 00000 01100 01100 00000',
    '-': '00000 00000 00000 11111 00000 00000 00000',
    "'": '00100 00100 01000 00000 00000 00000 00000',
    '/': '00001 00001 00010 00100 01000 10000 10000',
    ',': '00000 00000 00000 00000 01100 00100 01000',
    '(': '00010 00100 01000 01000 01000 00100 00010',
    ')': '01000 00100 00010 00010 00010 00100 01000',
    '+': '00000 00100 00100 11111 00100 00100 00000',
    '=': '00000 00000 11111 00000 11111 00000 00000',
    '$': '00100 01111 10100 01110 00101 11110 00100',
    '<': '00010 00100 01000 10000 01000 00100 00010',
    '>': '01000 00100 00010 00001 00010 00100 01000',
    '&': '01100 10010 10100 01000 10101 10010 01101',
    '*': '00000 10101 01110 11111 01110 10101 00000',
    ' ': '00000 00000 00000 00000 00000 00000 00000',
  };
  const W = 5, H = 7;
  const rows = {};
  for (const k in GLYPHS) rows[k] = GLYPHS[k].split(' ');

  const cache = new Map();

  function textWidth(str, scale = 1) {
    return str.length ? (str.length * (W + 1) - 1) * scale : 0;
  }

  function paint(ctx, str, ox, oy, s, color) {
    for (let i = 0; i < str.length; i++) {
      const g = rows[str[i]] || rows['?'];
      for (let y = 0; y < H; y++) {
        ctx.fillStyle = Array.isArray(color) ? color[y] : color;
        const r = g[y];
        for (let x = 0; x < W; x++) {
          if (r[x] === '1') ctx.fillRect(ox + (i * (W + 1) + x) * s, oy + y * s, s, s);
        }
      }
    }
  }

  // opts: scale, color (string or array of 7 per-row colours), outline, shadow
  function render(str, opts) {
    const s = opts.scale || 1;
    const pad = opts.outline || opts.shadow ? s : 0;
    const key = [str, s, opts.color, opts.outline, opts.shadow].join('|');
    let c = cache.get(key);
    if (c) return c;
    const [canvas, ctx] = RF.util.makeCanvas(textWidth(str, s) + pad * 2 + s, H * s + pad * 2 + s);
    if (opts.outline) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        paint(ctx, str, pad + dx * s, pad + dy * s, s, opts.outline);
      }
    }
    if (opts.shadow) paint(ctx, str, pad + s, pad + s, s, opts.shadow);
    paint(ctx, str, pad, pad, s, opts.color || '#fff');
    c = { canvas, pad };
    cache.set(key, c);
    return c;
  }

  function drawText(ctx, text, x, y, opts = {}) {
    const str = String(text).toUpperCase();
    const s = opts.scale || 1;
    const w = textWidth(str, s);
    if (opts.align === 'center') x -= Math.floor(w / 2);
    else if (opts.align === 'right') x -= w;
    const r = render(str, opts);
    ctx.drawImage(r.canvas, Math.round(x - r.pad), Math.round(y - r.pad));
  }

  // Split text into lines of at most maxChars characters, breaking on spaces.
  function wrap(text, maxChars) {
    const lines = [];
    let line = '';
    for (const word of String(text).split(/\s+/)) {
      if (!word) continue;
      if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
      else line = line ? line + ' ' + word : word;
    }
    if (line) lines.push(line);
    return lines;
  }

  RF.font = { drawText, textWidth, wrap, GLYPH_HEIGHT: H };
})();
