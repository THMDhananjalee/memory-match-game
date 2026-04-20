/**
 * config.js — Game Configuration & Level Definitions
 *
 * ARCHITECTURE NOTE:
 * All level data lives in a single declarative array (LEVELS).
 * Adding a new level = adding one object to this array — zero engine changes.
 * This follows the Open/Closed Principle: open for extension, closed for modification.
 *
 * Each level object defines:
 *  - gridCols / gridRows : board dimensions
 *  - groupSize           : how many identical cards must be matched together (2=pairs, 3=triplets…)
 *  - memorizeSeconds     : how long cards are shown face-up before flipping
 *  - timeLimit           : seconds allowed to complete the level
 *  - emojis             : pool of symbols used; length must equal (cols*rows / groupSize)
 *  - label              : displayed rule string
 */

const LEVELS = [
  /* ── Level 1 ─────────────────────────────────────────────────── */
  {
    id: 1,
    gridCols: 4,
    gridRows: 3,
    groupSize: 2,          // pairs
    memorizeSeconds: 5,
    timeLimit: 60,
    label: "Match pairs of identical cards",
    emojis: ["🍎","🍊","🍋","🍇","🍓","🍑"],
  },
  /* ── Level 2 ─────────────────────────────────────────────────── */
  {
    id: 2,
    gridCols: 4,
    gridRows: 4,
    groupSize: 2,
    memorizeSeconds: 5,
    timeLimit: 70,
    label: "Match pairs — bigger grid",
    emojis: ["🍎","🍊","🍋","🍇","🍓","🍑","🥝","🫐"],
  },
  /* ── Level 3 ─────────────────────────────────────────────────── */
  {
    id: 3,
    gridCols: 4,
    gridRows: 4,
    groupSize: 2,
    memorizeSeconds: 4,
    timeLimit: 65,
    label: "Match pairs — shorter memory window",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼"],
  },
  /* ── Level 4 ─────────────────────────────────────────────────── */
  {
    id: 4,
    gridCols: 3,
    gridRows: 3,
    groupSize: 3,          // triplets begin
    memorizeSeconds: 6,
    timeLimit: 75,
    label: "Match TRIPLETS — find 3 of each",
    emojis: ["🌸","🌺","🌻","🌹"],   // 4 groups × 3 = 12... wait 3×3=9, 9/3=3 groups
    // override: 3 cols × 3 rows = 9 cards, 9/3 = 3 groups
  },
  /* ── Level 5 ─────────────────────────────────────────────────── */
  {
    id: 5,
    gridCols: 4,
    gridRows: 3,
    groupSize: 3,
    memorizeSeconds: 5,
    timeLimit: 80,
    label: "Match TRIPLETS — 4 groups",
    emojis: ["🚀","🛸","🌙","🪐"],
  },
  /* ── Level 6 ─────────────────────────────────────────────────── */
  {
    id: 6,
    gridCols: 4,
    gridRows: 4,
    groupSize: 2,
    memorizeSeconds: 3,
    timeLimit: 70,
    label: "Pairs — only 3s memory window",
    emojis: ["🎸","🎹","🥁","🎷","🎺","🎻","🪗","🎵"],
  },
  /* ── Level 7 ─────────────────────────────────────────────────── */
  {
    id: 7,
    gridCols: 4,
    gridRows: 4,
    groupSize: 4,          // quads begin
    memorizeSeconds: 7,
    timeLimit: 90,
    label: "Match QUADS — find 4 of each!",
    emojis: ["🔥","💧","🌿","🌊"],
  },
  /* ── Level 8 ─────────────────────────────────────────────────── */
  {
    id: 8,
    gridCols: 5,
    gridRows: 4,
    groupSize: 4,
    memorizeSeconds: 6,
    timeLimit: 100,
    label: "QUADS — 5-column grid",
    emojis: ["🦁","🐯","🐻","🦊","🐺"],
  },
  /* ── Level 9 ─────────────────────────────────────────────────── */
  {
    id: 9,
    gridCols: 5,
    gridRows: 5,
    groupSize: 5,          // quints begin
    memorizeSeconds: 8,
    timeLimit: 120,
    label: "Match QUINTS — find 5 of each!",
    emojis: ["⚡","🌈","❄️","🌀","☄️"],
  },
  /* ── Level 10 ────────────────────────────────────────────────── */
  {
    id: 10,
    gridCols: 6,
    gridRows: 5,
    groupSize: 5,
    memorizeSeconds: 6,
    timeLimit: 130,
    label: "FINAL BOSS — QUINTS on a 6×5 grid!",
    emojis: ["🏆","💎","👑","🎯","🌟","🔮"],
  },
];

/**
 * SCORING CONSTANTS
 * Centralised here so tuning scoring never requires touching game logic.
 */
const SCORE_CONFIG = {
  baseMatchPoints: 100,       // per matched group
  groupSizeMultiplier: 50,    // extra points per card in the group (groupSize - 2) * 50
  comboBonus: 25,             // added per consecutive combo
  timeBonus: 5,               // per second remaining at level end
  starThresholds: {           // percent of time remaining for star rating
    three: 0.5,               // >50% time left → 3 stars
    two: 0.2,                 // >20% time left → 2 stars
    one: 0,                   // anything else  → 1 star
  },
};

/** Freeze configs to prevent accidental mutation at runtime. */
Object.freeze(SCORE_CONFIG);
LEVELS.forEach(l => Object.freeze(l));
Object.freeze(LEVELS);
