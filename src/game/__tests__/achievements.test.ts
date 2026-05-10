import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, newlyUnlocked } from '../achievements';
import { defaultCareerStats } from '../careerStats';
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

describe('achievements', () => {
  it('exposes a non-trivial list', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(3);
  });

  it('First Night unlocks after the first shift completes (report.day >= 1)', () => {
    const state = newGame();
    const report = emptyReport();
    report.day = 1;
    const unlocks = newlyUnlocked({ report, state, career: defaultCareerStats }, []);
    expect(unlocks).toContain('first_night');
  });

  it('Crowded House triggers on 20+ customers served', () => {
    const state = newGame();
    const report = emptyReport();
    report.customersServed = 22;
    const unlocks = newlyUnlocked({ report, state, career: defaultCareerStats }, []);
    expect(unlocks).toContain('crowded_house');
  });

  it('Big Tipper triggers on a single served entry netting >=$30', () => {
    const state = newGame();
    const report = emptyReport();
    report.entries = [{ tick: 5, kind: 'Served', text: 'served big', cashDelta: 32, repDelta: 0 }];
    const unlocks = newlyUnlocked({ report, state, career: defaultCareerStats }, []);
    expect(unlocks).toContain('big_tipper');
  });

  it('Spotless requires zero walkouts AND zero mishaps', () => {
    const state = newGame();
    const cleanReport = emptyReport();
    cleanReport.customersServed = 5;
    expect(newlyUnlocked({ report: cleanReport, state, career: defaultCareerStats }, [])).toContain('spotless');

    const dirtyReport = emptyReport();
    dirtyReport.customersLost = 1;
    expect(newlyUnlocked({ report: dirtyReport, state, career: defaultCareerStats }, [])).not.toContain('spotless');

    const mishapReport = emptyReport();
    mishapReport.entries = [{ tick: 5, kind: 'Mishap', text: 'oof', cashDelta: -3, repDelta: -1 }];
    expect(newlyUnlocked({ report: mishapReport, state, career: defaultCareerStats }, [])).not.toContain('spotless');
  });

  it('an achievement only unlocks once', () => {
    const state = newGame();
    const report = emptyReport();
    report.day = 1;
    const unlocks = newlyUnlocked({ report, state, career: defaultCareerStats }, ['first_night']);
    expect(unlocks).not.toContain('first_night');
  });
});
