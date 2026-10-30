// Background music, written as step patterns for the built-in chiptune synth
// (js/core/audio.js). No audio files needed.
//
// Each song has a tempo (bpm) and tracks. A track is a list of bars; each bar
// is 16 steps (16th notes) separated by spaces:
//   'D4'  play a note (letter, optional # or b, octave)
//   '-'   hold the previous note one more step
//   '.'   rest
// Drum steps use k = kick, s = snare, h = hi-hat; combine with + (e.g. 'k+h').
// Tracks loop independently, so a 2-bar drum loop can run under an 8-bar melody.
//
// To add a song: add an entry here and set `music: '<id>'` on a stage.
(function () {
  // Bass riff helper: x = root, o = root an octave up.
  const riff = (shape, low, high) => shape.split(' ').map((t) => (t === 'x' ? low : t === 'o' ? high : t)).join(' ');
  const PUMP = 'x . o x . x o . x . o x . x o x';

  RF.MUSIC = {
    // Main menu / character select: driving A minor.
    menu: {
      bpm: 132,
      tracks: {
        bass: {
          wave: 'triangle', volume: 0.32,
          bars: [
            riff(PUMP, 'A1', 'A2'), riff(PUMP, 'A1', 'A2'),
            riff(PUMP, 'F1', 'F2'), riff(PUMP, 'G1', 'G2'),
          ],
        },
        lead: {
          wave: 'square', volume: 0.08,
          bars: [
            'A4 - - C5 - - E5 - - - D5 - C5 - B4 -',
            'C5 - - - A4 - - - E4 - - - A4 - B4 -',
            'C5 - - F5 - - E5 - - - D5 - C5 - A4 -',
            'B4 - - - G4 - - - B4 - D5 - E5 - - -',
          ],
        },
        drums: {
          bars: ['k . h . s . h . k k h . s . h h', 'k . h . s . h k . k h . s . s s'],
        },
      },
    },

    // Stage 1: Hell Cafeteria. Ominous D minor organ riff.
    cafeteria: {
      bpm: 144,
      tracks: {
        bass: {
          wave: 'square', volume: 0.12,
          bars: [
            riff(PUMP, 'D2', 'D3'), riff(PUMP, 'D2', 'D3'),
            riff(PUMP, 'A#1', 'A#2'), riff(PUMP, 'C2', 'C3'),
            riff(PUMP, 'D2', 'D3'), riff(PUMP, 'D2', 'D3'),
            riff(PUMP, 'A#1', 'A#2'), riff(PUMP, 'A1', 'A2'),
          ],
        },
        lead: {
          wave: 'sawtooth', volume: 0.05,
          bars: [
            'D4 - - F4 - - A4 - G4 - F4 - E4 - - -',
            'F4 - - A4 - - D5 - C#5 - - - A4 - - -',
            'D5 - - C5 - - A#4 - A4 - G4 - F4 - G4 -',
            'E4 - - G4 - - C5 - - - A#4 - A4 - G4 -',
            'D5 - D5 - C5 - A4 - D5 - - - F5 - E5 -',
            'D5 - - - A4 - - - F4 - G4 - A4 - - -',
            'A#4 - - D5 - - F5 - E5 - D5 - C5 - A#4 -',
            'A4 - - - C#5 - - - E5 - - - A4 - - -',
          ],
        },
        drums: {
          bars: ['k . h k s . h . k . h k s . h h', 'k . h k s . h . k k h . s s s s'],
        },
      },
    },

    // Stage 2: Abandoned NYC street. Gritty E minor street groove.
    nyc: {
      bpm: 104,
      tracks: {
        bass: {
          wave: 'square', volume: 0.14,
          bars: [
            'E2 . . E2 . . G2 . A2 . . A2 . B2 A2 G2',
            'E2 . . E2 . . D2 . D2 . E2 . . . B1 D2',
            'E2 . . E2 . . G2 . A2 . . A2 . B2 A2 G2',
            'C2 . . C2 . . D2 . D2 . . B1 . . B1 .',
          ],
        },
        lead: {
          wave: 'square', volume: 0.07,
          bars: [
            '. . . . E4 . G4 . A4 . A#4 B4 - . A4 .',
            'G4 . E4 - - - . . . . . . D4 E4 - .',
            '. . . . B4 . D5 . E5 - D5 . B4 . A4 .',
            'G4 - - . A4 - - . B4 - - - - - . .',
          ],
        },
        drums: {
          bars: ['k+h . h . s+h . h k . k+h . h s+h . h .', 'k+h . h . s+h . h k . k+h . k s+h . s+h h'],
        },
      },
    },
  };
})();
