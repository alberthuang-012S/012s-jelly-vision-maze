export class HUD {
  constructor() {
    this.nodes = Object.fromEntries(['game-level-label', 'game-level-name', 'time-value', 'vision-meter-fill', 'vision-meter-value', 'supply-count', 'echo-count', 'game-tip', 'vision-toast', 'exploration-value', 'exploration-fill', 'boost-value', 'chain-value', 'chain-fill', 'mission-value', 'scan-button', 'hazard-value'].map((id) => [id, document.getElementById(id)]));
    this.toastTimer = null;
  }
  text(id, value) {
    const node = this.nodes[id];
    if (node.textContent !== value) node.textContent = value;
  }
  width(id, value) {
    const width = `${value}%`;
    if (this.nodes[id].style.width !== width) this.nodes[id].style.width = width;
  }
  setLevel(level) { this.text('game-level-label', `LEVEL ${level.number}`); this.text('game-level-name', level.name); }
  update({ time, vision, supplies, total, echoes, exploration, scan, beacons, hazards }) {
    const obscured = vision.obscuredRemaining > 0;
    this.text('hazard-value', obscured ? `墨霧 ${vision.obscuredRemaining.toFixed(1)} 秒` : vision.protectionRemaining > 0 ? `保護 ${vision.protectionRemaining.toFixed(1)} 秒` : hazards.traps.length + hazards.monsters.length ? `${hazards.traps.length} 陷阱 · ${hazards.monsters.length} 暗影怪` : '安全練習');
    this.nodes['hazard-value'].classList.toggle('is-danger', obscured);
    this.nodes['vision-meter-fill'].classList.toggle('is-danger', obscured);
    this.text('mission-value', beacons.total && beacons.collected < beacons.total ? `點亮信標 ${beacons.collected} / ${beacons.total}` : '找到金色出口');
    this.text('scan-button', `◎ 脈衝 ${scan.charges}/2`);
    this.nodes['scan-button'].disabled = scan.charges === 0 || scan.cooldown > 0;
    this.text('time-value', formatTime(time));
    this.width('vision-meter-fill', vision.getMeterPercent());
    this.text('vision-meter-value', `${vision.currentRadius.toFixed(1)} 格`);
    this.text('supply-count', `${supplies} / ${total}`);
    this.text('echo-count', `${echoes.collected} / ${echoes.total}`);
    this.text('exploration-value', `${exploration}%`);
    this.width('exploration-fill', exploration);
    const status = vision.getStatus();
    this.text('boost-value', vision.boostRemaining > 0 ? `${vision.boostRemaining.toFixed(1)} 秒` : vision.weakRemaining > 0 ? `${vision.weakRemaining.toFixed(1)} 秒` : '基本視野');
    this.nodes['boost-value'].classList.toggle('is-active', vision.boostRemaining > 0 || vision.weakRemaining > 0);
    const chainActive = echoes.remaining > 0 && echoes.collected < echoes.total;
    this.text('chain-value', chainActive ? `×${echoes.chain} · ${echoes.remaining.toFixed(1)} 秒` : echoes.collected === echoes.total ? '全部找到！' : '等待微光');
    this.width('chain-fill', chainActive ? echoes.remaining / 8 * 100 : 0);
    this.text('game-tip', obscured ? '墨霧會自行消退；補給可清除，Q 仍能照亮前方。' : time < 9 ? (beacons.total ? '靠近信標自動點亮，全部點亮後出口才會開啟。' : '找到金色出口即可通關；按 Q 朝水母面向照亮前方 2 秒。') : chainActive ? '在倒數結束前找到下一個微光，延續連鎖加分。' : status.remaining > 0 ? '視野擴展中，趁現在記住前方的路線。' : hazards.traps.length ? '等陷阱休眠再通過；Q 封印陷阱 4 秒、暈眩暗影怪 3 秒。' : 'Q／脈衝照亮面向前方 2 秒，收集微光或信標補充次數。');
  }
  showToast(message) {
    this.text('vision-toast', message);
    this.nodes['vision-toast'].classList.add('is-visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.nodes['vision-toast'].classList.remove('is-visible'), 1800);
  }
  reset() {
    window.clearTimeout(this.toastTimer);
    this.nodes['vision-toast'].classList.remove('is-visible');
    this.text('vision-toast', '');
  }
}

export function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}


