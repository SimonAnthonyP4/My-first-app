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
  // A note ending in * is palm-muted (short, chunky chug) on guitar and bass.
  function parseTrack(track, drums) {
    const tokens = track.bars.join(' ').split(/\s+/).filter(Boolean);
    const steps = tokens.map(() => null);
    tokens.forEach((tok, i) => {
      if (tok === '.' || tok === '-') return;
      if (drums) { steps[i] = tok.split('+'); return; }
      let len = 1;
      while (tokens[i + len] === '-') len++;
      const mute = tok.endsWith('*');
      steps[i] = { f: freq(mute ? tok.slice(0, -1) : tok), len, mute };
    });
    return { steps, wave: track.wave, volume: track.volume, drums, distort: !!track.distort, instrument: track.instrument, pan: track.pan || 0 };
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
        // Guitar distortion: a wave-shaper that clips the signal, into the music bus.
        this.distBus = this.ctx.createWaveShaper();
        const curve = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 6); }
        this.distBus.curve = curve;
        this.distBus.oversample = '2x';
        const distOut = this.ctx.createGain();
        distOut.gain.value = 0.45;
        const tone = this.ctx.createBiquadFilter(); // take the fizz off the top
        tone.type = 'lowpass';
        tone.frequency.value = 3200;
        this.distBus.connect(tone).connect(distOut).connect(this.musicBus);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.buildMetalRig();
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
          else if (ev.f && tr.instrument === 'guitar') { // double-tracked: one take per side, a hair apart
            const dur = ev.len * s.stepDur * 0.95;
            this.guitarNote(this.ampL, ev.f, s.next, dur, ev.mute, true, tr.volume, 9);
            this.guitarNote(this.ampR, ev.f, s.next + 0.006, dur, ev.mute, true, tr.volume, 13);
          }
          else if (ev.f && tr.instrument === 'lead') this.leadNote(ev.f, s.next, ev.len * s.stepDur * 0.96, tr.volume);
          else if (ev.f && tr.instrument === 'bass') this.bassNote(ev.f, s.next, ev.len * s.stepDur * 0.92, ev.mute, tr.volume);
          else if (ev.f) this.tone(tr.wave, ev.f, s.next, ev.len * s.stepDur * 0.92, tr.volume, tr.distort ? this.distBus : this.musicBus);
        }
        s.next += s.stepDur;
        s.step++;
      }
    },

    // ---- the metal rig: amps, cabinets, reverb ----

    // A guitar amp channel: input -> tighten lows -> high-gain clipping -> cabinet
    // (scooped mids, rolled-off fizz) -> pan. Notes plug into `.input`.
    makeAmp(pan, drive, out) {
      const c = this.ctx, input = c.createGain();
      const tight = c.createBiquadFilter(); tight.type = 'highpass'; tight.frequency.value = 110;
      const pre = c.createGain(); pre.gain.value = drive;
      const shaper = c.createWaveShaper();
      const curve = new Float32Array(2048);
      for (let i = 0; i < 2048; i++) { const x = (i / 2047) * 2 - 1; curve[i] = Math.tanh(x * 3 + 0.15) - Math.tanh(0.15); } // slightly asymmetric = more harmonics
      shaper.curve = curve; shaper.oversample = '4x';
      const low = c.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 160; low.gain.value = 5;      // chug thump
      const scoop = c.createBiquadFilter(); scoop.type = 'peaking'; scoop.frequency.value = 650; scoop.Q.value = 0.8; scoop.gain.value = -7; // metal mid scoop
      const pres = c.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2400; pres.Q.value = 1; pres.gain.value = 4;     // bite
      const cab1 = c.createBiquadFilter(); cab1.type = 'lowpass'; cab1.frequency.value = 5200; cab1.Q.value = 0.7;  // speaker cabinet
      const cab2 = c.createBiquadFilter(); cab2.type = 'lowpass'; cab2.frequency.value = 7000;
      const lvl = c.createGain(); lvl.gain.value = out;
      const p = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
      if (p.pan) p.pan.value = pan;
      input.connect(tight).connect(pre).connect(shaper).connect(low).connect(scoop).connect(pres).connect(cab1).connect(cab2).connect(lvl).connect(p).connect(this.band);
      return { input, lvl };
    },

    buildMetalRig() {
      const c = this.ctx;
      // Everything in the band goes through a bus compressor (glue + no clipping).
      this.band = c.createGain();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 6; comp.ratio.value = 6;
      comp.attack.value = 0.004; comp.release.value = 0.15;
      const makeup = c.createGain(); makeup.gain.value = 1.3;
      this.band.connect(comp).connect(makeup).connect(this.musicBus);
      this.ampL = this.makeAmp(-0.75, 9, 0.2);   // rhythm guitar, double-tracked left...
      this.ampR = this.makeAmp(0.75, 9, 0.2);    // ...and right
      this.ampLead = this.makeAmp(0, 7, 0.32);   // lead guitar, centre
      // Bass: growly, lightly driven.
      const bin = c.createGain(), bshape = c.createWaveShaper(), bcurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; bcurve[i] = Math.tanh(x * 2.2); }
      bshape.curve = bcurve;
      const blp = c.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 1400;
      const bout = c.createGain(); bout.gain.value = 0.28;
      bin.connect(bshape).connect(blp).connect(bout).connect(this.band);
      this.bassIn = bin;
      // Room reverb (a generated impulse response) for drums and leads.
      const rlen = Math.floor(c.sampleRate * 1.6), ir = c.createBuffer(2, rlen, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch);
        for (let i = 0; i < rlen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rlen, 3.2);
      }
      this.reverb = c.createConvolver(); this.reverb.buffer = ir;
      const rout = c.createGain(); rout.gain.value = 0.35;
      this.reverb.connect(rout).connect(this.band);
      // Lead echo
      this.delay = c.createDelay(1); this.delay.delayTime.value = 0.32;
      const fb = c.createGain(); fb.gain.value = 0.3;
      const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2500;
      this.delay.connect(dlp).connect(fb).connect(this.delay);
      const dout = c.createGain(); dout.gain.value = 0.35;
      dlp.connect(dout).connect(this.ampLead.lvl);
      this.ampLead.lvl.connect(this.reverb);
      // Drum bus with a little reverb
      this.drumBus = c.createGain(); this.drumBus.gain.value = 0.85;
      this.drumBus.connect(this.band);
    },

    // One guitar note: a power chord (root + fifth + octave) from detuned saws.
    // Palm-muted notes are short and darker.
    guitarNote(amp, f, t, dur, mute, chord, vol, detune) {
      const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = mute ? 900 : 4000;
      const len = mute ? Math.min(dur, 0.13) : dur;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.004);
      if (mute) g.gain.exponentialRampToValueAtTime(vol * 0.05, t + len);
      else { g.gain.setValueAtTime(vol, t + Math.max(0.01, len - 0.03)); g.gain.linearRampToValueAtTime(0.0001, t + len); }
      g.connect(lp).connect(amp.input);
      const parts = chord ? [[1, 1], [1.5, 0.8], [2, 0.45]] : [[1, 1]];
      for (const [mul, v] of parts) for (const d of [-detune, detune]) {
        const o = c.createOscillator(), og = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * mul, t);
        o.detune.value = d;
        og.gain.value = v * 0.5;
        o.connect(og).connect(g);
        o.start(t); o.stop(t + len + 0.03);
      }
    },

    leadNote(f, t, dur, vol) {
      const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      const vib = c.createOscillator(), vg = c.createGain();
      o.type = o2.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.985, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04); // pick slide into the note
      o2.frequency.setValueAtTime(f * 2, t); o2.detune.value = 6;
      vib.frequency.value = 6; vg.gain.value = dur > 0.25 ? f * 0.012 : 0;   // vibrato on held notes
      vib.connect(vg).connect(o.frequency);
      const g2 = c.createGain(); g2.gain.value = 0.3;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.04)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g); o2.connect(g2).connect(g);
      g.connect(this.ampLead.input); g.connect(this.delay);
      for (const n of [o, o2, vib]) { n.start(t); n.stop(t + dur + 0.05); }
    },

    bassNote(f, t, dur, mute, vol) {
      const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      o.frequency.value = f; o2.frequency.value = f / 2;
      const len = mute ? Math.min(dur, 0.16) : dur;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.01, len - 0.03)); g.gain.linearRampToValueAtTime(0.0001, t + len);
      const g2 = c.createGain(); g2.gain.value = 0.5;
      o.connect(g); o2.connect(g2).connect(g); g.connect(this.bassIn);
      o.start(t); o2.start(t); o.stop(t + len + 0.02); o2.stop(t + len + 0.02);
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

    // Drum kit: k kick, s snare, h hi-hat, o open hat, c crash, r ride, t low tom, T high tom.
    drum(type, t) {
      const bus = this.drumBus || this.musicBus, c = this.ctx;
      const verb = (node, amt) => { if (this.reverb) { const g = c.createGain(); g.gain.value = amt; node.connect(g).connect(this.reverb); } };
      const thump = (f0, f1, len, vol) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.7);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + len);
        o.connect(g).connect(bus);
        o.start(t); o.stop(t + len + 0.02);
        return g;
      };
      if (type === 'k') {                       // punchy metal kick: beater click + low thump
        thump(170, 48, 0.17, 0.75);
        this.noiseBurst(t, 0.012, 0.35, 'highpass', 3000, bus);
      } else if (type === 's') {               // cracking snare with room
        const g = thump(230, 170, 0.08, 0.35);
        this.noiseBurst(t, 0.18, 0.4, 'bandpass', 2200, bus);
        this.noiseBurst(t, 0.1, 0.18, 'highpass', 5000, bus);
        verb(g, 0.8);
        if (this.reverb) this.noiseBurst(t, 0.12, 0.25, 'bandpass', 2000, this.reverb);
      } else if (type === 'h') {
        this.noiseBurst(t, 0.03, 0.09, 'highpass', 8000, bus);
      } else if (type === 'o') {
        this.noiseBurst(t, 0.25, 0.1, 'highpass', 7000, bus);
      } else if (type === 'c') {               // crash cymbal
        this.noiseBurst(t, 1.3, 0.22, 'highpass', 5000, bus);
        this.noiseBurst(t, 0.6, 0.12, 'bandpass', 3500, bus);
        if (this.reverb) this.noiseBurst(t, 0.5, 0.12, 'highpass', 4000, this.reverb);
      } else if (type === 'r') {
        this.tone('square', 2600, t, 0.12, 0.025, bus);
        this.noiseBurst(t, 0.2, 0.06, 'highpass', 6000, bus);
      } else if (type === 't' || type === 'T') {
        const g = thump(type === 't' ? 110 : 170, type === 't' ? 70 : 110, 0.3, 0.6);
        verb(g, 0.5);
      }
    },

    // ---- sound effects ----

    sfx(name) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      switch (name) {
        case 'whoosh': this.noiseBurst(t, 0.09, 0.08, 'bandpass', 2400); break;
        case 'chord': // a distorted power chord (root, fifth, octave) ringing out
          [82, 123, 165].forEach((f, i) => { this.tone('sawtooth', f, t, 0.9, 0.09, null, f * 0.99); this.tone('square', f * 2, t + 0.005 * i, 0.5, 0.03); });
          this.noiseBurst(t, 0.08, 0.25, 'bandpass', 2000);
          break;
        case 'crack': // bone breaking: a sharp snap and a dull crunch
          this.noiseBurst(t, 0.05, 0.5, 'highpass', 3000);
          this.noiseBurst(t + 0.03, 0.14, 0.45, 'bandpass', 700);
          this.tone('square', 90, t + 0.02, 0.12, 0.3, null, 40);
          break;
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
        case 'jet':
          this.noiseBurst(t, 0.5, 0.25, 'bandpass', 900);
          this.tone('sawtooth', 70, t, 0.4, 0.06, null, 120);
          break;
        case 'honk': // classic car horn: two quick toots
          [0, 0.22].forEach((d) => { this.tone('square', 392, t + d, 0.16, 0.09); this.tone('square', 494, t + d, 0.16, 0.07); });
          break;
        case 'engine':
          this.tone('sawtooth', 55, t, 0.9, 0.12, null, 110);
          this.noiseBurst(t, 0.9, 0.15, 'lowpass', 400);
          break;
        case 'drill':
          this.tone('sawtooth', 300, t, 0.3, 0.07, null, 360);
          this.noiseBurst(t, 0.3, 0.12, 'highpass', 3000);
          break;
        case 'clang': // metal tray
          this.tone('square', 1250, t, 0.25, 0.08, null, 1180);
          this.tone('triangle', 2100, t, 0.3, 0.06);
          this.noiseBurst(t, 0.08, 0.2, 'highpass', 3000);
          break;
        case 'paper':
          this.noiseBurst(t, 0.18, 0.25, 'bandpass', 2600);
          break;
        case 'super': // charge-up whoosh into a big hit
          this.tone('sawtooth', 110, t, 0.5, 0.12, null, 880);
          this.tone('square', 220, t, 0.5, 0.06, null, 1760);
          this.noiseBurst(t + 0.45, 0.4, 0.3, 'lowpass', 900);
          this.tone('sine', 70, t + 0.45, 0.5, 0.3, null, 35);
          break;
        case 'ready': // little rising chime
          [660, 880, 1320].forEach((f, i) => this.tone('square', f, t + i * 0.06, 0.08, 0.06));
          break;
        case 'counter':
          this.tone('square', 1400, t, 0.08, 0.08, null, 700);
          this.noiseBurst(t, 0.12, 0.2, 'highpass', 2500);
          break;
        case 'laugh': // HA HA HA (a cocky chuckle)
          for (let i = 0; i < 4; i++) {
            this.tone('sawtooth', 260 - i * 18, t + i * 0.13, 0.09, 0.07, null, 200 - i * 15);
            this.noiseBurst(t + i * 0.13, 0.06, 0.08, 'bandpass', 900);
          }
          break;
        case 'cash': // ka-ching!
          this.noiseBurst(t, 0.05, 0.2, 'highpass', 3000);
          this.tone('square', 1568, t + 0.05, 0.12, 0.08);
          this.tone('square', 2093, t + 0.12, 0.35, 0.08);
          this.tone('sine', 4186, t + 0.12, 0.3, 0.04);
          break;
        case 'arcane': // shimmering magic
          [880, 1320, 1760, 2200].forEach((f, i) => this.tone('sine', f, t + i * 0.03, 0.25, 0.05, null, f * 1.5));
          this.tone('sawtooth', 220, t, 0.3, 0.06, null, 440);
          break;
        case 'birds': // a flock of migrating birds
          for (let i = 0; i < 5; i++) this.tone('sine', 2200 + Math.random() * 900, t + i * 0.035, 0.05, 0.05, null, 3200);
          this.noiseBurst(t, 0.15, 0.08, 'bandpass', 2400);
          break;
        case 'rumble': // the earth moving
          this.tone('sawtooth', 45, t, 0.9, 0.25, null, 30);
          this.noiseBurst(t, 0.9, 0.35, 'lowpass', 300);
          break;
        case 'fanfare': // royal trumpets: da-da-da-DAAA
          [[523, 0], [523, 0.12], [523, 0.24], [784, 0.36]].forEach(([f, d], i) => {
            this.tone('sawtooth', f, t + d, i === 3 ? 0.6 : 0.1, 0.1);
            this.tone('square', f * 1.5, t + d, i === 3 ? 0.6 : 0.1, 0.04);
          });
          break;
        case 'pa': // PA chime, then a blast of feedback
          this.tone('sine', 784, t, 0.25, 0.15); this.tone('sine', 523, t + 0.25, 0.3, 0.15);
          this.tone('square', 1800, t + 0.55, 0.4, 0.06, null, 2400);
          this.noiseBurst(t + 0.55, 0.45, 0.25, 'bandpass', 1200);
          break;
        case 'scribble':
          this.noiseBurst(t, 0.08, 0.15, 'bandpass', 3500);
          break;
        case 'boom': // a deep, chest-rattling impact
          this.tone('sine', 70, t, 0.45, 0.6, null, 28);
          this.noiseBurst(t, 0.3, 0.35, 'lowpass', 350);
          break;
        case 'stomp':
          this.tone('sine', 55, t, 0.25, 0.4, null, 30);
          this.noiseBurst(t, 0.12, 0.15, 'lowpass', 250);
          break;
        case 'applause':
          for (let i = 0; i < 14; i++) this.noiseBurst(t + i * 0.07 + Math.random() * 0.03, 0.06, 0.12, 'bandpass', 1500 + Math.random() * 1500);
          break;
        case 'roar':
          this.tone('sawtooth', 140, t, 0.7, 0.14, null, 70);
          this.noiseBurst(t, 0.7, 0.25, 'lowpass', 700);
          break;
        case 'hiss':
          this.noiseBurst(t, 0.45, 0.22, 'highpass', 4500);
          break;
        case 'scream': // furious yelling
          this.tone('sawtooth', 620, t, 0.45, 0.12, null, 300);
          this.tone('square', 930, t, 0.4, 0.05, null, 520);
          this.noiseBurst(t, 0.45, 0.15, 'bandpass', 1800);
          break;
        case 'cackle': // evil laugh: ha-ha-ha-ha
          for (let i = 0; i < 5; i++) this.tone('square', 520 - i * 40, t + i * 0.11, 0.08, 0.09, null, 380 - i * 30);
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
