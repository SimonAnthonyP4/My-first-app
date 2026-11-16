// STORY MODE: "THE LAST BELL" - the screenplay, part 1 (chapters 0-3).
// 34 chapters across three generations of one school, with quick-time events, fights in the
// middle of scenes, dialogue choices that are remembered, and four endings.
//   story.js ... story-6.js   the first version of the story
//   story-7.js                a bonus chapter (MOVIE NIGHT)
//   story-8.js, story-9.js    THE HEADMASTER: the throne, the Forgotten, the bell rung backward, the
//                             war. They add chapters and rewrite others.
//   story-10.js               THE KEEPER: who let him in, Olu, the trial, the fourth ending. It sets the
//                             final chapter order (so the "CHAPTER n" numbers written in these files
//                             are renumbered there).
//
// How a scene is written (full step lists at the top of the engine files):
//   js/scenes/story-scene.js  staging, shots, words, sound         { cast } { shot } { say } { amb }
//   js/scenes/story-3d.js     the 3D camera                        { cam3d: [who, 'flyin'] }
//   js/scenes/story-score.js  the soundtrack (23 themes)           { score: 'theme' }
//   js/scenes/story-play.js   quick-time events, choices, acting   { qte } { choice } { if } { emote } { place }
//   js/scenes/story-fights.js, story-war.js   fights inside a scene, deaths, crowns   { brawl } { die } { crownify }
//   js/scenes/story-cine.js   the army, stopped time, light, the frame   { crowd } { freeze } { aura } { aspect }
//
// What the player decides (saved, and read back later with when(key, value)):
//   table      THE DAY BEFORE     Nicholas, about the corner table:    'same' | 'somebody'
//   guard      THE DAY BEFORE     Nicholas, to the security guard:     'nod' | 'asked'
//   nick       BRO BATCH          Nicholas, after the other universe:  'defiant' | 'shaken'
//   brady      LOCKDOWN           Ms. Brady, on Sirven retiring:       'heart' | 'duty'
//   joke       STREET LEVEL       Bandy's comeback:                    'logic' | 'who' | 'silent'
//   simon      GAME DAY           Simon, to Mikey:                     'home' | 'handoff'
//   gabriel    THE COLLECTION     Gabriel, to the Headmaster:          'call' | 'quiet'
//   jauregui   SHOW YOUR WORK     Jauregui, to his old student:        'said' | 'silent'
//   anthony    INSIDE THE CROWN   Anthony, at the lonely table:        'ask' | 'bar'
//   goodbye    THE LAST ONE OUT   Ms. Brady, to Sirven:                'honor' | 'order'
//   seat       ROLL CALL          Nicholas, to his crowned friend:     'hit' | 'ask'
//   heroAnswer THE LAST BELL      your hero, to the Headmaster:        'ours' | 'you'
//   closing    THE VERDICT        your hero, to the bench:             'chose' | 'back'
//   ending     THE VERDICT        who holds the door:                  'lopez' | 'sirven' | 'hero' | 'keeper'
//   hero                          who you sent to knock the crown off ('$hero' in the script; '$friend'
//                                 and '$principal' are Nicholas / Ms. Brady, or Anthony / Sirven if one is the hero)
RF.STORY = {
  // who can go in the finale (story-9.js puts the ones who are still alive first)
  heroes: ['nicholas', 'anthony', 'brady', 'sirven', 'bandy', 'simon', 'mikey', 'fernando', 'gabriel', 'wuttke', 'alejandro', 'tyler', 'jauregui', 'chris', 'tamayo', 'ruano', 'dabalsa', 'astuto', 'escobedo', 'weissenberg', 'holbrook', 'landa'],
  chapters: [],
  when: (key, val) => (vars) => vars[key] === val,                  // a choice was made a certain way
  ending: (e) => (vars) => (vars.ending || 'lopez') === e,          // which ending is being played ('lopez' | 'sirven' | 'hero' | 'keeper')
  heroIs: (id) => (vars, state, scene) => scene.hero === id,        // who went through the rift
};
(function () {
  const C = RF.STORY.chapters;

  // ================================================================== ACT I - THE BELL
  // 0 ------------------------------------------------------------------ MIDNIGHT (cold open + opening titles)
  C.push({
    title: 'MIDNIGHT', sub: 'ACT I - COLD OPEN',
    intro: [
      // two voices in the dark, before anything else
      { music: 'silence' }, { amb: null }, { handheld: 0.3 }, { insert: 'card', text: '' }, { wait: 40 },
      { say: ['anthony', 'IS THIS SEAT TAKEN?'] },
      { say: ['nicholas', '...NOBODY EVER SITS HERE.'] },
      { wait: 30 },
      { insert: 'card', text: 'ACT I: THE BELL' }, { amb: ['crickets', 'wind'] }, { wait: 90 },
      { dissolve: 40 }, { insert: 'school' }, { wait: 60 },
      { narrate: 'TERRAMANIA HIGH. 11:58 PM. THE LAST NIGHT OF THE OLD WORLD.' },
      { dissolve: 30 },
      { bg: 'court' }, { tint: 'rgba(20,0,50,0.5)' }, { amb: ['room', 'clock'] }, { score: 'lopez' },
      { cast: { lopez: ['lopez', 150, 1] } },
      { cam3d: ['lopez', 'drop'] },
      { narrate: 'THE OLD GYM. NOBODY COMES HERE AT NIGHT. NOBODY BUT HIM.' },
      { shot: ['medium', 'lopez'] },
      { say: ['lopez', 'EVERY UNIVERSE HAS A TERRAMANIA HIGH. I HAVE CHECKED. ALL OF THEM.'] },
      { score: 'bell' },
      { insert: 'photo', sepia: true, text: 'TERRAMANIA HIGH' }, { wait: 40 },
      { say: ['lopez', 'TEN THOUSAND UNIVERSES. THE SAME FACES. THE SAME HALLWAYS. THE SAME LAUGHTER AT LUNCH.'] },
      { cam3d: ['lopez', 'push'] },
      { say: ['lopez', 'AND EVERY SINGLE TIME... THE SAME ENDING.'] },
      { shot: ['xcu', 'lopez'] }, { wait: 40 },
      { say: ['lopez', 'A LAST DAY. A LAST BELL. AND THEN EVERYONE WALKS OUT THOSE DOORS...'] },
      { say: ['lopez', '...AND THEY FORGET EACH OTHER.'] },
      { score: null }, { amb: ['heartbeat', 'clock'] },
      { insert: 'equation' }, { sfx: 'scribble' }, { wait: 50 }, { sfx: 'scribble' }, { wait: 70 },
      { shot: ['close', 'lopez'] },
      { say: ['lopez', 'NOT THIS TIME.'] },
      { insert: 'clock', frames: 90 }, { wait: 110 },
      { sfx: 'bell' }, { insert: 'bell' }, { shake: 10 }, { wait: 60 },
      { whip: true }, { cam3d: ['lopez', 'behind'] }, { act: ['lopez', 'special'] },
      { rift: [270, 1.4] }, { smash: true }, { amb: ['drone', 'bell'] }, { score: 'doom' }, { grade: 'doom' }, { wait: 50 },
      { cam3d: ['lopez', 'vertigo'] }, { wait: 80 },
      { cam3d: ['lopez', 'hero'] },
      { say: ['lopez', 'ONE SCHOOL. EVERY UNIVERSE. A BELL THAT NEVER STOPS RINGING...'] },
      { say: ['lopez', '...SO THAT NOBODY EVER HAS TO SAY GOODBYE AGAIN.'] },
      { dissolve: 40 }, { grade: null }, { insert: 'school', rift: true }, { sfx: 'bell' },
      { narrate: 'AT MIDNIGHT, THE SCHOOL BELL RANG.' },
      { narrate: 'IT HAS NOT STOPPED RINGING SINCE.' },
      { fade: ['out', 50] },

      // ---- OPENING TITLES: the cast, one freeze-frame at a time, over the main theme ----
      { clear: true }, { tint: null }, { amb: null }, { score: 'theme' }, { handheld: 0.2 },
      { bg: 'brobatch' }, { cast: { nicholas: ['nicholas', 150, 1], anthony: ['anthony', 232, -1] } },
      { cam3d: [['nicholas', 'anthony'], 'two'] }, { wait: 40 },
      { card: ['nicholas', 'BOXER. CO-CEO. NEVER EATS ALONE.'] },
      { card: ['anthony', 'SORCERER. CO-CEO. SAT DOWN FIRST.'] },
      { whip: true }, { clear: true }, { bg: 'hallway' },
      { cast: { brady: ['brady', 150, 1], sirven: ['sirven', 240, -1, { z: 20 }] } },
      { cam3d: ['brady', 'follow'] }, { wait: 40 },
      { card: ['brady', 'ASSISTANT PRINCIPAL. SEES EVERYTHING.'], color: '#ffd030' },
      { card: ['sirven', 'THE PRINCIPAL. HIS WORD IS LAW.'], color: '#ffd030' },
      { whip: true }, { clear: true }, { bg: 'field' },
      { cast: { mikey: ['mikey', 130, 1], simon: ['simon', 205, 1, { z: -24 }], gabriel: ['gabriel', 265, -1, { z: 18 }] } },
      { cam3d: ['mikey', 'orbit'] }, { wait: 40 },
      { card: ['mikey', 'LINEBACKER. FASTER THAN HE LOOKS.'], color: '#60ff60' },
      { card: ['simon', 'EIGHT LIMBS. ZERO MERCY.'], color: '#ffb030' },
      { card: ['gabriel', 'PURE ENERGY. THE 305.'], color: '#40e8ff' },
      { whip: true }, { clear: true }, { bg: 'skatepark' },
      { cast: { bandy: ['bandy', 150, 1], fernando: ['fernando', 245, -1, { z: 16 }] } },
      { cam3d: ['bandy', 'spiral'] }, { wait: 40 },
      { card: ['bandy', 'SKATER. LOUDER THAN YOU.'], color: '#ff60a0' },
      { card: ['fernando', 'ALWAYS ON A SMOKE BREAK.'], color: '#ff7020' },
      { whip: true }, { clear: true }, { bg: 'office' },
      { cast: { jauregui: ['jauregui', 192, 1] } },
      { cam3d: ['jauregui', 'push'] }, { wait: 40 },
      { card: ['jauregui', 'MATH. HE NEVER SAID IT.'], color: '#f0f0e0' },
      { whip: true }, { clear: true }, { bg: 'court' }, { tint: 'rgba(40,0,70,0.5)' },
      { cast: { lopez: ['lopez', 192, 1] } }, { rift: [300, 1.8] },
      { cam3d: ['lopez', 'hero'] }, { wait: 40 },
      { card: ['lopez', 'THE SMARTEST MAN IN EVERY ROOM.'], color: '#c080ff' },
      { cam3d: ['lopez', 'pullback'] },
      { title: ['TERRAMANIA', 'THE LAST BELL'] },
      { score: null }, { fade: ['out', 70] },
    ],
  });

  // 1 ------------------------------------------------------------------ THE DAY BEFORE
  C.push({
    title: 'THE DAY BEFORE', sub: 'ONE LAST NORMAL LUNCH',
    intro: [
      { insert: 'card', text: 'TWELVE HOURS EARLIER.' }, { music: 'silence' }, { amb: ['crowd'] }, { wait: 80 },
      { bg: 'cafeteria' }, { score: 'comedy' }, { rays: true },
      { cast: {
        nicholas: ['nicholas', 150, 1], anthony: ['anthony', 195, -1],
        mikey: ['mikey', 110, 1, { z: 34 }], gabriel: ['gabriel', 240, -1, { z: 34 }],
        bandy: ['bandy', 80, 1, { z: -30 }], simon: ['simon', 270, -1, { z: -30 }],
        tyler: ['tyler', 300, -1, { z: 20 }], alejandro: ['alejandro', 50, 1, { z: 14 }], chris: ['chris', 335, -1, { z: -10 }],
      } },
      { dissolve: 30 }, { cam3d: ['nicholas', 'flyin'] },
      { title: ['CHAPTER 1', 'THE DAY BEFORE'] },
      { place: ['THE CAFETERIA', 'LUNCH. THE CORNER TABLE.'] },
      { narrate: 'THREE YEARS AGO, NOBODY SAT HERE. NOW THERE ARE NEVER ENOUGH CHAIRS.' },
      { shot: ['close', 'mikey'] },
      { say: ['mikey', 'FOUR TRAYS. COACH SAYS I NEED TO BULK FOR COLLEGE. I SAY I NEED TO BULK FOR FIFTH PERIOD.'] },
      { cam3d: [['mikey', 'gabriel'], 'ots'] }, { emote: ['gabriel', '!'] },
      { say: ['gabriel', "BRO, FINALS ARE IN A WEEK! WE SHOULD BE STUDYING! ...OR WE COULD GO TO MIAMI. LET'S GOOOO!"] },
      { shot: ['close', 'chris'] },
      { say: ['chris', "I DON'T STUDY. MY DAD KNOWS A GUY WHO KNOWS THE ANSWERS."] },
      { shot: ['close', 'tyler'] },
      { say: ['tyler', 'YOUR DAD KNOWS A GUY FOR EVERYTHING, BRO.'] },
      { shot: ['close', 'chris'] }, { emote: ['chris', '...'] }, { wait: 30 },
      { say: ['chris', "...HE DOESN'T KNOW A GUY FOR FRIENDS. THAT'S WHY I SIT HERE."] },
      { cam3d: ['anthony', 'orbit'] }, { emote: ['mikey', 'heart'] }, { wait: 40 },
      { say: ['bandy', "YO, ALEJANDRO. BET YOU CAN'T CLIMB THE VENDING MACHINE."] },
      { emote: ['alejandro', 'idea'] },
      { say: ['alejandro', 'I CLIMBED IT FRESHMAN YEAR. I LIVE UP THERE NOW.'] },
      { emote: ['simon', 'anger'] },
      { say: ['simon', 'EIGHT LIMBS AND NOT ONE OF YOU CAN PASS THE KETCHUP.'] },
      { cast: { brady: ['brady', 440, -1, { z: 44 }] } }, { walk: ['brady', 340, 50] },
      { cam3d: ['brady', 'low'] },
      { say: ['brady', 'ALEJANDRO. OFF THE VENDING MACHINE. BANDY. BOARD OFF THE TABLE. MIKEY... CHEW.'] },
      { shot: ['close', 'mikey'] }, { emote: ['mikey', 'sweat'] },
      { say: ['mikey', "YES, MA'AM."] },
      { score: 'bro' }, { rays: false },
      { cam3d: [['nicholas', 'anthony'], 'two'] },
      { say: ['nicholas', 'YOU EVER THINK ABOUT IT, BRO? IN THREE MONTHS THIS TABLE IS EMPTY AGAIN.'] },
      { shot: ['close', 'anthony'] }, { wait: 40 },
      { say: ['anthony', 'THEN SOMEONE ELSE WILL SIT HERE. THAT IS HOW A TABLE WORKS.'] },
      { shot: ['close', 'nicholas'] },
      { choice: { id: 'table', who: 'nicholas', options: [
        { text: `"THAT'S NOT THE SAME."`, set: 'same', then: [
          { say: ['nicholas', "THAT'S NOT THE SAME."] },
          { shot: ['close', 'anthony'] }, { say: ['anthony', 'NO. IT IS NOT.'] },
        ] },
        { text: '"...AS LONG AS SOMEBODY DOES."', set: 'somebody', note: 'ANTHONY WILL REMEMBER THAT.', then: [
          { say: ['nicholas', '...AS LONG AS SOMEBODY DOES.'] },
          { shot: ['close', 'anthony'] }, { emote: ['anthony', 'heart'] },
          { say: ['anthony', 'THAT IS THE MOST BRO BATCH THING YOU HAVE EVER SAID.'] },
        ] },
      ] } },
      { cam3d: ['nicholas', 'pullback'] }, { wait: 120 },
      { narrate: 'ACROSS THE ROOM, SOMEONE WAS WATCHING THEM. HE HAD WATCHED THIS LUNCH TEN THOUSAND TIMES.' },
      { score: 'lopez' }, { amb: ['drone'] },
      { cast: { lopez: ['lopez', 400, -1, { z: 60 }] } },
      { cam3d: ['lopez', 'reveal'] }, { wait: 80 },
      { shot: ['xcu', 'lopez'] }, { wait: 40 },
      { say: ['lopez', 'LOOK AT THEM. NOT ONE OF THEM KNOWS IT ENDS.'] },
      { say: ['lopez', 'I DO. I ALWAYS KNOW. THAT IS THE WORST PART OF BEING THE SMARTEST MAN IN THE ROOM.'] },
      { score: null }, { fade: ['out', 60] },
    ],
  });

  // 2 ------------------------------------------------------------------ BRO BATCH
  C.push({
    title: 'BRO BATCH', sub: 'NICHOLAS AND ANTHONY',
    intro: [
      { bg: 'brobatch' }, { music: 'silence' }, { amb: ['room', 'bell'] }, { score: 'bro' },
      { cast: { anthony: ['anthony', 130, 1], nicholas: ['nicholas', 210, -1] } },
      { cam3d: [['anthony', 'nicholas'], 'two'] },
      { title: ['CHAPTER 2', 'BRO BATCH'] },
      { place: ['BRO BATCH HQ', '6:00 AM. THE BELL HAS BEEN RINGING FOR SIX HOURS.'] },
      { shot: ['medium', 'nicholas'] }, { act: ['nicholas', 'victory'] },
      { say: ['nicholas', 'TWO THOUSAND BARS BOXED BEFORE SUNRISE. LIGHT WEIGHT, BABY!'] },
      { act: ['nicholas', 'idle'] },
      { cam3d: [['nicholas', 'anthony'], 'ots'] },
      { say: ['anthony', 'YOU KNOW WHAT DAY IT IS, NICHOLAS?'] },
      { shot: ['close', 'nicholas'] },
      { say: ['nicholas', 'THREE YEARS. THREE YEARS TODAY SINCE THE CAFETERIA.'] },
      // ---- flashback: the first lunch ----
      { dissolve: 50 }, { flashback: true }, { score: 'memory' }, { amb: ['crowd'] },
      { bg: 'cafeteria' }, { cast: { anthony: ['anthony', -40, 1], nicholas: ['nicholas', 230, -1] } },
      { cam3d: ['nicholas', 'top'] },
      { narrate: 'THREE YEARS AGO. FRESHMAN YEAR. THE CORNER TABLE NOBODY SAT AT.' },
      { shot: ['medium', 'nicholas'] }, { emote: ['nicholas', '...'] }, { wait: 60 },
      { shot: 'wide' }, { walk: ['anthony', 190, 60] },
      { shot: ['two', 'anthony', 'nicholas'] },
      { say: ['anthony', 'IS THIS SEAT TAKEN?'] },
      { shot: ['close', 'nicholas'] }, { emote: ['nicholas', '?'] },
      { say: ['nicholas', '...NOBODY EVER SITS HERE.'] },
      { shot: ['close', 'anthony'] },
      { say: ['anthony', 'THEN IT IS MINE. WANT HALF A PROTEIN BAR? I MADE IT MYSELF.'] },
      { shot: ['close', 'nicholas'] }, { wait: 40 }, { emote: ['nicholas', 'sweat'] },
      { say: ['nicholas', '...BRO. THIS IS TERRIBLE.'] },
      { shot: ['two', 'anthony', 'nicholas'] },
      { say: ['anthony', 'I KNOW. HELP ME MAKE IT BETTER.'] },
      { cam3d: ['nicholas', 'pullback'] },
      { narrate: 'THAT WAS THE FIRST BRO BATCH.' },
      { dissolve: 50 }, { flashback: false }, { score: 'bro' }, { amb: ['room', 'bell'] },
      { bg: 'brobatch' }, { cast: { anthony: ['anthony', 130, 1], nicholas: ['nicholas', 210, -1] } },
      { shot: ['two', 'anthony', 'nicholas'] },
      { say: ['nicholas', 'WE GRADUATE IN THREE MONTHS, BRO. WHAT HAPPENS TO BRO BATCH?'] },
      { shot: ['close', 'anthony'] }, { wait: 30 },
      { say: ['anthony', 'WE WILL FIGURE IT OUT. WE ALWAYS DO.'] },
      // ---- the rift ----
      { score: null }, { sfx: 'bell' }, { shake: 8 }, { emote: ['nicholas', '!'] }, { emote: ['anthony', '!'] },
      { whip: true }, { shot: 'wide' },
      { rift: [330, 1] }, { amb: ['drone', 'bell'] }, { score: 'tense' }, { wait: 30 },
      { cast: { rc: ['chris', 330, -1, { rift: true }] } }, { walk: ['rc', 285, 30] },
      { face: ['nicholas', 1] },
      { cam3d: ['rc', 'hero'] },
      { say: ['rc', 'NICE LITTLE PROTEIN BAR COMPANY. IN MY UNIVERSE, I BOUGHT IT. THEN I SHUT IT DOWN.'] },
      { shot: ['close', 'anthony'] }, { emote: ['anthony', '?'] },
      { say: ['anthony', 'CHRIS? WHY ARE YOU... PURPLE?'] },
      { shot: ['close', 'rc'] },
      { say: ['rc', 'MY DAD BOUGHT THAT TOO.'] },
      { cam3d: [['rc', 'nicholas'], 'ots'] }, { act: ['nicholas', 'taunt'] }, { emote: ['nicholas', 'anger'] },
      { say: ['nicholas', 'BRO BATCH. IS NOT. FOR SALE.'] },
      { act: ['nicholas', 'idle'] },
      // ---- the fight, played: slip, jab, cross, uppercut ----
      { score: 'battle' }, { shot: ['xcu', 'nicholas'] }, { wait: 30 },
      { shot: 'wide' }, { act: ['rc', 'special'] },
      { qte: { type: 'ring', key: 'down', text: 'SLIP IT!', who: 'nicholas' },
        hit: [{ act: ['nicholas', 'crouch'] }, { fly: ['rc', 150, 'coin', 18] }, { emote: ['anthony', '!'] }, { act: ['nicholas', 'idle'] }],
        miss: [{ fly: ['rc', 215, 'coin', 18] }, { impact: ['nicholas', 1] }, { emote: ['nicholas', 'anger'] }, { act: ['nicholas', 'idle'] }] },
      { act: ['rc', 'idle'] }, { cam3d: ['nicholas', 'whirl'] }, { wait: 40 },
      { qte: { type: 'ring', key: 'light', text: 'JAB!', who: 'nicholas' },
        hit: [{ shot: 'wide' }, { dash: ['nicholas', ['rc', 26], 8] }, { act: ['nicholas', 'light'] }, { impact: ['rc', 1] }],
        miss: [{ shot: 'wide' }, { dash: ['nicholas', ['rc', 26], 8] }, { act: ['nicholas', 'light'] }, { act: ['rc', 'heavy'] }, { impact: ['nicholas', 1] },
          { say: ['rc', 'I PAY PEOPLE TO DODGE FOR ME.'] }, { act: ['nicholas', 'idle'] }, { act: ['rc', 'idle'] }] },
      { qte: { type: 'ring', key: 'heavy', text: 'CROSS!', who: 'nicholas' },
        hit: [{ act: ['nicholas', 'heavy'] }, { impact: ['rc', 2] }],
        miss: [{ act: ['nicholas', 'heavy'] }, { emote: ['nicholas', 'sweat'] }, { wait: 14 }] },
      { cam3d: ['nicholas', 'behind'] }, { say: ['nicholas', 'ROUND TWO. NO REFUNDS.'] },
      { brawl: { play: 'nicholas', vs: 'chris', stage: 'brobatch', name: 'RIFT CHRIS', mid: 'I WILL BUY THIS ROUND TOO.' } },
      { shot: ['close', 'rc'] }, { wait: 16 }, { slowmo: 50 }, { cam3d: ['nicholas', 'hero'] },
      { qte: { type: 'ring', key: 'up', text: 'UPPERCUT!', who: 'nicholas' },
        perfect: [{ act: ['nicholas', 'uppercut'] }, { impact: ['rc', 3] }, { hop: 'nicholas' }, { flash: 8 }, { shot: 'wide' }, { say: ['nicholas', 'LIGHT WEIGHT!'] }],
        hit: [{ act: ['nicholas', 'uppercut'] }, { impact: ['rc', 3] }, { flash: 8 }, { shot: 'wide' }],
        miss: [{ act: ['nicholas', 'uppercut'] }, { emote: ['nicholas', 'sweat'] }, { shot: ['medium', 'anthony'] }, { act: ['anthony', 'special'] },
          { say: ['anthony', 'I HAVE YOU, BRO.'] }, { shot: 'wide' }, { fly: ['anthony', 285, 'barToss', 16] }, { impact: ['rc', 3] }, { act: ['anthony', 'idle'] }] },
      { act: ['rc', 'dazed'] }, { act: ['nicholas', 'idle'] }, { score: null }, { wait: 40 },
    ],
    outro: [
      { bg: 'brobatch' }, { music: 'silence' }, { amb: ['room'] },
      { cast: { anthony: ['anthony', 110, 1], nicholas: ['nicholas', 180, 1], rc: ['chris', 260, -1, { rift: true, anim: 'dazed' }] } },
      { shot: ['close', 'rc'] },
      { say: ['rc', 'IN MY UNIVERSE... YOU TWO NEVER MET. DID YOU KNOW THAT?'] },
      { shot: ['close', 'nicholas'] }, { emote: ['nicholas', '?'] }, { wait: 30 },
      { say: ['rc', 'LET ME SHOW YOU.'] },
      // ---- another universe: Chris buys Bro Batch ----
      { whip: true }, { clear: true }, { bg: 'brobatch' }, { tint: 'rgba(60,0,90,0.45)' }, { amb: ['drone'] }, { score: 'lopez' },
      { insert: 'card', text: 'ANOTHER UNIVERSE.', color: '#c080ff' }, { wait: 70 },
      { cast: { rc2: ['chris', 192, 1, { rift: true, anim: 'victory' }] } }, { weather: 'cash' }, { sfx: 'cash' },
      { cam3d: ['rc2', 'spiral'] },
      { say: ['rc2', "TWO NERDS AND A PROTEIN BAR? CUTE. I'LL TAKE IT."] },
      { insert: 'deal' }, { sfx: 'scribble' }, { wait: 80 }, { sfx: 'stomp' }, { wait: 50 },
      { say: ['rc2', 'DAD PAID. OBVIOUSLY.'] },
      { insert: 'sign' }, { wait: 60 }, { sfx: 'clang' }, { wait: 90 },
      { cam3d: ['rc2', 'hero'] },
      { say: ['rc2', 'CHRIS CORP. NO BARS. NO BROS. JUST ME.'] },
      { narrate: 'IN THAT UNIVERSE, BRO BATCH LASTED ONE WEEK.' },
      { weather: null }, { clear: true }, { bg: 'cafeteria' }, { tint: 'rgba(60,0,90,0.4)' }, { score: 'sad' }, { amb: ['crowd'] },
      { cast: { lonely: ['nicholas', 230, -1, { rift: true }] } },
      { cam3d: ['lonely', 'top'] },
      { narrate: 'AND NOBODY EVER SAT AT THE CORNER TABLE.' },
      { cam3d: ['lonely', 'vertigo'] }, { spot: 'lonely' }, { wait: 120 },
      { whip: true }, { clear: true }, { spot: null }, { score: null }, { tint: null }, { bg: 'brobatch' }, { amb: ['room'] },
      { cast: { anthony: ['anthony', 110, 1], nicholas: ['nicholas', 180, 1], rc: ['chris', 260, -1, { rift: true, anim: 'dazed' }] } },
      { shot: ['close', 'nicholas'] }, { wait: 40 },
      { choice: { id: 'nick', who: 'nicholas', timer: 720, options: [
        { text: '"NO. NOT IN THIS ONE."', set: 'defiant', note: 'NICHOLAS STOOD HIS GROUND.', then: [
          { act: ['nicholas', 'taunt'] }, { say: ['nicholas', '...NO. NOT IN THIS ONE.'] }, { act: ['nicholas', 'idle'] },
        ] },
        { text: '"...WAS THAT REALLY ME?"', set: 'shaken', note: 'NICHOLAS WILL NOT FORGET THAT TABLE.', then: [
          { tremble: ['nicholas', 90] }, { say: ['nicholas', '...WAS THAT REALLY ME? ALL ALONE LIKE THAT?'] },
          { shot: ['close', 'anthony'] },
          { say: ['anthony', 'THAT WAS A YOU NOBODY SAT DOWN NEXT TO. THAT IS THE ONLY DIFFERENCE.'] },
        ] },
      ] } },
      { shot: 'wide' }, { shatter: 'rc' }, { wait: 50 },
      { score: 'mystery' },
      { shot: ['medium', 'anthony'] }, { act: ['anthony', 'special'] },
      { say: ['anthony', "THAT WASN'T OUR CHRIS. THAT WAS... A CHRIS. FROM SOMEWHERE ELSE."] },
      { act: ['anthony', 'idle'] },
      { cam3d: [['anthony', 'nicholas'], 'ots'] },
      { say: ['nicholas', 'HE SAID WE NEVER MET. IN HIS UNIVERSE.'] },
      { shot: ['close', 'anthony'] },
      { say: ['anthony', 'THEN I AM GLAD WE LIVE IN THIS ONE.'] },
      { say: ['anthony', 'THE ENERGY IS COMING FROM THE SCHOOL. WHATEVER IS DOING THIS... IT IS THERE.'] },
      { shot: ['close', 'nicholas'] },
      { say: ['nicholas', 'THEN WE GO TO SCHOOL. EARLY.'] },
      { shot: ['two', 'anthony', 'nicholas'] }, { emote: ['anthony', '...'] },
      { say: ['anthony', 'FIRST TIME FOR EVERYTHING.'] },
      { cam3d: ['nicholas', 'pullback'] }, { walk: ['nicholas', 430, 50, 'async'] }, { walk: ['anthony', 430, 60] },
      { score: null }, { fade: ['out', 40] },
    ],
  });

  // 3 ------------------------------------------------------------------ LOCKDOWN
  C.push({
    title: 'LOCKDOWN', sub: 'MS. BRADY AND KING SIRVEN',
    intro: [
      { bg: 'hallway' }, { music: 'silence' }, { amb: ['hum', 'bell'] }, { score: 'tense' },
      { cast: { brady: ['brady', 130, 1], sirven: ['sirven', 200, -1, { bg: 'office' }] } },
      { cam3d: ['brady', 'follow'] },
      { title: ['CHAPTER 3', 'LOCKDOWN'] },
      { place: ['THE MAIN HALLWAY', '7:02 AM'] }, { wait: 50 },
      { insert: 'radio' }, { sfx: 'pa' }, { wait: 40 },
      { shot: ['split', 'brady', 'sirven'] },
      { say: ['brady', 'BRADY TO FRONT OFFICE. THE BELL WILL NOT STOP. I HAVE TRIED EVERY SWITCH IN THIS BUILDING.', { radio: true }] },
      { say: ['sirven', 'COPY, MS. BRADY. NOBODY IN. NOBODY OUT. THIS IS A LOCKDOWN.', { radio: true }] },
      { say: ['brady', 'UNDERSTOOD, SIR. ...SIR? ARE YOU ALRIGHT? YOU SOUND TIRED.', { radio: true }] },
      { say: ['sirven', 'I AM FINE, MS. BRADY. CARRY ON.', { radio: true }] },
      { shot: ['medium', 'brady'] }, { emote: ['brady', '...'] }, { wait: 40 },
      // ---- a rift variant on a skateboard ----
      { sfx: 'whoosh' }, { score: 'chase' },
      { cast: { rb: ['bandy', 440, -1, { rift: true }] } }, { dash: ['rb', 255, 16] }, { emote: ['brady', '!'] },
      { cam3d: [['brady', 'rb'], 'ots'] },
      { say: ['rb', 'MORNING, MISS. IN MY UNIVERSE THERE ARE NO HALLWAYS. ONLY RAMPS. AND NO RULES.'] },
      { shot: ['close', 'brady'] },
      { say: ['brady', 'IN MY UNIVERSE, THERE IS DETENTION.'] },
      { cam3d: ['brady', 'behind'] }, { wait: 50 },
      { brawl: { play: 'brady', vs: 'bandy', stage: 'hallway', name: 'RIFT BANDY', mid: 'NO RULES, MISS!' } },
      { shot: ['two', 'brady', 'rb'] }, { slowmo: 40 },
      { qte: { type: 'ring', key: 'block', text: 'STOP.', who: 'brady' },
        perfect: [{ dash: ['brady', ['rb', 30], 6] }, { act: ['brady', 'light'] }, { impact: ['rb', 3] }, { shot: ['close', 'brady'] }, { say: ['brady', 'STOP.'] }],
        hit: [{ dash: ['brady', ['rb', 30], 6] }, { act: ['brady', 'light'] }, { impact: ['rb', 2] }, { shot: ['close', 'brady'] }, { say: ['brady', 'STOP.'] }],
        miss: [{ dash: ['rb', 60, 12] }, { emote: ['brady', 'anger'] }, { face: ['brady', -1] }, { say: ['brady', 'I SAID. STOP.'] },
          { dash: ['brady', ['rb', 30], 8] }, { act: ['brady', 'heavy'] }, { impact: ['rb', 2] }] },
      { shot: 'wide' }, { shatter: 'rb' }, { act: ['brady', 'idle'] }, { face: ['brady', 1] }, { wait: 50 },
      { score: 'comedy' },
      { cast: { bandy: ['bandy', 440, -1] } }, { walk: ['bandy', 300, 36] },
      { shot: ['medium', 'bandy'] }, { emote: ['bandy', '?'] },
      { say: ['bandy', 'YO. WHY WAS THERE ANOTHER ME? HE WAS SICK. BUT NOT THAT SICK.'] },
      { cam3d: [['bandy', 'brady'], 'ots'] },
      { say: ['brady', 'YOU. HALL PASS.'] },
      { shot: ['close', 'bandy'] }, { emote: ['bandy', 'sweat'] },
      { say: ['bandy', 'MISS. THE SCHOOL IS LITERALLY RIPPING OPEN.'] },
      { shot: ['close', 'brady'] }, { emote: ['brady', '...'] }, { wait: 40 },
      { say: ['brady', '...FINE. YOU ARE DEPUTIZED. GO CHECK THE PARKING LOT.'] },
      { shot: ['two', 'brady', 'bandy'] }, { act: ['bandy', 'victory'] },
      { say: ['bandy', 'TURN IT UP.'] },
      // ---- the principal's office: what she was not supposed to hear ----
      { dissolve: 40 }, { clear: true }, { amb: ['room', 'clock', 'bell'] }, { score: 'bell' },
      { bg: 'office' }, { cast: { sirven: ['sirven', 200, -1] } },
      { cam3d: ['sirven', 'push'] },
      { place: ["THE PRINCIPAL'S OFFICE", 'HE THOUGHT HE WAS ALONE.'] }, { wait: 70 },
      { insert: 'photo', sepia: true, text: 'CLASS OF 1994 - MY FIRST CLASS' }, { wait: 60 },
      { say: ['sirven', 'THIRTY-ONE YEARS. THIRTY-ONE GRADUATING CLASSES.'] },
      { shot: ['close', 'sirven'] },
      { say: ['sirven', 'THIS WAS SUPPOSED TO BE A QUIET LAST YEAR.'] },
      { cast: { brady: ['brady', 40, 1] } }, { shot: 'wide' }, { walk: ['brady', 110, 30] },
      { shot: ['close', 'brady'] }, { emote: ['brady', '!'] },
      { say: ['brady', 'SIR? ...LAST YEAR?'] },
      { cam3d: [['brady', 'sirven'], 'ots'] }, { wait: 40 },
      { say: ['sirven', 'YOU WERE NOT SUPPOSED TO HEAR THAT, MS. BRADY.'] },
      { shot: ['close', 'brady'] },
      { say: ['brady', 'YOU ARE RETIRING.'] },
      { shot: ['close', 'sirven'] },
      { say: ['sirven', 'AT THE END OF THE YEAR. AND THIS SCHOOL WILL BE YOURS.'] },
      { shot: ['xcu', 'brady'] }, { wait: 50 },
      { choice: { id: 'brady', who: 'brady', options: [
        { text: `"I DON'T WANT IT WITHOUT YOU IN IT."`, set: 'heart', note: 'KING SIRVEN WILL REMEMBER THAT.', then: [
          { say: ['brady', "I DON'T WANT IT WITHOUT YOU IN IT."] },
          { shot: ['two', 'brady', 'sirven'] }, { emote: ['sirven', '...'] }, { wait: 50 },
          { say: ['sirven', 'NONSENSE. NOW. WE HAVE A LOCKDOWN TO RUN.'] },
        ] },
        { text: '"THEN I WILL BE READY, SIR."', set: 'duty', note: 'KING SIRVEN WILL REMEMBER THAT.', then: [
          { say: ['brady', 'THEN I WILL BE READY, SIR.'] },
          { shot: ['two', 'brady', 'sirven'] }, { wait: 50 },
          { say: ['sirven', 'I KNOW YOU WILL. NOW. WE HAVE A LOCKDOWN TO RUN.'] },
        ] },
      ] } },
      { score: null }, { fade: ['out', 40] },
    ],
  });
})();
