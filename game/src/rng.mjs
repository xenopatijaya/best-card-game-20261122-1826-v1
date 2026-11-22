// Ember Pact — a small seeded random source and a shuffle.
// One job: deterministic randomness so sims and screenshots repeat.

// SPDX-License-Identifier: MIT

export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace(list, rng) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

export function pickRandom(list, rng) {
  return list[Math.floor(rng() * list.length)];
}
