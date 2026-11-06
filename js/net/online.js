// ONLINE PLAY: two players on two computers, through the artifact's live "room".
//
// How it works (lockstep netcode):
//  - One player HOSTS and gets a 4-letter code; the other JOINS with it. Both
//    pages join the named room "tm-<code>" and find each other by presence.
//  - Both computers then run the SAME game. Every frame each side sends only its
//    button presses (a 12-bit mask), INPUT_DELAY frames ahead of time, in its room
//    presence. A frame is simulated once both sides' buttons for it are known, so
//    both games see exactly the same inputs and play out identically.
//  - Randomness inside the simulation uses a shared seed (Math.random is swapped
//    for a seeded generator while a frame is simulated), and the host's match
//    settings are copied to the guest, so nothing can drift apart. A checksum is
//    compared every second; a mismatch shows "OUT OF SYNC".
//  - The host is P1 (left), the guest is P2 (right). Your own keyboard or
//    controller (either set of keys) plays your side.
// Needs the published page (claude.use("room")); both players signed in to
// claude.ai with access to the artifact.
(function () {
  const ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'block', 'throw', 'taunt', 'dash', 'ex'];
  const PAUSE_BIT = 1 << ACTIONS.length;
  const INPUT_DELAY = 6;        // starting frames (~0.1 s) between pressing a button and it happening;
                                // it adapts to the connection (4-16) so slow links don't stutter
  const WINDOW = 24;            // frames of input history repeated in every presence update
  const VERSION = 'tm1-' + RF.CHARACTERS.length;
  // Settings that change gameplay (the host's win; volumes, announcer, rumble stay local).
  const SHARED = () => [...RF.SETTINGS.map((s) => s.id), ...(RF.MOD_SETTINGS || []).map((m) => m.id)]
    .filter((id) => !/VOLUME|ANNOUNCER|RUMBLE/.test(id));

  // ---- seeded random (mulberry32) ----
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- the keyboard the simulation sees: driven only by the two players' input masks ----
  class NetKeyboard {
    constructor(realKb, mySide) {
      this.real = realKb; this.mySide = mySide;
      this.down = new Set(); this.pressedAt = new Map(); this.frame = 0;
      this.gameKeys = new Set(); this.padDown = new Set(); this.pads = [];
      const C = RF.CONTROLS;
      this.codes = [ACTIONS.map((a) => C.p1[a][0]), ACTIONS.map((a) => C.p2[a][0])];
    }
    apply(masks) {
      const now = new Set();
      masks.forEach((m, side) => {
        ACTIONS.forEach((a, i) => { if (m & (1 << i)) now.add(this.codes[side][i]); });
        if (m & PAUSE_BIT) now.add('Escape');
      });
      for (const c of now) if (!this.down.has(c)) this.pressedAt.set(c, this.frame);
      this.down = now;
    }
    tick() { this.frame++; }
    pollPads() {}
    rumble(player, strength, ms) { if (player === this.mySide) this.real.rumble(0, strength, ms); }
    isDown(code) { return this.down.has(code); }
    lastPress(code) { return this.pressedAt.has(code) ? this.pressedAt.get(code) : -Infinity; }
    justPressed(...codes) { return codes.some((c) => this.lastPress(c) === this.frame); }
  }

  // ---- your own buttons, from either key set or the first controller ----
  function localMask(kb) {
    const C = RF.CONTROLS;
    let m = 0;
    ACTIONS.forEach((a, i) => { if ([...C.p1[a], ...C.p2[a]].some((c) => kb.isDown(c))) m |= 1 << i; });
    if (['Enter', 'Space', 'NumpadEnter'].some((c) => kb.isDown(c))) m |= 1 << ACTIONS.indexOf('light');
    if (kb.isDown('Escape')) m |= PAUSE_BIT;
    return m;
  }
  const enc = (arr) => arr.map((m) => m.toString(16).padStart(4, '0')).join('');
  const dec = (s) => { const out = []; for (let i = 0; i + 4 <= s.length; i += 4) out.push(parseInt(s.slice(i, i + 4), 16) || 0); return out; };

  // A small fingerprint of the simulation, to spot a desync.
  function checksum(game) {
    const sc = game.scene, fs = sc && sc.fighters;
    let h = (sc && sc.constructor && sc.constructor.name || '').length * 31;
    if (fs) for (const f of fs) h = (h * 33 + Math.round(f.x * 4) + Math.round(f.y * 4) * 7 + Math.round(f.health * 10) * 13) >>> 0;
    return h;
  }

  const online = {
    active: false, menuOpen: false, status: '', waiting: 0, desync: false,

    // ---------------- menu (DOM overlay: buttons + code box) ----------------
    openMenu(game) {
      this.game = game;
      this.menuOpen = true;
      if (!this.panel) this.buildPanel();
      this.panel.hidden = false;
      this.setStatus('Play a friend on another computer. One of you hosts, the other joins with the code.');
      this.codeBox.value = '';
      this.hostBtn.focus();
    },
    closeMenu() {
      this.menuOpen = false;
      if (this.panel) {
        const a = document.activeElement;
        if (a && this.panel.contains(a)) a.blur(); // so game keys stop going to the panel
        this.panel.hidden = true;
      }
      const c = document.getElementById('game'); if (c) c.focus();
    },
    buildPanel() {
      const p = document.createElement('div');
      p.id = 'online-panel';
      p.innerHTML = `
        <style>
          #online-panel { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(5,1,1,0.78); z-index: 10; font: 12px/1.5 ui-monospace, Menlo, Consolas, monospace; color: #e8d8c8; padding: 16px; box-sizing: border-box; }
          #online-panel .box { background: #140606; border: 2px solid #ff7a2a; padding: 18px; width: min(420px, 100%); box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; }
          #online-panel h2 { margin: 0; color: #ff7a2a; letter-spacing: 0.12em; font-size: 18px; }
          #online-panel .row { display: flex; gap: 8px; flex-wrap: wrap; }
          #online-panel button { font: inherit; background: #3a1208; color: #ffe0c0; border: 1px solid #ff7a2a; padding: 8px 12px; cursor: pointer; flex: 1; min-width: 120px; }
          #online-panel button:hover, #online-panel button:focus-visible { background: #6a2410; outline: none; }
          #online-panel input { font: inherit; font-size: 16px; text-transform: uppercase; letter-spacing: 0.3em; width: 7em; padding: 7px; background: #000; color: #ffd030; border: 1px solid #806050; }
          #online-panel .code { font-size: 28px; color: #ffd030; letter-spacing: 0.3em; }
          #online-panel .status { color: #c8a890; min-height: 3em; }
        </style>
        <div class="box" role="dialog" aria-label="Online play">
          <h2>ONLINE</h2>
          <div class="status"></div>
          <div class="code" hidden></div>
          <div class="row"><button type="button" data-a="host">HOST A MATCH</button></div>
          <div class="row"><input maxlength="4" placeholder="CODE" aria-label="Room code" autocomplete="off"><button type="button" data-a="join">JOIN</button></div>
          <div class="row"><button type="button" data-a="cancel">BACK</button></div>
        </div>`;
      document.body.appendChild(p);
      this.panel = p;
      this.statusEl = p.querySelector('.status');
      this.codeEl = p.querySelector('.code');
      this.codeBox = p.querySelector('input');
      this.hostBtn = p.querySelector('[data-a=host]');
      p.querySelector('[data-a=host]').onclick = () => this.host();
      p.querySelector('[data-a=join]').onclick = () => this.join(this.codeBox.value);
      p.querySelector('[data-a=cancel]').onclick = () => { this.leave(); this.closeMenu(); };
      this.codeBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.join(this.codeBox.value); });
      p.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.leave(); this.closeMenu(); } });
    },
    setStatus(t) { this.status = t; if (this.statusEl) this.statusEl.textContent = t; },

    async getRoom() {
      if (!window.claude || !window.claude.use) return null;
      try { return await window.claude.use('room'); } catch (e) { return null; }
    },

    async host() {
      const room = await this.getRoom();
      if (!room) return this.setStatus('Online play only works in the published game page on claude.ai (signed in).');
      const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
      this.codeEl.hidden = false; this.codeEl.textContent = code;
      this.setStatus('Room code below. Send it to your friend, then wait here...');
      const cfg = {}; for (const id of SHARED()) cfg[id] = RF.CONFIG[id];
      await this.enterRoom(room, code, { role: 'host', v: VERSION, seed: Math.floor(Math.random() * 2 ** 31), cfg });
    },

    async join(raw) {
      const code = String(raw || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
      if (code.length !== 4) return this.setStatus('Type the 4-letter code your friend got when they pressed HOST.');
      const room = await this.getRoom();
      if (!room) return this.setStatus('Online play only works in the published game page on claude.ai (signed in).');
      this.codeEl.hidden = true;
      this.setStatus('Joining ' + code + '...');
      await this.enterRoom(room, code, { role: 'guest', v: VERSION });
    },

    async enterRoom(room, code, hello) {
      await this.leave();
      let r;
      try { r = await room.join('tm-' + code.toLowerCase()); } catch (e) {
        return this.setStatus(e && e.code === 'not_permitted' ? 'Online rooms are not available to this account.' : 'Could not reach the room. Try again in a moment.');
      }
      this.room = r; this.hello = hello; this.code = code;
      try { await r.presence(hello); } catch (e) { /* retried by the platform */ }
      this.unsub = r.onPeers((ch) => this.onPeers(ch));
      if (hello.role === 'guest') this.joinTimer = setTimeout(() => { if (!this.active) this.setStatus('No host in room ' + code + ' yet. Check the code (or ask them to press HOST).'); }, 6000);
    },

    onPeers(ch) {
      const want = this.hello.role === 'host' ? 'guest' : 'host';
      if (this.active) {
        const other = ch.peers.find((p) => p.peer === this.peer);
        // Gone from the room: allow a few seconds for a reconnect before calling it.
        this.missingSince = other ? 0 : (this.missingSince || Date.now());
        if (other) this.readRemote(other.presence);
        return;
      }
      const other = ch.peers.find((p) => !p.sameTab && p.presence && p.presence.role === want);
      if (!other) return;
      if (other.presence.v !== VERSION) return this.setStatus('Your friend has a different version of the game. Both of you reload the page and try again.');
      this.peer = other.peer;
      const seed = this.hello.role === 'host' ? this.hello.seed : other.presence.seed;
      const cfg = this.hello.role === 'host' ? null : other.presence.cfg;
      this.start(this.hello.role === 'host' ? 0 : 1, seed, cfg);
      this.readRemote(other.presence);
    },

    // ---------------- the lockstep match ----------------
    start(side, seed, cfg) {
      clearTimeout(this.joinTimer);
      const game = this.game;
      this.side = side;
      this.rand = seeded(seed);
      this.mine = new Map(); this.theirs = new Map();
      for (let f = 0; f < INPUT_DELAY; f++) { this.mine.set(f, 0); this.theirs.set(f, 0); }
      this.produced = INPUT_DELAY - 1; this.F = 0; this.waiting = 0; this.desync = false; this.sums = new Map(); this.missingSince = 0;
      this.delay = INPUT_DELAY; this.stalls = 0; this.ticks = 0; this.calm = 0;
      if (cfg) { this.savedCfg = {}; for (const k in cfg) { this.savedCfg[k] = RF.CONFIG[k]; RF.CONFIG[k] = cfg[k]; } }
      this.realKb = game.kb;
      this.netKb = new NetKeyboard(this.realKb, side);
      game.kb = this.netKb;
      this.active = true;
      this.closeMenu();
      game.toast = { text: 'ONLINE - YOU ARE ' + (side ? 'P2 (RIGHT)' : 'P1 (LEFT)'), t: 300 };
      const native = Math.random; Math.random = this.rand; // build it exactly the same on both computers
      try { game.setScene(new RF.SelectScene(game)); } finally { Math.random = native; }
    },

    readRemote(pr) {
      if (!pr || typeof pr.f !== 'number' || typeof pr.b !== 'string') return;
      const masks = dec(pr.b);
      masks.forEach((m, i) => { const f = pr.f - masks.length + 1 + i; if (f >= 0 && !this.theirs.has(f)) this.theirs.set(f, m); });
      if (Array.isArray(pr.cs)) { // checksum from them: compare with ours for the same frame
        const mine = this.sums.get(pr.cs[0]);
        if (mine !== undefined && mine !== pr.cs[1]) this.desync = true;
      }
    },

    // One tick of the fixed 60 Hz loop while online (replaces game.step()).
    tick() {
      const game = this.game, real = this.realKb;
      if (this.missingSince && Date.now() - this.missingSince > 3000) return this.end('YOUR OPPONENT LEFT THE MATCH.');
      real.pollPads();
      if (real.justPressed('KeyM')) game.toast = { text: RF.audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON', t: 90 };
      if (game.toast && --game.toast.t <= 0) game.toast = null;
      if (game.achievement && --game.achievement.t <= 0) game.achievement = null;
      // My buttons for a frame INPUT_DELAY ahead.
      const m = localMask(real);
      for (let k = 0; k < 2 && this.produced < this.F + this.delay; k++) { this.produced++; this.mine.set(this.produced, m); }
      real.tick();
      // Simulate every frame both sides have (up to 3 per tick to catch up).
      let ran = 0;
      while (ran < 3 && this.mine.has(this.F) && this.theirs.has(this.F)) {
        const masks = this.side === 0 ? [this.mine.get(this.F), this.theirs.get(this.F)] : [this.theirs.get(this.F), this.mine.get(this.F)];
        this.simulate(masks);
        this.mine.delete(this.F - WINDOW * 2); this.theirs.delete(this.F - WINDOW * 2);
        this.F++; ran++;
      }
      this.waiting = ran ? 0 : this.waiting + 1;
      // Adapt the input delay: stalling a lot -> buffer more; smooth for a while -> buffer less.
      if (!ran) this.stalls++;
      if (++this.ticks >= 60) {
        if (this.stalls > 8 && this.delay < 16) { this.delay += 2; this.calm = 0; }
        else if (this.stalls === 0 && ++this.calm >= 5 && this.delay > 4) { this.delay--; this.calm = 0; }
        this.ticks = 0; this.stalls = 0;
      }
      // Tell them my latest buttons (plus a checksum once a second).
      const from = Math.max(0, this.produced - WINDOW + 1), arr = [];
      for (let f = from; f <= this.produced; f++) arr.push(this.mine.get(f) || 0);
      const patch = { f: this.produced, b: enc(arr) };
      const csF = this.F - (this.F % 60) - 60;
      if (csF >= 0 && this.sums.has(csF)) patch.cs = [csF, this.sums.get(csF)];
      if (this.room) this.room.presence(patch).catch(() => {});
    },

    simulate(masks) {
      const game = this.game, kb = this.netKb, native = Math.random;
      kb.apply(masks);
      Math.random = this.rand; // the same random numbers on both computers
      try { game.scene.update(); } finally { Math.random = native; }
      kb.tick();
      if (this.F % 60 === 0) { this.sums.set(this.F, checksum(game)); this.sums.delete(this.F - 600); }
    },

    // Drawn on top of the game while online.
    drawOverlay(ctx) {
      if (!this.active) return;
      const W = RF.CONFIG.WIDTH, T = (...a) => RF.font.drawText(...a);
      T(ctx, 'ONLINE ' + (this.side ? 'P2' : 'P1') + ' - ' + this.code, 4, RF.CONFIG.HEIGHT - 10, { color: '#60e0ff', outline: '#000' });
      if (this.waiting > 20) T(ctx, 'WAITING FOR OPPONENT...', W / 2, 100, { align: 'center', color: '#ffd030', outline: '#000' });
      if (this.desync) T(ctx, 'OUT OF SYNC - LEAVE AND RECONNECT', W / 2, 112, { align: 'center', color: '#ff5050', outline: '#000' });
    },

    end(message) {
      const game = this.game;
      if (this.active) {
        game.kb = this.realKb;
        if (this.savedCfg) { Object.assign(RF.CONFIG, this.savedCfg); this.savedCfg = null; }
        this.active = false;
        game.setScene(new RF.TitleScene(game));
        game.toast = { text: message || 'LEFT ONLINE MATCH', t: 240 };
      }
      this.leave();
    },

    async leave() {
      clearTimeout(this.joinTimer);
      if (this.unsub) { this.unsub(); this.unsub = null; }
      const r = this.room; this.room = null; this.peer = null;
      if (r) { try { await r.leave(); } catch (e) { /* already gone */ } }
    },
  };

  RF.online = online;
})();
