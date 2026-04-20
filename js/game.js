/**
 * game.js — Core Game Engine
 *
 * ARCHITECTURE NOTE:
 * This is the Controller in MVC. It orchestrates State, UI, GridBuilder,
 * and AudioManager — but never touches DOM directly and never stores state locally.
 *
 * Key responsibilities:
 *  1. Memorize phase  — reveal cards, countdown, flip face-down
 *  2. Play phase      — card click handling, match evaluation, scoring
 *  3. Timer           — countdown loop with pause support
 *  4. Level lifecycle — start, complete, fail, advance
 *
 * STATE MACHINE (phase transitions):
 *
 *   start → memorize → play → levelComplete → memorize (next level)
 *                          ↘ gameOver
 *   (all levels done) play → victory
 */

const Game = (() => {

  let timerInterval = null;
  let memorizeTimeout = null;
  let memCards = [];        // cards from memorize phase (preserve order for play phase)
  let playCards = [];       // cards in the play phase

  // ── Level Lifecycle ────────────────────────────────────────────────

  /**
   * Starts the memorize phase for the current level.
   * Cards are shown face-up for `level.memorizeSeconds`, then flipped face-down.
   */
  function startMemorizePhase() {
    const state = State.get();
    const level = LEVELS[state.currentLevel - 1];

    State.set({ phase: "memorize", isLocked: true });
    State.resetLevel();
    State.set({ phase: "memorize", isLocked: true });

    UI.showScreen("memorize");
    UI.setupMemorizeScreen(level);

    // Build the memorize grid with all cards face-up
    const memContainer = document.getElementById("mem-grid");
    memCards = GridBuilder.buildGrid(memContainer, level, true);

    AudioManager.play("reveal");

    // Countdown ticker
    let secondsLeft = level.memorizeSeconds;
    const totalSeconds = secondsLeft;

    const ticker = setInterval(() => {
      secondsLeft--;
      UI.setCountdownNumber(secondsLeft);
      UI.updateCountdownRing(secondsLeft / totalSeconds);
      AudioManager.play(secondsLeft <= 3 ? "urgentTick" : "tick");

      if (secondsLeft <= 0) {
        clearInterval(ticker);
        beginPlayPhase(level);
      }
    }, 1000);
  }

  /**
   * Transitions from memorize → play.
   * Builds the play grid in the same card order so the layout is identical.
   */
  function beginPlayPhase(level) {
    // Flip all memorize cards face-down with stagger animation
    GridBuilder.flipAllFaceDown(memCards);

    // Short delay to let the animation finish before switching screen
    setTimeout(() => {
      const playContainer = document.getElementById("play-grid");
      playCards = GridBuilder.buildGridFromSequence(playContainer, memCards, level);

      State.set({
        phase: "play",
        isLocked: false,
        timeRemaining: level.timeLimit,
        totalGroups: level.emojis.length,
      });

      UI.showScreen("play");
      UI.updateHUD(State.get(), level);
      attachCardListeners(playCards, level);
      startTimer(level);
    }, memCards.length * 40 + 200); // wait for stagger animation
  }

  // ── Timer ──────────────────────────────────────────────────────────

  function startTimer(level) {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const state = State.get();
      if (state.isPaused) return;

      const newTime = state.timeRemaining - 1;
      State.set({ timeRemaining: newTime });
      UI.updateHUD(State.get(), level);

      if (newTime <= 10) AudioManager.play("urgentTick");
      if (newTime <= 0) {
        clearInterval(timerInterval);
        endLevelFail();
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // ── Card Interaction ───────────────────────────────────────────────

  /**
   * Attaches click (and keyboard) listeners to all play-phase cards.
   * Each card calls handleCardClick when activated.
   */
  function attachCardListeners(cards, level) {
    cards.forEach(card => {
      card.addEventListener("click", () => handleCardClick(card, level));
      // Keyboard accessibility: Enter/Space triggers flip
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick(card, level);
        }
      });
    });
  }

  /**
   * Core card-click handler.
   *
   * LOGIC:
   * 1. Guard clauses: skip if locked, already matched, or already flipped
   * 2. Flip the card face-up, add to flippedCards
   * 3. If flippedCards.length === groupSize → evaluate match
   *
   * @param {HTMLElement} cardEl
   * @param {Object} level
   */
  function handleCardClick(cardEl, level) {
    const state = State.get();

    // Guard: don't allow clicks while animating, paused, or on invalid cards
    if (state.isLocked) return;
    if (state.isPaused) return;
    if (cardEl.dataset.matched === "true") return;
    if (state.flippedCards.includes(cardEl)) return;

    // Flip the card
    AudioManager.play("flip");
    UI.flipCard(cardEl);
    State.push("flippedCards", cardEl);

    // If we've reached the required group size, evaluate
    if (State.get().flippedCards.length === level.groupSize) {
      State.increment("moves");
      State.set({ isLocked: true }); // prevent further clicks during evaluation
      UI.updateHUD(State.get(), level);

      // Small delay so the last card's flip animation is visible before evaluating
      setTimeout(() => evaluateSelection(level), 300);
    }
  }

  /**
   * Evaluates whether the currently flipped cards form a valid match.
   *
   * Match condition: all cards in flippedCards share the same emoji.
   * Uses Array.every() to compare all against the first card's emoji.
   *
   * INTERVIEW NOTE: Why not a Map/Set? Because groupSize can be 2-5 and
   * we need to verify all selected cards match — not just uniqueness.
   * every() is O(groupSize) and self-documenting.
   */
  function evaluateSelection(level) {
    const state = State.get();
    const cards = state.flippedCards;
    const referenceEmoji = cards[0].dataset.emoji;
    const isMatch = cards.every(c => c.dataset.emoji === referenceEmoji);

    if (isMatch) {
      handleMatch(cards, level);
    } else {
      handleMismatch(cards);
    }
  }

  function handleMatch(cards, level) {
    // Increment combo before scoring (combo is how many consecutive matches)
    State.increment("comboCount");
    const state = State.get();

    // Calculate points
    const groupBonus = (level.groupSize - 2) * SCORE_CONFIG.groupSizeMultiplier;
    const comboBonus = (state.comboCount - 1) * SCORE_CONFIG.comboBonus;
    const points = SCORE_CONFIG.baseMatchPoints + groupBonus + comboBonus;

    State.increment("levelScore", points);
    State.increment("matchesFound");
    State.set({ flippedCards: [], isLocked: false });

    UI.markMatched(cards);
    AudioManager.play("match");
    UI.updateHUD(State.get(), level);

    if (state.comboCount >= 2) {
      AudioManager.play("combo");
      UI.showCombo(state.comboCount);
    }

    // Check win condition
    if (State.get().matchesFound >= State.get().totalGroups) {
      stopTimer();
      setTimeout(() => endLevelSuccess(level), 400);
    }
  }

  function handleMismatch(cards) {
    State.set({ comboCount: 0 }); // reset combo on any mismatch
    AudioManager.play("mismatch");

    UI.animateMismatch(cards, () => {
      State.set({ flippedCards: [], isLocked: false });
    });
  }

  // ── Level End ──────────────────────────────────────────────────────

  function endLevelSuccess(level) {
    const state = State.get();
    // Time bonus: reward remaining seconds
    const timeBonus = state.timeRemaining * SCORE_CONFIG.timeBonus;
    const finalLevelScore = state.levelScore + timeBonus;

    State.set({ levelScore: finalLevelScore });
    State.increment("totalScore", finalLevelScore);

    AudioManager.play("levelComplete");
    State.set({ phase: "levelcomplete" });

    if (level.id >= LEVELS.length) {
      // All levels complete!
      setTimeout(() => {
        AudioManager.play("victory");
        UI.showVictory(State.get().totalScore);
      }, 600);
    } else {
      UI.showLevelComplete(level, State.get());
    }
  }

  function endLevelFail() {
    AudioManager.play("gameOver");
    State.set({ phase: "gameover" });
    UI.showGameOver(State.get());
  }

  // ── Navigation Actions ─────────────────────────────────────────────

  function advanceToNextLevel() {
    State.increment("currentLevel");
    startMemorizePhase();
  }

  function retryCurrentLevel() {
    startMemorizePhase();
  }

  function restartGame() {
    stopTimer();
    State.reset();
    startMemorizePhase();
  }

  function goHome() {
    stopTimer();
    State.reset();
    UI.showScreen("start");
  }

  function togglePause() {
    const state = State.get();
    if (state.phase !== "play") return;
    const nowPaused = !state.isPaused;
    State.set({ isPaused: nowPaused });
    if (nowPaused) {
      UI.showPause();
      AudioManager.stopMusic();
    } else {
      UI.hidePause();
      AudioManager.startMusic();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────

  return {
    startMemorizePhase,
    advanceToNextLevel,
    retryCurrentLevel,
    restartGame,
    goHome,
    togglePause,
    resumeGame() {
      State.set({ isPaused: false });
      UI.hidePause();
      AudioManager.startMusic();
    },
  };
})();
