import { ASSET_REGISTRY } from './assetRegistry.js';

export class SupplySystem {
  constructor(level, maze) {
    this.maze = maze;
    this.supplies = level.supplies.map((supply, index) => ({ ...supply, id: `${supply.type}-${index}`, active: true, discovered: false, ...maze.cellCenter(supply.col, supply.row) }));
    this.collected = { chocolate: 0, drink: 0 };
  }
  updateDiscovery() {
    for (const supply of this.supplies) {
      if (supply.active && this.maze.isPointVisible(supply.x, supply.y)) supply.discovered = true;
    }
  }
  collectNearby(player, onCollect) {
    for (const supply of this.supplies) {
      if (!supply.active || Math.hypot(player.x - supply.x, player.y - supply.y) > this.maze.tileSize * 0.7) continue;
      supply.active = false; this.collected[supply.type] += 1; onCollect?.(ASSET_REGISTRY[supply.type], supply);
    }
  }
  getTotal() { return this.supplies.length; }
  getCollectedTotal() { return this.collected.chocolate + this.collected.drink; }
  draw(ctx, time, maze) {
    this.supplies.forEach((supply) => {
      if (!supply.active || !maze.isPointVisible(supply.x, supply.y)) return;
      const product = ASSET_REGISTRY[supply.type]; const bob = Math.sin(time * 3 + supply.x * 0.02) * maze.tileSize * 0.045; const pulse = 0.78 + Math.sin(time * 4 + supply.x) * 0.14;
      ctx.save(); ctx.translate(supply.x, supply.y + bob); drawPickupHalo(ctx, maze.tileSize, supply.type, pulse); ctx.shadowColor = supply.type === 'chocolate' ? `rgba(229, 170, 120, ${pulse})` : `rgba(143, 230, 209, ${pulse})`; ctx.shadowBlur = 16;
      if (supply.type === 'chocolate') drawChocolate(ctx, maze.tileSize); else drawDrink(ctx, maze.tileSize); ctx.restore();
      ctx.save(); const labelWidth = maze.tileSize * 0.82; ctx.fillStyle = 'rgba(5, 17, 31, 0.76)'; ctx.beginPath(); ctx.roundRect(supply.x - labelWidth / 2, supply.y + maze.tileSize * 0.42, labelWidth, maze.tileSize * 0.2, 5); ctx.fill(); ctx.fillStyle = supply.type === 'chocolate' ? '#f4d0aa' : '#c7fff0'; ctx.font = `500 ${Math.max(8, maze.tileSize * 0.17)}px DM Mono, monospace`; ctx.textAlign = 'center'; ctx.fillText(product.name, supply.x, supply.y + maze.tileSize * 0.56); ctx.restore();
    });
  }
  drawMemory(ctx, maze, showMemory = true) {
    if (!showMemory) return;
    this.supplies.forEach((supply) => {
      if (!supply.active || !supply.discovered || maze.isPointVisible(supply.x, supply.y)) return;
      drawMemoryMarker(ctx, maze.tileSize, supply);
    });
  }
}

function drawChocolate(ctx, t) {
  const w = t * 0.56; const h = t * 0.36; ctx.rotate(-0.12); ctx.fillStyle = '#734c58'; ctx.strokeStyle = '#f0c49e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#b87868'; ctx.fillRect(-w * 0.28, -h * 0.3, w * 0.16, h * 0.2); ctx.fillRect(w * 0.04, -h * 0.3, w * 0.16, h * 0.2); ctx.strokeStyle = 'rgba(255, 235, 199, 0.58)'; ctx.beginPath(); ctx.moveTo(-w * 0.34, h * 0.22); ctx.lineTo(w * 0.32, h * 0.22); ctx.stroke();
}
function drawDrink(ctx, t) {
  const w = t * 0.28; const h = t * 0.56; ctx.fillStyle = '#77d8c3'; ctx.strokeStyle = '#e0fff6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#dffff6'; ctx.fillRect(-w * 0.5, -h * 0.22, w, h * 0.22); ctx.fillStyle = '#2b8f9b'; ctx.font = `700 ${Math.max(7, t * 0.17)}px Manrope, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('+', 0, h * 0.1); ctx.strokeStyle = '#e1fff8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w * 0.35, -h * 0.61); ctx.lineTo(w * 0.33, -h * 0.61); ctx.stroke();
}

function drawPickupHalo(ctx, t, type, pulse) {
  const color = type === 'chocolate' ? '#f0b77e' : '#8fe6d1'; ctx.save(); ctx.globalAlpha = 0.18 + pulse * 0.12; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(0, 0, t * (0.36 + pulse * 0.05), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 0.18; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, t * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawMemoryMarker(ctx, t, supply) {
  const color = supply.type === 'chocolate' ? '#f0b77e' : '#8fe6d1';
  ctx.save();
  ctx.translate(supply.x, supply.y);
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, t * 0.025);
  ctx.setLineDash([2, 3]);
  if (supply.type === 'chocolate') {
    const w = t * 0.5; const h = t * 0.3;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 4); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(-w * 0.25, h * 0.28); ctx.lineTo(w * 0.24, -h * 0.28); ctx.stroke();
  } else {
    const w = t * 0.23; const h = t * 0.48;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 4); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(-w * 0.34, -h * 0.63); ctx.lineTo(w * 0.3, -h * 0.63); ctx.stroke();
  }
  ctx.restore();
}
