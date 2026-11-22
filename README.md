# Ember Pact

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/xenopatijaya/best-card-game-20261122-1826-v1/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/xenopatijaya/best-card-game-20261122-1826-v1/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**Ember Pact** is an original duel card game built for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826). You are the Pactbound, duelling the Ash Warden, a cinder spirit, across a green felt table in a lamplit hall. First to reduce the other from 30 life to 0 wins. The twist is the pact rule: play a second card of the same house in one turn and it grows stronger; play a third and you surge — draw a card on the spot. Every hand is a choice between chasing the chain and spending your ember elsewhere, and the Warden chases the same chains, out loud, so you can read its hand by its house.

## How to play

- **Goal:** reduce the Ash Warden from 30 life to 0. Ember grows each turn — spend it to play cards.
- **Pact:** a 2nd card of one house in a turn is stronger (+1/+1 creature, +2 spell effect). **Surge:** a 3rd draws a card.
- **Controls:** click a hand card to select it, click again (or a legal target) to play it; click one of your ready creatures, then an enemy creature or the enemy hero, to attack. Keys 1–7 select a hand card, Enter plays it, A arms an attack, E ends the turn, R restarts, M mutes.

## The four houses

- **Flame** (red triangle) — burn fast, hit hard. High attack, low health.
- **Tide** (blue droplet) — outlast, then flood. Balanced, with healing.
- **Thorn** (green leaf) — grow roots, then strike. Tough creatures, card draw, friendly buffs.
- **Stone** (amber diamond) — stand still, stand forever. Big health, heavy damage, board sweepers.

## Tech

Static files, no network, no build step: open `game/index.html` in a desktop browser (or run `node serve.ts` and visit http://localhost:8080). All art is drawn in CSS, all sound is synthesised in code with WebAudio. The game logic lives in `game/src/` with one clear job per file — config, rng, cards, deck, state (the rules), ai (the Warden), render, effects, input, shots, main — so the same rules run in the browser and in headless Node simulations.

## License

MIT — see [LICENSE](LICENSE).
