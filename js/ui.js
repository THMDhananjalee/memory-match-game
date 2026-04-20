/**
 * ui.js — UI Controller
 *
 * ARCHITECTURE NOTE:
 * All DOM reads and writes are isolated here.
 * Game logic (game.js) never touches the DOM directly — it calls UI methods.
 * This is the View layer in an MVC separation.
 *
 * Benefit: if you migrate to React/Vue later, you only rewrite this file.
 * Game logic and state remain untouched.
 */

const UI = (() => {

  // ── Screen Registry ────────────────────────────────────────────────
  const SCREENS = {
    start:         document.getElementById("screen-start"),
    memorize:      document.getElementById("screen-memorize"),
    play:          document.getElementById("screen-play"),
    levelComplete: document.getElementById("screen-level-complete"),
    gameOver:      document.getElementById("screen-game-over"),
    victory:       document.getElementById("screen-victory"),
  };

  const pauseOverlay = document.getElementById("pause-overlay");

  /** Shows exactly one screen, hides all others. */
  function showScreen(name) {
    Object.entries(SCREENS).forEach(([key, el]) => {
      el.classList.toggle("active", key === name);
    });
  }

  // ── HUD (Heads-Up Display) ─────────────────────────────────────────

  function updateHUD(state, level) {
    document.getElementById("play-level").textContent = state.currentLevel;
    document.getElementById("play-score").textContent = state.totalScore + state.levelScore;
    document.getElementById("play-moves").textContent = state.moves;
    document.getElementById("play-timer").textContent = state.timeRemaining;

    // Change timer colour when time is low
    const timerEl = document.getElementById("play-timer");
    timerEl.classList.toggle("timer-urgent", state.timeRemaining <= 10);
    timerEl.classList.toggle("timer-warning", state.timeRemaining > 10 && state.timeRemaining <= 20);

    // Progress bar: matched groups / total groups
    const pct = level ? (state.matchesFound / state.totalGroups) * 100 : 0;
    document.getElementById("level-progress-bar").style.width = pct + "%";

    // Matches remaining
    const left = level ? state.totalGroups - state.matchesFound : 0;
    document.getElementById("matches-left").textContent = `${left} left`;
    document.getElementById("play-rule-text").textContent = level ? level.label : "";
  }

  // ── Memorize Phase UI ─────────────────────────────────────────────

  /** Sets up the memorize screen header for a given level. */
  function setupMemorizeScreen(level) {
    document.getElementById("mem-level-num").textContent = level.id;
    document.getElementById("mem-rule-text").textContent = level.label;
    document.getElementById("mem-seconds").textContent = level.memorizeSeconds;
    document.getElementById("mem-countdown").textContent = level.memorizeSeconds;
    updateCountdownRing(1); // full ring
  }

  /**
   * Animates the SVG countdown ring.
   * @param {number} fraction - 0 (empty) to 1 (full)
   */
  function updateCountdownRing(fraction) {
    const ring = document.getElementById("ring-progress");
    const r = 24;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - fraction);
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = offset;

    document.getElementById("mem-countdown").textContent =
      document.getElementById("mem-seconds").textContent;
  }

  function setCountdownNumber(n) {
    document.getElementById("mem-countdown").textContent = n;
    document.getElementById("mem-seconds").textContent = n;
  }

  // ── Card Visual Feedback ──────────────────────────────────────────

  /** Flips a card face-up. */
  function flipCard(cardEl) {
    cardEl.classList.add("flipped");
  }

  /** Flips a card face-down. */
  function unflipCard(cardEl) {
    cardEl.classList.remove("flipped");
  }

  /**
   * Marks a group of cards as matched with a success animation.
   * CSS handles the visual; we just apply the class.
   */
  function markMatched(cards) {
    cards.forEach(card => {
      card.classList.add("matched");
      card.dataset.matched = "true";
      card.setAttribute("aria-disabled", "true");
    });
  }

  /**
   * Shakes cards to signal a mismatch, then unflips them.
   * @param {HTMLElement[]} cards
   * @param {Function} callback - called after animation completes
   */
  function animateMismatch(cards, callback) {
    cards.forEach(card => card.classList.add("shake"));
    setTimeout(() => {
      cards.forEach(card => {
        card.classList.remove("shake");
        UI.unflipCard(card);
      });
      if (callback) callback();
    }, 700);
  }

  // ── Combo Display ─────────────────────────────────────────────────

  /** Shows the combo label briefly in the centre of the screen. */
  function showCombo(count) {
    const el = document.getElementById("combo-display");
    const text = document.getElementById("combo-text");
    const labels = ["", "", "2× Combo!", "3× Combo!", "4× Combo!!", "5× Combo!!!", "UNSTOPPABLE!!!"];
    text.textContent = labels[Math.min(count, labels.length - 1)] || `${count}× Combo!`;
    el.classList.remove("hidden");
    el.classList.add("pop");
    setTimeout(() => {
      el.classList.remove("pop");
      el.classList.add("hidden");
    }, 900);
  }

  // ── Level Complete Screen ─────────────────────────────────────────

  function showLevelComplete(level, state) {
    document.getElementById("complete-level").textContent = level.id;
    document.getElementById("stat-score").textContent = state.levelScore;
    document.getElementById("stat-moves").textContent = state.moves;
    document.getElementById("stat-time").textContent =
      (level.timeLimit - state.timeRemaining) + "s";

    // Star rating
    const frac = state.timeRemaining / level.timeLimit;
    let stars = "⭐";
    if (frac >= SCORE_CONFIG.starThresholds.three) stars = "⭐⭐⭐";
    else if (frac >= SCORE_CONFIG.starThresholds.two) stars = "⭐⭐";
    document.getElementById("stat-stars").textContent = stars;

    // Emoji icon based on level
    const icons = ["🌱","🌿","🌳","🌺","🎯","⚡","🔥","💎","👑","🏆"];
    document.getElementById("complete-icon").textContent = icons[(level.id - 1)] || "✨";

    // Hide "Next Level" button on level 10
    const nextBtn = document.getElementById("btn-next-level");
    nextBtn.style.display = level.id >= LEVELS.length ? "none" : "";

    showScreen("levelComplete");
  }

  // ── Game Over Screen ──────────────────────────────────────────────

  function showGameOver(state) {
    document.getElementById("go-level").textContent = state.currentLevel;
    document.getElementById("go-matches").textContent = state.matchesFound;
    showScreen("gameOver");
  }

  // ── Victory Screen ────────────────────────────────────────────────

  function showVictory(totalScore) {
    document.getElementById("final-score").textContent = totalScore;
    spawnConfetti();
    showScreen("victory");
  }

  /** Spawns CSS confetti pieces. */
  function spawnConfetti() {
    const container = document.getElementById("confetti-container");
    container.innerHTML = "";
    const colors = ["#7F77DD","#D4537E","#1D9E75","#EF9F27","#378ADD","#E24B4A"];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 2}s;
        animation-duration: ${2 + Math.random() * 2}s;
        width: ${6 + Math.random() * 8}px;
        height: ${6 + Math.random() * 8}px;
        border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
      `;
      container.appendChild(piece);
    }
  }

  // ── Pause ─────────────────────────────────────────────────────────

  function showPause() { pauseOverlay.classList.remove("hidden"); }
  function hidePause() { pauseOverlay.classList.add("hidden"); }

  // ── Sound Button ──────────────────────────────────────────────────

  function updateSoundButton(muted) {
    const icon = document.getElementById("sound-icon");
    const btn  = document.getElementById("btn-sound-toggle");
    if (icon) icon.textContent = muted ? "🔇" : "🔊";
    if (btn)  btn.lastChild.textContent = muted ? " Sound Off" : " Sound On";
  }

  // ── Public API ─────────────────────────────────────────────────────

  return {
    showScreen,
    updateHUD,
    setupMemorizeScreen,
    updateCountdownRing,
    setCountdownNumber,
    flipCard,
    unflipCard,
    markMatched,
    animateMismatch,
    showCombo,
    showLevelComplete,
    showGameOver,
    showVictory,
    showPause,
    hidePause,
    updateSoundButton,
  };
})();
