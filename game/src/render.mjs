// Ember Pact — DOM rendering of the table from the state.
// One job: hands, boards, life and ember bars, log, banners, card
// elements. It never changes the rules; it only shows them.

// SPDX-License-Identifier: MIT

import { HOUSES, HOUSE_ORDER, START_LIFE } from './config.mjs';
import { cardById } from './cards.mjs';
import { sideOf, foeOf, canPlayCard, legalTargets } from './state.mjs';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function sigilElement(house) {
  const wrap = el('span', 'sigil-wrap');
  const sigil = el('span', `sigil sigil-${HOUSES[house].sigil}`);
  sigil.style.setProperty('--house-color', HOUSES[house].color);
  wrap.appendChild(sigil);
  return wrap;
}

export function cardElement(card, options = {}) {
  const node = el('div', `card house-${card.house}`);
  if (options.faceDown) {
    node.classList.add('card-back');
    const mark = el('div', 'card-back-mark', '✦');
    node.appendChild(mark);
    node.appendChild(el('div', 'card-back-name', 'EMBER PACT'));
    return node;
  }
  if (options.playable) node.classList.add('playable');
  if (options.dimmed) node.classList.add('dimmed');
  if (options.selected) node.classList.add('selected');
  if (options.targetable) node.classList.add('targetable');
  if (options.justPlayed) node.classList.add('just-played');
  if (options.canAttack) node.classList.add('can-attack');
  if (options.small) node.classList.add('small');
  if (card.kind === 'spell') node.classList.add('is-spell');

  node.appendChild(el('div', 'card-cost', String(card.cost)));
  node.appendChild(el('div', 'card-name', card.name));
  const art = el('div', 'card-art');
  art.appendChild(sigilElement(card.house));
  art.appendChild(el('div', 'card-house-label', card.house.toUpperCase()));
  node.appendChild(art);
  node.appendChild(el('div', 'card-text', card.text));
  if (card.kind === 'creature') {
    const stats = el('div', 'card-stats');
    stats.appendChild(el('span', 'stat-atk', String(options.atk ?? card.atk)));
    stats.appendChild(el('span', 'stat-hp', String(options.hp ?? card.hp)));
    node.appendChild(stats);
  } else {
    node.appendChild(el('div', 'card-spell-ribbon', 'SPELL'));
  }
  return node;
}

function lifeBar(side, label) {
  const wrap = el('div', 'lifebar-wrap');
  const name = el('div', 'hero-name', label);
  const bar = el('div', 'lifebar');
  const fill = el('div', 'lifefill');
  fill.style.width = `${Math.max(0, (side.life / START_LIFE) * 100)}%`;
  if (side.life <= 10) fill.classList.add('low');
  bar.appendChild(fill);
  const num = el('div', 'life-number', `${side.life}`);
  bar.appendChild(num);
  wrap.appendChild(name);
  wrap.appendChild(bar);
  return wrap;
}

function emberPips(side) {
  const wrap = el('div', 'ember-pips');
  for (let i = 0; i < 10; i += 1) {
    const pip = el('span', `ember-pip${i < side.ember ? ' lit' : ''}`);
    wrap.appendChild(pip);
  }
  wrap.appendChild(el('span', 'ember-number', `${side.ember}`));
  return wrap;
}

function pactIndicator(state, side) {
  const wrap = el('div', 'pact-indicator');
  wrap.appendChild(el('span', 'pact-label', 'PACT'));
  for (const house of HOUSE_ORDER) {
    const count = side.playedHouses[house] || 0;
    const chip = el('span', `pact-chip${count > 0 ? ' active' : ''}`);
    chip.style.setProperty('--house-color', HOUSES[house].color);
    chip.appendChild(el('span', `sigil sigil-${HOUSES[house].sigil} tiny`));
    chip.appendChild(el('span', 'pact-count', String(count)));
    if (count === 1) chip.title = 'Pact: +1/+1 or +2 effect';
    if (count >= 2) chip.title = 'Surge: draw a card';
    wrap.appendChild(chip);
  }
  return wrap;
}

function heroPanel(state, side, label, handlers, ui) {
  const me = sideOf(state, side);
  const panel = el('div', `hero-panel ${side}`);
  panel.appendChild(lifeBar(me, label));
  panel.appendChild(emberPips(me));
  const counts = el('div', 'deck-counts', `Deck ${me.deck.length} · Discard ${me.discard.length}`);
  panel.appendChild(counts);
  if (side === 'warden') {
    panel.dataset.target = 'hero-warden';
    panel.addEventListener('click', () => handlers.onHero('warden'));
    if (ui.targeting) panel.classList.add('targetable-hero');
  } else {
    panel.dataset.target = 'hero-player';
  }
  return panel;
}

function boardRow(state, side, handlers, ui) {
  const me = sideOf(state, side);
  const row = el('div', `board-row ${side}`);
  if (me.board.length === 0) {
    row.appendChild(el('div', 'board-empty', side === 'player' ? 'Your creatures stand here.' : 'The Warden has no creatures.'));
  }
  for (const creature of me.board) {
    const card = cardById(creature.cardId);
    const node = cardElement(card, {
      atk: creature.atk,
      hp: creature.hp,
      justPlayed: creature.justPlayed,
      canAttack: side === 'player' && creature.canAttack && state.active === 'player',
    });
    node.dataset.uid = creature.uid;
    if (ui.targeting) node.classList.add('targetable');
    if (ui.attackArmed === creature.uid) node.classList.add('selected');
    node.addEventListener('click', () => handlers.onBoardCreature(side, creature.uid));
    row.appendChild(node);
  }
  return row;
}

function handRow(state, handlers, ui) {
  const me = state.player;
  const row = el('div', 'hand-row');
  me.hand.forEach((cardId, i) => {
    const card = cardById(cardId);
    const playable = canPlayCard(state, 'player', i);
    const node = cardElement(card, {
      playable,
      dimmed: state.active === 'player' && !playable,
      selected: ui.selectedHand === i,
    });
    node.dataset.handIndex = String(i);
    node.style.setProperty('--fan', `${(i - (me.hand.length - 1) / 2) * 4}deg`);
    node.addEventListener('click', () => handlers.onHandCard(i));
    row.appendChild(node);
  });
  if (me.hand.length === 0) row.appendChild(el('div', 'hand-empty', 'Your hand is empty.'));
  return row;
}

function wardenHand(state) {
  const row = el('div', 'warden-hand');
  const count = state.warden.hand.length;
  for (let i = 0; i < Math.min(count, 7); i += 1) {
    row.appendChild(cardElement({ house: 'Stone', cost: 0, name: '', text: '' }, { faceDown: true, small: true }));
  }
  row.appendChild(el('div', 'warden-hand-count', `${count} cards`));
  return row;
}

function logPanel(state) {
  const panel = el('div', 'log-panel');
  const lines = state.log.slice(-3);
  for (const line of lines) panel.appendChild(el('div', 'log-line', line));
  if (lines.length === 0) panel.appendChild(el('div', 'log-line', 'The hall is quiet. The cards wait.'));
  return panel;
}

function middleBand(state, handlers, ui) {
  const band = el('div', 'middle-band');
  const banner = el('div', 'turn-banner',
    state.phase === 'play'
      ? (state.active === 'player' ? 'YOUR TURN' : 'THE WARDEN TAKES THE TABLE')
      : 'THE DUEL IS DONE');
  band.appendChild(banner);
  band.appendChild(el('div', 'turn-number', `Turn ${state.turn}`));
  band.appendChild(pactIndicator(state, state.player));
  band.appendChild(logPanel(state));
  const endBtn = el('button', 'end-turn-btn', 'End Turn  (E)');
  endBtn.disabled = state.phase !== 'play' || state.active !== 'player';
  endBtn.addEventListener('click', () => handlers.onEndTurn());
  band.appendChild(endBtn);
  const muteBtn = el('button', 'mute-btn', ui.muted ? 'Sound: Off (M)' : 'Sound: On (M)');
  muteBtn.addEventListener('click', () => handlers.onMute());
  band.appendChild(muteBtn);
  return band;
}

function titleScreen(state, handlers) {
  const screen = el('div', 'title-screen');
  screen.appendChild(el('div', 'title-kicker', 'A DUEL OF EMBER AND OATH'));
  screen.appendChild(el('h1', 'title-name', 'EMBER PACT'));
  const sigils = el('div', 'title-sigils');
  for (const house of HOUSE_ORDER) {
    const chip = el('div', 'title-house');
    chip.appendChild(sigilElement(house));
    chip.appendChild(el('div', 'title-house-name', house));
    chip.appendChild(el('div', 'title-house-blurb', HOUSES[house].blurb));
    sigils.appendChild(chip);
  }
  screen.appendChild(sigils);
  screen.appendChild(el('div', 'title-hook', 'Outwit the Ash Warden — chain a house, seal the pact.'));
  const how = el('div', 'how-panel');
  how.appendChild(el('div', 'how-title', 'HOW TO PLAY'));
  how.appendChild(el('div', 'how-line', 'Goal: reduce the Ash Warden from 30 life to 0.'));
  how.appendChild(el('div', 'how-line', 'Ember grows each turn — spend it to play cards.'));
  how.appendChild(el('div', 'how-line', 'PACT: a 2nd card of one house in a turn is stronger. SURGE: a 3rd draws a card.'));
  screen.appendChild(how);
  const startBtn = el('button', 'start-btn', 'Start Duel');
  startBtn.addEventListener('click', () => handlers.onStart());
  screen.appendChild(startBtn);
  screen.appendChild(el('div', 'title-keys', 'Click a card to play it · Click a creature, then a target, to attack · Keys 1–7, Enter, A, E, R, M'));
  return screen;
}

function endScreen(state, handlers) {
  const won = state.phase === 'won';
  const screen = el('div', `end-screen ${won ? 'win' : 'loss'}`);
  screen.appendChild(el('h1', 'end-banner', won ? 'THE PACT IS YOURS' : 'THE EMBERS DIE'));
  screen.appendChild(el('div', 'end-rank', `Rank: ${state.rank || ''}`));
  const stats = el('div', 'end-stats');
  stats.appendChild(el('div', 'end-stat', `Turns played: ${state.stats.turns}`));
  stats.appendChild(el('div', 'end-stat', `Damage dealt: ${state.stats.damageDealt}`));
  stats.appendChild(el('div', 'end-stat', `Cards played: ${state.stats.cardsPlayed}`));
  stats.appendChild(el('div', 'end-stat', `Your life: ${state.player.life} · Warden life: ${state.warden.life}`));
  screen.appendChild(stats);
  const againBtn = el('button', 'again-btn', won ? 'Play Again  (R)' : 'Try Again  (R)');
  againBtn.addEventListener('click', () => handlers.onRestart());
  screen.appendChild(againBtn);
  return screen;
}

// Render the whole stage from the state. Called after every action.
export function renderTable(state, ui, handlers) {
  const stage = document.getElementById('stage');
  stage.innerHTML = '';
  stage.classList.toggle('shot-mode', !!ui.shotMode);
  if (state.phase === 'title') {
    stage.appendChild(titleScreen(state, handlers));
    return;
  }
  const table = el('div', 'table');
  const top = el('div', 'zone warden-zone');
  top.appendChild(heroPanel(state, 'warden', 'ASH WARDEN', handlers, ui));
  top.appendChild(wardenHand(state));
  table.appendChild(top);
  table.appendChild(boardRow(state, 'warden', handlers, ui));
  table.appendChild(middleBand(state, handlers, ui));
  table.appendChild(boardRow(state, 'player', handlers, ui));
  const bottom = el('div', 'zone player-zone');
  bottom.appendChild(heroPanel(state, 'player', 'PACTBOUND — YOU', handlers, ui));
  bottom.appendChild(handRow(state, handlers, ui));
  table.appendChild(bottom);
  stage.appendChild(table);
  if (state.phase === 'won' || state.phase === 'lost') {
    stage.appendChild(endScreen(state, handlers));
  }
  const status = document.getElementById('status-line');
  if (status) {
    status.textContent = state.phase === 'won'
      ? `You won the duel in ${state.stats.turns} turns. Rank: ${state.rank}.`
      : state.phase === 'lost'
        ? `The Warden won the duel. Rank: ${state.rank}.`
        : state.active === 'player'
          ? `Your turn ${state.turn}. Life ${state.player.life} vs ${state.warden.life}.`
          : `The Warden is playing turn ${state.turn}.`;
  }
}
