import { Game } from './game/Game.js';
import { HUD, formatTime } from './game/HUD.js';
import { InputController } from './game/InputController.js';
import { SoundController } from './game/SoundController.js';
import { ProgressStore } from './game/ProgressStore.js';
import { LEVELS } from './game/levelConfig.js';

const $ = (selector) => document.querySelector(selector);
const screens = { start: $('#start-screen'), game: $('#game-screen'), clear: $('#clear-screen') };
const sound = new SoundController();
const hud = new HUD();
const progress = new ProgressStore();
const pauseDialog = $('#pause-dialog');
const confirmDialog = $('#confirm-dialog');
const explorationInfo = $('#exploration-info');
const memoryToggle = $('#memory-toggle');
let pendingConfirmation = null;
let selectedLevel = 'level-1';
let lastResult = null;

const game = new Game({
  canvas: $('#game-canvas'), viewport: $('#game-viewport'), hud,
  onClear: (result) => { lastResult = result; sound.clear(); showClear(result); },
  onPickup: (kind) => sound.pickup(kind), onEcho: (chain) => sound.echo(chain), onMove: () => sound.move(),
  onExitPrompt: (details) => openConfirmation('exit', details),
  onPause: (paused, options = {}) => {
    const showDialog = options.showDialog !== false;
    if (paused && showDialog && !pauseDialog.open) pauseDialog.showModal();
    if (!paused && pauseDialog.open) pauseDialog.close();
    if (showDialog) $('#pause-button').textContent = paused ? '▶ 繼續' : 'Ⅱ 暫停';
  }
});
const input = new InputController({
  onRestart: () => requestRestart(),
  onScan: () => game.useScan(),
  onEscape: (event) => {
    if (!screens.game.hidden && confirmDialog.open) { event.preventDefault(); cancelConfirmation(); return; }
    if (!screens.game.hidden && explorationInfo.open) { event.preventDefault(); explorationInfo.open = false; return; }
    if (!screens.game.hidden && !pauseDialog.open) { event.preventDefault(); game.togglePause(); }
  },
  onBlur: () => game.setPaused(true)
});
game.setInput(input);

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => { screen.hidden = key !== name; });
  document.body.classList.toggle('game-active', name === 'game');
  $('#app').scrollTo({ left: 0, top: 0, behavior: 'auto' });
  window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  if (name === 'game') $('#game-canvas').focus({ preventScroll: true });
  if (name === 'start') $('#start-button').focus({ preventScroll: true });
  if (name === 'clear') (nextLevelId(lastResult.levelId) ? $('#next-level-button') : $('#retry-button')).focus({ preventScroll: true });
}

function createRouteCards() {
  $('#level-list').replaceChildren(...Object.entries(LEVELS).map(([id, level]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'level-card'; button.dataset.level = id;
    button.innerHTML = '<span class="level-number"></span><span class="level-card-map" aria-hidden="true"></span><span class="level-card-copy"><strong></strong><small></small></span><span class="level-card-arrow" aria-hidden="true">↗</span>';
    button.querySelector('.level-number').textContent = level.number;
    button.querySelector('strong').textContent = level.shortName;
    button.querySelector('small').textContent = level.theme;
    button.style.setProperty('--route-accent', level.accent);
    button.addEventListener('click', () => { selectedLevel = id; updateRoutes(); sound.click(); });
    return button;
  }));
}

function updateRoutes() {
  const chapter = LEVELS[selectedLevel].chapter;
  document.querySelectorAll('[data-chapter]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.chapter) === chapter)));
  document.querySelectorAll('[data-level]').forEach((card) => {
    const id = card.dataset.level;
    card.hidden = LEVELS[id].chapter !== chapter;
    card.classList.toggle('is-selected', id === selectedLevel);
    card.setAttribute('aria-pressed', String(id === selectedLevel));
    const summary = progress.getSummary(id);
    const record = summary.historical;
    card.classList.toggle('is-complete', Boolean(record));
    card.querySelector('.level-card-arrow').textContent = summary.hasCurrent ? '✓' : record ? '◌' : '↗';
    card.querySelector('small').textContent = `${LEVELS[id].theme}${record ? ' · ' + '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars) : ''}${record && summary.routeUpdated ? (summary.hasCurrent ? ' · 新版' : ' · 路線已更新') : ''}`;
  });
  const level = LEVELS[selectedLevel];
  const { theme, description, accent: color } = level;
  $('#route-theme').textContent = `${level.number} / ${theme}`;
  $('#route-description').textContent = description;
  $('#route-meta').textContent = `${level.width} × ${level.height} 格 · ${level.echoes.length} 微光${level.beacons.length ? ' · ' + level.beacons.length + ' 信標' : ' · ' + level.supplies.length + ' 補給'}`;
  $('#route-objective').textContent = level.beacons.length ? `先點亮 ${level.beacons.length} 座信標，再找到出口。` : '找到出口即可通關，收集品自由探索。';
  $('#route-objective').textContent += level.hazards.traps.length ? ` ${level.hazards.traps.length} 處墨霧陷阱 · ${level.hazards.monsters.length} 隻暗影怪。` : ' 本關無陷阱與怪物。';
  const records = Object.keys(LEVELS).map((id) => progress.get(id));
  const completed = records.filter(Boolean).length;
  const stars = records.reduce((sum, record) => sum + (record?.stars || 0), 0);
  $('#journey-progress').textContent = `${completed} / ${records.length} 路線完成 · ${stars} / ${records.length * 3} 星`;
  $('#journey-fill').style.width = `${completed / records.length * 100}%`;
  const recommendation = recommendedRoute();
  const continueButton = $('#continue-journey');
  continueButton.hidden = !recommendation;
  if (recommendation) {
    continueButton.dataset.levelTarget = recommendation;
    continueButton.textContent = `${progress.getCurrent(recommendation) ? '挑戰三星' : '接續旅程'} → ${LEVELS[recommendation].number} ${LEVELS[recommendation].theme}`;
  }
  const summary = progress.getSummary(selectedLevel);
  const best = summary.current;
  if (best) {
    $('#route-best').textContent = `新版最佳 ${best.score.toLocaleString()} 分 · 最快 ${formatTime(best.time)}${best.allEchoes ? ' · 微光全收集' : ''}`;
  } else if (summary.historical && summary.routeUpdated) {
    $('#route-best').textContent = `新版尚未挑戰 · 歷史最高 ${summary.historical.stars} 星（路線已更新）`;
  } else if (summary.historical) {
    $('#route-best').textContent = `最佳 ${summary.historical.score.toLocaleString()} 分 · 最快 ${formatTime(summary.historical.time)}${summary.historical.allEchoes ? ' · 微光全收集' : ''}`;
  } else {
    $('#route-best').textContent = '尚未探索 · 從這裡出發';
  }
  drawRoutePreview($('#route-preview'), level, color, Boolean(progress.getCurrent(selectedLevel)));
}

function drawRoutePreview(preview, level, color, unlocked) {
  const ctx = preview.getContext('2d');
  ctx.clearRect(0, 0, preview.width, preview.height);
  preview.setAttribute('aria-label', unlocked ? '已完成關卡的地圖預覽' : '尚未完成目前規則版本的主題示意圖');
  if (!unlocked) {
    drawThematicPreview(ctx, preview.width, preview.height, level, color);
    return;
  }
  const size = Math.min((preview.width - 16) / level.width, (preview.height - 16) / level.height);
  const ox = (preview.width - level.width * size) / 2;
  const oy = (preview.height - level.height * size) / 2;
  level.map.forEach((row, y) => row.forEach((cell, x) => {
    ctx.fillStyle = cell === '#' ? '#122a43' : color;
    ctx.globalAlpha = cell === '#' ? 1 : 0.48;
    ctx.fillRect(ox + x * size, oy + y * size, Math.max(1, size - 1), Math.max(1, size - 1));
  }));
  ctx.globalAlpha = 1;
  for (const [point, fill] of [[level.start, '#f5f0de'], [level.exit, '#f7c873']]) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(ox + (point.col + .5) * size, oy + (point.row + .5) * size, Math.max(3, size / 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffb38b';
  level.beacons.forEach((beacon) => ctx.fillRect(ox + (beacon.col + .5) * size - 2.5, oy + (beacon.row + .5) * size - 2.5, 5, 5));
}

function drawThematicPreview(ctx, width, height, level, color) {
  ctx.save();
  ctx.fillStyle = '#081a2d';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}38`;
  ctx.globalAlpha = 0.72;
  if (level.number === '01') {
    for (const [x, y] of [[width * .24, height * .34], [width * .56, height * .58], [width * .78, height * .3]]) {
      ctx.beginPath(); ctx.roundRect(x - 22, y - 11, 44, 22, 10); ctx.fill(); ctx.stroke();
      for (let index = 0; index < 3; index += 1) { ctx.beginPath(); ctx.arc(x - 10 + index * 10, y, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (level.number === '02') {
    for (const y of [height * .32, height * .5, height * .68]) {
      ctx.beginPath(); ctx.moveTo(width * .15, y); ctx.bezierCurveTo(width * .34, y - 16, width * .52, y + 16, width * .85, y); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(width * .28, height * .48, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(width * .72, height * .52, 18, 0, Math.PI * 2); ctx.stroke();
  } else {
    for (const [x, scale] of [[width * .3, .8], [width * .5, 1.2], [width * .7, .7]]) {
      ctx.beginPath(); ctx.moveTo(x, height * .68); ctx.lineTo(x + 15 * scale, height * .3); ctx.lineTo(x + 28 * scale, height * .68); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(width * .18, height * .72); ctx.lineTo(width * .82, height * .72); ctx.stroke();
  }
  ctx.restore();
}

function updateCameraButton() {
  $('#camera-toggle').textContent = game.follow ? '切換全圖' : '跟隨視角';
  $('#camera-toggle').setAttribute('aria-pressed', String(game.follow));
}
function resetExplorationInfo() {
  explorationInfo.open = false;
  memoryToggle.checked = true;
  game.setExplorationMemory(true);
}
function startSelectedLevel() {
  sound.unlock();
  resetExplorationInfo();
  showScreen('game');
  game.start(selectedLevel);
  updateCameraButton();
}
function goHome() { explorationInfo.open = false; game.stop(); updateRoutes(); showScreen('start'); }
function nextLevelId(id) { return Object.keys(LEVELS)[Object.keys(LEVELS).indexOf(id) + 1] || null; }
function recommendedRoute() {
  return Object.keys(LEVELS).find((id) => !progress.getCurrent(id)) || Object.keys(LEVELS).find((id) => (progress.getCurrent(id)?.stars || 0) < 3) || null;
}

function showClear(result) {
  const historicalBefore = progress.get(result.levelId);
  const best = progress.record(result);
  const supplyTotal = result.chocolateCount + result.drinkCount;
  $('#clear-subtitle').textContent = `${LEVELS[result.levelId].shortName} · 你在柔光裡找到了出口。`;
  $('#clear-time').textContent = formatTime(result.time);
  $('#clear-explored').textContent = `${result.exploration}%`;
  $('#clear-supply').textContent = `${supplyTotal} / ${result.totalSupplies}`;
  $('#clear-echo').textContent = `${result.echoCount} / ${result.totalEchoes}`;
  $('#clear-score').textContent = result.score.toLocaleString();
  for (const [id, value] of [['time', result.timeBonus], ['supply', result.supplyBonus], ['echo', result.echoBonus], ['beacon', result.beaconBonus]]) $('#clear-' + id + '-bonus').textContent = `+${value}`;
  $('#clear-stars').textContent = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
  $('#clear-stars').setAttribute('aria-label', `本次獲得 ${result.stars} 顆星，最高 3 顆星`);
  const missing = [];
  if (result.echoCount < result.totalEchoes) missing.push(`${result.totalEchoes - result.echoCount} 個微光`);
  if (supplyTotal < result.totalSupplies) missing.push(`${result.totalSupplies - supplyTotal} 份補給`);
  $('#clear-star-hint').textContent = result.stars === 3 ? '三星達成 · 出口、微光、補給全數完成' : `這次還差 ${missing.join('、')}。再挑戰一次，收齊就能三星！`;
  const isRevisedRoute = LEVELS[result.levelId].rulesVersion > 1;
  const bestLabel = best.isFirstCompletion && isRevisedRoute && historicalBefore
    ? '✦ 新版首次完成'
    : best.isFirstCompletion
      ? '✦ 新的最佳紀錄'
      : best.isNewBest
        ? '✦ 新版最佳紀錄'
        : best.starsImproved
          ? `✦ 星數紀錄提升至 ${best.stars} 星`
          : '新版個人最佳';
  $('#clear-best').textContent = `${bestLabel} · ${best.score.toLocaleString()} 分 · 最快 ${formatTime(best.time)}${isRevisedRoute && historicalBefore ? ' · 舊版紀錄保留，分版比較' : ''}`;
  const badges = ['出口發現'];
  if (result.beaconCount) badges.push(`${result.beaconCount} 座信標點亮`);
  if (!result.scansUsed) badges.push('無脈衝通關');
  if (result.hazardCount && !result.hazardHits) badges.push('無傷穿越墨霧');
  if (supplyTotal === result.totalSupplies && result.totalSupplies > 0) badges.push('補給全收集');
  if (result.echoCount === result.totalEchoes && result.totalEchoes > 0) badges.push('微光全收集 +250');
  if (result.exploration === 100) badges.push('全境探索');
  $('#clear-achievements').replaceChildren(...badges.map((label) => { const badge = document.createElement('span'); badge.textContent = label; return badge; }));
  $('#next-level-button').hidden = !nextLevelId(result.levelId);
  const completed = Object.keys(LEVELS).filter((id) => progress.get(id)).length;
  $('#clear-journey').textContent = completed === Object.keys(LEVELS).length ? '六條路線已完成！回到關卡選擇，繼續挑戰全三星。' : `旅程進度 ${completed} / ${Object.keys(LEVELS).length} · 每次探索都留下光。`;
  showScreen('clear');
}

function openConfirmation(kind, details = {}) {
  if (pendingConfirmation) return;
  const context = game.state === 'confirming' && game.confirmation?.kind === kind
    ? { ...game.confirmation }
    : game.beginConfirmation(kind);
  if (!context) return;
  pendingConfirmation = { kind, context, details };
  pauseDialog.close();
  const copy = {
    exit: {
      kicker: 'EXIT FOUND', title: '已找到出口！', accept: '現在通關', cancel: '繼續探索',
      description: `還差 ${[
        details.missingEchoes ? `${details.missingEchoes} 個微光` : '',
        details.missingSupplies ? `${details.missingSupplies} 份補給` : ''
      ].filter(Boolean).join('、')}即可完成全收集。`
    },
    restart: {
      kicker: 'RESTART ROUTE', title: '重新開始本關？', cancel: '取消', accept: '重新開始',
      description: '本次探索進度將重置，已儲存的歷史紀錄不受影響。'
    },
    leave: {
      kicker: 'LEAVE ROUTE', title: '離開本局探索？', cancel: '繼續探索', accept: '回到關卡選擇',
      description: '離開後，本次尚未結算的探索進度不會保留；已儲存的歷史紀錄不受影響。'
    }
  }[kind];
  $('#confirm-kicker').textContent = copy.kicker;
  $('#confirm-title').textContent = copy.title;
  $('#confirm-description').textContent = copy.description;
  $('#confirm-cancel').textContent = copy.cancel;
  $('#confirm-accept').textContent = copy.accept;
  confirmDialog.showModal();
  $('#confirm-cancel').focus({ preventScroll: true });
}

function finishConfirmation(accepted) {
  if (!pendingConfirmation) return;
  const pending = pendingConfirmation;
  pendingConfirmation = null;
  confirmDialog.close();
  const context = game.resolveConfirmation(accepted);
  if (!context) return;
  if (!accepted) {
    if (context.fromState === 'paused' && !context.silentPaused) pauseDialog.showModal();
    else $('#game-canvas').focus({ preventScroll: true });
    return;
  }
  if (pending.kind === 'exit') {
    game.clear();
  } else if (pending.kind === 'restart') {
    resetExplorationInfo();
    game.restart();
    $('#game-canvas').focus({ preventScroll: true });
  } else if (pending.kind === 'leave') {
    goHome();
  }
}

function cancelConfirmation() { finishConfirmation(false); }
function requestRestart() {
  if (!screens.game.hidden) openConfirmation('restart');
}
function requestLeave() {
  if (screens.game.hidden) { goHome(); return; }
  if (['playing', 'paused'].includes(game.state)) openConfirmation('leave');
  else goHome();
}

document.querySelectorAll('[data-chapter]').forEach((button) => button.addEventListener('click', () => {
  selectedLevel = Object.keys(LEVELS).find((id) => LEVELS[id].chapter === Number(button.dataset.chapter)); updateRoutes(); sound.click();
}));
$('#scan-button').addEventListener('click', () => { game.useScan(); $('#game-canvas').focus({ preventScroll: true }); });
$('#continue-journey').addEventListener('click', () => {
  const recommendation = recommendedRoute();
  if (!recommendation) return;
  selectedLevel = recommendation;
  updateRoutes();
  $('#start-button').focus({ preventScroll: true });
});
$('#start-button').addEventListener('click', startSelectedLevel);
$('#retry-button').addEventListener('click', () => { selectedLevel = lastResult?.levelId || selectedLevel; startSelectedLevel(); });
$('#next-level-button').addEventListener('click', () => { selectedLevel = nextLevelId(lastResult.levelId) || selectedLevel; startSelectedLevel(); });
$('#home-button').addEventListener('click', goHome);
for (const id of ['#brand-home', '#pause-home']) $(id).addEventListener('click', requestLeave);
$('#pause-button').addEventListener('click', () => game.togglePause());
$('#resume-button').addEventListener('click', () => { game.setPaused(false); $('#game-canvas').focus({ preventScroll: true }); });
$('#pause-restart').addEventListener('click', requestRestart);
pauseDialog.addEventListener('cancel', (event) => { event.preventDefault(); if (game.state === 'paused') { game.setPaused(false); $('#game-canvas').focus({ preventScroll: true }); } });
$('#confirm-cancel').addEventListener('click', cancelConfirmation);
$('#confirm-accept').addEventListener('click', () => finishConfirmation(true));
confirmDialog.addEventListener('cancel', (event) => { event.preventDefault(); cancelConfirmation(); });
explorationInfo.addEventListener('toggle', () => { game.setExplorationInfoOpen(explorationInfo.open); });
memoryToggle.addEventListener('change', () => { game.setExplorationMemory(memoryToggle.checked); });
$('#camera-toggle').addEventListener('click', () => { game.toggleCamera(); updateCameraButton(); $('#game-canvas').focus({ preventScroll: true }); });

const SOUND_KEY = 'jellyVisionMaze.sound.v1';
try { sound.enabled = localStorage.getItem(SOUND_KEY) !== 'off'; } catch { /* Storage is optional. */ }
function updateSoundButton() {
  const button = $('#sound-toggle');
  button.classList.toggle('is-muted', !sound.enabled);
  button.setAttribute('aria-pressed', String(sound.enabled));
  button.setAttribute('aria-label', sound.enabled ? '關閉音效' : '開啟音效');
  button.textContent = sound.enabled ? '♫' : '×';
}
$('#sound-toggle').addEventListener('click', () => { sound.toggle(); updateSoundButton(); try { localStorage.setItem(SOUND_KEY, sound.enabled ? 'on' : 'off'); } catch { /* Storage is optional. */ } });
updateSoundButton();
createRouteCards();
updateRoutes();
