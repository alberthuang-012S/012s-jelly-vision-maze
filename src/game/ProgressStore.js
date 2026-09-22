import { LEVELS } from './levelConfig.js';

export const PROGRESS_KEY = 'jellyVisionMaze.progress.v1';

// Storage failure never prevents a run. Keep the latest progress in memory too.
export class ProgressStore {
  constructor(storage) {
    this.records = {};
    try { this.storage = storage ?? globalThis.localStorage; } catch { this.storage = null; }
    try {
      const saved = JSON.parse(this.storage?.getItem(PROGRESS_KEY) || '{}');
      for (const id of Object.keys(LEVELS)) {
        const record = saved?.[id];
        if (record && Number.isFinite(record.score) && record.score >= 0 && Number.isFinite(record.time) && record.time >= 0) {
          this.records[id] = { score: Math.round(record.score), time: record.time, allEchoes: record.allEchoes === true, stars: Number.isInteger(record.stars) ? Math.max(1, Math.min(3, record.stars)) : 1 + Number(record.allEchoes === true) };
        }
      }
    } catch { /* Malformed or blocked storage is safe to ignore. */ }
  }

  get(id) { return this.records[id] ? { ...this.records[id] } : null; }

  record(result) {
    if (!Object.hasOwn(LEVELS, result.levelId) || !Number.isFinite(result.score) || result.score < 0 || !Number.isFinite(result.time) || result.time < 0) return null;
    const previous = this.get(result.levelId);
    const isNewBest = !previous || result.score > previous.score;
    const best = {
      score: Math.max(previous?.score ?? 0, Math.round(result.score)),
      time: Math.min(previous?.time ?? Infinity, result.time),
      allEchoes: Boolean(previous?.allEchoes || (result.totalEchoes > 0 && result.echoCount === result.totalEchoes)),
      stars: Math.max(previous?.stars || 1, Number.isInteger(result.stars) ? Math.max(1, Math.min(3, result.stars)) : 1 + Number(result.totalEchoes > 0 && result.echoCount === result.totalEchoes))
    };
    this.records[result.levelId] = best;
    try { this.storage?.setItem(PROGRESS_KEY, JSON.stringify(this.records)); } catch { /* Use session memory. */ }
    return { ...best, isNewBest, starsImproved: best.stars > (previous?.stars || 0), previousScore: previous?.score ?? null };
  }
}
