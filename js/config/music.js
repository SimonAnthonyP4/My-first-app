// Background music: original heavy metal, written as step patterns and played by
// the built-in synth "metal rig" (js/core/audio.js): double-tracked distorted
// guitars through an amp + speaker cabinet, a growling bass, a metal drum kit
// and a lead guitar with echo. No audio files needed.
//
// Each song has a tempo (bpm) and tracks. A track is a list of bars; each bar
// is 16 steps (16th notes) separated by spaces:
//   'E2'   play a note (letter, optional #, octave). On guitar: a ringing power chord.
//   'E2*'  palm-muted: a short, chunky chug
//   '-'    hold the previous note one more step
//   '.'    rest
// Drum steps: k kick, s snare, h hi-hat, o open hat, c crash, r ride,
// t low tom, T high tom. Combine with + (e.g. 'k+c').
// Track instruments: 'guitar' (rhythm, power chords, double-tracked L/R),
// 'lead' (solo guitar), 'bass'. Tracks loop independently.
//
// To add a song: add an entry here and set `music: '<id>'` on a stage.
(function () {
  // Transpose every note in a bar by some semitones (keeps rests, holds and palm mutes).
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const shift = (bar, semis) => bar.split(' ').map((t) => {
    const m = /^([A-G]#?)(-?\d)(\*?)$/.exec(t);
    if (!m) return t;
    const n = NAMES.indexOf(m[1]) + 12 * +m[2] + semis;
    return NAMES[((n % 12) + 12) % 12] + Math.floor(n / 12) + m[3];
  }).join(' ');
  const bassOf = (bars) => bars.map((b) => shift(b, -12));
  const crash = (bar) => bar.replace(/^k\+h|^k/, 'k+c');
  const rest = (n) => Array(n).fill('. . . . . . . . . . . . . . . .');
  const rep = (bar, n) => Array(n).fill(bar);

  // Drum patterns
  const SKANK = 'k+h k s k k+h k s k k+h k s k k+h k s k';           // thrash beat over rolling double kick
  const BLAST = 'k+h s k+h s k+h s k+h s k+h s k+h s k+h s k+h s';   // blast beat
  const GALLOP = 'k+h . k k s . k k k+h . k k s . k k';              // double-kick gallop
  const HALF = 'k+c k k k s . k k k k k k s . k k';                  // half-time, huge, double kick underneath
  const DBEAT = 'k+h . s . k+h k s . k+h . s . k+h k s .';           // punk d-beat
  const GROOVE = 'k+h k h k s . h k k+h k h k s . k k';              // mid-tempo groove, heavy-footed
  const DOOM = 'k+h . . . k k h . s . . . k k k .';                   // slow and crushing
  const FILL_A = 'k+h . s . k+h . s . s s s s T T t t';
  const FILL_B = 'k+h . k k s . k k s s T T t t t t';
  const STOP = 'k+c . . . . . . . . . . . s s s s';

  // ---------------------------------------------------------------- menu
  // "TERRAMANIA" - fast downpicked thrash in E minor: chromatic stabs, a gallop,
  // huge open chords with a melodic solo, then a shred run back into the riff.
  const M_A1 = 'E2* E2* E2* E2* E2* E2* E2* E2* G2 - E2* E2* A#2 - A2 -';
  const M_A2 = 'E2* E2* E2* E2* E2* E2* E2* E2* D3 - C#3 - C3 - B2 -';
  const M_B1 = 'E2* . E2* E2* E2* . E2* E2* F2 - - - E2* . E2* E2*';
  const M_B2 = 'G2 - - - F#2 - - - F2 - - - E2* . E2* E2*';
  const M_C1 = 'C3 - - - - - - - B2 - - - - - - -';
  const M_C2 = 'A#2 - - - - - - - A2 - - - G2 - F#2 -';
  const M_END = 'E2 - - - - - - - - - - - E2* E2* E2* E2*';
  const MENU_GTR = [M_A1, M_A2, M_A1, M_A2, M_B1, M_B2, M_B1, M_B2, M_C1, M_C2, M_C1, M_C2, M_A1, M_A2, M_A1, M_END];

  // ---------------------------------------------------------------- cafeteria
  // "LUNCH LINE MASSACRE" - relentless thrash.
  const C_1 = 'E2* E2* E2* E2* F2 - E2* E2* E2* E2* G2 - F#2 - F2 -';
  const C_2 = 'E2* E2* E2* E2* F2 - E2* E2* A#2 - A2 - G#2 - G2 -';
  const C_3 = 'A2* A2* A2* A2* A#2 - A2* A2* A2* A2* C3 - B2 - A#2 -';
  const C_4 = 'E2* E2* E2* E2* E2* E2* E2* E2* E3 - D3 - E3 - D#3 -';
  const CAF_GTR = [C_1, C_2, C_1, C_2, C_3, C_3, C_1, C_4];

  // ---------------------------------------------------------------- haunted court
  // "DEAD BALL" - slow, crushing doom in drop D with a tritone.
  const H_1 = 'D2 - - - - - - - D2* D2* F2 - - - D#2 -';
  const H_2 = 'D2 - - - - - - - D2* D2* G#2 - - - G2 -';
  const H_3 = 'C3 - - - - - - - A#2 - - - - - A2 -';
  const H_4 = 'D2* D2* D2* D2* D2* D2* D2* D2* D3 - C3 - A#2 - G#2 -';
  const COURT_GTR = [H_1, H_2, H_1, H_3, H_1, H_2, H_1, H_4];

  // ---------------------------------------------------------------- Sirven's office
  // "EXPELLED" - stop-start mid-tempo groove.
  const O_1 = 'E2* . E2* E2* . E2* G2 - E2* . E2* E2* . A2 - -';
  const O_2 = 'E2* . E2* E2* . E2* G2 - E2* . A#2 - A2 - G2 -';
  const O_3 = 'B2 - - - B2* B2* A#2 - A2 - - - G2 - F#2 -';
  const OFFICE_GTR = [O_1, O_2, O_1, O_3, O_1, O_2, O_1, O_3];

  // ---------------------------------------------------------------- NYC street
  // "CONCRETE JUNGLE" - fast and punky, then big chorus chords.
  const N_1 = 'E2* E2* E2* E2* E2* E2* E2* E2* G2* G2* G2* G2* A2* A2* A2* A2*';
  const N_2 = 'E2* E2* E2* E2* E2* E2* E2* E2* C3 - - - B2 - - -';
  const N_3 = 'D3 - - - - - - - C3 - - - - - - -';
  const N_4 = 'A2 - - - - - - - B2 - - - - - - -';
  const NYC_GTR = [N_1, N_2, N_1, N_2, N_3, N_4, N_3, N_4];

  RF.MUSIC = {
    menu: {
      bpm: 190,
      tracks: {
        guitar: { instrument: 'guitar', volume: 0.5, bars: MENU_GTR },
        bass: { instrument: 'bass', volume: 0.32, bars: bassOf(MENU_GTR) },
        lead: {
          instrument: 'lead', volume: 0.42,
          bars: [
            ...rest(8),
            'B4 - - - E5 - - - G5 - F#5 - E5 - D5 -',
            'E5 - - - - - - - . . B4 - D5 - E5 -',
            'G5 - - - F#5 - - - E5 - D5 - C5 - D5 -',
            'B4 - - - - - - - - - - - . . . .',
            'E5 F#5 G5 F#5 E5 F#5 G5 A5 B5 A5 G5 A5 B5 C6 B5 A5',
            'G5 A5 B5 C6 D6 C6 B5 A5 B5 - - - - - - -',
            'E6 D6 B5 A5 G5 A5 B5 G5 E6 D6 B5 A5 G5 E5 D5 E5',
            'E5 - - - - - - - - - - - . . . .',
          ],
        },
        drums: {
          bars: [
            crash(SKANK), SKANK, crash(BLAST), FILL_A,
            crash(GALLOP), GALLOP, GALLOP, FILL_B,
            crash(HALF), HALF, crash(HALF), FILL_B,
            crash(SKANK), SKANK, SKANK, STOP,
          ],
        },
      },
    },

    cafeteria: {
      bpm: 176,
      tracks: {
        guitar: { instrument: 'guitar', volume: 0.5, bars: CAF_GTR },
        bass: { instrument: 'bass', volume: 0.32, bars: bassOf(CAF_GTR) },
        lead: {
          instrument: 'lead', volume: 0.36,
          bars: [
            ...rest(4),
            'E5 - - - - - - - F5 - - - - - - -',
            'E5 - - - - - D5 - E5 - - - - - - -',
            'A5 - - - G5 - - - F5 - - - E5 - D5 -',
            'E5 - - - - - - - - - - - . . . .',
          ],
        },
        drums: { bars: [crash(SKANK), SKANK, crash(BLAST), FILL_A, crash(GALLOP), GALLOP, crash(BLAST), FILL_B] },
      },
    },

    court: {
      bpm: 84,
      tracks: {
        guitar: { instrument: 'guitar', volume: 0.5, bars: COURT_GTR },
        bass: { instrument: 'bass', volume: 0.34, bars: bassOf(COURT_GTR) },
        lead: {
          instrument: 'lead', volume: 0.32,
          bars: [
            ...rest(4),
            'A5 - - - - - - - G#5 - - - - - - -',
            'F5 - - - - - E5 - D5 - - - - - - -',
            'A5 - - - - - - - A#5 - - - A5 - G#5 -',
            'D5 - - - - - - - - - - - . . . .',
          ],
        },
        drums: { bars: [crash(DOOM), DOOM, DOOM, 'k+h . . . . . h . s . . . s s T t', crash(DOOM), DOOM, DOOM, 'k+c . . . . . . . s . s . T T t t'] },
      },
    },

    office: {
      bpm: 120,
      tracks: {
        guitar: { instrument: 'guitar', volume: 0.5, bars: OFFICE_GTR },
        bass: { instrument: 'bass', volume: 0.32, bars: bassOf(OFFICE_GTR) },
        lead: {
          instrument: 'lead', volume: 0.34,
          bars: [
            ...rest(4),
            'E5 - G5 - A5 - - - A#5 A5 G5 - E5 - - -',
            'D5 - E5 - - - - - G5 - E5 - D5 - B4 -',
            'E5 - G5 - A5 - - - A#5 A5 G5 - E5 - D5 -',
            'E5 - - - - - - - . . . . . . . .',
          ],
        },
        drums: { bars: [crash(GROOVE), GROOVE, GROOVE, FILL_A, crash(GROOVE), GROOVE, GROOVE, FILL_B] },
      },
    },

    nyc: {
      bpm: 200,
      tracks: {
        guitar: { instrument: 'guitar', volume: 0.5, bars: NYC_GTR },
        bass: { instrument: 'bass', volume: 0.32, bars: bassOf(NYC_GTR) },
        lead: {
          instrument: 'lead', volume: 0.36,
          bars: [
            ...rest(4),
            'F#5 - - - - - - - E5 - - - - - - -',
            'E5 - - - - - - - F#5 - - - - - - -',
            'A5 - - - - - G5 - F#5 - - - E5 - - -',
            'E5 - - - - - - - D#5 - - - - - - -',
          ],
        },
        drums: { bars: [crash(DBEAT), DBEAT, DBEAT, FILL_A, crash(HALF), HALF, crash(HALF), FILL_B] },
      },
    },
  };

  // ================================================================ STAGE THEMES
  // One for every map. The heavy ones use the metal rig like the songs above; the laid-back
  // ones (clean: true) use the quiet band - instruments 'keys', 'pad', 'sub', 'bell' and the
  // soft drum kit: b kick, p rim, x hat, m shaker - and are never downtuned.
  const arp = (...n) => n.map((x) => x + ' -').join(' ');          // eight notes, an eighth each
  const hold = (n) => n + ' - - - - - - - - - - - - - - -';         // one note for the whole bar
  const two = (a, b) => a + ' - - - - - - - ' + b + ' - - - - - - -'; // two half-bar notes
  const loop = (bars, n) => Array(n).fill(bars).flat();
  const SOFT = 'b . x . p . x . b b x . p . x .';
  const SOFT2 = 'b . x . p . x x b . x b p . x m';
  const BRUSH = 'b . m . p . m . . . m b p . m .';

  // ---- FRIDAY NIGHT LIGHTS: "Fourth and Goal" - a galloping stadium anthem.
  const F_1 = 'E2* E2* E2* G2 - E2* E2* A2 - E2* E2* B2 - A2 G2 -';
  const F_2 = 'C3 - - - C3* C3* D3 - - - D3* D3* E3 - - -';
  // ---- BRO BATCH HQ: "One More Rep" - a pumping mid-tempo groove.
  const B_1 = 'E2* E2* . E2* E2* . G2 - E2* E2* . E2* A2 - G2 -';
  const B_2 = 'E2* E2* . E2* E2* . G2 - A#2 - - - A2 - - -';
  const B_3 = 'D3 - - - D3* D3* C3 - - - C3* C3* B2 - - -';
  // ---- PARKING LOT: "Burnout" - slow, greasy sludge.
  const P_1 = 'E2 - - - E2* E2* G2 - - - F#2 - F2 - - -';
  const P_2 = 'E2 - - - E2* E2* A#2 - - - A2 - G2 - - -';
  const P_3 = 'C3 - - - - - B2 - - - - - A#2 - A2 -';
  // ---- THE MAIN HALLWAY: "Hall Pass" - a tense march.
  const L_1 = 'E2* . E2* . E2* E2* F2 - E2* . E2* . G2 - F2 -';
  const L_2 = 'E2* . E2* . E2* E2* F2 - A#2 - - - B2 - - -';
  const MARCH = 'k+h . s s k+h . s . k+h . s s k+h s s s';
  // ---- THE SKATEPARK: "Kickflip" - fast, bright pop punk (standard tuning).
  const S_1 = 'A2* A2* A2* A2* A2* A2* A2* A2* E3* E3* E3* E3* E3* E3* E3* E3*';
  const S_2 = 'F#2* F#2* F#2* F#2* F#2* F#2* F#2* F#2* D3* D3* D3* D3* D3* D3* D3* D3*';
  const S_3 = 'A2 - - - - - - - E3 - - - - - - -';
  const S_4 = 'F#2 - - - - - - - D3 - - - E3 - - -';
  const metal = (bpm, gtr, lead, drums, extra) => Object.assign({ bpm, tracks: {
    guitar: { instrument: 'guitar', volume: 0.5, bars: gtr }, bass: { instrument: 'bass', volume: 0.32, bars: bassOf(gtr) },
    lead: { instrument: 'lead', volume: 0.36, bars: lead }, drums: { bars: drums } } }, extra);

  Object.assign(RF.MUSIC, {
    field: metal(168, [F_1, F_1, F_1, F_2, F_1, F_1, F_2, F_2], [
      ...rest(4),
      'E5 - - - G5 - - - B5 - - - A5 - G5 -', 'E5 - - - - - - - D5 - - - B4 - - -',
      'E5 - G5 - B5 - - - D6 - - - B5 - A5 -', 'B5 - - - - - - - - - - - . . . .',
    ], [crash(GALLOP), GALLOP, GALLOP, FILL_B, crash(GALLOP), GALLOP, crash(HALF), FILL_A]),
    brobatch: metal(132, [B_1, B_2, B_1, B_2, B_3, B_3, B_1, B_2], [
      ...rest(4),
      'D5 - - - - - E5 - D5 - - - B4 - - -', 'D5 - - - - - E5 - G5 - - - F#5 - - -',
      'E5 - G5 - E5 - - - A#5 A5 G5 - E5 - - -', 'E5 - - - - - - - . . . . . . . .',
    ], [crash(GROOVE), GROOVE, GROOVE, FILL_A, crash(HALF), HALF, crash(GROOVE), FILL_B]),
    parking: metal(100, [P_1, P_2, P_1, P_3, P_1, P_2, P_3, P_3], [
      ...rest(4),
      'E5 - - - - - - - G5 - - - F#5 - - -', 'E5 - - - - - D5 - B4 - - - - - - -',
      'G5 - - - - - - - A#5 - - - A5 - G5 -', 'E5 - - - - - - - - - - - . . . .',
    ], [crash(DOOM), DOOM, DOOM, 'k+h . . . k k h . s . . . s s T t', crash(HALF), HALF, crash(DOOM), FILL_B]),
    hallway: metal(124, [L_1, L_2, L_1, L_2], [
      ...rest(4),
      'B4 - - - C5 - - - B4 - - - - - - -', 'B4 - - - C5 - - - E5 - - - D#5 - - -',
      'E5 - - - F5 - - - E5 - - - - - B4 -', 'A#4 - - - - - - - B4 - - - . . . .',
    ], [crash(MARCH), MARCH, MARCH, FILL_A]),
    skatepark: metal(196, [S_1, S_2, S_1, S_2, S_3, S_4, S_3, S_4], [
      'C#5 - E5 - A5 - - - G#5 - E5 - B4 - - -', 'A4 - C#5 - F#5 - - - F#5 - E5 - D5 - - -',
      'C#5 - E5 - A5 - - - B5 - A5 - G#5 - - -', 'F#5 - - - A5 - - - F#5 - E5 - D5 - E5 -',
      'A5 - - - - - - - G#5 - - - - - - -', 'F#5 - - - - - - - A5 - - - B5 - - -',
      'C#6 - - - - - - - B5 - - - G#5 - - -', 'A5 - - - - - - - - - - - . . . .',
    ], [crash(DBEAT), DBEAT, DBEAT, FILL_A, crash(DBEAT), DBEAT, DBEAT, FILL_B], { clean: true }),

    // ---- THE BACK NINE: "Sunday Round" - an easy major-seventh stroll.
    golf: { bpm: 92, clean: true, drumVolume: 0.6, tracks: {
      keys: { instrument: 'keys', volume: 0.2, bars: loop([arp('C4', 'E4', 'G4', 'B4', 'G4', 'E4', 'G4', 'B4'), arp('A3', 'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4'), arp('F3', 'A3', 'C4', 'E4', 'C4', 'A3', 'C4', 'E4'), arp('G3', 'B3', 'D4', 'F4', 'D4', 'B3', 'D4', 'G4')], 2) },
      pad: { instrument: 'pad', volume: 0.07, bars: [hold('E3'), hold('E3'), hold('C3'), hold('D3')] },
      sub: { instrument: 'sub', volume: 0.3, bars: ['C2 - - - - - . . C2 - - - G2 - - -', 'A1 - - - - - . . A1 - - - E2 - - -', 'F1 - - - - - . . F1 - - - C2 - - -', 'G1 - - - - - . . G1 - - - B1 - D2 -'] },
      bell: { instrument: 'bell', volume: 0.12, bars: [...rest(4), 'E5 - - - - - G5 - - - - - E5 - - -', 'C5 - - - - - - - E5 - - - D5 - - -', 'C5 - - - - - A4 - - - - - C5 - - -', 'D5 - - - - - - - - - - - . . . .'] },
      drums: { bars: [SOFT, SOFT, SOFT, SOFT2] },
    } },
    // ---- SOUTH BEACH: "Ocean Drive, 2 AM" - neon synthwave with the top down.
    miami: { bpm: 104, clean: true, drumVolume: 0.7, tracks: {
      sub: { instrument: 'sub', volume: 0.3, bars: ['A1 . A1 . A1 . A1 . A1 . A1 . A1 . A2 .', 'F1 . F1 . F1 . F1 . F1 . F1 . F1 . F2 .', 'C2 . C2 . C2 . C2 . C2 . C2 . C2 . C3 .', 'G1 . G1 . G1 . G1 . G1 . G1 . G1 . B1 .'] },
      keys: { instrument: 'keys', volume: 0.15, pan: -0.3, bars: ['A3 C4 E4 A4 E4 C4 A3 C4 E4 A4 E4 C4 A3 C4 E4 A4', 'F3 A3 C4 F4 C4 A3 F3 A3 C4 F4 C4 A3 F3 A3 C4 F4', 'C4 E4 G4 C5 G4 E4 C4 E4 G4 C5 G4 E4 C4 E4 G4 C5', 'G3 B3 D4 G4 D4 B3 G3 B3 D4 G4 D4 B3 G3 B3 D4 G4'] },
      pad: { instrument: 'pad', volume: 0.08, bars: [hold('E3'), hold('C3'), hold('E3'), hold('D3')] },
      bell: { instrument: 'bell', volume: 0.13, pan: 0.3, bars: [...rest(4), 'E5 - - - - - - - C5 - - - D5 - E5 -', 'A5 - - - - - - - G5 - - - F5 - - -', 'G5 - - - - - E5 - - - - - C5 - - -', 'D5 - - - - - - - B4 - - - . . . .'] },
      drums: { bars: ['b . x . p . x . b . x b p . x .', 'b . x . p . x . b . x b p . x x'] },
    } },
    // ---- MUSIC ROOM: "Practice Room B" - somebody is playing the piano after school.
    musicroom: { bpm: 84, clean: true, drumVolume: 0.4, tracks: {
      keys: { instrument: 'keys', volume: 0.22, bars: loop([arp('D3', 'A3', 'D4', 'F#4', 'A4', 'F#4', 'D4', 'A3'), arp('B2', 'F#3', 'B3', 'D4', 'F#4', 'D4', 'B3', 'F#3'), arp('G2', 'D3', 'G3', 'B3', 'D4', 'B3', 'G3', 'D3'), arp('A2', 'E3', 'A3', 'C#4', 'E4', 'C#4', 'A3', 'E3')], 2) },
      top: { instrument: 'keys', volume: 0.2, bars: [...rest(4), 'F#5 - - - - - E5 - D5 - - - - - A4 -', 'D5 - - - - - C#5 - B4 - - - - - - -', 'B4 - - - D5 - - - G5 - - - F#5 - - -', 'E5 - - - - - - - - - - - . . . .'] },
      pad: { instrument: 'pad', volume: 0.05, bars: [hold('F#3'), hold('F#3'), hold('D3'), hold('E3')] },
      sub: { instrument: 'sub', volume: 0.2, bars: [hold('D2'), hold('B1'), hold('G1'), hold('A1')] },
    } },
    // ---- THE CRAG: "Thin Air" - high up, wide open, almost still.
    cliff: { bpm: 70, clean: true, drumVolume: 0.45, tracks: {
      pad: { instrument: 'pad', volume: 0.1, bars: [hold('E3'), hold('C3'), hold('G3'), hold('D3')] },
      pad2: { instrument: 'pad', volume: 0.07, bars: [hold('B3'), hold('G3'), hold('D4'), hold('A3')] },
      sub: { instrument: 'sub', volume: 0.24, bars: [hold('E1'), hold('C2'), hold('G1'), hold('D2')] },
      bell: { instrument: 'bell', volume: 0.14, bars: ['B4 - - - - - - - G5 - - - - - F#5 -', 'E5 - - - - - - - - - - - G4 - - -', 'B4 - - - - - D5 - - - - - - - - -', 'A5 - - - - - - - F#5 - - - . . . .'] },
      keys: { instrument: 'keys', volume: 0.1, pan: 0.4, bars: [...rest(4), '. . E4 - . . B4 - . . G4 - . . B4 -', '. . C4 - . . G4 - . . E4 - . . G4 -', '. . D4 - . . B4 - . . G4 - . . B4 -', '. . D4 - . . A4 - . . F#4 - . . A4 -'] },
      drums: { bars: ['b . . . . . m . . . b . . . m .'] },
    } },
    // ---- REGAL KENDALL VILLAGE: "Now Showing" - lobby jazz while the trailers play.
    regal: { bpm: 96, clean: true, drumVolume: 0.6, tracks: {
      keys: { instrument: 'keys', volume: 0.17, bars: ['. . F4 - . . A4 - . . C5 - . F4 A4 -', '. . F4 - . . B4 - . . D5 - . F4 B4 -', '. . E4 - . . G4 - . . B4 - . E4 G4 -', '. . E4 - . . G4 - . . C5 - . E4 A4 -'] },
      pad: { instrument: 'pad', volume: 0.06, bars: [hold('C4'), hold('B3'), hold('B3'), hold('C4')] },
      sub: { instrument: 'sub', volume: 0.3, bars: ['D2 - - - F2 - - - A2 - - - C3 - A2 -', 'G1 - - - B1 - - - D2 - - - F2 - D2 -', 'C2 - - - E2 - - - G2 - - - B2 - G2 -', 'A1 - - - C2 - - - E2 - - - G2 - E2 -'] },
      bell: { instrument: 'bell', volume: 0.12, bars: [...rest(4), 'A5 - - - - - F5 - - - E5 - D5 - - -', 'D5 - - - - - - - F5 - - - G5 - - -', 'E5 - - - - - G5 - - - B5 - - - A5 -', 'E5 - - - - - - - - - - - . . . .'] },
      drums: { bars: [BRUSH, BRUSH, BRUSH, 'b . m . p . m . . . m b p . p p'] },
    } },
  });

  // ---- THE THRONE BETWEEN: "Headmaster" - a slow crawl on a tritone, with a bell-like lead.
  const TH_1 = 'E2 - - - - - - - E2* E2* A#2 - - - A2 -';
  const TH_2 = 'E2 - - - - - - - E2* E2* F2 - - - E2* E2*';
  const TH_3 = 'C3 - - - - - A#2 - - - - - A2 - G#2 -';
  RF.MUSIC.throne = metal(88, [TH_1, TH_2, TH_1, TH_3], [
    ...rest(4),
    'E5 - - - - - - - A#5 - - - - - - -', 'A5 - - - - - - - G5 - - - F5 - - -',
    'E5 - - - - - - - A#5 - - - - - A5 -', 'E5 - - - - - - - - - - - . . . .',
  ], [crash(DOOM), DOOM, DOOM, 'k+h . . . k k h . s . . . s s T t']);

  // DOWNTUNED: every riff, bass line and solo is dropped a fourth (E becomes a low B) and each
  // song is pulled back a little, so the whole soundtrack sits deeper and hits harder.
  // (Set DOWNTUNE to 0 and DRAG to 1 for the original tuning and tempos.)
  const DOWNTUNE = -5, DRAG = 0.93;
  for (const song of Object.values(RF.MUSIC)) {
    if (song.clean) continue;                    // the laid-back themes (and the skatepark) keep their own key
    song.bpm = Math.round(song.bpm * DRAG);
    for (const [name, tr] of Object.entries(song.tracks)) if (name !== 'drums') tr.bars = tr.bars.map((b) => shift(b, DOWNTUNE));
  }

  // Every bar must be exactly 16 steps; catch typos early.
  for (const [id, song] of Object.entries(RF.MUSIC)) {
    for (const [name, tr] of Object.entries(song.tracks)) {
      tr.bars.forEach((b, i) => {
        const n = b.split(/\s+/).filter(Boolean).length;
        if (n !== 16) console.warn(`music ${id}.${name} bar ${i + 1} has ${n} steps`);
      });
    }
  }
})();
