import { clamp, lerp } from './utils.js';

export class VisionSystem {
  constructor() { this.normalRadius = 3; this.currentRadius = 3; this.targetRadius = 3; this.boostRadius = 6; this.boostRemaining = 0; this.weakRemaining = 0; this.obscuredRemaining = 0; this.protectionRemaining = 0; this.burst = 0; this.lastEffect = 'normal'; }

  refreshRadius() { this.targetRadius = this.obscuredRemaining > 0 ? 1.65 : this.boostRemaining > 0 ? this.boostRadius : this.weakRemaining > 0 ? 4.5 : this.normalRadius; }

  obscure() {
    if (this.protectionRemaining > 0) return false;
    this.obscuredRemaining = 3;
    this.protectionRemaining = 5;
    this.refreshRadius();
    return true;
  }

  update(dt) {
    this.boostRemaining = Math.max(0, this.boostRemaining - dt);
    this.weakRemaining = Math.max(0, this.weakRemaining - dt);
    this.obscuredRemaining = Math.max(0, this.obscuredRemaining - dt);
    this.protectionRemaining = Math.max(0, this.protectionRemaining - dt);
    this.refreshRadius();
    this.currentRadius = lerp(this.currentRadius, this.targetRadius, 1 - Math.exp(-dt * 8));
    this.burst = Math.max(0, this.burst - dt);
  }

  collect(product) {
    this.obscuredRemaining = 0;
    if (product.visionEffect === 'range') { this.boostRemaining = Math.max(this.boostRemaining, product.duration); this.weakRemaining = 0; this.boostRadius = product.strength; this.lastEffect = 'expanded'; }
    if (product.visionEffect === 'duration') {
      if (this.boostRemaining > 0) { this.boostRemaining += product.duration; this.lastEffect = 'extended'; }
      else { this.weakRemaining = Math.max(this.weakRemaining, product.duration); this.targetRadius = 4.5; this.lastEffect = 'extended'; }
    }
    this.burst = 0.55;
    this.refreshRadius();
  }

  getMeterPercent() { return Math.round(clamp(((this.currentRadius - this.normalRadius) / 3) * 70 + 30, 8, 100)); }
  getStatus() {
    if (this.obscuredRemaining > 0) return { label: 'INK CLOUD', remaining: this.obscuredRemaining, radius: this.currentRadius };
    if (this.boostRemaining > 0) return { label: 'VISION BOOST', remaining: this.boostRemaining, radius: this.currentRadius };
    if (this.weakRemaining > 0) return { label: 'VISION EXTENDED', remaining: this.weakRemaining, radius: this.currentRadius };
    return { label: 'NORMAL VISION', remaining: 0, radius: this.currentRadius };
  }

  drawBurst(ctx, x, y, time) {
    if (this.burst <= 0) return;
    const progress = 1 - this.burst / 0.55;
    const radius = 16 + progress * 74;
    ctx.save(); ctx.globalAlpha = (1 - progress) * 0.72; ctx.strokeStyle = '#f7c873'; ctx.lineWidth = 3; ctx.shadowColor = '#f7c873'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fff1bd';
    for (let index = 0; index < 7; index += 1) { const angle = time * 2 + index * 0.9; const distance = 27 + progress * 52; ctx.beginPath(); ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 1.5 + (1 - progress) * 1.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
