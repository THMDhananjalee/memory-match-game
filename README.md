# 🃏 Memory Match — Portfolio Edition

> A professional-grade progressive memory card game featuring 10 levels, triplets/quads/quints mechanics, a memorization phase, procedural audio, and smooth animations. Built with vanilla JavaScript and no external dependencies.

**[Live Demo](#)** · **[License: MIT](#)**

---

## Table of Contents

1. [Features](#features)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Module Breakdown](#module-breakdown)
5. [State Management](#state-management)
6. [Level Design System](#level-design-system)
7. [Audio System](#audio-system)
8. [Key Algorithms](#key-algorithms)
9. [Scoring System](#scoring-system)
10. [Running Locally](#running-locally)
11. [Engineering Decisions (Interview Notes)](#engineering-decisions-interview-notes)

---

## Features

| Feature | Details |
|---|---|
| **10 Progressive Levels** | Grid grows from 4×3 to 6×5; groupSize escalates from pairs → triplets → quads → quints |
| **Memorization Phase** | Cards revealed face-up with a countdown SVG ring before each level |
| **Dynamic Matching** | Match 2, 3, 4, or 5 identical cards per group depending on level |
| **Combo System** | Consecutive matches multiply bonus points |
| **Procedural Audio** | All sound effects and background music synthesised via Web Audio API — zero audio files |
| **Modular Codebase** | 6 separate JS modules + 2 CSS files, each with one responsibility |
| **Accessibility** | Keyboard navigation, ARIA labels, screen-reader hint |
| **Responsive** | Adapts from 360px to desktop; card size auto-calculated |

---

## Project Structure

```
memory-match/
├── index.html              # Entry point — HTML structure only
├── css/
│   ├── style.css           # Layout, components, design system
│   └── animations.css      # All @keyframes, transitions, motion
└── js/
    ├── config.js           # Level definitions & scoring constants
    ├── audio.js            # AudioManager singleton (Web Audio API)
    ├── state.js            # Centralised state store
    ├── grid.js             # Card deck generation & DOM grid builder
    ├── ui.js               # DOM updates & screen transitions (View layer)
    ├── game.js             # Game engine & lifecycle (Controller layer)
    └── main.js             # Bootstrap & event wiring
```

---

## Architecture Overview

The project follows **MVC (Model-View-Controller)** with a single-source-of-truth state store:

```
┌─────────────┐     reads/writes     ┌──────────────┐
│  state.js   │◄────────────────────►│   game.js    │
│  (Model)    │                      │ (Controller)  │
└─────────────┘                      └──────┬───────┘
                                            │ calls
                                     ┌──────▼───────┐
                                     │    ui.js     │
                                     │   (View)     │
                                     └─────────────-┘
                                            │ uses
                               ┌────────────┴──────────┐
                          ┌────▼────┐           ┌──────▼──────┐
                          │ grid.js │           │  audio.js   │
                          │(Builder)│           │  (Service)  │
                          └─────────┘           └─────────────┘
```

**Key principle:** `game.js` is the only module that calls both `State` and `UI`. No other module calls both. This prevents circular dependencies and makes each module independently testable.

---

## Module Breakdown

### `config.js` — Data Layer
- Exports `LEVELS` array and `SCORE_CONFIG` object
- Both are frozen with `Object.freeze()` to prevent accidental mutation
- **Adding a new level = one new object in the array.** The engine requires no changes.

### `audio.js` — AudioManager Singleton
- Wraps the Web Audio API behind a simple `play(soundName)` interface
- All sounds synthesised procedurally — no audio files, no loading states, no CORS issues
- AudioContext created lazily on first user interaction (browser autoplay policy compliance)
- Background music uses an LFO-modulated oscillator for ambient texture

### `state.js` — State Store
- Single private `_state` object; never exposed directly
- `State.get()` returns a shallow copy (immutable snapshot)
- `State.set(partial)` merges updates — mirrors Redux's `dispatch`
- `State.resetLevel()` preserves `totalScore` and `currentLevel` while resetting all runtime fields

### `grid.js` — GridBuilder
- Builds decks using Fisher-Yates shuffle (O(n), unbiased)
- Creates card DOM elements with data attributes as identity (no separate lookup map)
- `buildGridFromSequence()` rebuilds the play grid in identical order to the memorize grid, so the layout is consistent across phases

### `ui.js` — View Layer
- Owns all `document.getElementById` calls
- Game logic never queries or mutates the DOM — it calls UI methods
- Screen transitions via `.screen.active` CSS class toggle
- Confetti generated programmatically (no images)

### `game.js` — Game Engine
- Memorize phase: builds grid face-up, runs countdown, flips face-down with stagger
- Match evaluation: `Array.every()` checks all flipped cards share the same emoji
- State machine: `phase` field controls which operations are valid at any time
- Timer: `setInterval` with pause guard (`if (state.isPaused) return`)

### `main.js` — Bootstrap
- Single `DOMContentLoaded` listener
- Wires all button `click` events to their handlers
- No game logic here — purely event wiring

---

## State Management

```js
// Single source of truth
State.get()   // → immutable snapshot
State.set({}) // → merge update
State.reset() // → full reset
State.resetLevel() // → preserve score/level, reset runtime

// Example state snapshot:
{
  currentLevel: 4,
  totalScore: 1250,
  moves: 7,
  matchesFound: 2,
  totalGroups: 3,
  timeRemaining: 58,
  comboCount: 2,
  levelScore: 300,
  flippedCards: [<div>, <div>, <div>],
  isLocked: false,
  isPaused: false,
  phase: "play",
  soundEnabled: true
}
```

**Why not React/Redux?** The state surface is small (< 15 fields) and transitions are simple (no async, no derived state). Introducing a framework would add complexity without benefit. If the game grew to include leaderboards, user profiles, or real-time multiplayer, migrating `state.js` to a Redux store or Zustand would be straightforward — the rest of the codebase wouldn't change.

---

## Level Design System

```js
{
  id: 7,
  gridCols: 4,
  gridRows: 4,
  groupSize: 4,        // 4 cards must be selected to form a match
  memorizeSeconds: 7,  // reveal duration
  timeLimit: 90,       // seconds to complete
  label: "Match QUADS — find 4 of each!",
  emojis: ["🔥","💧","🌿","🌊"],
}
```

**Validation rule:** `gridCols × gridRows` must equal `emojis.length × groupSize`. The engine trusts this implicitly — a linter or unit test could assert it at build time.

**Difficulty escalation axes:**
- Grid size (more cards → more positions to remember)
- Group size (pairs → triplets → quads → quints)
- Memorize time (shorter window → harder)
- Time limit (tighter constraint with larger grids)

---

## Audio System

All sounds use the Web Audio API's oscillator + gain node chain:

```
OscillatorNode → GainNode → AudioContext.destination
```

The gain node is ramped to 0 with `exponentialRampToValueAtTime` for natural fade-out. Staggered `delay` parameters produce arpeggios (the match sound) without needing multiple `AudioContext` instances.

**Browser autoplay policy:** `AudioContext` is created inside the first user-gesture handler (`btn-start` click), satisfying all modern browsers' autoplay restrictions.

---

## Key Algorithms

### Fisher-Yates Shuffle (`grid.js`)

```js
function fisherYates(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

- **O(n)** time, O(1) space
- Produces a uniformly random permutation (unlike `arr.sort(() => Math.random() - 0.5)` which is biased and O(n log n))

### Match Evaluation (`game.js`)

```js
const referenceEmoji = cards[0].dataset.emoji;
const isMatch = cards.every(c => c.dataset.emoji === referenceEmoji);
```

- Works for any `groupSize` (2–5) without branching
- O(groupSize) — effectively O(1) since groupSize ≤ 5

### Input Lock Pattern (`game.js`)

```js
State.set({ isLocked: true });
// ... async animation ...
State.set({ isLocked: false });
```

Prevents card clicks during mismatch animation without disabling event listeners. Simpler and more robust than removing/re-adding listeners.

---

## Scoring System

```
matchPoints = baseMatchPoints                        // 100
            + (groupSize - 2) × groupSizeMultiplier // 0 / 50 / 100 / 150
            + (comboCount - 1) × comboBonus         // 0 / 25 / 50 / ...

levelBonus  = timeRemaining × timeBonus             // awarded at level end
```

Star rating is based on fraction of time remaining:
- ⭐⭐⭐ → > 50% time left
- ⭐⭐   → > 20% time left
- ⭐     → anything else

---

## Running Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/memory-match.git
cd memory-match

# Option A: Python simple server
python3 -m http.server 8080

# Option B: Node.js (if you have npx)
npx serve .

# Then open: http://localhost:8080
```

> ⚠️ Must be served over HTTP (not opened as a `file://` URL) for the Web Audio API to work correctly in some browsers.

---

## Engineering Decisions (Interview Notes)

### "Why vanilla JS instead of React?"

This project deliberately avoids frameworks to demonstrate a strong foundation. The state surface is small, there's no async data fetching, and the DOM mutations are minimal. Adding React would increase bundle size by ~40KB and add abstraction without solving any real problem this app has. If the game needed real-time multiplayer or complex derived state, that calculation would change.

### "How does your state management scale?"

`state.js` follows the same principles as Redux: single source of truth, immutable reads (`get()` returns a copy), explicit mutations (`set()`). Migrating to Redux or Zustand would mean replacing `state.js` with a store file — the rest of the codebase stays identical, because `game.js` already talks to state through an abstraction.

### "Why Fisher-Yates over `array.sort()`?"

`array.sort(() => Math.random() - 0.5)` is O(n log n) and — critically — biased. Different JS engines implement sort differently; some elements end up more likely to appear at certain positions than others. Fisher-Yates is O(n) and mathematically proven to produce uniform distributions.

### "How would you add an 11th level?"

Add one object to the `LEVELS` array in `config.js`. The engine, UI, scoring, and audio require zero changes. This is the Open/Closed Principle in practice.

### "How do you prevent bugs from rapid clicking?"

The `isLocked` flag in state blocks all card interaction during mismatch animations. It's set synchronously before any async operation and cleared in the animation callback. No race conditions are possible because JS is single-threaded — the lock is always set before the timeout fires.

### "How is the memorize-to-play transition handled?"

`GridBuilder.buildGridFromSequence()` copies the emoji order from the memorize grid's DOM data attributes to rebuild the play grid in identical order. This means the player sees the same card positions in both phases — crucial for the game to be fair.

---

*Built with ♥ and vanilla JavaScript. No bundlers, no frameworks, no dependencies.*
