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
let selectedLevel = 'level-1';
let lastResult = null;

const game = new Game({
  canvas: $('#game-canvas'), viewport: $('#game-viewport'), hud,
  onClear: (result) => { lastResult = result; sound.clear(); showClear(result); },
  onPickup: (kind) => sound.pickup(kind), onEcho: (chain) => sound.echo(chain), onMove: () => sound.move(),
  onPause: (paused) => {
    if (paused && !pauseDialog.open) pauseDialog.showModal();
    if (!paused && pauseDialog.open) pauseDialog.close();
    $('#pause-button').textContent = paused ? '▶ 繼續' : 'Ⅱ 暫停';
  }
});
const input = new InputController({
  onRestart: () => game.restart(),
  onScan: () => game.useScan(),
  onEscape: (event) => { if (!screens.game.hidden && !pauseDialog.open) { event.preventDefault(); game.togglePause(); } },
  onBlur: () => game.setPaused(true)
});
game.setInput(input);

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => { screen.hidden = key !== name; });
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
    card.classList.toggle('is-complete', Boolean(progress.get(id)));
    card.querySelector('.level-card-arrow').textContent = progress.get(id) ? '✓' : '↗';
    const record = progress.get(id);
    card.querySelector('small').textContent = `${LEVELS[id].theme}${record ? ' · ' + '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars) : ''}`;
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
    continueButton.textContent = `${progress.get(recommendation) ? '挑戰三星' : '接續旅程'} → ${LEVELS[recommendation].number} ${LEVELS[recommendation].theme}`;
  }
  const best = progress.get(selectedLevel);
  $('#route-best').textContent = best ? `最佳 ${best.score.toLocaleString()} 分 · 最快 ${formatTime(best.time)}${best.allEchoes ? ' · 微光全收集' : ''}` : '尚未探索 · 從這裡出發';
  const preview = $('#route-preview');
  const ctx = preview.getContext('2d');
  const size = Math.min((preview.width - 16) / level.width, (preview.height - 16) / level.height);
  const ox = (preview.width - level.width * size) / 2;
  const oy = (preview.height - level.height * size) / 2;
  ctx.clearRect(0, 0, preview.width, preview.height);
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

function updateCameraButton() {
  $('#camera-toggle').textContent = game.follow ? '切換全圖' : '跟隨視角';
  $('#camera-toggle').setAttribute('aria-pressed', String(game.follow));
}
function startSelectedLevel() {
  sound.unlock();
  showScreen('game');
  game.start(selectedLevel);
  updateCameraButton();
}
function goHome() { game.stop(); updateRoutes(); showScreen('start'); }
function nextLevelId(id) { return Object.keys(LEVELS)[Object.keys(LEVELS).indexOf(id) + 1] || null; }
function recommendedRoute() {
  return Object.keys(LEVELS).find((id) => !progress.get(id)) || Object.keys(LEVELS).find((id) => progress.get(id).stars < 3) || null;
}

function showClear(result) {
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
  $('#clear-best').textContent = `${best.isNewBest ? '✦ 新的最佳紀錄' : best.starsImproved ? '✦ 星數紀錄提升至 ' + best.stars + ' 星' : '個人最佳 ' + best.score.toLocaleString() + ' 分'} · 最快 ${formatTime(best.time)}`;
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
$('#game-restart').addEventListener('click', () => { game.restart(); $('#game-canvas').focus({ preventScroll: true }); });
$('#retry-button').addEventListener('click', () => { selectedLevel = lastResult?.levelId || selectedLevel; startSelectedLevel(); });
$('#next-level-button').addEventListener('click', () => { selectedLevel = nextLevelId(lastResult.levelId) || selectedLevel; startSelectedLevel(); });
for (const id of ['#home-button', '#brand-home', '#pause-home']) $(id).addEventListener('click', goHome);
$('#pause-button').addEventListener('click', () => game.togglePause());
$('#resume-button').addEventListener('click', () => { game.setPaused(false); $('#game-canvas').focus({ preventScroll: true }); });
$('#pause-restart').addEventListener('click', () => { game.restart(); $('#game-canvas').focus({ preventScroll: true }); });
pauseDialog.addEventListener('cancel', (event) => { event.preventDefault(); game.setPaused(false); $('#game-canvas').focus({ preventScroll: true }); });
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
