// RECORDS + ACHIEVEMENTS: lifetime stats and trophies, saved in this browser
// (localStorage). Only human players count; CPU-vs-CPU demos don't.
(function () {
  const KEY = 'terramania-records';

  RF.ACHIEVEMENTS = [
    { id: 'firstWin', name: 'FIRST BLOOD', desc: 'WIN YOUR FIRST MATCH' },
    { id: 'flawless', name: 'UNTOUCHABLE', desc: 'WIN A ROUND WITHOUT TAKING DAMAGE' },
    { id: 'combo5', name: 'COMBO ROOKIE', desc: 'LAND A 5-HIT COMBO' },
    { id: 'combo10', name: 'COMBO MASTER', desc: 'LAND A 10-HIT COMBO' },
    { id: 'finisher', name: 'FINISH HIM', desc: 'PERFORM A FINISHER' },
    { id: 'brutality', name: 'BRUTAL', desc: 'PERFORM A BRUTALITY' },
    { id: 'transition', name: 'WRECKING BALL', desc: 'SMASH SOMEONE THROUGH A WALL' },
    { id: 'hazard', name: 'HOT STUFF', desc: 'KNOCK SOMEONE INTO A STAGE HAZARD' },
    { id: 'super', name: 'SUPERSTAR', desc: 'LAND A SUPER' },
    { id: 'breaker', name: 'NOT TODAY', desc: 'LAND A COMBO BREAKER' },
    { id: 'perfect10', name: 'PERFECTIONIST', desc: '10 PERFECT BLOCKS (TOTAL)' },
    { id: 'taunt10', name: 'TRASH TALKER', desc: 'FINISH 10 TAUNTS (TOTAL)' },
    { id: 'arcade', name: 'CHAMPION', desc: 'BEAT ARCADE MODE' },
    { id: 'survival5', name: 'SURVIVOR', desc: 'WIN 5 IN A ROW IN SURVIVAL' },
    { id: 'survival10', name: 'IRON WILL', desc: 'WIN 10 IN A ROW IN SURVIVAL' },
    { id: 'trials', name: 'TEACHER\'S PET', desc: 'CLEAR ALL 8 COMBO TRIALS' },
    { id: 'roster', name: 'HALL MONITOR', desc: 'WIN A MATCH WITH EVERY FIGHTER' },
  ];

  const blank = () => ({ wins: {}, played: {}, counts: {}, best: { combo: 0, survival: 0 }, unlocked: {}, trials: [] });
  let data = blank();
  try { data = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* no storage: this session only */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } };

  RF.records = {
    get data() { return data; },

    // Unlock an achievement (shows a pop-up the first time).
    unlock(id) {
      if (data.unlocked[id]) return;
      const a = RF.ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      data.unlocked[id] = Date.now();
      save();
      if (RF.game) RF.game.achievement = { a, t: 240 };
      if (RF.audio) RF.audio.sfx('perfect');
    },

    count(what, n = 1) {
      data.counts[what] = (data.counts[what] || 0) + n;
      if (what === 'perfect' && data.counts.perfect >= 10) this.unlock('perfect10');
      if (what === 'taunt' && data.counts.taunt >= 10) this.unlock('taunt10');
      save();
    },

    combo(n) {
      if (n > data.best.combo) { data.best.combo = n; save(); }
      if (n >= 5) this.unlock('combo5');
      if (n >= 10) this.unlock('combo10');
    },

    match(charId, won) {
      data.played[charId] = (data.played[charId] || 0) + 1;
      if (won) {
        data.wins[charId] = (data.wins[charId] || 0) + 1;
        this.unlock('firstWin');
        if (RF.CHARACTERS.every((c) => data.wins[c.id])) this.unlock('roster');
      }
      save();
    },

    survival(streak) {
      if (streak > data.best.survival) { data.best.survival = streak; save(); }
      if (streak >= 5) this.unlock('survival5');
      if (streak >= 10) this.unlock('survival10');
    },

    trial(n) {
      if (!data.trials.includes(n)) { data.trials.push(n); save(); }
      if (data.trials.length >= RF.TRIALS.length) this.unlock('trials');
    },

    reset() { data = blank(); save(); },
  };
})();
