import { describe, expect, it } from 'vitest';
import { applyReport } from '../simulator';
import { newGame } from '../save';
import { evaluateMilestoneFor, upcomingMilestone } from '../milestones';
import type { ShiftReport } from '../types';

function emptyReport(day: number): ShiftReport {
  return {
    day, seed: 1, cashDelta: 0, repDelta: 0,
    customersServed: 0, customersLost: 0, wagesPaid: 0,
    entries: [], heatAtClose: 0, damages: [], decisions: [], rentPaid: 0, stockUsed: {},
  };
}

describe('milestones', () => {
  it('upcomingMilestone is the Day 7 lease check on Day 1', () => {
    const s = newGame();
    const m = upcomingMilestone(s);
    expect(m?.id).toBe('day7-lease');
  });

  it('passes Day 7 lease when cash >= $300', () => {
    const s = newGame();
    s.day = 7;
    s.cash = 350;
    expect(evaluateMilestoneFor(s)?.kind).toBe('pass');
  });

  it('fails Day 7 lease when cash < $300', () => {
    const s = newGame();
    s.day = 7;
    s.cash = 100;
    expect(evaluateMilestoneFor(s)?.kind).toBe('fail-lease');
  });

  it('Day 14 rep failure raises rent by $20', () => {
    const s = newGame();
    s.day = 14;
    s.reputation = 10; // below the 30 target
    const out = evaluateMilestoneFor(s);
    expect(out?.kind).toBe('fail-rep');
    if (out?.kind === 'fail-rep') {
      expect(out.newRent).toBe(s.rentPerDay + 20);
    }
  });

  it('returns null on non-milestone days', () => {
    const s = newGame();
    s.day = 4;
    expect(evaluateMilestoneFor(s)).toBeNull();
  });
});

describe('applyReport rent', () => {
  it('subtracts rent from cash alongside wages', () => {
    const s = newGame();
    s.cash = 200;
    s.rentPerDay = 40;
    const wages = s.hiredStaff.reduce((sum, h) => sum + h.wagePerDay, 0);
    const r = emptyReport(1);
    r.cashDelta = 50;
    const { state: next, report } = applyReport(s, r);
    expect(report.rentPaid).toBe(40);
    expect(next.cash).toBe(200 + 50 - wages - 40);
  });
});
