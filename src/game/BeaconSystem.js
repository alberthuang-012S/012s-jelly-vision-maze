export class BeaconSystem {
  constructor(level, maze) {
    this.maze = maze;
    this.beacons = level.beacons.map((point) => ({ ...point, ...maze.cellCenter(point.col, point.row), lit: false }));
    this.collected = 0;
    maze.exitUnlocked = this.isComplete();
  }
  isComplete() { return this.collected === this.beacons.length; }
  getTargets() { return this.beacons.filter((beacon) => !beacon.lit); }
  collectNearby(player, onActivate) {
    for (const beacon of this.beacons) {
      if (beacon.lit || Math.hypot(player.x - beacon.x, player.y - beacon.y) > this.maze.tileSize * .65) continue;
      beacon.lit = true; this.collected++;
      this.maze.exitUnlocked = this.isComplete();
      this.maze.revealAround(beacon.x, beacon.y, 4);
      onActivate?.(beacon, this.isComplete());
    }
  }
  draw(ctx, time) {
    const t = this.maze.tileSize;
    for (const beacon of this.beacons) {
      if (!this.maze.isCellExplored(beacon.col, beacon.row)) continue;
      ctx.save(); ctx.translate(beacon.x, beacon.y);
      ctx.globalAlpha = this.maze.isPointVisible(beacon.x, beacon.y) ? 1 : .4;
      const color = beacon.lit ? '#8fe6d1' : '#ffb38b';
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
      ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(-t * .21, t * .26); ctx.lineTo(t * .21, t * .26); ctx.stroke();
      ctx.fillRect(-3, -t * .08, 6, t * .3);
      const y = -t * .2 + Math.sin(time * 2 + beacon.col) * 2;
      ctx.beginPath(); ctx.moveTo(0, y - 8); ctx.lineTo(7, y); ctx.lineTo(0, y + 8); ctx.lineTo(-7, y); ctx.closePath();
      if (beacon.lit) ctx.fill(); else ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(beacon.lit ? '已點亮' : '信標', 0, t * .54);
      ctx.restore();
    }
  }
}
