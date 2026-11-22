// Ember Pact — mouse and keyboard handling, selection, targeting.
// One job: turn clicks and keys into calls on the rules, and keep the
// selection state the renderer reads.

// SPDX-License-Identifier: MIT

import { cardById } from './cards.mjs';
import { canPlayCard, legalTargets, playCard, attack, canAttack } from './state.mjs';
import { playSelectSound, soundForEvent, shakeElement } from './effects.mjs';

export function createUi() {
  return {
    selectedHand: null,
    attackArmed: null,
    targeting: null,
    muted: false,
    shotMode: false,
    wardenBusy: false,
  };
}

function clearSelection(ui) {
  ui.selectedHand = null;
  ui.attackArmed = null;
  ui.targeting = null;
}

// Build the input handlers the renderer wires to clicks. onChange is
// called after every action so the table re-renders.
export function createInputHandlers(state, ui, hooks) {
  const { onChange, onWardenTurn } = hooks;

  function tryPlaySelected(target) {
    if (ui.selectedHand === null) return false;
    const result = playCard(state, 'player', ui.selectedHand, target);
    if (!result.ok) return false;
    clearSelection(ui);
    for (const e of result.events) soundForEvent(e);
    onChange();
    return true;
  }

  function onHandCard(index) {
    if (state.phase !== 'play' || state.active !== 'player' || ui.wardenBusy) return;
    if (ui.selectedHand === index) {
      // Click again: play it if it needs no target.
      const card = cardById(state.player.hand[index]);
      if (card.kind === 'spell' && legalTargets(state, 'player', index).length > 0) return;
      if (tryPlaySelected(null)) return;
      clearSelection(ui);
      onChange();
      return;
    }
    if (!canPlayCard(state, 'player', index)) {
      clearSelection(ui);
      onChange();
      return;
    }
    ui.selectedHand = index;
    ui.attackArmed = null;
    const targets = legalTargets(state, 'player', index);
    ui.targeting = targets.length > 0 ? { handIndex: index, targets } : null;
    playSelectSound();
    onChange();
  }

  function onBoardCreature(side, uid) {
    if (state.phase !== 'play' || state.active !== 'player' || ui.wardenBusy) return;
    // A selected spell is waiting for a target: this creature may be it.
    if (ui.targeting) {
      const hit = ui.targeting.targets.find((t) => t.kind === 'creature' && t.uid === uid && t.side === side);
      if (hit) {
        tryPlaySelected(hit);
        return;
      }
      clearSelection(ui);
      onChange();
      return;
    }
    if (side === 'player') {
      if (ui.attackArmed === uid) {
        ui.attackArmed = null;
        onChange();
        return;
      }
      if (canAttack(state, 'player', uid)) {
        ui.attackArmed = uid;
        ui.selectedHand = null;
        playSelectSound();
        onChange();
      }
      return;
    }
    // Enemy creature clicked while an attack is armed: strike it.
    if (ui.attackArmed) {
      const result = attack(state, 'player', ui.attackArmed, { kind: 'creature', side: 'warden', uid });
      if (result.ok) {
        for (const e of result.events) soundForEvent(e);
        const node = document.querySelector(`[data-uid="${uid}"]`);
        shakeElement(node);
      }
      clearSelection(ui);
      onChange();
    }
  }

  function onHero(side) {
    if (state.phase !== 'play' || state.active !== 'player' || ui.wardenBusy) return;
    if (ui.targeting && side === 'warden') {
      const hit = ui.targeting.targets.find((t) => t.kind === 'hero' && t.side === 'warden');
      if (hit) {
        tryPlaySelected(hit);
        return;
      }
    }
    if (ui.attackArmed && side === 'warden') {
      const result = attack(state, 'player', ui.attackArmed, { kind: 'hero', side: 'warden' });
      if (result.ok) {
        for (const e of result.events) soundForEvent(e);
        const bar = document.querySelector('.warden-zone .lifebar');
        shakeElement(bar);
      }
      clearSelection(ui);
      onChange();
    }
  }

  function onEndTurn() {
    if (state.phase !== 'play' || state.active !== 'player' || ui.wardenBusy) return;
    clearSelection(ui);
    onChange();
    onWardenTurn();
  }

  function onKey(event) {
    if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
      hooks.onStart();
      return;
    }
    if ((state.phase === 'won' || state.phase === 'lost') && (event.key === 'r' || event.key === 'R')) {
      hooks.onRestart();
      return;
    }
    if (state.phase !== 'play' || state.active !== 'player' || ui.wardenBusy) return;
    if (event.key >= '1' && event.key <= '7') {
      const index = Number(event.key) - 1;
      if (index < state.player.hand.length) onHandCard(index);
    } else if (event.key === 'Enter' || event.key === ' ') {
      const card = ui.selectedHand !== null ? cardById(state.player.hand[ui.selectedHand]) : null;
      if (card && !(card.kind === 'spell' && legalTargets(state, 'player', ui.selectedHand).length > 0)) {
        tryPlaySelected(null);
      }
    } else if (event.key === 'a' || event.key === 'A') {
      const ready = state.player.board.find((c) => c.canAttack && c.atk > 0);
      if (ready) {
        ui.attackArmed = ready.uid;
        ui.selectedHand = null;
        ui.targeting = null;
        playSelectSound();
        onChange();
      }
    } else if (event.key === 'e' || event.key === 'E') {
      onEndTurn();
    }
  }

  return { onHandCard, onBoardCreature, onHero, onEndTurn, onKey };
}
