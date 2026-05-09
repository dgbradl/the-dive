import { describe, expect, it } from 'vitest';
import { catalog } from '../content';
import { applyReport, runShift } from '../simulator';
import { newGame } from '../save';
import { defaultShiftConfig, Station } from '../types';

function freshState() {
  // newGame() uses Math.random for seed; override to make tests deterministic.
  const s = newGame();
  s.rngSeed = 1337;
  return s;
}

describe('runShift', () => {
  it('is deterministic for a given seed', () => {
    const s = freshState();
    const a = runShift(s, defaultShiftConfig, catalog, 42);
    const b = runShift(s, defaultShiftConfig, catalog, 42);
    expect(a.cashDelta).toBe(b.cashDelta);
    expect(a.repDelta).toBe(b.repDelta);
    expect(a.entries.length).toBe(b.entries.length);
    expect(a.customersServed).toBe(b.customersServed);
    expect(a.customersLost).toBe(b.customersLost);
  });

  it('produces different reports for different seeds', () => {
    const s = freshState();
    const a = runShift(s, defaultShiftConfig, catalog, 1);
    const b = runShift(s, defaultShiftConfig, catalog, 9999);
    expect(a.cashDelta !== b.cashDelta || a.entries.length !== b.entries.length).toBe(true);
  });

  it('a Day-1 dive bar is profitable on average across many shifts', () => {
    const s = freshState();
    let total = 0;
    const trials = 50;
    for (let i = 0; i < trials; i++) {
      total += runShift(s, defaultShiftConfig, catalog, 1000 + i).cashDelta;
    }
    expect(total).toBeGreaterThan(0);
  });

  it('no bar staff = no service, but the shift still runs and may log walkouts', () => {
    const s = freshState();
    s.assignments = []; // unassign Marv
    const r = runShift(s, defaultShiftConfig, catalog, 7);
    expect(r.customersServed).toBe(0);
    expect(r.entries.length).toBeGreaterThan(0);
  });

  it('applyReport deducts wages and clamps reputation', () => {
    const s = freshState();
    const r = runShift(s, defaultShiftConfig, catalog, 42);
    const { state: next, report } = applyReport(s, r);
    expect(report.wagesPaid).toBe(30); // Marv only
    expect(next.cash).toBe(s.cash + r.cashDelta - 30);
    expect(next.reputation).toBeGreaterThanOrEqual(0);
    expect(next.reputation).toBeLessThanOrEqual(100);
  });

  it('Marv is assigned to the Bar in a fresh game', () => {
    const s = freshState();
    expect(s.assignments).toHaveLength(1);
    expect(s.assignments[0].station).toBe(Station.Bar);
  });
});
