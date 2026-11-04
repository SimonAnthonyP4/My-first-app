// Chiptune synth: plays the songs in config/music.js and short sound effects.
// Browsers only allow audio after the player interacts with the page, so the
// audio engine starts on the first key press or click.
(function () {
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const LOOKAHEAD = 0.12; // seconds of music scheduled ahead of time

  function freq(name) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
    if (!m) return null;
    const midi = 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Turn a track's bars into per-step events: { note, len } or drum hit lists.
  function parseTrack(track, drums) {
    const tokens = track.bars.join(' ').split(/\s+/).filter(Boolean);
    const steps = tokens.map(() => null);
    tokens.forEach((tok, i) => {
      if (tok === '.' || tok === '-') return;
      if (drums) { steps[i] = tok.split('+'); return; }
      let len = 1;
      while (tokens[i + len] === '-') len++;
      steps[i] = { f: freq(tok), len };
    });
    return { steps, wave: track.wave, volume: track.volume, drums };
  }

  const audio = {
    ctx: null,
    song: null,
    songId: null,
    muted: false,

    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.musicBus.connect(this.master);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.connect(this.master);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.applyVolumes();
        if (this.pendingSong) this.playSong(this.pendingSong, true);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    applyVolumes() {
      if (!this.ctx) return;
      this.master.gain.value = this.muted ? 0 : 1;
      this.musicBus.gain.value = RF.CONFIG.MUSIC_VOLUME;
      this.sfxBus.gain.value = RF.CONFIG.SFX_VOLUME;
    },

    toggleMute() {
      this.muted = !this.muted;
      this.applyVolumes();
      return this.muted;
    },

    playSong(id, force) {
      this.pendingSong = id;
      if (!this.ctx) return;
      if (this.songId === id && !force) return;
      const def = RF.MUSIC[id];
      this.songId = id;
      if (!def) { this.song = null; return; }
      const tracks = Object.entries(def.tracks).map(([name, t]) => parseTrack(t, name === 'drums'));
      this.song = { stepDur: 60 / def.bpm / 4, tracks, step: 0, next: this.ctx.currentTime + 0.08 };
    },

    stopSong() { this.song = null; this.songId = null; this.pendingSong = null; },

    // Called every frame from the game loop: schedules the next few notes.
    update() {
      if (!this.ctx || !this.song) return;
      const s = this.song, now = this.ctx.currentTime;
      if (s.next < now - 0.5) s.next = now + 0.05; // tab was hidden; don't play catch-up
      while (s.next < now + LOOKAHEAD) {
        for (const tr of s.tracks) {
          const ev = tr.steps[s.step % tr.steps.length];
          if (!ev) continue;
          if (tr.drums) ev.forEach((d) => this.drum(d, s.next));
          else if (ev.f) this.tone(tr.wave, ev.f, s.next, ev.len * s.stepDur * 0.92, tr.volume, this.musicBus);
        }
        s.next += s.stepDur;
        s.step++;
      }
    },

    // ---- instruments ----

    tone(wave, f, t, dur, vol, bus, slideTo) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = wave;
      o.frequency.setValueAtTime(f, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.01, dur - 0.03));
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g).connect(bus || this.sfxBus);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    noiseBurst(t, dur, vol, filterType, filterFreq, bus) {
      const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noise;
      f.type = filterType;
      f.frequency.value = filterFreq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(bus || this.sfxBus);
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.02);
    },

    drum(type, t) {
      const bus = this.musicBus;
      if (type === 'k') {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(g).connect(bus);
        o.start(t);
        o.stop(t + 0.16);
      } else if (type === 's') {
        this.noiseBurst(t, 0.14, 0.22, 'highpass', 1200, bus);
        this.tone('triangle', 190, t, 0.06, 0.12, bus);
      } else if (type === 'h') {
        this.noiseBurst(t, 0.035, 0.08, 'highpass', 7000, bus);
      }
    },

    // ---- sound effects ----

    sfx(name) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      switch (name) {
        case 'whoosh': this.noiseBurst(t, 0.09, 0.08, 'bandpass', 2400); break;
        case 'hit':
          this.noiseBurst(t, 0.09, 0.35, 'bandpass', 1500);
          this.tone('square', 220, t, 0.07, 0.15, null, 70);
          break;
        case 'heavy':
          this.noiseBurst(t, 0.16, 0.4, 'lowpass', 900);
          this.tone('sine', 120, t, 0.2, 0.5, null, 35);
          break;
        case 'block':
          this.tone('square', 1100, t, 0.04, 0.1);
          this.noiseBurst(t, 0.05, 0.15, 'highpass', 4000);
          break;
        case 'perfect':
          [880, 1320, 1760].forEach((f, i) => this.tone('square', f, t + i * 0.05, 0.12, 0.12));
          this.tone('triangle', 1760, t + 0.15, 0.4, 0.15, null, 2640);
          break;
        case 'special': this.tone('sawtooth', 200, t, 0.25, 0.12, null, 800); break;
        case 'toasty':
          this.tone('square', 500, t, 0.16, 0.09, null, 1500);
          this.tone('square', 700, t + 0.17, 0.2, 0.09, null, 1800);
          break;
        case 'bell': // a deep, ringing church-bell DONG
          this.tone('sine', 98, t, 2.2, 0.35, null, 96);
          this.tone('sine', 196, t, 1.6, 0.18, null, 194);
          this.tone('sine', 294, t, 1.0, 0.1);
          this.tone('triangle', 466, t, 0.5, 0.06);
          this.noiseBurst(t, 0.08, 0.3, 'lowpass', 800);
          break;
        case 'firework':
          this.tone('sine', 1800, t, 0.35, 0.05, null, 500); // whistle up
          this.noiseBurst(t + 0.35, 0.4, 0.3, 'lowpass', 1600); // boom
          break;
        case 'grab':
          this.noiseBurst(t, 0.06, 0.3, 'lowpass', 700);
          this.tone('square', 160, t, 0.08, 0.12, null, 110);
          break;
        case 'shield':
          this.tone('square', 1400, t, 0.08, 0.08, null, 700);
          this.noiseBurst(t, 0.12, 0.2, 'highpass', 5000);
          break;
        case 'bolt':
          this.tone('sawtooth', 120, t, 0.25, 0.12, null, 70);
          this.noiseBurst(t, 0.25, 0.22, 'highpass', 2500);
          break;
        case 'zap':
          this.tone('sawtooth', 90, t, 0.45, 0.14, null, 60);
          this.tone('square', 1800, t, 0.4, 0.05, null, 900);
          this.noiseBurst(t, 0.45, 0.25, 'highpass', 3000);
          break;
        case 'ko':
          this.tone('sawtooth', 420, t, 0.9, 0.18, null, 50);
          this.noiseBurst(t, 0.5, 0.3, 'lowpass', 600);
          break;
        case 'gong':
          this.tone('triangle', 110, t, 1.2, 0.3, null, 104);
          this.tone('triangle', 166, t, 1.0, 0.15, null, 160);
          break;
        case 'fight': [440, 660].forEach((f, i) => this.tone('square', f, t + i * 0.07, 0.18, 0.12)); break;
        case 'move': this.tone('square', 520, t, 0.03, 0.06); break;
        case 'select':
          this.tone('square', 660, t, 0.06, 0.1);
          this.tone('square', 990, t + 0.06, 0.08, 0.1);
          break;
        default: break;
      }
    },
  };

  RF.audio = audio;
  window.addEventListener('keydown', () => audio.unlock());
  window.addEventListener('pointerdown', () => audio.unlock());
})();
