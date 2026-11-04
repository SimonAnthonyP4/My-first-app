// Classic "Doom fire" pixel flames. Heat values spread upward and cool down at
// random, which makes convincing flickering fire at any size. Anything can be
// set on fire by feeding heat into cells (e.g. the pixels of the title text).
(function () {
  // Black -> deep red -> orange -> yellow -> white
  const STOPS = [
    [0, [7, 7, 7, 0]], [4, [47, 15, 7, 120]], [8, [103, 31, 7, 210]], [12, [143, 39, 7, 255]],
    [16, [191, 71, 7, 255]], [20, [215, 95, 7, 255]], [24, [223, 127, 15, 255]], [28, [207, 151, 39, 255]],
    [32, [207, 183, 63, 255]], [34, [223, 223, 159, 255]], [36, [255, 255, 255, 255]],
  ];
  const MAX = 36;
  const PALETTE = [];
  for (let i = 0; i <= MAX; i++) {
    let k = 0;
    while (STOPS[k + 1] && STOPS[k + 1][0] < i) k++;
    const [a, ca] = STOPS[k], [b, cb] = STOPS[Math.min(k + 1, STOPS.length - 1)];
    const t = b === a ? 0 : (i - a) / (b - a);
    PALETTE.push(ca.map((v, j) => Math.round(v + (cb[j] - v) * t)));
  }

  class FireField {
    // decay: higher = shorter flames
    constructor(w, h, decay = 1) {
      this.w = w;
      this.h = h;
      this.decay = decay;
      this.heat = new Uint8Array(w * h);
      [this.canvas, this.ctx] = RF.util.makeCanvas(w, h);
      this.img = this.ctx.createImageData(w, h);
    }

    // Keep a cell burning at the given heat (call every frame for a steady source).
    ignite(x, y, heat = MAX) {
      x |= 0; y |= 0;
      if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.heat[y * this.w + x] = Math.max(this.heat[y * this.w + x], heat);
    }

    igniteBottom(heat = MAX) {
      const row = (this.h - 1) * this.w;
      for (let x = 0; x < this.w; x++) this.heat[row + x] = heat;
    }

    step() {
      const { w, h, heat } = this;
      for (let y = 1; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const src = y * w + x;
          const v = heat[src];
          if (v === 0) { heat[src - w] = 0; continue; }
          const r = (Math.random() * 3) | 0;
          const dst = src - w - r + 1; // drift sideways a little
          if (dst >= 0) heat[dst] = Math.max(0, v - ((r & 1) * this.decay));
        }
      }
    }

    render() {
      const d = this.img.data, heat = this.heat;
      for (let i = 0; i < heat.length; i++) {
        const c = PALETTE[heat[i]], o = i * 4;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c[3];
      }
      this.ctx.putImageData(this.img, 0, 0);
      return this.canvas;
    }
  }

  RF.FireField = FireField;
  RF.FIRE_MAX = MAX;
})();
