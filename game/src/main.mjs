// Ember Pact — boot: wires state, render, input, effects and shots.
// One job: start on the title screen, run the Warden's turn visibly
// with short pauses and intent lines, and honour ?shot=&seed=.

// SPDX-License-Identifier: MIT

import { createGame, startDuel, endTurn, playCard, attack, checkEnd } from './state.mjs';
import { choosePlay, chooseAttack, intentLineForPlay, intentLineForAttack } from './ai.mjs';
import { renderTable } from './render.mjs';
import { createUi, createInputHandlers } from './input.mjs';
import { buildShotState } from './shots.mjs';
import {
  setMuted, isMuted, soundForEvent, playWinSound, playLoseSound, spawnMotes,
} from './effects.mjs';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

let state = shotName ? buildShotState(shotName, seed) : createGame(seed);
const ui = createUi();
ui.shotMode = !!shotName;
ui.muted = false;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function refresh() {
  renderTable(state, ui, handlers);
}

function announceEnd() {
  if (state.phase === 'won') {
    playWinSound();
    spawnMotes(document.getElementById('stage'));
  } else if (state.phase === 'lost') {
    playLoseSound();
  }
}

// The Warden's turn, played out visibly: one card at a time with an
// intent line before each move, then its attacks, then back to you.
// It always completes — the loop is bounded by the hand and board size.
async function runWardenTurn() {
  if (state.phase !== 'play' || state.active !== 'warden') return;
  ui.wardenBusy = true;
  await sleep(650);
  let guard = 0;
  while (state.phase === 'play' && state.active === 'warden' && guard < 24) {
    guard += 1;
    const play = choosePlay(state, 'warden');
    if (!play) break;
    state.log.push(intentLineForPlay(state, 'warden', play));
    refresh();
    await sleep(750);
    const result = playCard(state, 'warden', play.handIndex, play.target);
    if (!result.ok) break;
    for (const e of result.events) soundForEvent(e);
    refresh();
    await sleep(650);
  }
  guard = 0;
  while (state.phase === 'play' && state.active === 'warden' && guard < 12) {
    guard += 1;
    const atk = chooseAttack(state, 'warden');
    if (!atk) break;
    state.log.push(intentLineForAttack(state, 'warden', atk));
    refresh();
    await sleep(750);
    const result = attack(state, 'warden', atk.attackerUid, atk.target);
    if (!result.ok) break;
    for (const e of result.events) soundForEvent(e);
    refresh();
    await sleep(650);
  }
  if (state.phase === 'play' && state.active === 'warden') {
    endTurn(state);
    checkEnd(state);
  }
  ui.wardenBusy = false;
  refresh();
  if (state.phase === 'won' || state.phase === 'lost') announceEnd();
}

const handlers = {
  onStart() {
    startDuel(state);
    refresh();
  },
  onRestart() {
    state = createGame(seed);
    startDuel(state);
    refresh();
  },
  onEndTurn() {
    endTurn(state);
    refresh();
    if (state.active === 'warden' && state.phase === 'play') {
      runWardenTurn();
    }
    if (state.phase === 'won' || state.phase === 'lost') announceEnd();
  },
  onMute() {
    setMuted(!isMuted());
    ui.muted = isMuted();
    refresh();
  },
};

const input = createInputHandlers(state, ui, {
  onChange: refresh,
  // The player's End Turn (button or E key) runs the full handover:
  // endTurn moves the state to the Warden, then its visible turn runs.
  onWardenTurn: () => handlers.onEndTurn(),
  onStart: () => handlers.onStart(),
  onRestart: () => handlers.onRestart(),
});
handlers.onHandCard = input.onHandCard;
handlers.onBoardCreature = input.onBoardCreature;
handlers.onHero = input.onHero;
// NOTE: do NOT overwrite handlers.onEndTurn with input.onEndTurn — the
// renderer's End Turn button calls handlers.onEndTurn, which performs
// the handover (endTurn + the Warden's visible turn). input.onEndTurn
// is only the keyboard path and calls it through the onWardenTurn hook.
document.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') {
    handlers.onMute();
    return;
  }
  input.onKey(event);
});

refresh();
