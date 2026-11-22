// Ember Pact — deck building, drawing, reshuffling the discard.
// One job: everything about the 24-card deck and the draw pile.

// SPDX-License-Identifier: MIT

import { CARDS } from './cards.mjs';
import { HAND_LIMIT } from './config.mjs';
import { shuffleInPlace } from './rng.mjs';

export function buildDeck(rng) {
  const ids = CARDS.map((c) => c.id);
  return shuffleInPlace(ids, rng);
}

// Draw one card id from the deck into a hand. When the deck is empty the
// discard pile is shuffled back in first; when both are empty, null.
// Returns { cardId, burned } — burned is true when the hand was already full.
export function drawOne(side, rng) {
  if (side.deck.length === 0) {
    if (side.discard.length === 0) return { cardId: null, burned: false, reshuffled: false };
    side.deck = shuffleInPlace(side.discard.splice(0), rng);
  }
  const cardId = side.deck.pop();
  if (side.hand.length >= HAND_LIMIT) {
    side.discard.push(cardId);
    return { cardId, burned: true, reshuffled: false };
  }
  side.hand.push(cardId);
  return { cardId, burned: false, reshuffled: false };
}

export function drawCards(side, count, rng) {
  const results = [];
  for (let i = 0; i < count; i += 1) {
    const r = drawOne(side, rng);
    if (!r.cardId) break;
    results.push(r);
  }
  return results;
}
