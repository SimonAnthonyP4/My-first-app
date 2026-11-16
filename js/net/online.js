// ONLINE PLAY: up to eight people on their own computers, through the artifact's live "room".
//
// What you get:
//   - One player HOSTS and gets a 4-letter code; everyone else JOINS with it. Everyone lands in the same
//     LOBBY, drawn by the game. The host picks the mode and the rules and presses START.
//   - Four modes:  VERSUS        the first two in the room fight; everyone else watches, live
//                  WINNER STAYS  the whole room: the loser goes to the back of the line
//                  TAG TEAM      two fighters each
//                  CO-OP         two of you are ONE tag team against the CPU: whoever's fighter is in the
//                                ring is the one playing. The CPU gets harder as you keep winning.
//     Rules: STANDARD, or CHAOS (a different party rule every match).
//   - Number keys 1-6 send a quick word (GG, NICE!, ...). Hold ESC for two seconds to leave.
//
// How it works (lockstep netcode):
//   - Every computer runs the SAME game. Each one sends only its own button presses (a 12-bit mask per
//     frame, a few frames ahead of time, with its last two seconds repeated in every update so a dropped
//     update, or a short break in the connection, loses nothing). A frame is simulated once the buttons of whoever is "seated" for it are
//     known, so every screen plays out identically. People who are not seated simply watch.
//   - Randomness inside the simulation comes from a shared seed, and the host's settings are copied to
//     everyone. Everything travels as room PRESENCE (which anyone in the room may set), so nobody needs
//     edit rights on the artifact.
//   - The LOBBY is where everyone gets back in step. Each time the session reaches it the host starts a
//     new EPOCH: a frame number, a fresh seed and the whole session state (who is here, the score, the
//     line). Whoever joined late, fell behind in a background tab or drifted out of sync picks the game
//     up again from that. A checksum is compared once a second; if a seated player's does not match the
//     host's, the host takes everyone back to the lobby instead of letting the match go on wrong.
//   - If a seated player leaves or stops answering for eight seconds, the other one wins by forfeit. If
//     the host leaves, the session ends.
// Needs the published page (claude.use("room")) and everyone signed in to claude.ai with access to it.
(function () {
  const ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'block', 'throw', 'taunt', 'dash', 'ex'];
  const PAUSE_BIT = 1 << ACTIONS.length;
  const INPUT_DELAY = 6;        // starting frames (~0.1 s) between pressing a button and it happening;
                                // it adapts to the connection (4-16) so slow links don't stutter
  const WINDOW = 120;           // frames of input history repeated in every presence update (two seconds:
                                // the room's connection is refreshed now and then, and that can take a moment)
  const MAX_PLAYERS = 8;
  const AWAY = 180;             // ticks (3 s) out of the room before the lobby takes somebody off the list
  const VERSION = 'tm2-' + RF.CHARACTERS.length + '-' + RF.STAGES.length;
  const NAME_KEY = 'terramania-online-name';
  // Settings that change gameplay (the host's win; sound, touch layout and debug views stay your own).
  const SHARED = () => [...RF.SETTINGS.map((s) => s.id), ...(RF.MOD_SETTINGS || []).map((m) => m.id)]
    .filter((id) => !/VOLUME|ANNOUNCER|RUMBLE|^TOUCH_|SHOW_HITBOXES/.test(id));
  const MODES = [
    { id: 'versus', name: 'VERSUS', desc: 'THE FIRST TWO IN THE ROOM FIGHT. EVERYONE ELSE WATCHES.' },
    { id: 'stays', name: 'WINNER STAYS', desc: 'THE WHOLE ROOM. THE LOSER GOES TO THE BACK OF THE LINE.' },
    { id: 'tag', name: 'TAG TEAM', desc: 'TWO FIGHTERS EACH. TAUNT TAGS YOUR PARTNER IN.' },
    { id: 'coop', name: 'CO-OP VS CPU', desc: 'TWO OF YOU, ONE TEAM. WHOEVER IS IN THE RING IS PLAYING.' },
  ];
  const RULES = [
    { id: 'standard', name: 'STANDARD', desc: "THE HOST'S SETTINGS, NOTHING ELSE." },
    { id: 'chaos', name: 'CHAOS', desc: 'A DIFFERENT PARTY RULE EVERY MATCH.' },
  ];
  const CHAOS = [
    ['LOW GRAVITY', { MOD_LOWGRAV: true }], ['TURBO', { MOD_TURBO: true }], ['GLASS JAWS', { MOD_TRIPLE: true }],
    ['PROTEIN MODE', { MOD_PROTEIN: true }], ['CARE PACKAGE', { MOD_ITEMS: true }], ['BIG HEADS', { MOD_BIGHEAD: true }],
  ];
  const EMOTES = ['GG', 'NICE!', 'LOL', 'OOF', 'REMATCH?', "LET'S GO!"];
  const COLORS = ['#ff5a4a', '#5aa8ff', '#6ae06a', '#ffd030', '#ff8aff', '#60e0e0', '#ffa040', '#c0c0ff'];
  const T = (...a) => RF.font.drawText(...a);
  const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cleanName = (s, fallback) => (String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || fallback || 'P?');

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

  // ---- the keyboard the simulation sees: driven only by the two seated players' input masks ----
  class NetKeyboard {
    constructor(realKb, net) {
      this.real = realKb; this.net = net;
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
    rumble(player, strength, ms) { if (player === this.net.mySide()) this.real.rumble(0, strength, ms); }
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
  // Buttons change a few times a second, not sixty: the history travels as runs, "mask*howMany" (base 36).
  const enc = (arr) => {
    const out = [];
    for (let i = 0; i < arr.length;) { let j = i + 1; while (j < arr.length && arr[j] === arr[i]) j++; out.push(arr[i].toString(36) + (j - i > 1 ? '*' + (j - i).toString(36) : '')); i = j; }
    return out.join('.');
  };
  const dec = (s) => {   // (anything that does not read cleanly is thrown away whole: half a history would land on the wrong frames)
    const out = [];
    if (typeof s !== 'string' || !s || s.length > 2000) return out;
    for (const tok of s.split('.')) {
      const [m, c] = tok.split('*'), mask = parseInt(m, 36), n = c === undefined ? 1 : parseInt(c, 36);
      if (!(mask >= 0 && mask < 65536) || !(n >= 1) || out.length + n > WINDOW * 2) return [];
      for (let k = 0; k < n; k++) out.push(mask);
    }
    return out;
  };
  // A player's line in the session state (their wins and score live on it, so nothing is kept for people who have gone).
  const rec = (run, peer) => run.players.find((pl) => pl.p === peer) || {};

  // A small fingerprint of the simulation, to spot a desync.
  function checksum(game) {
    const sc = game.scene, fs = sc && sc.fighters;
    let h = (sc && sc.constructor && sc.constructor.name || '').length * 31;
    if (fs) for (const f of fs) h = (h * 33 + Math.round(f.x * 4) + Math.round(f.y * 4) * 7 + Math.round(f.health * 10) * 13) >>> 0;
    return h;
  }

  // =================================================================== the lobby (a scene: it runs in lockstep)
  // Only the host's buttons reach it, so nobody else can hold it up.
  class OnlineLobbyScene {
    constructor(game, net) {
      this.game = game; this.net = net; this.t = 0; this.row = net.run && net.run.row != null ? net.run.row : 2;   // (the cursor stays put when the lobby is refreshed)
      if (RF.towerModsOff) RF.towerModsOff();
      RF.audio.playSong('menu');
    }
    update() {
      this.t++;
      const kb = this.game.kb, P = (a) => RF.menuPressed(kb, a), run = this.net.run;
      if (this.t < 20) return;   // (a button still held from the last screen does nothing here)
      if (P('up')) { this.row = (this.row + 2) % 3; RF.audio.sfx('move'); }
      if (P('down')) { this.row = (this.row + 1) % 3; RF.audio.sfx('move'); }
      run.row = this.row;
      const d = P('left') ? -1 : P('right') ? 1 : 0;
      if (d && this.row === 0) { const i = MODES.findIndex((m) => m.id === run.mode); run.mode = MODES[(i + d + MODES.length) % MODES.length].id; RF.audio.sfx('move'); }
      if (d && this.row === 1) { const i = RULES.findIndex((m) => m.id === run.rules); run.rules = RULES[(i + d + RULES.length) % RULES.length].id; RF.audio.sfx('move'); }
      if (P('confirm')) {
        if (this.row < 2) { this.row++; run.row = this.row; RF.audio.sfx('move'); return; }
        if (run.players.length < 2) { RF.audio.sfx('block'); return; }
        RF.audio.sfx('select');
        this.net.startMatch();
      }
    }
    render(ctx) {
      const net = this.net, run = net.run, t = this.t, host = net.isHost;
      RF.drawMenuBackdrop(ctx, t, 0.86);
      RF.drawTitle(ctx, 'ONLINE LOBBY', 6, 2);
      // the code, big, for whoever still has to type it in
      ctx.fillStyle = '#000'; ctx.fillRect(W - 86, 4, 80, 22); ctx.fillStyle = '#1c0c0a'; ctx.fillRect(W - 85, 5, 78, 20);
      T(ctx, 'ROOM', W - 80, 7, { color: '#a08878' }); T(ctx, net.code || '', W - 10, 11, { scale: 2, align: 'right', color: '#ffd030', outline: '#000' });
      // mode, rules, start
      RF.drawPanel(ctx, 12, 30, 200, 76);
      const mode = MODES.find((m) => m.id === run.mode) || MODES[0], rules = RULES.find((m) => m.id === run.rules) || RULES[0];
      [['MODE', mode.name], ['RULES', rules.name], ['START', '']].forEach(([l, v], i) => {
        const y = 38 + i * 15, sel = host && i === this.row;
        T(ctx, l, 30, y, { color: sel ? '#ffd030' : '#c8b0a0', outline: '#000', scale: i === 2 ? 2 : 1 });
        if (v) T(ctx, host && sel ? '< ' + v + ' >' : v, 204, y, { align: 'right', color: sel ? '#ffffff' : '#e8d8c8', outline: '#000' });
        if (sel) T(ctx, '>', 19, y + (i === 2 ? 3 : 0), { color: '#ff5020', outline: '#000' });
      });
      RF.font.wrap((this.row === 1 ? rules.desc : mode.desc), 31).slice(0, 2).forEach((l, i) => T(ctx, l, 20, 88 + i * 8, { color: '#a08878', outline: '#000' }));
      // who is here
      RF.drawPanel(ctx, 220, 30, 152, 124);
      T(ctx, 'IN THE ROOM  ' + run.players.length + '/' + MAX_PLAYERS, 228, 35, { color: '#a08878', outline: '#000' });
      const next = net.seatsFor(run), line = run.mode === 'stays' ? [run.king, ...run.line].filter(Boolean) : run.players.map((p) => p.p);
      run.players.forEach((pl, i) => {
        const y = 47 + i * 13, me = pl.p === net.me, seat = next ? next.indexOf(pl.p) : -1, pos = line.indexOf(pl.p), ok = net.inStep(pl.p);
        ctx.fillStyle = seat >= 0 ? '#2a1410' : '#160a08'; ctx.fillRect(226, y - 2, 140, 11); ctx.fillStyle = COLORS[i % 8]; ctx.fillRect(226, y - 2, 2, 11);
        const label = pl.nm + (me ? ' (YOU)' : '');
        T(ctx, label, 232, y, { color: ok ? COLORS[i % 8] : '#6a5a54', outline: '#000' });
        if (pl.p === run.host) T(ctx, 'HOST', 236 + RF.font.textWidth(label), y, { color: '#8a6a50', outline: '#000' });
        const tag = !ok ? 'CATCHING UP' : run.mode === 'stays' ? (pl.p === run.king && run.streak > 0 ? 'KING x' + run.streak : seat >= 0 ? 'UP NEXT' : pos > 0 ? 'IN LINE ' + pos : '') : seat >= 0 ? (run.mode === 'coop' ? 'TEAM' : 'PLAYING') : 'WATCHING';
        const sc = run.mode === 'stays' ? (pl.w || 0) : run.mode === 'coop' ? '' : (pl.s || 0);
        const em = net.emotes.find((e) => e.peer === pl.p);
        if (em) { const tw = RF.font.textWidth(em.text) + 8; ctx.fillStyle = '#f0e8d8'; ctx.fillRect(364 - tw, y - 2, tw, 11); T(ctx, em.text, 360, y, { align: 'right', color: '#1a0a08' }); }   // what they just said
        else T(ctx, tag + (sc !== '' ? '  ' + sc : ''), 362, y, { align: 'right', color: seat >= 0 ? '#ffd030' : '#a08878', outline: '#000' });
      });
      // what just happened, and what happens now
      RF.drawPanel(ctx, 12, 112, 200, 42);
      const note = run.note || (run.players.length < 2 ? 'GIVE YOUR FRIENDS THE ROOM CODE.' : 'READY WHEN YOU ARE.');
      RF.font.wrap(note, 31).slice(0, 2).forEach((l, i) => T(ctx, l, 20, 118 + i * 9, { color: '#ffd030', outline: '#000' }));
      if (run.mode === 'coop' && run.cb) T(ctx, 'CO-OP RUN: ' + run.streak + '   BEST: ' + run.cb, 20, 140, { color: '#80ffb0', outline: '#000' });
      else if (next) T(ctx, 'NEXT: ' + net.nameOf(next[0]) + (run.mode === 'coop' ? ' + ' : ' VS ') + net.nameOf(next[1]), 20, 140, { color: '#ffffff', outline: '#000' });
      const hint = host ? (run.players.length < 2 ? 'WAITING FOR SOMEONE TO JOIN...' : 'LEFT/RIGHT TO CHANGE - ENTER ON START') : 'THE HOST PICKS THE MODE AND STARTS.';
      T(ctx, hint, W / 2, 164, { align: 'center', color: t % 50 < 36 ? '#ffffff' : '#a08878', outline: '#000' });
      T(ctx, 'KEYS 1-6: ' + EMOTES.join('  '), W / 2, 180, { align: 'center', color: '#806860', outline: '#000' });
      T(ctx, 'HOLD ESC FOR TWO SECONDS TO LEAVE', W / 2, 192, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  // =================================================================== the session
  const online = {
    active: false, menuOpen: false, status: '', waiting: 0, phase: 'idle',
    MODES, RULES, EMOTES, VERSION,

    // ---------------- menu (DOM overlay: name, buttons, code box) ----------------
    openMenu(game) {
      this.game = game;
      this.menuOpen = true;
      if (!this.panel) this.buildPanel();
      this.panel.hidden = false;
      this.codeEl.hidden = true;
      this.setStatus('Play with friends on other computers: up to eight in a room. One of you hosts; the rest join with the code.');
      this.codeBox.value = '';
      let saved = ''; try { saved = localStorage.getItem(NAME_KEY) || ''; } catch (e) { /* no storage */ }
      this.nameBox.value = saved;
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
          #online-panel .box { background: #140606; border: 2px solid #ff7a2a; padding: 18px; width: min(440px, 100%); box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; }
          #online-panel h2 { margin: 0; color: #ff7a2a; letter-spacing: 0.12em; font-size: 18px; }
          #online-panel .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
          #online-panel button { font: inherit; background: #3a1208; color: #ffe0c0; border: 1px solid #ff7a2a; padding: 8px 12px; cursor: pointer; flex: 1; min-width: 120px; }
          #online-panel button:hover, #online-panel button:focus-visible { background: #6a2410; outline: none; }
          #online-panel input { font: inherit; font-size: 16px; text-transform: uppercase; letter-spacing: 0.3em; width: 7em; padding: 7px; background: #000; color: #ffd030; border: 1px solid #806050; }
          #online-panel label { color: #c8a890; display: flex; gap: 8px; align-items: center; }
          #online-panel .code { font-size: 28px; color: #ffd030; letter-spacing: 0.3em; }
          #online-panel .status { color: #c8a890; min-height: 3em; }
        </style>
        <div class="box" role="dialog" aria-label="Online play">
          <h2>ONLINE</h2>
          <div class="status"></div>
          <div class="code" hidden></div>
          <div class="row"><label>YOUR NAME <input class="nm" maxlength="4" placeholder="4 LETTERS" aria-label="Your name, up to four letters" autocomplete="off"></label></div>
          <div class="row"><button type="button" data-a="host">HOST A ROOM</button></div>
          <div class="row"><input class="cd" maxlength="4" placeholder="CODE" aria-label="Room code" autocomplete="off"><button type="button" data-a="join">JOIN</button></div>
          <div class="row"><button type="button" data-a="cancel">BACK</button></div>
        </div>`;
      document.body.appendChild(p);
      this.panel = p;
      this.statusEl = p.querySelector('.status');
      this.codeEl = p.querySelector('.code');
      this.codeBox = p.querySelector('.cd');
      this.nameBox = p.querySelector('.nm');
      this.hostBtn = p.querySelector('[data-a=host]');
      p.querySelector('[data-a=host]').onclick = () => this.host();
      p.querySelector('[data-a=join]').onclick = () => this.join(this.codeBox.value);
      p.querySelector('[data-a=cancel]').onclick = () => { this.leave(); this.phase = 'idle'; this.closeMenu(); };
      this.codeBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.join(this.codeBox.value); });
      p.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.leave(); this.phase = 'idle'; this.closeMenu(); } });
    },
    setStatus(t) { this.status = t; if (this.statusEl) this.statusEl.textContent = t; },
    myName() {
      const nm = cleanName(this.nameBox ? this.nameBox.value : '', '');
      if (nm) { try { localStorage.setItem(NAME_KEY, nm); } catch (e) { /* ignore */ } }
      return nm;
    },

    async getRoom() {
      if (!window.claude || !window.claude.use) return null;
      try { return await window.claude.use('room'); } catch (e) { return null; }
    },

    async host() {
      const room = await this.getRoom();
      if (!room) return this.setStatus('Online play only works in the published game page on claude.ai (signed in).');
      const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
      this.codeEl.hidden = false; this.codeEl.textContent = code;
      this.setStatus('Opening room ' + code + '...');
      const cfg = {}; for (const id of SHARED()) cfg[id] = RF.CONFIG[id];
      await this.enterRoom(room, code, { role: 'host', v: VERSION, nm: this.myName() || 'HOST', cfg, e: -1 });
    },

    async join(raw) {
      const code = String(raw || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
      if (code.length !== 4) return this.setStatus('Type the 4-letter code your friend got when they pressed HOST.');
      const room = await this.getRoom();
      if (!room) return this.setStatus('Online play only works in the published game page on claude.ai (signed in).');
      this.codeEl.hidden = true;
      this.setStatus('Joining ' + code + '...');
      await this.enterRoom(room, code, { role: 'guest', v: VERSION, nm: this.myName(), e: -1 });
    },

    async enterRoom(room, code, hello) {
      await this.leave();
      let r;
      try { r = await room.join('tm-' + code.toLowerCase()); } catch (e) {
        return this.setStatus(e && e.code === 'not_permitted' ? 'Online rooms are not available to this account.' : 'Could not reach the room. Try again in a moment.');
      }
      this.room = r; this.hello = hello; this.code = code; this.isHost = hello.role === 'host';
      this.me = null; this.hostPeer = null; this.present = new Map(); this.inputs = new Map(); this.oldest = new Map(); this.helloBytes = JSON.stringify(hello).length;
      this.epoch = -1; this.minEpoch = null; this.ep = null; this.run = null; this.F = 0; this.produced = -1; this.maxSeen = 0;
      this.phase = 'joining'; this.delay = INPUT_DELAY; this.stalls = 0; this.ticks = 0; this.calm = 0; this.calmNeed = 5; this.probed = false; this.tickN = 0; this.lastEpochTick = 0;
      this.sums = new Map(); this.gone = new Map(); this.nudges = new Map(); this.emotes = []; this.emSeq = 0; this.emSeen = new Map(); this.escHold = 0; this.hostGone = 0; this.waitTicks = 0;
      try { await r.presence(hello); } catch (e) { /* retried by the platform */ }
      this.unsub = r.onPeers((ch) => this.onPeers(ch), () => { if (this.room === r) this.end('THE CONNECTION TO THE ROOM WAS LOST.'); });
      if (!this.isHost) this.joinTimer = setTimeout(() => { if (this.phase === 'joining' && !this.hostPeer) this.setStatus('No host in room ' + code + ' yet. Check the code (or ask them to press HOST).'); }, 6000);
    },

    // ---------------- who is here, and what they sent ----------------
    onPeers(ch) {
      const now = new Map(); let hostPeer = null;
      for (const p of ch.peers) {
        if (p.kind && p.kind !== 'viewer') continue;
        const pr = p.presence || {};
        if (p.sameTab) this.me = p.peer;
        if (!pr.role || pr.v === undefined) continue;                     // in the room, has not said hello yet
        now.set(p.peer, pr);
        if (pr.role === 'host' && (!hostPeer || p.peer < hostPeer)) hostPeer = p.peer;
        if (!p.sameTab) this.readPeer(p.peer, pr);
      }
      this.present = now;
      if (this.isHost) {
        if (this.me && this.phase === 'joining') this.openSession();
        return;
      }
      // ---- a guest: find the host, and follow their epochs
      if (!hostPeer) {   // (still waiting to get in, and the host has gone: say so instead of waiting for ever)
        if (this.phase === 'joining' && this.hostPeer) { this.hostPeer = null; this.minEpoch = null; clearTimeout(this.waitNote); this.setStatus('The host has left room ' + this.code + '. Ask them to host again, or host a room yourself.'); }
        return;
      }
      const hp = now.get(hostPeer);
      if (hp.v !== VERSION) { if (this.phase === 'joining') this.setStatus('The host has a different version of the game. Everyone reload the page and try again.'); return; }
      this.hostPeer = hostPeer;
      const ep = hp.ep;
      if (!ep || typeof ep.n !== 'number') return;
      if (this.minEpoch === null) {   // I can only pick the game up from an epoch that starts after I got here
        this.minEpoch = ep.n + 1; this.hostCfg = hp.cfg || null;
        this.setStatus('In room ' + this.code + '. Getting in step with the host...');
        this.waitNote = setTimeout(() => { if (this.phase === 'joining') this.setStatus('A match is being played in room ' + this.code + '. You are in as soon as it is over.'); }, 4000);
      }
      if (ep.n > this.epoch && ep.n >= this.minEpoch) this.adopt(ep);
    },
    readPeer(peer, pr) {
      if (typeof pr.f === 'number' && typeof pr.b === 'string') {
        let map = this.inputs.get(peer); if (!map) { map = new Map(); this.inputs.set(peer, map); }
        const masks = dec(pr.b);
        if (masks.length && pr.f >= 0 && pr.f < 1e9) {
          const keep = Math.max(0, this.F - 4);   // (frames already played are of no use to me)
          masks.forEach((m, i) => { const f = pr.f - masks.length + 1 + i; if (f >= keep && !map.has(f)) map.set(f, m); });
          this.oldest.set(peer, pr.f - masks.length + 1);   // (the earliest frame they are still sending)
          if (pr.f > this.maxSeen) this.maxSeen = pr.f;
        }
      }
      // a quick word from them
      if (Array.isArray(pr.em) && this.emSeen.get(peer) !== pr.em[1]) {
        const first = !this.emSeen.has(peer); this.emSeen.set(peer, pr.em[1]);
        if (!first || this.active) this.showEmote(peer, pr.em[0]);
      }
      // checksums: a guest compares with the host's; the host notes a seated player who says they are lost
      if (Array.isArray(pr.cs) && pr.cs[0] === this.epoch && !this.isHost && peer === this.hostPeer && this.phase === 'live') {
        const mine = this.sums.get(pr.cs[1]);
        if (mine !== undefined && mine !== pr.cs[2]) this.fallOut('OUT OF SYNC');
      }
    },
    showEmote(peer, i) { const text = EMOTES[i | 0]; if (text) { this.emotes = this.emotes.filter((e) => e.peer !== peer); this.emotes.push({ peer, text, t: 170 }); RF.audio.sfx('select'); } },
    nameOf(peer) { const pl = this.run && this.run.players.find((p) => p.p === peer); return pl ? pl.nm : peer === null ? 'CPU' : '???'; },
    inStep(peer) { if (peer === this.me) return this.phase === 'live' || this.phase === 'await'; const pr = this.present.get(peer); return !!pr && pr.e === this.epoch; },

    // ---------------- epochs: the points everyone gets back in step ----------------
    openSession() {   // the host, once they know which peer they are
      const me = this.me;
      this.hostPeer = me;
      this.newEpoch(0, { mode: 'versus', rules: 'standard', host: me, players: [], cb: 0, line: [], king: null, kingSide: 0, streak: 0, fights: 0, seat: null, mods: null, note: '' });
    },
    // Host only: bring the list of players up to date with who is actually in the room.
    syncPlayers(run) {
      const here = [...this.present.keys()].filter((p) => this.present.get(p).v === VERSION);
      if (this.me && !here.includes(this.me)) here.push(this.me);
      // (somebody missing for a moment is not gone: the connection drops out and comes back by itself)
      const keep = run.players.filter((pl) => here.includes(pl.p) || (this.gone.get(pl.p) || 0) <= AWAY);
      const fresh = here.filter((p) => !keep.some((pl) => pl.p === p)).sort().slice(0, Math.max(0, MAX_PLAYERS - keep.length));
      const used = new Set(keep.map((pl) => pl.nm));
      for (const p of fresh) {
        let nm = cleanName((this.present.get(p) || this.hello).nm, 'P' + (keep.length + 1));
        if (p === this.me) nm = cleanName(this.hello.nm, 'HOST');
        for (let k = 2; used.has(nm) && k < 10; k++) nm = nm.slice(0, 3) + k;   // two people with the same name
        used.add(nm); keep.push({ p, nm, w: 0, s: 0, b: 0 });   // wins (Winner Stays), score (Versus / Tag), best streak
      }
      keep.sort((a, b) => (b.p === this.me) - (a.p === this.me));   // the host first
      run.players = keep; run.host = this.me;
      const ids = keep.map((pl) => pl.p);
      run.line = run.line.filter((p) => ids.includes(p));
      if (!ids.includes(run.king)) { run.king = null; run.streak = 0; }
      // new arrivals join the line ahead of whoever has just lost (they were here before that fight ended)
      const back = run.justLost && run.line[run.line.length - 1] === run.justLost ? run.line.pop() : null;
      for (const p of ids) if (p !== run.king && p !== back && !run.line.includes(p)) run.line.push(p);
      if (back && ids.includes(back)) run.line.push(back);
      run.justLost = null;
      if (!run.king && run.line.length) { run.king = run.line.shift(); run.kingSide = 0; }
      return run;
    },
    newEpoch(at, run, note) {
      const r = this.syncPlayers(clone(run));
      r.seat = null; r.mods = null; if (note !== undefined) r.note = note;
      const ep = { n: this.epoch + 1, at, seed: Math.floor(Math.random() * 2 ** 31), run: r };
      this.ep = ep; this.lastEpochTick = this.tickN;
      this.adopt(ep);
    },
    adopt(ep) {
      const game = this.game, first = !this.active;
      clearTimeout(this.joinTimer); clearTimeout(this.waitNote);
      if (first) {
        const cfg = this.isHost ? null : this.hostCfg;
        if (cfg) { this.savedCfg = {}; for (const k in cfg) { this.savedCfg[k] = RF.CONFIG[k]; RF.CONFIG[k] = cfg[k]; } }
        this.realKb = game.kb; this.active = true;
        game.toast = { text: 'ONLINE - ROOM ' + this.code, t: 240 };
      }
      this.epoch = ep.n; this.F = ep.at; this.rand = seeded(ep.seed); this.run = clone(ep.run);
      this.phase = 'live'; this.sums = new Map(); this.waitTicks = 0; this.wantEpoch = false; this.waitingFor = null;
      if (this.produced < this.F - 1) this.produced = this.F - 1;
      for (const map of this.inputs.values()) for (const f of map.keys()) if (f < ep.at - 4) map.delete(f);
      this.netKb = new NetKeyboard(this.realKb, this);
      game.kb = this.netKb;
      const native = Math.random; Math.random = this.rand;   // built exactly the same on every computer
      try { game.setScene(new OnlineLobbyScene(game, this)); } finally { Math.random = native; }
      this.closeMenu();
    },
    // I can no longer follow this epoch (my picture is wrong, or I missed buttons I can never get back).
    fallOut(why) {
      // The host, if it is in the fight (or the lobby), takes everyone back to the lobby. A host that was only
      // watching lets the two who are playing finish, and picks the session up again when they reach the lobby.
      const seat = this.run && this.run.seat;
      if (this.isHost && (!seat || seat.includes(this.me))) return this.newEpoch(Math.max(this.F, this.maxSeen + 1), this.run, why + ' - BACK TO THE LOBBY.');
      this.phase = 'lost'; this.lostWhy = why; this.lostTicks = 0;
    },

    // ---------------- the session state: who plays next, and what a result does ----------------
    seatsFor(run) {
      const ps = run.players.map((p) => p.p);
      if (ps.length < 2) return null;
      if (run.mode === 'stays') { const k = run.king || ps[0], c = run.line.find((p) => p !== k); return c ? (run.kingSide === 0 ? [k, c] : [c, k]) : null; }
      return [ps[0], ps[1]];
    },
    // Called by the lobby, inside the simulation, on every computer in the same frame.
    startMatch() {
      const run = this.run, seat = this.seatsFor(run), game = this.game;
      if (!seat) return;
      run.seat = seat; run.note = '';
      const chaos = run.rules === 'chaos' ? CHAOS[Math.floor(Math.random() * CHAOS.length)] : null;
      run.mods = chaos ? chaos[1] : null; run.modName = chaos ? chaos[0] : '';
      const coop = run.mode === 'coop', a = this.nameOf(seat[0]), b = this.nameOf(seat[1]);
      const party = {
        label: 'BACK TO THE LOBBY', again: run.mode === 'stays' ? null : 'REMATCH',
        names: coop ? ['TEAM', 'CPU'] : [a, b],
        hint: (coop ? a + ' PICKS, THEN ' + b + '. THE CPU PICKS ITS OWN.' : a + ' (LEFT)  VS  ' + b + ' (RIGHT)') + (chaos ? '   RULE: ' + chaos[0] : ''),
        onStart: (scene) => {
          if (run.mods && RF.towerMods) RF.towerMods(run.mods);
          if (coop) scene.opts.cpuLevel = run.streak >= 3 ? 'nightmare' : run.streak >= 1 ? 'hard' : 'normal';
        },
        onEnd: (g, p1Won, scene, again) => this.matchEnded(p1Won, scene, again),
        onQuit: () => this.toLobby('MATCH CALLED OFF.'),
      };
      game.setScene(new RF.SelectScene(game, { party, tag: run.mode === 'tag' || coop, cpu: coop }));
    },
    matchEnded(p1Won, scene, again) {
      const run = this.run, seat = run.seat || [null, null];
      run.fights++;
      if (run.mode === 'coop') {
        run.streak = p1Won ? run.streak + 1 : 0; run.cb = Math.max(run.cb || 0, run.streak);
        run.note = p1Won ? this.nameOf(seat[0]) + ' AND ' + this.nameOf(seat[1]) + ' WIN. ' + run.streak + ' IN A ROW.' : 'THE CPU TOOK THAT ONE. THE RUN STARTS OVER.';
      } else {
        const w = p1Won ? seat[0] : seat[1], l = p1Won ? seat[1] : seat[0];
        if (run.mode === 'stays') this.staysResult(run, w, l, p1Won ? 0 : 1);
        else { const r = rec(run, w); r.s = (r.s || 0) + 1; run.note = this.nameOf(w) + ' BEAT ' + this.nameOf(l) + '.  ' + (rec(run, seat[0]).s || 0) + ' - ' + (rec(run, seat[1]).s || 0); }
      }
      if (again) { scene.startMatch(); return; }
      this.toLobby();
    },
    staysResult(run, w, l, side) {
      run.line = run.line.filter((p) => p !== w && p !== l); run.line.push(l); run.justLost = l;
      const dethroned = w !== run.king;
      if (dethroned || run.streak === 0) { run.king = w; run.kingSide = side; run.streak = 1; } else run.streak++;
      const r = rec(run, w); r.w = (r.w || 0) + 1; r.b = Math.max(r.b || 0, run.streak);
      run.note = dethroned && run.fights > 1 ? this.nameOf(w) + ' TOOK THE SEAT FROM ' + this.nameOf(l) + '!' : this.nameOf(w) + ' SENT ' + this.nameOf(l) + ' TO THE BACK OF THE LINE.' + (run.streak > 1 ? ' ' + run.streak + ' IN A ROW.' : '');
    },
    // Back to the lobby (inside the simulation). The host turns it into a new epoch; everyone else waits for that.
    toLobby(note) {
      const game = this.game;
      this.run.seat = null; this.run.mods = null;
      if (note !== undefined) this.run.note = note;
      game.setScene(new OnlineLobbyScene(game, this));
      if (this.isHost) this.wantEpoch = true; else this.phase = 'await';
    },
    // Whose buttons the next frame needs: [left seat, right seat]; null = nobody (or the CPU).
    seatPeers() {
      const run = this.run, sc = this.game.scene, seat = run && run.seat;
      if (!seat || sc instanceof OnlineLobbyScene) return [run ? run.host : this.hostPeer, null];
      if (run.mode === 'coop') {
        if (sc instanceof RF.SelectScene) return [sc.picks[0].length === 1 && !sc.ready[0] ? seat[1] : seat[0], null];
        if (sc instanceof RF.FightScene && sc.tag && sc.phase !== 'matchOver') return [sc.fighters[0] === sc.tag.leads[0] ? seat[0] : seat[1], null];
        return [seat[0], null];
      }
      return seat;
    },
    // Which side of the screen is mine right now (-1: watching).
    mySide() {
      const run = this.run, seat = run && run.seat;
      if (!this.active || !seat) return -1;
      if (run.mode === 'coop') return seat.includes(this.me) ? 0 : -1;
      return seat.indexOf(this.me);
    },
    // Things the session does to a scene from outside (the same on every computer, before the frame runs).
    direct() {
      const run = this.run, sc = this.game.scene;
      if (run.mode === 'coop' && run.seat && sc instanceof RF.SelectScene && sc.ready[0] && !sc.ready[1]) {   // the CPU picks its own team
        const pool = sc.slots.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
        const a = pool[Math.floor(Math.random() * pool.length)]; let b = a; while (b === a) b = pool[Math.floor(Math.random() * pool.length)];
        sc.picks[1] = [a, b]; sc.cursor[1] = b; sc.ready[1] = true; sc.flash[1] = 12;
      }
    },

    // ---------------- one tick of the fixed 60 Hz loop while online (replaces game.step()) ----------------
    tick() {
      const game = this.game, real = this.realKb, run = this.run;
      this.tickN++;
      real.pollPads();
      if (real.justPressed('KeyM')) game.toast = { text: RF.audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON', t: 90 };
      if (game.toast && --game.toast.t <= 0) game.toast = null;
      if (game.achievement && --game.achievement.t <= 0) game.achievement = null;
      for (const e of this.emotes) e.t--; this.emotes = this.emotes.filter((e) => e.t > 0);
      // things only I do: a quick word, and leaving
      for (let i = 0; i < EMOTES.length; i++) if (real.justPressed('Digit' + (i + 1))) { this.emote = [i, ++this.emSeq]; this.showEmote(this.me, i); }
      this.escHold = real.isDown('Escape') ? this.escHold + 1 : 0;
      if (this.escHold > 120) return this.end('YOU LEFT THE ONLINE SESSION.');
      // has the host gone?
      if (!this.isHost) {
        this.hostGone = this.present.has(this.hostPeer) ? 0 : this.hostGone + 1;
        if (this.hostGone > 300) return this.end('THE HOST LEFT. THE SESSION IS OVER.');
      }
      // my buttons, a few frames ahead of the frame being played (and never behind what the others have reached)
      const m = localMask(real), target = Math.max(this.F + this.delay, this.phase === 'live' ? 0 : this.maxSeen);
      const mine = this.myInputs();
      while (this.produced < target) { this.produced++; mine.set(this.produced, m); }
      real.tick();
      if (this.isHost) this.hostDuties();
      // Simulate the frames whose buttons are all here: ONE a tick, which is the game's real speed (buttons arrive a
      // few frames early, and playing them as fast as they arrive would run the whole game fast). Up to four only
      // while I am behind where the others have got to: after a hiccup, or watching from a tab that fell asleep.
      let lead = -1;
      for (const [p, pr] of this.present) if (p !== this.me && pr.e === this.epoch && typeof pr.at === 'number' && pr.at > lead) lead = pr.at;
      const most = lead - this.F > 3 ? 4 : 1;
      let ran = 0;
      while (this.phase === 'live' && ran < most) {
        const seats = this.seatPeers(), masks = [];
        let missing = null;
        for (const p of seats) { const v = p == null ? 0 : (this.inputs.get(p) || new Map()).get(this.F); if (v === undefined) { missing = p; break; } masks.push(v); }
        if (missing !== null) {
          this.waitingFor = missing;
          // their buttons for this frame have already scrolled out of what they send: I can never have them
          if ((this.oldest.get(missing) || 0) > this.F) this.fallOut('CONNECTION HICCUP');
          break;
        }
        this.waitingFor = null;
        this.simulate(masks);
        this.F++; ran++;
        if (this.wantEpoch) { this.wantEpoch = false; this.newEpoch(this.F, this.run); break; }
      }
      this.waiting = ran || this.phase !== 'live' ? 0 : this.waiting + 1;
      for (const map of this.inputs.values()) map.delete(this.F - WINDOW * 3);
      // adapt the input delay: stalling a lot -> buffer more; smooth for a while -> buffer less
      if (!ran && this.phase === 'live') this.stalls++;
      // (each time buffering less turns out to stutter, wait twice as long before trying that again)
      if (++this.ticks >= 60) {
        if (this.stalls > 3 && this.delay < 16) { this.delay = Math.min(16, this.delay + 2); if (this.probed) this.calmNeed = Math.min(40, this.calmNeed * 2); this.probed = false; this.calm = 0; }
        else if (this.stalls === 0 && ++this.calm >= this.calmNeed && this.delay > 4) { this.delay--; this.calm = 0; this.probed = true; }
        else if (this.stalls === 0 && this.calm >= 3) this.probed = false;
        this.ticks = 0; this.stalls = 0;
      }
      this.publish();
    },
    myInputs() { let map = this.inputs.get(this.me); if (!map) { map = new Map(); this.inputs.set(this.me, map); } return map; },
    publish() {
      if (!this.room) return;
      const mine = this.myInputs(), from = Math.max(0, this.produced - WINDOW + 1), arr = [];
      for (let f = from; f <= this.produced; f++) arr.push(mine.get(f) || 0);
      let patch = { f: this.produced, b: enc(arr), e: this.phase === 'lost' ? -2 : this.epoch, at: this.F };   // (at: the frame I have played up to)
      const csF = this.F - (this.F % 60) - 60;
      if (this.phase === 'live' && this.sums.has(csF)) patch.cs = [this.epoch, csF, this.sums.get(csF)];
      if (this.emote) patch.em = this.emote;
      if (this.isHost && this.ep) patch.ep = this.ep;
      // waiting at the lobby door: say where the match ended, in case the host could not see it
      patch.aw = this.phase === 'await' ? { e: this.epoch, at: this.F, run: this.run } : null;
      // Plain JSON only, my own copy of it, and never more than the room takes (4 KiB for everything I have set).
      let text = JSON.stringify(patch);
      if (text.length + this.helloBytes > 3600) { patch.b = enc(arr.slice(-40)); text = JSON.stringify(patch); }
      patch = JSON.parse(text);
      this.room.presence(patch).catch(() => {});
    },
    simulate(masks) {
      const game = this.game, kb = this.netKb, native = Math.random;
      kb.apply(masks);
      Math.random = this.rand; // the same random numbers on every computer
      try { this.direct(); game.scene.update(); } finally { Math.random = native; }
      kb.tick();
      if (this.F % 60 === 0) { this.sums.set(this.F, checksum(game)); this.sums.delete(this.F - 600); }
    },

    // ---------------- what only the host does ----------------
    hostDuties() {
      const run = this.run, since = this.tickN - this.lastEpochTick;
      // who has gone quiet
      for (const pl of run.players) { if (pl.p === this.me) continue; this.gone.set(pl.p, this.present.has(pl.p) ? 0 : (this.gone.get(pl.p) || 0) + 1); }
      if (this.phase === 'lost') {   // (a host that fell out of a match it was only watching: wait for the players to reach the lobby)
        for (const [, pr] of this.present) if (pr.aw && pr.aw.e === this.epoch && pr.aw.run) return this.newEpoch(Math.max(pr.aw.at, this.maxSeen + 1), pr.aw.run);
        if (++this.lostTicks > 60 * 240) this.newEpoch(Math.max(this.F, this.maxSeen + 1), run, 'CONNECTION HICCUP - BACK TO THE LOBBY.');
        return;
      }
      const inLobby = this.game.scene instanceof OnlineLobbyScene;
      if (inLobby) {
        // somebody new, somebody gone, or somebody who is not on this epoch yet: start a fresh one for them
        const ids = run.players.map((p) => p.p), here = [...this.present.keys()].filter((p) => this.present.get(p).v === VERSION || p === this.me);
        const changed = ids.some((p) => p !== this.me && (this.gone.get(p) || 0) > AWAY) || (ids.length < MAX_PLAYERS && here.some((p) => !ids.includes(p)));
        // (somebody whose tab is in the background never catches up: they get three tries, then the next real epoch)
        let behind = false;
        for (const p of ids) { if (p === this.me || !this.present.has(p)) continue; if (this.present.get(p).e === this.epoch) this.nudges.delete(p); else if ((this.nudges.get(p) || 0) < 3) behind = true; }
        if (changed && since > 20) this.newEpoch(this.F, run);
        else if (behind && since > 90) { for (const p of ids) if (p !== this.me && this.present.has(p) && this.present.get(p).e !== this.epoch) this.nudges.set(p, (this.nudges.get(p) || 0) + 1); this.newEpoch(this.F, run); }
        return;
      }
      const seat = run.seat;
      if (!seat) return;
      const humans = seat.filter((p) => p && p !== this.me);
      for (const p of humans) {
        const pr = this.present.get(p), other = seat.find((q) => q !== p);
        // gone from the room, or the match has been waiting on their buttons for eight seconds: the other side wins
        if ((this.gone.get(p) || 0) > 300 || (this.waitingFor === p && this.waiting > 480)) return this.forfeit(p, other);
        // their picture is not the same as mine: nobody should go on playing that
        if (pr && pr.e === -2 && since > 60) return this.newEpoch(Math.max(this.F, this.maxSeen + 1), run, 'OUT OF SYNC - BACK TO THE LOBBY. NO RESULT.');
        if (pr && Array.isArray(pr.cs) && pr.cs[0] === this.epoch) { const mine = this.sums.get(pr.cs[1]); if (mine !== undefined && mine !== pr.cs[2]) return this.newEpoch(Math.max(this.F, this.maxSeen + 1), run, 'OUT OF SYNC - BACK TO THE LOBBY. NO RESULT.'); }
      }
    },
    forfeit(quitter, other) {
      const run = clone(this.run), q = this.nameOf(quitter);
      if (run.mode === 'coop') { run.streak = 0; run.note = q + ' LEFT. THE RUN STARTS OVER.'; }
      else if (other) {
        run.fights++;
        if (run.mode === 'stays') { this.staysResult(run, other, quitter, run.seat.indexOf(other)); }
        else { const r = rec(run, other); r.s = (r.s || 0) + 1; }
        run.note = q + ' LEFT THE MATCH. ' + this.nameOf(other) + ' WINS.';
      }
      this.newEpoch(Math.max(this.F, this.maxSeen + 1), run);
    },

    // ---------------- drawn on top of the game while online ----------------
    drawOverlay(ctx) {
      if (!this.active) return;
      const run = this.run, side = this.mySide(), lobby = this.game.scene instanceof OnlineLobbyScene;
      const role = lobby ? '' : side < 0 ? ': WATCHING' : run.mode === 'coop' ? ': YOUR TEAM' : side ? ': YOU, RIGHT' : ': YOU, LEFT';
      // along the bottom, between the two meters: the room, which side is yours, and the connection
      const label = 'ONLINE ' + this.code + role, lx = Math.round(W / 2 - (RF.font.textWidth(label) + 16) / 2);
      T(ctx, label, lx, H - 10, { color: '#60e0ff', outline: '#000' });
      // (fewer bars the more the game has to buffer)
      const bars = this.phase !== 'live' ? 0 : this.delay <= 6 ? 3 : this.delay <= 10 ? 2 : 1, bx = lx + RF.font.textWidth(label) + 6;
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#000'; ctx.fillRect(bx + i * 4 - 1, H - 7 - i * 2, 4, 4 + i * 2); ctx.fillStyle = i < bars ? '#60ff90' : '#3a4a44'; ctx.fillRect(bx + i * 4, H - 6 - i * 2, 2, 2 + i * 2); }
      const band = (text, color) => { const tw = RF.font.textWidth(text) + 14; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(W / 2 - tw / 2, 96, tw, 13); T(ctx, text, W / 2, 99, { align: 'center', color, outline: '#000' }); };
      if (this.phase === 'lost') band((this.lostWhy || 'OUT OF SYNC') + ' - YOU ARE BACK IN AT THE NEXT LOBBY', '#ff6050');
      else if (this.phase === 'await') band('BACK TO THE LOBBY...', '#ffd030');
      else if (this.waiting > 30) band('WAITING FOR ' + (this.waitingFor ? this.nameOf(this.waitingFor) : 'THE OTHERS') + '...', '#ffd030');
      if (!lobby && run && run.modName && this.game.scene instanceof RF.FightScene) T(ctx, 'RULE: ' + run.modName, W / 2, H - 20, { align: 'center', color: '#ff8aff', outline: '#000' });
      if (this.escHold > 20) { const u = Math.min(1, this.escHold / 120); ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(W / 2 - 62, 112, 124, 16); ctx.fillStyle = '#c01010'; ctx.fillRect(W / 2 - 60, 124, Math.round(120 * u), 2); T(ctx, 'LEAVING THE SESSION...', W / 2, 115, { align: 'center', color: '#ffffff', outline: '#000' }); }
      // quick words: the players' by their corner, everybody else's along the bottom
      const seat = (run && run.seat) || [];
      let k = 0;
      for (const e of lobby ? [] : this.emotes) {   // (the lobby shows them in its own list)
        const s = run && run.mode !== 'coop' ? seat.indexOf(e.peer) : -1, i = run ? run.players.findIndex((p) => p.p === e.peer) : 0, text = this.nameOf(e.peer) + ': ' + e.text, tw = RF.font.textWidth(text) + 10;
        const x = lobby || s < 0 ? W / 2 - tw / 2 : s === 0 ? 8 : W - 8 - tw, y = lobby || s < 0 ? H - 34 - (k++) * 13 : 38;
        ctx.globalAlpha = Math.min(1, e.t / 20); ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, tw + 2, 13); ctx.fillStyle = '#f0e8d8'; ctx.fillRect(x, y, tw, 11);
        ctx.fillStyle = COLORS[Math.max(0, i) % 8]; ctx.fillRect(x, y, 2, 11); T(ctx, text, x + 6, y + 2, { color: '#1a0a08' }); ctx.globalAlpha = 1;
      }
    },

    end(message) {
      const game = this.game;
      if (this.active) {
        game.kb = this.realKb;
        if (RF.towerModsOff) RF.towerModsOff();
        if (this.savedCfg) { Object.assign(RF.CONFIG, this.savedCfg); this.savedCfg = null; }
        this.active = false;
        game.setScene(new RF.TitleScene(game));
        game.toast = { text: message || 'LEFT THE ONLINE SESSION', t: 300 };
      } else if (message) this.setStatus(message);
      this.phase = 'idle';
      this.leave();
    },

    async leave() {
      clearTimeout(this.joinTimer); clearTimeout(this.waitNote);
      if (this.unsub) { this.unsub(); this.unsub = null; }
      const r = this.room; this.room = null;
      if (r) { try { await r.leave(); } catch (e) { /* already gone */ } }
    },
  };

  RF.online = online;
  RF.OnlineLobbyScene = OnlineLobbyScene;
})();
