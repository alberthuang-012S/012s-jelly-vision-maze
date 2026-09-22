const playerSprite = typeof Image === 'undefined' ? null : Object.assign(new Image(), { src: new URL('../assets/jelly-player.webp', import.meta.url).href });

export class Player {
  constructor(position, tileSize) { this.x = position.x; this.y = position.y; this.tileSize = tileSize; this.radius = tileSize * 0.27; this.speed = tileSize * 4.25; this.direction = { x: 0, y: 1 }; this.walkTime = 0; }

  update(dt, movement, maze) {
    const moving = Math.hypot(movement.x, movement.y) > 0;
    this.moving = moving;
    if (moving) { this.direction = { x: movement.x, y: movement.y }; this.walkTime += dt * 10; }
    const distance = this.speed * dt;
    // Gently align a near miss at a corridor turn; never pull through a wall.
    const cell = maze.pointToCell(this.x, this.y);
    const center = maze.cellCenter(cell.col, cell.row);
    const nudge = (delta) => Math.sign(delta) * Math.min(Math.abs(delta), distance);
    const tolerance = this.tileSize * 0.24;
    if (movement.x && !movement.y && Math.abs(center.y - this.y) <= tolerance && !maze.isBlocked(this.x + movement.x * distance, center.y, this.radius)) {
      const alignedY = this.y + nudge(center.y - this.y);
      if (!maze.isBlocked(this.x, alignedY, this.radius)) this.y = alignedY;
    }
    if (movement.y && !movement.x && Math.abs(center.x - this.x) <= tolerance && !maze.isBlocked(center.x, this.y + movement.y * distance, this.radius)) {
      const alignedX = this.x + nudge(center.x - this.x);
      if (!maze.isBlocked(alignedX, this.y, this.radius)) this.x = alignedX;
    }
    const nextX = this.x + movement.x * distance;
    const nextY = this.y + movement.y * distance;
    if (!maze.isBlocked(nextX, this.y, this.radius)) this.x = nextX;
    if (!maze.isBlocked(this.x, nextY, this.radius)) this.y = nextY;
  }

  draw(ctx) {
    const bob = this.moving ? Math.sin(this.walkTime) * 1.7 : 0;
    const r = this.radius;
    ctx.save(); ctx.translate(this.x, this.y + bob); this.drawShadow(ctx, r); if (this.moving) this.drawTrail(ctx, r);
    if (playerSprite?.complete && playerSprite.naturalWidth) { this.drawSprite(ctx, r); ctx.restore(); return; }
    ctx.shadowColor = 'rgba(91, 141, 255, 0.62)'; ctx.shadowBlur = 16; ctx.fillStyle = '#78a9ff';
    ctx.beginPath(); ctx.moveTo(-r * 1.02, r * 0.2); ctx.bezierCurveTo(-r * 1.08, -r * 0.92, -r * 0.52, -r * 1.2, 0, -r * 1.15); ctx.bezierCurveTo(r * 0.55, -r * 1.18, r * 1.08, -r * 0.8, r * 1.02, r * 0.2); ctx.bezierCurveTo(r * 0.75, r * 0.85, r * 0.4, r * 0.66, 0, r * 0.86); ctx.bezierCurveTo(-r * 0.4, r * 0.66, -r * 0.75, r * 0.85, -r * 1.02, r * 0.2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(216, 236, 255, 0.44)'; ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.68, r * 0.3, r * 0.17, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.18, r * 0.105, 0, Math.PI * 2); ctx.arc(r * 0.34, -r * 0.18, r * 0.105, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27438b'; ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.16, r * 0.045, 0, Math.PI * 2); ctx.arc(r * 0.34, -r * 0.16, r * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e7f2ff'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.25, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.restore();
  }

  drawShadow(ctx, r) {
    ctx.save(); ctx.globalAlpha = 0.36; ctx.fillStyle = '#020a19'; ctx.filter = 'blur(2px)'; ctx.beginPath(); ctx.ellipse(0, r * 0.88, r * 0.82, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  drawTrail(ctx, r) {
    const length = Math.hypot(this.direction.x, this.direction.y) || 1; const dx = this.direction.x / length; const dy = this.direction.y / length; ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#8fe6ff'; for (let index = 1; index <= 3; index += 1) { const distance = r * (1.15 + index * 0.55); ctx.beginPath(); ctx.arc(-dx * distance, -dy * distance + r * 0.25, Math.max(1, r * (0.12 - index * 0.018)), 0, Math.PI * 2); ctx.fill(); } ctx.restore();
  }

  drawSprite(ctx, r) {
    const frameWidth = playerSprite.naturalWidth / 4; const frameHeight = playerSprite.naturalHeight; const moving = Math.hypot(this.direction.x, this.direction.y) > 0; const frame = this.direction.y < -0.35 ? 3 : this.direction.x < -0.35 ? 1 : this.direction.x > 0.35 ? 2 : 0; const destinationWidth = r * 3.45; const destinationHeight = destinationWidth * (frameHeight / frameWidth); ctx.imageSmoothingEnabled = false; ctx.shadowColor = 'rgba(61, 178, 255, 0.7)'; ctx.shadowBlur = moving ? 13 : 10; ctx.drawImage(playerSprite, frame * frameWidth, 0, frameWidth, frameHeight, -destinationWidth / 2, -destinationHeight * 0.58, destinationWidth, destinationHeight);
  }
}
