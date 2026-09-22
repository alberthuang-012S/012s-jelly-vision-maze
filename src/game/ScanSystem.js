export const PULSE_DURATION = 2;
export const PULSE_RANGE = 7;
const HALF_ANGLE = Math.PI / 5;

export class ScanSystem {
  constructor() { this.charges = 2; this.remaining = 0; this.cooldown = 0; this.cone = null; this.used = 0; }
  update(dt) {
    this.remaining = Math.max(0, this.remaining - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.remaining) this.cone = null;
  }
  recharge() { this.charges = Math.min(2, this.charges + 1); }
  activate(maze, player) {
    if (!this.charges || this.cooldown > 0) return false;
    const direction = player.direction || { x: 0, y: 1 };
    const length = Math.hypot(direction.x, direction.y);
    const dx = length ? direction.x / length : 0;
    const dy = length ? direction.y / length : 1;
    // Snapshot the firing position and facing: this is a pulse, not a tracking light.
    this.cone = { x: player.x, y: player.y, dx, dy, angle: Math.atan2(dy, dx), halfAngle: HALF_ANGLE, radius: maze.tileSize * PULSE_RANGE };
    this.charges--; this.used++; this.remaining = PULSE_DURATION; this.cooldown = 1.2;
    return true;
  }
  containsPoint(x, y) {
    if (!this.cone || this.remaining <= 0) return false;
    const dx = x - this.cone.x, dy = y - this.cone.y;
    const distance = Math.hypot(dx, dy);
    if (distance > this.cone.radius) return false;
    return distance === 0 || (dx * this.cone.dx + dy * this.cone.dy) / distance >= Math.cos(HALF_ANGLE);
  }
  traceCone(ctx) {
    if (!this.cone || this.remaining <= 0) return;
    const { x, y, radius, angle } = this.cone;
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, angle - HALF_ANGLE, angle + HALF_ANGLE);
    ctx.closePath();
  }
  draw(ctx, reducedMotion = false) {
    if (!this.cone || this.remaining <= 0) return;
    const { x, y, radius, angle } = this.cone;
    ctx.save();
    const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, 'rgba(160, 237, 255, 0.03)');
    light.addColorStop(.65, 'rgba(160, 237, 255, 0.10)');
    light.addColorStop(1, 'rgba(160, 237, 255, 0.02)');
    ctx.fillStyle = light;
    ctx.strokeStyle = 'rgba(171, 237, 255, 0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); this.traceCone(ctx); ctx.fill(); ctx.stroke();
    if (!reducedMotion) {
      const wave = radius * (1 - this.remaining / PULSE_DURATION);
      ctx.strokeStyle = `rgba(207, 249, 255, ${this.remaining / PULSE_DURATION * .8})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, wave, angle - HALF_ANGLE, angle + HALF_ANGLE); ctx.stroke();
    }
    ctx.restore();
  }
}
