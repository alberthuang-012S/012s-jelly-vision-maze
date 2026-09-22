const COLORS = {
  flowerBed: '#f3a7ba',
  plantBorder: '#9fe9b8',
  waterRipple: '#94e9ed',
  stoneBank: '#d1d6d8',
  crystalCluster: '#ccb4ff',
  crackedPillar: '#c6b7ff'
};

export class LandmarkSystem {
  constructor(level, maze) {
    this.maze = maze;
    this.landmarks = (level.landmarks || []).map((landmark) => ({
      ...landmark,
      discovered: false,
      ...maze.cellCenter(landmark.col, landmark.row)
    }));
  }

  updateDiscovery() {
    for (const landmark of this.landmarks) {
      if (mazePointVisible(this.maze, landmark)) landmark.discovered = true;
    }
  }

  draw(ctx, _time, maze) {
    for (const landmark of this.landmarks) {
      if (mazePointVisible(maze, landmark)) drawLandmark(ctx, maze.tileSize, landmark, false);
    }
  }

  drawMemory(ctx, maze, showMemory = true) {
    if (!showMemory) return;
    for (const landmark of this.landmarks) {
      if (landmark.discovered && !mazePointVisible(maze, landmark)) drawLandmark(ctx, maze.tileSize, landmark, true);
    }
  }
}

function mazePointVisible(maze, landmark) {
  return maze.isPointVisible(landmark.x, landmark.y);
}

function drawLandmark(ctx, tileSize, landmark, memory) {
  const footprint = landmark.footprint || { width: 0.64, height: 0.5 };
  const width = tileSize * footprint.width;
  const height = tileSize * footprint.height;
  const color = COLORS[landmark.type] || '#b8c9e4';
  ctx.save();
  ctx.translate(landmark.x, landmark.y);
  ctx.globalAlpha = memory ? 0.28 : 0.78;
  ctx.strokeStyle = color;
  ctx.fillStyle = memory ? 'transparent' : `${color}55`;
  ctx.lineWidth = Math.max(1, tileSize * (memory ? 0.018 : 0.028));
  ctx.setLineDash(memory ? [2, 3] : []);
  if (landmark.type === 'flowerBed') drawFlowerBed(ctx, width, height);
  else if (landmark.type === 'plantBorder') drawPlantBorder(ctx, width, height);
  else if (landmark.type === 'waterRipple') drawWaterRipple(ctx, width, height);
  else if (landmark.type === 'stoneBank') drawStoneBank(ctx, width, height);
  else if (landmark.type === 'crystalCluster') drawCrystalCluster(ctx, width, height);
  else if (landmark.type === 'crackedPillar') drawCrackedPillar(ctx, width, height);
  ctx.restore();
}

function drawFlowerBed(ctx, width, height) {
  ctx.beginPath(); ctx.roundRect(-width / 2, -height / 2, width, height, 5); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y] of [[-width * .24, 0], [0, -height * .12], [width * .24, height * .08]]) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, height * .12), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function drawPlantBorder(ctx, width, height) {
  ctx.beginPath(); ctx.moveTo(-width / 2, height * .28); ctx.lineTo(width / 2, height * .28); ctx.stroke();
  for (const x of [-width * .3, 0, width * .3]) {
    ctx.beginPath(); ctx.moveTo(x, height * .28); ctx.lineTo(x - width * .08, -height * .28); ctx.moveTo(x, height * .28); ctx.lineTo(x + width * .1, -height * .08); ctx.stroke();
  }
}

function drawWaterRipple(ctx, width, height) {
  ctx.beginPath(); ctx.ellipse(0, 0, width * .45, height * .24, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, width * .25, height * .12, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-width * .45, height * .34); ctx.lineTo(width * .42, height * .34); ctx.stroke();
}

function drawStoneBank(ctx, width, height) {
  for (const [x, y, radius] of [[-width * .3, height * .12, .16], [0, -height * .06, .2], [width * .3, height * .12, .15]]) {
    ctx.beginPath(); ctx.ellipse(x, y, width * radius, height * .28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function drawCrystalCluster(ctx, width, height) {
  for (const [x, scale] of [[-width * .24, .72], [0, 1], [width * .24, .62]]) {
    ctx.beginPath(); ctx.moveTo(x, -height * .5 * scale); ctx.lineTo(x + width * .12 * scale, height * .35 * scale); ctx.lineTo(x - width * .12 * scale, height * .35 * scale); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function drawCrackedPillar(ctx, width, height) {
  ctx.beginPath(); ctx.roundRect(-width * .25, -height * .5, width * .5, height, 4); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(-width * .08, -height * .28); ctx.lineTo(width * .06, -height * .02); ctx.lineTo(-width * .04, height * .2); ctx.lineTo(width * .1, height * .36); ctx.stroke();
}
