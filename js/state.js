/**
 * state.js — Centralised State Management
 *
 * ARCHITECTURE NOTE:
 * All mutable game state lives in one place. No module stores game data locally.
 * This mirrors the Flux/Redux pattern: a single source of truth.
 *
 * Why this matters in interviews:
 *  - Prevents state synchronisation bugs (no "which module has the real score?")
 *  - Makes debugging trivial: log State.get() and see everything
 *  - Enables features like save/load or undo by serialising/restoring one object
 *
 * Access pattern:
 *   State.get()              → read-only snapshot of full state
 *   State.set(partialState)  → merge partial updates
 *   State.reset()            → restore defaults
 */

const State = (() => {
  /** The single internal state object. Never exposed directly. */
  const _defaults = {
    // ── Progress ──────────────────────────────────────────
    currentLevel: 1,        // 1-indexed level number
    totalScore: 0,          // cumulative score across levels

    // ── Per-level runtime ─────────────────────────────────
    moves: 0,               // number of selection attempts this level
    matchesFound: 0,        // number of groups correctly matched
    totalGroups: 0,         // total groups to find in current level
    timeRemaining: 0,       // seconds left on the clock
    comboCount: 0,          // consecutive successful matches (no mismatch between)
    levelScore: 0,          // score earned in current level

    // ── Card selection tracking ───────────────────────────
    /**
     * flippedCards: Array of card DOM elements currently face-up but not yet matched.
     * When flippedCards.length === level.groupSize → evaluate match.
     */
    flippedCards: [],

    // ── Phase flags ───────────────────────────────────────
    isLocked: false,        // true while mismatch animation plays (blocks input)
    isPaused: false,        // true while pause overlay is shown
    phase: "start",         // "start" | "memorize" | "play" | "levelcomplete" | "gameover" | "victory"

    // ── Sound ─────────────────────────────────────────────
    soundEnabled: true,
  };

  // Deep-copy defaults into a working state object
  let _state = _deepCopy(_defaults);

  function _deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  return {
    /**
     * Returns a shallow copy of state so callers can't accidentally mutate it.
     * For flippedCards (array of DOM nodes, not serialisable), we expose the live ref.
     */
    get() {
      const snap = { ..._state };
      snap.flippedCards = _state.flippedCards; // live ref needed for DOM ops
      return snap;
    },

    /**
     * Merges a partial update into state.
     * @param {Object} partial - key/value pairs to update
     */
    set(partial) {
      Object.assign(_state, partial);
    },

    /** Resets per-level runtime fields while keeping totalScore & currentLevel. */
    resetLevel() {
      const keep = {
        currentLevel: _state.currentLevel,
        totalScore: _state.totalScore,
        soundEnabled: _state.soundEnabled,
        phase: _state.phase,
      };
      _state = { ..._deepCopy(_defaults), ...keep };
    },

    /** Full reset — back to game start. */
    reset() {
      const soundEnabled = _state.soundEnabled; // persist sound pref across sessions
      _state = _deepCopy(_defaults);
      _state.soundEnabled = soundEnabled;
    },

    /** Convenience: increment a numeric field by delta (default 1). */
    increment(key, delta = 1) {
      if (typeof _state[key] === "number") _state[key] += delta;
    },

    /** Convenience: push a value into an array field. */
    push(key, value) {
      if (Array.isArray(_state[key])) _state[key].push(value);
    },

    /** Debug helper: logs full state to console. */
    debug() {
      const snap = { ..._state, flippedCards: `[${_state.flippedCards.length} nodes]` };
      console.table(snap);
    },
  };
})();
