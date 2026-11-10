// STORY MODE: "THE LAST BELL" - the screenplay, part 6 of 6 (chapters 22-23): twenty years on,
// the credits, and a different scene after the credits for each ending.
// Step reference and the list of choices: the top of story.js.
(function () {
  const C = RF.STORY.chapters, when = RF.STORY.when, ending = RF.STORY.ending;

  // ---- what twenty years did, depending on who held the door ----
  const KING = [
    { cam3d: ['sirven', 'hero'] }, { score: 'sirven' },
    { say: ['sirven', 'THIS IS YOUR PRINCIPAL... FORGIVE ME. FORCE OF HABIT.'] },
    { shot: ['close', 'sirven'] },
    { say: ['sirven', 'I AM SEVENTY-FIVE YEARS OLD. I HAVE FORGOTTEN A GREAT MANY LESSON PLANS. I REMEMBER EVERY ONE OF YOUR NAMES.'] },
  ];
  const Y_LOPEZ = [
    ...KING,
    { shot: ['close', 'brady'] }, { wait: 50 },
    { say: ['brady', 'HE STILL WALKS THE HALLS EVERY MORNING. HE STILL CHECKS THE DOORS.'] },
  ];
  const Y_SIRVEN = [
    { insert: 'plaque', lines: ['KING SIRVEN', 'TEACHER AND PRINCIPAL. 1994 - 2025.', '', 'A PRINCIPAL IS ALWAYS', 'THE LAST ONE OUT OF THE BUILDING.', '', 'HAVE A GOOD DAY.'] }, { score: 'requiem' }, { wait: 150 },
    { say: ['brady', 'I READ THE MORNING ANNOUNCEMENTS UNDER THIS PLAQUE. EVERY DAY. I STILL END THEM HIS WAY.'] },
    { cam3d: ['lopez', 'push'] }, { score: 'memory' },
    { say: ['lopez', 'TWENTY GRADUATING CLASSES. EVERY ONE OF THEM WALKED OUT THOSE DOORS. I WAVED AT EVERY ONE.'] },
    { shot: ['close', 'lopez'] },
    { say: ['lopez', 'SOME OF THEM CAME BACK. I STOPPED COUNTING WHICH. THAT WAS THE DETENTION. IT WORKED, SIR.'] },
  ];
  const Y_HERO = [
    ...KING,
    { cam3d: ['lopez', 'push'] }, { score: 'memory' },
    { say: ['lopez', 'TWENTY GRADUATING CLASSES. EVERY ONE OF THEM WALKED OUT THOSE DOORS. I HELD THE DOOR FOR EVERY ONE.'] },
    { shot: ['close', 'lopez'] },
    { say: ['lopez', 'SOMEONE TAUGHT ME HOW.'] },
    { shot: ['close', '$hero'] }, { emote: ['$hero', 'heart'] },
    { say: ['$hero', 'I HELD A DOOR ONCE. THEY HAVE HELD EVERY ONE FOR ME SINCE.'] },
  ];

  // 22 ----------------------------------------------------------------- TWENTY YEARS LATER
  C.push({
    title: 'TWENTY YEARS LATER', sub: 'THE NEXT GENERATION',
    intro: [
      { insert: 'card', text: 'TWENTY YEARS LATER.' }, { music: 'silence' }, { amb: ['birds', 'crowd'] }, { wait: 110 },
      { bg: 'hallway' }, { score: 'hope' }, { rays: true },
      { if: ending('hero'), then: [{ cast: { '$hero': ['$hero', 128, 1, { z: 40 }] } }] },
      { cast: {
        brady: ['brady', 192, 1, { name: 'PRINCIPAL BRADY' }],
        nicholas: ['nicholas', 60, 1, { z: -20 }], anthony: ['anthony', 95, 1, { z: 12 }], mikey: ['mikey', 258, -1, { name: 'COACH MIKEY', z: -16 }],
        bandy: ['bandy', 292, -1, { z: 16 }], gabriel: ['gabriel', 325, -1, { z: -8 }], simon: ['simon', 355, -1, { z: 22 }],
      } },
      { if: ending('sirven'), else: [{ cast: { sirven: ['sirven', 156, 1, { name: 'KING SIRVEN, RETIRED', z: 10 }] } }] },
      { if: ending('lopez'), else: [{ cast: { lopez: ['lopez', 226, -1, { name: 'MR. LOPEZ TUERO, ROOM 314', z: 32 }] } }] },
      { dissolve: 50 }, { cam3d: ['brady', 'flyin'] },
      { title: ['CHAPTER 22', 'TWENTY YEARS LATER'] },
      { narrate: 'THE SAME HALLWAY. NEW LOCKERS. THE SAME BELL. THEY ALL CAME BACK.' },
      { shot: ['close', 'gabriel'] },
      { say: ['gabriel', "I TOLD YOU I'D CALL EVERY WEEK! ONE THOUSAND AND FORTY WEEKS! I NEVER MISSED ONE! LET'S GOOOO!"] },
      { shot: ['close', 'bandy'] },
      { say: ['bandy', "THE LAST BELL PLAYED FORTY COUNTRIES. MR. WUTTKE CAME TO EVERY SHOW IN THIS STATE. HE STILL SAYS WE'RE FLAT."] },
      { shot: ['close', 'mikey'] },
      { say: ['mikey', 'I WENT THREE STATES AWAY. THEN I CAME HOME. SOMEBODY HAD TO COACH THESE KIDS.'] },
      { cam3d: [['nicholas', 'anthony'], 'two'] }, { score: 'bro' },
      { say: ['nicholas', 'BRO BATCH IS IN FOUR THOUSAND SCHOOLS, BRO. EVERY CAFETERIA. FREE FOR ANY KID EATING ALONE.'] },
      { say: ['anthony', 'IT WAS NEVER ABOUT THE BARS.'] },
      { if: ending('hero'), then: Y_HERO, else: [{ if: ending('sirven'), then: Y_SIRVEN, else: Y_LOPEZ }] },
      // ---- the corner table, one more time ----
      { dissolve: 50 }, { clear: true }, { rays: false }, { bg: 'cafeteria' }, { amb: ['crowd'] }, { score: 'seat' },
      { cast: { newkid: ['alejandro', 250, -1, { name: 'A NEW KID', scale: 0.8, z: 20 }], junior: ['nicholas', -40, 1, { name: "NICHOLAS'S KID", scale: 0.8 }] } },
      { cam3d: ['newkid', 'flyin'] }, { spot: 'newkid' },
      { narrate: 'LUNCH. THE CORNER TABLE. ONE TRAY. ONE CHAIR PULLED OUT.' }, { wait: 90 },
      { spot: null }, { cam3d: ['newkid', 'still'] }, { walk: ['junior', 200, 90] },
      { cam3d: [['junior', 'newkid'], 'two'] },
      { say: ['junior', 'IS THIS SEAT TAKEN?'] },
      { shot: ['close', 'newkid'] }, { wait: 60 },
      { say: ['newkid', '...NOBODY EVER SITS HERE.'] },
      { shot: ['close', 'junior'] },
      { say: ['junior', "THEN IT'S MINE. WANT HALF A PROTEIN BAR? MY DAD MAKES THEM. THEY USED TO BE TERRIBLE."] },
      { cast: { nicholas: ['nicholas', 30, 1, { z: 60 }], anthony: ['anthony', 62, 1, { z: 70 }] } },
      { shot: ['close', 'nicholas'] }, { emote: ['nicholas', 'tear'] }, { wait: 80 },
      { cam3d: [['nicholas', 'anthony'], 'two'] }, { score: 'bro' },
      { if: when('table', 'somebody'), then: [
        { say: ['anthony', '"AS LONG AS SOMEBODY DOES." YOU SAID THAT. AT THIS TABLE.'] },
        { say: ['nicholas', 'I SAID THAT. ...AND SOMEBODY DID, BRO.'] },
      ], else: [
        { say: ['anthony', 'YOU TOLD ME ONCE IT WOULD NOT BE THE SAME.'] },
        { say: ['nicholas', "IT'S NOT, BRO. IT'S THEIRS. THAT'S BETTER."] },
      ] },
      { say: ['anthony', 'YOU NEVER TOLD HIM TO DO THAT.'] },
      { say: ['nicholas', 'NO, BRO. NOBODY HAS TO TELL THEM.'] },
      { cam3d: ['junior', 'pullback'] }, { wait: 150 },
      { score: null }, { fade: ['out', 60] },
    ],
  });

  // ---- the last scene, and what plays after the credits, for each ending ----
  const HANDOVER = [ // the walkie-talkie changes hands
    { say: ['brady', "THIS WAS PRINCIPAL ORTEGA'S. THEN KING SIRVEN'S. THEN MINE. NOW IT IS YOURS."] },
    { shot: ['xcu', 'mikey'] }, { wait: 60 },
    { say: ['mikey', "MA'AM. I EAT FOUR TRAYS AT LUNCH. I CAN'T BE A PRINCIPAL."] },
  ];
  const ROOM_314 = [ // Lopez, teaching again
    { dissolve: 50 }, { clear: true }, { bg: 'office' }, { amb: ['room', 'clock'] }, { score: 'memory' }, { rays: true },
    { cast: {
      lopez: ['lopez', 150, 1, { name: 'MR. LOPEZ TUERO' }], c1: ['chris', 230, -1, { ghost: true, z: 10 }], c2: ['tyler', 265, -1, { ghost: true, z: -14 }], c3: ['simon', 300, -1, { ghost: true, z: 18 }],
      jauregui: ['jauregui', 350, -1, { name: 'MR. JAUREGUI, RETIRED', z: 30 }],
    } },
    { cam3d: ['lopez', 'flyin'] },
    { place: ['ROOM 314', 'THE LAST DAY OF SCHOOL'] },
    { say: ['lopez', 'PENCILS DOWN. THAT IS THE YEAR.'] },
    { shot: ['close', 'lopez'] },
    { say: ['lopez', 'IN A MOMENT YOU WILL WALK OUT THAT DOOR. SOME OF YOU WILL NOT COME BACK. THAT IS ALLOWED.'] },
    { say: ['lopez', 'I AM PROUD OF YOU. I AM SAYING IT NOW, SO THAT NOBODY HAS TO WAIT TWELVE YEARS TO HEAR IT.'] },
    { shot: ['close', 'jauregui'] }, { emote: ['jauregui', 'heart'] }, { wait: 60 },
  ];
  const DISMISSED = [
    { cam3d: ['lopez', 'pullback'] }, { sfx: 'bell' },
    { say: ['lopez', 'CLASS DISMISSED.'] },
    { score: null },
  ];

  const LAST_LOPEZ = [
    ...HANDOVER,
    { cam3d: ['sirven', 'hero'] },
    { say: ['sirven', 'I WORE A CROWN TO WORK FOR THIRTY-ONE YEARS, YOUNG MAN. THE BAR IS LOWER THAN YOU THINK.'] },
    { shot: ['close', 'sirven'] },
    { say: ['sirven', 'ONE RULE. A PRINCIPAL IS ALWAYS THE LAST ONE OUT OF THE BUILDING.'] },
    { shot: ['close', 'mikey'] },
    { say: ['mikey', 'YES, SIR. LAST ONE OUT.'] },
    { dissolve: 50 }, { insert: 'bellin', text: 'CLASS OF 2046' }, { sfx: 'bell' }, { score: 'hope' }, { wait: 120 },
    { narrate: 'THAT AFTERNOON A NEW CLASS SIGNED THE INSIDE OF THE BELL. THE CLASS OF 2016 WAS THERE AGAIN TOO. EVERY NAME.' },
    { dissolve: 50 }, { clear: true }, { bg: 'court' }, { tint: 'rgba(60,0,100,0.35)' }, { amb: ['room'] }, { score: 'memory' },
    { cast: { lopez: ['lopez', 192, 1] } }, { rift: [300, 0.5] },
    { cam3d: ['lopez', 'flyin'] },
    { narrate: 'AND IN ANOTHER UNIVERSE, A LETTER FINALLY ARRIVED. TWENTY YEARS LATE. IT HAD A LONG WAY TO TRAVEL.' },
    { insert: 'letter', lines: ['LOPEZ.', '', 'IT WAS PERFECT. I NEVER TOLD YOU.', '', 'I AM PROUD OF YOU. COME HOME.', '                              - J.'] }, { wait: 240 },
    { shot: ['xcu', 'lopez'] }, { wait: 60 },
    { shot: ['close', 'lopez'] }, { emote: ['lopez', 'tear'] }, { wait: 70 },
    { say: ['lopez', '...I SHOWED MY WORK, SIR.'] },
    { wait: 40 },
    { say: ['lopez', 'CLASS DISMISSED.'] },
    { score: null }, { riftOff: true },
  ];
  const LAST_SIRVEN = [
    ...HANDOVER,
    { shot: ['close', 'brady'] },
    { say: ['brady', 'HE WORE A CROWN TO WORK FOR THIRTY-ONE YEARS, COACH. THE BAR IS LOWER THAN YOU THINK.'] },
    { say: ['brady', 'ONE RULE. A PRINCIPAL IS ALWAYS THE LAST ONE OUT OF THE BUILDING.'] },
    { shot: ['close', 'mikey'] },
    { say: ['mikey', "YES, MA'AM. LAST ONE OUT."] },
    { insert: 'radio' }, { sfx: 'pa' }, { score: null }, { amb: ['room'] }, { wait: 90 },
    { say: ['sirven', '...IT STILL WORKS, COACH. SOMEONE IS ALWAYS LISTENING.', { radio: true }] },
    { shot: ['close', 'brady'] }, { emote: ['brady', 'tear'] }, { wait: 90 },
    { say: ['brady', '...HAVE A GOOD DAY, SIR.'] },
    { dissolve: 50 }, { insert: 'bellin', text: 'CLASS OF 2046' }, { sfx: 'bell' }, { score: 'hope' }, { wait: 120 },
    { narrate: 'THAT AFTERNOON A NEW CLASS SIGNED THE INSIDE OF THE BELL. THE CLASS OF 2016 WAS THERE AGAIN TOO. EVERY NAME.' },
    ...ROOM_314,
    ...DISMISSED,
  ];
  const LAST_HERO = [
    ...HANDOVER,
    { cam3d: ['sirven', 'hero'] },
    { say: ['sirven', 'I WORE A CROWN TO WORK FOR THIRTY-ONE YEARS, YOUNG MAN. THE BAR IS LOWER THAN YOU THINK.'] },
    { shot: ['close', 'sirven'] },
    { say: ['sirven', 'ONE RULE. A PRINCIPAL IS ALWAYS THE LAST ONE OUT OF THE BUILDING.'] },
    { shot: ['close', 'mikey'] },
    { say: ['mikey', 'YES, SIR. LAST ONE OUT.'] },
    { dissolve: 50 }, { insert: 'bellin', text: 'CLASS OF 2046' }, { sfx: 'bell' }, { score: 'hope' }, { wait: 120 },
    { narrate: 'THAT AFTERNOON A NEW CLASS SIGNED THE INSIDE OF THE BELL. THE CLASS OF 2016 WAS THERE AGAIN TOO. EVERY NAME.' },
    ...ROOM_314,
    { insert: 'radio' }, { sfx: 'pa' }, { wait: 50 },
    { say: ['sirven', 'THIS IS YOUR FORMER PRINCIPAL SPEAKING. MR. TUERO. THE DOOR IS OPEN. IT ALWAYS WAS. HAVE A GOOD DAY.', { radio: true }] },
    ...DISMISSED,
  ];

  // after the credits
  const POST_LOPEZ = [ // he is teaching again, somewhere
    { clear: true }, { rays: false }, { grade: null }, { spot: null }, { bg: 'court' }, { tint: 'rgba(60,0,100,0.4)' }, { music: 'silence' }, { amb: ['room'] },
    { cast: { lopez: ['lopez', 150, 1], c1: ['chris', 230, -1, { ghost: true, z: 10 }], c2: ['tyler', 265, -1, { ghost: true, z: -12 }], c3: ['simon', 300, -1, { ghost: true, z: 16 }] } },
    { fade: ['in', 40] },
    { narrate: 'SOMEWHERE. IN ANOTHER UNIVERSE.' },
    { cam3d: ['lopez', 'push'] }, { score: 'hope' },
    { say: ['lopez', 'GOOD MORNING, CLASS. MY NAME IS MR. LOPEZ TUERO.'] },
    { say: ['lopez', 'THIS YEAR WE WILL LEARN CALCULUS. AND I PROMISE YOU... YOU WILL ALL PASS.'] },
    { shot: ['close', 'lopez'] },
    { say: ['lopez', 'AND WHEN THE LAST BELL RINGS... I WILL BE PROUD OF YOU. AND I WILL SAY IT.'] },
    { score: null }, { rift: [320, 0.6] }, { amb: ['drone'] }, { wait: 40 },
    { shot: ['xcu', 'lopez'] }, { wait: 50 },
    { say: ['lopez', '...INTERESTING.'] },
    { insert: 'card', text: 'TERRAMANIA WILL RETURN.' }, { wait: 150 },
    { fade: ['out', 50] },
  ];
  const POST_SIRVEN = [ // he is still at the door
    { clear: true }, { rays: false }, { grade: null }, { spot: null }, { bg: 'black' }, { tint: null }, { weather: 'stars' }, { music: 'silence' }, { amb: ['drone'] },
    { cast: { sirven: ['sirven', 140, 1] } }, { rift: [336, 1.6] },
    { fade: ['in', 40] },
    { narrate: 'SOMEWHERE. BETWEEN EVERY UNIVERSE.' },
    { shot: ['medium', 'sirven'] }, { score: 'sirven' },
    { say: ['sirven', 'TWENTY YEARS. NOT ONE THING HAS COME THROUGH THIS DOOR. I CHECK IT EVERY NIGHT.'] },
    { score: null }, { shot: 'wide' }, { shake: 8 },
    { cast: { v1: ['tamayo', 262, -1, { rift: true }], v2: ['landa', 300, -1, { rift: true }], v3: ['mikey', 340, -1, { rift: true }] } },
    { appear: 'v1' }, { appear: 'v2' }, { appear: 'v3' }, { wait: 60 },
    { shot: ['close', 'v1'] },
    { say: ['v1', 'HA HA HA! ONE OLD MAN? MOVE.'] },
    { shot: ['xcu', 'sirven'] }, { wait: 50 },
    { shot: ['low', 'sirven'] }, { score: 'sirven' },
    { say: ['sirven', 'THIS IS YOUR PRINCIPAL SPEAKING.'] },
    { say: ['sirven', 'DETENTION. ALL OF YOU.'] },
    { shot: 'wide' }, { act: ['sirven', 'special'] }, { smash: true }, { wait: 12 },
    { insert: 'card', text: 'KING SIRVEN WILL RETURN.' }, { score: null }, { wait: 150 },
    { fade: ['out', 50] },
  ];
  const POST_HERO = [ // the door stayed open, and someone started using it
    { clear: true }, { rays: false }, { grade: null }, { spot: null }, { bg: 'cafeteria' }, { tint: 'rgba(60,0,90,0.4)' }, { music: 'silence' }, { amb: ['drone', 'crowd'] },
    { cast: { other: ['$hero', 250, -1, { rift: true, z: 20 }], '$hero': ['$hero', -40, 1] } },
    { fade: ['in', 40] },
    { narrate: 'SOMEWHERE. IN ANOTHER UNIVERSE. A CORNER TABLE. ONE TRAY.' },
    { cam3d: ['other', 'flyin'] }, { spot: 'other' }, { wait: 90 },
    { spot: null }, { cam3d: ['other', 'still'] }, { score: 'seat' }, { walk: ['$hero', 200, 90] },
    { cam3d: [['$hero', 'other'], 'two'] },
    { say: ['$hero', 'IS THIS SEAT TAKEN?'] },
    { shot: ['close', 'other'] }, { wait: 60 },
    { say: ['other', '...NOBODY EVER SITS HERE.'] },
    { shot: ['close', '$hero'] },
    { say: ['$hero', "THEN IT'S OURS."] },
    { narrate: 'THE DOOR STAYED OPEN. SOMEONE STARTED USING IT.' },
    { insert: 'card', text: 'TERRAMANIA WILL RETURN.' }, { score: null }, { wait: 150 },
    { fade: ['out', 50] },
  ];

  // 23 ----------------------------------------------------------------- THE NEXT BELL
  C.push({
    title: 'THE NEXT BELL', sub: 'THE LAST CHAPTER',
    intro: [
      { bg: 'office' }, { music: 'silence' }, { amb: ['room', 'clock', 'birds'] }, { score: 'bell' },
      { cast: { brady: ['brady', 250, -1, { name: 'PRINCIPAL BRADY' }], mikey: ['mikey', 60, 1, { name: 'COACH MIKEY' }] } },
      { if: ending('sirven'), else: [{ cast: { sirven: ['sirven', 330, -1, { name: 'KING SIRVEN, RETIRED', z: 20 }] } }] },
      { cam3d: ['brady', 'crane'] },
      { title: ['FINAL CHAPTER', 'THE NEXT BELL'] },
      { narrate: "JUNE. PRINCIPAL BRADY'S LAST DAY. TWENTY YEARS IN THE CHAIR SHE ONCE SAT IN FOR DETENTION." },
      { shot: 'wide' }, { walk: ['mikey', 150, 50] },
      { shot: ['medium', 'mikey'] }, { emote: ['mikey', 'sweat'] },
      { say: ['mikey', "YOU WANTED TO SEE ME, PRINCIPAL BRADY? I DIDN'T DO IT. WHATEVER IT IS."] },
      { shot: ['close', 'brady'] },
      { say: ['brady', "COACH. DO YOU REMEMBER WHAT YOU SAID THE DAY THE BELL WOULDN'T STOP?"] },
      { shot: ['close', 'mikey'] },
      { say: ['mikey', '..."WHY DOES IT FEEL LIKE LOSING."'] },
      { cam3d: [['mikey', 'brady'], 'ots'] },
      { say: ['brady', 'AND THEN YOU CAME BACK. THAT IS WHY IT IS YOU.'] },
      { insert: 'radio' }, { sfx: 'pa' }, { score: 'sirven' }, { wait: 70 },
      { if: ending('hero'), then: LAST_HERO, else: [{ if: ending('sirven'), then: LAST_SIRVEN, else: LAST_LOPEZ }] },
      { fade: ['out', 70] },
      { credits: true },
      { if: ending('hero'), then: POST_HERO, else: [{ if: ending('sirven'), then: POST_SIRVEN, else: POST_LOPEZ }] },
    ],
  });
})();
