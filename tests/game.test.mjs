import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/game/levelConfig.js';
import { Maze } from '../src/game/Maze.js';
import { Player } from '../src/game/Player.js';
import { VisionSystem } from '../src/game/VisionSystem.js';
import { EchoSystem } from '../src/game/EchoSystem.js';
import { ProgressStore, PROGRESS_KEY } from '../src/game/ProgressStore.js';
import { getCamera } from '../src/game/Camera.js';
import { ASSET_REGISTRY } from '../src/game/assetRegistry.js';
import { Game } from '../src/game/Game.js';
import { InputController } from '../src/game/InputController.js';
import { ScanSystem } from '../src/game/ScanSystem.js';
import { createExpedition } from '../src/game/expeditionLevels.js';
import { createHazardLayout } from '../src/game/hazardLayout.js';
import { HazardSystem } from '../src/game/HazardSystem.js';
import { SupplySystem } from '../src/game/SupplySystem.js';
import { LandmarkSystem } from '../src/game/LandmarkSystem.js';

function route(maze, from, to, avoidExit = false) {
  const key = (p) => `${p.col},${p.row}`;
  const queue = [{ ...from, path: [] }];
  const seen = new Set([key(from)]);
  for (const current of queue) {
    if (key(current) === key(to)) return current.path;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { col: current.col + dx, row: current.row + dy };
      if (maze.isWall(next.col, next.row) || seen.has(key(next)) || (avoidExit && key(next) === key(maze.level.exit))) continue;
      seen.add(key(next)); queue.push({ ...next, path: [...current.path, next] });
    }
  }
  throw new Error('No route to ' + key(to));
}

test('exploration excludes walls, is monotonic, and reaches 100 only at completion', () => {
  const maze = new Maze(LEVELS['level-1']);
  maze.updateVisibility(63, 63, 3);
  const count = [...maze.explored].filter((key) => { const [col, row] = key.split(',').map(Number); return !maze.isWall(col, row); }).length;
  assert.equal(maze.getExplorationRate(), Math.floor(count / maze.walkableCount * 100));
  const first = maze.getExplorationRate();
  maze.updateVisibility(63, 63, 3);
  assert.equal(maze.getExplorationRate(), first);
  maze.revealAround(200, 200, 100);
  assert.equal(maze.getExplorationRate(), 100);
  assert.equal(maze.exploredWalkable, maze.walkableCount);
});

test('visited is a separate exposed-walkable record', () => {
  const level = LEVELS['level-1'];
  const maze = new Maze(level);
  const start = maze.cellCenter(level.start.col, level.start.row);
  const supply = maze.cellCenter(level.supplies[0].col, level.supplies[0].row);
  maze.updateVisibility(start.x, start.y, 3);
  assert.equal(maze.visitPoint(start.x, start.y), true);
  assert.equal(maze.visited.size, 1);
  assert.equal(maze.visit(level.start.col, level.start.row), false);
  assert.equal(maze.visit(level.start.col, level.start.row - 1), false);
  assert.equal(maze.visitPoint(supply.x, supply.y), false, 'revealing is not walking');
  maze.revealAround(supply.x, supply.y, 3);
  assert.equal(maze.visitPoint(supply.x, supply.y), true);
  assert.ok([...maze.visited].every((key) => {
    const [col, row] = key.split(',').map(Number);
    return !maze.isWall(col, row) && maze.isCellExplored(col, row);
  }));
});

test('supply discovery requires current visibility, including a pulse, and is per object', () => {
  const level = LEVELS['level-2'];
  const maze = new Maze(level);
  const supplies = new SupplySystem(level, maze);
  const start = maze.cellCenter(level.start.col, level.start.row);
  maze.updateVisibility(start.x, start.y, 3);
  supplies.updateDiscovery();
  assert.equal(supplies.supplies.every((supply) => !supply.discovered), true);

  const first = supplies.supplies[0];
  maze.revealAround(first.x, first.y, 3);
  supplies.updateDiscovery();
  assert.equal(first.discovered, false, 'terrain reveal alone is not an object discovery');
  maze.updateVisibility(first.x, first.y, 3);
  supplies.updateDiscovery();
  assert.equal(first.discovered, true);
  assert.equal(supplies.supplies[1].discovered, false);

  const pulseMaze = new Maze(level);
  const pulseSupplies = new SupplySystem(level, pulseMaze);
  const origin = pulseMaze.cellCenter(11, 13);
  pulseMaze.updateVisibility(origin.x, origin.y, 1);
  const scan = new ScanSystem();
  scan.activate(pulseMaze, { ...origin, direction: { x: 0, y: -1 } });
  pulseMaze.updatePulseVisibility(scan);
  pulseSupplies.updateDiscovery();
  assert.equal(pulseSupplies.supplies[1].discovered, true, 'a visible pulse can discover a drink');
  const charges = scan.charges;
  pulseSupplies.collectNearby(pulseSupplies.supplies[1], () => {});
  assert.equal(pulseSupplies.supplies[1].active, false);
  assert.equal(scan.charges, charges, 'discovery and collection do not change pulse charges');
});

test('first three routes use two non-colliding fixed landmarks and expeditions stay empty', () => {
  for (const [id, level] of Object.entries(LEVELS)) {
    const maze = new Maze(level);
    if (level.chapter === 1) {
      assert.equal(level.landmarks.length, 2);
      const occupied = new Set([level.start, level.exit, ...level.supplies, ...level.echoes, ...level.beacons, ...level.hazards.traps, ...level.hazards.monsters.flatMap((monster) => monster.path)].map(({ col, row }) => `${col},${row}`));
      assert.equal(new Set(level.landmarks.map(({ id }) => id)).size, level.landmarks.length);
      for (const landmark of level.landmarks) {
        assert.equal(maze.isWall(landmark.col, landmark.row), false);
        assert.equal(occupied.has(`${landmark.col},${landmark.row}`), false);
        assert.ok(landmark.footprint.width > 0 && landmark.footprint.height > 0);
      }
    } else {
      assert.deepEqual(level.landmarks, []);
    }
  }
  const level = LEVELS['level-1'];
  const maze = new Maze(level);
  const landmarks = new LandmarkSystem(level, maze);
  const start = maze.cellCenter(level.start.col, level.start.row);
  maze.updateVisibility(start.x, start.y, 3);
  landmarks.updateDiscovery();
  assert.equal(landmarks.landmarks.some((landmark) => landmark.discovered), false);
  const first = landmarks.landmarks[0];
  const point = maze.cellCenter(first.col, first.row);
  maze.updateVisibility(point.x, point.y, 3);
  landmarks.updateDiscovery();
  assert.equal(first.discovered, true);
});

test('vision drink extends a boost and all effects return smoothly to normal', () => {
  const vision = new VisionSystem();
  vision.collect(ASSET_REGISTRY.chocolate); vision.update(2);
  vision.collect(ASSET_REGISTRY.drink);
  assert.equal(vision.boostRemaining, 14);
  assert.equal(vision.targetRadius, 6);
  vision.update(14); vision.update(2);
  assert.equal(vision.getStatus().remaining, 0);
  assert.ok(Math.abs(vision.currentRadius - 3) < .001);
  vision.collect(ASSET_REGISTRY.drink);
  assert.equal(vision.targetRadius, 4.5);
  vision.collect(ASSET_REGISTRY.chocolate);
  assert.equal(vision.weakRemaining, 0);
  assert.equal(vision.targetRadius, 6);
});

test('ink shrinks vision, cannot stack during protection, and restores the surviving boost', () => {
  const vision = new VisionSystem();
  vision.collect(ASSET_REGISTRY.chocolate);
  assert.equal(vision.obscure(), true);
  assert.equal(vision.targetRadius, 1.65);
  vision.update(1);
  assert.ok(vision.currentRadius < 1.66);
  assert.ok(vision.getMeterPercent() < 30);
  assert.equal(vision.obscure(), false);
  assert.equal(vision.obscuredRemaining, 2);
  vision.update(2);
  assert.equal(vision.targetRadius, 6);
  assert.equal(vision.boostRemaining, 5);
  assert.equal(vision.obscure(), false);
  vision.update(2);
  assert.equal(vision.obscure(), true);
  vision.collect(ASSET_REGISTRY.drink);
  assert.equal(vision.obscuredRemaining, 0);
  assert.equal(vision.targetRadius, 6);
  assert.equal(vision.boostRemaining, 11);
  vision.update(12);
  assert.equal(vision.targetRadius, 3);
});

test('hazards are repeatable, reachable, spaced from objectives, and patrol only adjacent floor cells', () => {
  const manhattan = (a, b) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  for (const level of Object.values(LEVELS)) {
    assert.deepEqual(level.hazards, createHazardLayout(level));
    assert.equal(level.hazards.traps.length, Number(level.number) < 2 ? 0 : Math.min(4, Number(level.number)));
    assert.equal(level.hazards.monsters.length, Number(level.number) < 3 ? 0 : Number(level.number) < 5 ? 1 : Number(level.number) - 3);
    const maze = new Maze(level);
    for (const point of [...level.hazards.traps, ...level.hazards.monsters.flatMap((m) => m.path)]) {
      assert.equal(maze.isWall(point.col, point.row), false);
      assert.ok(manhattan(point, level.start) >= 6);
      for (const objective of [level.exit, ...level.supplies, ...level.echoes, ...level.beacons]) assert.ok(manhattan(point, objective) > 1);
      route(maze, level.start, point);
    }
    for (const { path } of level.hazards.monsters) {
      for (let i = 1; i < path.length; i++) assert.equal(manhattan(path[i - 1], path[i]), 1);
    }
  }
});

test('trap telegraphs before firing, hits once during protection, and pulse sealing expires', () => {
  const level = LEVELS['level-2'], maze = new Maze(level), hazards = new HazardSystem(level, maze), vision = new VisionSystem();
  const trap = hazards.traps[0];
  let hits = 0;
  hazards.update(3.3, trap, vision, () => hits++);
  assert.equal(hazards.trapState(trap), 'warning'); assert.equal(hits, 0);
  hazards.update(.8, trap, vision, () => hits++);
  assert.equal(hazards.trapState(trap), 'active'); assert.equal(hits, 1);
  hazards.update(.1, trap, vision, () => hits++); assert.equal(hits, 1);
  const scan = new ScanSystem();
  scan.activate(maze, { x: trap.x - maze.tileSize, y: trap.y, direction: { x: 1, y: 0 } });
  assert.ok(hazards.applyPulse(scan) > 0);
  assert.equal(hazards.trapState(trap), 'disabled');
  const freshVision = new VisionSystem();
  hazards.update(3.99, trap, freshVision); assert.equal(freshVision.obscuredRemaining, 0);
  hazards.update(.02, { x: 0, y: 0 }, freshVision); assert.equal(trap.disabled, 0);
});

test('monsters patrol without entering walls, hit on contact, and freeze only inside the pulse cone', () => {
  const level = LEVELS['level-3'], maze = new Maze(level), hazards = new HazardSystem(level, maze), vision = new VisionSystem();
  const monster = hazards.monsters[0];
  hazards.update(0, monster, vision);
  assert.equal(vision.obscuredRemaining, 3);
  const scan = new ScanSystem();
  scan.activate(maze, { x: monster.x - 42, y: monster.y, direction: { x: -1, y: 0 } });
  hazards.applyPulse(scan); assert.equal(monster.stunned, 0);
  const forward = new ScanSystem();
  forward.activate(maze, { x: monster.x - 42, y: monster.y, direction: { x: 1, y: 0 } });
  hazards.applyPulse(forward); assert.equal(monster.stunned, 3);
  const origin = { x: monster.x, y: monster.y };
  const safeVision = new VisionSystem();
  hazards.update(2.99, origin, safeVision);
  assert.equal(monster.x, origin.x); assert.equal(monster.y, origin.y); assert.equal(safeVision.obscuredRemaining, 0);
  hazards.update(.02, { x: 0, y: 0 }, safeVision);
  assert.ok(Math.hypot(monster.x - origin.x, monster.y - origin.y) > 0);
  for (let i = 0; i < 1500; i++) {
    hazards.update(.05, { x: 0, y: 0 }, safeVision);
    assert.equal(maze.isBlocked(monster.x, monster.y, maze.tileSize * .25), false);
  }
});

test('echoes collect once, chain within eight seconds, and reset after expiry', () => {
  const maze = new Maze(LEVELS['level-1']);
  const echoes = new EchoSystem(maze.level, maze);
  const chains = [];
  echoes.collectNearby(echoes.echoes[0], 1, (_, chain) => chains.push(chain));
  echoes.collectNearby(echoes.echoes[0], 2, (_, chain) => chains.push(chain));
  echoes.collectNearby(echoes.echoes[1], 8, (_, chain) => chains.push(chain));
  assert.equal(echoes.getStatus(10).remaining, 6);
  echoes.collectNearby(echoes.echoes[2], 17, (_, chain) => chains.push(chain));
  assert.deepEqual(chains, [1, 2, 1]);
  assert.equal(echoes.getStatus(26).chain, 0);
  assert.equal(echoes.getCollectedTotal(), 3);
});

test('progress persists independent best score, fastest time and full collection', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const store = new ProgressStore(storage);
  const result = { levelId: 'level-1', score: 1700, time: 55, echoCount: 3, totalEchoes: 3 };
  assert.equal(store.record(result).isNewBest, true);
  assert.equal(store.record({ ...result, score: 1500, time: 30, echoCount: 1 }).isNewBest, false);
  assert.deepEqual(new ProgressStore(storage).get('level-1'), { score: 1700, time: 30, allEchoes: true, stars: 2 });
  assert.equal(store.get('level-2'), null);
  assert.ok(data.has(PROGRESS_KEY));
});

test('blocked, malformed and invalid saved data never prevent progress', () => {
  const blocked = new ProgressStore({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  blocked.record({ levelId: 'level-2', score: 1200, time: 40, echoCount: 0, totalEchoes: 3 });
  assert.equal(blocked.get('level-2').score, 1200);
  for (const raw of ['{bad', 'null', '{"level-1":{"score":-1,"time":1}}']) {
    assert.equal(new ProgressStore({ getItem: () => raw }).get('level-1'), null);
  }
  assert.equal(blocked.record({ levelId: 'level-1', score: NaN, time: 1 }), null);
});

test('camera keeps the full map inside the viewport and follows within bounds', () => {
  const maze = new Maze(LEVELS['level-3']);
  for (const aspect of [390 / 334, 980 / 550, 300 / 440]) {
    const overview = getCamera(maze, { x: 63, y: 63 }, aspect, false);
    assert.ok(overview.width >= maze.width && overview.height >= maze.height - .001);
    const follow = getCamera(maze, { x: maze.width, y: maze.height }, aspect, true);
    assert.ok(Math.abs(follow.x + follow.width - maze.width) < .001);
    assert.ok(Math.abs(follow.y + follow.height - maze.height) < .001);
  }
});

test('player gently aligns with a corridor without entering walls', () => {
  const maze = new Maze(LEVELS['level-1']);
  const player = new Player({ x: 63, y: 69 }, 42);
  for (let frame = 0; frame < 40; frame++) player.update(1 / 60, { x: 1, y: 0 }, maze);
  assert.equal(player.y, 63);
  for (let frame = 0; frame < 100; frame++) player.update(1 / 60, { x: 0, y: -1 }, maze);
  assert.equal(maze.isBlocked(player.x, player.y, player.radius), false);
});

// Browser primitives are stubbed only at the boundary; runs use real collision,
// pickups, visibility, timers, scoring, and scene state.
const windowEvents = new Map();
const documentEvents = new Map();
globalThis.window = { matchMedia: () => ({ matches: false }), devicePixelRatio: 1, addEventListener: (type, fn) => windowEvents.set(type, fn), removeEventListener: (type) => windowEvents.delete(type) };
globalThis.document = { hidden: false, querySelectorAll: () => [], addEventListener: (type, fn) => documentEvents.set(type, fn), removeEventListener: (type) => documentEvents.delete(type) };
globalThis.ResizeObserver = class { observe() {} };
const frames = new Map();
let frameId = 0;
globalThis.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
function createGame(options = {}) {
  let result;
  const game = new Game({ canvas: { getContext: () => ({}) }, viewport: { style: { setProperty() {} }, getBoundingClientRect: () => ({ width: 900, height: 600 }) }, hud: { setLevel() {}, reset() {}, update() {}, showToast() {} }, onClear: (value) => { result = value; } });
  Object.assign(game, options);
  game.render = () => {};
  game.input = { setEnabled() {}, getMovementVector: () => ({ x: 0, y: 0 }) };
  return { game, result: () => result };
}

test('pause cancels animation work, resume schedules once, restart resets state', () => {
  frames.clear();
  const { game } = createGame();
  game.start(); game.update(2); game.vision.collect(ASSET_REGISTRY.chocolate);
  game.setPaused(true);
  game.loop(performance.now() + 30000);
  assert.equal(game.elapsed, 2); assert.equal(game.vision.boostRemaining, 8); assert.equal(frames.size, 0);
  game.setPaused(false); game.setPaused(false);
  assert.equal(frames.size, 1);
  game.restart(); assert.equal(game.elapsed, 0); assert.equal(game.vision.boostRemaining, 0); assert.equal(frames.size, 1);
  game.stop(); assert.equal(frames.size, 0);
});

test('focus loss clears held keys, pauses, and preserves browser shortcuts', () => {
  let pauses = 0;
  const input = new InputController({ onBlur: () => pauses++ });
  input.setEnabled(true);
  const key = { code: 'ArrowRight', preventDefault() {}, target: null };
  input.handleKeyDown(key); assert.equal(input.getMovementVector().x, 1);
  windowEvents.get('blur')(); assert.equal(input.getMovementVector().x, 0); assert.equal(pauses, 1);
  input.handleKeyDown({ ...key, ctrlKey: true }); assert.equal(input.getMovementVector().x, 0);
  input.setEnabled(false);
  let prevented = false;
  input.handleKeyUp({ ...key, preventDefault() { prevented = true; } }); assert.equal(prevented, false);
  input.dispose(); assert.equal(windowEvents.size, 0);
});

test('hazard gameplay preserves pulse light, freezes on pause, and resets on restart', () => {
  const { game } = createGame(); game.start('level-3');
  const trap = game.hazards.traps[0];
  Object.assign(game.player, { x: trap.x, y: trap.y, direction: { x: 1, y: 0 } });
  game.hazards.time = 4;
  game.update(.01);
  assert.equal(game.vision.obscuredRemaining, 3);
  assert.equal(game.hazards.hits, 1);
  assert.equal(game.useScan(), true);
  assert.ok(trap.disabled > 0);
  assert.equal(game.scan.remaining, 2);
  const ahead = game.maze.cellCenter(trap.col + 5, trap.row);
  assert.equal(game.maze.isPointVisible(ahead.x, ahead.y), true);
  const snapshot = JSON.stringify([game.hazards, game.vision, game.scan]);
  game.setPaused(true); game.loop(performance.now() + 20000);
  assert.equal(JSON.stringify([game.hazards, game.vision, game.scan]), snapshot);
  game.restart();
  assert.equal(game.vision.obscuredRemaining, 0); assert.equal(game.vision.protectionRemaining, 0);
  assert.equal(game.hazards.hits, 0); assert.equal(game.hazards.time, 0);
  assert.ok(game.hazards.traps.every((p) => p.disabled === 0));
  game.stop();
});

for (const id of Object.keys(LEVELS)) test(`${id}: walk to every supply and echo, then clear with real collision and scoring`, () => {
  const { game, result } = createGame();
  game.start(id);
  let current = game.maze.level.start;
  const targets = [...game.maze.level.supplies, ...game.maze.level.echoes, ...game.maze.level.beacons, game.maze.level.exit];
  for (const [index, target] of targets.entries()) {
    for (const cell of route(game.maze, current, target, index < targets.length - 1)) {
      const point = game.maze.cellCenter(cell.col, cell.row);
      let steps = 0;
      while (Math.hypot(game.player.x - point.x, game.player.y - point.y) > .001 && game.state === 'playing') {
        assert.ok(steps++ < 100, `stuck at ${cell.col},${cell.row}`);
        const dx = point.x - game.player.x, dy = point.y - game.player.y;
        const distance = Math.hypot(dx, dy);
        game.input.getMovementVector = () => ({ x: dx / distance, y: dy / distance });
        game.update(Math.min(1 / 60, distance / game.player.speed));
        assert.equal(game.maze.isBlocked(game.player.x, game.player.y, game.player.radius), false);
      }
      current = cell;
    }
  }
  const clear = result();
  assert.ok(clear); assert.equal(game.state, 'clear');
  assert.equal(clear.echoCount, clear.totalEchoes);
  assert.equal(clear.chocolateCount + clear.drinkCount, clear.totalSupplies);
  assert.equal(clear.score, 1000 + clear.timeBonus + clear.supplyBonus + clear.echoBonus + clear.beaconBonus);
  assert.equal(clear.beaconCount, game.maze.level.beacons.length);
  assert.equal(clear.stars, 3);
  assert.ok(clear.echoBonus >= 250 + clear.totalEchoes * 120);
  assert.ok(clear.exploration <= 100);
  game.stop();
});

test('expedition layout is repeatable and every pickup is distinct and reachable', () => {
  const config = { width: 23, height: 17, seed: 4127, beaconCount: 1 };
  assert.deepEqual(createExpedition(config), createExpedition(config));
  assert.notDeepEqual(createExpedition(config).map, createExpedition({ ...config, seed: 4128 }).map);
  for (const level of Object.values(LEVELS).filter((level) => level.chapter === 2)) {
    const maze = new Maze(level);
    const points = [level.start, level.exit, ...level.supplies, ...level.echoes, ...level.beacons];
    assert.equal(new Set(points.map(({ col, row }) => `${col},${row}`)).size, points.length);
    for (const point of points) { assert.equal(maze.isWall(point.col, point.row), false); route(maze, level.start, point); }
    const branches = level.map.flatMap((row, y) => row.map((_, x) => ({ col: x, row: y }))).filter(({ col, row }) => !maze.isWall(col, row) && [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy]) => !maze.isWall(col + dx, row + dy)).length >= 3);
    assert.ok(branches.length > 5, 'new maps should offer real route choices');
  }
});

function walkGameTo(game, target) {
  const from = game.maze.pointToCell(game.player.x, game.player.y);
  for (const cell of route(game.maze, from, target)) {
    const point = game.maze.cellCenter(cell.col, cell.row);
    let steps = 0;
    while (Math.hypot(game.player.x - point.x, game.player.y - point.y) > .001) {
      assert.ok(steps++ < 120, `stuck before ${target.col},${target.row}`);
      const dx = point.x - game.player.x, dy = point.y - game.player.y;
      const distance = Math.hypot(dx, dy);
      game.input.getMovementVector = () => ({ x: dx / distance, y: dy / distance });
      game.update(Math.min(1 / 60, distance / game.player.speed));
    }
  }
}

test('game records real visited cells without changing for reveal, pause, camera, or memory toggle', () => {
  const { game } = createGame();
  game.start('level-1');
  assert.equal(game.maze.visited.size, 1);
  const startKey = `${game.maze.level.start.col},${game.maze.level.start.row}`;
  assert.equal(game.maze.visited.has(startKey), true);

  game.input.getMovementVector = () => ({ x: -1, y: 0 });
  game.update(.2);
  assert.equal(game.maze.visited.size, 1, 'a blocked direction does not create a footprint');
  game.useScan();
  game.maze.revealAround(game.maze.level.exit.col * game.maze.tileSize, game.maze.level.exit.row * game.maze.tileSize, 6);
  assert.equal(game.maze.visited.size, 1, 'pulse and reveal do not create footprints');

  walkGameTo(game, { col: 3, row: 1 });
  const visitedAfterWalk = game.maze.visited.size;
  assert.ok(visitedAfterWalk > 1);
  assert.equal(game.maze.visit(3, 1), false, 'revisiting a cell is idempotent');
  game.setExplorationMemory(false);
  game.setExplorationMemory(true);
  game.toggleCamera();
  assert.equal(game.maze.visited.size, visitedAfterWalk);

  const elapsed = game.elapsed;
  game.setPaused(true);
  game.update(2);
  assert.equal(game.elapsed, elapsed, 'paused updates do not create time or footprints');
  game.setPaused(false);
  game.restart();
  assert.equal(game.maze.visited.size, 1, 'restart clears the prior visited set');
  game.stop();
});

test('pulse discovery is committed before an immediate pause', () => {
  const { game } = createGame();
  game.start('level-2');
  const drink = game.supplies.supplies[1];
  Object.assign(game.player, game.maze.cellCenter(11, 13), { direction: { x: 0, y: -1 } });
  game.update(0);
  assert.equal(drink.discovered, false);
  assert.equal(game.useScan(), true);
  assert.equal(drink.discovered, true);
  game.setPaused(true);
  game.update(10);
  assert.equal(drink.discovered, true);
  game.stop();
});

test('authored tutorial routes create useful choices and a readable vision step', () => {
  const first = LEVELS['level-1'];
  const maze = new Maze(first);
  assert.equal(first.hazards.traps.length + first.hazards.monsters.length, 0);
  const branchCells = first.map.flatMap((row, rowIndex) => row.map((_, col) => ({ col, row: rowIndex })))
    .filter((point) => !maze.isWall(point.col, point.row))
    .filter((point) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !maze.isWall(point.col + dx, point.row + dy)).length >= 3);
  assert.ok(branchCells.length >= 2, 'the first route should include a real choice');

  const chocolate = maze.cellCenter(first.supplies[0].col, first.supplies[0].row);
  maze.updateVisibility(chocolate.x, chocolate.y, 3);
  const normalVisibleWalkable = [...maze.visible].filter((key) => {
    const [col, row] = key.split(',').map(Number);
    return !maze.isWall(col, row);
  }).length;
  maze.updateVisibility(chocolate.x, chocolate.y, 6);
  const expandedVisibleWalkable = [...maze.visible].filter((key) => {
    const [col, row] = key.split(',').map(Number);
    return !maze.isWall(col, row);
  }).length;
  assert.ok(expandedVisibleWalkable > normalVisibleWalkable, 'chocolate should reveal useful walkable information');
  assert.equal(first.supplies.filter(({ type }) => type === 'chocolate').length, 1);
  assert.equal(first.echoes.length, 3);
});

test('level 2 authored chocolate-to-drink route leaves timing margin', () => {
  const { game } = createGame();
  game.start('level-2');
  walkGameTo(game, game.maze.level.supplies[0]);
  assert.ok(game.vision.boostRemaining > 7.5, 'chocolate should start the eight-second boost');
  const afterChocolate = game.elapsed;
  walkGameTo(game, game.maze.level.supplies[1]);
  assert.ok(game.elapsed - afterChocolate < 6, 'the demonstrated supply route should leave at least two seconds of margin');
  assert.ok(game.vision.boostRemaining > 8, 'drink should extend the active expanded view');
  game.stop();
});

test('level 1 authored echo segment keeps the eight-second chain window with margin', () => {
  const { game } = createGame();
  game.start('level-1');
  walkGameTo(game, game.maze.level.echoes[0]);
  const collectedAt = game.elapsed;
  walkGameTo(game, game.maze.level.echoes[1]);
  assert.equal(game.echoes.getStatus(game.elapsed).chain, 2);
  assert.ok(game.elapsed - collectedAt < 6, 'the teaching segment should leave about two seconds of input margin');
  game.stop();
});

test('level 3 offers a shorter risky branch and a longer hazard-free branch', () => {
  const level = LEVELS['level-3'];
  const maze = new Maze(level);
  const hazardCells = new Set(level.hazards.traps.map(({ col, row }) => `${col},${row}`));
  for (const monster of level.hazards.monsters) for (const point of monster.path) hazardCells.add(`${point.col},${point.row}`);
  const pathLength = (from, to, blocked = new Set()) => {
    const q = [{ ...from, distance: 0 }];
    const seen = new Set([`${from.col},${from.row}`]);
    for (const current of q) {
      if (current.col === to.col && current.row === to.row) return current.distance;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = { col: current.col + dx, row: current.row + dy };
        const key = `${next.col},${next.row}`;
        if (maze.isWall(next.col, next.row) || blocked.has(key) || seen.has(key)) continue;
        seen.add(key); q.push({ ...next, distance: current.distance + 1 });
      }
    }
    return Infinity;
  };
  const short = level.routePlan.shortRisk;
  const safe = level.routePlan.longSafe;
  const shortLength = pathLength(short[0], short.at(-1));
  const safeLength = pathLength(safe[0], safe.at(-1), hazardCells);
  assert.ok(shortLength < safeLength, 'the risk route should be shorter');
  assert.ok(Number.isFinite(safeLength), 'the safe route should avoid the full patrol and trap cells');
  assert.ok(short.slice(1).some((point) => hazardCells.has(`${point.col},${point.row}`)), 'the short route should expose a meaningful danger choice');
  assert.equal(level.supplies.length, 3);
  assert.equal(level.echoes.length, 4);
});

test('pulse lights only the firing direction for exactly two seconds, with existing charges', () => {
  const maze = new Maze(LEVELS['level-4']);
  const player = { ...maze.cellCenter(11, 9), direction: { x: 1, y: 0 } };
  const scan = new ScanSystem();
  assert.equal(scan.activate(maze, player), true);
  assert.equal(scan.remaining, 2);
  assert.equal(scan.containsPoint(player.x + 6 * maze.tileSize, player.y), true);
  assert.equal(scan.containsPoint(player.x - 6 * maze.tileSize, player.y), false);
  assert.equal(scan.containsPoint(player.x, player.y + 6 * maze.tileSize), false);
  assert.equal(scan.containsPoint(player.x + 8 * maze.tileSize, player.y), false);
  assert.equal(scan.charges, 1);
  assert.equal(scan.activate(maze, player), false);
  scan.update(1.5); assert.equal(scan.containsPoint(player.x + 6 * maze.tileSize, player.y), true);
  scan.update(.5); assert.equal(scan.remaining, 0); assert.equal(scan.cone, null);
  assert.equal(scan.containsPoint(player.x + 6 * maze.tileSize, player.y), false);
  scan.update(.3); assert.equal(scan.activate(maze, player), true);
  scan.update(1.2); assert.equal(scan.activate(maze, player), false);
  scan.recharge(); scan.recharge(); scan.recharge(); assert.equal(scan.charges, 2);
});

test('pulse respects cardinal and diagonal facing and snapshots its origin', () => {
  const maze = new Maze(LEVELS['level-6']);
  for (const [x, y] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
    const scan = new ScanSystem();
    const player = { x: 500, y: 500, direction: { x, y } };
    scan.activate(maze, player);
    const scale = maze.tileSize * 5 / Math.hypot(x, y);
    assert.equal(scan.containsPoint(500 + x * scale, 500 + y * scale), true);
    assert.equal(scan.containsPoint(500 - x * scale, 500 - y * scale), false);
    player.x += 100; player.direction.x = -x; player.direction.y = -y;
    assert.equal(scan.cone.x, 500);
    assert.equal(scan.containsPoint(500 + x * scale, 500 + y * scale), true);
  }
});

test('pulse reveals forward objects beyond normal vision and expires while standing still', () => {
  const { game } = createGame(); game.start();
  Object.assign(game.player, game.maze.cellCenter(9, 7), { direction: { x: 1, y: 0 } });
  game.update(0);
  const ahead = game.maze.cellCenter(15, 7);
  const behind = game.maze.cellCenter(3, 7);
  assert.equal(game.maze.isPointVisible(ahead.x, ahead.y), false);
  game.useScan();
  assert.equal(game.maze.isPointVisible(ahead.x, ahead.y), true);
  assert.equal(game.maze.isPointVisible(behind.x, behind.y), false);
  game.update(1.5); assert.equal(game.maze.isPointVisible(ahead.x, ahead.y), true);
  game.update(.5); assert.equal(game.maze.isPointVisible(ahead.x, ahead.y), false);
  assert.equal(game.maze.isCellExplored(15, 7), true);
  assert.equal(game.maze.pulseVisible.size, 0);
  game.stop();
});

test('locked exit requires every beacon; activation occurs once and recharges scan', () => {
  const { game, result } = createGame();
  game.start('level-6');
  Object.assign(game.player, game.maze.cellCenter(game.maze.level.exit.col, game.maze.level.exit.row));
  game.update(.01); assert.equal(game.state, 'playing'); assert.equal(result(), undefined);
  game.clear(); assert.equal(result(), undefined);
  for (const [index, beacon] of game.beacons.beacons.entries()) {
    game.scan.charges = 0;
    Object.assign(game.player, { x: beacon.x, y: beacon.y }); game.update(.01);
    assert.equal(game.beacons.collected, index + 1); assert.equal(game.scan.charges, 1);
    game.update(.01); assert.equal(game.scan.charges, 1);
    assert.equal(game.maze.exitUnlocked, index === 2);
  }
  Object.assign(game.player, game.maze.cellCenter(game.maze.level.exit.col, game.maze.level.exit.row));
  game.update(.01);
  assert.equal(game.state, 'clear'); assert.equal(result().beaconBonus, 450);
  game.stop();
});

test('paused pulses cannot spend charges or lose lighting time; restart restores everything', () => {
  const { game } = createGame(); game.start('level-4');
  assert.equal(game.useScan(), true);
  game.setPaused(true); assert.equal(game.useScan(), false);
  game.loop(performance.now() + 10000);
  assert.equal(game.scan.remaining, 2); assert.equal(game.scan.charges, 1);
  game.restart(); assert.equal(game.scan.charges, 2); assert.equal(game.scan.used, 0); assert.equal(game.beacons.collected, 0); assert.equal(game.maze.exitUnlocked, false);
  game.stop(); assert.equal(game.useScan(), false);
});

test('collected echoes recharge the pulse only once', () => {
  const { game } = createGame(); game.start(); game.scan.charges = 0;
  Object.assign(game.player, game.echoes.echoes[0]); game.update(.01);
  assert.equal(game.scan.charges, 1);
  game.update(.01); assert.equal(game.scan.charges, 1);
  game.stop();
});

test('old progress migrates without losing scores and stars never decrease', () => {
  let saved = JSON.stringify({ 'level-1': { score: 2300, time: 40, allEchoes: true } });
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const store = new ProgressStore(storage);
  assert.equal(store.get('level-1').stars, 2);
  assert.equal(store.record({ levelId: 'level-1', score: 1600, time: 60, stars: 3, totalEchoes: 3, echoCount: 3 }).starsImproved, true);
  assert.equal(store.record({ levelId: 'level-1', score: 1700, time: 50, stars: 1, totalEchoes: 3, echoCount: 0 }).starsImproved, false);
  const loaded = new ProgressStore(storage).get('level-1');
  assert.equal(loaded.stars, 3); assert.equal(loaded.score, 2300); assert.equal(loaded.time, 40);
  assert.equal(new ProgressStore(storage).get('level-6'), null);
});

test('revised tutorial records stay separate while historical completion remains visible', () => {
  let saved = JSON.stringify({
    'level-1': { score: 2300, time: 40, allEchoes: true },
    'level-4': { score: 1800, time: 50, stars: 2 }
  });
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const store = new ProgressStore(storage);
  assert.equal(store.getCurrent('level-1'), null);
  assert.equal(store.getCurrent('level-4').score, 1800);
  assert.equal(store.get('level-1').stars, 2);
  const first = store.record({ levelId: 'level-1', rulesVersion: 2, score: 1600, time: 60, stars: 1, echoCount: 0, totalEchoes: 3 });
  assert.equal(first.isFirstCompletion, true);
  assert.equal(store.getCurrent('level-1').score, 1600);
  assert.equal(store.get('level-1').score, 2300);
  const beforeMigration = saved;
  const migratedAgain = new ProgressStore(storage);
  assert.deepEqual(migratedAgain.getCurrent('level-1'), store.getCurrent('level-1'));
  assert.equal(JSON.parse(beforeMigration)['level-1'].versions['1'].score, 2300);
  assert.deepEqual(Object.keys(JSON.parse(saved)['level-1'].versions).sort(), ['1', '2']);
});

test('partial exit enters one frozen confirmation and can be re-armed after leaving', () => {
  let prompt;
  const { game } = createGame({ onExitPrompt: (details) => { prompt = details; } });
  game.start('level-1');
  Object.assign(game.player, game.maze.cellCenter(game.maze.level.exit.col, game.maze.level.exit.row));
  game.update(.1);
  assert.equal(game.state, 'confirming');
  assert.deepEqual(prompt, { missingEchoes: 3, missingSupplies: 1, levelId: 'level-1' });
  const frozen = JSON.stringify([game.elapsed, game.vision, game.scan, game.hazards]);
  game.update(10);
  assert.equal(JSON.stringify([game.elapsed, game.vision, game.scan, game.hazards]), frozen);
  game.resolveConfirmation(false);
  assert.equal(game.state, 'playing');
  game.update(.1);
  assert.equal(game.state, 'playing');
  Object.assign(game.player, game.maze.cellCenter(game.maze.level.start.col, game.maze.level.start.row));
  game.update(.1);
  Object.assign(game.player, game.maze.cellCenter(game.maze.level.exit.col, game.maze.level.exit.row));
  game.update(.1);
  assert.equal(game.state, 'confirming');
  game.stop();
});

test('Q pulse shortcut ignores key repeat, modified shortcuts and paused input', () => {
  let scans = 0;
  const input = new InputController({ onScan: () => scans++ });
  const event = { code: 'KeyQ', preventDefault() {} };
  input.handleKeyDown(event); assert.equal(scans, 0);
  input.setEnabled(true); input.handleKeyDown(event); assert.equal(scans, 1);
  input.handleKeyDown({ ...event, repeat: true }); input.handleKeyDown({ ...event, ctrlKey: true });
  assert.equal(scans, 1); input.dispose();
});

function assertInCamera(camera, point, maze) {
  if (point.x < 0 || point.y < 0 || point.x > maze.width || point.y > maze.height) return;
  const epsilon = .00001;
  assert.ok(point.x >= camera.x - epsilon && point.x <= camera.x + camera.width + epsilon, `horizontal crop at ${point.x},${point.y}`);
  assert.ok(point.y >= camera.y - epsilon && point.y <= camera.y + camera.height + epsilon, `vertical crop at ${point.x},${point.y}`);
}
function assertLightInCamera(camera, maze, player, visionRadius, cone) {
  for (let step = 0; step < 72; step++) {
    const angle = step / 72 * Math.PI * 2;
    assertInCamera(camera, { x: player.x + Math.cos(angle) * visionRadius * 1.3 * maze.tileSize, y: player.y + Math.sin(angle) * visionRadius * 1.3 * maze.tileSize }, maze);
  }
  if (cone) for (let distance = 0; distance <= cone.radius; distance += cone.radius / 7) {
    for (let step = 0; step <= 40; step++) {
      const angle = cone.angle - cone.halfAngle + 2 * cone.halfAngle * step / 40;
      assertInCamera(camera, { x: cone.x + Math.cos(angle) * distance, y: cone.y + Math.sin(angle) * distance }, maze);
    }
  }
}

test('follow camera fits normal and boosted light plus every pulse direction on portrait and landscape screens', () => {
  for (const id of ['level-1', 'level-6']) {
    const maze = new Maze(LEVELS[id]);
    for (const aspect of [.55, 390 / 254, 980 / 300, 4]) {
      for (const cell of [{col:1,row:1}, {col:Math.floor(maze.level.width / 2),row:Math.floor(maze.level.height / 2)}, {col:maze.level.width - 2,row:maze.level.height - 2}]) {
        for (const visionRadius of [3, 4.5, 6]) for (let direction = 0; direction < 8; direction++) {
          const angle = direction * Math.PI / 4;
          const player = { ...maze.cellCenter(cell.col, cell.row), direction: { x:Math.cos(angle), y:Math.sin(angle) } };
          const previous = getCamera(maze, player, aspect, true);
          const scan = new ScanSystem(); scan.activate(maze, player);
          const camera = getCamera(maze, player, aspect, true, { visionRadius, pulse:scan.cone, previous, dt:0 });
          assertLightInCamera(camera, maze, player, visionRadius, scan.cone);
          assert.ok(Math.abs(camera.width / camera.height - aspect) < .00001);
        }
      }
    }
  }
});

test('follow camera keeps an anchored pulse visible while Jelly moves and the viewport resizes', () => {
  const maze = new Maze(LEVELS['level-6']);
  const player = { ...maze.cellCenter(15, 11), direction: { x:0,y:-1 } };
  const scan = new ScanSystem(); scan.activate(maze, player);
  let previous = getCamera(maze, player, .6, true, { pulse:scan.cone });
  for (const aspect of [.6, 3.5, 1.5]) {
    player.y += maze.tileSize;
    const camera = getCamera(maze, player, aspect, true, { pulse:scan.cone, previous, dt:1/60 });
    assertLightInCamera(camera, maze, player, 3, scan.cone);
    previous = camera;
  }
});

test('camera zooms out immediately, returns gradually, and leaves full-map mode unchanged', () => {
  const maze = new Maze(LEVELS['level-6']);
  const player = { ...maze.cellCenter(15, 11), direction:{x:0,y:1} };
  const aspect = 3;
  const normal = getCamera(maze, player, aspect, true);
  const boosted = getCamera(maze, player, aspect, true, { visionRadius:6, previous:normal, dt:0 });
  assert.ok(boosted.width > normal.width);
  assertLightInCamera(boosted, maze, player, 6);
  const returning = getCamera(maze, player, aspect, true, { previous:boosted, dt:1/60 });
  assert.ok(returning.width < boosted.width && returning.width > normal.width);
  const settled = getCamera(maze, player, aspect, true, { previous:returning, dt:5 });
  assert.ok(Math.abs(settled.width - normal.width) < .001);
  const scan = new ScanSystem(); scan.activate(maze, player);
  assert.deepEqual(getCamera(maze, player, aspect, false, { visionRadius:6,pulse:scan.cone,previous:boosted }), getCamera(maze, player, aspect, false));
});
