// Fixed seeds keep campaign routes identical across retries and devices.
export function createExpedition({ width, height, seed, beaconCount, ...details }) {
  const map = Array.from({ length: height }, () => Array(width).fill('#'));
  let state = seed >>> 0;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  const directions = [[2, 0], [-2, 0], [0, 2], [0, -2]];
  const stack = [{ col: 1, row: 1 }];
  map[1][1] = '.';
  while (stack.length) {
    const current = stack[stack.length - 1];
    const candidates = directions.map(([dx, dy]) => ({ col: current.col + dx, row: current.row + dy, dx, dy }))
      .filter(({ col, row }) => col > 0 && row > 0 && col < width - 1 && row < height - 1 && map[row][col] === '#');
    if (!candidates.length) { stack.pop(); continue; }
    const next = candidates[Math.floor(random() * candidates.length)];
    map[current.row + next.dy / 2][current.col + next.dx / 2] = '.';
    map[next.row][next.col] = '.';
    stack.push(next);
  }
  // A few cross-links offer alternate routes while retaining dead-end discoveries.
  for (let row = 1; row < height - 1; row++) for (let col = 1; col < width - 1; col++) {
    if (map[row][col] !== '#' || (row % 2 === col % 2)) continue;
    const connects = row % 2 ? map[row][col - 1] === '.' && map[row][col + 1] === '.' : map[row - 1][col] === '.' && map[row + 1][col] === '.';
    if (connects && random() < .09) map[row][col] = '.';
  }
  const queue = [{ col: 1, row: 1, distance: 0 }];
  const seen = new Set(['1,1']);
  for (const point of queue) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const col = point.col + dx, row = point.row + dy, key = `${col},${row}`;
    if (map[row]?.[col] !== '.' || seen.has(key)) continue;
    seen.add(key); queue.push({ col, row, distance: point.distance + 1 });
  }
  const degree = ({ col, row }) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => map[row + dy]?.[col + dx] === '.').length;
  const exit = queue.filter((point) => point.distance > 10 && degree(point) === 1).at(-1);
  if (!exit) throw new Error('Expedition needs a terminal exit.');
  const used = [{ col: 1, row: 1 }, exit];
  const candidates = queue.filter((point) => point.col % 2 && point.row % 2 && point.distance >= 6);
  const takeSpread = () => {
    let best = null, bestDistance = -1;
    for (const point of candidates) {
      const distance = Math.min(...used.map((other) => Math.abs(point.col - other.col) + Math.abs(point.row - other.row)));
      if (distance > bestDistance) { best = point; bestDistance = distance; }
    }
    if (!best || bestDistance <= 0) throw new Error('Not enough space for expedition items.');
    used.push(best);
    return { col: best.col, row: best.row };
  };
  const beacons = Array.from({ length: beaconCount }, takeSpread);
  const echoes = Array.from({ length: 5 + beaconCount }, takeSpread);
  const supplies = ['chocolate', 'drink', 'chocolate', 'drink'].map((type) => ({ type, ...takeSpread() }));
  map[1][1] = 'S'; map[exit.row][exit.col] = 'E';
  return { ...details, chapter: 2, map: map.map((row) => row.join('')), beacons, echoes, supplies };
}
