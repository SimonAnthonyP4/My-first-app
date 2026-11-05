// COMMAND SPECIALS: every fighter has two extra moves done with the stick.
//   DOWN, FORWARD + LIGHT or HEAVY  ("qcf", quarter circle forward)
//   DOWN, BACK    + LIGHT or HEAVY  ("qcb", quarter circle back)
// They cost no meter, and a ground attack that connects can cancel straight into
// one (light, light, DOWN-FORWARD + attack...). The signature special stays the
// perfect-block / EX / super move.
//
// kind picks the behaviour in js/game/special-kinds.js:
//   rush      dash forward and hit       (startup, speed, duration, reach, recovery, hop?)
//   teleport  vanish, reappear past them (startup, behind, strikeDelay, reach, recovery, damage?)
//   rising    anti-air uppercut          (startup, rise, forward, reach, recovery, invuln)
//   counter   stance that strikes back   (startup, window, recovery)
//   projectile / slam                    (same as specials.js)
// color / callout are cosmetic.
(function () {
  const hit = (dmg, extra = {}) => Object.assign({ damage: dmg, hitstun: 24, blockstun: 12, pushback: 5, hitstop: 7 }, extra);

  RF.COMMANDS = {
    // ---- Bruiser ----
    trayCharge: Object.assign({ name: 'Tray Charge', kind: 'rush', startup: 8, speed: 6.5, duration: 14, reach: 14, recovery: 18, color: '#c8c8d0' }, hit(10, { pushback: 8 })),
    ladleUppercut: Object.assign({ name: 'Ladle Uppercut', kind: 'rising', startup: 4, rise: 8, forward: 1.5, reach: 18, recovery: 18, invuln: 7, color: '#e8b060' }, hit(10, { launch: 6 })),
    // ---- Viper ----
    fangRush: Object.assign({ name: 'Fang Rush', kind: 'rush', startup: 5, speed: 8.5, duration: 10, reach: 12, recovery: 14, color: '#7cff4a' }, hit(8)),
    smokeStep: Object.assign({ name: 'Smoke Step', kind: 'teleport', startup: 8, behind: true, strikeDelay: 4, reach: 18, recovery: 14, color: '#6a8a6a', callout: 'BEHIND YOU' }, hit(7)),
    // ---- Dr. Weissenberg ----
    ballLightning: Object.assign({ name: 'Ball Lightning', kind: 'projectile', startup: 12, recovery: 22, speed: 2.6, size: 14, height: 0.55, sound: 'zap', colors: ['#ffffff', '#9ff0ff', '#2a8ad8'] }, hit(10)),
    staticUppercut: Object.assign({ name: 'Static Uppercut', kind: 'rising', startup: 5, rise: 8.5, forward: 1, reach: 16, recovery: 20, invuln: 7, color: '#7ad8ff', sound: 'zap' }, hit(11, { launch: 6 })),
    // ---- Jauregui ----
    deltaForce: Object.assign({ name: 'Delta Force', kind: 'projectile', startup: 9, recovery: 18, speed: 5.5, size: 12, height: 0.6, glyphs: ['Δ'], sound: 'whoosh', colors: ['#ffffff', '#fff2a0', '#c8b060'] }, hit(8)),
    squareRoot: Object.assign({ name: 'Square Root', kind: 'rising', startup: 4, rise: 9, forward: 1.5, reach: 16, recovery: 18, invuln: 6, color: '#f0f0e0' }, hit(9, { launch: 6 })),
    // ---- Dr. Astuto ----
    objection: Object.assign({ name: 'Objection', kind: 'counter', startup: 3, window: 22, recovery: 20, color: '#3a6ae0', callout: 'OBJECTION!' }, hit(13, { launch: 4 })),
    gavelSlam: Object.assign({ name: 'Gavel Slam', kind: 'slam', startup: 8, leapPower: 7, maxLeapSpeed: 4, recovery: 22, radius: 40, height: 24 }, hit(11, { launch: 4 })),
    // ---- El Escobedo ----
    rocketBoost: Object.assign({ name: 'Rocket Boost', kind: 'rush', startup: 6, speed: 7.5, duration: 16, hop: 3, reach: 14, recovery: 14, color: '#ff9a30', sound: 'jet' }, hit(9)),
    droneStrike: Object.assign({ name: 'Drone Strike', kind: 'projectile', startup: 10, recovery: 20, speed: 5, size: 14, height: 0.75, art: 'drone', sound: 'drill', colors: ['#ffffff', '#9ff0ff', '#2a8ad8'] }, hit(9)),
    // ---- Lady Landa ----
    hexStep: Object.assign({ name: 'Hex Step', kind: 'teleport', startup: 10, behind: true, strikeDelay: 4, reach: 18, recovery: 14, color: '#9040ff', callout: 'BEHIND YOU', sound: 'hiss' }, hit(9)),
    cobraRise: Object.assign({ name: 'Cobra Rise', kind: 'rising', startup: 5, rise: 8, forward: 2, reach: 18, recovery: 18, invuln: 6, color: '#b040ff', sound: 'hiss' }, hit(10, { launch: 6 })),
    // ---- Mr. Dabalsa ----
    toBeOrNot: Object.assign({ name: 'To Be Or Not To Be', kind: 'counter', startup: 4, window: 24, recovery: 24, color: '#e8b997', callout: 'TO BE...' }, hit(15, { launch: 5 })),
    sonnetSlam: Object.assign({ name: 'Sonnet Slam', kind: 'slam', startup: 10, leapPower: 6.5, maxLeapSpeed: 3.5, recovery: 26, radius: 56, height: 26 }, hit(12, { launch: 5 })),
    // ---- King Sirven ----
    hallPass: Object.assign({ name: 'Hall Pass', kind: 'teleport', startup: 8, behind: true, strikeDelay: 4, reach: 18, recovery: 14, color: '#ff9ac8', callout: 'HALL PASS' }, hit(8)),
    suspension: Object.assign({ name: 'Suspension', kind: 'rush', startup: 7, speed: 7, duration: 12, reach: 14, recovery: 16, color: '#ffd030' }, hit(10, { pushback: 7 })),
    // ---- Holbrook ----
    tectonicUplift: Object.assign({ name: 'Tectonic Uplift', kind: 'rising', startup: 5, rise: 8, forward: 1, reach: 18, recovery: 20, invuln: 6, color: '#a0e070', sound: 'rumble' }, hit(11, { launch: 6 })),
    jetStream: Object.assign({ name: 'Jet Stream', kind: 'rush', startup: 7, speed: 7, duration: 14, reach: 14, recovery: 16, color: '#80c0ff' }, hit(9, { pushback: 7 })),
    // ---- Simon ----
    spinningElbow: Object.assign({ name: 'Spinning Elbow', kind: 'rush', startup: 4, speed: 6, duration: 8, reach: 12, recovery: 12, color: '#ffb030' }, hit(9)),
    skipKnee: Object.assign({ name: 'Skip Knee', kind: 'rising', startup: 3, rise: 7.5, forward: 3, reach: 16, recovery: 14, invuln: 5, color: '#ffd060' }, hit(10, { launch: 6 })),
    // ---- Ruano ----
    flamencoFan: Object.assign({ name: 'Flamenco Fan', kind: 'projectile', startup: 12, recovery: 22, speed: 4.5, size: 14, height: 0.6, art: 'fan', sound: 'whoosh', colors: ['#ffffff', '#f0c020', '#d01828'] }, hit(11)),
    ascension: Object.assign({ name: 'Ascension', kind: 'rising', startup: 6, rise: 8.5, forward: 1, reach: 20, recovery: 22, invuln: 8, color: '#fff2c0', sound: 'bell' }, hit(13, { launch: 6 })),
    // ---- Chris ----
    coinFlip: Object.assign({ name: 'Coin Flip', kind: 'projectile', startup: 8, recovery: 18, speed: 5.5, size: 12, height: 0.6, art: 'coin', sound: 'cash', colors: ['#ffffff', '#ffd040', '#c8961e'] }, hit(8)),
    myLawyer: Object.assign({ name: 'My Lawyer', kind: 'counter', startup: 3, window: 22, recovery: 20, color: '#e8e8e8', callout: 'MY LAWYER!' }, hit(12, { launch: 4 })),
    // ---- Anthony ----
    blink: Object.assign({ name: 'Blink', kind: 'teleport', startup: 6, behind: true, strikeDelay: 4, reach: 22, recovery: 14, color: '#ff70a8', callout: 'BLINK', sound: 'arcane' }, hit(9)),
    barToss: Object.assign({ name: 'Bar Toss', kind: 'projectile', startup: 9, recovery: 18, speed: 6, size: 14, height: 0.6, art: 'barToss', sound: 'whoosh', colors: ['#ffffff', '#e8b420', '#1a1a22'] }, hit(9)),
  };

  // Per-fighter: their two command moves, a taunt line, and the pitch of their taunt voice.
  const EXTRAS = {
    bruiser: { commands: { qcf: 'trayCharge', qcb: 'ladleUppercut' }, taunt: 'SECONDS? I THINK NOT.', voicePitch: 0.3 },
    viper: { commands: { qcf: 'fangRush', qcb: 'smokeStep' }, taunt: 'SSSSSO SLOW.', voicePitch: 1.3 },
    weissenberg: { commands: { qcf: 'ballLightning', qcb: 'staticUppercut' }, taunt: 'FEEL THE VOLTAGE!', voicePitch: 0.8 },
    jauregui: { commands: { qcf: 'deltaForce', qcb: 'squareRoot' }, taunt: 'SHOW YOUR WORK!', voicePitch: 1.4 },
    astuto: { commands: { qcf: 'objection', qcb: 'gavelSlam' }, taunt: 'ORDER IN THE COURT!', voicePitch: 0.6 },
    escobedo: { commands: { qcf: 'rocketBoost', qcb: 'droneStrike' }, taunt: 'DALE! DALE!', voicePitch: 1.0 },
    landa: { commands: { qcf: 'hexStep', qcb: 'cobraRise' }, taunt: 'INTO THE JAR WITH YOU.', voicePitch: 1.2 },
    dabalsa: { commands: { qcf: 'toBeOrNot', qcb: 'sonnetSlam' }, taunt: 'ALAS, POOR STUDENT.', voicePitch: 0.4 },
    sirven: { commands: { qcf: 'hallPass', qcb: 'suspension' }, taunt: 'DETENTION! ALL OF YOU!', voicePitch: 0.7 },
    holbrook: { commands: { qcf: 'tectonicUplift', qcb: 'jetStream' }, taunt: 'YOU ARE OFF THE MAP.', voicePitch: 0.8 },
    simon: { commands: { qcf: 'spinningElbow', qcb: 'skipKnee' }, taunt: 'COME ON. COME ON!', voicePitch: 1.1 },
    anthony: { commands: { qcf: 'blink', qcb: 'barToss' }, taunt: 'WANT A BRO BATCH?', voicePitch: 0.9 },
    chris: { commands: { qcf: 'coinFlip', qcb: 'myLawyer' }, taunt: 'WHERE THE ZA', voicePitch: 1.1 },
    ruano: { commands: { qcf: 'flamencoFan', qcb: 'ascension' }, taunt: 'OLE! MUY BIEN.', voicePitch: 1.2 },
  };
  for (const [id, extra] of Object.entries(EXTRAS)) { const d = RF.getCharacter(id); if (d) Object.assign(d, extra); }
})();
