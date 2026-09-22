export class HazardSystem {
  constructor(level, maze) {
    this.maze = maze;
    this.time = 0;
    this.hits = 0;
    this.traps = level.hazards.traps.map((trap) => ({ ...trap, ...maze.cellCenter(trap.col, trap.row), disabled: 0 }));
    this.monsters = level.hazards.monsters.map(({ path }) => ({
      path: path.map((p) => maze.cellCenter(p.col, p.row)),
      ...maze.cellCenter(path[0].col, path[0].row), target: 1, direction: 1, stunned: 0
    }));
  }

  trapState(trap) {
    if (trap.disabled > 0) return 'disabled';
    const phase = (this.time + trap.offset) % 6;
    return phase < 3.2 ? 'rest' : phase < 4 ? 'warning' : 'active';
  }

  applyPulse(scan) {
    let affected = 0;
    for (const trap of this.traps) if (scan.containsPoint(trap.x, trap.y)) { trap.disabled = 4; affected++; }
    for (const monster of this.monsters) if (scan.containsPoint(monster.x, monster.y)) { monster.stunned = 3; affected++; }
    return affected;
  }

  update(dt, player, vision, onHit) {
    this.time += dt;
    for (const trap of this.traps) trap.disabled = Math.max(0, trap.disabled - dt);
    for (const monster of this.monsters) {
      const movingTime = Math.max(0, dt - monster.stunned);
      monster.stunned = Math.max(0, monster.stunned - dt);
      let remaining = movingTime * this.maze.tileSize * .85;
      while (remaining > 0) {
        const target = monster.path[monster.target];
        const dx = target.x - monster.x, dy = target.y - monster.y;
        const distance = Math.hypot(dx, dy);
        const step = Math.min(distance, remaining);
        if (distance) { monster.x += dx / distance * step; monster.y += dy / distance * step; }
        remaining -= step;
        if (distance <= step) {
          if (monster.target === monster.path.length - 1) monster.direction = -1;
          if (monster.target === 0) monster.direction = 1;
          monster.target += monster.direction;
        }
      }
    }
    const trap = this.traps.find((p) => this.trapState(p) === 'active' && Math.hypot(p.x - player.x, p.y - player.y) < this.maze.tileSize * .55);
    const monster = this.monsters.find((p) => !p.stunned && Math.hypot(p.x - player.x, p.y - player.y) < this.maze.tileSize * .52);
    if ((trap || monster) && vision.obscure()) { this.hits++; onHit?.(trap ? '墨霧陷阱' : '暗影怪'); }
  }

  draw(ctx, time) {
    const t = this.maze.tileSize;
    for (const trap of this.traps) {
      if (!this.maze.isCellExplored(trap.col, trap.row)) continue;
      const state = this.trapState(trap);
      const visible = this.maze.isPointVisible(trap.x, trap.y);
      const color = !visible ? '#867ca2' : state === 'disabled' ? '#8fe6d1' : state === 'active' ? '#f292bc' : state === 'warning' ? '#ffd18d' : '#b8a1ff';
      ctx.save(); ctx.translate(trap.x, trap.y); ctx.globalAlpha = visible ? 1 : .35;
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 3, t * .31, t * .2, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(!visible ? '◇' : state === 'warning' ? '!' : state === 'disabled' ? '−' : '≋', 0, 5);
      if (visible && state === 'active') {
        ctx.globalAlpha = .3; ctx.beginPath(); ctx.arc(0, 0, t * (.43 + Math.sin(time * 4) * .04), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (visible) { ctx.font = '9px system-ui'; ctx.fillText({ rest: '休眠', warning: '即將噴發', active: '墨霧', disabled: '已封印' }[state], 0, t * .52); }
      ctx.restore();
    }
    for (const monster of this.monsters) {
      if (!this.maze.isPointVisible(monster.x, monster.y)) continue;
      const color = monster.stunned ? '#8fe6d1' : '#f292bc';
      ctx.save(); ctx.translate(monster.x, monster.y + Math.sin(time * 3) * 2);
      ctx.fillStyle = '#573451'; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.shadowColor = color; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.moveTo(-t * .25, t * .2); ctx.quadraticCurveTo(-t * .36, -t * .37, 0, -t * .33);
      ctx.quadraticCurveTo(t * .36, -t * .37, t * .25, t * .2);
      ctx.lineTo(t * .12, t * .13); ctx.lineTo(0, t * .24); ctx.lineTo(-t * .12, t * .13); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = color;
      for (const x of [-t * .1, t * .1]) { ctx.beginPath(); ctx.ellipse(x, -t * .06, 2, monster.stunned ? 1 : 3, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.fillText(monster.stunned ? '暈眩' : '暗影怪', 0, t * .52); ctx.restore();
    }
  }

  drawProtection(ctx, player, vision) {
    if (!vision.protectionRemaining) return;
    ctx.save(); ctx.strokeStyle = vision.obscuredRemaining ? '#f292bc' : '#8fe6d1'; ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(player.x, player.y, this.maze.tileSize * .44, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
}
