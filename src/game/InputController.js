const KEY_VECTORS = { ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 } };

export class InputController {
  constructor({ onRestart, onEscape, onBlur, onScan }) {
    this.onScan = onScan;
    this.keys = new Set(); this.pointers = new Map(); this.enabled = false; this.onRestart = onRestart; this.onEscape = onEscape;
    this.onKeyDown = (event) => this.handleKeyDown(event); this.onKeyUp = (event) => this.handleKeyUp(event);
    this.onBlur = () => { this.clear(); onBlur?.(); };
    this.onVisibility = () => { if (document.hidden) this.onBlur(); };
    this.cleanups = [];
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('keydown', this.onKeyDown, { passive: false }); window.addEventListener('keyup', this.onKeyUp, { passive: false });
    document.querySelectorAll('[data-dir]').forEach((button) => this.bindButton(button));
  }
  bindButton(button) {
    const direction = button.dataset.dir;
    const press = (event) => { event.preventDefault(); if (!this.enabled) return; this.pointers.set(event.pointerId, direction); button.classList.add('is-pressed'); button.setPointerCapture?.(event.pointerId); };
    const release = (event) => { event.preventDefault(); this.pointers.delete(event.pointerId); if (![...this.pointers.values()].includes(direction)) button.classList.remove('is-pressed'); };
    button.addEventListener('pointerdown', press, { passive: false }); button.addEventListener('pointerup', release, { passive: false }); button.addEventListener('pointercancel', release, { passive: false }); button.addEventListener('lostpointercapture', release, { passive: false });
    this.cleanups.push(() => { button.removeEventListener('pointerdown', press); for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.removeEventListener(type, release); });
  }
  clear() { this.keys.clear(); this.pointers.clear(); document.querySelectorAll('[data-dir]').forEach((button) => button.classList.remove('is-pressed')); }
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.clear(); }
  handleKeyDown(event) {
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Escape') { if (event.repeat) event.preventDefault(); else this.onEscape?.(event); return; }
    if (!this.enabled) return;
    if (event.code === 'KeyQ' && !event.repeat) { event.preventDefault(); this.onScan?.(); }
    if (KEY_VECTORS[event.code]) { event.preventDefault(); this.keys.add(event.code); }
    if (event.code === 'KeyR' && !event.repeat) { event.preventDefault(); this.onRestart?.(); }
  }
  handleKeyUp(event) { if (KEY_VECTORS[event.code]) { if (this.enabled) event.preventDefault(); this.keys.delete(event.code); } }
  getMovementVector() { if (!this.enabled) return { x: 0, y: 0 }; let x = 0; let y = 0; for (const key of this.keys) { x += KEY_VECTORS[key]?.x || 0; y += KEY_VECTORS[key]?.y || 0; } for (const direction of this.pointers.values()) { if (direction === 'left') x -= 1; if (direction === 'right') x += 1; if (direction === 'up') y -= 1; if (direction === 'down') y += 1; } const length = Math.hypot(x, y); return length ? { x: x / length, y: y / length } : { x: 0, y: 0 }; }
  dispose() { this.clear(); window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp); window.removeEventListener('blur', this.onBlur); document.removeEventListener('visibilitychange', this.onVisibility); this.cleanups.forEach((cleanup) => cleanup()); }
}
