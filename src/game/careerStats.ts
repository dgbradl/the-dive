import type { GameState, ShiftReport } from './types';

const CAREER_STORAGE_KEY = 'bargame.career.v1';

/** Cross-run stats that survive game-over and manual save resets. */
export interface CareerStats {
  /** How many runs the player has started. */
  runsPlayed: number;
  /** Total days survived across all runs. */
  daysSurvivedTotal: number;
  /** Longest single run, in days. */
  bestRunDays: number;
  /** Highest end-of-run cash on hand. */
  bestRunCash: number;
  /** Largest single Served entry's net cash (price + tip). */
  biggestTip: number;
  /** Most customers served in a single night. */
  busiestNight: number;
  /** Achievement ids the player has unlocked. */
  unlockedAchievements: string[];
}

export const defaultCareerStats: CareerStats = {
  runsPlayed: 0,
  daysSurvivedTotal: 0,
  bestRunDays: 0,
  bestRunCash: 0,
  biggestTip: 0,
  busiestNight: 0,
  unlockedAchievements: [],
};

export function loadCareerStats(): CareerStats {
  try {
    const raw = localStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return { ...defaultCareerStats };
    const parsed = JSON.parse(raw) as Partial<CareerStats>;
    return {
      ...defaultCareerStats,
      ...parsed,
      // Defensive: legacy stats had no unlockedAchievements.
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
    };
  } catch {
    return { ...defaultCareerStats };
  }
}

export function saveCareerStats(stats: CareerStats): void {
  try {
    localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/**
 * Merge a single shift's report into the running career stats. Pure:
 * returns a new object, leaves the input untouched.
 */
export function recordShift(stats: CareerStats, report: ShiftReport): CareerStats {
  const biggestTipThisShift = report.entries.reduce(
    (max, e) => (e.kind === 'Served' && e.cashDelta > max ? e.cashDelta : max),
    0,
  );
  return {
    ...stats,
    biggestTip: Math.max(stats.biggestTip, biggestTipThisShift),
    busiestNight: Math.max(stats.busiestNight, report.customersServed),
  };
}

/**
 * Merge the end of a run (game-over or manual reset) into career stats.
 * `daysSurvived` is `state.day - 1` since day 1 starts before the first
 * shift has been completed.
 */
export function recordRunEnd(stats: CareerStats, state: GameState): CareerStats {
  const daysSurvived = Math.max(0, state.day - 1);
  return {
    ...stats,
    runsPlayed: stats.runsPlayed + 1,
    daysSurvivedTotal: stats.daysSurvivedTotal + daysSurvived,
    bestRunDays: Math.max(stats.bestRunDays, daysSurvived),
    bestRunCash: Math.max(stats.bestRunCash, state.cash),
  };
}
