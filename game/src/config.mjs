// Ember Pact — tuning constants and the four houses.
// One job: every number and house definition the rules use lives here.

// SPDX-License-Identifier: MIT

export const START_LIFE = 30;
export const MAX_EMBER = 10;
export const HAND_LIMIT = 7;
export const OPEN_DRAW = 3;
export const MAX_TURNS = 40;
export const DECK_SIZE = 24;

export const HOUSES = {
  Flame: {
    name: 'Flame',
    color: '#e5484d',
    dark: '#8f1d22',
    light: '#ff8a7a',
    sigil: 'triangle',
    blurb: 'Burn fast, hit hard.',
  },
  Tide: {
    name: 'Tide',
    color: '#3e8fd9',
    dark: '#174a75',
    light: '#8ec8f5',
    sigil: 'droplet',
    blurb: 'Outlast, then flood.',
  },
  Thorn: {
    name: 'Thorn',
    color: '#4da34d',
    dark: '#1f5c2a',
    light: '#9ad69a',
    sigil: 'leaf',
    blurb: 'Grow roots, then strike.',
  },
  Stone: {
    name: 'Stone',
    color: '#d9a441',
    dark: '#7a5a17',
    light: '#f2cd7e',
    sigil: 'diamond',
    blurb: 'Stand still, stand forever.',
  },
};

export const HOUSE_ORDER = ['Flame', 'Tide', 'Thorn', 'Stone'];

export const RANKS = {
  pactMaster: 'Pact Master',
  emberAdept: 'Ember Adept',
  pactbound: 'Pactbound',
  gallantLoser: 'Gallant Loser',
  emberNovice: 'Ember Novice',
};
