const CHAIN_WINDOW = 8;

export class EchoSystem {
  constructor(level, maze) {
    this.maze = maze;
    this.echoes = (level.echoes || []).map((echo, index) => ({
      ...echo,
      id: `echo-${index}`,
      active: true,
      ...maze.cellCenter(echo.col, echo.row)
    }));
    this.collected = 0;
    this.chain = 0;
    this.maxChain = 0;
    this.lastCollectedAt = -Infinity;
  }

  collectNearby(player, elapsed, onCollect) {
    for (const echo of this.echoes) {
      if (!echo.active || Math.hypot(player.x - echo.x, player.y - echo.y) > this.maze.tileSize * 0.72) continue;
      echo.active = false;
      this.collected += 1;
      this.chain = elapsed - this.lastCollectedAt <= CHAIN_WINDOW ? this.chain + 1 : 1;
      this.maxChain = Math.max(this.maxChain, this.chain);
      this.lastCollectedAt = elapsed;
      onCollect?.(echo, this.chain);
    }
  }

  getTotal() { return this.echoes.length; }
  getCollectedTotal() { return this.collected; }

  getStatus(elapsed) {
    const activeChain = elapsed - this.lastCollectedAt <= CHAIN_WINDOW ? this.chain : 0;
    return {
      collected: this.collected,
      total: this.getTotal(),
      chain: activeChain,
      remaining: activeChain ? Math.max(0, CHAIN_WINDOW - (elapsed - this.lastCollectedAt)) : 0,
      maxChain: this.maxChain
    };
  }

  draw(ctx, time, maze) {
    this.echoes.forEach((echo) => {
      if (!echo.active || !maze.isPointVisible(echo.x, echo.y)) return;
      const pulse = 0.62 + Math.sin(time * 4.4 + echo.x * 0.018) * 0.18;
      const t = maze.tileSize;
      ctx.save();
      ctx.translate(echo.x, echo.y);
      ctx.globalAlpha = 0.22 + pulse * 0.12;
      ctx.strokeStyle = '#8fe6d1';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, t * (0.31 + pulse * 0.06), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#8fe6d1';
      ctx.shadowColor = '#8fe6d1';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, t * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#dffff6';
      ctx.beginPath();
      ctx.moveTo(0, -t * 0.2);
      ctx.lineTo(t * 0.13, 0);
      ctx.lineTo(0, t * 0.2);
      ctx.lineTo(-t * 0.13, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 31, 0.76)';
      ctx.beginPath();
      ctx.roundRect(echo.x - t * 0.34, echo.y + t * 0.4, t * 0.68, t * 0.2, 5);
      ctx.fill();
      ctx.fillStyle = '#c7fff0';
      ctx.font = `500 ${Math.max(8, t * 0.16)}px DM Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('ECHO', echo.x, echo.y + t * 0.54);
      ctx.restore();
    });
  }
}

export { CHAIN_WINDOW };
