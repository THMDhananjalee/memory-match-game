/**
 * audio.js — Audio Manager (Web Audio API)
 *
 * ARCHITECTURE NOTE:
 * Uses the Web Audio API to synthesise all sounds procedurally —
 * no external audio files required, making the project fully self-contained.
 *
 * The AudioManager is a singleton exposed on `window.AudioManager`.
 * It is the ONLY module that touches AudioContext, keeping all audio
 * concerns isolated from game logic (Separation of Concerns).
 *
 * PUBLIC API:
 *   AudioManager.init()            — must be called once after a user gesture
 *   AudioManager.play(soundName)   — plays a named sound effect
 *   AudioManager.setMuted(bool)    — toggles global mute
 *   AudioManager.isMuted()         — returns current mute state
 *   AudioManager.startMusic()      — begins looping background music
 *   AudioManager.stopMusic()       — fades out and stops music
 */

const AudioManager = (() => {
  let ctx = null;           // AudioContext — created lazily after user gesture
  let musicNode = null;     // Reference to running music oscillators
  let musicGain = null;     // Master gain for music
  let muted = false;

  /** Lazily create (or resume) the AudioContext. */
  function ensureContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /**
   * Core helper — plays a simple oscillator tone.
   * @param {number} frequency - Hz
   * @param {string} type - OscillatorType ('sine'|'square'|'sawtooth'|'triangle')
   * @param {number} duration - seconds
   * @param {number} gain - 0–1 volume
   * @param {number} delay - seconds before starting
   */
  function playTone(frequency, type = "sine", duration = 0.15, gain = 0.3, delay = 0) {
    if (muted) return;
    const c = ensureContext();
    const osc = c.createOscillator();
    const gainNode = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime + delay);

    gainNode.gain.setValueAtTime(gain, c.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);

    osc.connect(gainNode);
    gainNode.connect(c.destination);

    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.01);
  }

  /** Plays a chord (multiple tones simultaneously). */
  function playChord(frequencies, type = "sine", duration = 0.3, gain = 0.2) {
    frequencies.forEach(f => playTone(f, type, duration, gain));
  }

  // ── Named Sound Library ────────────────────────────────────────────

  const SOUNDS = {
    /** Card flip — short neutral tick */
    flip() {
      playTone(440, "triangle", 0.08, 0.2);
    },

    /** Successful match — ascending happy arp */
    match() {
      [523, 659, 784, 1047].forEach((f, i) =>
        playTone(f, "sine", 0.12, 0.25, i * 0.07)
      );
    },

    /** Wrong combination — low thud */
    mismatch() {
      playTone(180, "sawtooth", 0.18, 0.3);
      playTone(160, "square",   0.14, 0.15, 0.05);
    },

    /** Level complete — triumphant fanfare */
    levelComplete() {
      const melody = [523, 659, 784, 659, 784, 1047];
      melody.forEach((f, i) => playTone(f, "sine", 0.18, 0.3, i * 0.1));
    },

    /** Combo hit — higher pitched sparkle */
    combo() {
      playChord([880, 1108, 1318], "sine", 0.15, 0.2);
    },

    /** Countdown tick */
    tick() {
      playTone(660, "square", 0.06, 0.15);
    },

    /** Final countdown beep (last 3 seconds) */
    urgentTick() {
      playTone(880, "square", 0.09, 0.25);
    },

    /** Card reveal during memorize phase */
    reveal() {
      playTone(330, "sine", 0.1, 0.15);
    },

    /** Game over */
    gameOver() {
      [440, 370, 330, 220].forEach((f, i) =>
        playTone(f, "sawtooth", 0.25, 0.3, i * 0.15)
      );
    },

    /** Victory — full fanfare */
    victory() {
      const melody = [523, 784, 1047, 784, 1047, 1319, 1047, 1319, 1568];
      melody.forEach((f, i) => playTone(f, "sine", 0.2, 0.35, i * 0.12));
    },

    /** Button click */
    click() {
      playTone(500, "sine", 0.06, 0.1);
    },
  };

  // ── Background Music ───────────────────────────────────────────────

  /**
   * Generates simple looping ambient music using filtered noise + bass.
   * Keeps the project self-contained without any audio assets.
   */
  function startMusic() {
    if (muted || musicNode) return;
    const c = ensureContext();

    musicGain = c.createGain();
    musicGain.gain.setValueAtTime(0, c.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.06, c.currentTime + 2);
    musicGain.connect(c.destination);

    // Ambient pad — slow LFO-modulated oscillator
    const pad = c.createOscillator();
    pad.type = "sine";
    pad.frequency.setValueAtTime(130.8, c.currentTime); // C3

    const lfo = c.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.3, c.currentTime);

    const lfoGain = c.createGain();
    lfoGain.gain.setValueAtTime(4, c.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(pad.frequency);

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, c.currentTime);

    pad.connect(filter);
    filter.connect(musicGain);

    pad.start();
    lfo.start();

    musicNode = { pad, lfo };
  }

  function stopMusic() {
    if (!musicGain || !musicNode) return;
    const c = ensureContext();
    musicGain.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
    setTimeout(() => {
      try { musicNode.pad.stop(); musicNode.lfo.stop(); } catch (_) {}
      musicNode = null;
      musicGain = null;
    }, 1600);
  }

  // ── Public API ─────────────────────────────────────────────────────

  return {
    init() {
      ensureContext();
    },

    play(soundName) {
      if (muted) return;
      if (SOUNDS[soundName]) {
        try { SOUNDS[soundName](); } catch (e) { /* silently fail */ }
      }
    },

    setMuted(value) {
      muted = Boolean(value);
      if (muted) stopMusic();
    },

    isMuted() { return muted; },

    startMusic,
    stopMusic,
  };
})();
