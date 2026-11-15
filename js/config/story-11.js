// STORY MODE, part 11: THE TONE PASS. Nothing in the plot changes here. This file goes back over the
// moments where something cruel happens and makes the scene treat it that way:
//   - the visitors from other universes used to walk in on action music with a joke. Each one now arrives in
//     silence, with the picture pulling apart and the RIFT theme (the bell melody with the wrong note in it),
//     and says one thing that is not a joke. The hero's comeback is still there: it lands as nerve now.
//   - every time the Headmaster keeps someone (Chris, Gabriel, Anthony, the first boy, the whole field in
//     the last chapter) the colour drains out and TAKEN plays: "is this seat taken?" in the minor, on a
//     music box that stops one note early.
//   - the Keeper's chime stays polite until he shows what sealing is. Then it is DREAD: a heartbeat.
//   - two jokes that cut straight in after something terrible now happen in silence, or are gone from the
//     soundtrack (the King's Chair, the trial).
// The three themes are in js/scenes/story-score.js. Helpers: RF.STORY.kit (story-8.js).
(function () {
  const K = RF.STORY.kit, { ch, at, lists } = K;
  const miss = (what, title) => console.warn('story-11: could not find ' + what + ' in "' + title + '"');
  // every place in a chapter where a line is said (branches too)
  const places = (title, text) => {
    const c = ch(title), r = [];
    if (c) for (const part of [c.intro, c.outro]) for (const l of lists(part || [])) { const i = at(l, text); if (i >= 0) r.push([l, i]); }
    if (!r.length) miss('the line "' + text + '"', title);
    return r;
  };
  const before = (title, text, add) => places(title, text).forEach(([l, i]) => l.splice(i, 0, ...add()));
  const after = (title, text, add) => places(title, text).forEach(([l, i]) => l.splice(i + 1, 0, ...add()));
  // the music that is playing when a line is said: the nearest { score } before it becomes `name`
  const recue = (title, text, name) => places(title, text).forEach(([l, i]) => {
    for (let j = i - 1; j >= Math.max(0, i - 14); j--) if ('score' in l[j]) { l[j].score = name; return; }
    miss('a music cue before "' + text + '"', title);
  });
  // before the first step that matches (for steps that are not lines: a picture, a change of room)
  const beforeStep = (title, test, add) => {
    const c = ch(title); let done = false;
    if (c) for (const part of [c.intro, c.outro]) for (const l of lists(part || [])) { const i = l.findIndex(test); if (i >= 0) { l.splice(i, 0, ...add()); done = true; } }
    if (!done) miss('a step', title);
  };
  const atEnd = (title, part, add) => { const c = ch(title); if (c && c[part]) c[part].push(...add()); else miss(part, title); };

  // the picture when something from outside is in the room: colours split, a violet cast
  const WRONG = () => [{ aberration: 2 }, { tint: 'rgba(40,0,70,0.35)' }];
  const RIGHT = () => [{ aberration: 0 }, { tint: null }];

  // ================================================================== the visitors
  // BRO BATCH: the other Chris
  recue('BRO BATCH', 'NICE LITTLE PROTEIN BAR COMPANY', 'rift');
  before('BRO BATCH', 'NICE LITTLE PROTEIN BAR COMPANY', WRONG);
  after('BRO BATCH', 'MY DAD BOUGHT THAT TOO.', () => [
    { wait: 30 }, { say: ['rc', 'I OWN EVERYTHING I EVER WANTED. I EAT LUNCH IN A ROOM WITH FORTY CHAIRS IN IT.'] },
    { shot: ['close', 'nicholas'] }, { wait: 40 }, ...RIGHT(),
  ]);

  // LOCKDOWN: the other Bandy
  recue('LOCKDOWN', 'MORNING, MISS. IN MY UNIVERSE', 'rift');
  before('LOCKDOWN', 'MORNING, MISS. IN MY UNIVERSE', WRONG);
  after('LOCKDOWN', 'MORNING, MISS. IN MY UNIVERSE', () => [
    { shot: ['close', 'rb'] }, { wait: 24 },
    { say: ['rb', 'NOBODY EVER TOLD ME TO STOP, MISS. NOT ONE TIME. GUESS HOW THAT WENT.'] }, { wait: 30 },
  ]);
  after('LOCKDOWN', 'IN MY UNIVERSE, THERE IS DETENTION.', () => [...RIGHT(), { score: 'chase' }]);
  // (the quick-time event that ends him is one word: STOP. It is the first time anyone has said it to him.)
  beforeStep('LOCKDOWN', (s) => s.shatter === 'rb', () => [{ score: null }, { shot: ['close', 'rb'] }, { wait: 20 }, { say: ['rb', "...HUH. SO THAT'S WHAT IT SOUNDS LIKE."] }, { wait: 40 }, { shot: 'wide' }]);

  // STREET LEVEL: the other Fernando (he keeps his jokes; the room stops laughing with him)
  recue('STREET LEVEL', 'HEH HEH. HI.', 'rift');
  before('STREET LEVEL', 'HEH HEH. HI.', () => [{ tint: 'rgba(40,0,70,0.3)' }]);   // (a long scene: the cast only, so the words stay easy to read)
  beforeStep('STREET LEVEL', (s) => s.score === 'rock', RIGHT);

  // GAME DAY: the other Mikey
  recue('GAME DAY', 'IN MY UNIVERSE... I NEVER GOT THE SCHOLARSHIP', 'rift');
  before('GAME DAY', 'IN MY UNIVERSE... I NEVER GOT THE SCHOLARSHIP', WRONG);
  after('GAME DAY', 'IN MY UNIVERSE... I NEVER GOT THE SCHOLARSHIP', () => [
    { shot: ['close', 'simon'] }, { emote: ['simon', '...'] }, { wait: 50 },
    { say: ['simon', '...HE IS NOT JOKING.'] }, { wait: 20 }, ...RIGHT(), { score: 'chase' },
  ]);
  beforeStep('GAME DAY', (s) => s.shatter === 'rm', () => [{ score: null }, { shot: ['close', 'rm'] }, { wait: 20 }, { say: ['rm', 'THEY ALL LEFT... I STAYED ON THE FIELD... NOBODY CAME BACK FOR ME...'] }, { wait: 40 }, { shot: 'wide' }]);

  // THE KING'S CHAIR: the other Tamayo, and what the joke afterwards is covering for
  before("THE KING'S CHAIR", 'HA HA HA! NICE CROWN', () => [{ score: 'rift' }, ...WRONG()]);
  after("THE KING'S CHAIR", 'HA HA HA! NICE CROWN', () => [
    { wait: 20 }, { say: ['rt', 'FIRST THING I DID WAS TAKE DOWN THE CLASS PHOTOS. THIRTY-ONE YEARS OF THEM. THE WALL LOOKS MUCH CLEANER.'] },
    { shot: ['xcu', 'sirven'] }, { wait: 50 },
  ]);
  after("THE KING'S CHAIR", 'NO, MS. BRADY. THIS ONE SAT IN MY CHAIR', RIGHT);
  atEnd("THE KING'S CHAIR", 'intro', RIGHT);
  recue("THE KING'S CHAIR", 'FOR THE RECORD: I WOULD MAKE A GREAT PRINCIPAL.', null);   // (it was a comedy sting, straight after "they cheered when you left")
  before("THE KING'S CHAIR", 'FOR THE RECORD: I WOULD MAKE A GREAT PRINCIPAL.', () => [{ wait: 50 }]);

  // THE BELL TOWER: the angel who stopped
  recue('THE BELL TOWER', 'IN MY UNIVERSE, THE ANGEL STOPPED FORGIVING.', 'rift');
  before('THE BELL TOWER', 'IN MY UNIVERSE, THE ANGEL STOPPED FORGIVING.', WRONG);
  after('THE BELL TOWER', 'IN MY UNIVERSE, THE ANGEL STOPPED FORGIVING.', () => [
    { wait: 24 }, { say: ['rr', 'DO YOU KNOW HOW QUIET A SCHOOL IS, WHEN NOBODY IN IT HAS BEEN FORGIVEN FOR ANYTHING?'] }, { wait: 30 },
  ]);
  after('THE BELL TOWER', 'THEN YOU ARE NOT AN ANGEL.', () => [...RIGHT(), { score: 'battle' }]);

  // THE CLIMB: the Landa who stopped pretending
  recue('THE CLIMB', 'A SPECIMEN THAT CLIMBS', 'rift');
  before('THE CLIMB', 'A SPECIMEN THAT CLIMBS', WRONG);
  atEnd('THE CLIMB', 'intro', RIGHT);

  // ================================================================== kept
  // THE HEADMASTER: Chris walks to the table
  recue('THE HEADMASTER', 'CHRISTOPHER. YOU ARE NOT IN CLASS.', 'dread');
  before('THE HEADMASTER', '...IS THERE A SEAT FOR ME?', () => [{ score: 'taken' }, { grade: 'noir' }, { wait: 40 }]);
  after('THE HEADMASTER', 'THAT IS WHAT HE DOES.', () => [{ wait: 60 }, { grade: null }]);

  // THE COLLECTION: Gabriel stands still
  recue('THE COLLECTION', 'SHHHH.', 'dread');
  before('THE COLLECTION', 'IT WAS THE FIRST TIME ANYONE IN THAT SCHOOL', () => [{ score: 'taken' }, { grade: 'noir' }]);
  beforeStep('THE COLLECTION', (s) => s.bg === 'musicroom', () => [{ grade: null }]);

  // DOOMSDAY: Anthony, and the part none of them ever believe
  before('DOOMSDAY', "BRO. BRO, LOOK AT ME. IT'S ME.", () => [{ score: 'taken' }]);

  // THE WAITING ROOM: the first one
  before('THE WAITING ROOM', 'YOU NEVER SPOKE IN MY CLASS.', () => [{ score: 'taken' }]);

  // THE LAST BELL: attendance, backward
  recue('THE LAST BELL', 'HE DID NOT STRIKE THEM.', 'taken');

  // RUNG BACKWARD: the Proctor comes for a fourteen-year-old
  recue('RUNG BACKWARD', 'MISS BRADY. AGE FOURTEEN.', 'dread');

  // THE NEW KID: they come for the one who is grieving
  recue('THE NEW KID', 'THEY HAD COME FOR THE BOY WHO WAS GRIEVING.', 'dread');

  // ================================================================== sealed
  // INCIDENT REPORT: what he does with a room that leaks
  beforeStep('INCIDENT REPORT', (s) => s.insert === 'monitors' && /^THIS IS WHAT I DO/.test(s.text || ''), () => [{ score: 'dread' }]);
  // CODE RED: and now he does it to them
  after('CODE RED', 'SO I AM SEALING TERRAMANIA.', () => [{ score: 'dread' }]);
  beforeStep('CODE RED', (s) => s.insert === 'sealmap' && /THE CAFETERIA/.test(s.text || ''), () => [{ score: 'dread' }]);

  // ================================================================== the trial keeps its stakes
  // (Dr. Astuto's first burst of joy keeps its music. The toaster and the gallery are still funny: the
  // procession simply does not stop for them.)
  recue('THE VERDICT', 'EL ESCOBEDO, ENGINEERING!', 'court');
  recue('THE VERDICT', 'BOOOO! SEAL THIS, KEEPER!', 'court');
})();
