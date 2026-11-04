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
// special: id of this character's one special move in specials.js.
// throw:   id of this character's throw in throws.js.
// finisher: id of this character's FINISH THEM! move in game/finishers.js.
//
// Health depends on archetype (RF.CONFIG.HEALTH_BY_ARCHETYPE): tanks start at
// 175%, light fighters at 100%. Health bars are the same size for everyone.
//
// Optional per-character extras:
//   moves:    { heavy: {...} } replaces/overrides that move from moves.js
//   blockFx:  name of a block effect in game/fx.js (e.g. 'electricShield')
//   blockSpark: spark effect shown when an attack is blocked
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
    special: 'seismicSlam',   // see specials.js
    throw: 'liftSlam',        // see throws.js
    finisher: 'pileDriver',   // see game/finishers.js
    stats: {
      walkSpeed: 1.5,
      jumpPower: 10.4,
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
    special: 'venomSpit',
    throw: 'snakeBite',
    finisher: 'venomMelt',
    stats: {
      walkSpeed: 2.4,
      jumpPower: 11.4,
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
  {
    id: 'weissenberg',
    name: 'Dr. Weissenberg',
    archetype: 'tank',
    origin: 'Science Lab, Room 13',
    bio: 'A lab accident turned this teacher into a human battery.',
    special: 'teslaSurge',
    throw: 'defibrillator',
    finisher: 'overcharge',
    stats: {
      walkSpeed: 1.7,
      jumpPower: 10.6,
      damage: 1.1,
      damageReduction: 0.15,
      attackSpeed: 0.9,
    },
    // His heavy is a ranged lightning bolt instead of a kick.
    moves: {
      heavy: {
        startup: 12, active: 8, recovery: 20,
        damage: 10,
        hitstun: 24, blockstun: 14,
        pushback: 5, hitstop: 8,
        anim: 'special',            // arms thrust forward instead of a kick
        fx: 'lightning',            // drawn by game/fx.js
        fxHand: [20, 44],           // where the bolt leaves his hands (x ahead, y up)
        hitbox: { x: 18, y: 36, w: 110, h: 16 },
      },
    },
    blockFx: 'electricShield',
    blockSpark: 'zap',
    body: { scale: 1.0, bulk: 1.0, width: 26, height: 72, crouchHeight: 0.78 },
    // Hand-drawn in Piskel (one standing frame), animated as a pixel puppet.
    sprite: {
      type: 'pixel',
      scale: 3,
      legend: { H: 'hair', S: 'skin', E: 'eyes', W: 'coat', T: 'tie', B: 'shirt', P: 'pants', K: 'shoes' },
      palette: {
        hair: '#6e5434', skin: '#f7bcae', eyes: '#1e2280', coat: '#f3f1ec',
        tie: '#141414', shirt: '#4b97e6', pants: '#7b4a14', shoes: '#101010',
      },
      grid: [
        '.HSSSSS....',
        'HHHSSSS....',
        'HHSHSES....',
        'HHSHSSSS...',
        '.SSSSSSS...',
        '.SSSSSS....',
        '..SSSSS....',
        '..WWWT.....',
        '.WWWWTT....',
        '.WWWWWTT...',
        '.WWWWWWT...',
        '.WWWWWWBB..',
        '.WWWWWWBBB.',
        '.WWWWWWBBB.',
        '.WWSSWWBBBB',
        '.WWWWWWBBBB',
        '.WWWWWWSSS.',
        '.WWWWWPPP..',
        '..PPPPPP...',
        '..PPPPP....',
        '...PPPP....',
        '...PPP.....',
        '...KKK.....',
        '...KKKK....',
      ],
      neckRow: 7,
      waistRow: 17,
      shoulder: [4, 8],
      sideHand: [[3, 14], [4, 14]],
      footCol: 4.5,
      crouchDrop: 5,
    },
  },
  {
    id: 'jauregui',
    name: 'Jauregui',
    archetype: 'light',
    origin: 'Math Dept, Room 314',
    bio: 'The math teacher. Show your work, or else.',
    special: 'popQuiz',
    throw: 'outlierRemoval',
    finisher: 'failingGrade',
    stats: {
      walkSpeed: 2.2,
      jumpPower: 11.2,
      damage: 0.95,
      damageReduction: -0.05,
      attackSpeed: 1.15,
    },
    moves: {
      // Smacks you with her ruler: a bit more reach than a punch.
      light: { anim: 'light', hitbox: { x: 12, y: 46, w: 40, h: 14 } },
      lowLight: { hitbox: { x: 12, y: 26, w: 38, h: 12 } },
      // Heavy: throws a spinning math symbol across the screen.
      heavy: {
        startup: 12, active: 2, recovery: 22,
        damage: 0, hitstun: 0, blockstun: 0, pushback: 0, knockback: 0, hitstop: 0,
        anim: 'special',
        hitbox: { x: 0, y: 0, w: 0, h: 0 },
        projectile: {
          speed: 4.5, size: 12, height: 0.62,
          damage: 8, hitstun: 22, blockstun: 12, pushback: 4, hitstop: 6,
          glyphs: ['Σ', 'Π', '√', '∞', '÷', '±', 'Δ', '∫'],
          colors: ['#ffffff', '#fff2a0', '#c8b060'],
          sound: 'whoosh',
        },
      },
    },
    body: { scale: 1.0, bulk: 1.0, width: 24, height: 79, crouchHeight: 0.82 },
    // Drawn as one standing frame; animated as a pixel puppet. Fine art (1 art
    // pixel = 1 game pixel), so the added arms/legs are drawn 3 art pixels thick.
    sprite: {
      type: 'pixel',
      scale: 1,
      limbScale: 3,
      crouchSquash: true,
      legend: { A: 'horn4', B: 'hair4', C: 'hair3', D: 'hair5', E: 'horn3', F: 'horn2', G: 'horn', H: 'hair', I: 'hair2', J: 'skin', K: 'skin2', L: 'hair7', M: 'eyes', N: 'ruler1', O: 'ruler2', P: 'ruler0', Q: 'dark7', R: 'shirt2', S: 'ruler4', T: 'gem', U: 'shirt3', V: 'shirt', W: 'shirt4', X: 'ruler3', Y: 'rulerHand', Z: 'rulerHand2', a: 'book2', b: 'book', c: 'bookInk', d: 'ruler9', e: 'dark3', f: 'darkh', g: 'pants3', h: 'pants2', i: 'pants', j: 'pants4', k: 'pants5', l: 'shoes', m: 'shoes2' },
      palette: {
        horn4: '#301111', hair4: '#634e47', hair3: '#3b1f15', hair5: '#463a35',
        horn3: '#471418', horn2: '#3d1116', horn: '#5e191e', hair: '#311c13',
        hair2: '#492519', skin: '#efa17c', skin2: '#b27e66', hair7: '#301111',
        eyes: '#1b1918', ruler1: '#262322', ruler2: '#463a35', ruler0: '#2b2827',
        dark7: '#2b2827', shirt2: '#3d1116', ruler4: '#634e47', gem: '#1d1b1a',
        shirt3: '#471418', shirt: '#5e191e', shirt4: '#301111', ruler3: '#1d1b1a',
        rulerHand: '#efa17c', rulerHand2: '#b27e66', book2: '#1b1918', book: '#262322',
        bookInk: '#b8b0a0', ruler9: '#2d1f1c', dark3: '#11100f', darkh: '#171413',
        pants3: '#11100f', pants2: '#1b1918', pants: '#1d1b1a', pants4: '#171413',
        pants5: '#463a35', shoes: '#171413', shoes2: '#463a35',
      },
      grid: [
        '.........A..BCCCCCC....D..............',
        '........AA..DCCCCCC...DE..............',
        '........FGAHIIIIIIICHHFG..............',
        '......HAGGAHIIIIIIICHEGGF.............',
        '......HAGGEAIICIIIICAEGGF.............',
        '......HAEGGAIHHHHIIIAGGEF.............',
        '...HHHHCAAAIIHHHHIIIIFAACC............',
        '...HHHHIIIIHHHHHHIIIIIICCC............',
        '...HHHHIIIIHHHHJJKHHIIIHHC............',
        '...HHIIIIIIHHHHJJJLHIIIHHC............',
        '...HHIIICCHHIBBJJJBBBICHHH............',
        '...HHIIICHHHKJJJJJJJJBHHHH............',
        '.BHIIIIICHHMBJJJJJJJJBMHHC............',
        '.BHIIICHHHHMMMJJJJJJMMMHCCC...........',
        '..IIIICHHHHKIMMDJJDMMDJHHCC...........',
        '.BIIIHHHHHHJBMMMJJMMMBJHHCC...........',
        'HHHIIHCCCHHJBMMMJJHMMBJCCHC...........',
        'HHHHHHCICHHJJJJJJJJJJJJJJHH...........',
        '.DHHHIIICHHJJJJJJJJJJJJJJHH...........',
        '.DHHHIIICHHJJJJJJJJJJJJIICC...........',
        '.BDHHIIICHHKKJJJJJJJJJJHHC............',
        '...HHIIIICHHHJJJJJJJJJJHHH..........NO',
        '...HHHHCIIIHHJJJJJHHHHHHHH..........NN',
        '...HHHHCIIIHHKKKKKHHHHHHHH.........NNP',
        'DHHHHHIIIHHHHKKKKKHHHHHH...........PPO',
        'DHHHHHIIIHHHHKKJJJHHHHHH...........PP.',
        'QHHCIIIIHHHHHKKJJJHHHHHHHH........NPP.',
        'DHHCIIIIHIIHHDKJJJBRRHHHHHH.......PPS.',
        'DHHHHHHHHCIHHBJBKBJRRLCCHHH.......PP..',
        '..HHHHHHHIIHHBJJTJJJBRHCCID......NPP..',
        '..HHHHHCIIIHHBJJJJJJBUHCCB.......PP...',
        '..HHHHHHIIIHHHRJJJJRUVWHCD......SPP...',
        'HHHHHHIIIHHHRUVKJJJRUVURCCC.....PPP...',
        'HHHHHHIIIHHRVVVRRJRUVVVRHCC.....PPO...',
        'DHHHCIIIIHHUVVVVUJRUVVVRWHC.....PP....',
        'DHHHCIICHHCUVVVVVRUVVVVVRCC....OPO....',
        '.BHHCCICHCUUVVVVVRVVVVVVWRC....XN.....',
        '..HHHHCCHVURUUVVVUVVVVVUWRCC.YYYS.....',
        '..HHRRCCHVUWRRVVVVVVVVRRWRCC.YYYYY....',
        '....RRVVVVUWWWRVVVVVVURRRRKZYYYYYY....',
        '....RRVVVVRWWWWVVVVVVRWRRRRRYYYYYY....',
        '....RRVVVaaaaaaaUVVVVRWRUUVVZZOZY.....',
        '...URVVHaabbbbbaWVVVVRWRRUVVSONN......',
        '...RVVVHbbcKcbbaaVVVVRWWRRUUUNNS......',
        '..BRVVVHbccbbbbbaVVVUR..DRRRdNN.......',
        '...RVVVHbbcbbbbbaUVUUW...SSONNP.......',
        '...RRVVUabccKcbbaRVWWR......NN........',
        '...RRRVVabbbbbbbaeeWWRf.....NN........',
        '....RRVVRbbcKcbbagggggh...............',
        '....iJJJKbbcbbbbagggjhhhk.............',
        '....iJJJJbbbbcbbajgghhhhk.............',
        '....iJJJJccbbbbbbjgghhihk.............',
        '....iJJJJJcbbaaaagghhhhhk.............',
        '....iJJJJJaaaaaaagghiihhk.............',
        '.....KKKaaaaaaaaagjhiihkk.............',
        '........gggggjjgghhhiii...............',
        '........ggghhhhjghhiihi...............',
        '.........jhhiiijghhiihh...............',
        '.........jhiiiijghiiiii...............',
        '.........hhiiiijghiiiii...............',
        '.........jiiiiijghiiiii...............',
        '.........hiiiiijgiiiiii...............',
        '.........jhiiiijgiiiiii...............',
        '.........hhiiiijgiiiiii...............',
        '........khiiiiijgiiiikk...............',
        '........hiiiiiijgiiiik................',
        '........iiiiiihjgiiihk................',
        '........iiiiiihjgiiihk................',
        '........iiiiiihjgiiiik................',
        '........iiiiiiijgiiiik................',
        '........hiiiiihjgiiiik................',
        '........hiiiiiijghiiik................',
        '........ihiiiihjghiiik................',
        '........hiiiiiigghiiiihi..............',
        '........hiiiihhjghhihhhh..............',
        '........llllllllllllllll..............',
        '........lllllllllllllllllm............',
        '........lllllllm.llllllllm............',
        '........lllllllm.mmmmmmmmm............',
      ],
      neckRow: 26,
      waistRow: 48,
      shoulder: [24, 31],
      footCol: 15,
      crouchDrop: 14,
      sleeveColor: 'shirt',
      sleeveShade: -0.05,
      hideWhenPosed: ['ruler0', 'ruler1', 'ruler2', 'ruler3', 'ruler4', 'ruler9', 'rulerHand', 'rulerHand2'], // the ruler moves to her attacking hand
      weapon: { color: '#2b2827', length: 16 },
    },
  },
];

RF.getCharacter = (id) => RF.CHARACTERS.find((c) => c.id === id);
