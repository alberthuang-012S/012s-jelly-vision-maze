export class HUD {
  constructor() {
    this.nodes = Object.fromEntries(['game-level-label', 'game-level-name', 'time-value', 'vision-meter-fill', 'vision-meter-value', 'supply-count', 'echo-count', 'game-tip', 'vision-toast', 'exploration-value', 'exploration-fill', 'boost-value', 'chain-value', 'chain-fill', 'mission-value', 'scan-button', 'hazard-value'].map((id) => [id, document.getElementById(id)]));
    this.toastTimer = null;
    this.toastPriority = -1;
  }
  text(id, value) {
    const node = this.nodes[id];
    if (node.textContent !== value) node.textContent = value;
  }
  width(id, value) {
    const width = `${value}%`;
    if (this.nodes[id].style.width !== width) this.nodes[id].style.width = width;
  }
  setLevel(level) { this.text('game-level-label', `第 ${Number(level.number)} 關`); this.text('game-level-name', level.theme || level.name); }
  update({ time, vision, supplies, total, echoes, exploration, scan, beacons, hazards }) {
    const obscured = vision.obscuredRemaining > 0;
    const remaining = (value) => `${Math.max(1, Math.ceil(value))} 秒`;
    this.text('hazard-value', obscured ? `墨霧 ${remaining(vision.obscuredRemaining)}` : vision.protectionRemaining > 0 ? `保護 ${remaining(vision.protectionRemaining)}` : hazards.traps.length + hazards.monsters.length ? `${hazards.traps.length} 陷阱 · ${hazards.monsters.length} 暗影怪` : '安全練習');
    this.nodes['hazard-value'].classList.toggle('is-danger', obscured);
    this.nodes['vision-meter-fill'].classList.toggle('is-danger', obscured);
    this.text('mission-value', beacons.total && beacons.collected < beacons.total ? `點亮信標 ${beacons.collected} / ${beacons.total}` : '找到金色出口');
    this.text('scan-button', scan.cooldown > 0 ? `前方脈衝 · 冷卻 ${remaining(scan.cooldown)}` : `前方脈衝 ${scan.charges}/2`);
    this.nodes['scan-button'].disabled = scan.charges === 0 || scan.cooldown > 0;
    this.text('time-value', formatTime(time));
    this.width('vision-meter-fill', vision.getMeterPercent());
    this.text('vision-meter-value', `視野 ${vision.currentRadius.toFixed(1)} 格`);
    this.text('supply-count', `${supplies} / ${total}`);
    this.text('echo-count', `${echoes.collected} / ${echoes.total}`);
    this.text('exploration-value', `${exploration}%`);
    this.width('exploration-fill', exploration);
    const status = vision.getStatus();
    this.text('boost-value', vision.boostRemaining > 0 ? `擴大視野 · ${remaining(vision.boostRemaining)}` : vision.weakRemaining > 0 ? `延長視野 · ${remaining(vision.weakRemaining)}` : '基本視野');
    this.nodes['boost-value'].classList.toggle('is-active', vision.boostRemaining > 0 || vision.weakRemaining > 0);
    const chainActive = echoes.remaining > 0 && echoes.collected < echoes.total;
    this.text('chain-value', chainActive ? `連鎖 ×${echoes.chain} · ${remaining(echoes.remaining)}` : echoes.collected === echoes.total ? '探索完成' : '等待微光');
    this.width('chain-fill', chainActive ? echoes.remaining / 8 * 100 : 0);
    this.text('game-tip', obscured ? '墨霧會自行消退；補給可清除，前方脈衝仍能照亮路線。' : time < 9 ? (beacons.total ? '靠近信標自動點亮，全部點亮後出口才會開啟。' : '先看清路線，再走向金色出口；可用前方脈衝探路。') : chainActive ? '在 8 秒連鎖窗口內找到下一個微光，延續加分。' : status.remaining > 0 ? '視野擴大中，記住分岔與補給位置。' : hazards.traps.length ? '等陷阱休眠再通過；前方脈衝可封印陷阱與暈眩暗影怪。' : '靠近亮點自動收集；前方脈衝可照亮面向前方。');
  }
  showToast(message, { priority = 0, duration = 1800 } = {}) {
    if (priority < this.toastPriority && this.nodes['vision-toast'].classList.contains('is-visible')) return;
    this.text('vision-toast', message);
    this.nodes['vision-toast'].classList.add('is-visible');
    this.toastPriority = priority;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.nodes['vision-toast'].classList.remove('is-visible');
      this.toastPriority = -1;
    }, duration);
  }
  reset() {
    window.clearTimeout(this.toastTimer);
    this.nodes['vision-toast'].classList.remove('is-visible');
    this.text('vision-toast', '');
    this.toastPriority = -1;
  }
}

export function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}


