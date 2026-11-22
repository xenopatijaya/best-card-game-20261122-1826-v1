// Ember Pact — the 24-card pool, six per house, one copy of each.
// One job: card data and the creature-summoning helper.

// SPDX-License-Identifier: MIT

// Effect shapes:
//  { kind: 'damage', amount }        — damage to any target (creature or hero)
//  { kind: 'damageAll', amount }     — damage to every enemy creature
//  { kind: 'heal', amount }          — restore life to your hero
//  { kind: 'buff', atk, hp }         — give a friendly creature +atk/+hp
//  { kind: 'draw', amount }          — draw cards
//  { kind: 'damageDraw', amount, draw } — damage to any target, then draw

export const CARDS = [
  // Flame — burn fast, hit hard.
  { id: 'ember-imp', name: 'Ember Imp', house: 'Flame', kind: 'creature', cost: 1, atk: 2, hp: 1, text: 'A spark with teeth.' },
  { id: 'cinder-hound', name: 'Cinder Hound', house: 'Flame', kind: 'creature', cost: 2, atk: 3, hp: 2, text: 'It hunts what glows.' },
  { id: 'spark-twins', name: 'Spark Twins', house: 'Flame', kind: 'creature', cost: 2, atk: 2, hp: 2, text: 'Two flames, one fuse.' },
  { id: 'flame-whelp', name: 'Flame Whelp', house: 'Flame', kind: 'creature', cost: 3, atk: 4, hp: 3, text: 'Small wings, big temper.' },
  { id: 'cinder-burst', name: 'Cinder Burst', house: 'Flame', kind: 'spell', cost: 2, effect: { kind: 'damage', amount: 3 }, text: 'Deal 3 damage to any target.' },
  { id: 'pyre-lord', name: 'Pyre Lord', house: 'Flame', kind: 'creature', cost: 5, atk: 6, hp: 5, text: 'The bonfire wears a crown.' },
  // Tide — outlast, then flood.
  { id: 'dew-sprite', name: 'Dew Sprite', house: 'Tide', kind: 'creature', cost: 1, atk: 1, hp: 2, text: 'Morning, bottled.' },
  { id: 'tide-runner', name: 'Tide Runner', house: 'Tide', kind: 'creature', cost: 2, atk: 2, hp: 3, text: 'Never where you left it.' },
  { id: 'mist-eel', name: 'Mist Eel', house: 'Tide', kind: 'creature', cost: 3, atk: 3, hp: 4, text: 'You feel it before you see it.' },
  { id: 'spring-mend', name: 'Spring Mend', house: 'Tide', kind: 'spell', cost: 2, effect: { kind: 'heal', amount: 6 }, text: 'Restore 6 life to your hero.' },
  { id: 'deep-caller', name: 'Deep Caller', house: 'Tide', kind: 'creature', cost: 4, atk: 4, hp: 5, text: 'It sings the water up.' },
  { id: 'riptide', name: 'Riptide', house: 'Tide', kind: 'spell', cost: 3, effect: { kind: 'damageAll', amount: 2 }, text: 'Deal 2 damage to every enemy creature.' },
  // Thorn — grow roots, then strike.
  { id: 'bramble-sprout', name: 'Bramble Sprout', house: 'Thorn', kind: 'creature', cost: 1, atk: 1, hp: 3, text: 'It was a garden once.' },
  { id: 'thorn-wolf', name: 'Thorn Wolf', house: 'Thorn', kind: 'creature', cost: 2, atk: 3, hp: 2, text: 'The hedge bites back.' },
  { id: 'vine-lurker', name: 'Vine Lurker', house: 'Thorn', kind: 'creature', cost: 3, atk: 3, hp: 3, text: 'Still, until it is not.' },
  { id: 'root-burst', name: 'Root Burst', house: 'Thorn', kind: 'spell', cost: 2, effect: { kind: 'damageDraw', amount: 2, draw: 1 }, text: 'Deal 2 damage to any target. Draw a card.' },
  { id: 'thorn-warden', name: 'Thorn Warden', house: 'Thorn', kind: 'creature', cost: 4, atk: 4, hp: 6, text: 'Keeper of the green gate.' },
  { id: 'wild-growth', name: 'Wild Growth', house: 'Thorn', kind: 'spell', cost: 2, effect: { kind: 'buff', atk: 2, hp: 2 }, text: 'Give a friendly creature +2/+2.' },
  // Stone — stand still, stand forever.
  { id: 'pebble-guard', name: 'Pebble Guard', house: 'Stone', kind: 'creature', cost: 1, atk: 1, hp: 4, text: 'Small rock, long memory.' },
  { id: 'stone-hound', name: 'Stone Hound', house: 'Stone', kind: 'creature', cost: 2, atk: 2, hp: 4, text: 'It does not bark. It waits.' },
  { id: 'granite-golem', name: 'Granite Golem', house: 'Stone', kind: 'creature', cost: 4, atk: 5, hp: 6, text: 'The mountain, standing up.' },
  { id: 'boulder-throw', name: 'Boulder Throw', house: 'Stone', kind: 'spell', cost: 3, effect: { kind: 'damage', amount: 4 }, text: 'Deal 4 damage to any target.' },
  { id: 'quake', name: 'Quake', house: 'Stone', kind: 'spell', cost: 4, effect: { kind: 'damageAll', amount: 3 }, text: 'Deal 3 damage to every enemy creature.' },
  { id: 'ember-gift', name: 'Ember Gift', house: 'Stone', kind: 'spell', cost: 2, effect: { kind: 'draw', amount: 2 }, text: 'Draw 2 cards.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export function cardById(id) {
  return CARD_BY_ID[id] || null;
}

let nextUid = 1;

export function summonCreature(card, pactBonus) {
  const bonus = pactBonus ? 1 : 0;
  const creature = {
    uid: `c${nextUid}-${card.id}`,
    cardId: card.id,
    name: card.name,
    house: card.house,
    atk: card.atk + bonus,
    hp: card.hp + bonus,
    maxHp: card.hp + bonus,
    canAttack: false,
    justPlayed: true,
  };
  nextUid += 1;
  return creature;
}

export function resetUidCounter() {
  nextUid = 1;
}
