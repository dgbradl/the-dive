import type { CareerStats } from './careerStats';
import type { GameState, ShiftReport } from './types';

export interface AchievementCtx {
  report: ShiftReport;
  state: GameState;
  career: CareerStats;
}

export interface Achievement {
  id: string;
  displayName: string;
  description: string;
  /** Returns true once the achievement should unlock. */
  check: (ctx: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_night',
    displayName: 'First Night',
    description: 'Survive your opening shift.',
    check: ({ report }) => report.day >= 1,
  },
  {
    id: 'crowded_house',
    displayName: 'Crowded House',
    description: 'Serve 20 customers in a single night.',
    check: ({ report }) => report.customersServed >= 20,
  },
  {
    id: 'lease_survivor',
    displayName: 'Lease Survivor',
    description: 'Survive a shift on Day 8 or later — the lease is yours.',
    check: ({ report }) => report.day >= 8,
  },
  {
    id: 'big_tipper',
    displayName: 'Big Tipper',
    description: 'Record a single served entry netting $30 or more.',
    check: ({ report }) =>
      report.entries.some((e) => e.kind === 'Served' && e.cashDelta >= 30),
  },
  {
    id: 'stockout_king',
    displayName: 'Stockout King',
    description: 'Survive a shift where 3+ customers walk out for empty stock.',
    check: ({ report }) =>
      report.entries.filter((e) => e.kind === 'Walkout' && e.text.includes('out of stock')).length >= 3,
  },
  {
    id: 'mixologist',
    displayName: 'Mixologist',
    description: 'Author your first signature drink.',
    check: ({ state }) => state.signatures.length > 0,
  },
  {
    id: 'spotless',
    displayName: 'Spotless',
    description: 'Run a clean night — no walkouts, no mishaps.',
    check: ({ report }) =>
      report.customersLost === 0 &&
      !report.entries.some((e) => e.kind === 'Mishap'),
  },
];

/**
 * Returns the achievement ids that just unlocked this shift — the ones whose
 * `check` returns true and that aren't already in `alreadyUnlocked`.
 */
export function newlyUnlocked(ctx: AchievementCtx, alreadyUnlocked: readonly string[]): string[] {
  const have = new Set(alreadyUnlocked);
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.id)) continue;
    if (a.check(ctx)) out.push(a.id);
  }
  return out;
}

/** Look up an achievement by id, or null. */
export function findAchievement(id: string): Achievement | null {
  return ACHIEVEMENTS.find((a) => a.id === id) ?? null;
}
