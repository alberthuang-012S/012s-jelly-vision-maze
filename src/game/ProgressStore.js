import { LEVELS } from './levelConfig.js';

export const PROGRESS_KEY = 'jellyVisionMaze.progress.v1';

function isValidRecord(record) {
  return record && Number.isFinite(record.score) && record.score >= 0
    && Number.isFinite(record.time) && record.time >= 0;
}

function normalizeRecord(record, rulesVersion) {
  if (!isValidRecord(record)) return null;
  return {
    score: Math.round(record.score),
    time: record.time,
    allEchoes: record.allEchoes === true,
    stars: Number.isInteger(record.stars)
      ? Math.max(1, Math.min(3, record.stars))
      : 1 + Number(record.allEchoes === true),
    rulesVersion
  };
}

// Storage failure never prevents a run. Records are grouped by level-rule
// version so revised tutorial routes never compete with their legacy scores.
export class ProgressStore {
  constructor(storage) {
    this.records = {};
    try { this.storage = storage ?? globalThis.localStorage; } catch { this.storage = null; }
    let saved = {};
    try { saved = JSON.parse(this.storage?.getItem(PROGRESS_KEY) || '{}'); } catch { saved = {}; }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};

    for (const id of Object.keys(LEVELS)) {
      const source = saved[id];
      const versions = {};
      if (source?.versions && typeof source.versions === 'object' && !Array.isArray(source.versions)) {
        for (const [rawVersion, record] of Object.entries(source.versions)) {
          const version = Number(rawVersion);
          const normalized = normalizeRecord(record, Number.isInteger(version) && version > 0 ? version : 1);
          if (normalized) versions[normalized.rulesVersion] = normalized;
        }
      } else {
        // v1 was a flat record. Keep it as version 1; revised routes will show
        // it as historical until the player completes the new ruleset.
        const legacyVersion = Number.isInteger(source?.rulesVersion) && source.rulesVersion > 0 ? source.rulesVersion : 1;
        const normalized = normalizeRecord(source, legacyVersion);
        if (normalized) versions[legacyVersion] = normalized;
      }
      if (Object.keys(versions).length) this.records[id] = { versions };
    }
    this.persist();
  }

  currentVersion(id) { return LEVELS[id]?.rulesVersion || 1; }

  getCurrent(id) {
    const record = this.records[id]?.versions?.[this.currentVersion(id)];
    return record ? { ...record } : null;
  }

  get(id) {
    const versions = Object.values(this.records[id]?.versions || {});
    if (!versions.length) return null;
    return {
      score: Math.max(...versions.map((record) => record.score)),
      time: Math.min(...versions.map((record) => record.time)),
      allEchoes: versions.some((record) => record.allEchoes),
      stars: Math.max(...versions.map((record) => record.stars))
    };
  }

  getSummary(id) {
    const historical = this.get(id);
    const current = this.getCurrent(id);
    return {
      historical,
      current,
      rulesVersion: this.currentVersion(id),
      routeUpdated: Boolean(historical && LEVELS[id]?.rulesVersion > 1),
      hasCurrent: Boolean(current)
    };
  }

  record(result) {
    if (!Object.hasOwn(LEVELS, result.levelId) || !Number.isFinite(result.score) || result.score < 0 || !Number.isFinite(result.time) || result.time < 0) return null;
    const rulesVersion = Number.isInteger(result.rulesVersion) && result.rulesVersion > 0
      ? result.rulesVersion
      : this.currentVersion(result.levelId);
    const levelRecords = this.records[result.levelId] ||= { versions: {} };
    const previous = levelRecords.versions[rulesVersion] || null;
    const isNewBest = !previous || result.score > previous.score;
    const best = {
      score: Math.max(previous?.score ?? 0, Math.round(result.score)),
      time: Math.min(previous?.time ?? Infinity, result.time),
      allEchoes: Boolean(previous?.allEchoes || (result.totalEchoes > 0 && result.echoCount === result.totalEchoes)),
      stars: Math.max(previous?.stars || 1, Number.isInteger(result.stars)
        ? Math.max(1, Math.min(3, result.stars))
        : 1 + Number(result.totalEchoes > 0 && result.echoCount === result.totalEchoes)),
      rulesVersion
    };
    levelRecords.versions[rulesVersion] = best;
    this.persist();
    return {
      ...best,
      isNewBest,
      isFirstCompletion: !previous,
      starsImproved: best.stars > (previous?.stars || 0),
      previousScore: previous?.score ?? null
    };
  }

  persist() {
    try {
      const payload = Object.fromEntries(Object.entries(this.records).map(([id, entry]) => [id, { versions: entry.versions }]));
      this.storage?.setItem(PROGRESS_KEY, JSON.stringify(payload));
    } catch { /* Use session memory when storage is blocked or full. */ }
  }
}
