// THE COMPOSER: story mode's own soundtrack. Twenty-three original themes, written as chords and
// melodies below and played live by a small sequencer (no audio files): a pad, an arpeggio, a
// bass, a lead melody and drums per theme. Cue one from the script with { score: 'theme' };
// cues cross-fade, and cueing the theme that is already playing does nothing.
//
// A theme:  step   frames per 16th note (60 fps: 10 = 90 bpm, 6 = 150 bpm, 16 = 56 bpm)
//           spb    steps per bar (16; 12 for a waltz)
//           bars   one chord per bar ('Am', 'F', 'Bb', 'Bdim', 'G7'...), looping
//           parts  pad / arp (chord-tone numbers per step) / bass (semitones above the root
//                  per step) / lead (a melody: one string per bar, like the game's other
//                  music: 'E5 - - - D5 - . .'  note, hold, rest) / drums (k s h t c b)
(function () {
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acc = (s) => (s === '#' ? 1 : s === 'b' ? -1 : 0);
  const midi = (s) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); return m ? NOTE[m[1]] + acc(m[2]) + 12 * (+m[3] + 1) : null; };
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], sus: [0, 5, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 5: [0, 7, 12] };
  const chord = (name) => { const m = /^([A-G])(#|b)?(.*)$/.exec(name), root = 48 + NOTE[m[1]] + acc(m[2]); return (QUAL[m[3]] || QUAL['']).map((i) => root + i); };
  const _ = null;

  // The bell melody: the heart of the main theme, and of the quiet "bell" cue.
  const BELL = [
    'D5 - - - A4 - - - F4 - - - A4 - - -', 'D5 - - - Bb4 - - - F4 - - - Bb4 - - -',
    'C5 - - - A4 - - - F4 - - - A4 - C5 -', 'E5 - - - - - D5 - C5 - - - - - - -',
    'F5 - - - D5 - - - A4 - - - D5 - - -', 'F5 - - - D5 - - - Bb4 - - - D5 - F5 -',
    'G5 - - - - - F5 - D5 - - - Bb4 - - -', 'C#5 - - - - - - - E5 - - - A4 - - -',
  ];
  const BELL_BARS = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'];
  // The friendship melody ("is this seat taken?"): Nicholas and Anthony, and everyone after them.
  const BRO = [
    'E4 - G4 - C5 - - - B4 - G4 - E4 - - -', 'E4 - A4 - C5 - - - B4 - A4 - E4 - - -',
    'F4 - A4 - C5 - - - D5 - C5 - A4 - - -', 'G4 - B4 - D5 - - - - - C5 - B4 - G4 -',
    'E5 - - - D5 - C5 - - - G4 - - - - -', 'E5 - - - D5 - B4 - - - G4 - - - - -',
    'F5 - - - E5 - C5 - - - A4 - C5 - - -', 'D5 - - - - - B4 - G4 - - - - - - -',
  ];

  // Lopez Tuero's melody: it circles and never resolves.
  const LOPEZ = [
    'E5 - - - - - D#5 - E5 - - - - - - -', 'C5 - - - - - B4 - C5 - - - A4 - - -',
    'A5 - - - - - G#5 - A5 - - - F5 - - -', 'E5 - - - - - - - G#4 - - - B4 - - -',
    'E5 - - - - - D#5 - E5 - - - A5 - - -', 'F5 - - - - - E5 - D5 - - - - - - -',
    'C5 - - - - - B4 - A4 - - - C5 - - -', 'B4 - - - - - - - - - - - G#4 - - -',
  ];
  const LOPEZ_BARS = ['Am', 'Am', 'F', 'E', 'Am', 'Dm', 'F', 'E'];

  const SCORES = {
    // THE LAST BELL - main title: the bell melody over a slow march
    theme: { step: 11, bars: BELL_BARS, parts: [
      { pad: true, vol: 0.016 },
      { arp: [0, _, 1, _, 2, _, 1, _, 3, _, 2, _, 1, _, 2, _], vol: 0.022 },
      { bass: [0, _, _, _, _, _, _, _, 7, _, _, _, _, _, 0, _], vol: 0.06, len: 6 },
      { lead: BELL, vol: 0.07, wave: 'triangle', kind: 'pluck', double: true },
      { drums: ['t . . . . . . . s . . t . . s s', 'k . . . . . . . s . . . . . s .'], vol: 0.11 },
    ] },
    // the same melody, alone, like a music box left running
    bell: { step: 13, bars: BELL_BARS, parts: [
      { pad: true, vol: 0.012 },
      { lead: BELL, vol: 0.06, wave: 'sine', kind: 'pluck', oct: 12 },
    ] },
    // BRO BATCH - warm and simple
    bro: { step: 12, bars: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'], parts: [
      { pad: true, vol: 0.014 },
      { arp: [0, _, 2, _, 1, _, 2, _, 0, _, 2, _, 1, _, 2, _], vol: 0.026 },
      { bass: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], vol: 0.05, len: 14 },
      { lead: BRO, vol: 0.06, wave: 'triangle', kind: 'pluck' },
    ] },
    // KING SIRVEN - a stately march
    sirven: { step: 9, bars: ['Bb', 'Eb', 'F', 'Bb', 'Gm', 'Eb', 'F', 'F'], parts: [
      { pad: true, vol: 0.013 },
      { bass: [0, _, _, _, 7, _, _, _, 0, _, _, _, 7, _, _, _], vol: 0.055, len: 3 },
      { lead: [
        'Bb4 - - Bb4 D5 - - - F5 - - - D5 - - -', 'Eb5 - - Eb5 G5 - - - F5 - - - Eb5 - - -',
        'F5 - - - A5 - - - C6 - - - A5 - F5 -', 'Bb5 - - - - - - - F5 - - - D5 - - -',
        'G5 - - G5 Bb5 - - - A5 - - - G5 - - -', 'Eb5 - - Eb5 G5 - - - Bb5 - - - G5 - - -',
        'F5 - - - - - A5 - C6 - - - - - - -', 'F5 - - - Eb5 - - - D5 - - - C5 - - -',
      ], vol: 0.04, wave: 'sawtooth', lp: 1500 },
      { drums: ['k . . . s . . s k . k . s . s s'], vol: 0.1 },
    ] },
    // LOPEZ TUERO - something circling, never resolving
    lopez: { step: 13, bars: LOPEZ_BARS, parts: [
      { pad: true, vol: 0.014, wave: 'triangle' },
      { bass: [0, _, _, 0, _, _, 0, _, _, _, 0, _, _, _, _, _], vol: 0.06, wave: 'sawtooth', lp: 320, len: 2 },
      { arp: [2, _, _, _, 1, _, _, _, 0, _, _, _, 1, _, _, _], vol: 0.02, oct: 12, wave: 'sine' },
      { lead: LOPEZ, vol: 0.05, wave: 'sine' },
      { drums: ['k . . k . . . . . . . . . . . .'], vol: 0.1 },
    ] },
    // action: the scripted fights and the quick-time moments
    battle: { step: 6, bars: ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B'], parts: [
      { bass: [0, 0, _, 0, 0, _, 0, 0, 0, 0, _, 0, 7, _, 7, 0], vol: 0.05, wave: 'sawtooth', lp: 500, len: 1 },
      { arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2], vol: 0.016, wave: 'square', len: 1 },
      { lead: [
        'E5 - - - - - G5 - B5 - - - A5 - G5 -', 'F#5 - - - E5 - - - B4 - - - - - - -',
        'E5 - - - - - G5 - C6 - - - B5 - G5 -', 'A5 - - - F#5 - - - D5 - - - - - - -',
        'E5 - - - - - G5 - B5 - - - A5 - G5 -', 'F#5 - - - G5 - - - A5 - - - B5 - - -',
        'C6 - - - B5 - A5 - G5 - - - E5 - G5 -', 'F#5 - - - - - - - D#5 - - - B4 - - -',
      ], vol: 0.04, wave: 'sawtooth', lp: 2200 },
      { drums: ['k . h . s . h k k . h . s . h h'], vol: 0.12 },
    ] },
    // DOOMSDAY - slow, huge, wrong
    doom: { step: 16, bars: ['Dm', 'Eb', 'Dm', 'Bb', 'Gm', 'Eb', 'A', 'A'], parts: [
      { pad: true, vol: 0.02, wave: 'sawtooth', lp: 600, oct: -12 },
      { pad: true, vol: 0.012 },
      { bass: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], vol: 0.07, len: 15 },
      { lead: [
        'A4 - - - - - - - - - - - Bb4 - - -', 'G4 - - - - - - - - - - - - - - -',
        'F4 - - - - - - - - - - - A4 - - -', 'D5 - - - - - - - - - - - - - - -',
        'Bb4 - - - - - - - - - - - D5 - - -', 'Eb5 - - - - - - - - - - - - - - -',
        'E5 - - - - - - - C#5 - - - - - - -', 'A4 - - - - - - - - - - - - - - -',
      ], vol: 0.05, wave: 'sine' },
      { drums: ['t . . . . . . . . . t . t . . .'], vol: 0.16 },
    ] },
    // a memory: a music-box waltz
    memory: { step: 11, spb: 12, bars: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'], parts: [
      { arp: [0, _, _, _, 1, _, _, _, 2, _, _, _], vol: 0.03, oct: -12, len: 5 },
      { lead: [
        'B5 - - - D6 - - - G5 - - -', 'B5 - - - E6 - - - G5 - - -', 'C6 - - - E6 - - - G5 - - -', 'A5 - - - F#5 - - - D5 - - -',
        'B5 - - - D6 - - - G6 - - -', 'E6 - - - D6 - - - B5 - - -', 'C6 - - - B5 - - - A5 - - -', 'F#5 - - - A5 - - - D6 - - -',
      ], vol: 0.055, wave: 'sine', kind: 'pluck' },
    ] },
    // grief
    sad: { step: 13, bars: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'], parts: [
      { pad: true, vol: 0.013 },
      { arp: [0, _, 1, _, 2, _, 3, _, 2, _, 1, _, 2, _, 1, _], vol: 0.028, len: 4 },
      { lead: [
        'E5 - - - - - D5 - C5 - - - B4 - - -', 'C5 - - - - - A4 - - - - - - - - -',
        'E5 - - - - - D5 - C5 - - - E5 - - -', 'D5 - - - - - B4 - - - - - - - - -',
        'E5 - - - - - D5 - C5 - - - B4 - - -', 'A4 - - - - - C5 - F5 - - - E5 - - -',
        'D5 - - - - - F5 - A5 - - - - - G5 -', 'E5 - - - - - - - B4 - - - - - - -',
      ], vol: 0.055, wave: 'triangle', kind: 'pluck' },
    ] },
    // things getting better
    hope: { step: 11, bars: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'], parts: [
      { pad: true, vol: 0.014 },
      { arp: [0, _, 2, _, 1, _, 2, _, 3, _, 2, _, 1, _, 2, _], vol: 0.028 },
      { bass: [0, _, _, _, _, _, _, _, 0, _, _, _, _, _, _, _], vol: 0.05, len: 7 },
      { lead: [
        'G4 - C5 - E5 - - - D5 - - - C5 - - -', 'G4 - B4 - D5 - - - E5 - - - D5 - - -',
        'A4 - C5 - E5 - - - G5 - - - E5 - - -', 'F5 - - - E5 - D5 - C5 - - - - - - -',
        'G5 - - - E5 - C5 - - - G4 - C5 - - -', 'G5 - - - D5 - B4 - - - G4 - B4 - - -',
        'A5 - - - G5 - F5 - - - E5 - D5 - - -', 'D5 - - - - - E5 - D5 - - - - - - -',
      ], vol: 0.06, wave: 'triangle', kind: 'pluck' },
    ] },
    // they made it
    triumph: { step: 8, bars: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'], parts: [
      { pad: true, vol: 0.014 },
      { arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3], vol: 0.02, len: 2 },
      { bass: [0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 7, _, 7, _], vol: 0.05, len: 2 },
      { lead: [
        'F#5 - - - A5 - - - D6 - - - - - A5 -', 'E5 - - - A5 - - - C#6 - - - - - - -',
        'D5 - - - F#5 - - - B5 - - - - - F#5 -', 'G5 - - - B5 - - - D6 - - - B5 - - -',
        'F#5 - - - A5 - - - D6 - - - F#6 - - -', 'E6 - - - - - C#6 - A5 - - - - - - -',
        'B5 - - - G5 - - - D6 - - - B5 - - -', 'C#6 - - - - - - - E6 - - - - - - -',
      ], vol: 0.04, wave: 'sawtooth', lp: 2000 },
      { drums: ['k . h . s . h . k k h . s . h h'], vol: 0.11 },
    ] },
    // waiting for something bad
    tense: { step: 15, bars: ['Am', 'Bb'], parts: [
      { pad: true, vol: 0.016, oct: -12, wave: 'triangle' },
      { bass: [0, _, _, _, _, _, _, _, 0, _, _, _, _, _, _, _], vol: 0.06, len: 3 },
      { lead: ['E5 - - - - - - - . . . . F5 - - -', 'E5 - - - - - - - . . . . . . . .'], vol: 0.03, wave: 'sine' },
      { drums: ['h . . . h . . . h . . . h . . .'], vol: 0.07 },
    ] },
    // something to work out
    mystery: { step: 12, bars: ['Em', 'C', 'Em', 'B'], parts: [
      { pad: true, vol: 0.012 },
      { arp: [2, _, _, 1, _, _, 0, _, _, 1, _, _, 2, _, _, _], vol: 0.026, oct: 12, wave: 'sine' },
      { lead: ['B4 - - - - - - - G4 - - - - - - -', 'E5 - - - - - - - C5 - - - - - - -', 'B4 - - - - - D5 - G5 - - - - - - -', 'F#5 - - - - - - - D#5 - - - - - - -'], vol: 0.04, wave: 'triangle', kind: 'pluck' },
    ] },
    // lunch, Fernando, and other things that are not serious
    comedy: { step: 8, bars: ['F', 'Bb', 'F', 'C'], parts: [
      { arp: [0, _, _, 2, _, _, 1, _, 0, _, _, 2, _, 1, _, _], vol: 0.03, len: 1 },
      { bass: [0, _, _, _, 7, _, _, _, 0, _, _, _, 7, _, _, _], vol: 0.05, len: 2, kind: 'pluck' },
      { lead: ['A4 . C5 . F5 . . . E5 . D5 . C5 . . .', 'Bb4 . D5 . F5 . . . G5 . F5 . D5 . . .', 'A4 . C5 . F5 . A5 . G5 . F5 . C5 . . .', 'E5 . . . G5 . . . C5 . . . . . . .'], vol: 0.05, wave: 'triangle', kind: 'pluck' },
      { drums: ['k . . . h . . . k . . . h . h .'], vol: 0.08 },
    ] },
    // running: the field, the hallway, anything with a quick-time prompt on it
    chase: { step: 5, bars: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E'], parts: [
      { bass: [0, _, 0, 0, _, 0, 0, _, 0, _, 0, 0, _, 0, 7, _], vol: 0.05, wave: 'sawtooth', lp: 520, len: 1 },
      { arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3], vol: 0.013, wave: 'square', len: 1 },
      { lead: [
        'A5 - - - - - E5 - A5 - - - C6 - B5 -', 'A5 - - - G5 - E5 - - - - - . . . .',
        'F5 - - - - - C5 - F5 - - - A5 - G5 -', 'G5 - - - B5 - D6 - - - - - . . . .',
        'A5 - - - - - E5 - A5 - - - C6 - D6 -', 'E6 - - - D6 - C6 - - - A5 - - - . .',
        'F5 - - - A5 - - - C6 - - - A5 - F5 -', 'E5 - - - G#5 - - - B5 - - - E6 - - -',
      ], vol: 0.036, wave: 'sawtooth', lp: 2400 },
      { drums: ['k . h . s . h . k k h . s . h h', 'k . h . s . h k k . h k s . s s'], vol: 0.11 },
    ] },
    // BANDY - a garage band that is slightly too loud
    rock: { step: 7, bars: ['E5', 'G5', 'A5', 'E5', 'E5', 'G5', 'A5', 'B5'], parts: [
      { arp: [0, 0, _, 0, 0, _, 0, _, 0, 0, _, 0, 1, _, 2, _], vol: 0.03, wave: 'sawtooth', len: 1, oct: -12 },
      { bass: [0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 7, _], vol: 0.055, len: 2 },
      { lead: [
        'E5 - G5 - A5 - - - B5 - A5 - G5 - E5 -', 'G5 - - - B5 - D6 - - - B5 - - - . .',
        'A5 - - - G5 - A5 - B5 - D6 - - - B5 -', 'E6 - - - - - D6 - B5 - - - . . . .',
        'E5 - G5 - A5 - - - B5 - A5 - G5 - E5 -', 'G5 - - - B5 - D6 - E6 - - - D6 - - -',
        'A5 - B5 - D6 - - - E6 - D6 - B5 - A5 -', 'B5 - - - - - - - F#5 - - - B5 - - -',
      ], vol: 0.034, wave: 'sawtooth', lp: 2800 },
      { drums: ['k . h . s . h . k k h . s . h .', 'k . h . s . h . k k h . s s s s'], vol: 0.12 },
    ] },
    // the King's march, played once, slowly, on an organ
    requiem: { step: 18, bars: ['Bb', 'Eb', 'F', 'Bb', 'Gm', 'Eb', 'F', 'Bb'], parts: [
      { pad: true, vol: 0.016 },
      { pad: true, vol: 0.012, wave: 'triangle', oct: -12 },
      { lead: [
        'Bb4 - - - - - - - D5 - - - F5 - - -', 'Eb5 - - - - - - - G5 - - - F5 - - -',
        'F5 - - - - - - - A5 - - - C6 - - -', 'Bb5 - - - - - - - - - - - F5 - - -',
        'G5 - - - - - - - Bb5 - - - A5 - - -', 'Eb5 - - - - - - - G5 - - - Bb5 - - -',
        'F5 - - - - - - - Eb5 - - - C5 - - -', 'Bb4 - - - - - - - - - - - - - - -',
      ], vol: 0.05, wave: 'sine' },
      { drums: ['b . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .'], vol: 0.09 },
    ] },
    // caps and gowns
    pomp: { step: 10, bars: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], parts: [
      { pad: true, vol: 0.014 },
      { bass: [0, _, _, _, _, _, _, _, 7, _, _, _, _, _, _, _], vol: 0.055, len: 6 },
      { lead: [
        'B4 - - - - - A4 - G4 - - - D5 - - -', 'A4 - - - - - B4 - A4 - - - F#4 - - -',
        'G4 - - - - - A4 - B4 - - - E5 - - -', 'E5 - - - - - D5 - C5 - - - - - - -',
        'D5 - - - - - C5 - B4 - - - G5 - - -', 'F#5 - - - - - E5 - D5 - - - A4 - - -',
        'C5 - - - - - D5 - E5 - - - G5 - - -', 'F#5 - - - - - - - D5 - - - - - - -',
      ], vol: 0.04, wave: 'sawtooth', lp: 1400 },
      { drums: ['t . . . . . . . s . . . . . s s', 't . . . . . . . s . . t . . s .'], vol: 0.1 },
    ] },
    // "is this seat taken?" - the friendship melody alone, high up, like a music box in the dark
    seat: { step: 15, bars: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'], parts: [
      { pad: true, vol: 0.01 },
      { lead: BRO, vol: 0.06, wave: 'sine', kind: 'pluck', oct: 12 },
    ] },
    // OMEGA LOPEZ - his melody with everything behind it
    omega: { step: 7, bars: LOPEZ_BARS, parts: [
      { pad: true, vol: 0.016, wave: 'sawtooth', lp: 700, oct: -12 },
      { bass: [0, _, 0, _, 0, _, 0, 0, 0, _, 0, _, 0, _, 7, 7], vol: 0.05, wave: 'sawtooth', lp: 480, len: 1 },
      { lead: LOPEZ, vol: 0.04, wave: 'sawtooth', lp: 1900, double: true },
      { drums: ['k . . k . . s . k . k . . . s .', 'k . . k . . s . k . k . s . s s'], vol: 0.12 },
    ] },
    // THE KEEPER - a night shift that has lasted since before the building: two notes, like a door chime, and a clock
    keeper: { step: 17, bars: ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'F', 'Gm', 'A'], parts: [
      { pad: true, vol: 0.02, wave: 'sine', oct: -12 },
      { bass: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], vol: 0.05, len: 15, wave: 'sine' },
      { lead: [
        'A5 - - - F5 - - - . . . . . . . .', '. . . . . . . . A5 - - - D5 - - -',
        'Bb5 - - - F5 - - - . . . . . . . .', '. . . . . . . . E5 - - - C#5 - - -',
        'A5 - - - F5 - - - . . . . D5 - - -', 'C6 - - - A5 - - - . . . . F5 - - -',
        'Bb5 - - - G5 - - - . . . . D5 - - -', 'E5 - - - - - - - C#5 - - - - - - -',
      ], vol: 0.05, wave: 'sine', kind: 'pluck', oct: 0, double: true },
      { drums: ['h . . . h . . . h . . . h . . .'], vol: 0.035 },
    ] },
    // OLU - church upstairs, the block downstairs: a choir line over a bounce that never stands still
    divine: { step: 7, bars: ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Eb', 'Ab', 'G'], parts: [
      { pad: true, vol: 0.014 },
      { bass: [0, _, _, 0, _, _, 0, _, _, _, 0, _, _, 0, _, 7], vol: 0.07, len: 2, wave: 'sine' },
      { lead: [
        'G5 - - - - - Eb5 - - - - - C5 - - -', 'G5 - - - - - Bb5 - - - - - G5 - - -',
        'Ab5 - - - - - Eb5 - - - - - C5 - - -', 'Bb5 - - - - - - - D5 - - - F5 - - -',
        'C6 - - - - - G5 - - - - - Eb5 - - -', 'Bb5 - - - - - G5 - - - - - Eb5 - - -',
        'Ab5 - - - - - C6 - - - - - Ab5 - - -', 'G5 - - - - - - - B4 - - - D5 - - -',
      ], vol: 0.05, wave: 'sine', oct: 0, double: true },
      { drums: ['k . h . s . h h k . h k s . h h', 'k . h h s . h . k k h . s h h h'], vol: 0.1 },
    ] },
    // THE BENCH - a procession: everyone stands until it has finished
    court: { step: 12, bars: ['Am', 'E', 'F', 'C', 'Dm', 'Am', 'F', 'E'], parts: [
      { pad: true, vol: 0.016, wave: 'sawtooth', lp: 900 },
      { bass: [0, _, _, _, _, _, _, _, 7, _, _, _, _, _, _, _], vol: 0.06, len: 7 },
      { lead: [
        'A4 - - - - - A4 - C5 - - - E5 - - -', 'E5 - - - - - D5 - B4 - - - G#4 - - -',
        'A4 - - - - - A4 - C5 - - - F5 - - -', 'E5 - - - - - - - G5 - - - E5 - - -',
        'F5 - - - - - E5 - D5 - - - A4 - - -', 'C5 - - - - - B4 - A4 - - - E4 - - -',
        'F4 - - - - - A4 - C5 - - - F5 - - -', 'E5 - - - - - - - - - - - . . . .',
      ], vol: 0.06, wave: 'triangle', double: true },
      { drums: ['t . . . . . . . t . . . t . t .', 't . . . . . . . t . . . . . . .'], vol: 0.12 },
    ] },
  };

  // ---- parsing (once per theme) ----
  function prepare(sc) {
    if (sc._ok) return;
    sc.spb = sc.spb || 16;
    for (const p of sc.parts) {
      if (p.lead) p._bars = p.lead.map((bar) => {
        const tok = bar.split(' '), out = [];
        tok.forEach((t, i) => { const m = midi(t); if (m != null) { let len = 1; while (tok[i + len] === '-') len++; out[i] = { m, len }; } });
        return out;
      });
      if (p.drums) p._d = p.drums.map((bar) => bar.split(' ').map((t) => (t === '.' ? null : t.split('+'))));
    }
    sc._ok = true;
  }

  // ---- voices ----
  let out = null;
  function env(wave, f, t, dur, vol, kind, lp) {
    const c = RF.audio.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = wave || 'triangle'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    if (kind === 'pluck') { g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    else { g.gain.linearRampToValueAtTime(vol, t + Math.min(0.1, dur * 0.3)); g.gain.setValueAtTime(vol, t + dur * 0.72); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
    let node = o;
    if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
    node.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function drum(ch, t, vol) {
    const A = RF.audio;
    if (ch === 'k') env('sine', 128, t, 0.17, vol, 'pluck').frequency.exponentialRampToValueAtTime(42, t + 0.15);       // kick
    else if (ch === 't') env('sine', 92, t, 0.55, vol * 1.2, 'pluck').frequency.exponentialRampToValueAtTime(56, t + 0.5); // timpani
    else if (ch === 's') { A.noiseBurst(t, 0.11, vol * 0.55, 'bandpass', 1900, out); env('triangle', 190, t, 0.07, vol * 0.4, 'pluck'); }
    else if (ch === 'h') A.noiseBurst(t, 0.03, vol * 0.3, 'highpass', 7000, out);
    else if (ch === 'c') A.noiseBurst(t, 0.7, vol * 0.3, 'highpass', 5200, out);
    else if (ch === 'b') { env('sine', 587, t, 1.8, vol * 0.5, 'pluck'); env('sine', 1174, t, 1.1, vol * 0.2, 'pluck'); }
  }

  // ---- the sequencer ----
  let cur = null, next, level = 0, frame = 0;
  function playStep(sc, n) {
    const A = RF.audio, bar = Math.floor(n / sc.spb), st = n % sc.spb, ch = chord(sc.bars[bar % sc.bars.length]);
    const t = A.ctx.currentTime + 0.03, sec = sc.step / 60;
    for (const p of sc.parts) {
      const oct = p.oct || 0;
      if (p.pad && st === 0) for (const note of ch) env(p.wave || 'sine', hz(note + oct), t, sc.spb * sec * 1.03, p.vol, 'sus', p.lp);
      if (p.arp) { const v = p.arp[st % p.arp.length]; if (v != null) env(p.wave || 'triangle', hz(ch[v % ch.length] + 12 * Math.floor(v / ch.length) + oct), t, sec * (p.len || 3), p.vol, 'pluck'); }
      if (p.bass) { const v = p.bass[st % p.bass.length]; if (v != null) env(p.wave || 'triangle', hz(ch[0] - 12 + v + oct), t, sec * (p.len || 4), p.vol, p.kind || 'sus', p.lp); }
      if (p.lead) {
        const ev = p._bars[bar % p._bars.length][st];
        if (ev) {
          const dur = ev.len * sec * (p.kind === 'pluck' ? 1.8 : 0.96);
          env(p.wave, hz(ev.m + oct), t, dur, p.vol, p.kind || 'sus', p.lp);
          if (p.double) env('sine', hz(ev.m + oct + 12), t, dur * 0.8, p.vol * 0.35, 'pluck');
        }
      }
      if (p.drums) { const d = p._d[bar % p._d.length][st]; if (d) d.forEach((c) => drum(c, t, p.vol)); }
    }
  }

  RF.storyScore = {
    names: Object.keys(SCORES),
    get current() { return next !== undefined ? next : cur; },
    set(name) {
      name = name && SCORES[name] ? name : null;
      if (next === undefined ? name === cur : name === next) return;
      if (!cur) { cur = name; next = undefined; level = 0; frame = 0; } else next = name;
    },
    stop() { cur = null; next = undefined; level = 0; if (out) out.gain.value = 0; },
    // once per frame, from the story scene
    tick() {
      const A = RF.audio; if (!A || !A.ctx) return;
      if (!out || out.context !== A.ctx) { out = A.ctx.createGain(); out.gain.value = 0; out.connect(A.master); }
      if (next !== undefined) { level = Math.max(0, level - 0.03); if (level === 0) { cur = next; next = undefined; frame = 0; } }
      else if (cur) level = Math.min(1, level + 0.04);
      out.gain.value = (RF.CONFIG.MUSIC_VOLUME == null ? 0.7 : RF.CONFIG.MUSIC_VOLUME) * level * 1.15;
      const sc = cur && SCORES[cur];
      if (!sc) return;
      prepare(sc);
      if (frame % sc.step === 0) playStep(sc, frame / sc.step);
      frame++;
    },
  };
})();
