// Ember Pact — animation and synthesised sound.
// One job: card motion, hit shakes, the win flourish, and WebAudio
// blips made in code only (no audio files).

// SPDX-License-Identifier: MIT

let audioCtx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureAudio() {
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    } catch (err) {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function blip(freq, duration, type, gainValue, delay = 0) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playSelectSound() { blip(660, 0.06, 'sine', 0.05); }
export function playCardSound() { blip(220, 0.12, 'triangle', 0.12); blip(330, 0.1, 'triangle', 0.08, 0.05); }
export function playHitSound() { blip(110, 0.18, 'sawtooth', 0.14); }
export function playHealSound() { blip(520, 0.12, 'sine', 0.06); blip(780, 0.16, 'sine', 0.06, 0.08); }
export function playDrawSound() { blip(880, 0.05, 'sine', 0.04); }
export function playWinSound() {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.1, i * 0.09));
}
export function playLoseSound() {
  [392, 330, 262, 196].forEach((f, i) => blip(f, 0.25, 'triangle', 0.08, i * 0.11));
}

export function soundForEvent(event) {
  if (!event) return;
  if (event.type === 'play') playCardSound();
  else if (event.type === 'damage' || event.type === 'attack') playHitSound();
  else if (event.type === 'heal') playHealSound();
  else if (event.type === 'draw') playDrawSound();
}

export function shakeElement(node) {
  if (!node) return;
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
}

export function pulseElement(node) {
  if (!node) return;
  node.classList.remove('pulse');
  void node.offsetWidth;
  node.classList.add('pulse');
}

// Rising ember motes across the table for a win that lands.
export function spawnMotes(stage) {
  if (!stage) return;
  for (let i = 0; i < 24; i += 1) {
    const mote = document.createElement('div');
    mote.className = 'mote';
    mote.style.left = `${5 + Math.random() * 90}%`;
    mote.style.bottom = `${Math.random() * 20}%`;
    mote.style.animationDelay = `${Math.random() * 1.2}s`;
    mote.style.animationDuration = `${2 + Math.random() * 2}s`;
    stage.appendChild(mote);
    window.setTimeout(() => mote.remove(), 4500);
  }
}
