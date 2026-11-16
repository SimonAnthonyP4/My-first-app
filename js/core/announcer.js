// The announcer: a deep arena voice ("ROUND ONE... FIGHT!", "FINISH THEM!") using the
// browser's built-in speech synthesis. No audio files. Toggle in Settings.
(function () {
  const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  let voice = null;

  function pickVoice() {
    const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    // Prefer a deep male English voice when the system has one.
    const en = vs.filter((v) => /^en/i.test(v.lang));
    voice = en.find((v) => /daniel|alex|fred|david|guy|male|google uk english male/i.test(v.name)) || en[0] || vs[0] || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice);
  }

  RF.announcer = {
    // say('FIGHT!') - interrupt: cut off whatever is being said first (for big moments).
    say(text, { interrupt = true, rate = 0.82, pitch = 0.05 } = {}) {
      if (!RF.CONFIG.ANNOUNCER || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      if (RF.audio && (RF.audio.muted || !RF.audio.ctx)) return;
      try {
        if (interrupt) speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.toLowerCase().replace(/dr\./g, 'doctor'));
        if (voice) u.voice = voice;
        u.rate = rate; u.pitch = pitch;
        u.volume = Math.min(1, (RF.CONFIG.SFX_VOLUME || 0.8) * 1.2);
        speechSynthesis.speak(u);
      } catch (e) { /* speech not available: stay silent */ }
    },
    number(n) { return WORDS[n] || String(n); },
  };
})();
