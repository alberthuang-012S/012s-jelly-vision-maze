export class SoundController {
  constructor() { this.enabled = true; this.context = null; this.lastMove = 0; }
  unlock() { if (!this.enabled) return; const AudioContextClass = window.AudioContext || window.webkitAudioContext; if (!AudioContextClass) return; if (!this.context) this.context = new AudioContextClass(); if (this.context.state === 'suspended') this.context.resume(); }
  toggle() { this.enabled = !this.enabled; if (this.enabled) this.unlock(); return this.enabled; }
  click() { this.tone(420, 0.045, 'sine', 0.035); }
  move() { const now = performance.now(); if (now - this.lastMove < 180) return; this.lastMove = now; this.tone(145, 0.025, 'triangle', 0.012); }
  pickup(kind) { this.tone(kind === 'drink' ? 610 : 520, 0.12, 'sine', 0.045); window.setTimeout(() => this.tone(kind === 'drink' ? 860 : 720, 0.16, 'sine', 0.035), 55); }
  echo(chain = 1) { const base = 470 + Math.min(chain, 5) * 55; this.tone(base, 0.1, 'triangle', 0.035); window.setTimeout(() => this.tone(base + 190, 0.16, 'sine', 0.03), 60); }
  clear() { this.tone(520, 0.12, 'sine', 0.045); window.setTimeout(() => this.tone(700, 0.14, 'sine', 0.04), 100); window.setTimeout(() => this.tone(920, 0.2, 'sine', 0.04), 210); }
  tone(frequency, duration, type, volume) { if (!this.enabled) return; this.unlock(); if (!this.context) return; const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); const start = this.context.currentTime; oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration); oscillator.connect(gain).connect(this.context.destination); oscillator.start(start); oscillator.stop(start + duration + 0.02); }
}
