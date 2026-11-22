// Ember Pact — the Ash Warden, the opponent AI.
// One job: read-only suggestions from the live state — one next play,
// one next attack. It never mutates the state while planning.

// SPDX-License-Identifier: MIT

import { cardById } from './cards.mjs';
import { canPlayCard, legalTargets, sideOf, foeOf } from './state.mjs';

// Value a hand card as if played now, from the Warden's seat.
export function valuePlay(state, side, handIndex) {
  const me = sideOf(state, side);
  const foe = foeOf(state, side);
  const card = cardById(me.hand[handIndex]);
  if (!card) return -999;
  const chain = me.playedHouses[card.house] || 0;
  const chainBonus = chain > 0 ? 2.5 : 0;
  // The Warden favours the house it holds most of, so its chains show.
  const houseCount = me.hand.filter((id) => cardById(id).house === card.house).length;
  const favour = houseCount >= 2 ? 1 : 0;

  if (card.kind === 'creature') {
    let value = card.atk + card.hp + (chain === 1 ? 2 : 0);
    // Cheap early bodies are worth more than an expensive one that
    // sits in hand; a big body late is worth its stats.
    if (card.cost >= 4 && me.board.length >= 3) value -= 1;
    return value + chainBonus + favour;
  }

  const eff = card.effect;
  if (eff.kind === 'damage' || eff.kind === 'damageDraw') {
    const amount = eff.amount + (chain === 1 ? 2 : 0);
    // Kill the strongest enemy creature it can kill, else go face.
    const killable = foe.board.filter((c) => c.hp <= amount)
      .sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))[0];
    if (killable) return 3 + killable.atk + killable.hp + chainBonus;
    if (foe.life <= amount) return 99;
    const faceValue = amount >= 4 ? 3.5 : 2;
    return faceValue + chainBonus + (eff.kind === 'damageDraw' ? 1.5 : 0);
  }
  if (eff.kind === 'damageAll') {
    const amount = eff.amount + (chain === 1 ? 2 : 0);
    const kills = foe.board.filter((c) => c.hp <= amount).length;
    if (kills === 0 && foe.board.length === 0) return -999;
    return kills * 3 + foe.board.length * 0.5 + chainBonus;
  }
  if (eff.kind === 'heal') {
    if (me.life >= 28) return -999;
    return (30 - me.life) >= 6 ? 4 + chainBonus : 2 + chainBonus;
  }
  if (eff.kind === 'buff') {
    if (me.board.length === 0) return -999;
    const biggest = [...me.board].sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))[0];
    return 2 + biggest.atk * 0.3 + chainBonus;
  }
  if (eff.kind === 'draw') {
    if (me.hand.length >= 6) return 0.5;
    return 2.5 + chainBonus;
  }
  return 0;
}

// Pick the Warden's next play, or null when it should stop.
// Plays stop when nothing affordable is worth a small threshold.
export function choosePlay(state, side) {
  const me = sideOf(state, side);
  let best = null;
  let bestValue = 2.5;
  for (let i = 0; i < me.hand.length; i += 1) {
    if (!canPlayCard(state, side, i)) continue;
    const value = valuePlay(state, side, i);
    if (value > bestValue) {
      bestValue = value;
      best = { handIndex: i, value };
    }
  }
  if (!best) return null;
  const card = cardById(me.hand[best.handIndex]);
  let target = null;
  if (card.kind === 'spell') {
    const targets = legalTargets(state, side, best.handIndex);
    if (targets.length > 0) {
      const eff = card.effect;
      if (eff.kind === 'damage' || eff.kind === 'damageDraw') {
        const amount = eff.amount + (me.playedHouses[card.house] === 1 ? 2 : 0);
        const foe = foeOf(state, side);
        const killable = targets
          .filter((t) => t.kind === 'creature')
          .map((t) => foe.board.find((c) => c.uid === t.uid))
          .filter((c) => c && c.hp <= amount)
          .sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))[0];
        target = killable
          ? { kind: 'creature', side: side === 'player' ? 'warden' : 'player', uid: killable.uid }
          : { kind: 'hero', side: side === 'player' ? 'warden' : 'player' };
      } else if (eff.kind === 'buff') {
        target = targets.sort((a, b) => {
          const ca = me.board.find((c) => c.uid === a.uid);
          const cb = me.board.find((c) => c.uid === b.uid);
          return (cb.atk + cb.hp) - (ca.atk + ca.hp);
        })[0];
      }
    }
  }
  return { handIndex: best.handIndex, target, value: bestValue, cardName: card.name };
}

// Pick the Warden's next attack, or null when no ready creature remains.
// Lethal first; then a trade that kills one of yours without losing its
// own; otherwise everything goes face.
export function chooseAttack(state, side) {
  const me = sideOf(state, side);
  const foe = foeOf(state, side);
  const ready = me.board.filter((c) => c.canAttack && c.atk > 0);
  if (ready.length === 0) return null;
  const totalAtk = ready.reduce((sum, c) => sum + c.atk, 0);
  if (totalAtk >= foe.life) {
    return { attackerUid: ready[0].uid, target: { kind: 'hero', side: side === 'player' ? 'warden' : 'player' }, reason: 'lethal' };
  }
  for (const attacker of ready) {
    const victim = foe.board
      .filter((c) => c.hp <= attacker.atk && c.atk < attacker.hp)
      .sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))[0];
    if (victim) {
      return { attackerUid: attacker.uid, target: { kind: 'creature', side: side === 'player' ? 'warden' : 'player', uid: victim.uid }, reason: 'trade' };
    }
  }
  const biggest = [...ready].sort((a, b) => b.atk - a.atk)[0];
  return { attackerUid: biggest.uid, target: { kind: 'hero', side: side === 'player' ? 'warden' : 'player' }, reason: 'face' };
}

// One-line intent text so the player can read the Warden's plan.
export function intentLineForPlay(state, side, play) {
  const card = cardById(sideOf(state, side).hand[play.handIndex]);
  if (!card) return 'The Warden considers…';
  if (card.kind === 'spell' && play.target && play.target.kind === 'creature') {
    const foe = foeOf(state, side);
    const victim = foe.board.find((c) => c.uid === play.target.uid);
    return `The Warden eyes ${card.name} — at your ${victim ? victim.name : 'creature'}.`;
  }
  if (card.kind === 'spell' && play.target && play.target.kind === 'hero') {
    return `The Warden eyes ${card.name} — straight at you.`;
  }
  return `The Warden raises ${card.name}.`;
}

export function intentLineForAttack(state, side, attackChoice) {
  const me = sideOf(state, side);
  const attacker = me.board.find((c) => c.uid === attackChoice.attackerUid);
  if (!attacker) return 'The Warden strikes…';
  if (attackChoice.target.kind === 'hero') {
    return `The Warden sends ${attacker.name} at you.`;
  }
  const foe = foeOf(state, side);
  const victim = foe.board.find((c) => c.uid === attackChoice.target.uid);
  return `The Warden sends ${attacker.name} at your ${victim ? victim.name : 'creature'}.`;
}
