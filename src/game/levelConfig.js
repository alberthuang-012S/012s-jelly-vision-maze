import { createExpedition } from './expeditionLevels.js';
import { createHazardLayout } from './hazardLayout.js';

const rawLevels = {
  'level-1': {
    number: '01', name: 'SOFT START', shortName: 'Soft Start', durationHint: '30–45 SEC',
    theme: '微光花園', description: '跟著第一束光，練習記住走過的路。', accent: '#8ad7ff',
    map: [
      '###################', '#S................#', '#.#################', '#.................#',
      '#################.#', '#.................#', '#.#################', '#.................#',
      '#################.#', '#.................#', '#.#################', '#.................#',
      '#################E#', '#.................#', '###################'
    ],
    supplies: [{ type: 'chocolate', col: 8, row: 3 }],
    echoes: [{ col: 3, row: 1 }, { col: 10, row: 7 }, { col: 15, row: 11 }]
  },
  'level-2': {
    number: '02', name: 'BLUE DETOUR', shortName: 'Blue Detour', durationHint: '45–75 SEC',
    theme: '藍色水道', description: '岔路藏著補給，選擇自己的探索節奏。', accent: '#72e0d5',
    map: [
      '#########################', '#S......................#', '#.#####################.#', '#.......................#',
      '#####################.#.#', '#.......................#', '#.#####################.#', '#.......................#',
      '#####################.#.#', '#.......................#', '#.#####################.#', '#.......................#',
      '#####################.#.#', '#.......................#', '#.#####################.#', '#......................E#',
      '#########################'
    ],
    supplies: [{ type: 'chocolate', col: 17, row: 5 }, { type: 'drink', col: 6, row: 9 }],
    echoes: [{ col: 20, row: 3 }, { col: 5, row: 7 }, { col: 17, row: 13 }]
  },
  'level-3': {
    number: '03', name: 'GLOW DIVIDE', shortName: 'Glow Divide', durationHint: '60–100 SEC',
    theme: '水晶迴廊', description: '穿越交錯的迴廊，找齊散落的微光。', accent: '#b8a1ff',
    map: [
      '###############################', '#S............#...............#', '#.###########.#.#############.#', '#...........#.#.#.............#',
      '###########.#.#.#.#############', '#...........#...#.............#', '#.###########.###.###########.#', '#.............#...............#',
      '#############.#.###############', '#.............#...............#', '#.###########.#.#############.#', '#...........#.#.#.............#',
      '###########.#.#.#.#############', '#...........#...#.............#', '#.###########.###.###########.#', '#.............#...............#',
      '#############.#.###############', '#.............#...............#', '#.###########.#.#############.#', '#...........#.#.#.............#',
      '###########.#.#.#.#############', '#...........#...#............E#', '###############################'
    ],
    supplies: [{ type: 'chocolate', col: 6, row: 5 }, { type: 'drink', col: 23, row: 11 }, { type: 'chocolate', col: 15, row: 15 }],
    echoes: [{ col: 9, row: 3 }, { col: 22, row: 5 }, { col: 7, row: 15 }, { col: 25, row: 19 }]
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
    timeBudget: level.timeBudget || 100,
    width,
    height: map.length,
    map,
    start,
    exit,
    supplies: level.supplies.map((supply) => ({ ...supply })),
    echoes: (level.echoes || []).map((echo) => ({ ...echo })),
    beacons: (level.beacons || []).map((beacon) => ({ ...beacon }))
  };
  return Object.freeze({ ...normalized, hazards: createHazardLayout(normalized) });
}

export const LEVELS = Object.freeze(Object.fromEntries(Object.entries(rawLevels).map(([id, level]) => [id, normalizeLevel(level)])));
