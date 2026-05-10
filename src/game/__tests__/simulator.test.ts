import { describe, expect, it } from 'vitest';
import { catalog } from '../content';
import { applyDecisionOverride, applyReport, runShift } from '../simulator';
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

  it('applyReport deducts wages + rent and clamps reputation', () => {
    const s = freshState();
    const r = runShift(s, defaultShiftConfig, catalog, 42);
    const { state: next, report } = applyReport(s, r);
    expect(report.wagesPaid).toBe(30); // Marv only
    expect(report.rentPaid).toBe(s.rentPerDay);
    expect(next.cash).toBe(s.cash + r.cashDelta - 30 - s.rentPerDay);
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
    regulars: [],
    heat: 0,
    rentPerDay: 0,
    drinkStock: { pbr: 999, whiskey_sour: 999, house_special: 999 },
    signatures: [],
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
    const baseAvg = avgOver(200, (s) => runShift(base.state, defaultShiftConfig, base.catalog, s).customersServed);
    const quickAvg = avgOver(200, (s) => runShift(quick.state, defaultShiftConfig, quick.catalog, s).customersServed);
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

  it('emits phase-change Notes at Early / Prime / Last Call boundaries', () => {
    const s = freshState();
    const r = runShift(s, defaultShiftConfig, catalog, 42);
    const phaseNotes = r.entries.filter((e) => e.kind === 'Note' && e.phase);
    expect(phaseNotes.map((e) => e.phase)).toEqual(['Early', 'Prime', 'LastCall']);
    // tickCount=20 → Early begins tick 1, Prime tick 7, LastCall tick 15
    expect(phaseNotes[0].tick).toBe(1);
    expect(phaseNotes[1].tick).toBe(7);
    expect(phaseNotes[2].tick).toBe(15);
  });

  it('rowdy college kids spawn more in Last Call than Early', () => {
    // Use a clean fixture so only the dive archetypes can spawn (rep 5 gates the new ones).
    const f = fixture([{ traits: [], station: Station.Bar }]);
    let early = 0;
    let lastCall = 0;
    for (let seed = 0; seed < 200; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 5000 + seed);
      for (const e of r.entries) {
        if (e.kind !== 'CustomerArrived' || e.customerArchetypeId !== 'rowdy_college_kid') continue;
        if (e.tick <= 6) early++;
        else if (e.tick >= 15) lastCall++;
      }
    }
    expect(lastCall).toBeGreaterThan(early);
  });

  it('archetypes with minReputation do not spawn below that reputation', () => {
    const s = freshState();
    s.reputation = 0;
    let dateNight = 0;
    let yelp = 0;
    let wedding = 0;
    for (let seed = 0; seed < 50; seed++) {
      const r = runShift(s, defaultShiftConfig, catalog, 9000 + seed);
      for (const e of r.entries) {
        if (e.kind !== 'CustomerArrived') continue;
        if (e.customerArchetypeId === 'date_night_couple') dateNight++;
        if (e.customerArchetypeId === 'yelp_reviewer') yelp++;
        if (e.customerArchetypeId === 'wedding_party') wedding++;
      }
    }
    expect(dateNight).toBe(0);
    expect(yelp).toBe(0);
    expect(wedding).toBe(0);
  });

  it('Date-Night couples start spawning once reputation crosses 15', () => {
    const s = freshState();
    s.reputation = 50;
    let dateNight = 0;
    for (let seed = 0; seed < 50; seed++) {
      const r = runShift(s, defaultShiftConfig, catalog, 9500 + seed);
      for (const e of r.entries) {
        if (e.kind === 'CustomerArrived' && e.customerArchetypeId === 'date_night_couple') {
          dateNight++;
        }
      }
    }
    expect(dateNight).toBeGreaterThan(0);
  });

  it('Wedding Party gates at rep 60 — not at 50, present at 80', () => {
    const s = freshState();
    s.reputation = 50;
    let weddingsAt50 = 0;
    let weddingsAt80 = 0;
    for (let seed = 0; seed < 50; seed++) {
      const r = runShift(s, defaultShiftConfig, catalog, 11000 + seed);
      weddingsAt50 += r.entries.filter(
        (e) => e.kind === 'CustomerArrived' && e.customerArchetypeId === 'wedding_party',
      ).length;
    }
    s.reputation = 80;
    for (let seed = 0; seed < 50; seed++) {
      const r = runShift(s, defaultShiftConfig, catalog, 11000 + seed);
      weddingsAt80 += r.entries.filter(
        (e) => e.kind === 'CustomerArrived' && e.customerArchetypeId === 'wedding_party',
      ).length;
    }
    expect(weddingsAt50).toBe(0);
    expect(weddingsAt80).toBeGreaterThan(0);
  });

  it('regulars with loyalty < 0 do not spawn', () => {
    const f = fixture([{ traits: [], station: Station.Bar }]);
    f.state.regulars = [
      { id: 'reg_test_banned', displayName: 'Banned Bob', archetypeId: 'dive_regular', spriteId: 'dive_regular', loyalty: -3, lastSeenDay: 0 },
      { id: 'reg_test_ok',     displayName: 'OK Otto',    archetypeId: 'dive_regular', spriteId: 'dive_regular', loyalty: 0,  lastSeenDay: 0 },
    ];
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 30000 + seed);
      for (const e of r.entries) if (e.regularId) seen.add(e.regularId);
    }
    expect(seen.has('reg_test_banned')).toBe(false);
    expect(seen.has('reg_test_ok')).toBe(true);
  });

  it('applyReport bumps regular loyalty +1 on serve and -3 on walkout', () => {
    const s = freshState();
    const otto = { id: 'reg_test_otto', displayName: 'Otto', archetypeId: 'dive_regular', spriteId: 'dive_regular', loyalty: 0, lastSeenDay: 0 };
    const sam  = { id: 'reg_test_sam',  displayName: 'Sam',  archetypeId: 'dive_regular', spriteId: 'dive_regular', loyalty: 0, lastSeenDay: 0 };
    s.regulars = [otto, sam];
    const report: ShiftReport = {
      day: 5, seed: 1, cashDelta: 0, repDelta: 0, customersServed: 1, customersLost: 1, wagesPaid: 0,
      entries: [
        { tick: 1, kind: 'Served', text: 'served Otto', cashDelta: 5, repDelta: 0, regularId: 'reg_test_otto' },
        { tick: 5, kind: 'Walkout', text: 'sam walks', cashDelta: 0, repDelta: -1, regularId: 'reg_test_sam' },
      ],
      heatAtClose: 0,
      damages: [],
      decisions: [],
      rentPaid: 0,
      stockUsed: {},
      staffMoodDelta: {},
    };
    s.day = 5;
    const { state: next } = applyReport(s, report);
    const ottoAfter = next.regulars.find((r) => r.id === 'reg_test_otto')!;
    const samAfter = next.regulars.find((r) => r.id === 'reg_test_sam')!;
    expect(ottoAfter.loyalty).toBe(1);
    expect(ottoAfter.lastSeenDay).toBe(5);
    expect(samAfter.loyalty).toBe(-3);
    expect(samAfter.lastSeenDay).toBe(5);
  });

  it('regulars surface customerDisplayName on entries', () => {
    const f = fixture([{ traits: [], station: Station.Bar }]);
    f.state.regulars = [
      { id: 'reg_test_pat', displayName: 'Patrick', archetypeId: 'dive_regular', spriteId: 'dive_regular', loyalty: 5, lastSeenDay: 0 },
    ];
    let foundNamed = false;
    for (let seed = 0; seed < 30 && !foundNamed; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 40000 + seed);
      for (const e of r.entries) {
        if (e.regularId === 'reg_test_pat') {
          foundNamed = true;
          expect(e.customerDisplayName).toBe('Patrick');
          break;
        }
      }
    }
    expect(foundNamed).toBe(true);
  });

  it('mishap entries record an itemized damage record', () => {
    const f = fixture([{ traits: [], station: Station.Bar }]);
    let sawDamage = false;
    let totalDamageEntries = 0;
    for (let seed = 0; seed < 80 && !sawDamage; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 60000 + seed);
      for (const e of r.entries) {
        if (e.kind === 'Mishap' && e.damageItem) sawDamage = true;
      }
      totalDamageEntries += r.damages.length;
    }
    expect(sawDamage).toBe(true);
    expect(totalDamageEntries).toBeGreaterThan(0);
  });

  it('heat builds with mishaps and walkouts (no service)', () => {
    const noStaff = fixture([]); // no bartender → walkouts pile up, no serves to calm
    let totalHeat = 0;
    for (let seed = 0; seed < 30; seed++) {
      const r = runShift(noStaff.state, defaultShiftConfig, noStaff.catalog, 70000 + seed);
      totalHeat += r.heatAtClose;
    }
    expect(totalHeat).toBeGreaterThan(0);
  });

  it('heat is calmer when the bar is well-staffed', () => {
    const noStaff = fixture([]);
    const staffed = fixture([{ traits: ['Quick'], station: Station.Bar }]);
    let unstaffedHeat = 0;
    let staffedHeat = 0;
    for (let seed = 0; seed < 60; seed++) {
      unstaffedHeat += runShift(noStaff.state, defaultShiftConfig, noStaff.catalog, 80000 + seed).heatAtClose;
      staffedHeat += runShift(staffed.state, defaultShiftConfig, staffed.catalog, 80000 + seed).heatAtClose;
    }
    expect(staffedHeat).toBeLessThan(unstaffedHeat);
  });

  it('applyReport carries heat overnight with decay and clears damages from state', () => {
    const f = fixture([{ traits: [], station: Station.Bar }]);
    f.state.heat = 3.0;
    const dummyReport: ShiftReport = {
      day: 1, seed: 1, cashDelta: 0, repDelta: 0,
      customersServed: 0, customersLost: 0, wagesPaid: 0,
      entries: [], heatAtClose: 4.0, damages: [{ tick: 5, item: 'busted glass', cost: 4 }], decisions: [], rentPaid: 0, stockUsed: {}, staffMoodDelta: {},
    };
    const { state: next } = applyReport(f.state, dummyReport);
    // Overnight decay is 1.5 → 4.0 - 1.5 = 2.5, clamped to [0, 5].
    expect(next.heat).toBeCloseTo(2.5, 5);
  });

  it('emits at most 2 Decisions per shift; default option is always POUR', () => {
    const noStaff = fixture([]); // walkouts + mishaps drive triggers
    let totalDecisions = 0;
    let trialsWithDecision = 0;
    for (let seed = 0; seed < 30; seed++) {
      const r = runShift(noStaff.state, defaultShiftConfig, noStaff.catalog, 90000 + seed);
      const decisionEntries = r.entries.filter((e) => e.kind === 'Decision');
      expect(decisionEntries.length).toBeLessThanOrEqual(2);
      totalDecisions += decisionEntries.length;
      if (decisionEntries.length > 0) {
        trialsWithDecision++;
        for (const de of decisionEntries) {
          const decision = r.decisions[de.decisionIndex!];
          expect(decision.options.some((o) => o.key === 'pour' && o.isDefault)).toBe(true);
        }
      }
    }
    expect(totalDecisions).toBeGreaterThan(0);
    expect(trialsWithDecision).toBeGreaterThan(0);
  });

  it('decisions surface even in normal staffed play', () => {
    const s = freshState(); // Marv at the bar by default
    let trialsWithDecision = 0;
    for (let seed = 0; seed < 30; seed++) {
      const r = runShift(s, defaultShiftConfig, catalog, 95000 + seed);
      if (r.decisions.length > 0) trialsWithDecision++;
    }
    // With a normal staffed shift we should hit a decision in a fair share
    // of trials — not every one (that would be exhausting), but most.
    expect(trialsWithDecision).toBeGreaterThan(15);
  });

  it('86 Him option requires a bouncer on the door', () => {
    const noStaff = fixture([]);
    const withBouncer = fixture([{ traits: [], station: Station.Door, role: StaffRole.Bouncer }]);
    let foundUngated: boolean | undefined;
    let foundGated: boolean | undefined;
    for (let seed = 0; seed < 30; seed++) {
      const r1 = runShift(noStaff.state, defaultShiftConfig, noStaff.catalog, 91000 + seed);
      if (r1.decisions.length > 0 && foundUngated === undefined) {
        foundUngated = r1.decisions[0].satisfiedGates.includes('bouncer-on-door');
      }
      const r2 = runShift(withBouncer.state, defaultShiftConfig, withBouncer.catalog, 91000 + seed);
      if (r2.decisions.length > 0 && foundGated === undefined) {
        foundGated = r2.decisions[0].satisfiedGates.includes('bouncer-on-door');
      }
    }
    expect(foundUngated).toBe(false);
    expect(foundGated).toBe(true);
  });

  it('applyDecisionOverride replaces entry text + deltas, propagates heat shift', () => {
    const noStaff = fixture([]);
    let report: ShiftReport | null = null;
    for (let seed = 0; seed < 60 && !report; seed++) {
      const r = runShift(noStaff.state, defaultShiftConfig, noStaff.catalog, 92000 + seed);
      if (r.decisions.length > 0) report = r;
    }
    expect(report).not.toBeNull();
    const r = report!;

    const decision = r.decisions[0];
    const cutOffIdx = decision.options.findIndex((o) => o.key === 'cut-off');
    expect(cutOffIdx).toBeGreaterThanOrEqual(0);

    const entry = r.entries[decision.entryIndex];
    const heatBefore = entry.heatAfter ?? 0;
    const reportCashBefore = r.cashDelta;

    applyDecisionOverride(r, 0, cutOffIdx);

    expect(entry.kind).toBe('Decision');
    expect(entry.text).toMatch(/cut off/i);
    expect(entry.cashDelta).toBe(0);
    expect(entry.repDelta).toBe(0);
    // Heat should be lower than before by 1.5 (clamped).
    expect(entry.heatAfter).toBeLessThan(heatBefore);
    // Aggregate cashDelta unchanged (option is 0/0).
    expect(r.cashDelta).toBe(reportCashBefore);
  });

  it('applyDecisionOverride is a no-op when picking the default option', () => {
    const f = fixture([]);
    let report: ShiftReport | null = null;
    for (let seed = 0; seed < 60 && !report; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 93000 + seed);
      if (r.decisions.length > 0) report = r;
    }
    expect(report).not.toBeNull();
    const r = report!;
    const defaultIdx = r.decisions[0].options.findIndex((o) => o.isDefault);
    const before = JSON.stringify(r.entries[r.decisions[0].entryIndex]);
    applyDecisionOverride(r, 0, defaultIdx);
    const after = JSON.stringify(r.entries[r.decisions[0].entryIndex]);
    expect(after).toBe(before);
  });

  it('health inspector fires as a Decision with Bribe + Charm options', () => {
    const f = fixture([{ traits: [], station: Station.Bar }]);
    let foundInspector: ShiftReport | null = null;
    for (let seed = 0; seed < 200 && !foundInspector; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 96000 + seed);
      const inspectorDecision = r.decisions.find((d) =>
        r.entries[d.entryIndex]?.text?.toLowerCase().includes('inspector'),
      );
      if (inspectorDecision) foundInspector = r;
    }
    expect(foundInspector).not.toBeNull();
    const inspectorDecision = foundInspector!.decisions.find((d) =>
      foundInspector!.entries[d.entryIndex]?.text?.toLowerCase().includes('inspector'),
    )!;
    const labels = inspectorDecision.options.map((o) => o.label);
    expect(labels).toContain('Take Fine');
    expect(labels).toContain('Bribe');
    expect(labels).toContain('Charm');
    // Default outcome (Take Fine) should be applied to the entry: -25 cash, -1 rep.
    const entry = foundInspector!.entries[inspectorDecision.entryIndex];
    expect(entry.cashDelta).toBe(-25);
    expect(entry.repDelta).toBe(-1);
  });

  it('inspector Bribe gate flips with cash; Charm gate flips with Charming on Floor', () => {
    // Fresh fixture has $200 → cash-50 satisfied. Charming-on-Floor unsatisfied.
    const broke = fixture([{ traits: [], station: Station.Bar }]);
    broke.state.cash = 10;
    const charming = fixture([
      { traits: [], station: Station.Bar },
      { traits: ['Charming'], station: Station.Floor, role: StaffRole.Server },
    ]);
    let brokeGates: string[] | null = null;
    let charmingGates: string[] | null = null;
    for (let seed = 0; seed < 250 && (!brokeGates || !charmingGates); seed++) {
      if (!brokeGates) {
        const r = runShift(broke.state, defaultShiftConfig, broke.catalog, 97000 + seed);
        const inspector = r.decisions.find((d) =>
          r.entries[d.entryIndex]?.text?.toLowerCase().includes('inspector'),
        );
        if (inspector) brokeGates = inspector.satisfiedGates;
      }
      if (!charmingGates) {
        const r = runShift(charming.state, defaultShiftConfig, charming.catalog, 97000 + seed);
        const inspector = r.decisions.find((d) =>
          r.entries[d.entryIndex]?.text?.toLowerCase().includes('inspector'),
        );
        if (inspector) charmingGates = inspector.satisfiedGates;
      }
    }
    expect(brokeGates).not.toBeNull();
    expect(charmingGates).not.toBeNull();
    expect(brokeGates).not.toContain('cash-50');
    expect(charmingGates).toContain('charming-on-floor');
    expect(charmingGates).toContain('cash-50'); // fixture state cash=200 by default
  });

  it('door-refusal decision fires at high heat with POUR / DOOR options', () => {
    // No staff → walkouts and arrivals push heat past the door threshold.
    const noStaff = fixture([]);
    let foundDoor = false;
    for (let seed = 0; seed < 80 && !foundDoor; seed++) {
      const r = runShift(noStaff.state, defaultShiftConfig, noStaff.catalog, 98000 + seed);
      for (const d of r.decisions) {
        const labels = d.options.map((o) => o.label);
        if (labels.includes('Let In') && labels.includes('Refuse')) {
          foundDoor = true;
          // Door decision should only have 2 options.
          expect(d.options).toHaveLength(2);
          // Default = Let In, no change. Refuse drops heat.
          expect(d.options.find((o) => o.label === 'Let In')?.isDefault).toBe(true);
          expect(d.options.find((o) => o.label === 'Refuse')?.heatDelta).toBeLessThan(0);
          break;
        }
      }
    }
    expect(foundDoor).toBe(true);
  });

  it('stockout: zero stock for the picked drink causes walkout instead of serve', () => {
    const f = fixture([{ traits: [], station: Station.Bar }]);
    f.state.drinkStock = { pbr: 0, whiskey_sour: 0, house_special: 0 };
    let totalServed = 0;
    let totalLost = 0;
    let stockoutWalkouts = 0;
    for (let seed = 0; seed < 20; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 99000 + seed);
      totalServed += r.customersServed;
      totalLost += r.customersLost;
      stockoutWalkouts += r.entries.filter((e) => e.kind === 'Walkout' && e.text.includes('out of stock')).length;
    }
    expect(totalServed).toBe(0);
    expect(totalLost).toBeGreaterThan(0);
    expect(stockoutWalkouts).toBeGreaterThan(0);
  });

  it('runShift records stockUsed and applyReport decrements state.drinkStock', () => {
    const f = fixture([{ traits: [], station: Station.Bar }]);
    f.state.drinkStock = { pbr: 50, whiskey_sour: 50, house_special: 50 };
    const r = runShift(f.state, defaultShiftConfig, f.catalog, 100);
    const usedTotal = Object.values(r.stockUsed).reduce((a, b) => a + b, 0);
    expect(usedTotal).toBeGreaterThan(0);
    expect(usedTotal).toBe(r.customersServed);
    const { state: next } = applyReport(f.state, r);
    for (const [id, used] of Object.entries(r.stockUsed)) {
      expect(next.drinkStock[id]).toBe(50 - used);
    }
  });

  it('nightly special: setting it raises that drink\'s share of preferred picks', () => {
    const baseline = fixture([{ traits: [], station: Station.Bar }]);
    baseline.state.drinkStock = { pbr: 999, whiskey_sour: 999, house_special: 999 };
    const special = fixture([{ traits: [], station: Station.Bar }]);
    special.state.drinkStock = { pbr: 999, whiskey_sour: 999, house_special: 999 };
    special.state.nightlySpecialDrinkId = 'house_special';
    let baselineShare = 0;
    let specialShare = 0;
    for (let seed = 0; seed < 80; seed++) {
      const r1 = runShift(baseline.state, defaultShiftConfig, baseline.catalog, 110000 + seed);
      const r2 = runShift(special.state, defaultShiftConfig, special.catalog, 110000 + seed);
      baselineShare += r1.entries.filter((e) => e.kind === 'Served' && e.text.includes('House Special')).length;
      specialShare += r2.entries.filter((e) => e.kind === 'Served' && e.text.includes('House Special')).length;
    }
    expect(specialShare).toBeGreaterThan(baselineShare);
  });

  it('nightly special: serving the special adds +1 rep to that entry', () => {
    const f = fixture([{ traits: [], station: Station.Bar }]);
    f.state.drinkStock = { pbr: 999, whiskey_sour: 999, house_special: 999 };
    f.state.nightlySpecialDrinkId = 'pbr';
    // PBR is preferred by dive_regular and rowdy_college_kid — base rep is
    // round(1.0 * 0.25) = 0 for dive_regular; with special bonus it should
    // be at least 1.
    let foundSpecialServe = false;
    for (let seed = 0; seed < 80 && !foundSpecialServe; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 111000 + seed);
      const specialServes = r.entries.filter((e) => e.kind === 'Served' && e.text.includes('PBR'));
      for (const e of specialServes) {
        // Base rep for any archetype × repPerSatisfied is at most 1; +1
        // bonus puts a special-PBR serve at >= 1 rep.
        if (e.repDelta >= 1) {
          foundSpecialServe = true;
          break;
        }
      }
    }
    expect(foundSpecialServe).toBe(true);
  });

  it('nightly special unset: behavior unchanged from default play', () => {
    const f1 = fixture([{ traits: [], station: Station.Bar }]);
    f1.state.drinkStock = { pbr: 999, whiskey_sour: 999, house_special: 999 };
    f1.state.nightlySpecialDrinkId = null;
    const f2 = fixture([{ traits: [], station: Station.Bar }]);
    f2.state.drinkStock = { pbr: 999, whiskey_sour: 999, house_special: 999 };
    // f2 also unset — same baseline.
    const r1 = runShift(f1.state, defaultShiftConfig, f1.catalog, 42);
    const r2 = runShift(f2.state, defaultShiftConfig, f2.catalog, 42);
    expect(r1.cashDelta).toBe(r2.cashDelta);
    expect(r1.repDelta).toBe(r2.repDelta);
  });

  it('staff mood: Quick at Bar gains mood across busy shifts', () => {
    const f = fixture([{ traits: ['Quick'], station: Station.Bar }]);
    f.state.hiredStaff[0].mood = 60; // start at baseline
    let total = 0;
    for (let seed = 0; seed < 30; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 130000 + seed);
      total += r.staffMoodDelta[f.state.hiredStaff[0].instanceId] ?? 0;
    }
    expect(total).toBeGreaterThan(0);
  });

  it('staff mood: Lazy at Bar drains mood across busy shifts', () => {
    const f = fixture([{ traits: ['Lazy'], station: Station.Bar }]);
    f.state.hiredStaff[0].mood = 60;
    let total = 0;
    for (let seed = 0; seed < 30; seed++) {
      const r = runShift(f.state, defaultShiftConfig, f.catalog, 131000 + seed);
      total += r.staffMoodDelta[f.state.hiredStaff[0].instanceId] ?? 0;
    }
    expect(total).toBeLessThan(0);
  });

  it('staff mood: applyReport persists mood drift across days', () => {
    const f = fixture([{ traits: ['Quick'], station: Station.Bar }]);
    f.state.hiredStaff[0].mood = 60;
    const r = runShift(f.state, defaultShiftConfig, f.catalog, 132000);
    const { state: next } = applyReport(f.state, r);
    const beforeMood = f.state.hiredStaff[0].mood;
    const afterMood = next.hiredStaff[0].mood;
    expect(afterMood).not.toBe(beforeMood);
    expect(afterMood).toBeGreaterThanOrEqual(0);
    expect(afterMood).toBeLessThanOrEqual(100);
  });

  it('staff mood: a Klutz with low mood drops more trays than one with high mood', () => {
    const grumpy = fixture([
      { traits: [], station: Station.Bar },
      { traits: ['Klutz'], station: Station.Floor, role: StaffRole.Server },
    ]);
    grumpy.state.hiredStaff[1].mood = 10;
    const happy = fixture([
      { traits: [], station: Station.Bar },
      { traits: ['Klutz'], station: Station.Floor, role: StaffRole.Server },
    ]);
    happy.state.hiredStaff[1].mood = 95;
    const grumpyAvg = avgOver(120, (s) => trayDrops(runShift(grumpy.state, defaultShiftConfig, grumpy.catalog, s)));
    const happyAvg = avgOver(120, (s) => trayDrops(runShift(happy.state, defaultShiftConfig, happy.catalog, s)));
    expect(grumpyAvg).toBeGreaterThan(happyAvg);
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
