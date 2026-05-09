import type { GameState, Milestone } from './types';

const LEASE_TARGET = 300;
const REP_TARGET = 30;
const REP_PENALTY_RENT = 20;

export const MILESTONES: Milestone[] = [
  {
    id: 'day7-lease',
    dueDay: 7,
    description: `Make $${LEASE_TARGET} cash by morning of Day 7 — or you lose the lease.`,
    bannerLabel: (s) =>
      `Lease check Day 7 · need $${LEASE_TARGET} (have $${s.cash})`,
    check: (s) => s.cash >= LEASE_TARGET,
  },
  {
    id: 'day14-rep',
    dueDay: 14,
    description: `Hit reputation ${REP_TARGET} by Day 14, or rent climbs $${REP_PENALTY_RENT}/day.`,
    bannerLabel: (s) =>
      `Rep check Day 14 · need ${REP_TARGET} rep (have ${s.reputation})`,
    check: (s) => s.reputation >= REP_TARGET,
  },
];

/** Returns the next upcoming milestone (the one that's about to fire). */
export function upcomingMilestone(state: GameState): Milestone | null {
  for (const m of MILESTONES) {
    if (state.day < m.dueDay) return m;
  }
  return null;
}

export type MilestoneOutcome =
  | { kind: 'pass'; milestone: Milestone }
  | { kind: 'fail-lease'; milestone: Milestone }
  | { kind: 'fail-rep'; milestone: Milestone; newRent: number }
  | null;

/**
 * Evaluate whether a milestone fires this morning. Called after `advanceDay`
 * — if state.day matches a milestone's dueDay, run its check and return
 * the outcome. Returns null if no milestone is due today.
 */
export function evaluateMilestoneFor(state: GameState): MilestoneOutcome {
  const m = MILESTONES.find((mi) => mi.dueDay === state.day);
  if (!m) return null;
  const passed = m.check(state);
  if (passed) return { kind: 'pass', milestone: m };
  if (m.id === 'day7-lease') return { kind: 'fail-lease', milestone: m };
  if (m.id === 'day14-rep') return { kind: 'fail-rep', milestone: m, newRent: state.rentPerDay + REP_PENALTY_RENT };
  return null;
}
