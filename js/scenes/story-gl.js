// STORY MODE: sets built in real 3D (three.js, js/vendor/three.min.js).
//
// Three places are real rooms now: the throne hall, the Keeper's post and the Judge's bench. The
// floor, the steps, the throne, the desk, the columns are solid; there are lights and fog; the
// stage painting is the far wall (still animated); every actor and every one of the army is a
// billboard standing in the room at their own depth, hidden by whatever is in front of them. The
// camera really tilts: it can look down the hall from the ceiling or up at the bench from the floor.
//
// Nothing in the screenplay changes: every { cam3d } shot on one of these stages is drawn here.
// The camera's position comes from StoryScene.cam3 (story-3d.js), the same numbers as before.
// If WebGL is not available (or three.js has not arrived yet), the drawn sets are used instead.
//
// three.js is loaded the first time story mode is opened; the rest of the game never needs it.
// To add a set: GL.sets.<stageId> = (kit) => ({ update(t) }), using the helpers in `kit`.
(function () {
  const K = RF.storyKit, W = 384, H = 224, BW = 160, BH = 184, FOOT = 20;   // (an actor is baked into a BW x BH picture, feet FOOT above its bottom edge)
  const GL = RF.storyGL = { ok: null, sets: {}, on: true };
  let T3 = null, R3 = null, cam = null, cv = null;

  GL.load = function () {
    if (window.THREE || GL.loading || GL.ok === false) return;
    GL.loading = true;
    try {
      const s = document.createElement('script'); s.src = 'js/vendor/three.min.js';
      s.onload = () => { GL.loading = false; }; s.onerror = () => { GL.loading = false; GL.ok = false; };
      document.head.appendChild(s);
    } catch (e) { GL.ok = false; }
  };
  function init() {
    if (GL.ok !== null) return GL.ok;
    if (!window.THREE) { GL.load(); return false; }   // (not here yet: the drawn sets are used meanwhile)
    T3 = window.THREE;
    try {
      cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      R3 = new T3.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'low-power' });
      R3.setPixelRatio(1); R3.setSize(W, H, false);
      cam = new T3.PerspectiveCamera(46, W / H, 6, 2800);
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); GL.ok = false; });
      GL.ok = true;
    } catch (e) { GL.ok = false; }
    return GL.ok;
  }

  // ---------------------------------------------------------------- building blocks
  const tex = (canvas, repeat) => {
    const t = new T3.CanvasTexture(canvas); t.magFilter = T3.NearestFilter; t.minFilter = T3.NearestFilter; t.generateMipmaps = false;
    if (repeat) { t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  };
  const paint = (w, h, f) => { const [c, x] = RF.util.makeCanvas(w, h); f(x, w, h); return c; };
  // world: x to the right, y up, z away from the usual camera (the stage wall is at z = 84).
  // three.js looks down -z, so every position is (x, y, -z).
  const XL = -330, XR = 714, ZF = -460, ZW = 98;   // the room (ZW: the far wall stands a little behind the old one, so nobody's edge pokes through it)
  function makeKit(scene, stageDef, o) {
    const lam = (color, m) => new T3.MeshLambertMaterial(Object.assign({ color }, m));
    const bas = (color, m) => new T3.MeshBasicMaterial(Object.assign({ color }, m));
    const add = (m) => { scene.add(m); return m; };
    const box = (w, h, d, m, x, y, z) => { const b = new T3.Mesh(new T3.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, -z); return add(b); };
    const cyl = (r0, r1, h, m, x, y, z, seg) => { const b = new T3.Mesh(new T3.CylinderGeometry(r0, r1, h, seg || 10), m); b.position.set(x, y + h / 2, -z); return add(b); };
    const flat = (w, d, m, x, y, z) => { const b = new T3.Mesh(new T3.PlaneGeometry(w, d), m); b.rotation.x = -Math.PI / 2; b.position.set(x, y, -z); return add(b); };
    const wall = (w, h, m, x, y, z, ry) => { const b = new T3.Mesh(new T3.PlaneGeometry(w, h), m); b.position.set(x, y + h / 2, -z); b.rotation.y = ry || 0; return add(b); };
    const light = (color, power, reach, x, y, z) => { const l = new T3.PointLight(color, power, reach, 1.5); l.position.set(x, y, -z); return add(l); };
    // ---- the room: a floor, the stage painting as the far wall (alive), darker copies of it round the sides ----
    const st = new RF.StageRenderer(stageDef), hz = o.hz || stageDef.horizon || stageDef.floorY, sc = o.scale || 1.3;
    const [wc, wx] = RF.util.makeCanvas(W, hz), [dc, dx] = RF.util.makeCanvas(W, hz), [full, fx] = RF.util.makeCanvas(W, H);
    const live = tex(wc), dim = tex(dc);
    const ww = W * sc, wh = hz * sc;
    wall(ww, wh, bas(0xffffff, { map: live }), 192, 0, ZW);
    for (const s of [-1, 1]) { const m = wall(ww, wh, bas(0xffffff, { map: dim }), 192 + s * ww, 0, ZW); m.scale.x = -1; m.material.side = T3.DoubleSide; }     // mirrored either side
    const top = bas(o.above || 0x05030a);
    wall(XR - XL + 400, 700, top, 192, wh, ZW + 0.5);                                                                                                           // the wall carries on up into the dark
    for (const [x, ry] of [[XL, Math.PI / 2], [XR, -Math.PI / 2]]) { const m = wall(ZW - ZF, wh, bas(0xffffff, { map: dim }), x, 0, (ZW + ZF) / 2, ry); m.material.map = dim; wall(ZW - ZF, 700, top, x + (x < 0 ? -0.5 : 0.5), wh, (ZW + ZF) / 2, ry); }
    wall(XR - XL, wh, bas(0xffffff, { map: dim }), 192, 0, ZF, Math.PI); wall(XR - XL, 700, top, 192, wh, ZF - 0.5, Math.PI);
    const refresh = (t) => {
      st.draw(fx, t);
      wx.drawImage(full, 0, 0, W, hz, 0, 0, W, hz); live.needsUpdate = true;
      if (t % 4 === 0 || !refresh.done) { dx.drawImage(wc, 0, 0); dx.fillStyle = 'rgba(0,0,6,0.55)'; dx.fillRect(0, 0, W, hz); dim.needsUpdate = true; refresh.done = true; }
    };
    return { T3, scene, lam, bas, add, box, cyl, flat, wall, light, tex, paint, refresh, wh, ww, sc };
  }
  // a floor of square tiles with lines of light between them, and a carpet / a strip of light down the middle
  const tiles = (a, b, line, strip) => paint(522, 272, (x, w, h) => {
    for (let i = 0; i < w; i += 16) for (let j = 0; j < h; j += 16) { x.fillStyle = ((i + j) / 16) % 2 ? a : b; x.fillRect(i, j, 16, 16); }
    x.fillStyle = line; for (let i = 0; i <= w; i += 16) x.fillRect(i, 0, 1, h); for (let j = 0; j <= h; j += 16) x.fillRect(0, j, w, 1);
    if (strip) strip(x, w, h);
  });
  const motes = (k, n, color, size) => {
    const g = new T3.BufferGeometry(), p = new Float32Array(n * 3), r = RF.util.rng(n * 13 + 5);
    for (let i = 0; i < n; i++) { p[i * 3] = XL + r() * (XR - XL); p[i * 3 + 1] = 6 + r() * 230; p[i * 3 + 2] = -(ZF + r() * (ZW - ZF)); }
    g.setAttribute('position', new T3.BufferAttribute(p, 3));
    return k.add(new T3.Points(g, new T3.PointsMaterial({ color, size: size || 2.2, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false })));
  };

  // ================================================================== THE THRONE BETWEEN
  GL.sets.throne = function (k) {
    const { scene, lam, bas, box, cyl, flat, light } = k;
    scene.background = new T3.Color(0x030208); scene.fog = new T3.Fog(0x07030f, 240, 1250);
    scene.add(new T3.AmbientLight(0x5a4880, 1.0));
    const key = light(0xb48cff, 1.7, 760, 192, 200, 10), seat = light(0xff3348, 1.3, 240, 192, 110, 62); light(0x7050d0, 1.0, 900, 192, 240, -260);
    flat(XR - XL, ZW - ZF, lam(0xffffff, { map: tex(tiles('#0e0919', '#090512', 'rgba(150,90,255,0.42)', (x, w, h) => {
      x.fillStyle = '#4a0c18'; x.fillRect(240, 0, 42, h); x.fillStyle = '#7a1424'; x.fillRect(243, 0, 36, h); x.fillStyle = '#c8a030'; x.fillRect(240, 0, 2, h); x.fillRect(280, 0, 2, h);   // the carpet: world x 150..234
    })) }), 192, 0, (ZW + ZF) / 2);
    // the dais: three steps, and the chair he built out of school desks
    const stone = lam(0x241a3c), trim = lam(0x8a6ac8), dark = lam(0x0e0a18);
    for (let i = 0; i < 3; i++) { box(128 - i * 20, 16, 44 - i * 6, stone, 192, i * 16, 76 + i * 3); box(128 - i * 20, 1.5, 1.5, trim, 192, i * 16 + 15, 54 + i * 6 - 0.4); }
    box(46, 22, 26, lam(0x5a1020), 192, 48, 81);                                                                              // the seat: its top is 70 up, where he sits
    const desk = tex(paint(64, 128, (x) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#241a3a' : '#1c1430'; x.fillRect(0, i * 11, 64, 10); x.fillStyle = '#0a0612'; x.fillRect(4 + (i * 17) % 40, i * 11 + 2, 16, 5); x.fillStyle = '#3a2a5a'; x.fillRect(0, i * 11 + 10, 64, 1); } }));
    box(76, 132, 5, lam(0xffffff, { map: desk }), 192, 48, 94);
    for (const [sx, h] of [[160, 26], [176, 40], [192, 56], [208, 40], [224, 26]]) cyl(0.5, 6, h, dark, sx, 180, 94, 4);       // the spikes
    box(9, 20, 24, dark, 165, 70, 80); box(9, 20, 24, dark, 219, 70, 80);                                                      // the arms
    // lockers, stacked into pillars: four by the throne, and a colonnade down each side of the hall
    const lock = tex(paint(32, 128, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#201834' : '#191228'; x.fillRect(0, i * 16, 32, 16); x.fillStyle = '#05030a'; x.fillRect(0, i * 16, 32, 1); x.fillRect(15, i * 16, 1, 16); x.fillStyle = '#0a0612'; x.fillRect(4, i * 16 + 3, 8, 2); x.fillRect(20, i * 16 + 3, 8, 2); x.fillStyle = '#5a4a8a'; x.fillRect(12, i * 16 + 8, 2, 2); x.fillRect(28, i * 16 + 8, 2, 2); } })), lm = lam(0xffffff, { map: lock });
    for (const [px, lean] of [[30, 0.05], [100, -0.04], [284, 0.04], [354, -0.05]]) box(20, 170, 20, lm, px, 0, 86).rotation.z = lean;
    for (const px of [-120, 504]) for (let i = 0; i < 6; i++) { const b = box(30, 230, 30, lm, px, 0, 40 - i * 92); b.rotation.z = (i % 2 ? 0.035 : -0.03); b.rotation.y = i * 0.4; }
    // the bell above him: cracked, swinging, never quite still
    const bell = new T3.Group(); bell.position.set(192, 262, -82); scene.add(bell);
    const bm = new T3.Mesh(new T3.CylinderGeometry(8, 24, 34, 12, 1, true), lam(0xc08a30, { side: T3.DoubleSide, emissive: 0x3a2408 })); bm.position.y = -26; bell.add(bm);
    const rope = new T3.Mesh(new T3.BoxGeometry(2, 30, 2), dark); rope.position.y = 4; bell.add(rope);
    const clap = new T3.Mesh(new T3.BoxGeometry(5, 8, 5), dark); clap.position.y = -44; bell.add(clap);
    // desks and clocks, drifting in the dark
    const drift = [];
    for (let i = 0; i < 9; i++) { const m = i % 2 ? new T3.Mesh(new T3.BoxGeometry(22, 3, 12), lam(0x2a2040)) : new T3.Mesh(new T3.CylinderGeometry(8, 8, 2, 10), lam(0x8a80a8, { emissive: 0x14101e })); m.userData = { x: XL + 80 + i * 118, y: 150 + (i * 37) % 80, z: -60 - (i * 83) % 330, s: 0.4 + (i % 3) * 0.2 }; if (!(i % 2)) m.rotation.x = Math.PI / 2; scene.add(m); drift.push(m); }
    const dust = motes(k, 260, 0xb090ff);
    return { update(t) {
      bell.rotation.z = Math.sin(t / 46) * 0.13;
      key.intensity = 1.6 + Math.sin(t / 37) * 0.15 + (t % 520 < 30 ? Math.sin((t % 520) / 30 * Math.PI) * 1.2 : 0);   // every so often the whole room breathes violet
      seat.intensity = 1.2 + Math.sin(t / 23) * 0.2;
      for (const m of drift) { const u = m.userData; m.position.set(u.x + Math.sin(t / 240 + u.z) * 30, u.y + Math.sin(t / 90 + u.x) * 8, -u.z); m.rotation.y = t / 200 * u.s; }
      dust.rotation.y = Math.sin(t / 900) * 0.05; dust.position.y = Math.sin(t / 130) * 5;
    } };
  };

  // ================================================================== THE KEEPER'S POST
  GL.sets.post = function (k) {
    const { scene, lam, bas, box, flat, light, wall } = k;
    scene.background = new T3.Color(0x01040a); scene.fog = new T3.Fog(0x020812, 260, 1300);
    scene.add(new T3.AmbientLight(0x35607a, 1.05));
    const door = light(0xfff0c0, 1.9, 520, 192, 80, 80), lamp = light(0xffd890, 1.1, 150, 134, 44, 50); light(0x40a0d0, 0.9, 900, 192, 220, -240);
    flat(XR - XL, ZW - ZF, lam(0xffffff, { map: tex(tiles('#06111b', '#040c14', 'rgba(140,220,255,0.34)', (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,246,208,0.55)'); g.addColorStop(0.6, 'rgba(255,246,208,0.08)'); g.addColorStop(1, 'rgba(255,246,208,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(258, 0); x.lineTo(264, 0); x.lineTo(300, h); x.lineTo(222, h); x.fill();                                    // light from under the door
    })) }), 192, 0, (ZW + ZF) / 2);
    // the desk: a slab of counter with a lit edge, the sign-in book, the lamp
    const desk = lam(0x16293a), edge = bas(0x8fe6ff);
    box(96, 26, 16, desk, 126, 0, 46); box(98, 2, 18, lam(0x24465e), 126, 26, 46); box(96, 1, 0.6, edge, 126, 18, 37.6);
    box(20, 2, 12, lam(0xe8ecf0), 104, 28, 46); box(2, 16, 2, lam(0x0a1620), 142, 28, 48); box(12, 3, 6, lam(0x0a1620), 138, 44, 48);
    box(46, 14, 12, desk, 258, 0, 50); for (let i = 0; i < 5; i++) box(6, 1.2, 8, bas(i % 2 ? 0xc02020 : 0xe8ecf0), 242 + i * 8, 14, 50);                   // a tray of visitor passes
    // THE DOOR, standing out from the wall: two leaves, a frame, and the line of light between them
    const leaf = lam(0x1a2c40), frame = lam(0x0a121c);
    box(34, 168, 6, leaf, 173, 0, 92); box(34, 168, 6, leaf, 211, 0, 92); box(8, 176, 10, frame, 150, 0, 91); box(8, 176, 10, frame, 234, 0, 91); box(92, 10, 10, frame, 192, 170, 91);
    const gap = wall(3, 168, bas(0xfff6d0), 192, 0, 88.5), halo = wall(34, 168, bas(0xffd75a, { transparent: true, opacity: 0.2, depthWrite: false }), 192, 0, 88);
    const exit = wall(34, 9, bas(0xffffff, { map: tex(paint(34, 9, (x) => { x.fillStyle = '#020408'; x.fillRect(0, 0, 34, 9); RF.font.drawText(x, 'EXIT', 17, 1, { align: 'center', color: '#60ff90' }); })) }), 192, 183, 85.5);
    // banks of screens down both sides of the lobby: other universes he is also watching
    const bank = tex(paint(128, 64, (x) => {
      x.fillStyle = '#02060c'; x.fillRect(0, 0, 128, 64);
      const SK = [['#4a90e0', '#bfe4ff'], ['#ff4fb0', '#ffb040'], ['#02030a', '#141a2e'], ['#3a0806', '#ff7a10'], ['#0a3a2a', '#8fe0a0'], ['#2a1a4a', '#c080ff']];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const i = r * 4 + c, g = x.createLinearGradient(0, 2 + r * 21, 0, 20 + r * 21); g.addColorStop(0, SK[(i * 5) % 6][0]); g.addColorStop(1, SK[(i * 5) % 6][1]); x.fillStyle = g; x.fillRect(2 + c * 32, 2 + r * 21, 28, 17); x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(8 + c * 32, 11 + r * 21, 16, 8); x.fillRect(14 + c * 32, 7 + r * 21, 4, 5); x.fillStyle = '#ffd870'; x.fillRect(11 + c * 32, 13 + r * 21, 2, 2); x.fillRect(18 + c * 32, 15 + r * 21, 2, 2); }
    }));
    const banks = [];
    for (const [x, ry] of [[-110, 0.5], [494, -0.5]]) for (let i = 0; i < 5; i++) { const m = wall(150, 76, bas(0xffffff, { map: bank }), x + (x < 0 ? -i * 46 : i * 46), 40 + (i % 2) * 16, 30 - i * 100, ry); banks.push(m); box(150, 40 + (i % 2) * 16, 8, frame, m.position.x, 0, 30 - i * 100 + 5).rotation.y = ry; }
    const dust = motes(k, 200, 0x8fe6ff, 1.8);
    return { update(t) {
      const a = 0.72 + Math.sin(t / 36) * 0.22; gap.material.color.setRGB(a, a * 0.96, a * 0.82); halo.material.opacity = 0.14 + a * 0.12; door.intensity = 1.5 + a * 0.6;
      lamp.intensity = 1.0 + Math.sin(t / 11) * 0.04;
      exit.material.color.setScalar(t % 120 < 100 ? 1 : 0.3);
      for (let i = 0; i < banks.length; i++) banks[i].material.color.setScalar(0.8 + 0.2 * Math.sin(t / 9 + i * 1.7));
      dust.position.y = Math.sin(t / 110) * 6;
    } };
  };

  // ================================================================== THE BENCH ABOVE EVERYTHING
  GL.sets.tribunal = function (k) {
    const { scene, lam, bas, box, cyl, flat, light } = k;
    scene.background = new T3.Color(0x04030a); scene.fog = new T3.Fog(0x0c0a18, 320, 1500);
    scene.add(new T3.AmbientLight(0x8a84a0, 1.0));
    const sun = light(0xfff0c0, 1.8, 800, 192, 190, 40); light(0xffe0a0, 1.0, 900, 192, 260, -280); light(0x8080ff, 0.5, 600, -200, 120, -100);
    flat(XR - XL, ZW - ZF, lam(0xffffff, { map: tex(tiles('#d8d2c2', '#c4bdac', 'rgba(170,130,30,0.5)', (x, w, h) => {
      x.fillStyle = 'rgba(200,160,40,0.5)'; x.fillRect(246, 0, 30, h); x.fillStyle = '#c8a030'; x.fillRect(246, 0, 2, h); x.fillRect(274, 0, 2, h);       // a gold road to the bench
    })) }), 192, 0, (ZW + ZF) / 2);
    // the bench: three steps up, and then a long way up. Its top is where the Judge sits.
    const marble = lam(0xf2eee2), gold = lam(0xd8aa30, { emissive: 0x3a2a04 }), shade = lam(0xb8b0a0);
    for (let i = 0; i < 3; i++) { box(124 - i * 22, 7, 52 - i * 6, marble, 192, i * 7, 72 + i * 3); box(124 - i * 22, 1.4, 1.4, gold, 192, i * 7 + 6, 46 + i * 6 - 0.4); }
    box(84, 37, 30, marble, 192, 21, 77); box(88, 3, 34, gold, 192, 58, 77); box(64, 20, 1, gold, 192, 30, 61.6);
    box(60, 16, 0.6, new T3.MeshBasicMaterial({ map: tex(paint(60, 16, (x) => { x.fillStyle = '#e8b420'; x.fillRect(0, 0, 60, 16); RF.font.drawText(x, 'ORDER', 30, 4, { align: 'center', color: '#3a2408' }); })) }), 192, 32, 61);
    box(124, 112, 5, marble, 192, 0, 95); box(128, 4, 7, gold, 192, 112, 95); box(4, 112, 6, gold, 132, 0, 94.6); box(4, 112, 6, gold, 252, 0, 94.6);       // its high back (and what hides the painted bench behind it)
    // columns: a pair by the bench, and a colonnade down each side
    const flute = tex(paint(32, 64, (x) => { const g = x.createLinearGradient(0, 0, 32, 0); g.addColorStop(0, '#9a94a4'); g.addColorStop(0.45, '#f4f0e6'); g.addColorStop(1, '#8a8494'); x.fillStyle = g; x.fillRect(0, 0, 32, 64); x.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 3; i < 32; i += 5) x.fillRect(i, 0, 1, 64); }), [3, 1]);
    const col = lam(0xffffff, { map: flute });
    const column = (x, z, h) => { cyl(9, 10, h, col, x, 0, z, 12); box(26, 6, 26, marble, x, 0, z); box(26, 7, 26, marble, x, h, z); box(28, 2, 28, gold, x, h - 2, z); };
    column(128, 84, 230); column(256, 84, 230);
    for (const x of [-116, 500]) for (let i = 0; i < 6; i++) column(x, 30 - i * 92, 250);
    // the ring behind the bench, turning, and the scales in front of it
    const ring = new T3.Mesh(new T3.TorusGeometry(40, 3.2, 8, 40), gold); ring.position.set(192, 132, -92); scene.add(ring);
    const rays = new T3.Group(); rays.position.set(192, 132, -93); scene.add(rays);
    for (let i = 0; i < 12; i++) { const r = new T3.Mesh(new T3.PlaneGeometry(4, 190), bas(0xfff6d0, { transparent: true, opacity: 0.13, depthWrite: false, side: T3.DoubleSide })); r.rotation.z = i * Math.PI / 6; r.position.set(Math.sin(-i * Math.PI / 6) * 95, Math.cos(i * Math.PI / 6) * 95, 0); rays.add(r); }
    const beam = new T3.Group(); beam.position.set(192, 148, -86); scene.add(beam);
    beam.add(new T3.Mesh(new T3.BoxGeometry(56, 2, 2), gold));
    const pans = [-27, 27].map((px) => { const g = new T3.Group(); g.position.x = px; const s = new T3.Mesh(new T3.BoxGeometry(1, 16, 1), gold); s.position.y = -8; const p = new T3.Mesh(new T3.CylinderGeometry(8, 5, 2, 10), gold); p.position.y = -17; g.add(s); g.add(p); beam.add(g); return g; });
    box(2, 30, 2, gold, 192, 118, 86);
    // the galleries: tiers down both sides, with the school in them
    const tier = tex(paint(128, 32, (x) => { x.fillStyle = '#0c0a16'; x.fillRect(0, 0, 128, 32); x.fillStyle = '#2a2238'; x.fillRect(0, 12, 128, 2); for (let i = 0; i < 12; i++) { x.fillStyle = ['#3a3048', '#4a3a40', '#30384a', '#463a52'][i % 4]; x.fillRect(3 + i * 10.5, 5, 7, 8); x.fillStyle = ['#c8a080', '#8a5a3a', '#e0c0a0', '#6a4428'][(i * 3) % 4]; x.fillRect(4 + i * 10.5, 0, 5, 5); } }), [4, 1]);
    for (const [x, ry] of [[-200, Math.PI / 2], [584, -Math.PI / 2]]) for (let r = 0; r < 3; r++) { const w = k.wall(520, 26, bas(0xffffff, { map: tier }), x + (x < 0 ? -r * 26 : r * 26), 14 + r * 24, -190, ry); box(26, 14 + r * 24, 520, shade, x + (x < 0 ? -r * 26 - 13 : r * 26 + 13), 0, -190); w.renderOrder = 1; }
    const dust = motes(k, 240, 0xfff0c0, 2);
    return { update(t) {
      ring.rotation.z = t / 260; rays.rotation.z = -t / 400; sun.intensity = 1.7 + Math.sin(t / 40) * 0.15;
      const sw = Math.sin(t / 70) * 0.09; beam.rotation.z = sw; for (const p of pans) p.rotation.z = -sw;
      dust.position.y = (t * 0.12) % 40 - 20;
    } };
  };

  // ---------------------------------------------------------------- actors: baked pictures on billboards
  const baked = new Map();   // key -> { tex, used }
  let bakeN = 0;
  function bake(key, drawIt) {
    let e = baked.get(key);
    if (!e) {
      const [c, x] = RF.util.makeCanvas(BW, BH);
      RF.hoverShadow = false; try { drawIt(x); } finally { RF.hoverShadow = true; }
      e = { tex: tex(c) }; baked.set(key, e);
      if (++bakeN % 60 === 0 && baked.size > 520) { const old = [...baked.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, 200); for (const [kk, v] of old) { v.tex.dispose(); baked.delete(kk); } }
    }
    e.used = bakeN;
    return e.tex;
  }
  const ids = new WeakMap(); let idN = 0;
  const idOf = (o) => { let i = ids.get(o); if (!i) { i = ++idN; ids.set(o, i); } return i; };
  const crowdTex = new WeakMap();   // one of the army's ready-made pictures -> a texture and a material that every soldier using it shares
  function crowdMat(canvas, face) {
    let m = crowdTex.get(canvas);
    if (!m) {   // (a billboard cannot be flipped by its size: the picture is, for the ones facing the other way)
      const a = tex(canvas), b = tex(canvas); b.repeat.x = -1; b.offset.x = 1;
      m = { r: new T3.SpriteMaterial({ map: a, alphaTest: 0.5 }), l: new T3.SpriteMaterial({ map: b, alphaTest: 0.5 }) }; crowdTex.set(canvas, m);
    }
    return face < 0 ? m.l : m.r;
  }

  // ---------------------------------------------------------------- one frame
  const stages = {};   // stage id -> { scene, set, kit, people: Map(actor -> sprite), crowd: [] }
  function stageFor(def) {
    let s = stages[def.id];
    if (!s) {
      const scene = new T3.Scene(), kit = makeKit(scene, def, { hz: def.horizon || 140 });
      s = stages[def.id] = { scene, kit, set: GL.sets[def.id](kit), people: new Map(), crowd: [], shadowG: new T3.CircleGeometry(15, 12), shadowM: new T3.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.38, depthWrite: false }) };
    }
    return s;
  }
  const vec = { v: null };
  GL.draw = function (sc, ctx, sh, fy) {
    const def = sc.bgDef;
    if (!GL.on || !def || !GL.sets[def.id] || RF.CONFIG.STORY_3D === false) return false;
    if (!init()) return false;
    let S;
    try {
      const c3 = sc.cam3(sh);
      if (!c3) return true;   // (the subject has gone and was never seen: nothing to aim at)
      S = stageFor(def);
      const t = sc.frozenAll || sc.t, C = c3.C;
      S.kit.refresh(t); S.set.update(t);
      // ---- the camera: where the story says, looking at the point it says, with the lens it says ----
      const kx = sc.shake ? (Math.random() - 0.5) * sc.shake * 0.6 : 0, ky = sc.shake ? (Math.random() - 0.5) * sc.shake * 0.3 : 0;
      cam.fov = 2 * Math.atan((H / 2) / c3.F) * 180 / Math.PI; cam.updateProjectionMatrix();
      cam.position.set(C.x + kx, C.y + ky, -C.z); cam.up.set(0, 1, 0); cam.lookAt(c3.tx, c3.ty, -c3.tz);
      if (c3.roll) cam.rotateZ(c3.roll);
      cam.updateMatrixWorld(true);
      const inv = cam.matrixWorldInverse; if (!vec.v) vec.v = new T3.Vector3();
      const proj = (x, y, z) => { const v = vec.v.set(x, y, -z).applyMatrix4(inv), d = -v.z; if (d < 14) return null; const kk = c3.F / d; return { x: W / 2 + v.x * kk, y: H / 2 - v.y * kk, k: kk, rz: d }; };
      sc.view = { kind: '3d', proj };
      // ---- everyone ----
      const subP = c3.subs.map((a) => proj(a.x, 0, a.z || 0)).filter(Boolean), seen = new Set();
      for (const a of Object.values(sc.actors)) {
        if (a.stage) continue;
        seen.add(a);
        let e = S.people.get(a);
        if (!e) { e = { sp: new T3.Sprite(new T3.SpriteMaterial({ alphaTest: 0.4 })), sh: new T3.Mesh(S.shadowG, S.shadowM) }; e.sp.center.set(0.5, FOOT / BH); e.sh.rotation.x = -Math.PI / 2; S.scene.add(e.sp); S.scene.add(e.sh); S.people.set(a, e); }
        const p = proj(a.x, 0, a.z || 0);
        let clear = 1;   // nobody stands in front of the person the shot is about
        if (p && !c3.subs.includes(a) && a !== c3.over) for (const sp of subP) if (p.rz < sp.rz - 4) { const w = p.k + sp.k; clear = Math.min(clear, Math.max(0, (Math.abs(p.x - sp.x) - 15 * w) / (3 * w))); }
        const tt = a.frozen || sc.t; let anim = a.anim, frame = 0;
        if (a.wlen) { anim = a.dashing ? 'jump' : 'walk'; frame = a.dashing ? 0.5 : (a.wt / 5) % 4; }
        else if (a.zlen) { anim = 'walk'; frame = (a.zt / 5) % 4; }
        else if (a.ylen) { anim = 'jump'; frame = 0.3; }
        else if (anim === 'idle') frame = ((tt + a.seed) / (a.def.idleRate || 12)) % (a.def.idleFrames || 2);
        else if (anim === 'victory' || anim === 'taunt' || anim === 'dazed') frame = Math.floor((tt + a.seed) / 16) % 2;
        else if (anim === 'walk') frame = ((tt - (a.at || 0)) / 5) % 4;
        else frame = Math.min(1, (tt - (a.at || 0)) / 8);
        const fq = Math.round(frame * 3) / 3, face = c3.cy >= 0 ? a.facing : -a.facing, back = -c3.sn * a.facing > 0.5 && a.sprite.drawBack ? 1 : 0;
        const tint = a.hitT > 4 ? '#ffffff' : a.ghost ? '#2a2038' : (a.foldT && sc.t % 6 < 3) ? '#c080ff' : null;
        const alpha = clear * (a.foldT ? Math.max(0, 1 - a.foldT / 60) : a.appearT && a.appearT < 50 ? a.appearT / 50 : a.ghost ? 0.55 : 1);
        const m = e.sp.material;
        if (!m.map) m.needsUpdate = true;   // (its first picture: the material has to be told it has one)
        m.map = bake(idOf(a.sprite) + '|' + anim + '|' + fq + '|' + face + '|' + back + '|' + (tint || ''), (x) => (back ? a.sprite.drawBack : a.sprite.draw).call(a.sprite, x, anim, fq, BW / 2, BH - FOOT, face, tint));
        const near = p && p.rz < Math.max(74, c3.dist * 0.5), dimmed = near ? 0.36 : p && p.rz > c3.dist * 1.9 ? 0.74 : 1;
        m.color.setScalar(dimmed); m.opacity = alpha; m.transparent = alpha < 0.99; m.visible = alpha > 0.02;
        const s = a.scale || 1, bob = a.talk && anim === 'idle' && tt % 16 < 8 ? 1 : 0, jx = a.trembleT > 0 ? ((sc.t >> 1) % 2 ? 0.8 : -0.8) : 0;
        e.sp.scale.set(BW * s, BH * s, 1); e.sp.position.set(a.x + jx, (a.y || 0) + bob, -(a.z || 0));
        e.sh.position.set(a.x, 0.4, -(a.z || 0)); e.sh.visible = alpha > 0.3; e.sh.scale.setScalar(Math.max(0.5, 1 - (a.y || 0) / 300));
      }
      for (const [a, e] of S.people) if (!seen.has(a)) { S.scene.remove(e.sp); S.scene.remove(e.sh); e.sp.material.dispose(); S.people.delete(a); }
      // ---- the army ----
      const cr = sc.crowd && K.crowdFrame ? sc.crowd : null, list = cr ? cr.list : [];
      while (S.crowd.length < list.length) { const sp = new T3.Sprite(); sp.center.set(0.5, 2 / K.CROWD_H); S.scene.add(sp); S.crowd.push(sp); }
      for (let i = 0; i < S.crowd.length; i++) {
        const sp = S.crowd[i], c = list[i];
        if (!c) { sp.visible = false; continue; }
        const dx = c.x - C.x, dz = c.z - C.z, d = Math.hypot(dx, dz);
        const img = d > 96 ? K.crowdFrame(cr, c, sc.t, d > c3.dist * 1.9 ? 1 : 0) : null;   // (nobody right against the lens)
        if (!img) { sp.visible = false; continue; }
        const s = c.scale || 1;
        sp.visible = true; sp.material = crowdMat(img, c3.cy >= 0 ? c.facing : -c.facing);
        sp.scale.set(K.CROWD_W * s, K.CROWD_H * s, 1); sp.position.set(c.x, 0, -c.z);
      }
      // ---- the rift: painted fresh each frame onto a card that stands in the room, so people in front of it are in front of it ----
      const rf = sc.riftFx;
      if (rf) {
        if (!S.rift) { const m = RF.util.makeCanvas(160, 200); S.riftC = m; S.rift = new T3.Sprite(new T3.SpriteMaterial({ map: tex(m[0]), transparent: true, depthWrite: false })); S.scene.add(S.rift); }
        const kk = rf.closing ? Math.max(0, 1 - rf.closing / 2) : Math.min(1, rf.t / 16);
        S.riftC[1].clearRect(0, 0, 160, 200); K.drawRift(S.riftC[1], 80, 100, 1.5 * kk, sc.t); S.rift.material.map.needsUpdate = true;
        S.rift.visible = true; S.rift.scale.set(160 * rf.size / 1.5, 200 * rf.size / 1.5, 1); S.rift.position.set(rf.x, 50 * rf.size, -30);
      } else if (S.rift) S.rift.visible = false;
      R3.render(S.scene, cam);
    } catch (e) {
      if (!GL.warned) { GL.warned = true; console.warn('story-gl: falling back to the drawn sets', e); }
      GL.ok = false; return false;
    }
    // ---- onto the game's own picture, and the things that are drawn flat on top of it ----
    GL.used = true;
    ctx.drawImage(cv, 0, 0);
    const proj = sc.view.proj;
    if (sc.tintCol) { ctx.fillStyle = sc.tintCol; ctx.fillRect(0, 0, W, H); }
    for (const a of Object.values(sc.actors)) if (a.rift && !a.stage) { const p = proj(a.x, 0, a.z || 0); if (p) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k, p.k); RF.MOVE_FX.riftAura({ x: 0, y: a.y, body: a.def.body, state: 'idle' }, ctx, 0, sc.t); ctx.restore(); } }
    for (const f of sc.flies) { const art = RF.PROJECTILE_ART[f.art], p = proj(f.x, f.y, 0); if (art && p) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k, p.k); art(ctx, 0, 0, f.t, f.dir, { w: 14, h: 10, cfg: {} }, 0); ctx.restore(); } }
    for (const q of sc.shards) { const p = proj(q.x, q.y, 0); if (p) { ctx.globalAlpha = Math.min(1, q.life / 30); ctx.fillStyle = q.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(2 * p.k)), Math.max(1, Math.round(2 * p.k))); } }
    ctx.globalAlpha = 1;
    return true;
  };

  // start fetching three.js as soon as the story menu is opened
  const Menu = RF.StoryMenuScene;
  if (Menu) { const up = Menu.prototype.update; Menu.prototype.update = function () { GL.load(); return up.call(this); }; }
})();
