// UNLOCKS: costumes and a CPU level you earn. Nothing here is stored as a flag you could lose:
// each reward is worked out from what the player has actually done (story ranks, records, the
// rift tower), so progress made before this existed counts too. check() pops up a trophy the
// first time something becomes available.
//
// To add one: an entry in RF.UNLOCKS with a `test()`; a costume gets `lock: '<id>'` in
// render/sprites.js; a setting option gets a third item, e.g. ['nightmare', 'NIGHTMARE', 'nightmare'].
(function () {
  const KEY = 'terramania-unlocks-seen';
  const json = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  const story = () => (RF.storyProgress ? RF.storyProgress.get() : {});

  RF.UNLOCKS = [
    { id: 'gold', kind: 'COSTUME', name: 'GOLDEN', how: 'EARN AN S RANK IN ANY STORY CHAPTER', test: () => Object.values(story().ranks || {}).includes('S') },
    { id: 'blood', kind: 'COSTUME', name: 'BLOOD', how: 'PERFORM 5 BRUTALITIES', test: () => ((RF.records.data.counts || {}).brutalities || 0) >= 5 },
    { id: 'noir', kind: 'COSTUME', name: 'NOIR', how: 'FINISH THE BONUS CHAPTER: MOVIE NIGHT', test: () => !!(story().ranks || {})['MOVIE NIGHT'] },
    { id: 'rift', kind: 'COSTUME', name: 'RIFT', how: 'CLEAR THE RIFT TOWER', test: () => !!json('terramania-tower').cleared },
    { id: 'nightmare', kind: 'CPU LEVEL', name: 'NIGHTMARE', how: 'FINISH THE STORY (SETTINGS: CPU DIFFICULTY)', test: () => !!story().done },
  ];

  RF.unlocks = {
    has(id) { const u = RF.UNLOCKS.find((x) => x.id === id); return !u || !!u.test(); },
    // a trophy pop-up for anything newly earned (the first run after an update stays quiet)
    check() {
      const seen = json(KEY), first = !Object.keys(seen).length;
      for (const u of RF.UNLOCKS) {
        if (!u.test() || seen[u.id]) continue;
        seen[u.id] = 1;
        if (!first && RF.game) { RF.game.achievement = { a: { name: 'UNLOCKED: ' + u.name, desc: u.kind + ' - ' + u.how.split(' (')[0] }, t: 260 }; if (RF.audio) RF.audio.sfx('perfect'); }
      }
      try { localStorage.setItem(KEY, JSON.stringify(Object.keys(seen).length ? seen : { none: 1 })); } catch (e) { /* ignore */ }
    },
  };
  // the next costume, skipping any that are still locked
  RF.nextCostume = (n, dir = 1) => {
    const len = RF.COSTUMES.length;
    for (let i = 1; i <= len; i++) {
      const c = (((n + dir * i) % len) + len) % len, lock = RF.COSTUMES[c].lock;
      if (!lock || RF.unlocks.has(lock)) return c;
    }
    return 0;
  };
})();
