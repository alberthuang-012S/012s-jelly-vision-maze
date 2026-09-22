// Fixed, spaced encounters; keep the tutorial and pickup/exit cells safe.
export function createHazardLayout(level) {
  const number = Number(level.number);
  const traps = [], monsters = [];
  if (number < 2) return { traps, monsters };
  // Tutorial routes use authored encounters so the learning route stays safe
  // until the player has had a chance to understand the new choice.
  // Expedition routes intentionally keep the original deterministic layout.
  if (level.hazardPlan && number <= 3) {
    return {
      traps: level.hazardPlan.traps.map((trap) => ({ ...trap })),
      monsters: level.hazardPlan.monsters.map((monster) => ({ path: monster.path.map((point) => ({ ...point })) }))
    };
  }
  const distance = (a, b) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  const objectives = [level.exit, ...level.supplies, ...level.echoes, ...level.beacons];
  const reserved = [];
  const safe = (p) => level.map[p.row]?.[p.col] && level.map[p.row][p.col] !== '#'
    && distance(p, level.start) >= 6 && objectives.every((q) => distance(p, q) > 1)
    && reserved.every((q) => distance(p, q) > 2);
  const cells = level.map.flatMap((row, y) => row.map((_, x) => ({ col: x, row: y })))
    .filter(safe).sort((a, b) => ((a.col * 73 + a.row * 137 + number * 29) % 997) - ((b.col * 73 + b.row * 137 + number * 29) % 997));
  const monsterCount = number < 3 ? 0 : number < 5 ? 1 : number - 3;
  for (const cell of cells) {
    if (monsters.length >= monsterCount) break;
    if (!safe(cell)) continue;
    const path = [cell];
    for (let step = 0; step < 4; step++) {
      const tail = path.at(-1);
      const next = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([x, y]) => ({ col: tail.col + x, row: tail.row + y }))
        .find((p) => safe(p) && !path.some((q) => distance(p, q) === 0));
      if (!next) break;
      path.push(next);
    }
    if (path.length < 3) continue;
    monsters.push({ path }); reserved.push(...path);
  }
  for (const cell of cells) {
    if (traps.length >= Math.min(4, number)) break;
    if (!safe(cell)) continue;
    traps.push({ ...cell, offset: traps.length * 1.1 }); reserved.push(cell);
  }
  return { traps, monsters };
}
