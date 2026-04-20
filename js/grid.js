/**
 * grid.js — Card Grid Builder
 *
 * ARCHITECTURE NOTE:
 * This module owns ONE responsibility: turning a level config object
 * into a populated, shuffled DOM grid of card elements.
 *
 * It knows nothing about game state, scoring, or timers.
 * That isolation means you can unit-test buildGrid() by just checking
 * the returned DOM structure — no game state needed.
 *
 * Key algorithms:
 *  - Fisher-Yates shuffle  (O(n), unbiased)
 *  - Card element factory  (builds each card's two-sided DOM structure)
 */

const GridBuilder = (() => {

  /**
   * Fisher-Yates in-place shuffle.
   * INTERVIEW NOTE: This is O(n) and produces a perfectly uniform distribution,
   * unlike arr.sort(() => Math.random() - 0.5) which is biased and O(n log n).
   * @param {Array} arr
   * @returns {Array} the same array, shuffled
   */
  function fisherYates(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Generates the full card deck for a given level.
   * Each emoji is repeated `groupSize` times, then shuffled.
   * @param {Object} level - a LEVELS config entry
   * @returns {Array<string>} shuffled array of emoji strings
   */
  function buildDeck(level) {
    const { emojis, groupSize } = level;
    const deck = [];
    emojis.forEach(emoji => {
      for (let i = 0; i < groupSize; i++) deck.push(emoji);
    });
    return fisherYates(deck);
  }

  /**
   * Creates a single card DOM element.
   *
   * Card HTML structure (two-sided CSS flip):
   *   <div class="card" data-emoji="🍎" data-id="0" data-matched="false">
   *     <div class="card-inner">
   *       <div class="card-face card-back">  <!-- back face (question mark) -->
   *         <span class="card-back-symbol">?</span>
   *       </div>
   *       <div class="card-face card-front"> <!-- front face (emoji) -->
   *         <span class="card-emoji">🍎</span>
   *       </div>
   *     </div>
   *   </div>
   *
   * Data attributes are used instead of a separate JS map so each card
   * carries its own identity — no external lookup table needed.
   *
   * @param {string} emoji
   * @param {number} index - unique card index (for keying)
   * @returns {HTMLElement}
   */
  function createCardElement(emoji, index) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.emoji = emoji;
    card.dataset.id = index;
    card.dataset.matched = "false";
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Card ${index + 1}`);
    card.setAttribute("tabindex", "0");

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back">
          <span class="card-back-symbol">?</span>
        </div>
        <div class="card-face card-front">
          <span class="card-emoji">${emoji}</span>
        </div>
      </div>
    `;

    return card;
  }

  /**
   * Builds and injects a complete shuffled card grid into a container element.
   * Also sets CSS custom properties on the container so the grid layout
   * responds to the level's column count — no CSS changes needed per level.
   *
   * @param {HTMLElement} container - the grid container element
   * @param {Object} level - level config
   * @param {boolean} revealedAtStart - if true, cards start face-up (memorize phase)
   * @returns {HTMLElement[]} array of all card elements (for event attachment)
   */
  function buildGrid(container, level, revealedAtStart = false) {
    container.innerHTML = "";
    container.style.setProperty("--grid-cols", level.gridCols);
    container.style.setProperty("--grid-rows", level.gridRows);

    const deck = buildDeck(level);
    const cards = deck.map((emoji, i) => {
      const card = createCardElement(emoji, i);
      if (revealedAtStart) card.classList.add("flipped");
      container.appendChild(card);
      return card;
    });

    return cards;
  }

  /**
   * Flips all cards in an array face-down (used after memorize phase ends).
   * Staggered delay creates a wave animation effect.
   * @param {HTMLElement[]} cards
   */
  function flipAllFaceDown(cards) {
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.classList.remove("flipped");
      }, i * 40); // stagger: 40ms between each card
    });
  }

  /**
   * Syncs the play grid from the memorize grid so both phases
   * use identical card order — player sees the same layout.
   *
   * Strategy: copy emoji sequence from memorize grid, rebuild play grid
   * in the same order (no re-shuffle).
   *
   * @param {HTMLElement} playContainer
   * @param {HTMLElement[]} memCards - cards from memorize phase
   * @param {Object} level
   * @returns {HTMLElement[]}
   */
  function buildGridFromSequence(playContainer, memCards, level) {
    playContainer.innerHTML = "";
    playContainer.style.setProperty("--grid-cols", level.gridCols);
    playContainer.style.setProperty("--grid-rows", level.gridRows);

    const cards = memCards.map((memCard, i) => {
      const emoji = memCard.dataset.emoji;
      const card = createCardElement(emoji, i);
      playContainer.appendChild(card);
      return card;
    });

    return cards;
  }

  return { buildGrid, buildGridFromSequence, flipAllFaceDown };
})();
