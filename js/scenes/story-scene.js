// STORY MODE: "THE LAST BELL" - a cinematic engine. Scenes are shot like a film: hard cuts
// between wide shots, medium shots, close-ups (background out of focus), extreme close-ups on
// the eyes, over-the-shoulder shots, low angles, Dutch angles and split-screen radio calls;
// full-screen insert shots (a chalkboard, the bell, a clock, a map...), dissolves and whip
// pans; a 2.35:1 letterbox with subtitles, vignette and film grain. Every line is spoken
// (each character with their own voice), and scenes have ambient sound beds.
// The script is data: js/config/story.js.
//
// STEPS (run in order):
//  staging   { bg: 'stageId' | 'black' }  { cast: { key: [charId, x, facing, { rift, anim, y, bg }] } }
//            { remove: 'key' }  { face: ['key', dir] }  { tint: 'rgba()' | null }
//  shots     { shot: 'wide' | ['medium'|'close'|'xcu'|'low', key] | ['two', keyA, keyB] |
//                    ['ots', overKey, atKey] | ['split', keyA, keyB] , dutch?: rad }
//            { insert: 'school'|'equation'|'bell'|'clock'|'radio'|'map'|'card', text? }
//            { push: [zoomDelta, frames] }  { pan: [dx, frames] }  { handheld: amount }
//            { dissolve: frames }  { whip: true }  { fade: ['out'|'in', frames] }
//  action    { act: ['key', anim] }  { walk: ['key', x, frames, 'async'?] }  { dash: ['key', x, frames] }
//            { rise: ['key', y, frames] }  { hop: 'key' }  { impact: ['key', power] }
//            { shatter: 'key' }  { fly: ['fromKey', toX, art, frames] }  { rift: [x, size] }  { riftOff: true }
//  words     { say: ['key' | charId, 'TEXT', { radio, shot }] }  { narrate: 'TEXT' }  { title: ['SMALL', 'BIG'] }
//  sound     { music: 'song' | 'silence' }  { sfx: 'name' }  { amb: ['drone', 'bell', ...] | null }
//  timing    { wait: frames }  { shake: n }  { flash: n }
//  special   { choose: true } (pick the finale hero -> '$hero')  { credits: true }
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224, BAR = 30;                       // 2.35:1 letterbox
  const KEY = 'terramania-story';
  const PURPLE = ['#ffffff', '#e0b0ff', '#a050ff', '#5a1a9a'];
  const FEMALE = new Set(['brady', 'landa']);              // Ms. / Lady: female voices

  // ---------------------------------------------------------------- progress
  RF.storyProgress = {
    get() { try { return Object.assign({ reached: 0, done: false }, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return { reached: 0, done: false }; } },
    reach(i) { const p = this.get(); p.reached = Math.max(p.reached, i); this.save(p); },
    finish() { const p = this.get(); p.done = true; this.save(p); },
    save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* no storage */ } },
  };

  // ---------------------------------------------------------------- rift variants
  RF.riftDef = function (def) {
    const pal = {};
    for (const k in (def.sprite.palette || {})) {
      const h = def.sprite.palette[k];
      if (!h || h[0] !== '#') { pal[k] = h; continue; }
      const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      const l = (r * 0.3 + g * 0.55 + b * 0.15) / 255;
      const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
      pal[k] = '#' + c(30 + l * 190) + c(10 + l * 120) + c(60 + l * 200);
    }
    return Object.assign({}, def, { name: 'RIFT ' + def.name.toUpperCase(), costume: 'rift', rift: true, sprite: Object.assign({}, def.sprite, { palette: pal }) });
  };
  RF.MOVE_FX.riftAura = function (f, ctx, floorY, frame) {
    if (f.isKO || ['finished', 'thrown'].includes(f.state)) return;
    const top = floorY - f.y - f.body.height;
    for (let i = 0; i < 6; i++) {
      const a = (frame * 1.5 + i * 17) % 50;
      ctx.globalAlpha = 0.55 * (1 - a / 50); ctx.fillStyle = i % 2 ? '#c080ff' : '#7020d0';
      ctx.fillRect(Math.round(f.x - 14 + i * 5 + Math.sin((frame + i * 9) / 7) * 3), Math.round(top + f.body.height - a * 1.8), 2, 3);
    }
    ctx.globalAlpha = 1;
  };
  RF.storyTick = function (scene) {
    const st = scene.opts.story, foe = scene.fighters[1];
    if (st.mid && !scene.midShown && scene.phase === 'fight' && foe.health < foe.maxHealth * 0.5) {
      scene.midShown = true;
      scene.effects.spawnText(st.mid, foe.x, foe.body.height + 30, '#d090ff');
      speak(foe.def, st.mid);
    }
  };
  RF.storyEndMenu = function (scene, won) {
    const game = scene.game, i = scene.opts.story.index;
    if (won) return new RF.ListMenu([{ label: 'CONTINUE STORY', onSelect: () => game.setScene(new StoryScene(game, i, 'outro', { hero: scene.opts.story.hero })) }]);
    return new RF.ListMenu([
      { label: 'RETRY', onSelect: () => scene.startMatch() },
      { label: 'STORY MENU', onSelect: () => game.setScene(new StoryMenuScene(game)) },
    ]);
  };

  // ---------------------------------------------------------------- voices
  const voice = { speaking: false, endT: 0, clock: 0 };
  // Every character has their own voice: male or female, an accent, a pitch and a pace that fit
  // who they are. g = gender of the voice, lang = preferred accent, pitch 0..2, rate ~0.6..1.4.
  const VOICES = {
    sirven:      { g: 'm', lang: 'en-GB', pitch: 0.55, rate: 0.82 },  // the King: slow, deep, regal
    brady:       { g: 'f', lang: 'en-US', pitch: 0.95, rate: 0.98 },  // firm, no-nonsense
    landa:       { g: 'f', lang: 'en-GB', pitch: 0.7, rate: 0.85 },   // cold, menacing
    lopez:       { g: 'm', lang: 'en-GB', pitch: 0.35, rate: 0.78 },  // the villain: slowest, deepest
    anthony:     { g: 'm', lang: 'en-GB', pitch: 0.75, rate: 0.92 },  // the sorcerer: calm, wise
    nicholas:    { g: 'm', lang: 'en-US', pitch: 1.15, rate: 1.12 },  // hyped gym bro
    bandy:       { g: 'm', lang: 'en-US', pitch: 0.95, rate: 1.0 },   // laid-back skater cool
    simon:       { g: 'm', lang: 'en-AU', pitch: 1.0, rate: 1.05 },   // focused fighter
    mikey:       { g: 'm', lang: 'en-US', pitch: 0.5, rate: 0.95 },   // huge, booming
    fernando:    { g: 'm', lang: 'en-US', pitch: 0.65, rate: 1.1 },   // raspy and unhinged
    gabriel:     { g: 'm', lang: 'en-US', pitch: 1.3, rate: 1.25 },   // pure energy, 305
    wuttke:      { g: 'm', lang: 'en-GB', pitch: 0.9, rate: 0.9 },    // the maestro: measured
    tyler:       { g: 'm', lang: 'en-US', pitch: 0.85, rate: 0.82 },  // no stress, ever
    alejandro:   { g: 'm', lang: 'es', pitch: 1.1, rate: 1.15 },      // fast, thrill-seeker
    jauregui:    { g: 'm', lang: 'en-US', pitch: 0.8, rate: 0.9 },    // precise math teacher
    escobedo:    { g: 'm', lang: 'es', pitch: 1.0, rate: 1.1 },       // DALE!
    ruano:       { g: 'm', lang: 'es-ES', pitch: 1.05, rate: 0.95 },  // from Madrid, gentle
    weissenberg: { g: 'm', lang: 'de', pitch: 0.85, rate: 0.95 },     // the scientist
    dabalsa:     { g: 'm', lang: 'en-GB', pitch: 0.7, rate: 0.8 },    // the Shakespearean
    chris:       { g: 'm', lang: 'en-GB', pitch: 1.2, rate: 1.0 },    // spoiled rich kid
    tamayo:      { g: 'm', lang: 'en-US', pitch: 1.05, rate: 1.15 },  // cocky, quick
    astuto:      { g: 'm', lang: 'en-US', pitch: 1.1, rate: 1.2 },    // still mad about the Constitution
    holbrook:    { g: 'm', lang: 'en-AU', pitch: 0.9, rate: 0.95 },   // the geographer
  };
  const FEM_V = /female|samantha|victoria|zira|karen|moira|tessa|fiona|susan|serena|allison|\bava\b|kate|veena|hazel|heera|catherine|nicky|joanna|salli|kimberly|\bivy\b|emma|\bamy\b|aria|jenny|michelle|libby|sonia|natasha|clara|paulina|monica|helena|anna|google us english|google español$|marie|amelie|yuna|sara|elsa/i;
  const MALE_V = /\bmale\b|daniel|\balex\b|fred|david|mark|rishi|aaron|arthur|gordon|\bguy\b|ryan|eric|christopher|george|james|\btom\b|oliver|\blee\b|matthew|ralph|bruce|junior|albert|jorge|diego|juan|carlos|pablo|thomas|stefan|markus|rocko|reed|eddy|grandpa/i;
  const genderOf = (v) => (/\bfemale\b/i.test(v.name) ? 'f' : MALE_V.test(v.name) ? 'm' : FEM_V.test(v.name) ? 'f' : '?');
  const hashId = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const voiceCache = {}, voiceUse = new Map();
  // Picks the browser voice for a character: right gender, preferred accent, and spread out so
  // characters with similar profiles land on different voices.
  function voiceFor(id, prof) {
    if (voiceCache[id] !== undefined) return voiceCache[id];
    const all = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    if (!all.length) return null; // not loaded yet: try again next line
    const g = prof.g, pick = (list) => (list.length ? list[hashId(id) % list.length] : null);
    const english = all.filter((v) => /^en/i.test(v.lang));
    const gendered = (list) => list.filter((v) => genderOf(v) === g);
    const accent = all.filter((v) => v.lang.toLowerCase().startsWith(prof.lang.toLowerCase()));
    // the first group that has any voices: right gender + accent, right gender, unknown, any English.
    // Within it, take the voice the fewest characters already use, so everyone sounds different.
    const group = [gendered(accent), gendered(english), english.filter((x) => genderOf(x) === '?'), english].find((l) => l.length) || [];
    let v = null, best = Infinity;
    group.forEach((c, i) => { const n = (voiceUse.get(c) || 0) * 100 + ((i + hashId(id)) % group.length); if (n < best) { best = n; v = c; } });
    if (v) voiceUse.set(v, (voiceUse.get(v) || 0) + 1);
    return (voiceCache[id] = v);
  }
  function speak(def, text, { radio = false, interrupt = true } = {}) {
    voice.speaking = false;
    if (!def || !RF.CONFIG.ANNOUNCER || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    if (RF.audio && (RF.audio.muted || !RF.audio.ctx)) return;
    try {
      if (interrupt) speechSynthesis.cancel();
      const clean = text.replace(/\.\.\./g, ', ').replace(/DR\./g, 'doctor').replace(/MS\./g, 'miz').replace(/MR\./g, 'mister').toLowerCase();
      if (!/[a-z]/.test(clean)) return;
      const u = new SpeechSynthesisUtterance(clean);
      const id = def.id, prof = VOICES[id] || { g: 'm', lang: 'en-US', pitch: def.voicePitch || 1, rate: 1 };
      const v = voiceFor(id, prof);
      if (v) { u.voice = v; u.lang = v.lang; }
      let pitch = prof.pitch, rate = prof.rate;
      // only one voice on this device? keep girls and boys apart with pitch alone
      if (!v || genderOf(v) !== prof.g) pitch = prof.g === 'f' ? Math.max(pitch + 0.45, 1.35) : Math.min(pitch, 0.95);
      if (def.rift) { pitch *= 0.62; rate *= 0.88; }                  // rift variants: deeper, slower, wrong
      if (radio) rate *= 1.06;
      u.pitch = Math.max(0.1, Math.min(2, pitch)); u.rate = Math.max(0.5, Math.min(1.6, rate));
      u.volume = Math.min(1, (RF.CONFIG.SFX_VOLUME || 0.8) * 1.25);
      u.onend = u.onerror = () => { voice.speaking = false; voice.endT = voice.clock; };
      voice.speaking = true;
      speechSynthesis.speak(u);
    } catch (e) { voice.speaking = false; }
  }
  RF.speakAs = speak; // fights use the same voices (taunts, mid-fight lines)
  RF.VOICES = VOICES;
  try { if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', () => { for (const k in voiceCache) delete voiceCache[k]; voiceUse.clear(); }); } catch (e) { /* ok */ }

  // ---------------------------------------------------------------- ambient sound beds
  const amb = {
    nodes: [], on: new Set(),
    set(list) {
      this.stop();
      this.on = new Set(list || []);
      const A = RF.audio, c = A && A.ctx;
      if (!c) return;
      const out = c.createGain(); out.gain.value = 0.0001; out.connect(A.sfxBus);
      out.gain.linearRampToValueAtTime(1, c.currentTime + 1.2);
      this.nodes.push(out);
      const osc = (type, f, g, filt) => {
        const o = c.createOscillator(), gn = c.createGain(); o.type = type; o.frequency.value = f; gn.gain.value = g;
        let node = o; if (filt) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filt; o.connect(fl); node = fl; }
        node.connect(gn).connect(out); o.start(); this.nodes.push(o, gn);
        return o;
      };
      const noise = (type, f, g, q = 1) => {
        if (!A.noise) return;
        const s = c.createBufferSource(), fl = c.createBiquadFilter(), gn = c.createGain();
        s.buffer = A.noise; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; gn.gain.value = g;
        s.connect(fl).connect(gn).connect(out); s.start(); this.nodes.push(s, gn);
        return gn;
      };
      if (this.on.has('drone')) { osc('sawtooth', 55, 0.05, 260); osc('sawtooth', 55.6, 0.05, 260); osc('sine', 27.5, 0.12); }
      if (this.on.has('hum')) { osc('square', 120, 0.012, 600); osc('sine', 60, 0.03); }
      if (this.on.has('rain')) noise('lowpass', 1400, 0.16);
      if (this.on.has('wind')) noise('bandpass', 400, 0.12, 0.6);
      if (this.on.has('crowd')) noise('bandpass', 700, 0.1, 1.5);
      if (this.on.has('room')) noise('lowpass', 300, 0.05);
    },
    stop() { for (const n of this.nodes) { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) { /* gone */ } } this.nodes = []; this.on = new Set(); },
    score: null,
    // the rhythmic ones run off the frame clock
    tick(t) {
      const A = RF.audio; if (!A || !A.ctx) return;
      const sc = this.score && SCORES[this.score];
      if (sc && t % sc.beat === 0) {
        const step = t / sc.beat, chord = sc.chords[Math.floor(step / 8) % sc.chords.length], i = step % 8, now = A.ctx.currentTime;
        const hz = (n) => 440 * Math.pow(2, (n - 69) / 12), bus = A.master;
        A.tone('triangle', hz(chord[i % 3] + (i >= 3 && i < 6 ? 12 : 0)), now, sc.beat / 60 * 2.5, 0.03, bus);
        if (i === 0) { chord.forEach((n) => A.tone('sine', hz(n), now, sc.beat / 60 * 8, 0.016, bus)); A.tone('sine', hz(chord[0] - 12), now, sc.beat / 60 * 8, 0.045, bus); }
        if (sc.mel && i % 4 === 2) A.tone('sine', hz(sc.mel[Math.floor(step / 4) % sc.mel.length]), now, sc.beat / 60 * 3.5, 0.03, bus);
      }
      if (!this.on.size) return;
      if (this.on.has('bell') && t % 170 === 0) A.sfx('bell');
      if (this.on.has('heartbeat') && (t % 54 === 0 || t % 54 === 12)) A.tone('sine', t % 54 ? 48 : 58, A.ctx.currentTime, 0.14, 0.5, A.sfxBus, 30);
      if (this.on.has('clock') && t % 30 === 0) A.tone('square', 2400, A.ctx.currentTime, 0.015, 0.08, A.sfxBus);
      if (this.on.has('crickets') && t % 23 < 3 && t % 160 < 90) A.tone('sine', 4200 + (t % 7) * 60, A.ctx.currentTime, 0.03, 0.03, A.sfxBus);
      if (this.on.has('birds') && t % 140 === 0) A.sfx('birds');
    },
  };
  // sad = A minor (Am F C G), hope = C major (C G Am F), tense = two dark chords
  const SCORES = {
    sad: { beat: 26, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], mel: [76, 74, 72, 71, 72, 69, 71, 67] },
    hope: { beat: 22, chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], mel: [72, 74, 76, 79, 77, 76, 74, 76] },
    tense: { beat: 34, chords: [[45, 48, 52], [46, 49, 53]] },
  };
  function setMusic(name) {
    const A = RF.audio; if (!A) return;
    if (name === 'silence') { if (A.musicBus && A.ctx) A.musicBus.gain.linearRampToValueAtTime(0.0001, A.ctx.currentTime + 0.6); return; }
    if (A.musicBus && A.ctx) { A.musicBus.gain.cancelScheduledValues(A.ctx.currentTime); A.musicBus.gain.value = RF.CONFIG.MUSIC_VOLUME; }
    if (name) A.playSong(name);
  }
  function leaveStory() { amb.stop(); amb.score = null; setMusic(null); try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ok */ } }

  // ---------------------------------------------------------------- story menu
  class StoryMenuScene {
    constructor(game) {
      setMusic('court');
      this.game = game; this.t = 0;
      const prog = RF.storyProgress.get(), chs = RF.STORY.chapters;
      const items = [];
      const next = Math.min(prog.reached, chs.length - 1);
      items.push({ label: prog.reached ? 'CONTINUE: ' + chs[next].title : 'NEW STORY', desc: chs[next].sub, onSelect: () => game.setScene(new StoryScene(game, next, 'intro')) });
      if (prog.reached || prog.done) {
        const reset = { label: 'NEW STORY (ERASE PROGRESS)', desc: 'START OVER FROM THE VERY BEGINNING', onSelect: () => {
          if (!reset.armed) { reset.armed = true; reset.label = 'ARE YOU SURE? PRESS AGAIN'; reset.desc = 'ALL STORY PROGRESS WILL BE ERASED'; RF.audio.sfx('block'); return; }
          RF.storyProgress.save({ reached: 0, done: false });
          game.setScene(new StoryScene(game, 0, 'intro'));
        } };
        items.push(reset);
      }
      chs.forEach((c, i) => {
        if (i === 0) return;
        const open = i <= prog.reached;
        items.push({ label: open ? (i + '. ' + c.title) : (i + '. ??????'), desc: open ? c.sub : 'LOCKED', onSelect: () => open && game.setScene(new StoryScene(game, i, 'intro')) });
      });
      items.push({ label: 'BACK', desc: '', onSelect: () => game.setScene(new RF.TitleScene(game)) });
      this.menu = new RF.ListMenu(items);
      this.stage = new RF.StageRenderer(RF.getStage('court'));
    }
    update() {
      this.t++;
      if (RF.menuPressed(this.game.kb, 'back')) return this.game.setScene(new RF.TitleScene(this.game));
      this.menu.update(this.game.kb);
      const armed = this.menu.items.find((it) => it.armed); // moved away from the reset: disarm it
      if (armed && this.menu.items[this.menu.index] !== armed) { armed.armed = false; armed.label = 'NEW STORY (ERASE PROGRESS)'; armed.desc = 'START OVER FROM THE VERY BEGINNING'; }
    }
    render(ctx) {
      this.stage.draw(ctx, this.t);
      ctx.fillStyle = 'rgba(20,0,40,0.72)'; ctx.fillRect(0, 0, W, H);
      drawRift(ctx, 320, 120, 1.6, this.t);
      T(ctx, 'STORY MODE', W / 2, 10, { align: 'center', color: '#c080ff', outline: '#000' });
      T(ctx, 'THE LAST BELL', W / 2, 20, { scale: 3, align: 'center', color: PURPLE, outline: '#14001e' });
      const items = this.menu.items, y0 = 56, per = 13, start = Math.max(0, Math.min(items.length - per, this.menu.index - 6));
      items.forEach((it, i) => {
        if (i < start || i >= start + per) return;
        const sel = i === this.menu.index, y = y0 + (i - start) * 11;
        if (sel) { ctx.fillStyle = 'rgba(160,80,255,0.35)'; ctx.fillRect(40, y - 2, 210, 11); }
        T(ctx, it.label, 48, y, { color: sel ? '#ffffff' : (it.desc === 'LOCKED' ? '#5a4a6a' : '#c8b0e0'), outline: '#000' });
      });
      const d = items[this.menu.index].desc;
      if (d) T(ctx, d, W / 2, H - 14, { align: 'center', color: '#e0c0ff', outline: '#000' });
    }
  }

  // ---------------------------------------------------------------- shared drawing
  function drawRift(ctx, x, y, size, t) {
    const h = 46 * size, w = 16 * size;
    ctx.save();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#a050ff';
    ctx.beginPath(); ctx.ellipse(x, y, w * 2.2, h * 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.18, wob = Math.sin(t / 6 + i) * 2 * size;
      ctx.fillStyle = ['#2a0050', '#5a10a0', '#8a30e0', '#c080ff', '#ffffff'][i];
      ctx.beginPath(); ctx.ellipse(x + wob * 0.3, y, Math.max(1, w * k + wob * 0.2), h * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#14001e'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.25, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 10; i++) {
      const a = t / 9 + i * 0.63, r = (h * 1.2) * (1 - ((t + i * 7) % 40) / 40);
      ctx.fillStyle = i % 2 ? '#ffffff' : '#c080ff';
      ctx.fillRect(Math.round(x + Math.cos(a) * r * 0.5), Math.round(y + Math.sin(a) * r), 2, 2);
    }
    ctx.restore();
  }
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  // Full-screen insert shots.
  const INSERTS = {
    // the school at night, from the street; purple light rising from the roof
    school(ctx, t, o) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05020e'); g.addColorStop(1, o.rift ? '#3a0f50' : '#141028');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) R(ctx, '#ffffff', (i * 97) % W, (i * 53) % 90 + 30, 1, 1);
      if (o.rift) { ctx.globalAlpha = 0.35 + Math.sin(t / 10) * 0.1; const rg = ctx.createRadialGradient(192, 70, 4, 192, 70, 120); rg.addColorStop(0, '#c080ff'); rg.addColorStop(1, 'rgba(160,80,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      R(ctx, '#0c0a16', 60, 82, 264, 90); R(ctx, '#0c0a16', 150, 56, 84, 30);              // building + clock tower
      ctx.fillStyle = '#e8e0c0'; ctx.beginPath(); ctx.arc(192, 70, 8, 0, Math.PI * 2); ctx.fill();
      R(ctx, '#111', 191, 63, 1, 7); R(ctx, '#111', 191, 63, 1, 7);                         // midnight
      for (let y = 92; y < 164; y += 16) for (let x = 72; x < 316; x += 20) R(ctx, ((x * 7 + y * 3) % 11 < 2) ? '#ffd890' : '#1a1628', x, y, 10, 9);
      T(ctx, 'TERRAMANIA HIGH', 192, 176, { align: 'center', color: '#a898b8', outline: '#000' });
      R(ctx, '#08060e', 0, 186, W, 40);                                                      // street
      if (o.rift) for (let i = 0; i < 8; i++) R(ctx, '#e0b0ff', 192 + Math.sin(t / 7 + i) * 30, 56 - ((t * 1.5 + i * 13) % 50), 2, 2);
    },
    // a chalkboard: the equation writes itself
    equation(ctx, t) {
      R(ctx, '#3a2414', 0, 0, W, H); R(ctx, '#1e3a2a', 10, 10, W - 20, H - 20);
      ctx.globalAlpha = 0.07; for (let i = 0; i < 30; i++) R(ctx, '#ffffff', (i * 41) % W, (i * 29) % H, 40, 2); ctx.globalAlpha = 1;
      const steps = ['', 'TERRAMANIA(U) DU', '= EVERY UNIVERSE', '= ONE ANSWER', '= ME.'];
      const n = Math.min(steps.length, Math.floor(t / 26) + 1);
      ctx.strokeStyle = '#f0f0e8'; ctx.lineWidth = 3; ctx.beginPath();                         // a big integral sign
      ctx.moveTo(84, 56); ctx.bezierCurveTo(100, 30, 96, 30, 84, 100); ctx.bezierCurveTo(72, 170, 68, 170, 84, 146); ctx.stroke();
      T(ctx, 'INF', 100, 44, { color: '#f0f0e8' }); T(ctx, '0', 92, 150, { color: '#f0f0e8' });
      for (let i = 1; i < n; i++) T(ctx, steps[i], 120 + (i > 1 ? 40 : 0), 70 + (i - 1) * 24, { scale: 2, color: i === 4 ? '#e0b0ff' : '#f0f0e8' });
      R(ctx, '#ffffff', 300 + Math.sin(t / 3) * 4, 60 + (n - 1) * 24, 6, 2);                 // the chalk
    },
    // the school bell, ringing and ringing
    bell(ctx, t) {
      R(ctx, '#2a2420', 0, 0, W, H); R(ctx, '#3a322c', 0, 0, W, 60);
      const a = Math.sin(t / 2.2) * 0.12, cx = 192, cy = 70;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 30, 52, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#c8962a'; ctx.beginPath(); ctx.arc(0, 30, 48, Math.PI, 0); ctx.fill();
      R(ctx, '#e8c050', -30, 0, 10, 26); R(ctx, '#8a6418', -48, 26, 96, 6);
      ctx.fillStyle = '#5a4010'; ctx.beginPath(); ctx.arc(Math.sin(t / 1.1) * 30, 36, 7, 0, Math.PI * 2); ctx.fill(); // the clapper
      ctx.restore();
      ctx.strokeStyle = '#ffe080'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const r = 60 + ((t * 2 + i * 20) % 60); ctx.globalAlpha = Math.max(0, 1 - r / 120); ctx.beginPath(); ctx.arc(cx, cy + 30, r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
      if (t % 20 < 12) T(ctx, 'RIIIIIING', 192, 130, { scale: 3, align: 'center', color: ['#fff6b0', '#ffd040', '#c08010'], outline: '#000' });
    },
    // a clock reaching midnight
    clock(ctx, t, o) {
      R(ctx, '#d8d4c4', 0, 0, W, H);
      const cx = 192, cy = 112, p = Math.min(1, t / (o.frames || 90));
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4f0e4'; ctx.beginPath(); ctx.arc(cx, cy, 64, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; R(ctx, '#111', cx + Math.sin(a) * 56 - 1, cy - Math.cos(a) * 56 - 1, 3, 3); }
      const hand = (ang, len, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ang) * len, cy - Math.cos(ang) * len); ctx.stroke(); };
      const m = (59 + p) / 60 * Math.PI * 2;
      hand(Math.PI * 2 * (11 + (59 + p) / 60) / 12, 34, 4, '#111'); hand(m, 52, 3, '#111'); hand(Math.floor(t / 4) / 60 * Math.PI * 2, 58, 1, '#c01818');
      ctx.lineWidth = 1;
      if (p >= 1 && t % 20 < 10) T(ctx, '12:00', cx, cy + 74, { scale: 2, align: 'center', color: '#c01818', outline: '#000' });
    },
    // a walkie-talkie, crackling
    radio(ctx, t) {
      R(ctx, '#1a1820', 0, 0, W, H);
      ctx.save(); ctx.translate(192, 120); ctx.scale(6, 6); if (RF.drawWalkie) RF.drawWalkie(ctx, 0, 10, 1); ctx.restore();
      ctx.strokeStyle = '#a0e0ff';
      for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.7 - i * 0.15; ctx.beginPath(); ctx.arc(192, 40, 20 + i * 14 + (t % 14), Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
      ctx.globalAlpha = 1;
    },
    // Holbrook's map: the three anchors
    map(ctx, t) {
      R(ctx, '#c8b48a', 0, 0, W, H); R(ctx, '#b8a07a', 12, 12, W - 24, H - 24);
      ctx.strokeStyle = '#6a5030'; ctx.setLineDash([4, 3]); ctx.strokeRect(150, 90, 84, 50); ctx.setLineDash([]);
      T(ctx, 'TERRAMANIA HIGH', 192, 110, { align: 'center', color: '#4a3020' });
      const pts = [[70, 54, 'THE CLIFFS'], [300, 64, 'THE GOLF COURSE'], [200, 168, 'THE MATH WING']];
      pts.forEach(([x, y, n], i) => {
        if (t < 20 + i * 24) return;
        const pulse = 6 + Math.sin(t / 5) * 2;
        ctx.strokeStyle = '#7020d0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - pulse, y - pulse); ctx.lineTo(x + pulse, y + pulse); ctx.moveTo(x + pulse, y - pulse); ctx.lineTo(x - pulse, y + pulse); ctx.stroke(); ctx.lineWidth = 1;
        T(ctx, n, x, y + 12, { align: 'center', color: '#3a1060', outline: '#e0d0b0' });
      });
    },
    // a class photo: the whole school, in rows (o.sepia for an old one)
    photo(ctx, t, o) {
      R(ctx, '#2a2018', 0, 0, W, H); R(ctx, '#e8e0cc', 40, 34, W - 80, 156); R(ctx, o.sepia ? '#8a7258' : '#7a8aa0', 48, 42, W - 96, 128);
      const ids = (o.ids || ['sirven', 'brady', 'jauregui', 'wuttke', 'landa', 'dabalsa', 'nicholas', 'anthony', 'simon', 'mikey', 'bandy', 'gabriel', 'fernando', 'tyler', 'alejandro', 'chris']).filter((id) => RF.getCharacter(id));
      const row1 = ids.slice(0, 8), row2 = ids.slice(8);
      ctx.save(); if (o.sepia && 'filter' in ctx) ctx.filter = 'sepia(0.85)';
      [row2, row1].forEach((row, r) => row.forEach((id, i) => {
        const d = RF.getCharacter(id), x = 72 + i * (240 / Math.max(1, row.length - 1)), y = r ? 166 : 140, k = 0.55;
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k); RF.createSprite(d).draw(ctx, 'idle', 0, 0, 0, 1); ctx.restore();
      }));
      ctx.restore(); ctx.filter = 'none';
      T(ctx, o.text || 'TERRAMANIA HIGH', W / 2, 176, { align: 'center', color: '#3a2a1a' });
    },
    // a black card with words
    card(ctx, t, o) {
      R(ctx, '#000', 0, 0, W, H);
      ctx.globalAlpha = Math.min(1, t / 20);
      T(ctx, o.text || '', W / 2, 100, { scale: 2, align: 'center', color: o.color || '#e0d0ff' });
      ctx.globalAlpha = 1;
    },
  };

  // ---------------------------------------------------------------- the scene player
  class StoryScene {
    constructor(game, index, part, opts = {}) {
      this.game = game; this.index = index; this.part = part;
      this.ch = RF.STORY.chapters[index];
      this.steps = (part === 'intro' ? this.ch.intro : this.ch.outro) || [];
      this.hero = opts.hero || null;
      this.i = -1; this.t = 0; this.stepT = 0;
      this.actors = {}; this.bgDef = null; this.stage = null;
      this.cam = { x: W / 2, y: H / 2, z: 1, rot: 0, tx: W / 2, ty: H / 2, tz: 1, trot: 0, k: 1 };
      this.shot = { type: 'wide' }; this.handheld = 0.4;
      this.shake = 0; this.flash = 0; this.tintCol = null; this.fadeA = part === 'intro' ? 1 : 0;
      this.shards = []; this.riftFx = null; this.cur = null; this.flies = [];
      this.trans = null; this.snap = null;
      if (part === 'intro') RF.storyProgress.reach(index);
      this.next();
    }

    resolve(k) { return k === '$hero' ? this.hero : k; }
    actor(k) { return this.actors[this.resolve(k)]; }
    floorY() { return this.bgDef ? this.bgDef.floorY : 204; }

    next() {
      for (;;) {
        this.i++; this.stepT = 0;
        const s = this.steps[this.i];
        if (!s) return this.finish();
        if (this.instant(s)) continue;
        this.cur = s;
        if (s.say || s.narrate || s.title) { this.typed = 0; this.text = s.say ? s.say[1] : s.narrate || s.title[1]; }
        if (s.say) {
          const o = s.say[2] || {}, a = this.actor(s.say[0]);
          if (o.shot) this.setShot(Array.isArray(o.shot) ? o.shot : [o.shot, s.say[0]]);
          if (a) a.talk = true;
          if (o.radio) RF.audio.sfx('pa');
          speak(a ? a.def : RF.getCharacter(this.resolve(s.say[0])), s.say[1], o);
        }
        if (s.narrate) RF.audio.sfx('paper');
        if (s.walk || s.dash) {
          const w = s.walk || s.dash, a = this.actor(w[0]);
          if (a) { a.from = a.x; a.to = w[1]; a.wt = 0; a.wlen = w[2] || (s.dash ? 10 : 40); a.facing = a.to >= a.x ? 1 : -1; a.dashing = !!s.dash; if (s.dash) RF.audio.sfx('whoosh'); }
          if (w[3] === 'async') continue;
        }
        if (s.rise) { const a = this.actor(s.rise[0]); if (a) { a.yFrom = a.y; a.yTo = s.rise[1]; a.yt = 0; a.ylen = s.rise[2] || 40; } if (s.rise[3] === 'async') continue; }
        if (s.fly) {
          const a = this.actor(s.fly[0]);
          if (a) this.flies.push({ x: a.x + a.facing * 16, y: a.y + a.def.body.height * 0.55, from: a.x + a.facing * 16, to: s.fly[1], art: s.fly[2], len: s.fly[3] || 30, t: 0, dir: Math.sign(s.fly[1] - a.x) || 1 });
          RF.audio.sfx('whoosh');
        }
        if (s.choose) { this.picks = (Array.isArray(s.choose) ? s.choose : RF.STORY.heroes).filter((id) => RF.getCharacter(id)); this.pick = 0; }
        if (s.credits) { this.creditY = H - 60; setMusic('menu'); amb.set(null); }
        return;
      }
    }

    setShot(spec, dutch = 0) {
      const sh = Array.isArray(spec) ? spec : [spec];
      this.shot = { type: sh[0], a: sh[1] && this.resolve(sh[1]), b: sh[2] && this.resolve(sh[2]), dutch };
      this.insert = null;
      this.frameShot(true);
    }
    // aim the camera for the current shot (cut = jump straight there)
    frameShot(cut) {
      const s = this.shot, c = this.cam, fy = this.floorY(), A = this.actors[s.a], B = this.actors[s.b];
      let x = W / 2, y = H / 2, z = 1;
      const head = (a) => fy - a.y - a.def.body.height * 0.86;
      if (s.type === 'medium' && A) { z = 2.2; x = A.x; y = fy - A.y - A.def.body.height * 0.66; }
      if (s.type === 'close' && A) { z = 4.2; x = A.x + A.facing * 2; y = head(A) + 5; }
      if (s.type === 'low' && A) { z = 1.7; x = A.x; y = fy - A.y - A.def.body.height * 0.72; }
      if ((s.type === 'two') && A && B) { x = (A.x + B.x) / 2; z = Math.max(1, Math.min(2.2, 300 / (Math.abs(A.x - B.x) + 110))); y = fy - 46; }
      if (s.type === 'ots' && B) { z = 2.7; x = B.x + (A && A.x < B.x ? -12 : 12); y = head(B) + 14; }
      c.tx = x; c.ty = y; c.tz = z; c.trot = s.dutch || 0;
      if (cut) { c.x = x; c.y = y; c.z = z; c.rot = c.trot; }
    }

    instant(s) {
      if (s.bg) { this.bgDef = s.bg === 'black' ? null : RF.getStage(s.bg); this.stage = this.bgDef ? new RF.StageRenderer(this.bgDef) : null; return true; }
      if (s.music) { setMusic(s.music); return true; }
      if (s.sfx) { RF.audio.sfx(s.sfx); return true; }
      if (s.amb !== undefined) { amb.set(s.amb); return true; }
      if (s.cast) {
        for (const [k, v] of Object.entries(s.cast)) {
          const id = this.resolve(v[0]); let def = RF.getCharacter(id); if (!def) continue;
          const o = v[3] || {};
          if (o.rift) def = RF.riftDef(def);
          this.actors[k === '$hero' ? id : k] = { def, sprite: RF.createSprite(def), x: v[1], y: o.y || 0, facing: v[2] || 1, anim: o.anim || 'idle', rift: !!o.rift, ghost: !!o.ghost, seed: Math.random() * 100, stage: o.bg ? new RF.StageRenderer(RF.getStage(o.bg)) : null };
        }
        return true;
      }
      if (s.remove) { delete this.actors[s.remove]; return true; }
      if (s.score !== undefined) { amb.score = s.score; return true; }
      if (s.flashback !== undefined) { this.flashback = s.flashback; if (s.flashback) RF.audio.sfx('whoosh'); return true; }
      if (s.weather !== undefined) { this.weather = s.weather; return true; }
      if (s.fold) { const a = this.actor(s.fold); if (a) { a.foldT = 1; RF.audio.sfx('arcane'); } return true; }
      if (s.appear) { const a = this.actor(s.appear); if (a) { a.appearT = 1; RF.audio.sfx('arcane'); this.flash = 4; } return true; }
      if (s.clear) { this.actors = {}; this.riftFx = null; this.shards = []; this.flies = []; this.insert = null; return true; }
      if (s.act) { const a = this.actor(s.act[0]); if (a) { a.anim = s.act[1]; a.at = this.t; } return true; }
      if (s.face) { const a = this.actor(s.face[0]); if (a) a.facing = s.face[1]; return true; }
      if (s.shake) { this.shake = s.shake; return true; }
      if (s.flash) { this.flash = s.flash; return true; }
      if (s.tint !== undefined) { this.tintCol = s.tint; return true; }
      if (s.handheld !== undefined) { this.handheld = s.handheld; return true; }
      if (s.shot) { this.setShot(s.shot, s.dutch); return true; }
      if (s.insert) { this.insert = { name: s.insert, t: 0, o: s }; return true; }
      if (s.push) { this.cam.tz = this.cam.z + s.push[0]; this.cam.k = 2 / (s.push[1] || 60); return true; }
      if (s.pan) { this.cam.tx = this.cam.x + s.pan[0]; this.cam.k = 2 / (s.pan[1] || 60); return true; }
      if (s.dissolve) { this.trans = { kind: 'dissolve', t: 0, len: s.dissolve, grab: true }; return true; }
      if (s.whip) { this.trans = { kind: 'whip', t: 0, len: 10, dir: s.whip === -1 ? -1 : 1 }; RF.audio.sfx('whoosh'); return true; }
      if (s.rift) { this.riftFx = { x: s.rift[0], size: s.rift[1] || 1, t: 0 }; RF.audio.sfx('arcane'); this.flash = 4; return true; }
      if (s.riftOff) { if (this.riftFx) this.riftFx.closing = 1; RF.audio.sfx('boom'); return true; }
      if (s.hop) { const a = this.actor(s.hop); if (a) a.hopT = 1; return true; }
      if (s.impact) {
        const a = this.actor(s.impact[0]), p = s.impact[1] || 1;
        if (a) {
          a.hitT = 8; a.x += (a.facing > 0 ? -1 : 1) * 6 * p; a.anim = 'hit'; a.at = this.t;
          for (let i = 0; i < 10; i++) this.shards.push({ x: a.x, y: a.y + a.def.body.height * 0.6, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 3, c: i % 2 ? '#ffffff' : '#ffd040', life: 14 });
        }
        this.shake = Math.max(this.shake, 6 * p); RF.audio.sfx(p > 1 ? 'heavy' : 'hit');
        return true;
      }
      if (s.shatter) {
        const a = this.actor(s.shatter);
        if (a) {
          for (let i = 0; i < 44; i++) this.shards.push({ x: a.x + (Math.random() - 0.5) * 24, y: a.y + Math.random() * a.def.body.height, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 4 + 1, c: PURPLE[i % 4], life: 50 + Math.random() * 30 });
          delete this.actors[this.resolve(s.shatter)];
          RF.audio.sfx('crack'); RF.audio.sfx('arcane'); this.flash = 6; this.shake = 8;
        }
        return true;
      }
      return false;
    }

    finish() {
      this.cur = null;
      const ch = this.ch, game = this.game;
      if (this.part === 'intro' && ch.fight) { leaveStory(); return this.startFight(); }
      const n = this.index + 1;
      if (this.part === 'intro' && !ch.fight && ch.outro) return game.setScene(new StoryScene(game, this.index, 'outro', { hero: this.hero }));
      if (n >= RF.STORY.chapters.length) { leaveStory(); RF.storyProgress.finish(); return game.setScene(new RF.TitleScene(game)); }
      RF.storyProgress.reach(n);
      game.setScene(new StoryScene(game, n, 'intro', { hero: this.hero }));
    }

    startFight() {
      const f = this.ch.fight, hero = this.resolve(f.play) || RF.STORY.heroes[0];
      const p1 = RF.getCharacter(hero), p2 = RF.riftDef(RF.getCharacter(f.vs));
      if (f.name) p2.name = f.name;
      this.game.setScene(new RF.VersusScene(this.game, {
        p1, p2, stage: f.stage, cpu: true, cpuLevel: f.cpu || 'normal', boss: f.boss || 0,
        story: { index: this.index, mid: f.mid, hero: this.hero || hero },
      }));
    }

    // ---- update ----
    update() {
      this.t++; this.stepT++; voice.clock = this.t;
      amb.tick(this.t);
      const kb = this.game.kb, s = this.cur, c = this.cam;
      if (this.fadeA > 0 && !(s && s.fade)) this.fadeA = Math.max(0, this.fadeA - 0.05);
      if (this.shake > 0) this.shake--;
      if (this.flash > 0) this.flash--;
      if (this.insert) this.insert.t++;
      if (this.trans && ++this.trans.t > this.trans.len) { this.trans = null; this.snap = null; }
      if (this.shot.a || this.shot.b) this.frameShot(false);
      const k = Math.min(1, c.k); c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.z += (c.tz - c.z) * k; c.rot += (c.trot - c.rot) * k;
      if (c.k < 1) c.k = Math.max(c.k, 0.02);
      if (this.riftFx) { this.riftFx.t++; if (this.riftFx.closing && (this.riftFx.closing += 0.05) > 2) this.riftFx = null; }
      for (const p of this.shards) { p.x += p.vx; p.y += p.vy; if (!p.float) p.vy -= 0.25; if (p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.7; } p.life--; }
      this.shards = this.shards.filter((p) => p.life > 0);
      for (const f of this.flies) { f.t++; f.x = f.from + (f.to - f.from) * Math.min(1, f.t / f.len); }
      this.flies = this.flies.filter((f) => f.t <= f.len);
      for (const a of Object.values(this.actors)) {
        if (a.wlen) { a.wt++; const u = Math.min(1, a.wt / a.wlen); a.x = a.from + (a.to - a.from) * (a.dashing ? 1 - (1 - u) * (1 - u) : u); if (u >= 1) { a.wlen = 0; a.dashing = false; } }
        if (a.ylen) { a.yt++; const u = Math.min(1, a.yt / a.ylen); a.y = a.yFrom + (a.yTo - a.yFrom) * u; if (u >= 1) a.ylen = 0; }
        if (a.hopT) { a.hopT++; a.y = Math.max(0, Math.sin((a.hopT / 20) * Math.PI) * 16); if (a.hopT > 20) { a.hopT = 0; a.y = 0; } }
        if (a.hitT) a.hitT--;
        if (a.foldT || (a.appearT && a.appearT < 50)) {
          if (a.foldT) a.foldT++; else a.appearT++;
          if (this.t % 2 === 0) this.shards.push({ x: a.x + (Math.random() - 0.5) * 26, y: a.y + Math.random() * a.def.body.height, vx: (Math.random() - 0.5) * 0.6, vy: 1.2 + Math.random(), c: PURPLE[(Math.random() * 4) | 0], life: 40, float: true });
        }
      }
      for (const [k, a] of Object.entries(this.actors)) if (a.foldT > 60) delete this.actors[k];
      if (RF.menuPressed(kb, 'back') && !(s && s.choose)) {
        if (!this.hero && this.steps.some((st) => st.choose)) this.hero = RF.STORY.heroes[0];
        this.i = this.steps.length; return this.finish();
      }
      if (!s) return;
      const ok = RF.menuPressed(kb, 'confirm'), auto = this.game.manualStep;
      if (s.say || s.narrate || s.title) {
        this.typed += 1.1;
        // Lines play on their own like a film: the next one waits until this one has been
        // fully typed, fully SPOKEN, and there was time to read it. CONFIRM finishes the
        // typing; a second press moves on.
        const done = this.typed >= this.text.length;
        const read = (s.title ? 150 : s.narrate ? 100 : 70) + this.text.length * 2.4;
        const spoken = !voice.speaking && voice.clock - voice.endT > 20;
        const stuck = this.stepT > 120 + this.text.length * 9; // a voice that never reports finishing
        if (ok && !done) this.typed = this.text.length;
        else if ((ok && done) || (done && this.stepT > read && (spoken || stuck)) || (auto && this.stepT > 6)) {
          if (ok) try { speechSynthesis.cancel(); } catch (e) { /* ok */ }
          const a = s.say && this.actor(s.say[0]); if (a) a.talk = false; this.next();
        }
        return;
      }
      if (s.walk || s.dash) { const a = this.actor((s.walk || s.dash)[0]); if (!a || !a.wlen) this.next(); return; }
      if (s.rise) { const a = this.actor(s.rise[0]); if (!a || !a.ylen) this.next(); return; }
      if (s.fly) { if (!this.flies.length) { RF.audio.sfx('hit'); this.next(); } return; }
      if (s.wait) { if (this.stepT >= s.wait || (auto && this.stepT > 4)) this.next(); return; }
      if (s.fade) { const [dir, n] = s.fade; this.fadeA = dir === 'out' ? Math.min(1, this.stepT / (n || 30)) : Math.max(0, 1 - this.stepT / (n || 30)); if (this.stepT >= (n || 30)) this.next(); return; }
      if (s.choose) {
        if (RF.menuPressed(kb, 'left')) { this.pick = (this.pick + this.picks.length - 1) % this.picks.length; RF.audio.sfx('move'); }
        if (RF.menuPressed(kb, 'right')) { this.pick = (this.pick + 1) % this.picks.length; RF.audio.sfx('move'); }
        if (ok || (auto && this.stepT > 8)) {
          this.hero = this.picks[this.pick]; RF.audio.sfx('select');
          const def = RF.getCharacter(this.hero);
          this.actors[this.hero] = { def, sprite: RF.createSprite(def), x: 230, y: 0, facing: 1, anim: 'victory', seed: 1 };
          this.next();
        }
        return;
      }
      if (s.credits) {
        this.creditY -= ok ? 6 : 0.7;
        if (this.creditY < -(RF.CHARACTERS.length * 74 + 300) || (auto && this.stepT > 30)) this.next();
        return;
      }
      this.next();
    }

    // ---- render ----
    drawActors(ctx, fy, only) {
      const list = Object.values(this.actors).filter((a) => (only ? only.includes(a) : !a.stage)).sort((a, b) => a.x - b.x); // actors with their own stage only appear in split screens
      for (const a of list) {
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(a.x, fy + 1, 14, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        let anim = a.anim, frame = 0;
        if (a.wlen) { anim = a.dashing ? 'jump' : 'walk'; frame = a.dashing ? 0.5 : (a.wt / 5) % 4; }
        else if (a.ylen) { anim = 'jump'; frame = 0.3; }
        else if (anim === 'idle') frame = ((this.t + a.seed) / (a.def.idleRate || 12)) % (a.def.idleFrames || 2);
        else if (anim === 'victory' || anim === 'taunt' || anim === 'dazed') frame = Math.floor((this.t + a.seed) / 16) % 2;
        else if (['special', 'heavy', 'light', 'uppercut', 'throw'].includes(anim)) frame = Math.min(1, (this.t - (a.at || 0)) / 8);
        const bob = a.talk && anim === 'idle' && this.t % 16 < 8 ? 1 : 0;
        if (a.dashing) for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.25 / i; a.sprite.draw(ctx, anim, frame, a.x - a.facing * i * 10, fy - a.y, a.facing); }
        ctx.globalAlpha = a.foldT ? Math.max(0, 1 - a.foldT / 60) : a.appearT && a.appearT < 50 ? a.appearT / 50 : a.ghost ? 0.55 : 1;
        a.sprite.draw(ctx, anim, frame, a.x, fy - a.y - bob, a.facing, a.hitT > 4 ? '#ffffff' : a.ghost ? '#2a2038' : (a.foldT && this.t % 6 < 3) ? '#c080ff' : null);
        ctx.globalAlpha = 1;
        if (a.rift) RF.MOVE_FX.riftAura({ x: a.x, y: a.y, body: a.def.body, state: 'idle' }, ctx, fy, this.t);
      }
    }

    drawWorld(ctx, cam, opts = {}) {
      const fy = this.floorY(), z = cam.z;
      ctx.save();
      const hh = this.handheld * (z > 1.4 ? 1.5 : 0.6);
      const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
      const hx = Math.sin(this.t / 47) * hh * 2, hy = Math.sin(this.t / 31) * hh * 1.5;
      // keep the stage edges out of frame
      const half = W / 2 / z, halfH = H / 2 / z;
      const cx = Math.max(half, Math.min(W - half, cam.x)), cy = Math.max(halfH, Math.min(H - halfH, cam.y));
      ctx.translate(W / 2 + sx + hx, H / 2 + sy + hy);
      if (cam.rot) ctx.rotate(cam.rot);
      ctx.scale(z, z * (opts.low ? 1.18 : 1));
      ctx.translate(-cx, -cy);
      const st = opts.stage || this.stage;
      if (st) {
        if (z >= 2 && 'filter' in ctx) ctx.filter = `blur(${z >= 2.8 ? 2 : 1}px)`; // depth of field
        st.draw(ctx, this.t);
        ctx.filter = 'none';
      } else { ctx.fillStyle = '#05000a'; ctx.fillRect(-W, -H, W * 3, H * 3); }
      if (this.tintCol) { ctx.fillStyle = this.tintCol; ctx.fillRect(-W, -H, W * 3, H * 3); }
      if (this.riftFx) { const r = this.riftFx, k = r.closing ? Math.max(0, 1 - r.closing / 2) : Math.min(1, r.t / 16); drawRift(ctx, r.x, fy - 50 * r.size, r.size * k, this.t); }
      this.drawActors(ctx, fy, opts.only);
      for (const f of this.flies) { const art = RF.PROJECTILE_ART[f.art]; if (art) art(ctx, Math.round(f.x), Math.round(fy - f.y), f.t, f.dir, { w: 14, h: 10, cfg: {} }, fy); }
      for (const p of this.shards) { ctx.globalAlpha = Math.min(1, p.life / 30); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(fy - p.y), 2, 2); }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    render(ctx) {
      const s = this.cur;
      ctx.imageSmoothingEnabled = false;
      if (s && s.credits) return this.drawCredits(ctx);
      // dissolve: remember the outgoing frame before drawing the new one
      if (this.trans && this.trans.grab) { const [cv, c2] = RF.util.makeCanvas(W, H); c2.drawImage(ctx.canvas, 0, 0, W, H); this.snap = cv; this.trans.grab = false; }
      const sh = this.shot, fy = this.floorY();
      if (this.insert) {
        INSERTS[this.insert.name](ctx, this.insert.t, this.insert.o);
        if (this.shake) ctx.translate(0, 0);
      } else if (sh.type === 'split' && this.actors[sh.a] && this.actors[sh.b]) {
        [sh.a, sh.b].forEach((k, i) => {
          const a = this.actors[k];
          ctx.save(); ctx.beginPath(); ctx.rect(i * W / 2, 0, W / 2, H); ctx.clip();
          ctx.translate(i ? W / 4 : -W / 4, 0);
          this.drawWorld(ctx, { x: a.x, y: fy - a.y - a.def.body.height * 0.8, z: 2.6, rot: 0 }, { stage: a.stage, only: [a] });
          ctx.restore();
        });
        R(ctx, '#000', W / 2 - 1, 0, 3, H);
      } else if (sh.type === 'xcu' && this.actors[sh.a]) {
        const a = this.actors[sh.a], band = 64, top = H / 2 - band / 2, s7 = 5;
        R(ctx, '#000', 0, 0, W, H);
        ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, band); ctx.clip();
        if (this.stage) { if ('filter' in ctx) ctx.filter = 'blur(3px) brightness(0.5)'; ctx.drawImage(this.stage.bg, 0, 0, W, H); ctx.filter = 'none'; }
        ctx.translate(W / 2 - a.facing * 8, H / 2 + a.def.body.height * 0.925 * s7); ctx.scale(s7, s7);
        a.sprite.draw(ctx, 'idle', 0, 0, 0, a.facing);
        ctx.restore();
        if (a.rift || a.def.id === 'lopez') { ctx.globalAlpha = 0.18 + Math.sin(this.t / 6) * 0.08; R(ctx, '#a050ff', 0, top, W, band); ctx.globalAlpha = 1; }
      } else {
        this.drawWorld(ctx, this.cam, { low: sh.type === 'low' });
        if (sh.type === 'ots' && this.actors[sh.a]) { // the foreground shoulder, dark and out of focus
          const a = this.actors[sh.a], B = this.actors[sh.b], left = !B || a.x < B.x, k = 3.6;
          ctx.save(); if ('filter' in ctx) ctx.filter = 'brightness(0.25) blur(1.5px)';
          ctx.translate(left ? 46 : W - 46, H + a.def.body.height * k * 0.42); ctx.scale(k, k);
          a.sprite.draw(ctx, 'idle', 0, 0, 0, left ? 1 : -1);
          ctx.restore(); ctx.filter = 'none';
        }
        if (sh.type === 'low') { const g = ctx.createLinearGradient(0, 0, 0, H * 0.4); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      }
      // transitions
      if (this.trans && this.snap && this.trans.kind === 'dissolve') { ctx.globalAlpha = Math.max(0, 1 - this.trans.t / this.trans.len); ctx.drawImage(this.snap, 0, 0); ctx.globalAlpha = 1; }
      if (this.trans && this.trans.kind === 'whip') {
        const u = this.trans.t / this.trans.len, a = Math.sin(u * Math.PI);
        for (let i = 0; i < 26; i++) { ctx.globalAlpha = 0.5 * a; R(ctx, i % 3 ? '#ffffff' : '#c0b0d0', ((i * 53 + this.trans.t * 60 * this.trans.dir) % (W + 80)) - 40, (i * 37) % H, 70, 1 + (i % 2)); }
        ctx.globalAlpha = 0.7 * a; R(ctx, '#000', 0, 0, W, H); ctx.globalAlpha = 1;
      }
      if (this.weather === 'rain') {
        ctx.strokeStyle = 'rgba(170,190,230,0.45)';
        for (let i = 0; i < 90; i++) { const x = (i * 83 + this.t * 3) % (W + 40) - 20, y = (i * 47 + this.t * 9) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); }
        ctx.fillStyle = 'rgba(20,30,60,0.25)'; ctx.fillRect(0, 0, W, H);
      }
      if (this.flashback) { // an old memory: sepia, soft, scratched
        ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = '#a07848'; ctx.fillRect(0, 0, W, H); ctx.restore();
        ctx.fillStyle = 'rgba(255,240,210,0.12)'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 3; i++) R(ctx, 'rgba(255,255,240,0.25)', (this.t * 37 + i * 131) % W, 0, 1, H);
      }
      // film look: vignette, grain, flash
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.06; for (let i = 0; i < 70; i++) R(ctx, (i + this.t) % 2 ? '#ffffff' : '#000', (i * 7919 + this.t * 131) % W, (i * 3571 + this.t * 71) % H, 1, 1); ctx.globalAlpha = 1;
      if (this.flash) { ctx.fillStyle = `rgba(255,240,255,${this.flash * 0.08})`; ctx.fillRect(0, 0, W, H); }
      // letterbox
      R(ctx, '#000', 0, 0, W, BAR); R(ctx, '#000', 0, H - BAR, W, BAR);
      if (!(s && s.choose)) T(ctx, 'ESC: SKIP', W - 6, 4, { align: 'right', color: '#3a2a4a' });
      if (s && s.say) this.drawSubtitle(ctx, s);
      if (s && s.narrate) this.drawCaption(ctx, this.text.slice(0, this.typed | 0));
      if (s && s.title) this.drawTitle(ctx, s.title);
      if (s && s.choose) this.drawChooser(ctx);
      if (this.fadeA > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fadeA})`; ctx.fillRect(0, 0, W, H); }
    }

    drawSubtitle(ctx, s) {
      const key = this.resolve(s.say[0]), a = this.actors[key], def = a ? a.def : RF.getCharacter(key);
      if (!def) return;
      const radio = s.say[2] && s.say[2].radio, rift = a && a.rift;
      const col = rift ? '#c080ff' : radio ? '#ffd030' : '#ffb070';
      const name = def.name.toUpperCase() + (radio ? ' (RADIO)' : ''); // rift variants are already named RIFT ...
      const lines = RF.font.wrap(this.text.slice(0, this.typed | 0), 60).slice(0, 3);
      const y0 = H - BAR + 3;
      T(ctx, name, W / 2, y0 - (lines.length > 2 ? 9 : 0), { align: 'center', color: col, outline: '#000' });
      lines.forEach((l, i) => T(ctx, l, W / 2, y0 + 9 + i * 9 - (lines.length > 2 ? 9 : 0), { align: 'center', color: '#ffffff', outline: '#000' }));
      if (radio && this.t % 8 < 4) { ctx.globalAlpha = 0.1; R(ctx, '#a0e0ff', 0, BAR, W, H - BAR * 2); ctx.globalAlpha = 1; }
    }

    drawCaption(ctx, text) {
      const lines = RF.font.wrap(text, 56);
      lines.forEach((l, i) => T(ctx, l, W / 2, 9 + i * 9, { align: 'center', color: '#d8c8f0', outline: '#000' }));
    }

    drawTitle(ctx, [small, big]) {
      const k = Math.min(1, this.stepT / 24);
      ctx.fillStyle = `rgba(0,0,0,${0.55 * k})`; ctx.fillRect(0, 76, W, 72);
      ctx.fillStyle = '#a050ff'; ctx.fillRect(W / 2 - 130 * k, 80, 260 * k, 1); ctx.fillRect(W / 2 - 130 * k, 143, 260 * k, 1);
      T(ctx, small, W / 2, 88, { align: 'center', color: '#c8b0e0', outline: '#000' });
      T(ctx, big.slice(0, Math.ceil(this.typed / 1.2)), W / 2, 102, { scale: 3, align: 'center', color: PURPLE, outline: '#14001e' });
    }

    drawChooser(ctx) {
      ctx.fillStyle = 'rgba(10,0,20,0.88)'; ctx.fillRect(0, 0, W, H);
      T(ctx, 'WHO STEPS THROUGH THE RIFT?', W / 2, 32, { scale: 2, align: 'center', color: PURPLE, outline: '#000' });
      const n = this.picks.length, per = 7, start = Math.max(0, Math.min(n - per, this.pick - 3));
      for (let j = 0; j < per && start + j < n; j++) {
        const i = start + j, def = RF.getCharacter(this.picks[i]), x = 40 + j * 50, y = 62, sel = i === this.pick;
        ctx.fillStyle = sel ? '#5a10a0' : '#1a1028'; ctx.fillRect(x - 22, y, 44, 84);
        ctx.save(); ctx.beginPath(); ctx.rect(x - 22, y, 44, 84); ctx.clip();
        RF.createSprite(def).draw(ctx, sel ? 'victory' : 'idle', sel ? Math.floor(this.t / 16) % 2 : 0, x, y + 82, 1);
        ctx.restore();
        if (sel) { ctx.strokeStyle = '#ffffff'; ctx.strokeRect(x - 21.5, y + 0.5, 43, 83); }
      }
      const d = RF.getCharacter(this.picks[this.pick]);
      T(ctx, d.name.toUpperCase(), W / 2, 154, { scale: 2, align: 'center', color: '#ffffff', outline: '#000' });
      T(ctx, '< LEFT / RIGHT >   CONFIRM TO CHOOSE', W / 2, 176, { align: 'center', color: '#c8b0e0', outline: '#000' });
    }

    drawCredits(ctx) {
      ctx.fillStyle = '#05000a'; ctx.fillRect(0, 0, W, H);
      drawRift(ctx, W / 2, H / 2, 2.4, this.t);
      ctx.fillStyle = 'rgba(5,0,10,0.7)'; ctx.fillRect(0, 0, W, H);
      let y = this.creditY;
      const line = (txt, o = {}) => { if (y > -20 && y < H) T(ctx, txt, W / 2, y, Object.assign({ align: 'center', outline: '#000', color: '#e0d0ff' }, o)); y += o.gap || 12; };
      line('TERRAMANIA', { scale: 3, color: PURPLE, gap: 30 });
      line('THE LAST BELL', { scale: 2, color: '#c080ff', gap: 40 });
      line('STARRING', { color: '#a050ff', gap: 20 });
      RF.CHARACTERS.forEach((d, i) => {
        if (['bruiser', 'viper'].includes(d.id)) return;
        if (y > -80 && y < H + 100) RF.createSprite(d).draw(ctx, 'victory', Math.floor(this.t / 16) % 2, i % 2 ? W / 2 + 125 : W / 2 - 125, y + 46, i % 2 ? -1 : 1);
        line(d.name.toUpperCase(), { scale: 2, color: '#ffffff', gap: 18 });
        line(d.origin.toUpperCase(), { color: '#a890c8', gap: 56 });
      });
      line('DIRECTED BY', { color: '#a050ff', gap: 12 }); line('YOU AND YOUR FRIENDS', { scale: 2, gap: 30 });
      line('CODE', { color: '#a050ff', gap: 12 }); line('CLAUDE', { scale: 2, gap: 40 });
      line('THANKS FOR PLAYING.', { gap: 30 });
      line('STAY FOR THE END...', { color: '#c080ff' });
      R(ctx, '#000', 0, 0, W, BAR); R(ctx, '#000', 0, H - BAR, W, BAR);
    }
  }

  RF.StoryScene = StoryScene;
  RF.StoryMenuScene = StoryMenuScene;
})();
