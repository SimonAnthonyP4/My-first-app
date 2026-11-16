// STORY MODE, part 10: THE KEEPER. What was above the Headmaster the whole time.
//
// The Headmaster did not build his room between universes. He was let in. There is a door between
// every universe, and a desk in front of it, and someone has always been at the desk: RILEY, THE
// KEEPER OF TERRAMANIA. (At the school he is the security guard nobody has ever asked the name of.)
// His whole law is that nothing leaks. A school where nobody ever leaves is the safest thing he
// ever heard, so he gave Lopez Tuero a visitor's pass and one rule: keep it quiet.
// The war is not quiet. So when the crown comes off, the Keeper comes down to seal the universe.
//
// And OLU: he kept a door once too (O Block: one summer evening, kept so safe that nobody on it
// ever grew up). He walked off the post. He cannot touch the Keeper's tenant without getting the
// whole building locked, so he waits, and tells the school to win its own war. When the Keeper
// comes down himself, that is different.
//
//   THE WAITING ROOM   (after EVERY UNIVERSE)    the deal, the four hundred years, the schools he took.
//                                                You play his lieutenants. You are not the heroes of it.
//   THE NEW KID        (after INSIDE THE CROWN)  Loor's pizza place, the night after Doomsday. Olu.
//   INCIDENT REPORT    (after THE NIGHT BEFORE)  the army, counted. Then the one thing that floats higher than the throne.
//   CODE RED           (after THE LAST BELL)     time stops. Lopez against his landlord. Olu against Riley. The Judge.
//   THE VERDICT        (after CODE RED)          the whole school takes the stand. Then the door, and who holds it.
//
// It also moves the last choice (who holds the door) from THE LAST BELL to the end of THE VERDICT,
// adds a FOURTH ENDING to it, edits a few earlier scenes so the guard and the new kid are there from
// chapter 1, and sets the final order of all 34 chapters.
//
// New choices:  guard    THE DAY BEFORE   Nicholas, to the security guard:   'nod' | 'asked'
//               closing  THE VERDICT      your hero, to the bench:           'chose' | 'back'
//               ending   THE VERDICT      who holds the door:                'lopez' | 'sirven' | 'hero' | 'keeper'
(function () {
  const C = RF.STORY.chapters, when = RF.STORY.when, ending = RF.STORY.ending, heroIs = RF.STORY.heroIs;
  const K = RF.STORY.kit, { ch, at, after, lists, kid, THRONE, THREE, TABLE } = K, PT = RF.STORY.parts;
  const ICE = '#8fe6ff', GOLD = '#ffd75a';
  // (story-8's editors find a line of dialogue; these find any step)
  const where = (steps, pred) => lists(steps).map((l) => [l, l.findIndex(pred)]).filter((f) => f[1] >= 0);
  const afterWhere = (steps, pred, add, what) => { const r = where(steps, pred); if (!r.length) console.warn('story-10: could not find ' + what); r.forEach(([l, i]) => l.splice(i + 1, 0, ...add)); };
  const FG = (z) => ({ forgotten: true, z, name: 'THE FORGOTTEN' });
  const LIVE = (line, cam = 'face') => ({ recall: { live: true, grade: 'doom', bg: 'throne', cast: THRONE, cam3d: ['lopez', cam], say: ['lopez', line] } });

  // ================================================================== THE WAITING ROOM (after EVERY UNIVERSE)
  C.push({
    title: 'THE WAITING ROOM', sub: 'FOUR HUNDRED YEARS, AND WHO ALLOWED THEM',
    intro: [
      { music: 'silence' }, { amb: ['drone'] }, { insert: 'card', text: 'ONE SECOND PAST MIDNIGHT.', color: ICE }, { wait: 100 },
      { bg: 'post' }, { amb: ['hum', 'clock'] }, { score: 'keeper' }, { aspect: 'ultra' }, { bloom: 0.3 },
      { cast: { riley: ['riley', 126, 1, { z: 62 }] } }, { aura: ['riley', 'cosmic'] },
      { dissolve: 50 }, { cam3d: ['riley', 'flyover'] },
      { title: ['CHAPTER 12', 'THE WAITING ROOM'] },
      { narrate: 'BETWEEN EVERY UNIVERSE THERE IS A DOOR. IN FRONT OF THE DOOR THERE IS A DESK. THERE HAS ALWAYS BEEN SOMEONE AT THE DESK.' },
      { cam3d: ['riley', 'worship'] }, { wait: 70 },
      { narrate: 'HE DOES NOT RULE ANYTHING. HE KEEPS IT. A VERY LONG TIME AGO HE DECIDED THOSE WERE THE SAME WORD.' },
      { insert: 'monitors', text: 'EVERY TERRAMANIA HIGH THERE IS. HE WATCHES ALL OF THEM.' }, { wait: 210 },
      { card: ['riley', 'THE KEEPER OF TERRAMANIA.', 'RILEY'], color: ICE },
      // ---- the man who rang the bell steps out of his own rift, and someone is already there ----
      { cam3d: ['riley', 'still'] }, { sfx: 'rumble' }, { shake: 8 }, { rift: [322, 1.5] }, { smash: true }, { score: null },
      { cast: { lopez: ['lopez', 336, -1] } }, { appear: 'lopez' }, { walk: ['lopez', 262, 60] }, { riftOff: true },
      { place: ['THE DESK BETWEEN', 'MR. LOPEZ TUERO HAS JUST RUNG THE BELL.'] },
      { cam3d: [['lopez', 'riley'], 'ots'] }, { score: 'keeper' },
      { say: ['riley', 'GOOD EVENING. YOU OPENED A DOOR, MR. TUERO.'] },
      { shot: ['close', 'lopez'] }, { emote: ['lopez', '!'] },
      { say: ['lopez', 'THAT IS NOT POSSIBLE. THERE IS NOTHING BETWEEN UNIVERSES. I DID THE MATH. I DID IT FOR TWELVE YEARS.'] },
      { cam3d: ['riley', 'hero'] },
      { say: ['riley', 'THERE IS A DESK. I AM AT IT. DOORS ARE MY DEPARTMENT.'] },
      { say: ['riley', 'A PERSON WHO OPENS ONE WITHOUT SIGNING IN IS A HAZARD. I SEAL HAZARDS. IT TAKES A MOMENT. IT DOES NOT HURT.'] },
      { shot: 'wide' }, { act: ['riley', 'special'] }, { tremble: ['lopez', 110] }, { aberration: 2 }, { amb: ['heartbeat'] }, { score: null }, { wait: 50 },
      { qte: { type: 'ring', key: 'light', text: 'TALK. FAST.', who: 'lopez' },
        perfect: [{ say: ['lopez', 'A SCHOOL WHERE THE LAST BELL NEVER RINGS. NOBODY LEAVES. NOTHING GOES OUT. NOTHING COMES IN. NOT ONE DOOR, EVER AGAIN.'] }],
        hit: [{ say: ['lopez', 'WAIT. A SCHOOL. WHERE NOBODY LEAVES. NOTHING GOES OUT. NOTHING COMES IN. NOT ONE DOOR, EVER AGAIN.'] }],
        miss: [{ impact: ['lopez', 1] }, { act: ['lopez', 'dazed'] }, { say: ['lopez', 'WAIT- PLEASE- A SCHOOL. NOBODY LEAVES IT. NOTHING OUT. NOTHING IN. ...NOT ONE DOOR. EVER AGAIN.'] }, { act: ['lopez', 'idle'] }] },
      { aberration: 0 }, { act: ['riley', 'idle'] }, { amb: ['hum', 'clock'] },
      { cam3d: ['riley', 'push'] }, { wait: 80 },
      { say: ['riley', 'NOTHING OUT. NOTHING IN.'] },
      { shot: ['xcu', 'riley'] }, { wait: 60 }, { score: 'keeper' },
      { say: ['riley', '...THAT IS THE SAFEST THING ANYONE HAS EVER SAID TO ME.'] },
      { insert: 'pass', name: 'L. TUERO', room: '0 - THE WAITING ROOM', text: 'HE SLID IT ACROSS THE DESK WITH ONE FINGER.' }, { sfx: 'paper' }, { wait: 210 },
      { cam3d: [['lopez', 'riley'], 'ots'] },
      { say: ['riley', 'A VISITOR PASS. ONE ROOM. ONE CHAIR. NO CLOCK. KEEP WHOEVER YOU LIKE IN IT, FOR AS LONG AS YOU LIKE.'] },
      { say: ['riley', 'ONE RULE. KEEP IT QUIET. IF YOUR ROOM EVER LEAKS, I STOP CALLING IT A SCHOOL. I CALL IT A HAZARD.'] },
      { shot: ['close', 'lopez'] },
      { say: ['lopez', 'IT SAYS "TIME OUT." YOU HAVE LEFT THAT LINE BLANK.'] },
      { cam3d: ['riley', 'face'] },
      { say: ['riley', 'YES.'] },
      { stamp: ['ADMITTED', ICE] }, { wait: 70 },
      { shot: 'wide' }, { walk: ['lopez', 196, 80] }, { fold: 'lopez' }, { wait: 60 },
      { insert: 'door', from: 0.5, open: 0.02, text: 'THE DOOR CLOSED BEHIND HIM. IT IS VERY GOOD AT THAT.' }, { sfx: 'boom' }, { wait: 170 },
      // ---- four hundred years ----
      { dissolve: 50 }, { clear: true }, { aspect: 'scope' }, { bloom: 0 }, { bg: 'throne' }, { grade: 'cold' }, { amb: ['drone'] }, { score: 'lopez' },
      { cast: { lopez: ['lopez', 192, 1, { y: 70, z: 74, anim: 'crouch' }] } },
      { cam3d: ['lopez', 'pullback'] },
      { place: ['ROOM 0', 'YEAR ONE'] },
      { narrate: 'HE SAT DOWN TO WAIT FOR HIS FIRST CLASS TO COME BACK. THE ROOM HAD NO CLOCK. THAT WAS THE KINDNESS IN IT, AND THE TRAP.' },
      { cam3d: ['lopez', 'orbit'] }, { place: ['ROOM 0', 'YEAR FORTY'] }, { wait: 90 },
      { narrate: 'IN THE FORTIETH YEAR HE STOPPED WAITING FOR ANYONE TO COME BACK, AND WENT OUT TO BRING SOMEONE IN.' },
      { cast: { first: ['alejandro', 20, 1, { ghost: true, name: 'A BOY', scale: 0.92 }] } }, { shot: 'wide' }, { walk: ['first', 150, 110] },
      { cam3d: ['first', 'push'] },
      { say: ['lopez', 'YOU NEVER SPOKE IN MY CLASS. NOT ONCE. YOU DO NOT HAVE TO SPEAK HERE EITHER. ONLY STAY.'] },
      { cam3d: ['first', 'hero'] }, { emote: ['first', '...'] }, { wait: 90 },
      { narrate: 'THE FIRST ONE HE KEPT WAS A BOY WHO NEVER SPOKE. THE BOY DID NOT SAY NO. THE TEACHER DECIDED THAT WAS THE SAME AS YES.' },
      { shot: 'wide' }, { flash: 10 }, { sfx: 'hiss' }, { cast: { first: ['alejandro', 150, 1, { forgotten: true, name: 'THE FORGOTTEN' }] } }, { wait: 80 },
      { cam3d: ['lopez', 'worship'] }, { place: ['ROOM 0', 'YEAR NINETY'] }, { score: 'doom' }, { grade: 'doom' },
      { narrate: 'BY THE NINETIETH YEAR THE WAITING HAD WORN INTO HIM LIKE A PATH WORN INTO A CARPET. HE MADE A CROWN OUT OF IT.' },
      { shot: 'wide' }, { flash: 14 }, { shake: 12 }, { sfx: 'bell' }, { cast: THRONE }, { aura: ['lopez', 'violet'] }, { wait: 60 },
      { cam3d: ['lopez', 'hero'] },
      { say: ['lopez', 'I AM NOT WAITING ANYMORE. I AM KEEPING.'] },
      { narrate: 'HE NEEDED SOMEONE TO KEEP THE TIME, SOMEONE TO RING THE BELL, AND SOMEONE TO CLEAN THE BOARD.' },
      { cast: THREE }, { appear: 'proctor' }, { appear: 'ringer' }, { appear: 'eraser' }, { sfx: 'stomp' }, { shake: 8 },
      { panels: ['proctor', 'ringer', 'eraser'] }, { wait: 130 },
      { narrate: 'HE CHOSE THREE HE COULD NOT BEAR TO SEE WITHOUT FACES, AND GAVE THEM OTHER ONES. HE NO LONGER REMEMBERS WHY THOSE THREE.' },
      { remove: 'first' }, { crowd: { n: 150, x: [-280, 664], z: [-330, 60], aisle: [146, 238], facing: 'aisle', seed: 5 } },
      { cam3d: ['lopez', 'flyover'] }, { place: ['ROOM 0', 'YEAR TWO HUNDRED'] }, { wait: 130 },
      { narrate: 'THEN HE RAN OUT OF HIS OWN UNIVERSE TO COLLECT FROM. THERE WERE TEN THOUSAND OTHERS. EVERY ONE OF THEM HAD A TERRAMANIA HIGH.' },
      // ---- the nine schools ----
      { insert: 'log', lines: ['INCIDENT 0417', 'NINE SCHOOLS IN NINE UNIVERSES HAVE', 'SENT THEIR STRONGEST TO ONE FIELD.', 'THEY MEAN TO STOP THE VISITOR.', 'ACTION TAKEN: NONE. HE HAS A PASS.'], stamp: 'OBSERVED', color: ICE }, { sfx: 'scribble' }, { wait: 330 },
      { whip: true }, { clear: true }, { grade: 'gold' }, { bg: 'field' }, { tint: 'rgba(255,80,150,0.16)' }, { amb: ['wind', 'crowd'] }, { score: 'battle' },
      { cast: { bruiser: ['bruiser', 128, 1], viper: ['viper', 88, 1, { z: 22 }], ringer: ['ringer', 300, -1, { z: 6 }], eraser: ['eraser', 344, -1, { z: -22 }] } },
      { crowd: { n: 70, look: 'students', x: [-250, 110], z: [-70, 70], facing: 1, seed: 9 } }, { rift: [366, 2.2] },
      { cam3d: ['bruiser', 'flyin'] },
      { place: ['TERRAMANIA HIGH', 'NOT THIS ONE. UNIVERSE 0417.'] },
      { card: ['bruiser', 'THE STRONGEST THERE EVER WAS. THERE.'], color: '#c8a040' },
      { card: ['viper', 'FASTER THAN A RUMOR.'], color: '#60e0a0' },
      { cam3d: [['viper', 'bruiser'], 'two'] },
      { say: ['bruiser', 'NINE SCHOOLS. NINE CHAMPIONS. HE TOOK SEVEN OF THEM WHILE WE WERE STILL VOTING ON A CAPTAIN.'] },
      { say: ['viper', "SO WE STOPPED VOTING. IT'S YOU AND ME. THAT'S THE WHOLE RESISTANCE. I LIKE OUR ODDS."] },
      { cam3d: ['ringer', 'low'] }, { sfx: 'stomp' }, { shake: 10 }, { score: 'doom' },
      { say: ['ringer', 'THE BELL. HAS RUNG.'] },
      LIVE('TWO. OUT OF NINE UNIVERSES, THEY SENT ME TWO. BRING ME THEIR SCHOOL.'),
      { cam3d: ['bruiser', 'behind'] }, { wait: 40 },
      { narrate: 'YOU ARE NOT THE HEROES OF THIS ONE.' },
      { brawl: { play: 'ringer', partner: 'eraser', vs: 'bruiser', vsPartner: 'viper', plain: true, stage: 'field', cpu: 'easy', boss: 0.55, mid: 'GET UP, VIPER! GET UP!' } },
      { act: ['bruiser', 'dazed'] }, { act: ['viper', 'ko'] }, { score: 'sad' }, { amb: ['wind'] },
      { shot: ['close', 'viper'] },
      { say: ['viper', 'BRUISER. RUN. TAKE THE FRESHMEN AND RUN.'] },
      { shot: ['close', 'bruiser'] }, { act: ['bruiser', 'idle'] },
      { say: ['bruiser', "NO. ...HEY. BIG ONE. WHATEVER YOU WERE BEFORE HE GOT YOU, IT'S STILL IN THERE. YOU PULLED THAT LAST HIT."] },
      { cam3d: ['ringer', 'push'] }, { tremble: ['ringer', 100] }, { wait: 90 },
      { say: ['ringer', '...'] },
      LIVE('THEY DO NOT PULL ANYTHING. ERASER.', 'hero'),
      { shot: 'wide' }, { act: ['eraser', 'special'] }, { flash: 12 }, { sfx: 'hiss' }, { shake: 8 },
      { cast: { bruiser: ['bruiser', 128, 1, { ghost: true, name: 'THE FORGOTTEN' }], viper: ['viper', 88, 1, { z: 22, ghost: true, name: 'THE FORGOTTEN' }] } },
      { crowdLook: ['flip', 150, 3] }, { grade: 'cold' }, { score: 'doom' }, { wait: 120 },
      { cam3d: ['bruiser', 'pullback'] },
      { narrate: 'UNIVERSE 0417 WAS KEPT BEFORE ITS LUNCH BELL. NOBODY IN IT GOT HURT AFTER THAT. NOBODY IN IT GOT ANYTHING AFTER THAT.' },
      { stamp: ['KEPT', '#b070ff'] }, { wait: 110 },
      // ---- and the one who allowed it ----
      { dissolve: 50 }, { clear: true }, { tint: null }, { grade: null }, { bg: 'post' }, { amb: ['hum', 'clock'] }, { score: 'keeper' }, { aspect: 'ultra' }, { bloom: 0.3 },
      { cast: { riley: ['riley', 150, 1, { z: 12 }] } }, { aura: ['riley', 'cosmic'] },
      { cam3d: ['riley', 'float'] },
      { insert: 'monitors', kept: 9, text: 'NINE SCHOOLS, QUIET. NOTHING IN THE HALLS AFTER THE BELL.' }, { wait: 190 },
      { cam3d: ['riley', 'face'] },
      { say: ['riley', 'NO RUNNING. NO SHOUTING. NO ONE OUT OF THEIR SEAT. HE IS THE BEST HALL MONITOR I HAVE EVER HAD.'] },
      { insert: 'monitors', kept: 9, focus: 19, text: 'THE LAST ONE. THE ONE HE CAME FROM. HE HAS BEEN SAVING IT.' }, { wait: 170 },
      { recall: Object.assign({ shot: ['two', 'anthony', 'nicholas'], say: ['anthony', 'IS THIS SEAT TAKEN?'] }, TABLE) },
      { shot: ['xcu', 'riley'] }, { wait: 60 },
      { say: ['riley', '"IS THIS SEAT TAKEN." HE PLAYS THAT ONE BACK MORE THAN ANY OTHER. I HAVE NEVER UNDERSTOOD THE QUESTION.'] },
      { cam3d: ['riley', 'pullback'] },
      { say: ['riley', 'NOBODY HAS EVER ASKED IT AT A DESK.'] },
      { narrate: 'FOUR HUNDRED YEARS OF HIS TIME. ONE NIGHT OF OURS. BY MORNING THE BELL WAS RINGING, AND THE VISITOR HAD AN ARMY.' },
      { score: null }, { aspect: 'scope' }, { bloom: 0 }, { fade: ['out', 70] },
    ],
  });

  // ================================================================== THE NEW KID (after INSIDE THE CROWN)
  const NINE = ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];
  // he is not hitting them: he is standing wherever each of them is about to be
  const BLINKS = [
    { shot: 'wide' }, { blink: ['olu', 300] }, { act: ['olu', 'light'] }, { act: ['f0', 'dazed'] }, { act: ['f3', 'dazed'] }, { wait: 9 },
    { blink: ['olu', 352] }, { act: ['olu', 'heavy'] }, { act: ['f1', 'dazed'] }, { act: ['f4', 'dazed'] }, { act: ['f5', 'dazed'] }, { wait: 9 },
    { blink: ['olu', 396] }, { act: ['olu', 'special'] }, { act: ['f2', 'dazed'] }, { act: ['f6', 'dazed'] }, { act: ['f7', 'dazed'] }, { act: ['f8', 'dazed'] }, { flash: 10 }, { wait: 12 },
    { blink: ['olu', 196] }, { face: ['olu', 1] }, { act: ['olu', 'idle'] }, { wait: 50 },
  ];
  C.push({
    title: 'THE NEW KID', sub: 'TWO SLICES, AND SOMEONE WHO NEVER STANDS STILL',
    intro: [
      { insert: 'card', text: 'THAT NIGHT.' }, { music: 'silence' }, { amb: ['rain'] }, { wait: 90 },
      { bg: 'pizzeria' }, { amb: ['room', 'hum'] }, { score: 'sad' },
      { cast: { loor: ['loor', 262, -1, { z: 34 }], bandy: ['bandy', 150, 1], olu: ['olu', 40, 1, { z: 44 }] } },
      { dissolve: 40 }, { cam3d: ['bandy', 'flyin'] },
      { title: ['CHAPTER 21', 'THE NEW KID'] },
      { place: ["LOOR'S PIZZA", '11:40 PM. THE OVEN IS STILL ON.'] },
      { narrate: 'BANDY COULD NOT GO HOME. HOME DID NOT KNOW WHAT HAD HAPPENED. SO HE WENT WHERE MR. FERNANDO USED TO SEND HIM FOR TWO SLICES.' },
      { cam3d: [['bandy', 'loor'], 'ots'] },
      { say: ['loor', 'BANDY! MI LLAVE! TWO SLICES, LIKE ALWAYS? ONE FOR YOU, ONE FOR THE OLD MAN WITH THE LIGHTER?'] },
      { shot: ['xcu', 'bandy'] }, { tremble: ['bandy', 90] }, { wait: 70 },
      { say: ['bandy', '...JUST ONE TONIGHT, LOOR.'] },
      { shot: ['close', 'loor'] }, { emote: ['loor', '...'] }, { wait: 60 },
      { say: ['loor', 'NO. TWO. YOU EAT ONE. THE OTHER ONE SITS ON THE TABLE. WHERE I COME FROM, YOU DO NOT CLEAR A PLATE AWAY THE SAME WEEK.'] },
      { card: ['loor', 'FORTY ROUNDS. ONE OVEN. GUARD UP.'], color: '#e04030' },
      // ---- the kid at the corner table ----
      { cam3d: ['olu', 'push'] }, { score: 'mystery' },
      { say: ['bandy', "THAT'S THE NEW KID. OLU. CAME FROM CHICAGO IN MARCH. HE'S IN MY THIRD PERIOD. I THINK. HE'S NEVER NOT ALREADY THERE."] },
      { shot: ['close', 'loor'] },
      { say: ['loor', 'EVERY NIGHT HE COMES. ORDERS NOTHING. TIPS TWENTY. NEVER ONCE STANDS STILL. I STOPPED ASKING.'] },
      { cam3d: [['bandy', 'olu'], 'ots'] },
      { say: ['olu', "YOU LOST SOMEBODY TODAY. TWO SOMEBODIES. YOU CAN ONLY NAME ONE OF 'EM."] },
      { shot: ['close', 'bandy'] }, { emote: ['bandy', '!'] },
      { say: ['bandy', "HOW DO YOU- I DIDN'T TELL ANYBODY THAT."] },
      { shot: ['close', 'olu'] },
      { say: ['olu', "THE ONE YOU CAN NAME WENT OUT ON HIS FEET, HOLDING A DOOR FOR KIDS. THAT'S A GOOD WAY. I'VE SEEN ALL THE WAYS."] },
      // ---- they come for the one who is grieving ----
      { sfx: 'rumble' }, { shake: 8 }, { rift: [352, 1.5] }, { smash: true }, { score: 'tense' }, { grade: 'doom' },
      { cast: { f0: ['tyler', 330, -1, FG(8)], f1: ['simon', 352, -1, FG(-16)], f2: ['landa', 372, -1, FG(26)] } },
      { emote: ['bandy', '!'] }, { cam3d: ['f0', 'hero'] }, { wait: 60 },
      { narrate: 'THEY HAD COME FOR THE BOY WHO WAS GRIEVING. TO THE HEADMASTER, GRIEF IS A DOOR SOMEBODY LEFT OPEN.' },
      { shot: 'wide' }, { depth: ['loor', 0, 30] }, { walk: ['loor', 232, 30] }, { face: ['loor', 1] },
      { cam3d: ['loor', 'low'] }, { score: 'battle' },
      { say: ['loor', 'HEY. NO FACES, NO SERVICE. WE CLOSE AT MIDNIGHT, AND NOTHING LEAVES MY SHOP THAT DID NOT PAY. NOT A SLICE. NOT A KID.'] },
      { shot: ['close', 'loor'] },
      { say: ['loor', 'FORTY ROUNDS IN GUAYAQUIL BEFORE I EVER SOLD A PIE. HANDS UP, BANDY. CHIN DOWN. STAY BEHIND MY LEFT.'] },
      { shot: ['close', 'bandy'] },
      { say: ['bandy', 'NEW KID! A LITTLE HELP?!'] },
      { cam3d: ['olu', 'low'] },
      { say: ['olu', "I'M THINKING ABOUT IT."] },
      { cam3d: ['loor', 'behind'] }, { wait: 40 },
      { brawl: { play: 'loor', partner: 'bandy', vs: 'tyler', vsPartner: 'simon', look: 'forgotten', stage: 'pizzeria', cpu: 'easy', name: 'THE FORGOTTEN', mid: '...' } },
      { act: ['f0', 'dazed'] }, { act: ['f1', 'dazed'] }, { shot: ['close', 'loor'] }, { emote: ['loor', 'sweat'] },
      { say: ['loor', 'HA! STILL GOT IT. GO TELL YOUR BOSS THE KITCHEN IS-'] },
      { sfx: 'rumble' }, { shake: 12 }, { score: 'doom' },
      { cast: { f3: ['mikey', 392, -1, FG(-30)], f4: ['brady', 408, -1, FG(40)], f5: ['ruano', 424, -1, FG(4)], f6: ['holbrook', 440, -1, FG(-12)], f7: ['erick', 456, -1, FG(22)], f8: ['alejandro', 470, -1, FG(50)] } },
      { shot: 'wide' }, ...['f3', 'f4', 'f5', 'f6', 'f7', 'f8'].map((k, i) => ({ walk: [k, 286 + i * 15, 70, 'async'] })), { act: ['f0', 'idle'] }, { act: ['f1', 'idle'] }, { wait: 80 },
      { narrate: 'THERE WERE NINE IN THE DOORWAY. THERE WERE MORE BEHIND THE NINE.' },
      { shot: ['close', 'loor'] },
      { say: ['loor', '...OKAY. THAT IS MORE THAN FORTY ROUNDS.'] },
      // ---- he stops thinking about it ----
      { score: null }, { amb: ['heartbeat'] }, { cam3d: ['olu', 'worship'] }, { wait: 60 },
      { say: ['olu', "A'IGHT."] },
      { aura: ['olu', 'gold'] }, { bloom: 0.4 }, { score: 'divine' }, { sfx: 'perfect' }, { flash: 8 },
      { card: ['olu', 'O BLOCK. DIVINE. NEVER STANDS STILL.'], color: GOLD },
      { cam3d: [['olu', 'f3'], 'two'] }, { slowmo: 60 },
      { qte: { type: 'ring', key: 'heavy', text: "DON'T HURT THEM.", who: 'olu' },
        perfect: [...BLINKS, { shot: ['close', 'olu'] }, { say: ['olu', "THEY'RE KIDS UNDER THERE. I JUST PUT 'EM DOWN FOR A NAP."] }],
        hit: [...BLINKS, { shot: ['close', 'olu'] }, { say: ['olu', "THEY'RE KIDS UNDER THERE. NOBODY GOT HURT."] }],
        miss: [...BLINKS, { sfx: 'crack' }, { shake: 10 }, { shot: ['close', 'loor'] }, { say: ['loor', 'MY COUNTER!'] }, { shot: ['close', 'olu'] },
          { say: ['olu', "MY BAD. PUT IT ON THE TWENTY. THEY'RE KIDS UNDER THERE. I WAS BEING CAREFUL WITH THE KIDS."] }] },
      { grade: null }, { bloom: 0.2 }, { amb: ['room', 'hum'] },
      { cam3d: ['olu', 'circle'] }, { wait: 100 },
      { narrate: 'HE HAD NOT HIT ANY OF THEM. HE HAD ONLY BEEN STANDING WHEREVER EACH OF THEM WAS ABOUT TO BE.' },
      { shot: ['close', 'loor'] }, { emote: ['loor', '?'] },
      { say: ['loor', '...BANDY. WHAT EXACTLY IS IN YOUR THIRD PERIOD?'] },
      { cam3d: [['olu', 'bandy'], 'ots'] }, { emote: ['bandy', 'anger'] }, { score: 'sad' },
      { say: ['bandy', 'YOU COULD DO THAT. THIS WHOLE TIME. MR. FERNANDO IS DEAD AND YOU COULD DO THAT!'] },
      { shot: ['close', 'olu'] }, { wait: 60 },
      { say: ['olu', "YEAH. I COULD. SIT DOWN. I'LL TELL YOU WHY I DIDN'T, AND YOU CAN HATE ME AFTER."] },
      { cam3d: [['bandy', 'olu'], 'ots'] }, { score: 'keeper' },
      { say: ['olu', "YOUR HEADMASTER DON'T OWN THAT THRONE. HE RENTS. THERE'S A LANDLORD."] },
      { say: ['olu', "LANDLORD'S GOT ONE RULE: KEEP IT QUIET. THE DAY SOMETHING LIKE ME PUTS HANDS ON HIS TENANT, HE DON'T EVICT THE TENANT. HE LOCKS THE WHOLE BUILDING."] },
      { shot: ['close', 'olu'] },
      { say: ['olu', 'EVERYBODY IN IT. YOUR SCHOOL. THIS SHOP. ONE STILL MINUTE, FOREVER. I WATCHED HIM DO IT TO A BLOCK ONCE. IT WAS MY BLOCK.'] },
      { recall: { bg: 'oblock', cast: { olu: ['olu', 150, 1], k1: ['javan', 236, -1, { scale: 0.78, name: 'A KID' }], k2: ['tyler', 270, -1, { scale: 0.74, costume: 'alt2', name: 'A KID', z: 20 }] }, cam3d: ['olu', 'crane'], text: 'O BLOCK. A SUMMER EVENING. IT HAS BEEN THE SAME EVENING EVER SINCE.' } },
      { shot: ['close', 'bandy'] },
      { say: ['bandy', '...SO WHAT. WE JUST LOSE?'] },
      { cam3d: ['olu', 'hero'] }, { score: 'divine' },
      { say: ['olu', "NAH. YOU WIN IT. YOU. PEOPLE WITH NAMES, LOUD AS YOU WANT. HE CAN'T CALL THAT A HAZARD. THAT'S JUST A SCHOOL."] },
      { shot: ['close', 'bandy'] },
      { say: ['bandy', "AND THEM? THE ONES WITH NO FACES? YOU CAN'T FIX THEM?"] },
      { shot: ['close', 'olu'] },
      { say: ['olu', "CAN'T GIVE BACK A NAME I NEVER KNEW. THAT PART'S YOURS. SOMEBODY HAS TO SAY IT WHO MEANS IT."] },
      { cam3d: [['bandy', 'olu'], 'ots'] },
      { say: ['olu', "ONE THING. IF THE LANDLORD EVER COMES DOWN THE STAIRS HIMSELF... LOOK UP. I'LL BE THE ONE NOT STANDING STILL."] },
      { shot: 'wide' }, { blink: ['olu', 640] }, { remove: 'olu' }, { bloom: 0 }, { score: 'sad' }, { wait: 60 },
      ...NINE.map((k) => ({ act: [k, 'idle'] })), ...NINE.map((k, i) => ({ walk: [k, 480, 100 + i * 4, 'async'] })), { wait: 130 }, { riftOff: true }, ...NINE.map((k) => ({ remove: k })),
      { narrate: 'ONE BY ONE THE FACELESS ONES WOKE, TURNED, AND WALKED BACK TO HIM. THEY ALWAYS WALK BACK.' },
      { cam3d: [['bandy', 'loor'], 'two'] },
      { say: ['loor', 'HE STILL DID NOT ORDER ANYTHING.'] },
      { say: ['bandy', '...HE LEFT A TWENTY.'] },
      { shot: ['close', 'loor'] }, { wait: 40 },
      { say: ['loor', 'EAT, MI LLAVE. THEN GO AND WIN YOUR WAR. I WILL KEEP THE OVEN ON.'] },
      { cam3d: ['bandy', 'pullback'] }, { wait: 90 },
      { narrate: 'LOOR SET THE SECOND SLICE ON THE EMPTY TABLE ANYWAY. IN THE MORNING IT WAS GONE. HE DECIDED NOT TO THINK ABOUT THAT.' },
      { score: null }, { fade: ['out', 70] },
    ],
  });

  // ================================================================== INCIDENT REPORT (after THE NIGHT BEFORE)
  C.push({
    title: 'INCIDENT REPORT', sub: 'THE OTHER NIGHT BEFORE',
    intro: [
      { insert: 'card', text: 'THE SAME NIGHT. HIS SIDE.', color: '#b070ff' }, { music: 'silence' }, { amb: ['drone'] }, { wait: 100 },
      { bg: 'throne' }, { grade: 'doom' }, { amb: ['drone', 'heartbeat'] }, { score: 'doom' },
      { cast: Object.assign({}, THRONE, THREE) }, { aura: ['lopez', 'violet'] },
      { crowd: { n: 412, x: [-300, 684], z: [-430, 64], aisle: [146, 238], facing: 'aisle' } },
      { dissolve: 50 }, { cam3d: ['lopez', 'flyover'] },
      { title: ['CHAPTER 25', 'INCIDENT REPORT'] },
      { narrate: 'THE SCHOOL SPENT ITS LAST NIGHT WRITING LETTERS. THE HEADMASTER SPENT HIS TAKING ATTENDANCE.' },
      { cam3d: ['proctor', 'march'] }, { wait: 110 },
      { say: ['proctor', 'FOUR HUNDRED AND TWELVE PRESENT, HEADMASTER. NONE ABSENT. NONE HAS EVER BEEN ABSENT.'] },
      { cam3d: ['lopez', 'worship'] },
      { say: ['lopez', 'TOMORROW THEY WILL COME TO MY DOOR WITH A SPEECH, A LEAF BLOWER AND A TOASTER.'] },
      { say: ['lopez', 'THEY WILL BE BRAVE. THEY ARE ALWAYS BRAVE. IN TEN THOUSAND UNIVERSES I HAVE NEVER ONCE SEEN IT BE ENOUGH.'] },
      { shot: ['xcu', 'lopez'] }, { wait: 40 },
      { say: ['lopez', 'TAKE THE TEACHERS FIRST. A CLASS WITH NO TEACHER SITS DOWN BY ITSELF.'] },
      { cam3d: ['ringer', 'low'] }, { sfx: 'stomp' }, { shake: 8 },
      { say: ['ringer', 'AND. THE ONES. WHO WILL NOT. SIT.'] },
      { cam3d: ['lopez', 'face'] },
      { say: ['lopez', 'THERE ARE FOUR WHO WILL NOT. I HAVE READ AHEAD. THEY DO NOT SEE GRADUATION.'] },
      { cam3d: ['eraser', 'hero'] },
      { say: ['eraser', 'SHHHH. AND AFTERWARD NO ONE WILL REMEMBER THAT THERE WERE FOUR.'] },
      { shot: 'wide' }, { act: ['lopez', 'special'] }, { crowdAct: 'kneel' }, { sfx: 'stomp' }, { shake: 14 }, { wait: 50 },
      { cam3d: ['lopez', 'pullback'] },
      { narrate: 'FOUR HUNDRED AND TWELVE KNEES. ONE SOUND.' },
      // ---- the one thing that floats higher than his throne ----
      { score: null }, { amb: ['clock'] }, { act: ['lopez', 'crouch'] }, { freeze: true, except: ['lopez'] }, { aspect: 'ultra' }, { wait: 80 },
      { narrate: 'THEN THE HEARTBEAT OF THE ROOM STOPPED. THE DUST STOPPED. FOUR HUNDRED AND FIFTEEN OF THEM STOPPED. HE DID NOT.' },
      { shot: ['close', 'lopez'] }, { emote: ['lopez', '!'] },
      { say: ['lopez', '...NO. NOT TONIGHT. NOT THE NIGHT BEFORE.'] },
      { column: [146, 110, 20] }, { cast: { riley: ['riley', 146, 1, { y: 108, z: 20 }] } }, { appear: 'riley' }, { aura: ['riley', 'cosmic'] }, { bloom: 0.35 }, { score: 'keeper' },
      { cam3d: ['riley', 'worship'] }, { wait: 110 },
      { narrate: 'THERE IS ONE THING IN ALL THE UNIVERSES THAT FLOATS HIGHER THAN HIS THRONE.' },
      { say: ['riley', 'GOOD EVENING, MR. TUERO. YOUR ROOM IS LOUD.'] },
      { cam3d: [['lopez', 'riley'], 'two'] },
      { say: ['riley', 'COME DOWN FROM THE CHAIR, PLEASE.'] },
      { shot: ['xcu', 'lopez'] }, { tremble: ['lopez', 130] }, { amb: ['heartbeat'] },
      { qte: { type: 'mash', key: 'heavy', text: 'DO NOT KNEEL!', who: 'lopez', len: 150, need: 20, rigged: true },
        hit: [{ say: ['lopez', 'I AM THE HEADMASTER. I DO NOT-'] }], miss: [{ say: ['lopez', 'I DO NOT-'] }] },
      { shot: 'wide' }, { rise: ['lopez', 0, 70, 'async'] }, { depth: ['lopez', 30, 70] }, { wait: 70 }, { act: ['lopez', 'crouch'] }, { sfx: 'stomp' }, { amb: ['clock'] },
      { cam3d: ['lopez', 'top'] }, { wait: 80 },
      { narrate: 'IN FOUR HUNDRED YEARS NOTHING HAD EVER MADE HIM STAND UP. THIS MADE HIM KNEEL.' },
      { cam3d: ['riley', 'hero'] },
      { say: ['riley', 'THE BELL RANG BACKWARD TONIGHT. THREE PEOPLE WALKED THROUGH TIME. NOT ONE OF THEM SIGNED IN.'] },
      { shot: ['close', 'lopez'] },
      { say: ['lopez', 'A HISTORY LESSON. THEY LOOKED. THEY DID NOT STAY. I WILL HAVE THE WHOLE SCHOOL KEPT BY NOON.'] },
      { cam3d: ['riley', 'push'] },
      { say: ['riley', 'I GAVE YOU ONE ROOM AND ONE RULE. THERE ARE NOW FOUR HUNDRED RIFTS IN A CAFETERIA. THAT IS NOT QUIET.'] },
      { insert: 'monitors', sealed: 3, kept: 9, focus: 3, text: 'THIS IS WHAT I DO WITH A ROOM THAT LEAKS.' }, { wait: 150 },
      { insert: 'monitors', sealed: 4, kept: 9, text: 'UNIVERSE 0091. SEALED.' }, { glitch: 16 }, { stamp: ['SEALED', ICE] }, { wait: 150 },
      { cam3d: ['riley', 'float'] },
      { say: ['riley', 'THEY HAD A LEAK. NOW THEY HAVE A VERY PLEASANT TUESDAY. THEY HAVE HAD IT ELEVEN MILLION TIMES.'] },
      { shot: ['close', 'lopez'] }, { tremble: ['lopez', 60] },
      { say: ['lopez', '...THERE WERE CHILDREN IN THAT ONE, KEEPER.'] },
      { cam3d: ['riley', 'push'] },
      { say: ['riley', 'SAFE CHILDREN. YOU, OF ALL PEOPLE, DO NOT GET TO BE SURPRISED BY THAT.'] },
      { shot: ['xcu', 'lopez'] }, { wait: 70 },
      { cam3d: [['lopez', 'riley'], 'ots'] },
      { say: ['riley', 'YOU HAVE UNTIL THE LAST BELL TOMORROW. AFTER THAT I STOP CALLING IT YOUR SCHOOL.'] },
      { say: ['riley', 'ALL CLEAR?'] },
      { shot: ['xcu', 'lopez'] }, { wait: 60 },
      { say: ['lopez', '...ALL CLEAR.'] },
      { shot: 'wide' }, { fold: 'riley' }, { wait: 70 }, { freeze: false }, { aspect: 'scope' }, { bloom: 0 }, { amb: ['drone', 'heartbeat'] }, { score: 'lopez' }, { crowdAct: 'idle' },
      { cam3d: [['lopez', 'proctor'], 'two'] }, { emote: ['proctor', '?'] },
      { say: ['proctor', 'HEADMASTER? YOU WERE ON THE THRONE. NOW YOU ARE ON THE FLOOR. NO TIME HAS PASSED. I WOULD KNOW.'] },
      { shot: ['xcu', 'lopez'] }, { wait: 60 }, { act: ['lopez', 'idle'] }, { score: 'omega' },
      { say: ['lopez', 'WE DO NOT WAIT FOR THEM TO COME TO US.'] },
      { cam3d: ['lopez', 'hero'] },
      { say: ['lopez', 'WE TAKE THE FIELD AT DAWN. EVERY TEACHER. EVERY STUDENT. EVERY NAME. BEFORE THE LAST BELL.'] },
      { cam3d: ['proctor', 'march'] }, { crowdMove: [-150, 260] }, { sfx: 'stomp' }, { shake: 6 }, { wait: 70 }, { sfx: 'stomp' }, { shake: 6 }, { wait: 70 }, { sfx: 'stomp' }, { shake: 6 }, { wait: 60 },
      { insert: 'log', lines: ['INCIDENT 9999', 'LOCATION: TERRAMANIA HIGH', 'STATUS: FINAL WARNING ISSUED.', 'IF NOT QUIET BY THE LAST BELL:', 'SEAL.'], stamp: 'PENDING', color: '#ffb040' }, { sfx: 'scribble' }, { wait: 320 },
      { narrate: 'ON A DESK BETWEEN UNIVERSES THE FORM WAS ALREADY FILLED IN. ONLY THE DATE WAS BLANK.' },
      { score: null }, { fade: ['out', 70] },
    ],
  });

  // ================================================================== THE LAST BELL: it no longer ends at the door
  // The room between as it is when the ceiling starts to come down (who stands where is what the
  // three old endings expect, so it is rebuilt exactly, twice).
  const ROOM = () => [
    { bg: 'throne' }, { tint: 'rgba(60,0,100,0.3)' }, { grade: null }, { weather: 'embers' },
    { cast: { '$hero': ['$hero', 122, 1], lopez: ['lopez', 284, -1], sirven: ['sirven', 350, -1, { anim: 'special' }], anthony: ['anthony', 204, 1, { z: 14 }], simon: ['simon', 238, 1, { z: -14 }], bandy: ['bandy', 84, 1, { z: 16 }], gabriel: ['gabriel', 52, 1, { z: -10 }] } },
    { if: heroIs('nicholas'), else: [{ cast: { nicholas: ['nicholas', 160, 1, { z: -4 }] } }] },
    { rift: [336, 2.4] },
  ];
  let DOOR = [];
  {
    const lb = ch('THE LAST BELL'), out = lb.outro, j = at(out, 'FOUR HUNDRED AND TWELVE STUDENTS, AND ONE DOOR');
    if (j < 0) console.warn('story-10: THE LAST BELL: could not find the door');
    DOOR = out.slice(j + 1);                       // Lopez says NO, the argument, the last choice, the three endings
    lb.outro = out.slice(0, j + 1).concat([
      { shot: 'wide' }, { score: null }, { amb: null }, { freeze: true }, { aspect: 'ultra' }, { wait: 100 },
      { narrate: 'THE EMBERS STOPPED IN THE AIR. SO DID THE DUST. SO DID KING SIRVEN, WITH HIS HAND ON THE DOOR.' },
      { cast: { pa: ['riley', -3000, 1, { name: 'SECURITY' }] } },
      { say: ['pa', 'ATTENTION. THIS IS SECURITY.', { radio: true }] },
      { say: ['pa', 'THERE HAS BEEN A BREACH. PLEASE REMAIN EXACTLY WHERE YOU ARE.', { radio: true }] },
      { panels: ['$hero', 'lopez', 'sirven'] }, { wait: 90 },
      { say: ['pa', 'YOU WILL FIND THAT YOU ALREADY ARE.', { radio: true }] },
      { insert: 'card', text: 'CODE RED.', color: ICE }, { sfx: 'gong' }, { wait: 120 }, { aspect: 'scope' }, { fade: ['out', 50] },
    ]);
  }

  // ================================================================== CODE RED (after THE LAST BELL)
  C.push({
    title: 'CODE RED', sub: 'ACT V - THE ONE WHO KEEPS THE DOOR',
    intro: [
      { insert: 'card', text: 'ACT V: ALL CLEAR', color: ICE }, { music: 'silence' }, { amb: null }, { wait: 100 },
      ...ROOM(), { freeze: true }, { aspect: 'ultra' }, { amb: ['clock'] },
      { dissolve: 30 }, { cam3d: ['sirven', 'oner'] },
      { title: ['CHAPTER 29', 'CODE RED'] },
      { narrate: 'NOTHING IN THE ROOM BETWEEN WAS MOVING. NOT THE FALLING CEILING. NOT THE KING AT THE DOOR. NOT YOU.' },
      { column: [192, 130, 10] }, { cast: { riley: ['riley', 192, -1, { y: 60, z: 10 }] } }, { appear: 'riley' }, { aura: ['riley', 'cosmic'] }, { bloom: 0.3 }, { score: 'keeper' },
      { cam3d: ['riley', 'descend'] }, { wait: 130 },
      { card: ['riley', 'THE KEEPER OF TERRAMANIA.', 'RILEY'], color: ICE },
      { cam3d: ['riley', 'worship'] },
      { say: ['riley', 'GOOD MORNING. I AM GOING TO NEED EVERYONE TO STAY EXACTLY WHERE THEY ARE.'] },
      { panels: ['bandy', 'anthony', 'simon'] }, { wait: 70 },
      { cam3d: ['riley', 'float'] },
      { say: ['riley', 'THANK YOU. THAT WAS VERY COOPERATIVE.'] },
      { say: ['riley', 'ONE DOOR OPENED WITHOUT A PASS. FOUR HUNDRED RIFTS. A BELL RUNG BACKWARD. EVERY CLASS SINCE 1961 WALKED ACROSS TIME IN ONE MORNING.'] },
      { say: ['riley', 'I HAVE KEPT THIS DOOR SINCE BEFORE THERE WAS A SCHOOL ON THE OTHER SIDE OF IT. NOTHING HAS EVER LEAKED LIKE THIS.'] },
      { insert: 'log', lines: ['INCIDENT 9999', 'LOCATION: TERRAMANIA HIGH. ALL OF IT.', 'CAUSE: A TEACHER WHO WOULD NOT LEAVE.', 'CAUSE: A SCHOOL THAT WOULD NOT STAY.', 'ACTION TAKEN: SEAL.'], stamp: 'CODE RED', color: '#ff5050' }, { sfx: 'scribble' }, { wait: 330 },
      // ---- the visitor ----
      { thaw: 'lopez' }, { shot: ['close', 'lopez'] }, { emote: ['lopez', '!'] },
      { say: ['lopez', 'KEEPER. THE CROWN IS BROKEN. THE ROOM IS EMPTYING. IT IS OVER. THERE IS NOTHING LEFT HERE TO SEAL.'] },
      { cam3d: ['riley', 'hero'] },
      { say: ['riley', 'THERE IS A UNIVERSE THAT HAS LEARNED HOW TO OPEN DOORS, MR. TUERO. THAT IS NOT A THING THAT CAN BE UN-LEARNED.'] },
      { say: ['riley', 'SO I AM SEALING TERRAMANIA. THE SCHOOL, THE FIELD, THE BELL. ONE MOMENT, KEPT. THIS ONE WILL DO. EVERYONE IS TOGETHER IN IT.'] },
      { insert: 'sealmap', n: 3, text: 'SEALING: THE GYM. ROOM 314. THE BAND ROOM.' }, { sfx: 'zap' }, { wait: 150 },
      { thaw: '$hero' }, { shot: ['close', '$hero'] }, { tremble: ['$hero', 70] },
      { say: ['$hero', "...THAT'S WHAT HE WANTED. THAT IS EXACTLY WHAT WE JUST STOPPED HIM FROM DOING."] },
      { cam3d: ['riley', 'push'] },
      { say: ['riley', 'YES. HE WAS RIGHT ABOUT WHAT SHOULD BE DONE. HE WAS ONLY EVER WRONG ABOUT WHO WAS ALLOWED TO DO IT.'] },
      { shot: 'wide' }, { walk: ['lopez', 246, 40] }, { act: ['lopez', 'special'] },
      { cam3d: [['lopez', 'riley'], 'ots'] }, { score: 'lopez' },
      { say: ['lopez', 'I KEPT FOUR HUNDRED AND TWELVE CHILDREN IN ONE MOMENT. I KNOW EXACTLY WHAT IT IS. YOU WILL NOT DO IT TO THESE.'] },
      { say: ['riley', 'YOU ARE A VISITOR. YOUR PASS EXPIRED WHEN THE CROWN CAME OFF.'] },
      { shot: ['close', 'lopez'] }, { act: ['lopez', 'idle'] },
      { say: ['lopez', 'THEN I AM NOT A VISITOR. I AM A TEACHER. THESE ARE MY STUDENTS. AND YOU ARE STANDING IN MY CLASSROOM.'] },
      { cam3d: ['lopez', 'behind'] }, { wait: 40 },
      { brawl: { play: 'lopez', vs: 'riley', plain: true, stage: 'throne', cpu: 'hard', survive: 18, word: 'DENIED.', name: 'THE KEEPER', namePlay: 'MR. LOPEZ TUERO' } },
      { if: (v, st) => st.survived, then: [
        { shot: ['close', 'lopez'] }, { emote: ['lopez', 'sweat'] },
        { say: ['lopez', 'I AM STILL STANDING, KEEPER.'] },
        { cam3d: ['riley', 'push'] },
        { say: ['riley', 'YES. THOSE WERE THE EIGHTEEN SECONDS I ALLOWED.'] },
      ], else: [
        { act: ['lopez', 'dazed'] }, { shot: ['close', 'lopez'] },
        { say: ['lopez', '...FOUR HUNDRED YEARS ON A THRONE. I HAD FORGOTTEN WHAT IT IS TO BE ONLY A MAN.'] },
      ] },
      { shot: 'wide' }, { act: ['riley', 'special'] }, { flash: 12 }, { shake: 18 }, { sfx: 'boom' }, { impact: ['lopez', 3] }, { act: ['lopez', 'ko'] }, { wait: 50 },
      { cam3d: ['riley', 'hero'] }, { act: ['riley', 'idle'] }, { score: 'keeper' },
      { say: ['riley', 'STAY DOWN, PLEASE. YOU OF ALL PEOPLE SHOULD WANT THIS.'] },
      { freeze: ['$hero'] },
      { insert: 'sealmap', n: 7, text: 'SEALING: THE CAFETERIA. THE HALLWAY. THE LIBRARY.' }, { glitch: 18 }, { wait: 170 },
      { aberration: 2 }, { panels: ['$hero', 'gabriel', 'sirven'] }, { wait: 90 },
      { narrate: 'ONE BY ONE THE ROOMS OF THE SCHOOL WENT STILL. THE LAST THING TO GO WOULD BE THE BELL.' },
      // ---- the one who is not standing still ----
      { shot: 'wide' }, { score: null }, { amb: ['heartbeat'] }, { sfx: 'hit' }, { wait: 34 }, { sfx: 'hit' }, { wait: 34 }, { sfx: 'hit' }, { wait: 30 },
      { narrate: 'A SOUND. SOMETHING IN THE STOPPED ROOM WAS KEEPING TIME ON ITS HEELS.' },
      { cast: { olu: ['olu', -50, 1, { z: -20 }] } }, { aura: ['olu', 'gold'] }, { walk: ['olu', 60, 110, 'async'] },
      { cam3d: ['olu', 'follow'] }, { score: 'divine' }, { aberration: 0 }, { wait: 110 },
      { cam3d: ['olu', 'low'] },
      { say: ['olu', 'RILEY.'] },
      { cam3d: ['riley', 'snap'] }, { wait: 50 },
      { say: ['riley', '...OLU. YOU ARE A VERY LONG WAY OFF YOUR POST.'] },
      { cam3d: [['riley', 'olu'], 'ots'] },
      { say: ['olu', "DON'T HAVE A POST. I QUIT. YOU STAMPED THE FORM YOURSELF."] },
      { card: ['olu', 'THE KEEPER OF O BLOCK. RETIRED.'], color: GOLD },
      { cam3d: ['riley', 'push'] },
      { say: ['riley', 'YOU KEPT ONE BLOCK. I TAUGHT YOU HOW. IT IS STILL THE SAFEST BLOCK IN ANY UNIVERSE.'] },
      { shot: ['close', 'olu'] },
      { say: ['olu', "IT'S A SUMMER EVENING WITH NO NIGHT COMING. THE HYDRANT'S BEEN OPEN A THOUSAND YEARS. NOT ONE OF THOSE KIDS GOT ANY TALLER."] },
      { recall: { bg: 'oblock', cast: { olu: ['olu', 150, 1], k1: ['javan', 236, -1, { scale: 0.78, name: 'A KID' }], k2: ['tyler', 270, -1, { scale: 0.74, costume: 'alt2', name: 'A KID', z: 20 }] }, cam3d: ['olu', 'orbit'], say: ['olu', 'STAY RIGHT HERE. NOTHING CAN TOUCH YOU HERE. I PROMISE.'] } },
      { shot: ['close', 'olu'] }, { wait: 50 },
      { say: ['olu', "SAFE AIN'T THE SAME AS ALIVE. TOOK ME A THOUSAND YEARS OF ONE BASKETBALL BOUNCING TO HEAR IT."] },
      { cam3d: ['riley', 'hero'] },
      { say: ['riley', 'THIS IS NOT YOUR JURISDICTION.'] },
      { cam3d: ['olu', 'hero'] },
      { say: ['olu', "NAH. IT'S MY SCHOOL. THIRD PERIOD. I GOT A PROJECT DUE WITH THE SKATER."] },
      { shot: ['close', 'bandy'] }, { wait: 50 },
      { cam3d: [['riley', 'olu'], 'ots'] },
      { say: ['olu', 'LET MY CLASS GO, RILEY. OR COME DOWN HERE AND TRY STANDING STILL NEXT TO ME. SEE HOW THAT GOES.'] },
      { shot: 'wide' }, { rise: ['riley', 0, 70] }, { aspect: 'scope', frames: 30 },
      { cam3d: [['olu', 'riley'], 'two'] }, { slowmo: 50 }, { act: ['riley', 'special'] },
      { qte: { type: 'ring', key: 'block', text: 'PHILLY SHELL!', who: 'olu' },
        perfect: [{ fly: ['riley', 80, 'keeperOrb', 22] }, { sfx: 'shield' }, { flash: 8 }, { act: ['riley', 'idle'] }, { shot: ['close', 'olu'] }, { say: ['olu', 'YOU TAUGHT ME THE DOOR. NOBODY EVER TAUGHT YOU THE SHOULDER.'] }],
        hit: [{ fly: ['riley', 80, 'keeperOrb', 22] }, { sfx: 'shield' }, { flash: 5 }, { act: ['riley', 'idle'] }, { shot: ['close', 'olu'] }, { say: ['olu', 'PHILLY SHELL. LOOK IT UP.'] }],
        miss: [{ fly: ['riley', 80, 'keeperOrb', 22] }, { impact: ['olu', 2] }, { act: ['riley', 'idle'] }, { act: ['olu', 'idle'] }, { shot: ['close', 'olu'] }, { say: ['olu', 'OKAY. THAT ONE COUNTED.'] }] },
      { cam3d: ['olu', 'behind'] }, { wait: 40 },
      { brawl: { play: 'olu', vs: 'riley', plain: true, stage: 'throne', cpu: 'hard', until: 'judge', name: 'THE KEEPER', mid: 'THIS AREA IS RESTRICTED.' } },
      // ---- there is a procedure for everything ----
      { shot: 'wide' }, { act: ['riley', 'dazed'] }, { score: null }, { amb: null }, { aspect: 'ultra' }, { wait: 50 },
      { narrate: 'A KEEPER HAD NEVER FALLEN ON DUTY. THERE WAS A PROCEDURE FOR IT ANYWAY. THERE IS A PROCEDURE FOR EVERYTHING.' },
      { column: [192, 160, 44] }, { bloom: 0.08 }, { sfx: 'gong' }, { wait: 50 },
      { cast: { judge: ['judge', 192, 1, { y: 36, z: 44 }] } }, { appear: 'judge' }, { aura: ['judge', 'white'] }, { score: 'court' },
      { cam3d: ['judge', 'judge'] }, { wait: 130 },
      { card: ['judge', 'HAS NEVER ISSUED A SECOND SENTENCE.'], color: '#ffe9a0' },
      { insert: 'gavel', text: 'ORDER.', sub: 'THE BENCH ABOVE EVERYTHING IS NOW IN SESSION' }, { sfx: 'clang' }, { wait: 150 },
      { cam3d: ['judge', 'worship'] },
      { say: ['judge', 'A KEEPER HAS FALLEN AT HIS POST. THE BENCH IS SEATED.'] },
      { say: ['judge', 'THE MATTER BEFORE IT: WHETHER THE UNIVERSE CALLED TERRAMANIA IS A HAZARD, AND IS TO BE SEALED.'] },
      { cam3d: ['olu', 'hero'] },
      { say: ['olu', "YOUR HONOR. HE DON'T GET TO CLOSE A WORLD WITHOUT A HEARING. THAT'S IN THE HANDBOOK. I HELPED WRITE THE HANDBOOK."] },
      { cam3d: ['judge', 'push'] },
      { say: ['judge', 'IT IS. THE UNIVERSE MAY SPEAK FOR ITSELF. IT MAY CALL WITNESSES. TIME WILL WAIT OUTSIDE.'] },
      { thaw: '$hero' }, { shot: ['close', '$hero'] }, { emote: ['$hero', '?'] },
      { say: ['$hero', { astuto: 'WITNESSES. A HEARING. YOUR HONOR, I HAVE WAITED MY ENTIRE LIFE FOR SOMEONE TO SAY THOSE WORDS TO ME.', _: "...WE GET A TRIAL? WE'RE GOING TO NEED A LAWYER. DOES ANYBODY KNOW A LAWYER?" }] },
      { cam3d: ['judge', 'judge'] },
      { say: ['judge', 'THE BENCH WILL HEAR FROM EVERYONE WHO EVER SIGNED IN. ALL RISE.'] },
      { flash: 20 }, { sfx: 'clang' }, { score: null }, { fade: ['out', 60] },
    ],
  });

  // ================================================================== THE VERDICT (after CODE RED)
  const SEAT = ['$hero', 288, -1, { z: -8 }], STAND = 168;
  const call = (id) => [{ cast: { [id]: [id, 440, -1] } }, { cam3d: ['judge', 'court'] }, { walk: [id, STAND, 44] }];
  const dismiss = (id) => [{ whip: true }, { if: heroIs(id), then: [{ cast: { '$hero': SEAT } }], else: [{ remove: id }] }];
  // ---- the fourth ending: nobody has ever asked him to come in ----
  const out = (keys, base = 50) => keys.map((k, i) => ({ if: (v, st, scene) => scene.hero !== k, then: [{ walk: [k, -60, base + i * 8, 'async'] }] }));
  const END_KEEPER = [
    { score: null }, { amb: ['drone', 'bell'] },
    { say: ['$hero', 'WAIT.'] },
    { cam3d: [['$hero', 'riley'], 'ots'] },
    { say: ['$hero', "THERE IS SOMEBODY IN THIS ROOM WHOSE WHOLE JOB IS A DOOR. AND WE'RE ARGUING ABOUT WHICH ONE OF US DIES HOLDING IT."] },
    { cam3d: ['riley', 'face'] },
    { say: ['riley', 'I HAVE BEEN INSTRUCTED NOT TO INTERFERE.'] },
    { if: when('guard', 'asked'), then: [
      { shot: ['close', 'nicholas'] },
      { say: ['nicholas', 'I ASKED HIM HIS NAME ONCE. DAY BEFORE THE BELL. HE SAID NOBODY HAD ASKED SINCE THE BUILDING WAS BUILT.'] },
    ] },
    { shot: ['close', '$hero'] },
    { say: ['$hero', "I'M NOT ASKING YOU TO INTERFERE. THE NEW KID CALLED YOU RILEY. SO. RILEY."] },
    { shot: ['xcu', 'riley'] }, { wait: 60 },
    { say: ['$hero', 'IS THIS SEAT TAKEN?'] },
    { wait: 90 },
    { say: ['riley', 'THERE IS NO SEAT. THERE IS A DESK. I FLOAT BEHIND IT. NOBODY HAS EVER-'] },
    { shot: ['xcu', 'riley'] }, { wait: 70 },
    { say: ['riley', '...NOBODY EVER SITS HERE.'] },
    { shot: ['close', '$hero'] }, { emote: ['$hero', 'heart'] }, { score: 'seat' },
    { say: ['$hero', "THEN IT'S OURS."] },
    { cam3d: ['riley', 'worship'] }, { rise: ['riley', 0, 90] },
    { narrate: 'IN ALL THE TIME THERE HAD BEEN A DOOR, NOBODY HAD EVER ONCE ASKED THE KEEPER TO COME IN.' },
    { shot: ['close', 'riley'] },
    { say: ['riley', 'I HAVE HELD IT SHUT SINCE BEFORE YOUR SCHOOL HAD A NAME. I DO NOT KNOW HOW TO HOLD ONE OPEN.'] },
    { shot: ['close', 'sirven'] },
    { say: ['sirven', 'IT IS THE SAME HAND, YOUNG MAN. YOU ONLY STAND ON THE OTHER SIDE OF IT. COME. I WILL SHOW YOU.'] },
    { shot: 'wide' }, { act: ['sirven', 'idle'] }, { blink: ['riley', 326, 0] }, { face: ['riley', 1] }, { act: ['riley', 'special'] }, { flash: 12 }, { sfx: 'shield' }, { aura: ['riley', 'cosmic'] }, { bloom: 0.4 }, { score: 'triumph' }, { weather: null }, { wait: 40 },
    { insert: 'door', from: 0.06, open: 1, text: 'FOR THE FIRST TIME, HE PUSHED.' }, { sfx: 'arcane' }, { wait: 190 },
    { cam3d: ['riley', 'push'] },
    { say: ['riley', 'THE DOOR IS OPEN. IT WILL STAY OPEN. EVERYONE OUT, PLEASE. NO RUNNING.'] },
    { shot: 'wide' }, ...out(['gabriel', 'bandy', 'simon', 'anthony', 'nicholas', 'sirven']), { wait: 80 },
    { cam3d: [['lopez', 'riley'], 'two'] }, { score: 'memory' },
    { say: ['lopez', 'KEEPER. THE PASS YOU GAVE ME. YOU LEFT "TIME OUT" BLANK.'] },
    { insert: 'pass', name: 'L. TUERO', room: '0 - THE WAITING ROOM', out: 'NOW.', text: 'FOUR HUNDRED YEARS LATE. HE FILLED IT IN.' }, { sfx: 'scribble' }, { wait: 200 },
    { shot: ['close', 'riley'] },
    { say: ['riley', 'YOU ARE SIGNED OUT, MR. TUERO. GO AND TEACH.'] },
    { shot: ['close', 'lopez'] }, { emote: ['lopez', 'tear'] },
    { say: ['lopez', '...THANK YOU, RILEY.'] },
    { shot: 'wide' }, { walk: ['lopez', -60, 70, 'async'] }, { wait: 50 },
    { cam3d: [['$hero', 'riley'], 'ots'] },
    { say: ['$hero', { nicholas: "LIGHT WEIGHT, RILEY. I'M BRINGING YOU A CHAIR MONDAY. WITH LEGS.", brady: 'YOU WILL NEED A HALL PASS LIKE EVERYONE ELSE, RILEY. I WILL SIGN IT MYSELF.', _: "SEE YOU AT THE DESK MONDAY, RILEY. I'M BRINGING A SECOND CHAIR." }] },
    { shot: ['xcu', 'riley'] }, { wait: 60 },
    { say: ['riley', 'ALL CLEAR.'] },
    { shot: 'wide' }, { walk: ['$hero', -60, 60] }, { cam3d: ['riley', 'pullback'] }, { wait: 110 },
    { insert: 'log', lines: ['INCIDENT 9999 - TERRAMANIA HIGH', 'RULING: NOT A HAZARD.', 'DOOR HELD BY: RILEY. HELD OPEN.', 'NOBODY LEFT BEHIND.', 'NOTE: THERE ARE TWO CHAIRS NOW.'], stamp: 'ALL CLEAR', color: '#60ff90' }, { sfx: 'scribble' }, { wait: 360 },
    { amb: null }, { score: null }, { bloom: 0 }, { insert: 'card', text: '...' }, { wait: 110 },
    { narrate: 'THE BELL STOPPED. EVERYONE WHO COULD COME HOME, CAME HOME.' },
    { narrate: 'AND FOR THE FIRST TIME, THE ONE HOLDING THE DOOR WAS THERE BECAUSE HE HAD BEEN ASKED.' },
  ];
  // what the Keeper writes down, when it is one of the other three
  const closed = (by, asked) => ({ insert: 'log', lines: ['INCIDENT 9999 - TERRAMANIA HIGH', 'RULING: NOT A HAZARD.', 'DOOR HELD BY: ' + by, 'KEEPER RETURNED TO POST.', asked ? 'NOTE: ONE OF THEM ASKED MY NAME ONCE.' : 'NOTE: NOBODY ASKED MY NAME.'], stamp: 'CLOSED', color: ICE });
  const LOGGED = [{ if: ending('keeper'), else: [
    { if: when('guard', 'asked'),
      then: [{ if: ending('hero'), then: [closed('THE ONE THEY SENT.', true)], else: [{ if: ending('sirven'), then: [closed('A PRINCIPAL.', true)], else: [closed('A TEACHER.', true)] }] }],
      else: [{ if: ending('hero'), then: [closed('THE ONE THEY SENT.', false)], else: [{ if: ending('sirven'), then: [closed('A PRINCIPAL.', false)], else: [closed('A TEACHER.', false)] }] }] },
    { sfx: 'scribble' }, { wait: 340 },
  ] }];
  {
    const i = DOOR.findIndex((s) => s.choice && s.choice.id === 'ending');
    if (i < 0) console.warn('story-10: could not find the last choice');
    else {
      DOOR[i].choice.options.push({ text: '"RILEY. IS THIS SEAT TAKEN?"', set: 'keeper', then: END_KEEPER,
        locked: (vars, prog) => vars.guard !== 'asked' && !prog.done && !Object.keys(prog.endings || {}).length, lockedText: '? ? ?   (NOBODY EVER ASKED HIM)' });
      DOOR.splice(i + 1, 0, ...LOGGED);
    }
  }

  C.push({
    title: 'THE VERDICT', sub: 'THE WHOLE SCHOOL TAKES THE STAND',
    intro: [
      { music: 'silence' }, { amb: ['room'] }, { insert: 'gavel', text: 'ALL RISE.', sub: 'THE UNIVERSE CALLED TERRAMANIA V. THE DOOR' }, { sfx: 'clang' }, { wait: 170 },
      { bg: 'tribunal' }, { aspect: 'ultra' }, { score: 'court' }, { bloom: 0.08 },
      { cast: {
        judge: ['judge', 192, 1, { y: 60, z: 70 }], riley: ['riley', 80, 1, { z: 30 }],
        '$hero': SEAT, astuto: ['astuto', 250, -1, { z: 20 }], lopez: ['lopez', 322, -1, { z: -36 }], olu: ['olu', 356, -1, { z: 46 }],
        sirven: ['sirven', 324, -1, { z: 58 }], brady: ['brady', 296, -1, { z: 72 }], nicholas: ['nicholas', 346, -1, { z: 4 }], anthony: ['anthony', 372, -1, { z: 24 }],
      } },
      { aura: ['judge', 'white'] }, { aura: ['riley', 'cosmic'] }, { aura: ['olu', 'gold'] },
      { crowd: { n: 110, look: 'students', x: [-280, 660], z: [-440, -200], facing: 1, seed: 31 } },
      { dissolve: 50 }, { cam3d: ['judge', 'flyover'] },
      { title: ['CHAPTER 30', 'THE VERDICT'] },
      { place: ['THE BENCH ABOVE EVERYTHING', 'TIME IS WAITING OUTSIDE.'] },
      { narrate: 'EVERYONE WHO HAD EVER SIGNED IN AT TERRAMANIA HIGH WAS IN THE GALLERY. THE BENCH HAD SENT FOR ALL OF THEM.' },
      { cam3d: ['judge', 'judge'] },
      { say: ['judge', 'THE KEEPER WILL STATE THE CASE FOR SEALING.'] },
      { cam3d: ['riley', 'hero'] }, { score: 'keeper' },
      { say: ['riley', 'YOUR HONOR. I DO NOT DISLIKE THEM. I HAVE SIGNED EVERY ONE OF THEM IN, EVERY MORNING, FOR SIXTY-FIVE YEARS.'] },
      { say: ['riley', 'IN ONE DAY THEY TORE FOUR HUNDRED HOLES BETWEEN UNIVERSES AND WALKED EVERY CLASS THEY EVER HAD ACROSS TIME. THE NEXT SCHOOL WILL NOT STOP AT A FOOTBALL FIELD.'] },
      { insert: 'monitors', sealed: 4, text: 'A SEALED UNIVERSE HAS NEVER LOST ONE CHILD. NOT ONE.' }, { wait: 190 },
      { cam3d: ['riley', 'push'] },
      { say: ['riley', 'SEALED, THEY ARE TOGETHER. NOBODY GRADUATES. NOBODY MOVES THREE STATES AWAY. NOBODY IS FORGOTTEN. I AM OFFERING THEM THE THING THEY ARE ALL AFRAID TO LOSE.'] },
      { panels: ['nicholas', 'lopez', 'sirven'] }, { wait: 90 },
      { cam3d: ['judge', 'judge'] }, { score: 'court' },
      { say: ['judge', 'THE UNIVERSE MAY ANSWER. WHO SPEAKS FOR IT?'] },
      // ---- counsel for the universe ----
      { cam3d: ['astuto', 'hero'] }, { emote: ['astuto', '!'] }, { score: 'comedy' },
      { say: ['astuto', 'YOUR HONOR! DR. ASTUTO, HISTORY WING, ROOM 1776! I HAVE BEEN PREPARING FOR THIS SINCE BEFORE I KNEW IT EXISTED!'] },
      { card: ['astuto', 'COUNSEL FOR THE UNIVERSE.'], color: '#ffe9a0' },
      { say: ['astuto', 'WE THE PEOPLE OF THIS SCHOOL, IN ORDER TO FORM A MORE PERFECT LUNCH PERIOD, CALL OUR FIRST WITNESS!'] },
      ...call('weissenberg'),
      { cam3d: ['weissenberg', 'hero'] },
      { say: ['weissenberg', 'DR. WEISSENBERG, SCIENCE LAB. THE KEEPER SAYS A SEALED UNIVERSE IS SAFE. I RAN THE NUMBERS. A CLOSED SYSTEM DOES NOT STAY THE SAME. IT RUNS DOWN.'] },
      { say: ['weissenberg', 'HIS TUESDAY IS A LITTLE COLDER EVERY TIME IT REPEATS. HE HAS NOT SAVED ANYTHING. HE HAS MADE IT DIE SLOWLY ENOUGH TO LOOK LIKE LIVING.'] },
      { cam3d: ['riley', 'push'] }, { score: 'keeper' },
      { say: ['riley', 'HOW LONG UNTIL IT RUNS DOWN, DOCTOR?'] },
      { shot: ['close', 'weissenberg'] }, { emote: ['weissenberg', 'sweat'] },
      { say: ['weissenberg', 'TEN TO THE HUNDREDTH YEARS.'] },
      { shot: ['xcu', 'riley'] },
      { say: ['riley', 'I CAN WAIT.'] },
      ...dismiss('weissenberg'), ...call('holbrook'), { score: 'court' },
      { cam3d: ['holbrook', 'hero'] },
      { say: ['holbrook', 'HOLBROOK. GEOGRAPHY. I HAVE MAPPED THAT BUILDING FOR NINETEEN YEARS. THERE ARE FORTY-ONE DOORS IN IT. I ONCE ASKED MYSELF WHY SO MANY.'] },
      { shot: ['close', 'holbrook'] },
      { say: ['holbrook', 'A SCHOOL IS THE ONLY BUILDING THERE IS WHOSE WHOLE PURPOSE IS FOR EVERYONE INSIDE IT TO LEAVE.'] },
      ...dismiss('holbrook'), ...call('escobedo'), { score: 'comedy' },
      { cam3d: ['escobedo', 'hero'] },
      { say: ['escobedo', 'EL ESCOBEDO, ENGINEERING! EXHIBIT A, YOUR HONOR: ONE TOASTER. IT HELD A DOOR BETWEEN UNIVERSES OPEN FOR NINE MINUTES. I BUILT IT TO MAKE TOAST. DALE!'] },
      { cam3d: ['judge', 'push'] },
      { say: ['judge', 'THE TOASTER IS ADMITTED INTO EVIDENCE.'] },
      { shot: ['close', 'escobedo'] }, { emote: ['escobedo', 'heart'] },
      { say: ['escobedo', 'NOTHING IN THAT SCHOOL DOES ONLY WHAT IT WAS BUILT FOR, YOUR HONOR. THAT IS NOT A LEAK. THAT IS THE CURRICULUM.'] },
      ...dismiss('escobedo'),
      { cast: { tamayo: ['tamayo', 352, -1, { z: -24 }] } }, { cam3d: ['tamayo', 'hero'] }, { emote: ['tamayo', '!'] },
      { say: ['tamayo', 'OBJECTION! TAMAYO, GOVERNMENT, ROOM 1787! COUNSEL IS LEADING THE TOASTER!'] },
      { shot: ['close', 'astuto'] }, { emote: ['astuto', 'anger'] },
      { say: ['astuto', 'SIT DOWN, TAMAYO! 1776 COMES BEFORE 1787!'] },
      { shot: ['close', 'tamayo'] },
      { say: ['tamayo', 'AND 1787 IS THE ONE THAT ACTUALLY WORKED! HA HA HA! ...FOR THE RECORD, YOUR HONOR: HE IS RIGHT ABOUT THE SCHOOL. ONLY ABOUT THE SCHOOL.'] },
      { stamp: ['OVERRULED', '#ffe9a0'] }, { cam3d: ['judge', 'push'] },
      { say: ['judge', 'ORDER.'] },
      ...call('loor'), { score: 'bro' },
      { cam3d: ['loor', 'hero'] },
      { say: ['loor', 'CHRIS LOOR. I MAKE THE PIZZA. EVERY FRIDAY, THIRTY BOXES TO THAT SCHOOL. FOUR YEARS. NOT ONE TIME DID ANYBODY ORDER FOR ONE.'] },
      { shot: ['close', 'loor'] },
      { say: ['loor', 'I HAVE FED SAFE PEOPLE, YOUR HONOR. THEY EAT ALONE. THESE ONES FIGHT OVER THE LAST SLICE. I KNOW WHICH KITCHEN I WANT TO WORK IN.'] },
      ...dismiss('loor'),
      // ---- the gallery has opinions ----
      { cast: { javan: ['javan', 60, -1, { z: 60 }], erick: ['erick', 200, -1, { z: 62 }], trump: ['trump', 330, -1, { z: 64 }] } }, { score: 'comedy' },
      { panels: ['javan', 'erick', 'trump'] },
      { say: ['javan', 'BOOOO! SEAL THIS, KEEPER! BOOOOOO!'] },
      { say: ['judge', 'THE GALLERY WILL COME TO ORDER.'] },
      { say: ['javan', "I'M FROM PHILLY, YOUR HONOR. THIS IS ORDER."] },
      { say: ['erick', 'ERICK. REGAL KENDALL VILLAGE. I TEAR TICKETS, YOUR HONOR. NOBODY HAS EVER PAID TO SIT IN FRONT OF A PICTURE THAT DOES NOT MOVE.'] },
      { say: ['trump', 'YOUR HONOR, I KNOW DOORS. TREMENDOUS DOORS. YOU NEVER SEAL A GOOD DOOR. VERY BAD DEAL. EVERYBODY SAYS SO.'] },
      { say: ['judge', 'THAT WITNESS WAS NOT CALLED.'] },
      { say: ['trump', 'I CALLED MYSELF. MANY PEOPLE ARE SAYING IT WAS THE BEST TESTIMONY.'] },
      { remove: 'javan' }, { remove: 'erick' }, { remove: 'trump' }, { cam3d: ['judge', 'push'] },
      { say: ['judge', '...IT IS STRICKEN. THE REST MAY STAND.'] },
      // ---- two who were kept ----
      { whip: true }, { remove: 'tamayo' }, { score: 'sad' },
      { cast: { bruiser: ['bruiser', 440, -1], viper: ['viper', 470, -1, { z: 18 }] } }, { cam3d: ['judge', 'court'] }, { walk: ['viper', 204, 50, 'async'] }, { walk: ['bruiser', STAND, 50] },
      { narrate: 'THE NEXT TWO WITNESSES WERE NOT FROM TERRAMANIA. NOT THIS ONE.' },
      { cam3d: ['bruiser', 'hero'] },
      { say: ['bruiser', 'BRUISER. UNIVERSE 0417. YOUR VISITOR KEPT MY SCHOOL FOR TWO HUNDRED YEARS. YOU WATCHED, KEEPER. I SAW YOU ON THE OTHER SIDE OF THE GLASS.'] },
      { shot: ['close', 'viper'] },
      { say: ['viper', 'VIPER. 2203. YOU WANT TO KNOW WHAT SAFE IS LIKE FROM INSIDE? IT IS QUIET. NOTHING HURTS. YOU STAND IN A ROW AND CANNOT REMEMBER WHAT YOUR FACE WAS FOR.'] },
      { shot: ['close', 'bruiser'] },
      { say: ['bruiser', 'WE GOT OUT BECAUSE SOME KIDS WE NEVER MET SAID OUR NAMES ACROSS A FOOTBALL FIELD. THAT IS THE LEAK HE WANTS TO FIX.'] },
      { cam3d: ['riley', 'push'] }, { score: 'keeper' },
      { say: ['riley', 'I RECORDED NO INJURIES IN UNIVERSE 0417.'] },
      { shot: ['close', 'viper'] },
      { say: ['viper', 'YEAH. THAT WAS THE INJURY.'] },
      { whip: true }, { remove: 'bruiser' }, { remove: 'viper' }, ...call('urbanik'), { score: 'mystery' },
      { cam3d: ['urbanik', 'hero'] },
      { say: ['urbanik', 'MR. URBANIK, PSYCHOLOGY. I WAS ASKED TO EVALUATE THE PROSECUTION. HE IS NOT CRUEL. HE HAS BEEN ALONE AT A DESK SINCE BEFORE THERE WERE WORDS.'] },
      { shot: ['close', 'urbanik'] },
      { say: ['urbanik', 'HE HAS MISTAKEN A LOCKED DOOR FOR A SAFE ROOM. I HAVE SEEN THAT EXACT CONDITION BEFORE. THIS WEEK. HE IS SITTING RIGHT OVER THERE.'] },
      { shot: ['close', 'lopez'] }, { emote: ['lopez', '...'] }, { wait: 60 },
      ...dismiss('urbanik'), ...call('ruano'), { score: 'hope' },
      { cam3d: ['ruano', 'hero'] },
      { say: ['ruano', 'RUANO. FROM MADRID. I ONLY WISH TO SAY THAT I FORGIVE THE KEEPER. IN ADVANCE. WHATEVER IS DECIDED. IT SAVES TIME LATER.'] },
      { shot: ['xcu', 'riley'] }, { wait: 50 },
      { say: ['riley', '...NOTED.'] },
      ...dismiss('ruano'),
      // ---- the visitor ----
      { shot: ['close', 'astuto'] }, { score: 'lopez' },
      { say: ['astuto', 'THE UNIVERSE CALLS ITS LAST WITNESS. THE VISITOR.'] },
      { cam3d: ['judge', 'court'] }, { depth: ['lopez', 0, 50] }, { walk: ['lopez', STAND, 60] }, { face: ['lopez', -1] },
      { cam3d: ['lopez', 'hero'] },
      { say: ['lopez', 'LOPEZ TUERO. I TAUGHT CALCULUS. THEN I DID WHAT THE KEEPER PROPOSES, TO FOUR HUNDRED AND TWELVE CHILDREN, FOR FOUR HUNDRED YEARS.'] },
      { shot: ['close', 'lopez'] },
      { say: ['lopez', 'I CAN TELL THE BENCH EXACTLY WHAT IT IS. IT IS LOVE WITH THE DOOR NAILED SHUT.'] },
      { say: ['lopez', 'THEY DID NOT FORGET ME, YOUR HONOR. I NEVER LET THEM GO ANYWHERE THEY COULD COME BACK FROM.'] },
      { cam3d: [['lopez', 'riley'], 'ots'] }, { score: 'keeper' },
      { say: ['riley', 'MR. TUERO. WHILE YOU KEPT THEM: HOW MANY OF YOUR FOUR HUNDRED AND TWELVE WERE HARMED?'] },
      { shot: ['close', 'lopez'] }, { wait: 40 },
      { say: ['lopez', '...NONE.'] },
      { cam3d: ['riley', 'push'] },
      { say: ['riley', 'AND IN THE ONE DAY SINCE THE DOORS OPENED?'] },
      { shot: ['xcu', 'lopez'] }, { score: null }, { amb: ['heartbeat'] }, { wait: 90 },
      { say: ['lopez', 'FIVE ARE DEAD.'] },
      { cam3d: ['riley', 'hero'] },
      { say: ['riley', 'FERNANDO. DABALSA. LANDA. WUTTKE. A BOY NAMED CHRIS. I SIGNED EVERY ONE OF THEM IN. NO FURTHER QUESTIONS.'] },
      { panels: ['nicholas', 'brady', 'sirven'] }, { wait: 120 },
      { narrate: 'NOBODY IN THE GALLERY MADE A SOUND. THERE WAS NOT A GOOD ANSWER TO THAT. THERE WAS ONLY A TRUE ONE.' },
      // ---- one voice ----
      { cam3d: ['judge', 'court'] }, { walk: ['lopez', 322, 50, 'async'] }, { depth: ['lopez', -36, 50] }, { cam3d: ['judge', 'judge'] }, { amb: ['room'] },
      { say: ['judge', 'THE UNIVERSE WILL CLOSE. ONE VOICE.'] },
      { shot: ['close', 'astuto'] },
      { say: ['astuto', { astuto: 'YOUR HONOR. I HAVE READ EVERY BOOK IN THE HISTORY WING. THIS PART IS NOT IN ANY OF THEM. SO I WILL JUST SAY IT.', _: 'YOUR HONOR, THE HISTORY WING YIELDS. THIS PART IS NOT IN ANY BOOK I OWN. IT BELONGS TO THE ONE WHO KNOCKED THE CROWN OFF.' }] },
      { cast: { '$hero': SEAT } }, { cam3d: ['judge', 'court'] }, { walk: ['$hero', STAND, 60] }, { face: ['$hero', -1] },
      { cam3d: ['$hero', 'oner'] }, { score: 'seat' }, { wait: 60 },
      { choice: { id: 'closing', who: '$hero', prompt: 'FIVE ARE DEAD. ANSWER HIM.', options: [
        { text: '"THEY CHOSE THE DOOR. ALL FIVE OF THEM."', set: 'chose', then: [
          { say: ['$hero', 'YOU SIGNED THEM IN. DID YOU EVER READ WHAT THEY DID? MR. FERNANDO HELD A DOOR SO KIDS COULD GET OUT OF IT. NOBODY MADE HIM.'] },
          { recall: { bg: 'throne', cast: { fernando: ['fernando', 150, 1], bandy: ['bandy', 90, 1] }, shot: ['close', 'fernando'], say: ['fernando', "SO I'M KEEPING IT. GO. ...AND TURN IT UP."] } },
          { say: ['$hero', 'A SEALED SCHOOL NEVER LOSES FIVE PEOPLE LIKE THAT. IT NEVER HAS FIVE PEOPLE LIKE THAT, EITHER.'] },
        ] },
        { text: '"COUNT THE ONES WHO CAME BACK."', set: 'back', then: [
          { say: ['$hero', 'YOU COUNTED WHO WE LOST. COUNT THE REST. EVERY CLASS SINCE 1961 WALKED OUT OF A HOLE IN THE AIR FOR A SCHOOL MOST OF THEM LEFT DECADES AGO.'] },
          { insert: 'portals', text: 'EVERY CLASS THAT EVER WAS', n: 14 }, { wait: 150 },
          { say: ['$hero', 'NOBODY COMES BACK TO A PLACE THEY WERE NEVER ALLOWED TO LEAVE. THAT IS THE WHOLE LESSON. A TEACHER TAUGHT IT TO US BY GETTING IT WRONG.'] },
        ] },
      ] } },
      { cam3d: [['$hero', 'riley'], 'ots'] },
      { say: ['$hero', "WE DON'T WANT SAFE. WE WANT THE BELL TO RING AND THE DOOR TO OPEN, AND TO BE THE KIND OF PEOPLE WHO COME BACK THROUGH IT."] },
      { shot: ['close', '$hero'] },
      { say: ['$hero', { nicholas: 'AND I WANT MY BEST FRIEND TO GRADUATE, YOUR HONOR. LIGHT WEIGHT.', brady: 'AND I HAVE A SCHOOL TO OPEN IN THE MORNING. WITH RESPECT.', jauregui: 'AND I HAVE A STUDENT TO TELL I AM PROUD OF HIM. I AM TWELVE YEARS LATE.', _: 'THAT IS ALL. THAT IS THE WHOLE SCHOOL.' }] },
      // ---- the bench will see for itself ----
      { cam3d: ['judge', 'judge'] }, { score: 'court' },
      { say: ['judge', 'WORDS COST NOTHING IN ANY UNIVERSE. THE BENCH HAS HEARD WHAT THIS SCHOOL SAYS. IT WILL NOW SEE WHAT THIS SCHOOL TEACHES.'] },
      { cam3d: ['judge', 'court'] }, { rise: ['judge', 0, 80, 'async'] }, { depth: ['judge', 0, 80] }, { wait: 30 }, { walk: ['judge', 250, 50] }, { face: ['judge', -1] }, { sfx: 'stomp' }, { shake: 10 },
      { cam3d: [['$hero', 'judge'], 'two'] },
      { say: ['judge', 'DEFEND YOUR ANSWER.'] },
      { cam3d: ['$hero', 'behind'] }, { wait: 40 },
      { brawl: { play: '$hero', vs: 'judge', plain: true, stage: 'tribunal', cpu: 'normal', boss: 1.5, name: 'THE TERRAMANIA JUDGE', mid: 'THE BENCH IS LISTENING.' } },
      { cam3d: ['judge', 'court'] }, { act: ['judge', 'idle'] }, { score: null }, { wait: 50 },
      { cam3d: ['judge', 'hero'] },
      { say: ['judge', 'ENOUGH. THE BENCH IS SATISFIED.'] },
      { cam3d: ['judge', 'court'] }, { walk: ['judge', 192, 40, 'async'] }, { rise: ['judge', 60, 70, 'async'] }, { depth: ['judge', 70, 70] }, { walk: ['$hero', 288, 60] }, { face: ['$hero', -1] }, { face: ['judge', 1] }, { face: ['lopez', -1] },
      { insert: 'gavel', text: 'THE VERDICT.' }, { sfx: 'clang' }, { wait: 130 },
      { cam3d: ['judge', 'judge'] }, { score: 'court' },
      { say: ['judge', 'THE BENCH FINDS THAT THE UNIVERSE CALLED TERRAMANIA LEAKS.'] },
      { panels: ['$friend', 'astuto', 'olu'] }, { wait: 100 },
      { cam3d: ['judge', 'push'] },
      { say: ['judge', 'THE BENCH FURTHER FINDS THAT IT IS SUPPOSED TO.'] },
      { stamp: ['NOT A HAZARD', '#60ff90'] }, { crowdAct: 'cheer' }, { sfx: 'applause' }, { score: 'triumph' }, { flash: 10 },
      { insert: 'sealmap', open: true, text: 'THE ROOMS OF THE SCHOOL CAME BACK, ONE AT A TIME.' }, { wait: 230 },
      { shot: ['close', 'astuto'] }, { emote: ['astuto', 'tear'] },
      { say: ['astuto', 'I WON A CASE. IN FRONT OF EVERYONE. ...TAMAYO SAW THAT. TELL ME TAMAYO SAW THAT.'] },
      { cam3d: ['riley', 'push'] }, { score: 'keeper' }, { crowdAct: 'idle' },
      { say: ['riley', 'YOUR HONOR. IF IT IS NOT A HAZARD... WHAT HAVE I BEEN KEEPING?'] },
      { cam3d: ['judge', 'push'] },
      { say: ['judge', 'A DOOR, KEEPER. YOU WERE ASKED TO KEEP A DOOR. YOU WERE NEVER ASKED TO KEEP WHAT WAS BEHIND IT.'] },
      { shot: ['xcu', 'riley'] }, { wait: 90 },
      { say: ['riley', '...UNDERSTOOD.'] },
      { shot: ['close', 'olu'] },
      { say: ['olu', "IT'S ON PAGE ONE OF THE HANDBOOK, RILEY. I WROTE PAGE ONE."] },
      { cam3d: ['judge', 'judge'] }, { score: 'court' },
      { say: ['judge', 'ONE MATTER THE BENCH CANNOT RULE AWAY. THE DOOR THIS SCHOOL TORE OPEN IS FALLING SHUT ON FOUR HUNDRED AND TWELVE PEOPLE.'] },
      { say: ['judge', 'THE LAW IS OLDER THAN I AM: A DOOR BETWEEN UNIVERSES STAYS OPEN ONLY WHILE A HAND IS ON IT. KEEPER: RETURN TO YOUR POST. OBSERVE. DO NOT INTERFERE.'] },
      { say: ['judge', 'TIME RESUMES. CHOOSE WELL.'] },
      { insert: 'gavel', text: 'ADJOURNED.' }, { sfx: 'clang' }, { wait: 110 },
      // ---- the room between, in the same second they left it ----
      { flash: 16 }, { whip: true }, { clear: true }, { aspect: 'scope' }, { bloom: 0 }, ...ROOM(),
      { cast: { riley: ['riley', 24, 1, { y: 44, z: 50 }] } }, { aura: ['riley', 'cosmic'] },
      { amb: ['drone', 'heartbeat'] }, { score: 'doom' }, { sfx: 'boom' }, { shake: 14 },
      { cam3d: ['sirven', 'crash'] }, { wait: 30 },
      { say: ['sirven', 'IT IS COMING DOWN! OUT! ALL OF YOU! I HAVE THE DOOR!'] },
      ...DOOR,
    ],
  });

  // ================================================================== earlier scenes: they were there from chapter 1
  // THE DAY BEFORE: the security guard by the cafeteria door (look at his feet), the new kid at the
  // next table, and a question nobody has asked in sixty-five years.
  {
    const s = ch('THE DAY BEFORE').intro;
    const cast = s.find((x) => x.cast && x.cast.chris && x.cast.tyler);
    if (cast) Object.assign(cast.cast, { guard: ['riley', 24, 1, { z: 72, name: 'SECURITY' }], olu: ['olu', -120, 1, { z: 26 }] });
    else console.warn('story-10: THE DAY BEFORE: could not find the table');
    after(s, "YES, MA'AM.", [
      { cam3d: ['olu', 'push'] }, { score: 'mystery' },
      { say: ['bandy', "WHO'S THE NEW KID? NEXT TABLE. HE'S BEEN BOUNCING ON HIS HEELS SINCE FIRST PERIOD."] },
      { say: ['tyler', 'OLU. FROM CHICAGO. NO STRESS, HE SEEMS COOL. NOBODY SAW HIM WALK IN, THOUGH. HE WAS JUST... THERE.'] },
      { shot: ['close', 'anthony'] }, { emote: ['anthony', '?'] }, { wait: 30 },
      { say: ['anthony', '...STRANGE. I CAN READ EVERYONE IN THIS ROOM. I CANNOT READ HIM AT ALL.'] },
    ]);
    const i = s.findIndex((x) => x.cam3d && x.cam3d[0] === 'nicholas' && x.cam3d[1] === 'pullback');
    if (i < 0) console.warn('story-10: THE DAY BEFORE: could not find the end of lunch');
    else s.splice(i, 0,
      { shot: 'wide' }, { walk: ['nicholas', 72, 70] }, { score: null },
      { cam3d: [['nicholas', 'guard'], 'ots'] },
      { narrate: 'BY THE DOOR SAT THE SECURITY GUARD, AS HE HAD EVERY LUNCH FOR FOUR YEARS. NOBODY HAD EVER ASKED WHY HIS CHAIR HAD NO LEGS. NOBODY KNEW HIS NAME.' },
      { choice: { id: 'guard', who: 'nicholas', options: [
        { text: '(NOD. KEEP WALKING.)', set: 'nod', then: [
          { emote: ['nicholas', '...'] }, { say: ['guard', 'HAVE A SAFE AFTERNOON.'] },
        ] },
        { text: `"HEY. WHAT'S YOUR NAME, ANYWAY?"`, set: 'asked', note: 'THE SECURITY GUARD WILL REMEMBER THAT.', then: [
          { say: ['nicholas', "HEY, BIG MAN. FOUR YEARS I'VE WALKED PAST YOU. WHAT'S YOUR NAME, ANYWAY?"] },
          { shot: ['xcu', 'guard'] }, { wait: 70 },
          { say: ['guard', '...NOBODY HAS ASKED ME THAT SINCE THE BUILDING WAS BUILT.'] },
          { shot: ['close', 'nicholas'] }, { emote: ['nicholas', '?'] },
          { say: ['nicholas', "BRO. THAT'S LIKE SIXTY YEARS. ...OKAY. KEEP YOUR SECRETS. LIGHT WEIGHT."] },
          { insert: 'badge', text: 'THERE WAS A LINE ON THE BADGE FOR A NAME. IT WAS BLANK.' }, { wait: 180 },
        ] },
      ] } },
      { shot: 'wide' }, { walk: ['nicholas', 150, 60] }, { face: ['nicholas', 1] }, { score: 'bro' });
  }
  // LOCKDOWN: someone locked the front doors before anyone asked him to.
  after(ch('LOCKDOWN').intro, 'I AM FINE, MS. BRADY. CARRY ON.', [
    { cast: { guard: ['riley', -3000, 1, { name: 'SECURITY' }] } }, { shot: ['medium', 'brady'] },
    { say: ['brady', 'BRADY TO SECURITY. LOCK THE FRONT DOORS.', { radio: true }] },
    { say: ['guard', "THEY HAVE BEEN LOCKED SINCE MIDNIGHT, MA'AM. DOORS ARE MY DEPARTMENT. SECURITY IS AWARE.", { radio: true }] },
    { emote: ['brady', '?'] },
    { say: ['brady', 'SINCE MIDNIGHT? I DID NOT GIVE THAT ORDER. WHO GAVE THAT ORDER?'] },
    { say: ['guard', "NOBODY HAS TO, MA'AM.", { radio: true }] },
  ]);
  // ALL RISE: four hundred doors open in one field. Someone notices.
  afterWhere(ch('ALL RISE').intro, (x) => x.insert === 'portals', [
    { wait: 320 },
    { recall: { live: true, bg: 'post', cast: { riley: ['riley', 150, 1, { z: 12 }] }, cam3d: ['riley', 'snap'], say: ['riley', 'FOUR HUNDRED DOORS. IN ONE FIELD. ...THAT IS A CODE RED.'] } },
  ], 'the portals');
  { const s = ch('ALL RISE').intro, i = s.findIndex((x) => x.recall && x.recall.bg === 'post'); if (i >= 0 && s[i + 1] && s[i + 1].wait === 320) s.splice(i + 1, 1); }   // (the long look at the portals now comes before the cut)

  // ================================================================== after the ending: the fourth one
  const STILL = [   // Tyler and Alejandro (the same two lines every graduation has)
    { shot: ['close', 'tyler'] },
    { say: ['tyler', "THERE'S A CHAIR NEXT TO MINE WITH A NAME CARD ON IT. I KNOW A GUY. I'M KEEPING IT."] },
    { shot: ['close', 'alejandro'] },
    { say: ['alejandro', 'I NAMED THE HARDEST ROUTE AT THE CRAG "LADY LANDA." NOBODY HAS FINISHED IT. SHE WOULD LIKE THAT.'] },
  ];
  const GRAD_KEEPER = [
    { cast: Object.assign({}, PT.CROWD, PT.SIRVEN, PT.TEACHER, { tyler: ['tyler', 12, 1, { z: 34 }], alejandro: ['alejandro', 374, -1, { z: 34 }], riley: ['riley', 364, -1, { z: 64 }], olu: ['olu', 300, -1, { z: 54 }] }) },
    { aura: ['riley', 'cosmic'] }, { aura: ['olu', 'gold'] },
    { dissolve: 50 }, { insert: 'door', open: 1, text: 'THE GATE TO THE FIELD WAS OPEN. SOMEONE WAS HOLDING IT.' }, { score: 'seat' },
    { title: ['CHAPTER 31', 'GRADUATION'] },
    { wait: 70 },
    { cam3d: ['brady', 'flyin'] }, { score: 'pomp' },
    { place: ['THE FOOTBALL FIELD', 'GRADUATION DAY. NOBODY HAD TO STAY BEHIND.'] },
    { cam3d: ['brady', 'hero'] },
    { say: ['brady', 'GOOD MORNING. I AM PRINCIPAL BRADY. AS OF NINE MINUTES AGO.'] },
    { shot: ['close', 'sirven'] },
    { say: ['sirven', 'I RETIRED AT 8:51, MS. BRADY. A PRINCIPAL IS THE LAST ONE OUT OF THE BUILDING. I CHECKED EVERY ROOM. THEN I LEFT.'] },
    { cam3d: ['brady', 'hero'] },
    { say: ['brady', 'A SCHOOL IS THE PEOPLE WHO COME BACK FOR EACH OTHER. THIS YEAR WE LEARNED HOW FAR "BACK" GOES.'] },
    ...K.MEMORIAL,
    ...PT.SPEECHES,
    { cam3d: [['jauregui', 'lopez'], 'two'] }, { score: 'memory' },
    { say: ['jauregui', 'LOPEZ. THE SECURITY DESK SIGNED YOU OUT. I WOULD LIKE TO SIGN YOU BACK IN. ROOM 314. IF YOU WANT IT.'] },
    { shot: ['close', 'lopez'] }, { emote: ['lopez', 'tear'] }, { wait: 60 },
    { say: ['lopez', 'I WILL SHOW MY WORK THIS TIME, SIR. ALL OF IT.'] },
    { shot: ['xcu', 'jauregui'] }, { wait: 40 },
    { say: ['jauregui', 'I KNOW YOU WILL. I AM PROUD OF YOU. I AM SAYING IT WHERE EVERYONE CAN HEAR.'] },
    ...PT.ROLL,
    { card: ['olu', 'NEVER STOOD STILL. STOOD UP ONCE.'], color: GOLD },
    // ---- one more, who is not on her list ----
    { cam3d: ['brady', 'push'] }, { score: 'keeper' },
    { say: ['brady', 'ONE MORE. HE IS NOT ON MY LIST. HE HAS A LIST OF HIS OWN, AND EVERY ONE OF US IS ON IT.'] },
    { cam3d: ['riley', 'hero'] },
    { say: ['riley', 'FOUR YEARS OF SIGN-IN SHEETS. I KNOW EVERY NAME ON THIS FIELD. THIS MORNING SOMEBODY WROTE MINE ON A CHAIR.'] },
    { insert: 'badge', name: 'RILEY', text: 'THE LINE ON THE BADGE HAD BEEN BLANK FOR SIXTY-FIVE YEARS.' }, { sfx: 'scribble' }, { wait: 230 },
    { card: ['riley', 'HOLDS THE DOOR. OPEN.', 'RILEY'], color: ICE },
    { cam3d: ['sirven', 'hero'] }, { score: 'sirven' },
    { say: ['sirven', 'THIS IS YOUR PRINCIPAL SPEAKING. FOR THE LAST TIME.'] },
    { say: ['sirven', 'ALL STUDENTS ARE ACCOUNTED FOR. THE KEEPER CHECKED MY COUNT. FOR ONCE, SECURITY AND I AGREE.'] },
    ...PT.CAPS,
    { narrate: 'THE LAST BELL RANG. THE DOOR STAYED OPEN. NOBODY HAD TO BE LEFT BEHIND TO HOLD IT.' },
    ...PT.BRO,
    { insert: 'photo', text: 'CLASS OF TERRAMANIA', ids: ['sirven', 'brady', 'lopez', 'jauregui', 'riley', 'olu', 'loor', 'urbanik', 'nicholas', 'anthony', 'simon', 'mikey', 'bandy', 'gabriel', 'tyler', 'alejandro'] }, { wait: 150 },
  ];
  after(GRAD_KEEPER, "MIAMI, BABY! AND I'M CALLING ALL OF YOU.", STILL);
  const Y_KEEPER = [
    ...PT.KING,
    { cam3d: ['lopez', 'push'] }, { score: 'memory' },
    { say: ['lopez', 'TWENTY GRADUATING CLASSES. I WAVED EVERY ONE OF THEM OUT THE DOOR. THE MAN AT THE DESK COUNTED THEM BACK IN AT EVERY REUNION.'] },
    { cast: { riley: ['riley', 20, 1, { z: 56 }] } }, { aura: ['riley', 'cosmic'] },
    { cam3d: ['riley', 'hero'] }, { score: 'keeper' },
    { say: ['riley', 'ALL OF THEM. I HAVE THE SHEETS. THERE ARE TWO CHAIRS AT THE DESK NOW. ONE OF THEM HAS LEGS.'] },
    { shot: ['xcu', 'riley'] }, { wait: 50 },
    { say: ['riley', 'SOMEBODY ALWAYS SITS IN IT.'] },
  ];
  const LAST_KEEPER = [
    ...PT.HANDOVER,
    { cam3d: ['sirven', 'hero'] },
    { say: ['sirven', 'I WORE A CROWN TO WORK FOR THIRTY-ONE YEARS, YOUNG MAN. THE BAR IS LOWER THAN YOU THINK.'] },
    { shot: ['close', 'sirven'] },
    { say: ['sirven', 'ONE RULE. A PRINCIPAL IS ALWAYS THE LAST ONE OUT OF THE BUILDING.'] },
    { shot: ['close', 'mikey'] },
    { say: ['mikey', 'YES, SIR. LAST ONE OUT.'] },
    { cast: { riley: ['riley', 370, -1, { z: 60 }] } }, { aura: ['riley', 'cosmic'] }, { cam3d: ['riley', 'push'] }, { score: 'keeper' },
    { say: ['riley', 'SECOND TO LAST, COACH. I LOCK UP. ...I ALSO UNLOCK. I AM TOLD THAT IS THE IMPORTANT HALF.'] },
    { dissolve: 50 }, { insert: 'bellin', text: 'CLASS OF 2046' }, { sfx: 'bell' }, { score: 'hope' }, { wait: 120 },
    { narrate: 'THAT AFTERNOON A NEW CLASS SIGNED THE INSIDE OF THE BELL. THE CLASS OF 2016 WAS THERE AGAIN TOO. EVERY NAME.' },
    ...PT.ROOM_314,
    ...PT.DISMISSED,
  ];
  const POST_KEEPER = [   // the desk, twenty years on. Something knocks from the side nothing has ever come from.
    { clear: true }, { rays: false }, { grade: null }, { spot: null }, { bg: 'post' }, { tint: null }, { music: 'silence' }, { amb: ['hum', 'clock'] }, { aspect: 'ultra' }, { bloom: 0.3 },
    { cast: { riley: ['riley', 150, 1, { z: 12 }], olu: ['olu', 236, -1, { z: 12 }] } }, { aura: ['riley', 'cosmic'] }, { aura: ['olu', 'gold'] },
    { fade: ['in', 40] },
    { narrate: 'THE DESK. BETWEEN EVERY UNIVERSE. TWENTY YEARS ON.' },
    { cam3d: [['riley', 'olu'], 'two'] }, { score: 'keeper' },
    { say: ['olu', 'QUIET NIGHT.'] },
    { say: ['riley', 'THEY ARE ALL QUIET NIGHTS. I HAVE STOPPED MINDING THE LOUD ONES.'] },
    { say: ['olu', 'YOU EVER GONNA PUT LEGS ON YOUR CHAIR?'] },
    { say: ['riley', 'NO.'] },
    { score: null }, { sfx: 'hit' }, { wait: 30 }, { sfx: 'hit' }, { wait: 30 }, { sfx: 'hit' }, { shake: 5 }, { wait: 30 },
    { cam3d: ['riley', 'snap'] },
    { narrate: 'THREE KNOCKS. FROM THE OTHER SIDE OF THE DOOR. THE SIDE NOTHING HAS EVER COME FROM.' },
    { shot: ['close', 'olu'] },
    { say: ['olu', '...WE EXPECTING ANYBODY?'] },
    { shot: ['xcu', 'riley'] }, { wait: 50 },
    { say: ['riley', 'ASK THEM TO SIGN IN.'] },
    { insert: 'card', text: 'TERRAMANIA WILL RETURN.' }, { wait: 150 }, { aspect: 'scope' }, { bloom: 0 },
    { fade: ['out', 50] },
  ];
  // each of the three chapters after the ending picks its scene by who held the door: add the fourth
  const fourth = (title, was, mine) => {
    const r = where(ch(title).intro, (x) => x.if && x.then === was);
    if (!r.length) return console.warn('story-10: ' + title + ': could not find where the endings split');
    r.forEach(([l, i]) => { l[i] = { if: ending('keeper'), then: mine, else: [l[i]] }; });
  };
  fourth('GRADUATION', PT.GRAD_HERO, GRAD_KEEPER);
  fourth('TWENTY YEARS LATER', PT.Y_HERO, Y_KEEPER);
  fourth('THE NEXT BELL', PT.LAST_HERO, LAST_KEEPER);
  fourth('THE NEXT BELL', PT.POST_HERO, POST_KEEPER);
  // (in the other three endings the new kid graduates too, and the guard is at the gate)
  for (const g of [PT.GRAD_LOPEZ, PT.GRAD_SIRVEN, PT.GRAD_HERO]) {
    for (const l of lists(g)) for (const s of l) if (s.cast && s.cast.bandy && s.cast.mikey && !s.cast.olu) Object.assign(s.cast, { olu: ['olu', 300, -1, { z: 54 }], guard: ['riley', 364, -1, { z: 64, name: 'SECURITY' }] });
    afterWhere(g, (x) => x.card && x.card[0] === 'nicholas', [{ card: ['olu', 'NEVER STOOD STILL. STOOD UP ONCE.'], color: GOLD }], 'the roll call');
  }

  // ================================================================== the order of the story (34 chapters)
  const ORDER = ['MIDNIGHT', 'THE DAY BEFORE', 'BRO BATCH', 'LOCKDOWN', '1994', 'STREET LEVEL', 'GAME DAY', 'THE HEADMASTER', "THE KING'S CHAIR", 'THE FACULTY MEETING',
    'THE STUDENT TEACHER', 'EVERY UNIVERSE', 'THE WAITING ROOM', 'THE BELL TOWER', 'THREE ANCHORS', 'THE COLLECTION', 'THE CLIMB', "MS. BRADY'S FIRST DAY", 'SHOW YOUR WORK', 'DOOMSDAY',
    'INSIDE THE CROWN', 'THE NEW KID', 'THE LAST ONE OUT', 'RUNG BACKWARD', 'THE NIGHT BEFORE', 'INCIDENT REPORT', 'ALL RISE', 'ROLL CALL', 'THE LAST BELL', 'CODE RED', 'THE VERDICT',
    'GRADUATION', 'TWENTY YEARS LATER', 'THE NEXT BELL'];
  const OLD = K.ORDER.slice();   // the 29-chapter order (story-9.js): a save made before the Keeper counts in these
  const place = (c) => (c.side ? 1000 : ORDER.indexOf(c.title) < 0 ? 900 : ORDER.indexOf(c.title));
  C.forEach((c) => { if (!c.side && ORDER.indexOf(c.title) < 0) console.warn('story: no place in the order for "' + c.title + '"'); });
  const sorted = C.slice().sort((a, b) => place(a) - place(b));
  C.length = 0; C.push(...sorted);
  C.forEach((c, n) => { for (const part of [c.intro, c.outro]) for (const l of lists(part || [])) for (const s of l) if (s.title && /^CHAPTER \d+$/.test(s.title[0])) s.title = ['CHAPTER ' + n, s.title[1]]; });
  ch('THE LAST BELL').sub = 'ACT IV - YOU VS THE HEADMASTER';
  K.ORDER = ORDER;

  // a save from before the Keeper: the same chapter, by name, in the new order
  const migrate9 = RF.STORY.migrate;
  RF.STORY.migrate = function () {
    if (migrate9) migrate9();
    const SP = RF.storyProgress, p = SP.get();
    if (!p.v3) {
      if (p.reached > 0) p.reached = Math.max(0, ORDER.indexOf(OLD[Math.min(p.reached, OLD.length - 1)]));
      p.v3 = true; SP.save(p);
    }
    const reset = SP.reset;
    SP.reset = function () { reset.call(this); const q = this.get(); q.v3 = true; this.save(q); };
  };
})();
