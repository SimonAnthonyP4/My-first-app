// POLISH: the small things. A player RANK that grows with everything you do, a results card
// after every match (damage, hits, best combo, XP earned), and the tips shown on the VS screen.
(function () {
  const T = (...a) => RF.font.drawText(...a);

  // ---------------------------------------------------------------- rank + XP
  // XP is not stored: it is added up from the records, the story, the tower and the unlocks, so
  // it can never go out of step with them, and everything done before ranks existed counts.
  const RANKS = [[1, 'FRESHMAN'], [3, 'SOPHOMORE'], [6, 'JUNIOR'], [10, 'SENIOR'], [14, 'VARSITY'], [19, 'TEAM CAPTAIN'], [25, 'VALEDICTORIAN'], [32, 'LEGEND OF TERRAMANIA']];
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const lvl = (xp) => 1 + Math.floor(Math.sqrt(xp / 120));
  RF.profile = {
    xp() {
      const d = RF.records.data, st = RF.storyProgress ? RF.storyProgress.get() : {}, tw = RF.towerRecord ? RF.towerRecord() : {};
      return sum(d.wins) * 100 + sum(d.played) * 25 + Object.keys(d.unlocked || {}).length * 150 + (d.best.combo || 0) * 10 + (d.best.survival || 0) * 40 +
        (st.reached || 0) * 100 + (st.done ? 500 : 0) + Object.keys(st.endings || {}).length * 300 + Object.values(st.ranks || {}).filter((r) => r === 'S').length * 80 +
        (tw.best || 0) * 80 + RF.UNLOCKS.filter((u) => u.test()).length * 250;
    },
    level(xp = this.xp()) { return lvl(xp); },
    rank(xp = this.xp()) { const L = lvl(xp); return RANKS.filter((r) => r[0] <= L).pop()[1]; },
    // how far through the current level, 0..1
    progress(xp = this.xp()) { const L = lvl(xp), a = (L - 1) * (L - 1) * 120, b = L * L * 120; return (xp - a) / (b - a); },
    // a small rank plate: RANK NAME, LV n, a bar
    draw(ctx, x, y, w = 120) {
      const xp = this.xp(), L = lvl(xp);
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x, y, w, 17); ctx.fillStyle = '#c01010'; ctx.fillRect(x, y, 2, 17);
      T(ctx, this.rank(xp), x + 6, y + 2, { color: '#ffffff', outline: '#000' });
      T(ctx, 'LV ' + L, x + w - 4, y + 2, { align: 'right', color: '#ffd030', outline: '#000' });
      ctx.fillStyle = '#2a0808'; ctx.fillRect(x + 6, y + 11, w - 10, 3);
      ctx.fillStyle = '#e02818'; ctx.fillRect(x + 6, y + 11, Math.round((w - 10) * this.progress(xp)), 3);
    },
  };

  // ---------------------------------------------------------------- match results
  const P = RF.FightScene.prototype, blank = () => ({ dmg: 0, hits: 0, combo: 0, perfect: 0 });
  const applyHit = P.applyHit;
  P.applyHit = function (att, def, ...rest) {
    const h0 = def.health, res = applyHit.call(this, att, def, ...rest);
    if (att && att.side != null && def.side != null && this.matchStats) {
      const d = h0 - def.health, s = this.matchStats[att.side];
      if (d > 0) { s.dmg += d; s.hits++; s.combo = Math.max(s.combo, def.combo || 0); }
      if (res === 'perfect') this.matchStats[def.side].perfect++;
    }
    return res;
  };
  const startMatch = P.startMatch;
  P.startMatch = function () { this.matchStats = [blank(), blank()]; this.xp0 = RF.profile.xp(); this.xpGain = 0; this.levelUp = false; return startMatch.call(this); };
  const recordMatch = P.recordMatch;
  P.recordMatch = function () {
    const r = recordMatch.apply(this, arguments);
    const xp1 = RF.profile.xp();
    this.xpGain = Math.max(0, xp1 - (this.xp0 || 0)); this.levelUp = lvl(xp1) > lvl(this.xp0 || 0);
    if (this.levelUp) { RF.audio.sfx('perfect'); RF.announcer.say('RANK UP.'); }
    return r;
  };
  // the card on the match-over screen: three rows of numbers, the winner's side lit, then the XP
  RF.drawMatchStats = function (ctx, scene, y) {
    const st = scene.matchStats; if (!st) return;
    const W = RF.CONFIG.WIDTH, w = scene.wins[0] > scene.wins[1] ? 0 : 1, t = scene.phaseTime;
    const rows = [['DAMAGE', (s) => Math.round(s.dmg)], ['HITS', (s) => s.hits], ['BEST COMBO', (s) => s.combo], ['PERFECT BLOCKS', (s) => s.perfect]];
    rows.forEach(([label, f], i) => {
      if (t < 20 + i * 8) return;                              // they count in, one after another
      const yy = y + i * 9, a = f(st[0]), b = f(st[1]), k = Math.min(1, (t - 20 - i * 8) / 14);
      T(ctx, label, W / 2, yy, { align: 'center', color: '#a89490', outline: '#000' });
      T(ctx, String(Math.round(a * k)), W / 2 - 60, yy, { align: 'right', color: a >= b ? '#ffffff' : '#7a6a68', outline: '#000' });
      T(ctx, String(Math.round(b * k)), W / 2 + 60, yy, { color: b >= a ? '#ffffff' : '#7a6a68', outline: '#000' });
    });
    ctx.fillStyle = '#ff4a3a'; ctx.fillRect(W / 2 - 96, y, 2, 34); ctx.fillStyle = scene.opts.cpu ? '#8a8a8a' : '#4a8aff'; ctx.fillRect(W / 2 + 94, y, 2, 34);
    if (scene.xpGain > 0 && t > 56) {
      const k = Math.min(1, (t - 56) / 20);
      T(ctx, '+' + Math.round(scene.xpGain * k) + ' XP' + (scene.levelUp ? '   RANK UP: ' + RF.profile.rank() + ' (LV ' + RF.profile.level() + ')' : ''), W / 2, y + 38, { align: 'center', color: scene.levelUp && (t >> 3) % 2 ? '#ffffff' : '#ffd030', outline: '#000' });
    }
  };

  // ---------------------------------------------------------------- tips (VS screen, title ticker)
  RF.TIPS = [
    'UP + HEAVY LAUNCHES. HOLD UP TO CHASE THEM INTO THE AIR.',
    'LIGHT + HEAVY WITH 3 BARS OF METER = SUPER.',
    'BLOCK JUST BEFORE A HIT LANDS FOR A PERFECT BLOCK.',
    'BEING COMBOED? LIGHT + HEAVY WITH 2 BARS = COMBO BREAKER.',
    'THROW BEATS BLOCK.',
    'KNOCK THEM INTO THE HAZARD AGAINST THE WALL FOR EXTRA DAMAGE.',
    'FINISH A TAUNT TO GAIN METER. YOU ARE WIDE OPEN WHILE YOU DO.',
    'HEAVY ON THE SELECT SCREEN CHANGES YOUR COSTUME.',
    'DOUBLE-TAP A DIRECTION TO DASH.',
    'PRESS BLOCK AS YOU LAND TO GET UP FAST.',
    'AT FINISH THEM: THROW = FATALITY. FIVE HITS = BRUTALITY.',
    'DOWN, FORWARD + ATTACK = A COMMAND SPECIAL. SEE THE MOVE LIST IN PAUSE.',
    'AN S RANK IN STORY MODE UNLOCKS THE GOLDEN COSTUME.',
    'PARTY MODS: TRY ITEM DROPS WITH LOW GRAVITY.',
    'EVERY FIGHTER HAS A RIVAL. PICK THEM AND READ THE VS SCREEN.',
    'MR. URBANIK NEVER UNFOLDS HIS ARMS. DO NOT STAND AT FULL SCREEN.',
    'THE ? ON THE SELECT SCREEN PICKS A FIGHTER FOR YOU.',
    'ON YOUR HOME TURF YOU START WITH A THIRD OF A BAR.',
    'EVERY FIGHTER HAS A THROW OF THEIR OWN. GET CLOSE AND PRESS THROW.',
    'ON STAGE SELECT, UP AND DOWN SKIP FIVE STAGES AT A TIME.',
    'IN ARCADE, EVERYONE FIGHTS YOU ON THEIR HOME TURF.',
    'ALEJANDRO: DOWN, FORWARD + HEAVY ROLLS A BOULDER STRAIGHT THROUGH THEM.',
  ];
  RF.tip = (n) => RF.TIPS[((n | 0) % RF.TIPS.length + RF.TIPS.length) % RF.TIPS.length];

  // ---------------------------------------------------------------- mastery
  // How well you know each fighter, from your wins with them: a pip on the select screen and a word on their card.
  const TIERS = [[30, 'LEGEND', '#ff4030'], [15, 'MAIN', '#ffd030'], [5, 'REGULAR', '#c8d0d8'], [1, 'ROOKIE', '#c8803a']];
  RF.mastery = function (id) {
    const wins = ((RF.records.data.wins || {})[id]) || 0, t = TIERS.find((x) => wins >= x[0]), up = TIERS.slice().reverse().find((x) => wins < x[0]);
    return { wins, tier: t ? t[1] : null, color: t ? t[2] : null, next: up ? up[0] - wins : 0, nextTier: up ? up[1] : null };
  };

  // ---------------------------------------------------------------- the first fight anybody has on this device
  // The buttons, on screen, for the first ten seconds of the first round. Never again after that.
  const HINT_KEY = 'terramania-hint', HINT_LEN = 600;
  let hintSeen = false; try { hintSeen = !!localStorage.getItem(HINT_KEY); } catch (e) { /* no storage */ }
  const keyName = (code) => code.replace(/^Key/, '').replace(/^Arrow/, '').replace(/^Numpad/, 'NUM').replace('Comma', ',').replace('Period', '.').replace('Slash', '/').replace('Semicolon', ';').replace('Quote', "'").toUpperCase();
  const padName = { Square: 'SQUARE', Triangle: 'TRIANGLE', Circle: 'CIRCLE', Cross: 'CROSS', R1: 'R1' };
  const bind = (p, action, pad) => {
    const codes = RF.CONTROLS['p' + (p + 1)][action] || [];
    if (pad) { const c = codes.find((x) => /^Pad\d/.test(x)); return c ? (padName[c.replace(/^Pad\d/, '')] || c.replace(/^Pad\d/, '').toUpperCase()) : '?'; }
    const k = codes.find((x) => !/^Pad\d|^Numpad/.test(x)) || codes.find((x) => !/^Pad\d/.test(x));
    return k ? keyName(k) : '?';
  };
  RF.drawFirstFightHint = function (ctx, scene) {
    if (hintSeen || scene.training || scene.opts.demo || scene.opts.story || scene.opts.cpuBoth || scene.round !== 1 || scene.phase !== 'fight' || (RF.touch && RF.touch.active)) return;
    if (scene.hintT === undefined) { if (Object.keys(RF.records.data.played || {}).length) { hintSeen = true; return; } scene.hintT = 0; }
    const t = scene.paused ? scene.hintT : scene.hintT++;
    if (t >= HINT_LEN) { hintSeen = true; try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* ignore */ } return; }
    const a = Math.min(1, t / 20, (HINT_LEN - t) / 40), W = RF.CONFIG.WIDTH;
    const pads = (navigator.getGamepads ? [...navigator.getGamepads()] : []).filter((g) => g && g.connected).length;
    const sides = scene.opts.cpu ? [0] : [0, 1];
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 36, W, 37); ctx.fillStyle = '#c01010'; ctx.fillRect(0, 36, W, 1); ctx.fillRect(0, 72, W, 1);
    sides.forEach((p) => {
      const pad = pads > p, x = sides.length === 1 ? W / 2 : (p === 0 ? 8 : W - 8), align = sides.length === 1 ? 'center' : (p === 0 ? 'left' : 'right'), B = (act) => bind(p, act, pad);
      const arrows = !pad && /^Arrow/.test(RF.CONTROLS['p' + (p + 1)].left[0]);
      const move = pad ? 'MOVE: D-PAD OR STICK' : arrows ? 'MOVE: ARROWS   JUMP: UP' : 'MOVE ' + B('left') + ' ' + B('right') + '   JUMP ' + B('up') + (sides.length === 1 ? '   DUCK ' + B('down') : '');
      T(ctx, move, x, 40, { align, color: '#ffffff', outline: '#000' });
      T(ctx, 'LIGHT ' + B('light') + '   HEAVY ' + B('heavy') + '   BLOCK ' + B('block'), x, 50, { align, color: '#ffd030', outline: '#000' });
      T(ctx, 'THROW ' + B('throw') + '   DASH ' + B('dash') + (sides.length === 1 ? '   LIGHT + HEAVY = SUPER' : ''), x, 60, { align, color: '#c8b0a0', outline: '#000' });
    });
    ctx.restore();
  };
})();
