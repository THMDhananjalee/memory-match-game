/**
 * main.js — Application Bootstrap & Event Wiring
 *
 * ARCHITECTURE NOTE:
 * This is the entry point. Its only jobs are:
 *  1. Wire all UI buttons to their Game/Audio handler functions
 *  2. Bootstrap the app on DOMContentLoaded
 *
 * Keeping event wiring separate means:
 *  - Buttons can be swapped or added without touching game logic
 *  - All user interactions are visible in one file (easy to audit)
 *  - No module needs to know which button triggers it
 */

document.addEventListener("DOMContentLoaded", () => {

  // ── Start Screen ───────────────────────────────────────────────────
  document.getElementById("btn-start").addEventListener("click", () => {
    AudioManager.init();
    AudioManager.play("click");
    AudioManager.startMusic();
    Game.startMemorizePhase();
  });

  document.getElementById("btn-sound-toggle").addEventListener("click", () => {
    const nowMuted = !AudioManager.isMuted();
    AudioManager.setMuted(nowMuted);
    State.set({ soundEnabled: !nowMuted });
    UI.updateSoundButton(nowMuted);

    if (!nowMuted) {
      AudioManager.init();
      AudioManager.play("click");
      // Only restart music if we're in a play phase
      if (State.get().phase === "play") AudioManager.startMusic();
    }
  });

  // ── Level Complete Screen ─────────────────────────────────────────
  document.getElementById("btn-next-level").addEventListener("click", () => {
    AudioManager.play("click");
    Game.advanceToNextLevel();
  });

  document.getElementById("btn-restart-level").addEventListener("click", () => {
    AudioManager.play("click");
    Game.retryCurrentLevel();
  });

  // ── Game Over Screen ──────────────────────────────────────────────
  document.getElementById("btn-retry").addEventListener("click", () => {
    AudioManager.play("click");
    Game.retryCurrentLevel();
  });

  document.getElementById("btn-home").addEventListener("click", () => {
    AudioManager.play("click");
    Game.goHome();
  });

  // ── Victory Screen ────────────────────────────────────────────────
  document.getElementById("btn-play-again").addEventListener("click", () => {
    AudioManager.play("click");
    Game.restartGame();
  });

  // ── Pause ─────────────────────────────────────────────────────────
  document.getElementById("btn-pause").addEventListener("click", () => {
    Game.togglePause();
  });

  document.getElementById("btn-resume").addEventListener("click", () => {
    AudioManager.play("click");
    Game.resumeGame();
  });

  document.getElementById("btn-home-pause").addEventListener("click", () => {
    AudioManager.play("click");
    Game.goHome();
  });

  // ── Keyboard shortcuts ────────────────────────────────────────────
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      Game.togglePause();
    }
  });

  // ── Initial sound button state ────────────────────────────────────
  UI.updateSoundButton(AudioManager.isMuted());

  console.log(
    "%cMemory Match — Portfolio Edition\n%cOpen source. Well-architected. Interview-ready.",
    "color:#7F77DD;font-size:18px;font-weight:bold",
    "color:#888;font-size:12px"
  );
});
