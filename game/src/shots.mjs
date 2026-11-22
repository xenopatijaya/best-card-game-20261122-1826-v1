// Ember Pact — the four deterministic screenshot states.
// One job: build the exact table each screenshot shows, from the same
// rules and renderer as the live game, with transitions disabled.

// SPDX-License-Identifier: MIT

import { createGame, startDuel } from './state.mjs';
import { summonCreature, cardById } from './cards.mjs';

function midDuelState(seed) {
  const state = createGame(seed);
  startDuel(state);
  state.turn = 5;
  state.stats.turns = 5;
  state.stats.damageDealt = 12;
  state.stats.cardsPlayed = 9;
  // The scripted mid-duel: your life 24, the Warden's 18, 6 ember.
  state.player.life = 24;
  state.warden.life = 18;
  state.player.ember = 6;
  state.player.hand = ['cinder-hound', 'flame-whelp', 'spring-mend', 'thorn-wolf', 'boulder-throw'];
  state.player.playedHouses = { Flame: 2, Tide: 0, Thorn: 0, Stone: 0 };
  // Two of your creatures, one of them damaged.
  const imp = summonCreature(cardById('ember-imp'), false);
  imp.canAttack = true;
  const wardenThorn = summonCreature(cardById('thorn-warden'), false);
  wardenThorn.hp = 4;
  wardenThorn.canAttack = true;
  state.player.board = [imp, wardenThorn];
  // Two Warden creatures, four face-down Warden cards.
  const hound = summonCreature(cardById('cinder-hound'), false);
  const stoneHound = summonCreature(cardById('stone-hound'), false);
  state.warden.board = [hound, stoneHound];
  state.warden.hand = ['ember-imp', 'dew-sprite', 'quake', 'mist-eel'];
  state.warden.ember = 4;
  state.log = [
    'PACT! A second Flame card — its power grows.',
    'You play Flame Whelp (4/3).',
    'The Warden sends Cinder Hound at your Ember Imp.',
  ];
  return state;
}

// Build the state for one named shot: start, play, win, loss.
export function buildShotState(name, seed = 1) {
  if (name === 'start') {
    return createGame(seed);
  }
  if (name === 'play') {
    return midDuelState(seed);
  }
  if (name === 'win') {
    const state = midDuelState(seed);
    state.warden.life = 0;
    state.winner = 'player';
    state.over = true;
    state.phase = 'won';
    state.rank = 'Pact Master';
    state.turn = 8;
    state.stats.turns = 8;
    state.stats.damageDealt = 34;
    state.stats.cardsPlayed = 14;
    state.log = [
      'You play Pyre Lord (6/5).',
      'Pyre Lord strikes The Warden for 6.',
      'The Warden bows. The pact is yours.',
    ];
    return state;
  }
  if (name === 'loss') {
    const state = midDuelState(seed);
    state.player.life = 0;
    state.winner = 'warden';
    state.over = true;
    state.phase = 'lost';
    state.rank = 'Gallant Loser';
    state.turn = 11;
    state.stats.turns = 11;
    state.stats.damageDealt = 27;
    state.stats.cardsPlayed = 12;
    state.log = [
      'The Warden sends Granite Golem at you.',
      'Granite Golem strikes you for 5.',
      'The embers die. The Warden keeps the hall.',
    ];
    return state;
  }
  return createGame(seed);
}

export const SHOT_NAMES = ['start', 'play', 'win', 'loss'];
