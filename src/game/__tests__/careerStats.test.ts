import { describe, expect, it } from 'vitest';
import { defaultCareerStats, recordRunEnd, recordShift } from '../careerStats';
import { newGame } from '../save';
import type { ShiftReport } from '../types';

function emptyReport(): ShiftReport {
  return {
    day: 1, seed: 1, cashDelta: 0, repDelta: 0,
    customersServed: 0, customersLost: 0, wagesPaid: 0,
    entries: [], heatAtClose: 0, damages: [], decisions: [], rentPaid: 0,
    stockUsed: {}, staffMoodDelta: {},
  };
}

describe('careerStats', () => {
  it('recordShift updates biggestTip from the largest Served entry', () => {
    const r = emptyReport();
    r.entries = [
      { tick: 1, kind: 'Served', text: 'served', cashDelta: 12, repDelta: 0 },
      { tick: 5, kind: 'Served', text: 'big serve', cashDelta: 35, repDelta: 0 },
      { tick: 9, kind: 'Mishap', text: 'oof', cashDelta: -5, repDelta: -1 }, // not a serve
    ];
    const updated = recordShift(defaultCareerStats, r);
    expect(updated.biggestTip).toBe(35);
  });

  it('recordShift updates busiestNight when customersServed exceeds previous best', () => {
    const r = emptyReport();
    r.customersServed = 18;
    const updated = recordShift({ ...defaultCareerStats, busiestNight: 12 }, r);
    expect(updated.busiestNight).toBe(18);
  });

  it('recordShift does not regress busiestNight on a slow night', () => {
    const r = emptyReport();
    r.customersServed = 4;
    const updated = recordShift({ ...defaultCareerStats, busiestNight: 12 }, r);
    expect(updated.busiestNight).toBe(12);
  });

  it('recordRunEnd increments runsPlayed and tracks bests', () => {
    const s = newGame();
    s.day = 9;
    s.cash = 420;
    const updated = recordRunEnd(defaultCareerStats, s);
    expect(updated.runsPlayed).toBe(1);
    expect(updated.daysSurvivedTotal).toBe(8); // 9 - 1 (Day 1 hasn't been played yet)
    expect(updated.bestRunDays).toBe(8);
    expect(updated.bestRunCash).toBe(420);
  });

  it('recordRunEnd does not regress bests on a worse run', () => {
    const before = { ...defaultCareerStats, bestRunDays: 12, bestRunCash: 800, runsPlayed: 1, daysSurvivedTotal: 12 };
    const s = newGame();
    s.day = 5;
    s.cash = 100;
    const after = recordRunEnd(before, s);
    expect(after.runsPlayed).toBe(2);
    expect(after.daysSurvivedTotal).toBe(16); // 12 + 4
    expect(after.bestRunDays).toBe(12);
    expect(after.bestRunCash).toBe(800);
  });
});
