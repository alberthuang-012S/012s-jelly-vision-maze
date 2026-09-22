import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { LEVELS } from './src/game/levelConfig.js';

const requiredFiles = ['index.html', 'src/styles.css', 'src/main.js', 'src/assets/jelly-front.webp', 'src/assets/jelly-player.webp', 'src/game/Game.js', 'src/game/Maze.js', 'src/game/Player.js', 'src/game/VisionSystem.js', 'src/game/SupplySystem.js', 'src/game/EchoSystem.js', 'src/game/HUD.js', 'src/game/levelConfig.js', 'src/game/assetRegistry.js'];
const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.resolve(file)));
if (missingFiles.length) throw new Error(`Missing required files: ${missingFiles.join(', ')}`);

// Validate the complete runtime import graph before publishing any build files.
const modules = new Set();
function validateModule(file) {
  if (modules.has(file)) return;
  modules.add(file);
  const source = fs.readFileSync(file, 'utf8');
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) throw new Error(check.stderr || `Invalid JavaScript: ${file}`);
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    if (match[1].startsWith('.')) validateModule(path.resolve(path.dirname(file), match[1]));
  }
}
validateModule(path.resolve('src/main.js'));

function reachable(level, target) {
  const queue = [[level.start.col, level.start.row]];
  const seen = new Set([`${level.start.col},${level.start.row}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const [col, row] = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextCol = col + dx;
      const nextRow = row + dy;
      const key = `${nextCol},${nextRow}`;
      if (nextCol >= 0 && nextRow >= 0 && nextCol < level.width && nextRow < level.height && level.map[nextRow][nextCol] !== '#' && !seen.has(key)) {
        seen.add(key);
        queue.push([nextCol, nextRow]);
      }
    }
  }
  return seen.has(`${target.col},${target.row}`);
}

for (const [id, level] of Object.entries(LEVELS)) {
  if (!reachable(level, level.exit)) throw new Error(`${id} exit is unreachable.`);
  for (const supply of level.supplies) if (!reachable(level, supply)) throw new Error(`${id} has an unreachable supply.`);
  for (const echo of level.echoes || []) if (!reachable(level, echo)) throw new Error(`${id} has an unreachable echo.`);
  for (const beacon of level.beacons) if (!reachable(level, beacon)) throw new Error(`${id} has an unreachable beacon.`);
  for (const hazard of [...level.hazards.traps, ...level.hazards.monsters.flatMap((monster) => monster.path)]) {
    if (!reachable(level, hazard)) throw new Error(`${id} has an unreachable hazard.`);
  }
}

const tests = spawnSync(process.execPath, ['--test'], { stdio: 'inherit' });
if (tests.status !== 0) throw new Error('Gameplay regression checks failed.');

const distDirectory = path.resolve('dist');
fs.mkdirSync(distDirectory, { recursive: true });
fs.copyFileSync(path.resolve('index.html'), path.join(distDirectory, 'index.html'));
fs.cpSync(path.resolve('src'), path.join(distDirectory, 'src'), { recursive: true });
if (fs.existsSync(path.resolve('.openai/hosting.json'))) {
  fs.mkdirSync(path.join(distDirectory, '.openai'), { recursive: true });
  fs.copyFileSync(path.resolve('.openai/hosting.json'), path.join(distDirectory, '.openai/hosting.json'));
}
console.log(`Jelly Vision Maze build validated: ${Object.keys(LEVELS).length} levels, ${modules.size} runtime modules, ${requiredFiles.length} required files.`);
