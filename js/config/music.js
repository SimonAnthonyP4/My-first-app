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
  const SKANK = 'k+h . s . k+h . s . k+h . s . k+h . s .';           // thrash beat
  const GALLOP = 'k+h . k k s . k k k+h . k k s . k k';              // double-kick gallop
  const HALF = 'k+h . k . s . . k k . k . s . . .';                  // half-time, huge
  const DBEAT = 'k+h . s . k+h k s . k+h . s . k+h k s .';           // punk d-beat
  const GROOVE = 'k+h . h k s . h . k+h k h . s . h .';              // mid-tempo groove
  const DOOM = 'k+h . . . . . h . s . . . . . k .';                   // slow and crushing
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
            crash(SKANK), SKANK, SKANK, FILL_A,
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
        drums: { bars: [crash(SKANK), SKANK, SKANK, FILL_A, crash(GALLOP), GALLOP, crash(SKANK), FILL_B] },
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
