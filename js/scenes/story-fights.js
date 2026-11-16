// STORY MODE: fights in the middle of a scene.
//   { brawl: { play, vs, stage, name?, mid?, cpu?, boss?, rounds?, plain? } }
// The scene stops where it is, the fight is played (one round unless `rounds` says otherwise,
// against the rift version of `vs` unless `plain`), and on a win the SAME scene carries on from
// the next step: same cast, same camera, same quick-time tally. Lose and you retry the fight.
// (A chapter's own `fight` still sits between its intro and its outro, as before.)
// Also here: BONUS chapters (`side: true`): always open from the story menu, outside the main run.
(function () {
  const K = RF.storyKit, P = RF.StoryScene.prototype;
  const amb = K.amb, ambSet = amb.set.bind(amb);
  amb.set = function (list) { amb.last = list; return ambSet(list); };

  const instantExtra = P.instantExtra;
  P.instantExtra = function (s) {
    if (s.brawl) { this.startBrawl(s.brawl); return false; }
    return instantExtra ? instantExtra.call(this, s) : false;
  };

  P.startBrawl = function (f) {
    const hero = this.resolve(f.play) || RF.STORY.heroes[0];
    const p1 = RF.getCharacter(hero), foe = RF.getCharacter(this.resolve(f.vs));
    const p2 = f.plain ? Object.assign({}, foe) : RF.riftDef(foe);
    if (f.name) p2.name = f.name;
    this.paused = { score: RF.storyScore && RF.storyScore.current, amb: amb.last };
    const tally = K.run.tally || { perfect: 0, good: 0 };
    K.leaveStory();
    this.game.setScene(new RF.VersusScene(this.game, {
      p1, p2, p2Alt: p1.id === p2.id, stage: f.stage || (this.bgDef && this.bgDef.id) || 'court', cpu: true, cpuLevel: f.cpu || 'normal', boss: f.boss || 0,
      roundsToWin: f.rounds || 1,
      story: { index: this.index, mid: f.mid, hero: this.hero || hero, resume: this, meter: Math.min(RF.CONFIG.SUPER_MAX, tally.perfect * 60 + tally.good * 25) },
    }));
  };

  // back from the fight: the same scene, faded in, carrying on
  P.afterBrawl = function () {
    const p = this.paused || {}; this.paused = null;
    K.setMusic('silence');
    if (RF.storyScore) RF.storyScore.set(p.score || null);
    amb.set(p.amb || null);
    this.fadeA = 1; this.lock = 20;
    this.steps.splice(this.i + 1, 0, { fade: ['in', 24] });
    this.next();
  };

  const endMenu = RF.storyEndMenu;
  RF.storyEndMenu = function (scene, won) {
    const st = scene.opts.story;
    if (won && st.resume) return new RF.ListMenu([{ label: 'CONTINUE STORY', onSelect: () => { scene.game.setScene(st.resume); st.resume.afterBrawl(); } }]);
    return endMenu(scene, won);
  };
})();
