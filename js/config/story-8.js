// STORY MODE, part 8: THE HEADMASTER. The second version of the story's middle.
//
// What changed, and why it is in its own file: the villain used to be one sad man in a gym. Now
// he sits on a throne between universes with an army (the Forgotten: every student he "kept"),
// three lieutenants, and a crown that he puts on the people he takes. And when he takes someone,
// THE SCHOOL FORGETS THEM: the name, the face, the chair. Nobody knows there is a war on, because
// nobody can remember who is missing. That is his whole argument, made real.
//
// This file adds two chapters (THE HEADMASTER, THE COLLECTION), replaces DOOMSDAY, and edits a
// few scenes of the chapters around them. story-9.js has the time travel, the war and the end,
// and puts every chapter in its final order.
//
// New choice:  gabriel  THE COLLECTION  Gabriel, to the Headmaster:  'call' | 'quiet'
(function () {
  const C = RF.STORY.chapters, when = RF.STORY.when;
  const K = RF.STORY.kit = {};
  const TABLE = K.TABLE = { bg: 'cafeteria', cast: { anthony: ['anthony', 190, 1], nicholas: ['nicholas', 232, -1] } };

  // ---- helpers for editing chapters that are written in the other files ----
  const ch = K.ch = (title) => C.find((c) => c.title === title);
  const textOf = (s) => (s.say ? s.say[1] : s.narrate);
  const is = (s, text) => typeof textOf(s) === 'string' && textOf(s).startsWith(text);
  const at = K.at = (steps, text) => steps.findIndex((s) => is(s, text));
  // every list of steps under `steps`: the branches of ifs, choices and quick-time events too
  const lists = K.lists = (steps, out = []) => {
    if (!Array.isArray(steps) || out.includes(steps)) return out;
    out.push(steps);
    for (const s of steps) {
      for (const k of ['then', 'else', 'hit', 'miss', 'perfect']) lists(s[k], out);
      if (s.choice) for (const o of s.choice.options) lists(o.then, out);
    }
    return out;
  };
  // every place a line is said (a scene shared by three endings is three lists)
  const finds = (steps, text) => { const r = lists(steps).map((l) => [l, at(l, text)]).filter((f) => f[1] >= 0); if (!r.length) console.warn('story: could not find the line "' + text + '"'); return r; };
  K.after = (steps, text, add) => finds(steps, text).forEach(([l, i]) => l.splice(i + 1, 0, ...add));
  K.before = (steps, text, add) => finds(steps, text).forEach(([l, i]) => l.splice(i, 0, ...add));
  K.swap = (steps, text, add) => finds(steps, text).forEach(([l, i]) => l.splice(i, 1, ...add));
  K.cut = (steps, from, to, add = []) => finds(steps, from).forEach(([l, i]) => { const j = at(l, to); if (j < i) return console.warn('story: could not find the line "' + to + '"'); l.splice(i, j - i + 1, ...add); });
  K.reword = (steps, text, line) => finds(steps, text).forEach(([l, i]) => { if (l[i].say) l[i].say[1] = line; else l[i].narrate = line; });
  const { after, swap, cut } = K;

  // ---- his first class, 2016: the four we keep seeing ----
  const KIDS = K.KIDS = { dani: ['tyler', 'alt1', 'DANI'], marcus: ['mikey', 'alt2', 'MARCUS'], priya: ['brady', 'alt3', 'PRIYA', 0.84], tj: ['alejandro', 'alt2', 'T.J.'] };
  const kid = K.kid = (k, x, facing, o = {}) => [KIDS[k][0], x, facing, Object.assign({ costume: KIDS[k][1], name: KIDS[k][2] + ', CLASS OF 2016', scale: KIDS[k][3] || 0.92 }, o)];
  // the old flashbacks drew them with whoever was to hand: make them the same four every time
  K.firstClass = (steps) => {
    const order = ['dani', 'marcus', 'priya', 'tj'];
    for (const l of lists(steps)) for (const s of l) for (const cast of [s.cast, s.recall && s.recall.cast]) {
      if (!cast) continue;
      for (const k of Object.keys(cast)) { const m = /^[ks]([1-4])$/.exec(k); if (m && cast[k][3] && cast[k][3].ghost) cast[k] = kid(order[m[1] - 1], cast[k][1], cast[k][2], cast[k][3]); }
    }
  };

  // ---- the Headmaster on his throne, his three, and his army ----
  const THRONE = K.THRONE = { lopez: ['lopez', 192, 1, { emperor: true, y: 70, z: 74, anim: 'crouch', name: 'THE HEADMASTER' }] };
  const THREE = K.THREE = { proctor: ['proctor', 104, 1, { z: 46 }], ringer: ['ringer', 284, -1, { z: 46 }], eraser: ['eraser', 52, 1, { z: 14 }] };
  const FORG = ['tyler', 'simon', 'alejandro', 'bandy', 'jauregui', 'ruano', 'astuto', 'escobedo', 'holbrook', 'tamayo', 'erick', 'javan', 'nicholas', 'mikey', 'brady', 'landa'];
  // n of the Forgotten, spread from x0 to x1 (keys f<from>, f<from+1>, ...). aisle: [lo, hi] is kept
  // clear (the carpet to the throne), and they turn to face it.
  const horde = K.horde = (n, x0, x1, o = {}) => {
    const cast = {}, gap = o.aisle ? o.aisle[1] - o.aisle[0] : 0;
    for (let i = 0; i < n; i++) {
      let x = x0 + (x1 - x0 - gap) * (n > 1 ? i / (n - 1) : 0);
      if (gap && x > o.aisle[0]) x += gap;
      cast['f' + ((o.from || 0) + i)] = [FORG[(i * 5 + (o.from || 0) * 3) % FORG.length], Math.round(x), gap ? (x < o.aisle[0] ? 1 : -1) : o.facing || -1, { forgotten: true, z: (o.z || 0) + ((i * 37) % 60) - 30, name: 'THE FORGOTTEN' }];
    }
    return { cast };
  };
  const each = K.each = (n, f, from = 0) => Array.from({ length: n }, (_, i) => f('f' + (from + i), i));

  // ================================================================== THE HEADMASTER (after GAME DAY)
  C.push({
    title: 'THE HEADMASTER', sub: 'WHAT IS WATCHING THEM',
    intro: [
      { music: 'silence' }, { amb: ['drone'] }, { insert: 'card', text: 'MEANWHILE. NOWHERE.', color: '#b070ff' }, { wait: 90 },
      { bg: 'throne' }, { grade: 'doom' }, { amb: ['drone', 'heartbeat'] }, { score: 'lopez' },
      { cast: Object.assign({}, THRONE, THREE) }, horde(10, 8, 376, { aisle: [120, 264], z: 40 }),
      { dissolve: 50 }, { cam3d: ['lopez', 'drop'] },
      { title: ['CHAPTER 7', 'THE HEADMASTER'] },
      { narrate: 'BETWEEN ONE UNIVERSE AND THE NEXT THERE IS A ROOM. HE BUILT IT OUT OF EVERY CLASSROOM HE COULD NOT BEAR TO LEAVE.' },
      { narrate: 'THERE IS NO CLOCK IN IT. THE SCHOOL HAS HEARD THE BELL FOR ONE MORNING. HE HAS HEARD IT FOR FOUR HUNDRED YEARS.' },
      { cam3d: ['f3', 'push'] }, { wait: 70 },
      { narrate: 'THE ONES WHO STAND IN THE DARK WERE STUDENTS ONCE. HE KEPT THEM, SO THAT THEY WOULD NEVER LEAVE HIM.' },
      { shot: ['close', 'f3'] }, { wait: 80 },
      { narrate: 'HE HAS KEPT THEM SO LONG THAT HE NO LONGER REMEMBERS THEIR FACES. SO THEY NO LONGER HAVE ANY.' },
      { cam3d: ['lopez', 'hero'] }, { score: 'doom' },
      { say: ['lopez', 'THE SCHOOL THINKS THE BELL IS BROKEN.'] },
      { say: ['lopez', 'THEY THINK THE VISITORS ARE AN ACCIDENT. A LEAK. SOMETHING TO MOP UP BEFORE FIRST PERIOD.'] },
      { shot: ['xcu', 'lopez'] }, { wait: 40 },
      { say: ['lopez', 'NOBODY HAS LOOKED UP. NOBODY EVER LOOKS UP.'] },
      // ---- he watches: three things we have just heard them say ----
      { recall: { bg: 'parking', cast: { fernando: ['fernando', 170, 1], bandy: ['bandy', 232, -1] }, shot: ['close', 'fernando'], say: ['fernando', 'THIS ONE KEPT ME. NOBODY EVER KEPT ME.'] } },
      { cam3d: ['lopez', 'face'] },
      { say: ['lopez', 'A MAN WHO WAS THROWN AWAY FOUR TIMES. HE WOULD DIE FOR A BUILDING.'] },
      { recall: { bg: 'field', cast: { mikey: ['mikey', 170, 1], simon: ['simon', 232, -1] }, shot: ['close', 'mikey'], say: ['mikey', 'SO WHY DOES IT FEEL LIKE LOSING?'] } },
      { say: ['lopez', 'A BOY WHO WON EVERYTHING HE EVER WANTED, AND IS AFRAID OF IT.'] },
      { recall: { bg: 'cafeteria', cast: { chris: ['chris', 196, 1], tyler: ['tyler', 244, -1] }, shot: ['close', 'chris'], say: ['chris', "...HE DOESN'T KNOW A GUY FOR FRIENDS. THAT'S WHY I SIT HERE."] } },
      { shot: ['xcu', 'lopez'] }, { wait: 50 },
      { say: ['lopez', 'AND A BOY WHO HAS EVERYTHING EXCEPT THE ONE THING I CAN GIVE HIM.'] },
      { cam3d: [['lopez', 'proctor'], 'ots'] },
      { say: ['lopez', 'PROCTOR.'] },
      { cam3d: ['proctor', 'hero'] },
      { say: ['proctor', 'TWO MINUTES TO MIDNIGHT, HEADMASTER. AS ALWAYS.'] },
      { cam3d: ['lopez', 'hero'] },
      { say: ['lopez', 'BRING ME THE ONES WHO ARE AFRAID TO LEAVE. BEGIN WITH THE ONE AT THE END OF THE TABLE.'] },
      { say: ['lopez', 'DO NOT DRAG HIM. HE WILL WALK. THEY ALWAYS WALK.'] },
      { cam3d: ['lopez', 'pullback'] }, { wait: 60 },
      // ---- Chris, when the table is empty ----
      { whip: true }, { clear: true }, { grade: null },
      { bg: 'cafeteria' }, { tint: 'rgba(10,10,40,0.5)' }, { amb: ['room', 'clock'] }, { score: 'sad' },
      { cast: { chris: ['chris', 150, 1] } },
      { cam3d: ['chris', 'top'] },
      { place: ['THE CAFETERIA', 'AFTER EVERYONE WENT TO CLASS'] },
      { narrate: 'AT LUNCH THE TABLE HAD NINE CHAIRS. NOW IT HAD ONE.' },
      { shot: ['close', 'chris'] },
      { say: ['chris', "HEY, DAD. NO, NOTHING'S WRONG. I JUST- ...YEAH. A MEETING. NO, I KNOW. I KNOW A GUY WHO'S ALWAYS IN A MEETING."] },
      { emote: ['chris', '...'] }, { wait: 60 },
      { say: ['chris', 'THREE MONTHS. THEN THEY ALL GO. AND I GO BACK TO KNOWING A GUY.'] },
      { sfx: 'rumble' }, { shake: 8 }, { rift: [306, 1.3] }, { smash: true }, { score: 'tense' },
      { cast: { proctor: ['proctor', 300, -1] } }, { emote: ['chris', '!'] },
      { cam3d: ['proctor', 'hero'] },
      { say: ['proctor', 'CHRISTOPHER. YOU ARE NOT IN CLASS.'] },
      { cam3d: [['proctor', 'chris'], 'ots'] },
      { say: ['chris', '...YOU HAVE A CLOCK FOR A FACE.'] },
      { cam3d: [['chris', 'proctor'], 'ots'] },
      { say: ['proctor', 'THE HEADMASTER HAS A TABLE. NOBODY EVER GETS UP FROM IT. NOBODY GRADUATES. NOBODY IS IN A MEETING.'] },
      { shot: ['xcu', 'chris'] }, { wait: 50 },
      { say: ['proctor', 'YOU WOULD NEVER HAVE TO KNOW A GUY AGAIN.'] },
      { cam3d: ['chris', 'face'] }, { tremble: ['chris', 90] }, { score: null }, { amb: ['heartbeat'] },
      { qte: { type: 'mash', key: 'heavy', text: 'SAY NO!', who: 'chris', len: 150, need: 18, rigged: true },
        hit: [{ shot: ['xcu', 'chris'] }, { say: ['chris', "...I DON'T WANT TO EAT ALONE AGAIN."] }],
        miss: [{ shot: ['xcu', 'chris'] }, { say: ['chris', "...I DON'T WANT TO EAT ALONE AGAIN."] }] },
      { shot: 'wide' }, { walk: ['chris', 262, 80] },
      { cam3d: ['chris', 'behind'] }, { wait: 40 },
      { crownify: 'chris' }, { shake: 10 }, { sfx: 'bell' }, { wait: 60 },
      { shot: ['close', 'chris'] }, { wait: 60 },
      { say: ['chris', '...IS THERE A SEAT FOR ME?'] },
      { say: ['proctor', 'THERE ALWAYS WAS.'] },
      { shot: 'wide' }, { walk: ['chris', 330, 50, 'async'] }, { walk: ['proctor', 356, 50] }, { riftOff: true }, { remove: 'chris' }, { remove: 'proctor' },
      { shot: 'wide' }, { wait: 60 },
      { narrate: 'THE NEXT DAY THERE WERE EIGHT CHAIRS AT THE TABLE. NOBODY COULD SAY WHY IT FELT WRONG.' },
      { narrate: 'THAT IS WHAT HE DOES. WHEN HE KEEPS SOMEONE, THE WORLD LETS GO OF THEM.' },
      { score: null }, { fade: ['out', 70] },
    ],
  });

  // ================================================================== THE COLLECTION (after THREE ANCHORS)
  C.push({
    title: 'THE COLLECTION', sub: 'THE SECOND CHAIR',
    intro: [
      { bg: 'hallway' }, { music: 'silence' }, { amb: ['room', 'bell'] }, { score: 'comedy' },
      { cast: { gabriel: ['gabriel', 90, 1], lopez: ['lopez', 900, -1, { emperor: true }] } },
      { cam3d: ['gabriel', 'follow'] },
      { title: ['CHAPTER 13', 'THE COLLECTION'] },
      { place: ['THE MAIN HALLWAY', 'GABRIEL, ON A SNACK RUN'] },
      { walk: ['gabriel', 170, 60] },
      { say: ['gabriel', 'SNACKS FOR THE SQUAD! CHIPS FOR MIKEY. GUMMIES FOR TYLER. AND THE FANCY WATER FOR... FOR...'] },
      { shot: ['close', 'gabriel'] }, { emote: ['gabriel', '?'] }, { score: 'mystery' },
      { say: ['gabriel', "WHO DRINKS THE FANCY WATER? THERE'S NINE OF US AT THE TABLE. I ALWAYS BUY NINE."] },
      { say: ['gabriel', 'EIGHT. I MEANT EIGHT. ...I BOUGHT NINE.'] },
      { shot: ['medium', 'gabriel'] }, { score: 'sad' }, { wait: 50 },
      { say: ['gabriel', 'THREE MONTHS. THEN MIAMI. EVERYBODY SAYS "WE\'LL CALL." NOBODY CALLS. I DON\'T EVEN CALL MY COUSINS.'] },
      { say: ['gabriel', "I'M LOUD SO NOBODY NOTICES I'M SCARED OF THE QUIET. ...DON'T TELL MIKEY."] },
      { sfx: 'rumble' }, { shake: 8 }, { rift: [320, 1.3] }, { smash: true }, { score: 'tense' },
      { cast: { eraser: ['eraser', 300, -1] } }, { emote: ['gabriel', '!'] },
      { cam3d: ['eraser', 'hero'] },
      { say: ['eraser', 'SHHHH.'] },
      { cam3d: [['eraser', 'gabriel'], 'ots'] },
      { say: ['gabriel', "WHOA! OKAY! BIG MUMMY! MR. SUPPLIER DOESN'T BACK DOWN! LET'S GOOOO!"] },
      { cam3d: ['gabriel', 'behind'] }, { wait: 40 },
      { brawl: { play: 'gabriel', vs: 'eraser', plain: true, stage: 'hallway', name: 'THE ERASER', mid: 'NO ONE WILL ASK WHERE YOU WENT.' } },
      // ---- he wins the fight. It does not matter. ----
      { act: ['eraser', 'dazed'] }, { shot: ['close', 'gabriel'] }, { act: ['gabriel', 'victory'] },
      { say: ['gabriel', "HA! THAT'S THE 305, BABY! WAIT TILL I TELL-"] },
      { score: 'lopez' }, { act: ['gabriel', 'idle'] }, { shot: ['xcu', 'gabriel'] },
      { say: ['lopez', 'GABRIEL.'] },
      { say: ['lopez', '"HONESTLY... PART OF ME GETS IT." YOU SAID THAT. AN HOUR AGO. IN THE BAND ROOM.'] },
      { recall: { bg: 'musicroom', cast: { wuttke: ['wuttke', 150, 1], gabriel: ['gabriel', 232, -1] }, shot: ['close', 'gabriel'], say: ['gabriel', 'HONESTLY... PART OF ME GETS IT.'] } },
      { shot: ['close', 'gabriel'] }, { emote: ['gabriel', 'sweat'] },
      { say: ['gabriel', "THAT WAS- I DIDN'T MEAN IT LIKE-"] },
      { say: ['lopez', 'YOU MEANT IT. IN TWELVE YEARS YOU ARE THE ONLY ONE WHO HAS UNDERSTOOD ME.'] },
      { say: ['lopez', 'I AM NOT OFFERING YOU A CAGE. I AM OFFERING YOU A ROOM THAT IS NEVER QUIET.'] },
      { shot: ['xcu', 'gabriel'] }, { score: null }, { amb: ['heartbeat'] }, { wait: 50 },
      { choice: { id: 'gabriel', who: 'gabriel', options: [
        { text: `"NO. I'LL CALL THEM. EVERY WEEK."`, set: 'call', note: 'GABRIEL WILL REMEMBER THAT.', then: [
          { say: ['gabriel', "NO. I'LL CALL THEM. EVERY WEEK. I'LL BE SO ANNOYING ABOUT IT."] },
          { say: ['lopez', 'IN FOUR THOUSAND UNIVERSES YOU SAY EXACTLY THAT. YOU CALL TWICE.'] },
          { say: ['lopez', 'I DID NOT SAY YOU HAD A CHOICE. I SAID I WAS OFFERING.'] },
        ] },
        { text: '"...NEVER QUIET?"', set: 'quiet', note: 'GABRIEL WILL REMEMBER THAT.', then: [
          { say: ['gabriel', '...NEVER QUIET?'] },
          { say: ['lopez', 'NEVER.'] },
          { shot: ['xcu', 'gabriel'] }, { wait: 60 },
          { say: ['gabriel', '...OKAY.'] },
        ] },
      ] } },
      { shot: 'wide' }, { act: ['eraser', 'special'] }, { crownify: 'gabriel' }, { shake: 10 }, { sfx: 'bell' }, { wait: 70 },
      { cam3d: ['gabriel', 'push'] }, { wait: 80 },
      { narrate: 'IT WAS THE FIRST TIME ANYONE IN THAT SCHOOL HAD SEEN HIM STAND STILL.' },
      { shot: 'wide' }, { walk: ['gabriel', 336, 60, 'async'] }, { walk: ['eraser', 360, 60] }, { riftOff: true }, { remove: 'gabriel' }, { remove: 'eraser' },
      // ---- the hole he left ----
      { dissolve: 50 }, { clear: true }, { bg: 'musicroom' }, { amb: ['room', 'bell'] }, { score: 'sad' },
      { cast: { wuttke: ['wuttke', 170, 1] } },
      { cam3d: ['wuttke', 'orbit'] },
      { narrate: 'IN THE BAND ROOM, MR. WUTTKE SET OUT TWO MUSIC STANDS. HE STOOD LOOKING AT THE SECOND ONE FOR A LONG TIME.' },
      { shot: ['close', 'wuttke'] },
      { say: ['wuttke', '...I HAD A STUDENT IN HERE. FIVE MINUTES AGO. LOUD. DREADFUL RHYTHM.'] },
      { shot: ['xcu', 'wuttke'] }, { wait: 50 },
      { say: ['wuttke', 'WHY CAN I HEAR HIM, AND NOT SEE HIS FACE?'] },
      { score: null }, { fade: ['out', 70] },
    ],
  });

  // ================================================================== DOOMSDAY (replaces the old one)
  const HEROES7 = { fernando: ['fernando', 26, 1, { z: 22 }], anthony: ['anthony', 58, 1, { z: 12 }], nicholas: ['nicholas', 90, 1, { z: -10 }], simon: ['simon', 122, 1, { z: 18 }], bandy: ['bandy', 152, 1, { z: -16 }], mikey: ['mikey', 184, 1, { z: -2 }], jauregui: ['jauregui', 218, 1, { z: 12 }] };
  const DOOMSDAY = {
    title: 'DOOMSDAY', sub: 'ACT III - WHAT WAS BEHIND THE DOOR',
    intro: [
      { insert: 'card', text: 'ACT III: DOOMSDAY', color: '#ff6060' }, { music: 'silence' }, { amb: ['drone'] }, { wait: 100 },
      { bg: 'court' }, { tint: 'rgba(40,0,70,0.45)' }, { amb: ['drone', 'bell'] }, { score: 'tense' }, { rift: [330, 2.2] },
      { cast: HEROES7 },
      { dissolve: 40 }, { cam3d: ['jauregui', 'wide'] },
      { title: ['CHAPTER 16', 'DOOMSDAY'] },
      { place: ['THE OLD GYM', 'THE DOOR HE LEFT OPEN'] },
      { cam3d: [['nicholas', 'jauregui'], 'ots'] },
      { say: ['jauregui', 'ONE MAN. ONE CHALKBOARD. I TAUGHT HIM FOR A YEAR. LET ME DO THE TALKING.'] },
      { shot: ['close', 'fernando'] },
      { say: ['fernando', "HEH. AND IF TALKING DOESN'T WORK?"] },
      { shot: ['close', 'nicholas'] },
      { say: ['nicholas', "THEN THERE'S SEVEN OF US AND ONE OF HIM. LIGHT WEIGHT."] },
      { cam3d: ['anthony', 'behind'] },
      { say: ['anthony', 'TOGETHER. LIKE ALWAYS.'] },
      { shot: 'wide' }, ...Object.keys(HEROES7).map((k, i) => ({ walk: [k, 340, 60 + i * 4, 'async'] })), { wait: 70 },
      { flash: 14 }, { shake: 14 }, { sfx: 'arcane' }, { whip: true }, { clear: true },
      // ---- it was not a gym ----
      { bg: 'throne' }, { tint: null }, { grade: 'doom' }, { amb: ['drone', 'heartbeat'] }, { score: null },
      { cast: Object.assign({}, THRONE, { fernando: ['fernando', 14, 1, { z: 20 }], anthony: ['anthony', 40, 1, { z: 10 }], nicholas: ['nicholas', 68, 1, { z: -8 }], simon: ['simon', 94, 1, { z: 18 }], bandy: ['bandy', 118, 1, { z: -18 }], mikey: ['mikey', 142, 1, { z: 0 }], jauregui: ['jauregui', 110, 1, { z: 30 }] }) },
      { cam3d: ['nicholas', 'behind'] }, { wait: 110 },
      { narrate: 'IT WAS NOT A GYM.' },
      { cast: { proctor: ['proctor', 246, -1, { z: 44 }], ringer: ['ringer', 318, -1, { z: 30 }], eraser: ['eraser', 286, -1, { z: -34 }] } }, horde(14, 214, 380, { z: 10 }),
      { sfx: 'bell' }, { smash: true }, { score: 'doom' },
      { cam3d: ['lopez', 'drop'] }, { wait: 130 },
      { narrate: 'IT WAS NOT ONE MAN.' },
      { insert: 'army', text: 'FOUR HUNDRED AND TWELVE. HE HAD COUNTED.' }, { wait: 170 },
      { cam3d: ['lopez', 'hero'] },
      { say: ['lopez', 'SEVEN. YOU BROUGHT SEVEN.'] },
      { shot: ['close', 'jauregui'] }, { tremble: ['jauregui', 70] },
      { say: ['jauregui', 'LOPEZ. ...WHAT HAVE YOU DONE?'] },
      { cam3d: ['lopez', 'face'] },
      { say: ['lopez', 'MR. JAUREGUI. YOU HAD TWELVE YEARS TO ASK ME THAT.'] },
      { say: ['lopez', 'YOU THOUGHT YOU WOULD FIND A SAD MAN AT A CHALKBOARD. YOU CAME HERE TO FORGIVE ME.'] },
      { shot: ['xcu', 'lopez'] }, { wait: 40 },
      { say: ['lopez', 'I DID NOT ASK TO BE FORGIVEN. I ASKED THEM TO STAY.'] },
      // ---- the two he has taken: they are standing right there, and nobody knows them ----
      { cast: { chris: ['chris', 224, -1, { crown: true, z: 26, name: '? ? ?' }], gabriel: ['gabriel', 188, -1, { crown: true, z: 40, name: '? ? ?' }] } },
      { cam3d: ['chris', 'push'] }, { score: 'mystery' }, { wait: 70 },
      { shot: ['close', 'mikey'] }, { emote: ['mikey', '?'] },
      { say: ['mikey', 'WHO ARE THOSE TWO?'] },
      { shot: ['close', 'simon'] },
      { say: ['simon', "...I DON'T KNOW. WHY DO I FEEL LIKE I SHOULD?"] },
      { cam3d: ['lopez', 'hero'] }, { score: 'doom' },
      { say: ['lopez', 'YOU ATE LUNCH WITH ONE OF THEM FOR THREE YEARS. THE OTHER NEVER ONCE LET YOU FINISH A SENTENCE.'] },
      { say: ['lopez', 'WHEN I KEEP SOMEONE, YOUR WORLD LETS GO OF THEM. THE NAME. THE FACE. THE CHAIR.'] },
      { shot: ['xcu', 'lopez'] },
      { say: ['lopez', 'THAT IS NOT MY CRUELTY. IT IS YOURS. IT IS WHAT YOU WERE ALWAYS GOING TO DO TO EACH OTHER.'] },
      { say: ['lopez', 'I ONLY MADE IT FASTER.'] },
      { shot: ['close', 'nicholas'] }, { emote: ['nicholas', 'anger'] },
      { say: ['nicholas', 'GIVE THEM BACK.'] },
      { cam3d: ['nicholas', 'behind'] },
      { say: ['lopez', 'COME AND TAKE THEM.'] },
      { brawl: { play: 'nicholas', vs: 'lopez', look: 'emperor', stage: 'throne', name: 'THE HEADMASTER', cpu: 'hard', survive: 22 } },
      { if: (v, st) => st.survived, then: [
        { shot: ['close', 'nicholas'] }, { emote: ['nicholas', 'sweat'] },
        { say: ['nicholas', 'I HIT HIM WITH EVERYTHING I HAVE. HE DID NOT EVEN BLINK.'] },
      ], else: [
        { act: ['nicholas', 'dazed'] }, { shot: ['close', 'nicholas'] },
        { say: ['nicholas', "...HE WASN'T EVEN TRYING."] },
      ] },
      { act: ['nicholas', 'idle'] }, { cam3d: ['lopez', 'hero'] }, { score: 'omega' },
      { say: ['lopez', 'ENOUGH. I HAVE GRADED THIS.'] },
      { shot: 'wide' }, ...each(14, (k, i) => ({ walk: [k, 176 + i * 12, 90, 'async'] })), { wait: 60 },
      { say: ['lopez', 'ONE OF YOU STAYS. THE REST MAY WALK OUT. CHOOSE QUICKLY. MY CLASS IS IMPATIENT.'] },
      { shot: ['close', 'mikey'] },
      { say: ['mikey', "NOBODY STAYS! WE DON'T LEAVE TEAMMATES!"] },
      { shot: ['medium', 'anthony'] }, { walk: ['anthony', 150, 50] },
      { say: ['anthony', 'ME.'] },
      { shot: ['close', 'nicholas'] },
      { say: ['nicholas', 'BRO. NO. NO-'] },
      // ---- the offer ----
      { cam3d: ['lopez', 'face'] }, { score: 'lopez' },
      { say: ['lopez', 'ANTHONY. IN NINE THOUSAND UNIVERSES, YOU NEVER SAT DOWN AT THAT TABLE.'] },
      { shot: ['close', 'lopez'] },
      { say: ['lopez', 'IN THOSE UNIVERSES, NICHOLAS EATS ALONE. EVERY DAY. FOR FOUR YEARS.'] },
      { shot: ['xcu', 'lopez'] },
      { say: ['lopez', 'WEAR IT, AND I WILL GO TO EVERY ONE OF THEM AND PUT SOMEONE IN THAT CHAIR. NINE THOUSAND TIMES.'] },
      { say: ['lopez', 'YOU HAVE MY WORD AS A TEACHER.'] },
      { shot: ['xcu', 'anthony'] }, { wait: 80 }, { score: 'sad' },
      { say: ['anthony', 'NICHOLAS. GET THEM OUT OF HERE.'] },
      { shot: ['close', 'nicholas'] },
      { say: ['nicholas', 'WHAT? NO. NO, WE GO TOGETHER-'] },
      { shot: ['close', 'anthony'] },
      { say: ['anthony', 'YOU NEVER ATE ALONE AGAIN. THAT WAS THE WHOLE POINT.'] },
      { recall: Object.assign({ shot: ['two', 'anthony', 'nicholas'], say: ['anthony', 'IS THIS SEAT TAKEN?'] }, TABLE) },
      // ---- you reach for him, and it is not enough ----
      { shot: 'wide' }, { score: null }, { amb: ['heartbeat'] },
      { cam3d: [['nicholas', 'anthony'], 'two'] },
      { slowmo: 220 }, { dash: ['nicholas', ['anthony', 26], 62, 'async'] },
      { qte: { type: 'mash', key: 'heavy', text: 'REACH HIM!', who: 'nicholas', len: 160, need: 16, rigged: true },
        hit: [{ shot: ['xcu', 'nicholas'] }, { wait: 30 }, { say: ['nicholas', 'I HAD HIM. I HAD HIS HAND.'] }],
        miss: [{ shot: ['xcu', 'nicholas'] }, { wait: 30 }, { say: ['nicholas', "I WASN'T FAST ENOUGH. I WASN'T FAST ENOUGH."] }] },
      { shot: 'wide' }, { crownify: 'anthony' }, { sfx: 'bell' }, { shake: 14 }, { wait: 70 },
      { shot: ['close', 'anthony'] }, { wait: 80 },
      { cam3d: ['lopez', 'hero'] }, { score: 'lopez' },
      { say: ['lopez', 'AND NOW THE PART NONE OF THEM EVER BELIEVE.'] },
      { shot: ['close', 'nicholas'] }, { tremble: ['nicholas', 140] },
      { say: ['nicholas', "BRO. BRO, LOOK AT ME. IT'S ME. IT'S-"] },
      { emote: ['nicholas', '?'] }, { wait: 70 },
      { say: ['nicholas', '...WHAT WAS I SAYING?'] },
      { shot: ['xcu', 'anthony'] }, { wait: 90 },
      { cam3d: ['lopez', 'face'] },
      { say: ['lopez', 'LET THEM WALK. BY THE PARKING LOT THEY WILL NOT KNOW WHY THEY ARE CRYING.'] },
      // ---- Fernando ----
      { shot: ['close', 'fernando'] }, { score: 'battle' },
      { say: ['fernando', 'KIDS. BEHIND ME. NOW.'] },
      { cam3d: ['lopez', 'hero'] },
      { say: ['lopez', 'NOT THE OLD ONE. HE WOULD DIE FOR A BUILDING. LET HIM.'] },
      { shot: 'wide' }, { walk: ['anthony', 214, 50, 'async'] }, { face: ['ringer', -1] }, { walk: ['ringer', 108, 70, 'async'] },
      ...['nicholas', 'simon', 'mikey', 'jauregui'].map((k, i) => ({ dash: [k, -40, 26 + i * 4, 'async'] })), { dash: ['bandy', 6, 30, 'async'] },
      { walk: ['fernando', 70, 40] },
      { cam3d: [['fernando', 'ringer'], 'two'] },
      { qte: { type: 'mash', key: 'block', text: 'HOLD THE DOOR!', who: 'fernando', len: 170, need: 22, rigged: true },
        hit: [{ act: ['fernando', 'special'] }, { impact: ['fernando', 1] }, { shake: 10 }, { sfx: 'clang' }],
        miss: [{ act: ['fernando', 'special'] }, { impact: ['fernando', 2] }, { shake: 12 }, { sfx: 'clang' }] },
      { remove: 'nicholas' }, { remove: 'simon' }, { remove: 'mikey' }, { remove: 'jauregui' },   // (they are through the door)
      { shot: ['close', 'bandy'] }, { face: ['bandy', 1] },
      { say: ['bandy', 'MR. FERNANDO! COME ON!'] },
      { shot: ['close', 'fernando'] }, { score: 'sad' },
      { say: ['fernando', 'FOUR SCHOOLS THREW ME OUT, KID.'] },
      { say: ['fernando', 'THIS ONE KEPT ME.'] },
      { shot: ['xcu', 'fernando'] },
      { say: ['fernando', "SO I'M KEEPING IT. GO. ...AND TURN IT UP."] },
      { shot: 'wide' }, { dash: ['bandy', -40, 20] }, { remove: 'bandy' }, { act: ['ringer', 'heavy'] }, { impact: ['fernando', 3] }, { shake: 16 }, { sfx: 'stomp' },
      { cam3d: ['lopez', 'hero'] }, { score: null },
      { say: ['lopez', 'CLASS DISMISSED.'] },
      { shot: 'wide' }, { slowmo: 100 }, { die: 'fernando' }, { sfx: 'heavy' }, { wait: 110 },
      { cam3d: ['fernando', 'top'] }, { wait: 110 },
      // ---- outside ----
      { whip: true }, { clear: true }, { weather: null }, { grade: null },
      { bg: 'parking' }, { amb: ['rain'] }, { weather: 'rain' }, { tint: 'rgba(10,20,40,0.45)' }, { grade: 'cold' },
      { cast: { nicholas: ['nicholas', 176, 1, { anim: 'dazed' }], bandy: ['bandy', 110, 1, { z: 16 }], mikey: ['mikey', 250, -1, { z: 14 }], simon: ['simon', 290, -1, { z: -12 }], jauregui: ['jauregui', 60, 1, { z: -12 }] } },
      { cam3d: ['nicholas', 'top'] }, { wait: 100 },
      { narrate: 'SEVEN WENT IN.' },
      { narrate: 'FIVE CAME OUT. THEY COULD ONLY NAME ONE OF THE TWO THEY HAD LOST.' },
      { shot: ['close', 'bandy'] }, { tremble: ['bandy', 120] }, { score: 'sad' },
      { say: ['bandy', 'HE SAT IN THIS PARKING LOT EVERY MORNING. NOBODY TOLD HIM TO. HE JUST WANTED TO SEE WHO SHOWED UP.'] },
      { say: ['bandy', 'HE LEFT HIS LIGHTER ON MY BOARD. ...HE SAID TURN IT UP.'] },
      { shot: ['close', 'nicholas'] }, { act: ['nicholas', 'idle'] }, { wait: 90 },
      { say: ['nicholas', "I KNOW WHY I'M CRYING. MR. FERNANDO. BUT IT'S... MORE THAN THAT. IT'S SO MUCH MORE THAN THAT."] },
      { shot: ['xcu', 'nicholas'] }, { wait: 50 },
      { say: ['nicholas', "THERE'S HALF A PROTEIN BAR IN MY POCKET. I DON'T EAT HALF OF ANYTHING."] },
      { say: ['nicholas', 'WHO WAS THE OTHER HALF FOR?'] },
      { cam3d: ['nicholas', 'pullback'] }, { emote: ['nicholas', 'tear'] }, { wait: 130 },
      { score: null }, { fade: ['out', 80] },
    ],
  };
  { const i = C.findIndex((c) => c.title === 'DOOMSDAY'); if (i >= 0) C[i] = DOOMSDAY; else C.push(DOOMSDAY); }

  // ================================================================== edits to the chapters around them
  // Sirven's chapter was called THE THRONE. There is a real throne now.
  { const c = ch('THE THRONE'); if (c) { c.title = "THE KING'S CHAIR"; for (const s of c.intro) if (s.title) s.title = ['CHAPTER 8', "THE KING'S CHAIR"]; } }

  // THE FACULTY MEETING: they work out a name, and think that is the whole of it. Ms. Brady counts.
  { const s = ch('THE FACULTY MEETING').intro;
    after(s, 'ONE JUNE, HIS FIRST CLASS GRADUATED', [
      { shot: ['close', 'sirven'] },
      { say: ['sirven', 'ONE MAN, THEN. IN ONE GYM. WE WILL GO AND TALK TO HIM.'] },
      { shot: ['close', 'brady'] }, { emote: ['brady', '?'] }, { score: 'mystery' },
      { say: ['brady', 'SIR. THE ATTENDANCE SHEET. THERE ARE THIRTY NAMES ON THE SENIOR ROLL.'] },
      { say: ['brady', 'I COUNT TWENTY-NINE STUDENTS. I HAVE COUNTED FOUR TIMES. I DO NOT MISCOUNT.'] },
      { shot: ['close', 'sirven'] },
      { say: ['sirven', 'A CLERICAL ERROR, MS. BRADY.'] },
      { shot: ['xcu', 'brady'] }, { wait: 40 },
      { say: ['brady', '...I DO NOT MAKE THOSE EITHER.'] },
      { narrate: 'THE THIRTIETH NAME WAS ON THE PAGE. NEITHER OF THEM COULD READ IT.' },
    ]); }

  K.firstClass(ch('THE STUDENT TEACHER').intro); K.firstClass(ch('EVERY UNIVERSE').intro);

  // EVERY UNIVERSE: he says it from the throne now, and he is no longer asking.
  { const s = ch('EVERY UNIVERSE').intro;
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i].bg === 'court') s[i] = { bg: 'throne' };
      else if (s[i].cast && s[i].cast.lopez) s[i] = { cast: Object.assign({}, THRONE, THREE) };
      else if (s[i].rift || (s[i].tint && /40,0,70/.test(s[i].tint))) s.splice(i, 1);
      else if (s[i].place) s[i] = { place: ['THE THRONE BETWEEN', 'MEANWHILE'] };
    }
    after(s, 'THEY KNOW MY NAME NOW', [{ say: ['lopez', 'THEY THINK KNOWING A NAME IS THE SAME AS KNOWING WHAT I AM.'] }]);
    swap(s, 'AND IF THEY WILL NOT STAY', [
      { say: ['lopez', 'AND IF THEY WILL NOT STAY, I KEEP THEM. I HAVE KEPT FOUR HUNDRED AND TWELVE SO FAR.'] },
      { shot: ['xcu', 'lopez'] },
      { say: ['lopez', 'NOT ONE OF THEM HAS COMPLAINED. NOT ONE OF THEM CAN.'] },
    ]); }

  // THE BELL TOWER: what the bell does when it is rung the other way.
  { const s = ch('THE BELL TOWER').intro;
    after(s, 'WHAT IS TO COME IS OURS TO WRITE', [
      { shot: ['close', 'wuttke'] }, { emote: ['wuttke', '?'] },
      { say: ['wuttke', 'THE ROPE. IT IS WOUND THE WRONG WAY ROUND. SOMEONE HAS BEEN RINGING THIS BELL BACKWARD.'] },
      { shot: ['close', 'dabalsa'] },
      { say: ['dabalsa', 'RUNG FORWARD, IT SENDS A CLASS OUT INTO THE WORLD. RUNG BACKWARD...'] },
      { shot: ['close', 'ruano'] },
      { say: ['ruano', '...IT CALLS ONE BACK.'] },
      { shot: ['close', 'dabalsa'] },
      { say: ['dabalsa', 'REMEMBER THAT, MY FRIENDS. I HAVE A FEELING WE SHALL WANT IT.'] },
    ]); }

  // FOLDED becomes INSIDE THE CROWN: the same lonely cafeteria, but now it is what the crown shows him.
  { const c = ch('FOLDED'); c.title = 'INSIDE THE CROWN'; c.sub = 'WHAT IT SHOWS THEM'; const s = c.intro;
    for (const st of s) { if (st.title) st.title = ['CHAPTER 17', 'INSIDE THE CROWN']; if (st.insert === 'card') st.text = 'INSIDE THE CROWN.'; if (st.cast && st.cast.omega) st.cast.omega = ['lopez', 60, 1, { emperor: true, z: -10 }]; }
    K.before(s, 'ANTHONY WOKE UP IN A CAFETERIA', [{ narrate: 'THE CROWN DOES NOT HURT. IT SHOWS YOU A WORLD WHERE THE THING YOU FEARED HAS ALREADY HAPPENED, AND LETS YOU LIVE THERE.' }]);
    // the others who wear one: Gabriel (kept) and Chris (new), not Bandy and Simon
    const i = s.findIndex((x) => x.bg === 'skatepark'), j = at(s, 'SIMON: EIGHT LAPS');
    if (i > 0 && j > i) s.splice(i - 2, j - i + 3,
      { whip: true }, { clear: true }, { bg: 'office' }, { tint: 'rgba(60,0,90,0.4)' },
      { cast: { chris: ['chris', 192, 1] } },
      { cam3d: ['chris', 'pullback'] },
      { narrate: 'CHRIS: A TABLE FOR ONE. HE OWNS THE BUILDING IT IS IN.' },
      { say: ['chris', 'I KNOW A GUY. I KNOW A GUY. I KNOW A... I KNOW A...'] });
    else console.warn('story-8: INSIDE THE CROWN: could not find the old vignettes');
    swap(s, 'YOU SEE IT NOW, ANTHONY', [{ say: ['omega', 'YOU SEE IT NOW, ANTHONY. THIS IS WHAT THEY ARE WITHOUT ME. ALONE. EVERY ONE OF THEM. I AM KEEPING YOU FROM THIS.'] }]); }

  // THE LAST ONE OUT: Nicholas does not know who he is missing. Mr. Urbanik works out that someone is.
  { const s = ch('THE LAST ONE OUT').intro;
    cut(s, 'TWO THOUSAND BARS. HE WROTE EVERY LABEL', 'SO GO GET HIM.', [
      { say: ['nicholas', "TWO THOUSAND BARS. SOMEBODY WROTE EVERY LABEL BY HAND. IT WASN'T ME. MY HANDWRITING IS TERRIBLE."] },
      { shot: ['xcu', 'nicholas'] }, { wait: 50 },
      { say: ['nicholas', 'WHO STARTS A PROTEIN BAR COMPANY BY HIMSELF AND CALLS IT "BRO BATCH"?'] },
      { cast: { bandy: ['bandy', 420, -1] } }, { shot: 'wide' }, { walk: ['bandy', 232, 60] },
      { cam3d: [['nicholas', 'bandy'], 'two'] },
      { say: ['bandy', 'THIS SEAT TAKEN?'] },
      { shot: ['close', 'nicholas'] }, { wait: 60 },
      { say: ['nicholas', '...NOBODY EVER SITS HERE.'] },
      { shot: ['xcu', 'nicholas'] }, { tremble: ['nicholas', 90] },
      { say: ['nicholas', "WHY DID THAT HURT? I'VE SAID THAT BEFORE. TO SOMEBODY. I CAN'T-"] },
      { cam3d: [['nicholas', 'bandy'], 'two'] },
      { say: ['bandy', "I KEEP DOING IT TOO. I SAVED TWO SPOTS AT THE RAIL THIS MORNING. THERE'S ONLY ONE OF ME."] },
      { say: ['bandy', "MR. FERNANDO I REMEMBER. THAT'S THE ONE THAT'S KILLING ME. BUT THERE'S SOMETHING BEHIND IT. LIKE A ROOM WITH THE DOOR SHUT."] },
      { cast: { urbanik: ['urbanik', -40, 1] } }, { shot: 'wide' }, { walk: ['urbanik', 90, 70] },
      { cam3d: ['urbanik', 'hero'] }, { score: 'mystery' },
      { say: ['urbanik', 'NINE CHAIRS AT YOUR LUNCH TABLE. SEVEN OF YOU. YOU HAVE ALL BEEN WALKING AROUND TWO EMPTY CHAIRS FOR DAYS WITHOUT ONCE LOOKING AT THEM.'] },
      { say: ['urbanik', 'THAT IS NOT GRIEF. GRIEF LOOKS AT THE CHAIR. THIS IS A HOLE. SOMEONE HAS CUT PEOPLE OUT OF YOU.'] },
      { shot: ['close', 'nicholas'] },
      { say: ['nicholas', 'THEN HOW DO I GET THEM BACK IF I DON\'T KNOW WHO THEY ARE?'] },
      { cam3d: ['urbanik', 'face'] },
      { say: ['urbanik', 'A MEMORY IS NOT A FILE, NICHOLAS. IT IS A HABIT. YOUR HANDS STILL BREAK THE BAR IN HALF. YOUR MOUTH STILL SAYS THE LINE.'] },
      { say: ['urbanik', 'HE TOOK THE NAME. HE COULD NOT TAKE THE HABIT. FOLLOW THE HABIT BACK TO WHERE IT STARTED.'] },
      { shot: ['close', 'bandy'] },
      { say: ['bandy', 'BACK? LIKE... BACK IN TIME, BACK?'] },
      { shot: ['xcu', 'urbanik'] }, { score: 'hope' },
      { say: ['urbanik', 'I AM A PSYCHOLOGY TEACHER. ASK THE ONES IN THE BELL TOWER. I ONLY KNOW THAT YOU ARE CRYING FOR SOMEONE, AND THAT HE IS STILL THERE TO BE CRIED FOR.'] },
    ]);
    for (const st of s) if (st.cast && st.cast.fernando && st.cast.wuttke) delete st.cast.fernando;
    swap(s, 'THE STABILIZER CAN HOLD THE RIFT OPEN', [{ say: ['escobedo', 'THE STABILIZER CAN HOLD THE DOOR TO HIS THRONE OPEN. LONG ENOUGH TO BRING BACK WHOEVER HE HAS TAKEN.'] }]); }

  // THE NIGHT BEFORE: Mr. Jauregui has more than a letter to carry now.
  { const s = ch('THE NIGHT BEFORE').intro;
    for (const st of s) if (st.if && st.then) for (const b of [st.then, st.else || []]) for (const x of b) {
      if (x.say && x.say[0] === 'jauregui' && /CARRY THIS INTO THE RIFT/.test(x.say[1])) x.say[1] = x.say[1].replace('SOMEONE CARRY THIS INTO THE RIFT FOR ME.', 'THE LETTER IS MINE. THE CARD IS THEIRS. I WILL CARRY BOTH TO HIM MYSELF.');
    } }
})();
