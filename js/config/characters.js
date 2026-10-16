// ===================== CHARACTER ROSTER & BALANCE =====================
// Every per-character balance number lives in this file.
//
// stats:
//   walkSpeed        pixels per frame when walking forward
//   jumpPower        initial upward speed of a jump
//   damage           multiplier on base attack damage (moves.js). 1.2 = +20%
//   damageReduction  fraction of incoming damage ignored. 0.2 = takes 20% less,
//                    -0.1 = takes 10% MORE
//   attackSpeed      multiplier on attack speed. 1.3 = attacks 30% faster
//
// body:   size used for collision/hurtboxes (width/height in pixels) and for
//         the placeholder sprite (scale = overall size, bulk = thickness).
// sprite: how the fighter is drawn. 'procedural' = generated placeholder
//         pixel art from the palette. Swap to a sprite sheet later with
//         { type: 'sheet', src: 'assets/sprites/<id>.png', ... } (see README).
//
// Health is NOT per character: every fighter has RF.CONFIG.MAX_HEALTH.
// The two fighters below are prototype placeholders; the real roster of 8
// comes in milestone 6.
RF.CHARACTERS = [
  {
    id: 'bruiser',
    name: 'Bruiser',
    archetype: 'tank',
    placeholder: true,
    origin: 'TBD',
    bio: 'Placeholder tank for the prototype.',
    stats: {
      walkSpeed: 1.5,
      jumpPower: 7.6,
      damage: 1.2,
      damageReduction: 0.2,
      attackSpeed: 0.8,
    },
    body: { scale: 1.18, bulk: 1.4, width: 34, height: 90 },
    sprite: {
      type: 'procedural',
      palette: {
        skin: '#b9764a', hair: '#1c1410', eyes: '#ffffff',
        top: null, sleeves: null,          // null = bare skin (shirtless)
        pants: '#3b4a8a', belt: '#7a5418',
        gloves: '#c42a2a', shoes: '#2a2a2a',
        mask: null, outline: '#120808',
      },
    },
  },
  {
    id: 'viper',
    name: 'Viper',
    archetype: 'light',
    placeholder: true,
    origin: 'TBD',
    bio: 'Placeholder light fighter for the prototype.',
    stats: {
      walkSpeed: 2.4,
      jumpPower: 8.6,
      damage: 0.9,
      damageReduction: -0.1,
      attackSpeed: 1.3,
    },
    body: { scale: 1.0, bulk: 1.0, width: 24, height: 76 },
    sprite: {
      type: 'procedural',
      palette: {
        skin: '#e0b088', hair: '#2e8b3e', eyes: '#ffffff',
        top: '#2e8b3e', sleeves: '#2e8b3e',
        pants: '#24702f', belt: '#111111',
        gloves: '#1a1a1a', shoes: '#1a1a1a',
        mask: '#2e8b3e', outline: '#08140a',
      },
    },
  },
];

RF.getCharacter = (id) => RF.CHARACTERS.find((c) => c.id === id);
