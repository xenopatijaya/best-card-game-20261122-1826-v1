// Ember Pact — the rules, with no DOM in sight.
// One job: new game, turns, playing cards (pact / surge), attacks,
// damage, win and loss detection, rank titles. The browser UI and the
// headless simulation run these exact same rules.

// SPDX-License-Identifier: MIT

import { START_LIFE, MAX_EMBER, OPEN_DRAW, HAND_LIMIT, MAX_TURNS, HOUSE_ORDER, RANKS } from './config.mjs';
import { makeRng } from './rng.mjs';
import { cardById, summonCreature, resetUidCounter } from './cards.mjs';
import { buildDeck, drawOne, drawCards } from './deck.mjs';

function emptySide() {
  return {
    life: START_LIFE,
    ember: 0,
    deck: [],
    hand: [],
    board: [],
    discard: [],
    playedHouses: { Flame: 0, Tide: 0, Thorn: 0, Stone: 0 },
  };
}

export function createGame(seed = 1) {
  resetUidCounter();
  return {
    seed,
    rng: makeRng(seed),
    phase: 'title',
    turn: 1,
    active: 'player',
    player: emptySide(),
    warden: emptySide(),
    log: [],
    stats: { turns: 0, damageDealt: 0, cardsPlayed: 0, damageTaken: 0 },
    winner: null,
    rank: null,
    over: false,
  };
}

function logLine(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

export function sideOf(state, side) {
  return side === 'player' ? state.player : state.warden;
}

export function foeOf(state, side) {
  return side === 'player' ? state.warden : state.player;
}

function sideName(side) {
  return side === 'player' ? 'You' : 'The Warden';
}

// Verb agreement: "You draw" but "The Warden draws".
function verb(side, youForm, thirdForm) {
  return side === 'player' ? youForm : thirdForm;
}

export function startDuel(state) {
  state.player = emptySide();
  state.warden = emptySide();
  state.player.deck = buildDeck(state.rng);
  state.warden.deck = buildDeck(state.rng);
  state.log = [];
  state.stats = { turns: 0, damageDealt: 0, cardsPlayed: 0, damageTaken: 0 };
  state.turn = 1;
  state.phase = 'play';
  state.active = 'player';
  state.winner = null;
  state.rank = null;
  state.over = false;
  drawCards(state.player, OPEN_DRAW, state.rng);
  drawCards(state.warden, OPEN_DRAW, state.rng);
  beginTurn(state, 'player', true);
  logLine(state, 'The duel begins. Chain a house, seal the pact.');
  return state;
}

// Start a side's turn: ember by turn number (capped), draw one card
// (except the very first turn), refresh creatures, clear pact counts.
export function beginTurn(state, side, firstTurn = false) {
  const me = sideOf(state, side);
  const emberGain = Math.min(state.turn, MAX_EMBER);
  me.ember = emberGain;
  me.playedHouses = { Flame: 0, Tide: 0, Thorn: 0, Stone: 0 };
  for (const c of me.board) c.canAttack = true;
  if (!firstTurn) {
    const r = drawOne(me, state.rng);
    if (r.cardId) {
      const card = cardById(r.cardId);
      logLine(state, r.burned
        ? `${sideName(side)} ${verb(side, 'draw', 'draws')} ${card.name} — hand full, it burns.`
        : `${sideName(side)} ${verb(side, 'draw', 'draws')} a card.`);
    }
  }
}

function dealDamageToCreature(state, side, creature, amount, sourceName) {
  creature.hp -= amount;
  const events = [{ type: 'damage', text: `${sourceName} hits ${creature.name} for ${amount}.` }];
  if (creature.hp <= 0) {
    const owner = sideOf(state, side);
    const idx = owner.board.indexOf(creature);
    if (idx >= 0) owner.board.splice(idx, 1);
    owner.discard.push(creature.cardId);
    events.push({ type: 'death', text: `${creature.name} crumbles to ash.` });
  }
  return events;
}

function dealDamageToHero(state, side, amount, sourceName) {
  const hero = sideOf(state, side);
  hero.life = Math.max(0, hero.life - amount);
  const events = [{ type: 'damage', text: `${sourceName} strikes ${side === 'player' ? 'you' : 'The Warden'} for ${amount}.` }];
  if (side === 'warden') state.stats.damageDealt += amount;
  else state.stats.damageTaken += amount;
  return events;
}

export function checkEnd(state) {
  if (state.over) return state.winner;
  if (state.warden.life <= 0 && state.player.life <= 0) {
    state.winner = 'player';
  } else if (state.warden.life <= 0) {
    state.winner = 'player';
  } else if (state.player.life <= 0) {
    state.winner = 'warden';
  } else {
    return null;
  }
  state.over = true;
  state.phase = state.winner === 'player' ? 'won' : 'lost';
  state.rank = rankTitle(state);
  logLine(state, state.winner === 'player'
    ? 'The Warden bows. The pact is yours.'
    : 'The embers die. The Warden keeps the hall.');
  return state.winner;
}

export function rankTitle(state) {
  const turns = state.stats.turns;
  const dmg = state.stats.damageDealt;
  if (state.winner === 'player') {
    if (turns <= 8 && dmg >= 30) return RANKS.pactMaster;
    if (turns <= 12) return RANKS.emberAdept;
    return RANKS.pactbound;
  }
  if (dmg >= 25) return RANKS.gallantLoser;
  return RANKS.emberNovice;
}

// Which targets does this hand card need? Returns an array of targets:
//  { kind: 'hero', side } or { kind: 'creature', side, uid }.
export function legalTargets(state, side, handIndex) {
  const me = sideOf(state, side);
  const foe = foeOf(state, side);
  const cardId = me.hand[handIndex];
  if (!cardId) return [];
  const card = cardById(cardId);
  if (!card || card.kind !== 'spell') return [];
  const eff = card.effect;
  if (eff.kind === 'damage' || eff.kind === 'damageDraw') {
    const targets = [{ kind: 'hero', side: side === 'player' ? 'warden' : 'player' }];
    for (const c of foe.board) targets.push({ kind: 'creature', side: foe === state.warden ? 'warden' : 'player', uid: c.uid });
    return targets;
  }
  if (eff.kind === 'buff') {
    return me.board.map((c) => ({ kind: 'creature', side, uid: c.uid }));
  }
  return [];
}

export function canPlayCard(state, side, handIndex) {
  if (state.phase !== 'play' || state.active !== side) return false;
  const me = sideOf(state, side);
  const cardId = me.hand[handIndex];
  if (!cardId) return false;
  const card = cardById(cardId);
  if (!card || me.ember < card.cost) return false;
  if (card.kind === 'spell' && card.effect.kind === 'buff' && me.board.length === 0) return false;
  return true;
}

// Play a hand card. target is required for damage / damageDraw / buff
// spells and ignored otherwise. Returns { ok, events, pact, surge }.
export function playCard(state, side, handIndex, target = null) {
  const events = [];
  if (!canPlayCard(state, side, handIndex)) return { ok: false, events, pact: false, surge: false };
  const me = sideOf(state, side);
  const foe = foeOf(state, side);
  const cardId = me.hand[handIndex];
  const card = cardById(cardId);
  const chain = me.playedHouses[card.house] || 0;
  const pact = chain === 1;
  const surge = chain === 2;
  const pactBoost = pact ? 2 : 0;

  me.ember -= card.cost;
  me.hand.splice(handIndex, 1);
  me.playedHouses[card.house] = chain + 1;
  state.stats.cardsPlayed += 1;

  if (pact) events.push({ type: 'pact', text: `PACT! A second ${card.house} card — its power grows.` });
  if (surge) events.push({ type: 'surge', text: `SURGE! A third ${card.house} card — draw a card.` });

  if (card.kind === 'creature') {
    const creature = summonCreature(card, pact);
    me.board.push(creature);
    events.push({ type: 'play', text: `${sideName(side)} ${verb(side, 'play', 'plays')} ${card.name} (${creature.atk}/${creature.hp}).` });
  } else {
    const eff = card.effect;
    me.discard.push(cardId);
    if (eff.kind === 'damage' || eff.kind === 'damageDraw') {
      const amount = eff.amount + pactBoost;
      if (target && target.kind === 'hero') {
        events.push(...dealDamageToHero(state, target.side, amount, card.name));
      } else if (target && target.kind === 'creature') {
        const owner = sideOf(state, target.side);
        const victim = owner.board.find((c) => c.uid === target.uid);
        if (victim) events.push(...dealDamageToCreature(state, target.side, victim, amount, card.name));
      } else {
        events.push(...dealDamageToHero(state, side === 'player' ? 'warden' : 'player', amount, card.name));
      }
      if (eff.kind === 'damageDraw') {
        const r = drawOne(me, state.rng);
        if (r.cardId) events.push({ type: 'draw', text: `${sideName(side)} ${verb(side, 'draw', 'draws')} a card.` });
      }
    } else if (eff.kind === 'damageAll') {
      const amount = eff.amount + pactBoost;
      for (const victim of [...foe.board]) {
        events.push(...dealDamageToCreature(state, side === 'player' ? 'warden' : 'player', victim, amount, card.name));
      }
      if (foe.board.length === 0) events.push({ type: 'play', text: `${card.name} sweeps an empty board.` });
    } else if (eff.kind === 'heal') {
      const amount = eff.amount + pactBoost;
      me.life = Math.min(START_LIFE, me.life + amount);
      events.push({ type: 'heal', text: `${sideName(side)} ${verb(side, 'mend', 'mends')} ${amount} life.` });
    } else if (eff.kind === 'buff') {
      const owner = sideOf(state, side);
      const creature = target ? owner.board.find((c) => c.uid === target.uid) : owner.board[0];
      if (creature) {
        creature.atk += eff.atk + pactBoost;
        creature.hp += eff.hp + pactBoost;
        creature.maxHp += eff.hp + pactBoost;
        events.push({ type: 'buff', text: `${card.name} grows ${creature.name} to ${creature.atk}/${creature.hp}.` });
      }
    } else if (eff.kind === 'draw') {
      const drawn = drawCards(me, eff.amount, state.rng);
      events.push({ type: 'draw', text: `${sideName(side)} ${verb(side, 'draw', 'draws')} ${drawn.length} card${drawn.length === 1 ? '' : 's'}.` });
    }
    events.push({ type: 'play', text: `${sideName(side)} ${verb(side, 'cast', 'casts')} ${card.name}.` });
  }

  if (surge) {
    const r = drawOne(me, state.rng);
    if (r.cardId) events.push({ type: 'draw', text: `${sideName(side)} ${verb(side, 'draw', 'draws')} a surge card.` });
  }

  for (const e of events) logLine(state, e.text);
  checkEnd(state);
  return { ok: true, events, pact, surge };
}

export function canAttack(state, side, attackerUid) {
  if (state.phase !== 'play' || state.active !== side) return false;
  const me = sideOf(state, side);
  const creature = me.board.find((c) => c.uid === attackerUid);
  return !!creature && creature.canAttack && creature.atk > 0;
}

// Attack with one of your creatures: at an enemy creature (both trade
// damage) or at the enemy hero. Returns { ok, events }.
export function attack(state, side, attackerUid, target) {
  const events = [];
  if (!canAttack(state, side, attackerUid)) return { ok: false, events };
  const me = sideOf(state, side);
  const foeSide = side === 'player' ? 'warden' : 'player';
  const foe = foeOf(state, side);
  const attacker = me.board.find((c) => c.uid === attackerUid);
  if (target.kind === 'hero') {
    attacker.canAttack = false;
    events.push(...dealDamageToHero(state, foeSide, attacker.atk, attacker.name));
  } else {
    const victim = foe.board.find((c) => c.uid === target.uid);
    if (!victim) return { ok: false, events: [] };
    attacker.canAttack = false;
    events.push({ type: 'attack', text: `${attacker.name} strikes ${victim.name} for ${attacker.atk}.` });
    events.push(...dealDamageToCreature(state, foeSide, victim, attacker.atk, attacker.name));
    // The defender hits back, if it survived.
    if (victim.hp > 0) {
      events.push(...dealDamageToCreature(state, side, attacker, victim.atk, victim.name));
    }
  }
  for (const e of events) logLine(state, e.text);
  checkEnd(state);
  return { ok: true, events };
}

export function endTurn(state) {
  if (state.phase !== 'play') return state.active;
  if (state.active === 'player') {
    state.active = 'warden';
    logLine(state, 'The Warden takes the table.');
    beginTurn(state, 'warden');
  } else {
    state.active = 'player';
    state.turn += 1;
    state.stats.turns = state.turn;
    if (state.turn > MAX_TURNS) {
      // A duel that runs past the turn cap ends on life: the healthier
      // side wins, so no game can stall forever.
      state.winner = state.player.life >= state.warden.life ? 'player' : 'warden';
      state.over = true;
      state.phase = state.winner === 'player' ? 'won' : 'lost';
      state.rank = rankTitle(state);
      logLine(state, 'The lamps burn low — the duel is called on life.');
      return state.active;
    }
    logLine(state, `Your turn — turn ${state.turn}.`);
    beginTurn(state, 'player');
  }
  return state.active;
}

export { HAND_LIMIT, MAX_TURNS };
