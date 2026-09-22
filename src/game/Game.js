import { LEVELS } from './levelConfig.js';
import { EchoSystem } from './EchoSystem.js';
import { Maze } from './Maze.js';
import { Player } from './Player.js';
import { SupplySystem } from './SupplySystem.js';
import { VisionSystem } from './VisionSystem.js';
import { getCamera } from './Camera.js';
import { ScanSystem } from './ScanSystem.js';
import { BeaconSystem } from './BeaconSystem.js';
import { HazardSystem } from './HazardSystem.js';
import { LandmarkSystem } from './LandmarkSystem.js';

export class Game {
  constructor({ canvas, viewport, hud, onClear, onPickup, onEcho, onMove, onPause, onExitPrompt }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewport = viewport;
    this.hud = hud;
    this.onClear = onClear;
    this.onPickup = onPickup;
    this.onEcho = onEcho;
    this.onMove = onMove;
    this.onPause = onPause;
    this.onExitPrompt = onExitPrompt;
    this.follow = window.matchMedia('(max-width: 640px)').matches;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.input = null;
    this.levelId = 'level-1';
    this.state = 'idle';
    this.showExplorationMemory = true;
    this.silentPaused = false;
    this.elapsed = 0;
    this.echoScore = 0;
    this.echoPulse = null;
    this.lastFrame = 0;
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      if (this.state === 'paused') this.render(this.elapsed);
    });
    this.resizeObserver.observe(viewport);
    this.boundLoop = (time) => this.loop(time);
  }

  setInput(input) { this.input = input; }

  start(levelId = 'level-1') {
    cancelAnimationFrame(this.frameId);
    this.levelId = LEVELS[levelId] ? levelId : 'level-1';
    const level = LEVELS[this.levelId];
    this.maze = new Maze(level);
    this.player = new Player(this.maze.cellCenter(level.start.col, level.start.row), this.maze.tileSize);
    this.supplies = new SupplySystem(level, this.maze);
    this.echoes = new EchoSystem(level, this.maze);
    this.vision = new VisionSystem();
    this.scan = new ScanSystem();
    this.camera = null;
    this.cameraTime = 0;
    this.beacons = new BeaconSystem(level, this.maze);
    this.hazards = new HazardSystem(level, this.maze);
    this.landmarks = new LandmarkSystem(level, this.maze);
    this.exitHintShown = false;
    this.exitPromptArmed = true;
    this.confirmation = null;
    this.elapsed = 0;
    this.echoScore = 0;
    this.echoPulse = null;
    this.showExplorationMemory = true;
    this.silentPaused = false;
    this.state = 'playing';
    this.onPause?.(false);
    this.lastFrame = performance.now();
    this.viewport.style.setProperty('--map-ratio', `${this.maze.width / this.maze.height}`);
    this.resize();
    this.hud.setLevel(level);
    this.hud.reset();
    this.input?.setEnabled(true);
    this.maze.updateVisibility(this.player.x, this.player.y, this.vision.currentRadius);
    this.landmarks.updateDiscovery();
    this.supplies.updateDiscovery();
    this.maze.visitPoint(this.player.x, this.player.y);
    this.updateHUD();
    this.render(0);
    cancelAnimationFrame(this.frameId);
    this.frameId = requestAnimationFrame(this.boundLoop);
  }

  restart() { this.start(this.levelId); }

  stop() {
    this.state = 'idle';
    this.confirmation = null;
    this.silentPaused = false;
    this.input?.setEnabled(false);
    cancelAnimationFrame(this.frameId);
    this.onPause?.(false);
  }

  setPaused(paused, { showDialog = true } = {}) {
    if (!['playing', 'paused'].includes(this.state) || (this.state === 'paused') === paused) return;
    this.state = paused ? 'paused' : 'playing';
    this.silentPaused = paused && !showDialog;
    this.input?.setEnabled(!paused);
    cancelAnimationFrame(this.frameId);
    this.onPause?.(paused, { showDialog });
    if (!paused) {
      this.lastFrame = performance.now();
      this.frameId = requestAnimationFrame(this.boundLoop);
    }
  }

  togglePause() {
    if (this.silentPaused) return false;
    this.setPaused(this.state === 'playing');
    return true;
  }

  setExplorationInfoOpen(open) {
    if (open) {
      if (this.state !== 'playing') return false;
      this.setPaused(true, { showDialog: false });
      return true;
    }
    if (this.state === 'paused' && this.silentPaused) {
      this.setPaused(false, { showDialog: false });
      return true;
    }
    return false;
  }

  setExplorationMemory(enabled) {
    this.showExplorationMemory = Boolean(enabled);
    this.render(this.elapsed);
    return this.showExplorationMemory;
  }

  beginConfirmation(kind) {
    if (!['playing', 'paused'].includes(this.state) || this.confirmation) return null;
    const fromState = this.state;
    this.confirmation = { kind, fromState, silentPaused: this.silentPaused };
    this.state = 'confirming';
    this.silentPaused = false;
    this.input?.setEnabled(false);
    cancelAnimationFrame(this.frameId);
    return { ...this.confirmation };
  }

  resolveConfirmation(accepted) {
    if (this.state !== 'confirming' || !this.confirmation) return null;
    const context = this.confirmation;
    this.confirmation = null;
    if (!accepted) {
      this.state = context.fromState;
      this.silentPaused = context.silentPaused;
      this.input?.setEnabled(context.fromState === 'playing');
      if (context.fromState === 'playing') {
        this.lastFrame = performance.now();
        this.frameId = requestAnimationFrame(this.boundLoop);
      }
    } else {
      // The caller immediately chooses the follow-up action (clear, restart,
      // or leave), so there is intentionally no second animation loop here.
      this.state = 'playing';
      this.silentPaused = false;
      this.input?.setEnabled(true);
    }
    return context;
  }

  useScan() {
    if (this.state !== 'playing') return false;
    const activated = this.scan.activate(this.maze, this.player);
    if (activated) {
      this.maze.updatePulseVisibility(this.scan);
      this.landmarks.updateDiscovery();
      this.supplies.updateDiscovery();
      const affected = this.hazards.applyPulse(this.scan);
      this.hud.showToast(affected ? `前方脈衝 · 照亮 2 秒 · 壓制 ${affected} 處危險` : '前方脈衝 · 照亮 2 秒', { priority: 1 });
      this.onEcho?.(1);
    } else if (!this.scan.charges) this.hud.showToast('脈衝已用完 · 找到微光或信標可補充');
    this.updateHUD();
    if (activated) this.render(this.elapsed);
    return activated;
  }

  resize() {
    const rect = this.viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
  }

  toggleCamera() {
    this.follow = !this.follow;
    this.camera = null;
    this.render(this.elapsed);
    return this.follow;
  }

  loop(time) {
    if (this.state !== 'playing') return;
    const dt = Math.min(0.05, Math.max(0, (time - this.lastFrame) / 1000));
    this.lastFrame = time;
    if (this.state === 'playing') this.update(dt);
    this.render(this.elapsed);
    if (this.state === 'playing') this.frameId = requestAnimationFrame(this.boundLoop);
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.elapsed += dt;
    const movement = this.input?.getMovementVector() || { x: 0, y: 0 };
    const oldX = this.player.x;
    const oldY = this.player.y;
    this.player.update(dt, movement, this.maze);
    if (this.player.x !== oldX || this.player.y !== oldY) this.onMove?.();
    this.vision.update(dt);
    this.scan.update(dt);
    this.hazards.update(dt, this.player, this.vision, (name) => this.hud.showToast(`${name} · 視野縮小 3 秒，Q 可照亮前方`));
    this.maze.updateVisibility(this.player.x, this.player.y, this.vision.currentRadius);
    this.maze.updatePulseVisibility(this.scan);
    this.landmarks.updateDiscovery();
    this.supplies.updateDiscovery();
    this.maze.visitPoint(this.player.x, this.player.y);
    this.echoPulse = this.echoPulse
      ? (this.echoPulse.life > dt ? { ...this.echoPulse, life: this.echoPulse.life - dt } : null)
      : null;

    const supplyMessages = [];
    this.supplies.collectNearby(this.player, (product) => {
      const effect = this.vision.collect(product);
      const radius = Number.isInteger(effect.radius) ? effect.radius : effect.radius.toFixed(1);
      const duration = Math.round(effect.duration);
      const message = effect.type === 'extended'
        ? `擴大視野延長 ＋${effect.added} 秒`
        : `視野擴至 ${radius} 格 · ${duration} 秒`;
      supplyMessages.push(effect.wasObscured ? `墨霧已清除 · ${message}` : message);
      this.onPickup?.(product.id.split('-')[0]);
    });
    if (supplyMessages.length) this.hud.showToast(supplyMessages.join('；'), { priority: 3, duration: 2400 });
    this.echoes.collectNearby(this.player, this.elapsed, (echo, chain) => {
      const points = 80 + chain * 40;
      this.echoScore += points;
      this.scan.recharge();
      this.maze.revealAround(echo.x, echo.y, 2.7);
      this.echoPulse = { x: echo.x, y: echo.y, life: 0.75, maxLife: 0.75 };
      this.hud.showToast(`微光連鎖 ×${chain} · +${points}`);
      this.onEcho?.(chain);
    });
    this.beacons.collectNearby(this.player, (beacon, complete) => {
      this.scan.recharge();
      this.echoPulse = { x: beacon.x, y: beacon.y, life: .75, maxLife: .75 };
      this.hud.showToast(complete ? '所有信標已點亮 · 出口開啟！' : `信標已點亮 · ${this.beacons.collected} / ${this.beacons.beacons.length}`);
      this.onEcho?.(3);
    });

    this.updateHUD();
    if (this.isAtExit()) {
      if (!this.beacons.isComplete()) {
        if (!this.exitHintShown) { this.hud.showToast('出口尚未開啟 · 先點亮所有信標', { priority: 1 }); this.exitHintShown = true; }
      } else if (this.isCollectionComplete()) {
        this.clear();
      } else if (this.exitPromptArmed) {
        this.exitPromptArmed = false;
        // Headless integrations may not provide a dialog renderer. The browser
        // runtime always does, while the fallback keeps the core simulation
        // usable for non-UI callers.
        if (this.onExitPrompt) {
          if (this.beginConfirmation('exit')) this.onExitPrompt(this.getExitDetails());
        } else {
          this.clear();
        }
      }
    } else {
      this.exitHintShown = false;
      this.exitPromptArmed = true;
    }
  }

  updateHUD() {
    this.hud.update({
      time: this.elapsed,
      vision: this.vision,
      supplies: this.supplies.getCollectedTotal(),
      total: this.supplies.getTotal(),
      echoes: this.echoes.getStatus(this.elapsed),
      exploration: this.maze.getExplorationRate(),
      scan: this.scan,
      beacons: { collected: this.beacons.collected, total: this.beacons.beacons.length },
      hazards: this.hazards
    });
  }

  isAtExit() {
    const exit = this.maze.cellCenter(this.maze.level.exit.col, this.maze.level.exit.row);
    return Math.hypot(this.player.x - exit.x, this.player.y - exit.y) < this.maze.tileSize * 0.34;
  }

  isCollectionComplete() {
    return this.supplies.getCollectedTotal() === this.supplies.getTotal()
      && this.echoes.getCollectedTotal() === this.echoes.getTotal();
  }

  getExitDetails() {
    const missingEchoes = this.echoes.getTotal() - this.echoes.getCollectedTotal();
    const missingSupplies = this.supplies.getTotal() - this.supplies.getCollectedTotal();
    return { missingEchoes, missingSupplies, levelId: this.levelId };
  }

  clear() {
    if (this.state !== 'playing' || !this.beacons.isComplete()) return;
    this.state = 'clear';
    this.input?.setEnabled(false);
    cancelAnimationFrame(this.frameId);
    const level = LEVELS[this.levelId];
    const timeBonus = Math.max(0, Math.round((Math.max(0, level.timeBudget - this.elapsed) / level.timeBudget) * 420));
    const supplyBonus = this.supplies.getCollectedTotal() * 100;
    const allEchoesCollected = this.echoes.getCollectedTotal() === this.echoes.getTotal() && this.echoes.getTotal() > 0;
    const echoCompletionBonus = allEchoesCollected ? 250 : 0;
    const echoBonus = this.echoScore + echoCompletionBonus;
    const beaconBonus = this.beacons.collected * 150;
    const allSupplies = this.supplies.getCollectedTotal() === this.supplies.getTotal();
    this.onClear?.({
      levelId: this.levelId,
      rulesVersion: level.rulesVersion,
      time: this.elapsed,
      exploration: this.maze.getExplorationRate(),
      chocolateCount: this.supplies.collected.chocolate,
      drinkCount: this.supplies.collected.drink,
      totalSupplies: this.supplies.getTotal(),
      echoCount: this.echoes.getCollectedTotal(),
      totalEchoes: this.echoes.getTotal(),
      timeBonus,
      supplyBonus,
      echoBonus,
      beaconBonus,
      beaconCount: this.beacons.collected,
      scansUsed: this.scan.used,
      hazardHits: this.hazards.hits,
      hazardCount: this.hazards.traps.length + this.hazards.monsters.length,
      stars: 1 + Number(allEchoesCollected) + Number(allSupplies),
      score: 1000 + timeBonus + supplyBonus + echoBonus + beaconBonus,
      levelDurationHint: level.durationHint
    });
  }

  render(time) {
    if (!this.maze || !this.player) return;
    if (this.reducedMotion.matches) time = 0;
    const camera = getCamera(this.maze, this.player, this.canvas.width / this.canvas.height, this.follow, {
      visionRadius: Math.max(this.vision.normalRadius, this.vision.currentRadius, this.vision.targetRadius),
      pulse: this.scan.remaining > 0 ? this.scan.cone : null,
      previous: this.camera,
      dt: this.elapsed - this.cameraTime
    });
    this.camera = camera;
    this.cameraTime = this.elapsed;
    const scale = this.canvas.width / camera.width;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#061526';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.scale(scale, scale);
    this.ctx.translate(-camera.x, -camera.y);
    this.maze.draw(this.ctx, time);
    this.landmarks.draw(this.ctx, time, this.maze);
    this.echoes.draw(this.ctx, time, this.maze);
    this.supplies.draw(this.ctx, time, this.maze);
    this.beacons.draw(this.ctx, time);
    this.hazards.draw(this.ctx, time);
    this.player.draw(this.ctx);
    this.hazards.drawProtection(this.ctx, this.player, this.vision);
    if (!this.reducedMotion.matches) this.vision.drawBurst(this.ctx, this.player.x, this.player.y, time);
    this.drawVisionFog();
    this.maze.drawFootprints(this.ctx, this.showExplorationMemory, this.maze.pointToCell(this.player.x, this.player.y));
    this.supplies.drawMemory(this.ctx, this.maze, this.showExplorationMemory);
    this.landmarks.drawMemory(this.ctx, this.maze, this.showExplorationMemory);
    this.scan.draw(this.ctx, this.reducedMotion.matches);
    if (!this.reducedMotion.matches) this.drawEchoPulse();
    this.ctx.restore();
  }

  drawVisionFog() {
    if (!this.maze || !this.player) return;
    const { ctx } = this;
    const radius = this.vision.currentRadius * this.maze.tileSize;
    const pulse = this.reducedMotion.matches ? 0.5 : 0.5 + Math.sin(this.elapsed * 1.4) * 0.5;
    ctx.save();
    // Remove fog inside the pulse cone so revealed objects are actually bright.
    if (this.scan.cone && this.scan.remaining > 0) {
      ctx.beginPath();
      ctx.rect(0, 0, this.maze.width, this.maze.height);
      this.scan.traceCone(ctx);
      ctx.clip('evenodd');
    }
    const gradient = ctx.createRadialGradient(this.player.x, this.player.y, radius * 0.12, this.player.x, this.player.y, radius * 1.3);
    gradient.addColorStop(0, 'rgba(3, 9, 19, 0)');
    gradient.addColorStop(0.48, 'rgba(3, 9, 19, 0.02)');
    gradient.addColorStop(0.72, 'rgba(3, 9, 19, 0.42)');
    gradient.addColorStop(1, 'rgba(3, 9, 19, 0.82)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.maze.width, this.maze.height);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.16 + pulse * 0.06;
    ctx.strokeStyle = '#9cc4ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, radius * 0.98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.1;
    ctx.shadowColor = '#75d2dc';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#75d2dc';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, radius * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEchoPulse() {
    if (!this.echoPulse?.life) return;
    const { ctx } = this;
    const progress = 1 - this.echoPulse.life / this.echoPulse.maxLife;
    const radius = this.maze.tileSize * (0.25 + progress * 2.9);
    ctx.save();
    ctx.globalAlpha = (1 - progress) * 0.6;
    ctx.strokeStyle = '#8fe6d1';
    ctx.shadowColor = '#8fe6d1';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.echoPulse.x, this.echoPulse.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

