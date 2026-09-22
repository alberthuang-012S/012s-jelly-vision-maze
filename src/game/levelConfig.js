import { createExpedition } from './expeditionLevels.js';
import { createHazardLayout } from './hazardLayout.js';

function corridorMap({ width, height, start, exit, paths }) {
  const map = Array.from({ length: height }, () => Array(width).fill('#'));
  const carve = (col, row) => {
    if (col > 0 && row > 0 && col < width - 1 && row < height - 1) map[row][col] = '.';
  };
  for (const path of paths) {
    for (let index = 1; index < path.length; index += 1) {
      const from = path[index - 1];
      const to = path[index];
      let col = from.col;
      let row = from.row;
      carve(col, row);
      while (col !== to.col || row !== to.row) {
        if (col !== to.col) col += Math.sign(to.col - col);
        else row += Math.sign(to.row - row);
        carve(col, row);
      }
    }
  }
  map[start.row][start.col] = 'S';
  map[exit.row][exit.col] = 'E';
  return map.map((row) => row.join(''));
}

const rawLevels = {
  'level-1': {
    number: '01', name: '第一次看見', shortName: '第一次看見', durationHint: '35–60 秒', timeBudget: 55, rulesVersion: 2,
    theme: '微光花園', description: '跟著第一束光，練習記住走過的路。', accent: '#8ad7ff',
    map: corridorMap({ width: 17, height: 13, start: { col: 1, row: 1 }, exit: { col: 15, row: 11 }, paths: [
      [{ col: 1, row: 1 }, { col: 8, row: 1 }, { col: 8, row: 3 }, { col: 8, row: 6 }, { col: 15, row: 6 }, { col: 15, row: 11 }],
      [{ col: 8, row: 1 }, { col: 13, row: 1 }, { col: 13, row: 4 }, { col: 15, row: 4 }, { col: 15, row: 6 }],
      [{ col: 8, row: 6 }, { col: 4, row: 6 }, { col: 4, row: 11 }, { col: 1, row: 11 }, { col: 1, row: 1 }],
      [{ col: 4, row: 11 }, { col: 10, row: 11 }, { col: 10, row: 8 }, { col: 15, row: 8 }, { col: 15, row: 6 }],
      [{ col: 8, row: 6 }, { col: 8, row: 9 }, { col: 10, row: 9 }, { col: 10, row: 8 }]
    ]}),
    supplies: [{ type: 'chocolate', col: 8, row: 3 }],
    echoes: [{ col: 3, row: 1 }, { col: 13, row: 3 }, { col: 4, row: 9 }],
    landmarks: [
      { id: 'garden-flower-bed', type: 'flowerBed', col: 8, row: 1, footprint: { width: 0.64, height: 0.42 } },
      { id: 'garden-plant-border', type: 'plantBorder', col: 15, row: 8, footprint: { width: 0.62, height: 0.46 } }
    ],
    hazardPlan: { traps: [], monsters: [] }
  },
  'level-2': {
    number: '02', name: '視野接力', shortName: '視野接力', durationHint: '45–80 秒', timeBudget: 75, rulesVersion: 2,
    theme: '藍色水道', description: '岔路藏著補給，選擇自己的探索節奏。', accent: '#72e0d5',
    map: corridorMap({ width: 21, height: 15, start: { col: 1, row: 1 }, exit: { col: 19, row: 13 }, paths: [
      [{ col: 1, row: 1 }, { col: 7, row: 1 }, { col: 7, row: 3 }, { col: 7, row: 7 }, { col: 11, row: 7 }, { col: 19, row: 7 }, { col: 19, row: 13 }],
      [{ col: 7, row: 1 }, { col: 15, row: 1 }, { col: 15, row: 5 }, { col: 19, row: 5 }, { col: 19, row: 7 }],
      [{ col: 7, row: 7 }, { col: 3, row: 7 }, { col: 3, row: 13 }, { col: 11, row: 13 }, { col: 11, row: 7 }],
      [{ col: 11, row: 7 }, { col: 15, row: 7 }, { col: 15, row: 11 }, { col: 19, row: 11 }, { col: 19, row: 7 }]
    ]}),
    supplies: [{ type: 'chocolate', col: 7, row: 3 }, { type: 'drink', col: 11, row: 7 }],
    echoes: [{ col: 15, row: 1 }, { col: 3, row: 13 }, { col: 15, row: 11 }],
    landmarks: [
      { id: 'water-ripple', type: 'waterRipple', col: 7, row: 7, footprint: { width: 0.68, height: 0.44 } },
      { id: 'water-stone-bank', type: 'stoneBank', col: 19, row: 7, footprint: { width: 0.66, height: 0.44 } }
    ],
    hazardPlan: {
      traps: [{ col: 15, row: 5, offset: 0 }, { col: 3, row: 11, offset: 1.8 }],
      monsters: []
    }
  },
  'level-3': {
    number: '03', name: '看見風險', shortName: '看見風險', durationHint: '70–120 秒', timeBudget: 110, rulesVersion: 2,
    theme: '水晶迴廊', description: '穿越交錯的迴廊，找齊散落的微光。', accent: '#b8a1ff',
    map: corridorMap({ width: 25, height: 17, start: { col: 1, row: 1 }, exit: { col: 23, row: 15 }, paths: [
      [{ col: 1, row: 1 }, { col: 5, row: 1 }, { col: 5, row: 5 }, { col: 11, row: 5 }, { col: 11, row: 9 }, { col: 17, row: 9 }, { col: 17, row: 15 }, { col: 23, row: 15 }],
      [{ col: 5, row: 1 }, { col: 9, row: 1 }, { col: 9, row: 3 }, { col: 3, row: 3 }, { col: 3, row: 11 }, { col: 3, row: 15 }, { col: 9, row: 15 }, { col: 9, row: 13 }, { col: 15, row: 13 }, { col: 15, row: 15 }, { col: 17, row: 15 }],
      [{ col: 3, row: 11 }, { col: 9, row: 11 }, { col: 9, row: 13 }],
      [{ col: 9, row: 11 }, { col: 13, row: 11 }, { col: 13, row: 13 }, { col: 15, row: 13 }],
      [{ col: 15, row: 13 }, { col: 21, row: 13 }, { col: 21, row: 15 }, { col: 23, row: 15 }],
      [{ col: 11, row: 5 }, { col: 15, row: 5 }]
    ]}),
    supplies: [{ type: 'chocolate', col: 9, row: 3 }, { type: 'drink', col: 9, row: 11 }, { type: 'chocolate', col: 15, row: 13 }],
    echoes: [{ col: 7, row: 1 }, { col: 3, row: 3 }, { col: 13, row: 11 }, { col: 21, row: 13 }],
    landmarks: [
      { id: 'crystal-cluster', type: 'crystalCluster', col: 5, row: 3, footprint: { width: 0.62, height: 0.64 } },
      { id: 'cracked-pillar', type: 'crackedPillar', col: 17, row: 13, footprint: { width: 0.46, height: 0.7 } }
    ],
    hazardPlan: {
      traps: [{ col: 5, row: 5, offset: 0.4 }, { col: 11, row: 9, offset: 1.5 }, { col: 17, row: 9, offset: 2.4 }],
      monsters: [{ path: [{ col: 11, row: 5 }, { col: 12, row: 5 }, { col: 13, row: 5 }, { col: 14, row: 5 }, { col: 15, row: 5 }] }]
    },
    routePlan: {
      shortRisk: [{ col: 5, row: 1 }, { col: 5, row: 5 }, { col: 11, row: 5 }, { col: 11, row: 9 }, { col: 17, row: 9 }, { col: 17, row: 15 }],
      longSafe: [{ col: 5, row: 1 }, { col: 9, row: 1 }, { col: 9, row: 3 }, { col: 3, row: 3 }, { col: 3, row: 11 }, { col: 3, row: 15 }, { col: 9, row: 15 }, { col: 9, row: 13 }, { col: 15, row: 13 }, { col: 15, row: 15 }, { col: 17, row: 15 }]
    }
  },
  'level-4': createExpedition({ number: '04', name: 'AMBER SIGNAL', shortName: 'Amber Signal', theme: '琥珀信標', description: '喚醒沉睡的信標，讓出口重新亮起。', accent: '#ffc18b', width: 23, height: 17, seed: 4127, beaconCount: 1, durationHint: '60–120 SEC', timeBudget: 140 }),
  'level-5': createExpedition({ number: '05', name: 'MOSS CIRCUIT', shortName: 'Moss Circuit', theme: '苔光環路', description: '在環路之間點亮兩座信標，串起回家的光。', accent: '#b9e88b', width: 27, height: 19, seed: 5891, beaconCount: 2, durationHint: '90–150 SEC', timeBudget: 180 }),
  'level-6': createExpedition({ number: '06', name: 'AURORA NEXUS', shortName: 'Aurora Nexus', theme: '極光交匯', description: '三座信標、交錯岔路，完成最後的極光遠征。', accent: '#f0a7d8', width: 31, height: 23, seed: 6907, beaconCount: 3, durationHint: '120–210 SEC', timeBudget: 240 })
};

function normalizeLevel(level) {
  const width = level.map[0].length;
  const map = level.map.map((row) => {
    if (row.length !== width) throw new Error(`Level ${level.number} has an uneven map row.`);
    return [...row];
  });
  let start = null;
  let exit = null;
  for (let row = 0; row < map.length; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (map[row][col] === 'S') start = { col, row };
      if (map[row][col] === 'E') exit = { col, row };
    }
  }
  if (!start || !exit) throw new Error(`Level ${level.number} needs a start and exit.`);
  const normalized = {
    ...level,
    chapter: level.chapter || 1,
    rulesVersion: level.rulesVersion || 1,
    timeBudget: level.timeBudget || 100,
    width,
    height: map.length,
    map,
    start,
    exit,
    supplies: level.supplies.map((supply) => ({ ...supply })),
    echoes: (level.echoes || []).map((echo) => ({ ...echo })),
    beacons: (level.beacons || []).map((beacon) => ({ ...beacon })),
    landmarks: (level.landmarks || []).map((landmark) => ({
      ...landmark,
      footprint: { ...(landmark.footprint || { width: 0.64, height: 0.5 }) }
    })),
    hazardPlan: level.hazardPlan ? {
      traps: level.hazardPlan.traps.map((trap) => ({ ...trap })),
      monsters: level.hazardPlan.monsters.map((monster) => ({ path: monster.path.map((point) => ({ ...point })) }))
    } : null,
    routePlan: level.routePlan ? {
      shortRisk: level.routePlan.shortRisk.map((point) => ({ ...point })),
      longSafe: level.routePlan.longSafe.map((point) => ({ ...point }))
    } : null
  };
  return Object.freeze({ ...normalized, hazards: createHazardLayout(normalized) });
}

export const LEVELS = Object.freeze(Object.fromEntries(Object.entries(rawLevels).map(([id, level]) => [id, normalizeLevel(level)])));
