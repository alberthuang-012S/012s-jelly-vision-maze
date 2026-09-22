export class Maze {
  constructor(level, tileSize = 42) {
    this.level = level;
    this.tileSize = tileSize;
    this.width = level.width * tileSize;
    this.height = level.height * tileSize;
    this.explored = new Set();
    this.visited = new Set();
    this.visible = new Set();
    this.pulseVisible = new Set();
    this.walkableCount = level.map.flat().filter((cell) => cell !== '#').length;
    this.exploredWalkable = 0;
    this.visibilityKey = '';
  }

  cellKey(col, row) { return `${col},${row}`; }
  isWall(col, row) { return col < 0 || row < 0 || col >= this.level.width || row >= this.level.height || this.level.map[row][col] === '#'; }
  cellCenter(col, row) { return { x: (col + 0.5) * this.tileSize, y: (row + 0.5) * this.tileSize }; }
  pointToCell(x, y) { return { col: Math.floor(x / this.tileSize), row: Math.floor(y / this.tileSize) }; }

  isBlocked(x, y, radius = 10) {
    const points = [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]];
    return points.some(([px, py]) => this.isWall(Math.floor(px / this.tileSize), Math.floor(py / this.tileSize)));
  }

  updateVisibility(x, y, radiusInCells) {
    const center = this.pointToCell(x, y);
    const visibilityKey = `${center.col},${center.row},${radiusInCells.toFixed(2)}`;
    if (visibilityKey === this.visibilityKey) return;
    this.visibilityKey = visibilityKey;
    this.visible.clear();
    const cellRadius = Math.ceil(radiusInCells + 1);
    for (let row = center.row - cellRadius; row <= center.row + cellRadius; row += 1) {
      for (let col = center.col - cellRadius; col <= center.col + cellRadius; col += 1) {
        if (col < 0 || row < 0 || col >= this.level.width || row >= this.level.height) continue;
        if (Math.hypot(col - center.col, row - center.row) <= radiusInCells + 0.72) {
          const key = this.cellKey(col, row);
          this.visible.add(key);
          this.explore(col, row);
        }
      }
    }
  }

  revealAround(x, y, radiusInCells = 2.5) {
    const center = this.pointToCell(x, y);
    const cellRadius = Math.ceil(radiusInCells);
    for (let row = center.row - cellRadius; row <= center.row + cellRadius; row += 1) {
      for (let col = center.col - cellRadius; col <= center.col + cellRadius; col += 1) {
        if (col < 0 || row < 0 || col >= this.level.width || row >= this.level.height) continue;
        if (Math.hypot(col - center.col, row - center.row) <= radiusInCells + 0.55) {
          this.explore(col, row);
        }
      }
    }
  }

  updatePulseVisibility(scan) {
    this.pulseVisible.clear();
    if (!scan.cone || scan.remaining <= 0) return;
    const center = this.pointToCell(scan.cone.x, scan.cone.y);
    const reach = Math.ceil(scan.cone.radius / this.tileSize);
    for (let row = Math.max(0, center.row - reach); row <= Math.min(this.level.height - 1, center.row + reach); row++) {
      for (let col = Math.max(0, center.col - reach); col <= Math.min(this.level.width - 1, center.col + reach); col++) {
        const point = this.cellCenter(col, row);
        if (!scan.containsPoint(point.x, point.y)) continue;
        this.pulseVisible.add(this.cellKey(col, row));
        this.explore(col, row);
      }
    }
  }

  isCellVisible(col, row) { const key = this.cellKey(col, row); return this.visible.has(key) || this.pulseVisible.has(key); }
  isCellExplored(col, row) { return this.explored.has(this.cellKey(col, row)); }
  isCellVisited(col, row) { return this.visited.has(this.cellKey(col, row)); }
  isPointVisible(x, y) { const cell = this.pointToCell(x, y); return this.isCellVisible(cell.col, cell.row); }
  visit(col, row) {
    if (this.isWall(col, row)) return false;
    const key = this.cellKey(col, row);
    if (!this.explored.has(key)) return false;
    const wasVisited = this.visited.has(key);
    this.visited.add(key);
    return !wasVisited;
  }
  visitPoint(x, y) {
    const cell = this.pointToCell(x, y);
    return this.visit(cell.col, cell.row);
  }
  explore(col, row) {
    const key = this.cellKey(col, row);
    if (this.explored.has(key)) return;
    this.explored.add(key);
    if (!this.isWall(col, row)) this.exploredWalkable += 1;
  }
  getExplorationRate() { return Math.floor(this.exploredWalkable / Math.max(1, this.walkableCount) * 100); }

  drawFootprints(ctx, showMemory = true, excludedCell = null) {
    if (!showMemory || !this.visited.size) return;
    const t = this.tileSize;
    const radius = Math.max(1.15, Math.min(2.2, t * 0.045));
    ctx.save();
    ctx.fillStyle = '#a7eedb';
    for (const key of this.visited) {
      const [col, row] = key.split(',').map(Number);
      if (this.isWall(col, row) || !this.isCellExplored(col, row)) continue;
      if (excludedCell && excludedCell.col === col && excludedCell.row === row) continue;
      const visible = this.isCellVisible(col, row);
      ctx.globalAlpha = visible ? 0.34 : 0.22;
      ctx.beginPath();
      ctx.arc(col * t + t * 0.28, row * t + t * 0.72, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  draw(ctx, time) {
    const { tileSize: t, level } = this;
    const palette = this.getPalette();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = palette.void;
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawAmbientField(ctx, time, palette);
    for (let row = 0; row < level.height; row += 1) {
      for (let col = 0; col < level.width; col += 1) {
        const visible = this.isCellVisible(col, row);
        const explored = this.isCellExplored(col, row);
        if (!visible && !explored) continue;
        const x = col * t;
        const y = row * t;
        const alpha = visible ? 1 : 0.52;
        if (this.isWall(col, row)) {
          ctx.fillStyle = visible ? palette.wall : `rgba(${palette.wallRgb}, ${alpha})`;
          this.drawWall(ctx, x, y, t, visible);
        } else {
          ctx.fillStyle = visible ? palette.floor : `rgba(${palette.floorRgb}, ${alpha})`;
          ctx.fillRect(x + 1, y + 1, t - 2, t - 2);
          this.drawFloorTexture(ctx, x, y, t, col, row, visible, time, palette);
          if (visible) this.drawDecoration(ctx, x, y, t, col, row, time, palette);
        }
      }
    }
    const start = level.start;
    if (this.isCellVisible(start.col, start.row)) this.drawStart(ctx, start.col, start.row, t, time);
    const exit = level.exit;
    if (this.isCellVisible(exit.col, exit.row)) {
      this.drawExit(ctx, exit.col, exit.row, t, time);
    }
  }

  drawWall(ctx, x, y, t, bright) {
    const radius = Math.min(10, t * 0.22);
    ctx.beginPath(); ctx.roundRect(x + 2, y + 2, t - 4, t - 4, radius); ctx.fill();
    ctx.fillStyle = bright ? 'rgba(176, 226, 255, 0.13)' : 'rgba(107, 181, 211, 0.08)'; ctx.fillRect(x + t * 0.18, y + t * 0.2, t * 0.5, 2);
    ctx.fillStyle = bright ? 'rgba(4, 20, 38, 0.24)' : 'rgba(2, 12, 25, 0.18)'; ctx.fillRect(x + t * 0.16, y + t * 0.72, t * 0.68, 2);
    if (bright) { ctx.strokeStyle = 'rgba(151, 218, 255, 0.25)'; ctx.lineWidth = 1; ctx.stroke(); }
  }

  getPalette() {
    if (this.level.number === '04') return { void: '#19141d', wall: '#735047', wallRgb: '80, 52, 45', floor: '#3b3343', floorRgb: '44, 34, 49', accent: '#ffc18b' };
    if (this.level.number === '05') return { void: '#071c1c', wall: '#37664f', wallRgb: '35, 64, 45', floor: '#21443d', floorRgb: '24, 46, 40', accent: '#b9e88b' };
    if (this.level.number === '06') return { void: '#171227', wall: '#614279', wallRgb: '60, 36, 76', floor: '#353658', floorRgb: '36, 35, 62', accent: '#f0a7d8' };
    if (this.level.number === '03') return { void: '#071426', wall: '#3d3e83', wallRgb: '34, 40, 82', floor: '#20456e', floorRgb: '23, 47, 79', accent: '#a78bff' };
    if (this.level.number === '02') return { void: '#061827', wall: '#245f7a', wallRgb: '23, 66, 86', floor: '#18516b', floorRgb: '17, 51, 72', accent: '#72e0d5' };
    return { void: '#061526', wall: '#24537a', wallRgb: '24, 59, 88', floor: '#164768', floorRgb: '17, 51, 78', accent: '#8ad7ff' };
  }

  drawFloorTexture(ctx, x, y, t, col, row, visible, time, palette) {
    const seed = (col * 17 + row * 31) % 9; const alpha = visible ? 0.14 : 0.05; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = palette.accent; ctx.fillStyle = palette.accent; ctx.lineWidth = 1;
    if (seed % 3 === 0) { ctx.beginPath(); ctx.moveTo(x + t * 0.2, y + t * 0.7); ctx.lineTo(x + t * 0.26, y + t * 0.54); ctx.lineTo(x + t * 0.31, y + t * 0.7); ctx.stroke(); }
    if (seed % 3 === 1) { ctx.beginPath(); ctx.arc(x + t * 0.72, y + t * 0.3, 1.5 + Math.sin(time * 2 + seed) * 0.4, 0, Math.PI * 2); ctx.fill(); }
    if (seed % 3 === 2) { ctx.beginPath(); ctx.moveTo(x + t * 0.63, y + t * 0.68); ctx.lineTo(x + t * 0.78, y + t * 0.56); ctx.stroke(); }
    ctx.restore();
  }

  drawAmbientField(ctx, time, palette) {
    const spots = [[0.16, 0.18, 0.28], [0.78, 0.29, 0.22], [0.46, 0.76, 0.3]];
    ctx.save();
    spots.forEach(([xRatio, yRatio, size], index) => {
      const x = this.width * xRatio + Math.sin(time * 0.16 + index) * this.tileSize * 2;
      const y = this.height * yRatio + Math.cos(time * 0.13 + index) * this.tileSize;
      const radius = Math.max(this.width, this.height) * size;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, palette.accent);
      gradient.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.045;
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = palette.accent;
    for (let index = 0; index < 18; index += 1) {
      const x = ((index * 173 + 61) % Math.max(1, this.width - 8)) + 4;
      const y = ((index * 97 + 43) % Math.max(1, this.height - 8)) + 4;
      const radius = 0.7 + ((index * 7) % 4) * 0.25;
      ctx.beginPath(); ctx.arc(x, y, radius + Math.sin(time * 1.7 + index) * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawDecoration(ctx, x, y, t, col, row, time, palette) {
    const seed = Math.abs(col * 23 + row * 41 + Number(this.level.number) * 7) % 11;
    const alpha = 0.18 + Math.sin(time * 1.4 + seed) * 0.035;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = palette.accent; ctx.fillStyle = palette.accent; ctx.lineWidth = 1.2;
    if (this.level.number === '01' && seed <= 2) {
      const cx = x + t * 0.74; const cy = y + t * 0.72;
      for (let index = 0; index < 3; index += 1) { const angle = index * 2.1; ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * 3.2, cy + Math.sin(angle) * 3.2, 2.1, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#f4a9b8'; ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (this.level.number === '02' && seed <= 2) {
      const cx = x + t * 0.72; const cy = y + t * 0.72;
      ctx.beginPath(); ctx.arc(cx, cy, 4 + Math.sin(time * 2 + seed) * 0.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
    } else if (this.level.number === '03' && seed <= 2) {
      const cx = x + t * 0.72; const cy = y + t * 0.7;
      ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 4, cy + 2); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 4, cy + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  drawStart(ctx, col, row, t, time) {
    const { x, y } = this.cellCenter(col, row); const pulse = 0.5 + Math.sin(time * 3) * 0.5; ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.22 + pulse * 0.08; ctx.strokeStyle = '#8fe6d1'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(0, 1, t * 0.34 + pulse * 2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 0.18; ctx.fillStyle = '#8fe6d1'; ctx.beginPath(); ctx.arc(0, 1, t * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  drawExit(ctx, col, row, t, time) {
    const { x, y } = this.cellCenter(col, row);
    const unlocked = this.exitUnlocked !== false;
    const color = unlocked ? '#f7c873' : '#9fa7ba';
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = color; ctx.shadowBlur = unlocked ? 18 : 0;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-t * .24, t * .2); ctx.lineTo(-t * .24, -t * .06); ctx.arc(0, -t * .06, t * .24, Math.PI, 0); ctx.lineTo(t * .24, t * .2); ctx.stroke();
    ctx.fillStyle = unlocked ? 'rgba(247,200,115,.2)' : 'rgba(159,167,186,.12)';
    ctx.fillRect(-t * .2, -t * .01, t * .4, t * .24);
    if (!unlocked) { ctx.beginPath(); ctx.moveTo(-t * .18, 0); ctx.lineTo(t * .18, t * .18); ctx.moveTo(t * .18, 0); ctx.lineTo(-t * .18, t * .18); ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.fillStyle = color;
    ctx.font = `500 ${Math.max(9, t * .2)}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(unlocked ? 'EXIT' : '待點亮信標', 0, -t * .4); ctx.restore();
  }
}
