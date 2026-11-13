// RILEY, THE KEEPER OF TERRAMANIA, and the TERRAMANIA JUDGE who steps in when he falls.
//   - hover: a fighter with sprite.hover floats (drawn higher, with a shadow on the floor and a slow bob)
//   - ranged moves: star-bolt and beam hitboxes with their own effects, and slow cosmic orbs
//   - teleport: his dash is a blink (the movement is in fighter.js; the rings are drawn here)
//   - the block is an orb of light around him
//   - reviveAs: the first knockout of a round is not one. The Judge takes over, with a full bar, and
//     finishes the round (Fighter.summonJudge in fighter.js). A new round brings Riley back.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const GOLD = '#ffd75a', WHITE = '#fff6d0', VIOLET = '#9a6aff', ICE = '#9adcff';
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  // ---- hovering ----
  const create0 = RF.createSprite;
  RF.createSprite = function (def) {
    const sp = create0(def);
    const hv = def.sprite && def.sprite.hover;
    if (hv && !sp.hoverWrapped) {
      sp.hoverWrapped = true;
      const draw0 = sp.draw;
      sp.draw = function (ctx, anim, frame, x, y, facing, tint) {
        const lift = anim === 'ko' || anim === 'dazed' ? hv * 0.25 : hv, bob = Math.sin(performance.now() / 330) * 1.6;
        ctx.save(); ctx.globalAlpha *= 0.34; ctx.fillStyle = '#000';          // the shadow stays on the floor
        const sh = 1 - Math.min(0.4, lift / 60); ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y) + 1, 24 * sh, 4.5 * sh, 0, 0, 7); ctx.fill(); ctx.restore();
        return draw0.call(this, ctx, anim, frame, x, y - lift - bob, facing, tint);
      };
    }
    return sp;
  };

  // ---- ranged hits: a bolt of stars / a beam / a pillar, drawn from the hand to the end of the hitbox ----
  const beam = (core, edge, th, spark) => function (f, ctx, floorY) {
    const m = f.move, t = f.stateTime;
    if (t < m.startup - 3 || t > m.startup + m.active + 8) return;
    const age = t - (m.startup - 3), reach = Math.min(m.hitbox.x + m.hitbox.w, 24 + age * 34), y = Math.round(floorY - f.y - m.hitbox.y - m.hitbox.h / 2), x0 = f.x + f.facing * 22;
    const a = Math.max(0, 1 - age / (m.active + 10)), x1 = x0 + f.facing * reach, lo = Math.min(x0, x1);
    ctx.globalAlpha = a;
    R(ctx, edge, lo, y - th, reach, th * 2 + 1); R(ctx, core, lo, y - Math.floor(th / 2), reach, th + 1);
    for (let i = 0; i < spark; i++) { const sx = lo + ((i * 37 + age * 9) % Math.max(8, reach)), sy = y + Math.sin(age * 0.8 + i * 2) * (th + 6); R(ctx, i % 2 ? WHITE : GOLD, sx, sy, 2, 2); }
    if (age < 5) { ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(x0, y, 7 - age, 0, 7); ctx.fill(); ctx.fillStyle = edge; ctx.beginPath(); ctx.arc(x0, y, 3, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  };
  Object.assign(RF.MOVE_FX, {
    keeperBolt: beam(WHITE, GOLD, 2, 6),
    keeperBeam: beam('#ffffff', VIOLET, 5, 12),
    judgeSmite: beam('#ffffff', GOLD, 4, 10),
    judgeVerdict: beam('#ffffff', ICE, 7, 16),
  });

  // ---- projectiles ----
  RF.PROJECTILE_ART.keeperOrb = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 6; i++) { ctx.globalAlpha = 0.45 - i * 0.06; R(ctx, i % 2 ? GOLD : VIOLET, x - dir * i * 6, y - 3 + Math.sin(t / 3 + i) * 3, 8, 6); }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 13); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, GOLD); g.addColorStop(1, 'rgba(154,106,255,0.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = WHITE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 16 + Math.sin(t / 3), 7, t / 8, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y, 7, 16, -t / 9, 0, 7); ctx.stroke();
  };
  RF.PROJECTILE_ART.gavel = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 5; i++) { ctx.globalAlpha = 0.5 - i * 0.08; R(ctx, GOLD, x - dir * i * 8, y - 1, 7, 3); }
    ctx.globalAlpha = 1; ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(t * 0.4 * dir);
    R(ctx, '#7a5a10', -1, -2, 3, 14); R(ctx, '#7a5a10', -9, -10, 18, 9); R(ctx, GOLD, -8, -9, 16, 7); R(ctx, WHITE, -8, -9, 16, 2);
    ctx.restore();
  };
  Object.assign(RF.SPECIALS, {
    cosmicOrb: {
      name: 'Cosmic Orb',
      description: 'Lets go of a slow orb of light the size of a person. It crosses the whole stage, and when it arrives, it is a lot.',
      kind: 'projectile', startup: 12, recovery: 18, speed: 4.8, size: 24, height: 0.55, damage: 14,
      hitstun: 30, blockstun: 16, pushback: 8, hitstop: 11,
      art: 'keeperOrb', sound: 'arcane', hitText: 'RESTRICTED!', colors: ['#ffffff', '#ffd75a', '#9a6aff'],
    },
    finalVerdict: {
      name: 'Final Verdict',
      description: 'Throws the gavel. It spins across the room and a verdict is read to whoever it hits.',
      kind: 'projectile', startup: 12, recovery: 19, speed: 9, size: 16, height: 0.6, damage: 13,
      hitstun: 28, blockstun: 14, pushback: 7, hitstop: 10,
      art: 'gavel', sound: 'clang', hitText: 'GUILTY!', colors: ['#ffffff', '#ffd75a', '#7a5a10'],
    },
  });

  // ---- the finisher: sealed ----
  RF.FINISHERS.sealed = {
    name: 'Sealed',
    duration: 230,
    update(att, vic, t, scene) {
      att.finisherAnim = t < 150 ? ['special', 1] : ['victory', (t >> 3) % 2];
      vic.y = t < 20 ? 0 : t < 150 ? Math.min(40, (t - 20) * 0.7) : Math.max(0, 40 - (t - 150) * 3);
      if (t === 6) { RF.audio.sfx('arcane'); scene.effects.spawnText('THIS AREA IS RESTRICTED.', att.x, att.body.height + 28, GOLD); }
      if (t === 80) scene.effects.spawnText('SEALING.', att.x, att.body.height + 38, VIOLET);
      if (t >= 20 && t < 140 && t % 12 === 0) { RF.audio.sfx('zap'); scene.shake = 3; }
      if (t === 150) { RF.audio.sfx('ko'); scene.flash = 10; scene.shake = 12; }
      if (t === 185) scene.effects.spawnText('CASE CLOSED.', att.x, att.body.height + 28, '#ffffff');
    },
    drawVictim(vic, ctx, floorY, t) {
      const x = Math.round(vic.x);
      if (t < 20) return vic.sprite.draw(ctx, 'dazed', 0, x, floorY, vic.facing);
      if (t < 150) {
        const cy = floorY - vic.y - vic.body.height * 0.5, shrink = Math.max(0.35, 1 - (t - 20) / 130 * 0.65), r = vic.body.height * 0.62 * (1 - (t - 20) / 260);
        ctx.save(); ctx.translate(x, Math.round(cy)); ctx.scale(shrink, shrink); vic.sprite.draw(ctx, 'hit', 0, 0, vic.body.height * 0.5, vic.facing); ctx.restore();
        const g = ctx.createRadialGradient(x, cy, r * 0.3, x, cy, r); g.addColorStop(0, 'rgba(255,230,140,0.05)'); g.addColorStop(1, 'rgba(255,230,140,0.7)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, r, 0, 7); ctx.fill();
        ctx.strokeStyle = WHITE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy, r, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
        return;
      }
      vic.sprite.draw(ctx, 'ko', 1, x, floorY - vic.y, vic.facing);
    },
  };

  // ---- drawn over the fighters: the orb block, the blink, the arrival of the Judge ----
  RF.drawKeeper = (scene, ctx, floorY) => {
    for (const f of scene.fighters) {
      if (!(f.def.id === 'riley' || f.def.id === 'judge') || f.hidden) continue;
      const t = scene.frame, hv = f.def.sprite.hover || 0, cy = floorY - f.y - f.body.height * 0.5 - hv;
      // THE ORB: a shell of light that flares when it takes a hit
      if (f.state === 'block' || f.state === 'blockstun') {
        const k = f.shieldHit > 0 ? f.shieldHit / 12 : 0, r = f.body.height * 0.72 + Math.sin(t / 6) * 1.5;
        ctx.save(); ctx.globalAlpha = 0.3 + 0.45 * k;
        const g = ctx.createRadialGradient(f.x, cy, r * 0.45, f.x, cy, r); g.addColorStop(0, 'rgba(255,230,140,0.05)'); g.addColorStop(0.8, 'rgba(255,215,90,0.55)'); g.addColorStop(1, k > 0.4 ? 'rgba(255,255,255,0.95)' : 'rgba(154,106,255,0.8)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, cy, r, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.7; ctx.strokeStyle = WHITE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, cy, r, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
        ctx.strokeStyle = GOLD; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(f.x, cy, r, r * 0.28, t / 40 + i * 1.05, 0, 7); ctx.stroke(); }
        ctx.restore();
      }
      // THE BLINK: rings where he left, rings where he arrived, and a ghost of him fading
      if (f.tpFx) {
        const q = f.tpFx; q.t++;
        if (q.t > 18) f.tpFx = null;
        else {
          const a = 1 - q.t / 18;
          for (const [px, w] of [[q.from, 1], [q.to, 0.7]]) {
            ctx.globalAlpha = a * w; ctx.strokeStyle = q.t % 4 < 2 ? GOLD : VIOLET; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(px, floorY - q.y - 30 - hv, 5 + q.t * 1.4, 26 + q.t * 0.8, 0, 0, 7); ctx.stroke();
            ctx.strokeStyle = WHITE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, floorY - q.y - 30 - hv, 3 + q.t, 20, 0, 0, 7); ctx.stroke();
          }
          ctx.globalAlpha = a * 0.5; f.sprite.draw(ctx, 'idle', 0, Math.round(q.from), floorY - q.y, f.facing, q.t % 2 ? GOLD : VIOLET);
          ctx.globalAlpha = 1; ctx.lineWidth = 1;
        }
      }
      // THE ARRIVAL: a column of light, rings falling into the floor
      if (f.summonT > 0) {
        const u = 1 - f.summonT / 100, a = Math.min(1, f.summonT / 30) * (u < 0.2 ? u / 0.2 : 1);
        ctx.save(); ctx.globalAlpha = a * 0.7;
        const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, 'rgba(255,240,180,0.1)'); g.addColorStop(1, 'rgba(255,240,180,0.95)');
        const w = 22 * (1 - u * 0.5); ctx.fillStyle = g; ctx.fillRect(f.x - w, 0, w * 2, floorY);
        ctx.globalAlpha = a; ctx.strokeStyle = WHITE;
        for (let i = 0; i < 4; i++) { const yy = floorY - ((t * 3 + i * 40) % 160); ctx.beginPath(); ctx.ellipse(f.x, yy, w * 1.3, 4, 0, 0, 7); ctx.stroke(); }
        ctx.restore();
        if (f.summonT === 99) RF.audio.sfx('boom');
      }
      // Riley glows a little, like the picture
      if (f.def.id === 'riley') { ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t / 15); const g = ctx.createRadialGradient(f.x, cy, 8, f.x, cy, 52); g.addColorStop(0, 'rgba(255,190,40,0.6)'); g.addColorStop(1, 'rgba(255,190,40,0)'); ctx.fillStyle = g; ctx.fillRect(f.x - 54, cy - 54, 108, 108); ctx.globalAlpha = 1; }
    }
  };

  // ---- the Terramania Judge (not on the select screen: the Keeper brings them) ----
  RF.EXTRAS.push({
    id: 'judge', name: 'The Terramania Judge', archetype: 'judge', health: 85, origin: 'The Bench Above Everything',
    bio: 'Appears only when the Keeper falls. Has never issued a second sentence.',
    quote: 'ORDER IN THE UNIVERSE.', winQuote: 'COURT IS ADJOURNED.', special: 'finalVerdict', throw: 'liftSlam', finisher: 'sealed', intro: 'walk',
    brutality: { name: 'CONTEMPT OF COURT', color: '#ffffff' },
    ending: ['THE JUDGE RULED. THAT WAS THE END OF IT.'],
    tauntLines: ['ORDER.', 'ORDER IN THE COURT.', 'I HAVE SEEN YOUR RECORD.', 'THE GAVEL IS ALREADY FALLING.'],
    stats: { walkSpeed: 2.9, jumpPower: 9.8, damage: 1.05, damageReduction: 0.06, attackSpeed: 1.0 },
    moves: {
      light: { fx: 'judgeSmite', fxSound: 'clang', startup: 7, active: 4, recovery: 13, damage: 6, pushback: 4, hitbox: { x: 18, y: 40, w: 100, h: 26 } },
      heavy: { fx: 'judgeVerdict', fxSound: 'boom', startup: 12, active: 6, recovery: 21, damage: 14, hitstun: 26, blockstun: 14, pushback: 7, knockback: 10, hitstop: 10, hitbox: { x: 14, y: 20, w: 150, h: 56 } },
    },
    body: { scale: 1, bulk: 1.1, width: 40, height: 104, crouchHeight: 0.72 },
    idleFrames: 2, idleRate: 18, lieutenant: true,
    sprite: {
      type: 'pixel',
      scale: 1,
      limbScale: 4,
      crouchSquash: true,
      noArms: true,
      footCol: 44,
      shoulder: [68, 38],
      crouchDrop: 12,
      sleeveColor: 'col2',
      sleeveShade: 0,
      handColor: 'col2',
      legColor: 'pantsi',
      footColor: 'shoes0',
      hideWhenPosed: [],      // the front fist becomes the punching arm
      legend: { 'A': 'col0', 'B': 'col1', 'C': 'col2', 'D': 'col3', 'E': 'col4', 'F': 'col5', 'G': 'col6', 'H': 'col7', 'I': 'col8', 'J': 'col9', 'K': 'cola', 'L': 'colb', 'M': 'colc', 'N': 'cold', 'O': 'cole', 'P': 'colf', 'Q': 'colg', 'R': 'colh', 'S': 'coli', 'T': 'colj', 'U': 'colk', 'V': 'coll', 'W': 'colm', 'X': 'coln', 'Y': 'pants0', 'Z': 'pantsj', 'a': 'pantsl', 'b': 'pantsk', 'c': 'pants9', 'd': 'pantsb', 'e': 'pants5', 'f': 'pantsc', 'g': 'pantsm', 'h': 'pantsn', 'i': 'pantsg', 'j': 'pantsi', 'k': 'pantse', 'l': 'pants4', 'm': 'pants8', 'n': 'pantsh', 'o': 'pants2', 'p': 'pantsf', 'q': 'pants3', 'r': 'pants7', 's': 'pants1', 't': 'pantsd', 'u': 'pantsa', 'v': 'shoes0', 'w': 'shoes1', 'x': 'shoes3', 'y': 'shoes4' },
      palette: {
        col0: '#46320a',
        col1: '#845a12',
        col2: '#f4e28f',
        col3: '#976712',
        col4: '#9e6b13',
        col5: '#e2b135',
        col6: '#3a2c15',
        col7: '#f1bc38',
        col8: '#fbf4b5',
        col9: '#d8d4cb',
        cola: '#fdfbf4',
        colb: '#e1ddd1',
        colc: '#e5e1d8',
        cold: '#cacdc8',
        cole: '#f7f3e8',
        colf: '#e8e4db',
        colg: '#ebe7dd',
        colh: '#d4d0c7',
        coli: '#f1ede3',
        colj: '#989388',
        colk: '#a39d92',
        coll: '#9c968c',
        colm: '#1e1820',
        coln: '#3e3251',
        pants0: '#46320a',
        pants1: '#845a12',
        pants2: '#f4e28f',
        pants3: '#976712',
        pants4: '#9e6b13',
        pants5: '#e2b135',
        pants7: '#f1bc38',
        pants8: '#fbf4b5',
        pants9: '#d8d4cb',
        pantsa: '#fdfbf4',
        pantsb: '#e1ddd1',
        pantsc: '#e5e1d8',
        pantsd: '#cacdc8',
        pantse: '#f7f3e8',
        pantsf: '#e8e4db',
        pantsg: '#ebe7dd',
        pantsh: '#d4d0c7',
        pantsi: '#f1ede3',
        pantsj: '#989388',
        pantsk: '#a39d92',
        pantsl: '#9c968c',
        pantsm: '#1e1820',
        pantsn: '#3e3251',
        shoes0: '#46320a',
        shoes1: '#845a12',
        shoes3: '#976712',
        shoes4: '#9e6b13',
      },
      grid: [
        '...................................AAAAABBBBBCCDDDDEEAAAAA..................................',
        '.................................AACBBBBFGGGGCCCGGGGHDDEIEAA................................',
        '..............................AAABBGCGGFFFGGGCCCGGGHHHGCGGEEAAA.............................',
        '.............................ABBBGGGGFFFFFFFCCCCCFHHHHHHGGGGEEEA............................',
        '...........................AABBGGGGGFFFFFFFCCCCCFFHHHHHHHGGGGGEEAA..........................',
        '..........................ACCGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGIIEA.........................',
        '.........................ABBGCCCGGGGGGGGGGGGFFFFFGGGGGGGGGGGCCIGGEEA........................',
        '.........................ABGGGGGCCGGGGGGGGFFFFFFFFFGGGGGGGCCGGGGGGEA........................',
        '........................ABGGGGGGGGGGGGGGFFFFCCCCCFFHHGGGGGGGGGGGGGGEA.......................',
        '................A......ABGGGGGGGGGGGGGGFFFCCCCCCCCCFHHGGGGGGGGGGGGGGEA......A...............',
        '...............AJAAA...ABGGGGGGGGGGGGGGFFCCCCCCCCCCCFHGGGGGGGGGGGGGGDA...AAAKA..............',
        '...............AJLLLAA.ABCCCCCCCGGGGGGFFCCCCCCCCCCCCCHHGGGGGGCCCCCCCDA.AAKKKKA..............',
        '..............AJLLLLLLAABGGGGGGGGGGGGFFFCCCCCCCCCCCCCFHHGGGGGGGGGGGGDAAKKKKKKKA.............',
        '..............AJLLLLLLLMBGGGGGGGGGGGGFFCCCCCCCCCCCCCCCHHGGGGGGGGGGGGDKKKKKKKKKA.............',
        '.............AJLLLLLLLMMMBGGGGGGCCGGGFFCCCCCCCCCCCCCCCHHGGCCGGGGGGGDKKKKKKKKKKKA............',
        '..............AAJLLLLLLLMMBGGCCCGGGGFFCCNNNNNCCCNNNNNCCHHGGGCCCGGGDKKKKKKKKKKAA.............',
        '................AAJLLLLLLMBCCGGGGGGGFFCCNOOONCCCNKKKNCCHHGGGGGGCCDDKKKKKKKKAA...............',
        '........A.........AAAJLLLLLBBGGGGGGGFFCCNNNNNCDCNNNNNCCHHGGGGGGGDEKKKKKKAAA.........A.......',
        '.......ANAAAA.....A..AAMPPPPPBBGGGGGFFCCCCCCCCDCCCCCCCCHHGGGGGDDKKKKKKAA..A.....AAAAKA......',
        '.......ANNNNNAAA.AMAAAAAAPPPPQBBBGGGFFCCCCCCCCDCCCCCCCCHHGGGDDDKKKKKAAAAAAKA.AAAOOOOKA......',
        '......ANNNNNNRRRAAMMMMMAAAAPQQQQQBBCFFCCCCCCCCDCCCCCCCCFHGDDKKKKKKAAAAKKKKKAAOOOOOOOOKA.....',
        '......ANNNNNNRRRRMMMMMMMPPPAAQQQQQQBFFCCCCCCCCDCCCCCCCCFHDKKKKKKAAKKKKKKKKKKOOOOOOOOOKAAA...',
        '.....ANNNNNNRRRRRMMMMMMMPPPPPQQQQQQQSFFCCCCCCCDCCCCCCCFFOKKKKKKKKKKKCCCCCCCCCCCCIIIIIIIIIA..',
        '......AAANNNNNNRLLLMMMMMMMPPPPPQQQQQQFFCCCCCCCDCCCCCCCFFOOKKKKKKKKKKCCCCCCCCCCCCCIIIIIIIIAA.',
        '.........AAANNNNNNRLLLMMMMMMMPPPPQQQQFFFCCCCCCDCCCCCCFFFOOOOOKKKKKDDDCCCCCCCCCCCCCCIIIIIEEEA',
        '..A.........AAANNNNNNRLLLMMMMMMPPPPPQQFFCCCCCCCCCCCCCFFOOOOOOOKKKKDDDHHHHHHHHHHHHHHHHHHHEEEA',
        '.ATAAAA...A....AAARRJJJJPPQQQQQQQQSSSSSFFCCCCCCCCCCCFFOOOKKKKKKKKKDDDHHHHHHHHHHHHHHHHHHHEEEA',
        '.ATTTTTAAARAAAAAA.AAAJJJJJJQQQQQQQSSSSSFFFCCCCCCCCCFFFOOOKKKKKKKKKDDDHHHHHHHHHHHHHHHHHHHEEEA',
        'ATTTTTTTBBRRRRRRRAAAPAAJJJJJJJQQQQSSSSSAFFFFCCCCCFFFFAOOOKKKKKKQQQDDDHHHHHHHHHHHHHHHHHHHEEEU',
        'ATTTTTTTTRBBBBRRRRRJPPPPPPQQQQJJLQSSSSSAAAFFFFFFFFFAAAOOOKKKQQQKKKDDDHHHHHHHHHHHHHHHHHHHEEEU',
        'TTTTTTTTVRRRRRBBBRJMPPPPPQQQFFFFFQSSSSSA..AAFFFFFAA..AOOOKKKHHHHHKDDDHHHHHHHHHHHHHHHHHHHEEEU',
        'AAATTTTTNNRRRRRRRBBBBMPPPPFCCCCCCFFSSSSA....AAAAA....AOOOKHHCCCCCCDDDHHHHHHHHHHHHHHHHHHHEEEA',
        '...AAAATTTTTNRRRRRMMMBBBFFCCCCCCCCFFFQSA.............AOOFFFCCCCCCCDDDHHHHHHHHHHHHHHHHHHHEEEA',
        '.......AAATTTTTTRRRRRRMFFCCCCCCCCCCFFFQA.............AOFFFCCCCCCCCDDDHHHHHHHHHHHHHHHHHHHEEEA',
        '....A.....AAAATTTTTNRRRFCCCCCCCCCCCCFFQA.............AOFFCCCCCCCCCDDDHHHHHHHHHHHHHHHHHHHEEEA',
        '...ATAAAAAABBAAAAVVVVVFFCCCCCCCCCCCCFFFAAAAAAAAAAAAAAAFFFCCCCCCCCCDDDHHHHHHHHHHHHHHHHHHHEEEA',
        '...ATTTTTTTTRBBBBAAAAVFFFCCCCCCCCCCFFFFLLLLLLMMMMMMMPPFFFHCCCCCCCCDDDDDDDDDDDDDEEEEEEEEEEEEA',
        '..ATTTTTTTTVRRRRRBBBJJFFFFCCCCCCCCFFFFFWLLLLMMMMMMMPPPFFHHHCCCCCCCCHDDDDDDDDDDEEEEEEEEEEEUA.',
        '..ATTTTTTTTRRRRRRRRRBBFFFFFCCCCCCFFFFFFWWLLLMMMMMMMPPPFFHHHHCCCCCCHHDDDDDDDDDDEEEEEEEEEEEUA.',
        '.ATTTTTTTTVRRRRRRRRRJPFFFFFFFFFFFFFFFFFWWLLLMMMMMMMPPPFFFHHHHHHHHHHHHHHKSSSSOOOOOOUUUUUUUUUA',
        '..AAAAATTTNNNRRRRRRRRMMFFFFFUFFFFFFFFFWWWWLFMMMMMFMPPPPFHHHHHHHHSHHHHHKKSOOOECEEOOOUUUAAAAA.',
        '.......AAAATTTTTRRRRMMMFFFVVUFFFFFFFFFWWWWWFMMMMMFPPPPPHHHHHHHHHSSSHHHKKKOOOEIEEUUAAAA......',
        '...........AAABBTTTTVRRRFVVVVFFFFFFFFWXWWWWWLMMMMFPPPPQQHHHHHHHHSSSSHOOOUUUUEIEEAA..........',
        '......A.......AABBBBTTVVVVVVVFFFFFFUUWWXWWWWLLMMMFMPPPPQQQHHHHHHSSSSSOUUUEEEEIEEA.....A.....',
        '.....ATAAAAAAAAAAAAABVVVVUUUFFFFFUUULUWWXWWWWMUMMFUPPPPUQQQQHHHHHSSSSSSSDAAAECEEAAAAAAUA....',
        '.....ATTTTTTTVRRRRRRVVVVVUUUQUUUUUUULULWWXWWWWUMMFUPPPPUQQQQQQQQKSSSSSSSSOOOECEEUUUUUUUA....',
        '....ATTTTTTTVVRRRRVVVVVVUUUUBUUUUUUUULLWWWXWWWWMMFUPPPPUQQQQQQQQDSSSSSSSSSOODCEEUUUUUUUUA...',
        '....ATTTTTTTVRRRRRVVVVVVUUUUJUUUUUUUULLLWWXWWWWMMFUPPPPPUQQQQQQQQSSSSSSSSSOODCEEUUUUUUUUA...',
        '...ATTTTTTTVVRRRRRVVVVVVUUUUUUUUUUULULLLLWWXWWWWMFUPPPPPUQQQQQQQQSSSSSUSSSSODCEEUUUUUUUUUA..',
        '....AAAAAAATNNNNRVVVVVVVVVVVUUUUUUULULLLUWWWXWWWWFPUPPPQUQQQQQSSSSSSSSUOOOOOEIEEOUAAAAAAA...',
        '...........AAAAAATTTTTTVVVVVVVVVUUUUJJLLULWWWXWWWWMUPPPPUQQQQQSSSSSSSOOUOOOOEIEEAA..........',
        '................ATTTTTTVVVVRVVVVUUUUJJLLULFWWWXWWWFUPPPPQUQQQQSSSSSSSOOUOOOOEIEEA...........',
        '........AAAAAAAAATTTTTTVVVVRVVVVUUUUJJLLULFLWWXWWWWUPPPPQUQQQQSSSSSSSOOUOOOOEIEEAAAAA.......',
        '.......ATTTTTTTVVVVVVVVVVVUUUUUUUULULLLLULFLWWWXWWWWPPPQQUQQQQQSSSSSSSSUOOOOEIEEUUUUUA......',
        '.......ATTTTTTTVRVVVVVVVVVUUUUUUUUULLLLLULFLMWWWXWWWWPPQQUQQQQQSSSSSSSSSUOOOEIEEUUUUUA......',
        '......ATTTTTTTVVVVVVVVVVVUUUUUUUUUULLLLLULFLMMWWWXWWWWPQQQUQQQQQSSSSSSSSUOOOECEEUUUUUUA.....',
        '......ATTTTTTTVRVVVVVVVVVUUUUUUUUUULLLLLULFLMMWWWWXWWWPQQQUQQQQQSSSSSSSSUOOOECEEUUUUUUA.....',
        '.....ATTTTTTTVVRVVVVVVVVVUJUUUUUUUULLLLULLFLMMUWWWXWWWWPQQUQQQQQSSSSSSSSUOOOECEEUUUUUUUA....',
        '......AAAAAAAANATTTTVVVVVVVVVUUUUUJJLLLULLFLLMUMWWWXWWWWQQUQQSSSSSSSSOOOOUOOEIEEAAAAAAA.....',
        '..............AATTTTTTVVVVVVVVVUUUJJJJLULLFLLLUMMWWWXWWWWQQUQQSSSSSSSOOOOUOOEIEEA...........',
        '..............YZZZZZZaaaaaaaaabbbbcccddbddedddbffgggghgggiibiijjjjjjjkkkkbkklmllY...........',
        '..........YYYYYZZZZZZaaaanaaaabbbbcccddbddedddbfffgggghgggibiijjjjjjjkkkkkbklmllYYY.........',
        '.........YZZZZZZaaaaaaaaaaabbbbbbccddddbddedffbfffegggghgggbiijjjjjjjjjkkkbklmllbbbY........',
        '.........YZZZZZZaaaaaaaaaaabbbbbbccddddbddedfoooffepggghggggiijjjjjjjjjkkkbklmllbbbY........',
        '........YZZZZZZZaaaaaaaaaabbbbbbbcdddddbddedooooofepgggghgggbiijjjjjjjjkkkbklmllbbbbY.......',
        '........YZZZZZZZaaaaaaaaaabbbbbbbcdddddbddeooqqqooepbgggghgggiijjjjjjjjkkkkblmllbbbbY.......',
        '.......YZYYYYYZaaaaaaaaacabbbbeeeeeeeeeeeeooqqqqqooeeeerrrrrrrrjjjjjjjjjkkkblmllYYYYbY......',
        '........Y....YZZZZZZaaaaaaaaabeeeeeeeeeeeeooqqqqqooeeeerrrrrrrrjjjjjjYkkkkkblmllY...Y.......',
        '.............YZZZZZZaaaaaaaaabeeeeeeeeeeeeooqqqqqooeeeerrrrrrrrjjjjjjkkkkkkblmllY...........',
        '..............YYZZZZZZaaaaaaaaeeeeeeeeeeeeooqqqqqooeeeeerrrrrrrgjjjjjjkkkkmmlmllmY..........',
        '................YYZZZZZnaaaaaaacccccccbcddeoosqqooeffbpppgggghgggjjjjjYkkoomlmllmmY.........',
        '..................YYZZZtZZaaaaanccccccbccdedooooofeffbpppgggggiijjjjjjYkkoomlmllmmY.........',
        '....................YYZZZZZaaaannnccccbccecddooodddefbffppgiiibiiijjjjjjoooolmllmmmY........',
        '.....................YtZZZZaaaannnccccbccecdddbddddefbffpppiiibiiijjjjjYoooolmllmmmY........',
        '.....................YtZZZZaaannnncccbcccecdddbddddeffbfpppiiibiiijjjjjYoooolmllmmmY........',
        '.....................YtZZZZaaannnncccbcccecdddbddddeffbfpppiiibiiijjjjjYoooolmllmmmY........',
        '.....................YZZZZZaaannnncccbcccecdddbddddeffbfpppiiibiiijjjjjYoooolmllmmmY........',
        '....................YtZZZZaaaannnccccbccceddddbdddfeffbpppiiiiibijjjjjjjYoomlmllmmY.........',
        '....................YtZZZZaaannnnccccbccceddddbdddfeffbpppiiiiibijjjjjjjYoomlmllmmY.........',
        '....................YtZZZZaaannnnccccbccceddddbddffeffbpppiiiiibjjjjjjjkYYomlmllmY..........',
        '....................YtZZZZaaannnnccccbccceddddbddffeffbppiiiiiibjjjjjjkkY.YYlmllY...........',
        '....................YZZZZZanannnnccccbccceddddbddffeffbppiiiiiijbjjjjjkkY..YlmllY...........',
        '....................YZZZZZaannnnnccccbccceddddbddffeffbppiiiiiijbjjjjjkkY..YlmllY...........',
        '...................YtZZZZanannnnccccbcccdeddddbdfffefppbpiiiiiijbjjjjjkkkY.YlmllY...........',
        '...................YtZZZZanannnnccccbcccdeddddbdfffefppbpiiiiiijbjjjjjkkkY.YlmllY...........',
        '...................YtZZZZanannnnccccbcccdeddddbdfffefppbpiiiiiijjbjjjjkkkY.YlmllY...........',
        '...................YZZZZZnannnnnccccbcccdeddddbdfffefppbpiiiiiijjbjjjjkkkY.YlmllY...........',
        '...................YZZZZZnannnnnccccbcccdeddddbdfffefppbpiiiiiijjbjjjjkkkY.YlmllY...........',
        '..................YtZZZZnnannnncccccbcccdeddddbdfffefppbiiiiiiijjbjjjjkkkkYYlmllY...........',
        '..................YtZZZZnnannnncccccbcccdeddddbdfffefppbiiiiiiijjjbjjjkkkkYYlmllY...........',
        '..................YZZZZtnannnnncccccbcccdeddddbdfffefppbiiiiiiijjjbjjjkkkkYYlmllY...........',
        '..................YZZZZtnannnnncccccbcccdeddddbdfffefppbiiiiiiijjjbjjjkkkkYYlmllY...........',
        '..................YZZZZtnannnnnccccbccccdeddddbdfffefpppbiiiiiijjjbjjjkkkkYYlmllY...........',
        '.................YtZZZtnnannnncccccbcccddeddddbffffeppppbiiiiijjjjbjjkkkkkkYlmllY...........',
        '.................YtZZZtnannnnncccccbcccdedddddbfffffepppbiiiiijjjjjbjkkkkkkYlmllY...........',
        '.................YZZZttnannnnncccccbcccdedddddbfffffepppbiiiiijjjjjbjkkkkkkYlmllY...........',
        '.................YZZZttnannnnncccccbcccdedddddbfffffepppbiiiiijjjjjbjkkkkkkYlmllY...........',
        '.................YZZZttnannnnncccccbcccdedddddbfffffepppbiiiiijjjjjbjkkkkkkYlmllY...........',
        '.................YZZtttZnnnnnncccccbcccdedddddbfffffepppbiiiiijjjjjjbkkkkkkYlmllY...........',
        '................YtZZttnannnnnncccccbccddedddddbfffffepppbiiiiijjjjjjbkkkkkkklmllY...........',
        '................YZZtttnannnnnnccccbcccddedddddbfffffepppibiiiijjjjjjbkkkkkkklmllY...........',
        '................YZZtttnannnnncccccbccdddeddddfbfffppeiiiibijjjjjjjkkbkkkkkkuYYYY............',
        '................YZZtttannnnnncccccbccdddeddddfbfffppeiiiibijjjjjjjkkkbkkkkkuY...............',
        '................YZttttannnnnncccccbccdddeddddfbfffppeiiiibijjjjjjjkkkbkkkkkuY...............',
        '...............YZeeooooooooooooooooooooooooooooooooooooooooooooooooooommmmrruY..............',
        '...............YZeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeerrrrrrrrrrrrrrrrrrrrrrruYY.............',
        '...............YZesssssssssssssssssssssssssqqqqqqqqqqqqqqqqqqqqqqqqqqqlllllllllY............',
        '................YYYssssssssssssssssssssssssssqqqqqqqqqqqqqqqqqqqqqqqqqqllllllllY............',
        '..................YsssYsssYsssYsssYsssYsssYssqYqqqYqqqYqqqYqqqYqqqYqqqYlllYlllY.............',
        '...................YsYYsssYsssYYsYYsssYsssYYsYYqqqYqqqYYqYYqqqYqqqYYqYYlllYlllY.............',
        '...................YsY.YsYYsssYYsY.YsYYsssYYsY.YqYYqqqYYqY.YqYYqqqYYqY.YlYYlllY.............',
        '....................Y..YsY.YsY..Y..YsY.YsY..Y..YqY.YqY..Y..YqY.YqY..Y..YlY.YlY..............',
        '........................v..vwv......v..vwv......v..vxv......v..vxv......v..vyv..............',
        '............................v...........v...........v...........v...........v...............',
      ],
      hover: 14,
      poses: {
        idle: [{}, { head: [0, -1], torso: [0, -1] }],
        light: [{ head: [-1, 0] }, { head: [2, 0], torso: [1, 0] }, { head: [1, 0] }],
        heavy: [{ head: [-2, -1], torso: [-1, 0] }, { head: [3, 1], torso: [3, 1] }, { head: [1, 0], torso: [1, 0] }],
        special: [{ head: [-1, -1] }, { head: [1, 0], torso: [1, 0] }, { head: [0, 0] }],
      },
    },
  });
})();
