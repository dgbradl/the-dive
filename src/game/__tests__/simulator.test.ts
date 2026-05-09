import { describe, expect, it } from 'vitest';
import { catalog } from '../content';
import { applyReport, runShift } from '../simulator';
import { newGame } from '../save';
import {
  defaultShiftConfig,
  StaffRole,
  Station,
  type GameCatalog,
  type GameState,
  type HiredStaff,
  type ShiftReport,
  type StaffArchetype,
  type StaffAssignment,
  type StaffTrait,
} from '../types';

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

// ------------------------------------------------------------------
// Trait effects
// ------------------------------------------------------------------

interface StaffSpec {
  traits: StaffTrait[];
  station: Station;
  role?: StaffRole;
}

/** Build an isolated GameState + catalog with only the specified staff. */
function fixture(spec: StaffSpec[]): { state: GameState; catalog: GameCatalog } {
  const archetypes: StaffArchetype[] = spec.map((s, i) => ({
    id: `test_staff_${i}`,
    displayName: `Test${i}`,
    role: s.role ?? StaffRole.Bartender,
    baseWagePerDay: 0,
    hireCost: 0,
    traits: s.traits,
    speed: 0.5,
    charm: 0.5,
    reliability: 0.8,
    flavorText: '',
    emoji: '🤖',
  }));
  const testCatalog: GameCatalog = { ...catalog, staffArchetypes: archetypes };
  const hiredStaff: HiredStaff[] = spec.map((_, i) => ({
    instanceId: `i${i}`,
    archetypeId: `test_staff_${i}`,
    displayName: `Test${i}`,
    mood: 70,
    wagePerDay: 0,
  }));
  const assignments: StaffAssignment[] = spec.map((s, i) => ({
    staffInstanceId: `i${i}`,
    station: s.station,
  }));
  const state: GameState = {
    day: 1,
    cash: 200,
    reputation: 5,
    rngSeed: 1,
    hiredStaff,
    drinkPrices: [],
    ownedUpgradeIds: [],
    assignments,
    nightlySpecialDrinkId: null,
  };
  return { state, catalog: testCatalog };
}

function avgOver(trials: number, fn: (seed: number) => number): number {
  let sum = 0;
  for (let i = 0; i < trials; i++) sum += fn(2000 + i);
  return sum / trials;
}

function servedCash(report: ShiftReport): number {
  return report.entries.filter((e) => e.kind === 'Served').reduce((sum, e) => sum + e.cashDelta, 0);
}

function trayDrops(report: ShiftReport): number {
  return report.entries.filter((e) => e.kind === 'Mishap' && e.text.includes('drops a tray')).length;
}

function crisisCash(report: ShiftReport): number {
  return report.entries
    .filter((e) => e.kind === 'Event' && e.cashDelta < 0)
    .reduce((sum, e) => sum + e.cashDelta, 0);
}

describe('staff traits', () => {
  it('Quick at Bar serves more customers on average', () => {
    const base = fixture([{ traits: [], station: Station.Bar }]);
    const quick = fixture([{ traits: ['Quick'], station: Station.Bar }]);
    const baseAvg = avgOver(80, (s) => runShift(base.state, defaultShiftConfig, base.catalog, s).customersServed);
    const quickAvg = avgOver(80, (s) => runShift(quick.state, defaultShiftConfig, quick.catalog, s).customersServed);
    expect(quickAvg).toBeGreaterThan(baseAvg);
  });

  it('Lazy at Bar emits exactly one "smoke break" Note entry per Lazy', () => {
    const oneLazy = fixture([{ traits: ['Lazy'], station: Station.Bar }]);
    const r = runShift(oneLazy.state, defaultShiftConfig, oneLazy.catalog, 12345);
    const breaks = r.entries.filter((e) => e.kind === 'Note' && e.text.includes('smoke')).length;
    expect(breaks).toBe(1);
  });

  it('Klutz on Floor produces more tray-drop mishaps on average', () => {
    // A bartender at Bar so customers actually get served (Klutz fires per-serve).
    const base = fixture([
      { traits: [], station: Station.Bar },
      { traits: [], station: Station.Floor, role: StaffRole.Server },
    ]);
    const klutz = fixture([
      { traits: [], station: Station.Bar },
      { traits: ['Klutz'], station: Station.Floor, role: StaffRole.Server },
    ]);
    const baseAvg = avgOver(80, (s) => trayDrops(runShift(base.state, defaultShiftConfig, base.catalog, s)));
    const klutzAvg = avgOver(80, (s) => trayDrops(runShift(klutz.state, defaultShiftConfig, klutz.catalog, s)));
    expect(baseAvg).toBe(0); // base never drops trays
    expect(klutzAvg).toBeGreaterThan(0);
  });

  it('Charming at Bar increases served-cash on average (rng-path identical)', () => {
    const base = fixture([{ traits: [], station: Station.Bar }]);
    const charm = fixture([{ traits: ['Charming'], station: Station.Bar }]);
    const baseAvg = avgOver(80, (s) => servedCash(runShift(base.state, defaultShiftConfig, base.catalog, s)));
    const charmAvg = avgOver(80, (s) => servedCash(runShift(charm.state, defaultShiftConfig, charm.catalog, s)));
    expect(charmAvg).toBeGreaterThan(baseAvg);
  });

  it('Surly at Bar decreases served-cash on average', () => {
    const base = fixture([{ traits: [], station: Station.Bar }]);
    const surly = fixture([{ traits: ['Surly'], station: Station.Bar }]);
    const baseAvg = avgOver(80, (s) => servedCash(runShift(base.state, defaultShiftConfig, base.catalog, s)));
    const surlyAvg = avgOver(80, (s) => servedCash(runShift(surly.state, defaultShiftConfig, surly.catalog, s)));
    expect(surlyAvg).toBeLessThan(baseAvg);
  });

  it('Chatty at Bar reduces walkouts on average', () => {
    const base = fixture([{ traits: [], station: Station.Bar }]);
    const chatty = fixture([{ traits: ['Chatty'], station: Station.Bar }]);
    const baseAvg = avgOver(80, (s) => runShift(base.state, defaultShiftConfig, base.catalog, s).customersLost);
    const chattyAvg = avgOver(80, (s) => runShift(chatty.state, defaultShiftConfig, chatty.catalog, s).customersLost);
    expect(chattyAvg).toBeLessThan(baseAvg);
  });

  it('Charming on Door reduces avg crisis cash penalty', () => {
    // Both fixtures have a bartender so the shift runs; only the Door staff differs.
    const base = fixture([
      { traits: [], station: Station.Bar },
      { traits: [], station: Station.Door, role: StaffRole.Bouncer },
    ]);
    const charm = fixture([
      { traits: [], station: Station.Bar },
      { traits: ['Charming'], station: Station.Door, role: StaffRole.Bouncer },
    ]);
    // Lots of trials because crises are rare (~1.5% per tick).
    const baseAvg = avgOver(300, (s) => crisisCash(runShift(base.state, defaultShiftConfig, base.catalog, s)));
    const charmAvg = avgOver(300, (s) => crisisCash(runShift(charm.state, defaultShiftConfig, charm.catalog, s)));
    // Charming defuses some crises entirely, so charmAvg is less negative.
    expect(charmAvg).toBeGreaterThan(baseAvg);
  });
});
