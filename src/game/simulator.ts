import { Rng } from './rng';
import {
  Station,
  type CustomerArchetype,
  type Drink,
  type GameCatalog,
  type GameState,
  type ShiftConfig,
  type ShiftEntry,
  type ShiftReport,
} from './types';

interface WaitingCustomer {
  archetype: CustomerArchetype;
  patienceLeft: number;
}

interface StationSummary {
  barStaff: number;
  floorStaff: number;
  doorStaff: number;
  barSpeed: number;
  floorCharm: number;
}

function summarizeStations(state: GameState, catalog: GameCatalog): StationSummary {
  const s: StationSummary = { barStaff: 0, floorStaff: 0, doorStaff: 0, barSpeed: 0, floorCharm: 0 };
  for (const a of state.assignments) {
    const hired = state.hiredStaff.find((h) => h.instanceId === a.staffInstanceId);
    if (!hired) continue;
    const arch = catalog.staffArchetypes.find((x) => x.id === hired.archetypeId);
    switch (a.station) {
      case Station.Bar:
        s.barStaff++;
        s.barSpeed += arch?.speed ?? 0.4;
        break;
      case Station.Floor:
        s.floorStaff++;
        s.floorCharm += arch?.charm ?? 0.4;
        break;
      case Station.Door:
        s.doorStaff++;
        break;
    }
  }
  return s;
}

function pickDrinkForCustomer(arch: CustomerArchetype, catalog: GameCatalog, rng: Rng): Drink | null {
  if (arch.preferredDrinkIds.length > 0) {
    const id = rng.pick(arch.preferredDrinkIds);
    const d = catalog.drinks.find((x) => x.id === id);
    if (d) return d;
  }
  return catalog.drinks.length > 0 ? rng.pick(catalog.drinks) : null;
}

function resolvePrice(drink: Drink | null, state: GameState): number {
  if (!drink) return 5;
  const ovr = state.drinkPrices.find((p) => p.drinkId === drink.id);
  return ovr && ovr.price > 0 ? ovr.price : drink.suggestedPrice;
}

function addEntry(report: ShiftReport, entry: ShiftEntry) {
  report.entries.push(entry);
  report.cashDelta += entry.cashDelta;
  report.repDelta += entry.repDelta;
}

/**
 * Pure function. Same (state, seed) always produces the same report.
 * The caller (GameManager / App) is responsible for applying the report
 * to the persisted GameState.
 */
export function runShift(
  state: GameState,
  config: ShiftConfig,
  catalog: GameCatalog,
  seed: number,
): ShiftReport {
  const report: ShiftReport = {
    day: state.day,
    seed,
    cashDelta: 0,
    repDelta: 0,
    customersServed: 0,
    customersLost: 0,
    wagesPaid: 0,
    entries: [],
  };

  const rng = new Rng(seed);
  const stations = summarizeStations(state, catalog);

  // Aggregate upgrade modifiers
  let spawnMult = config.spawnRateScale;
  let passiveTipBonus = 0;
  let passiveRep = 0;
  for (const upId of state.ownedUpgradeIds) {
    const up = catalog.upgrades.find((u) => u.id === upId);
    if (!up) continue;
    spawnMult *= up.spawnRateMultiplier;
    passiveTipBonus += up.tipBonus;
    passiveRep += up.repPerShift;
  }
  if (passiveRep !== 0) {
    addEntry(report, {
      tick: 0,
      kind: 'Note',
      text: `Atmosphere boost: +${passiveRep} rep`,
      cashDelta: 0,
      repDelta: passiveRep,
    });
  }

  const waiting: WaitingCustomer[] = [];

  for (let tick = 1; tick <= config.tickCount; tick++) {
    // 1. Spawn customers
    for (const arch of catalog.customerArchetypes) {
      if (rng.next() < arch.spawnWeight * spawnMult) {
        waiting.push({ archetype: arch, patienceLeft: arch.patienceTicks });
        addEntry(report, {
          tick,
          kind: 'CustomerArrived',
          text: `${arch.displayName} walks in.`,
          cashDelta: 0,
          repDelta: 0,
          customerArchetypeId: arch.id,
        });
      }
    }

    // 2. Service capacity for this tick
    let capacity = stations.barStaff + (stations.floorStaff > 0 ? 1 : 0);
    if (stations.barStaff > 0) {
      const speedBonus = stations.barSpeed / Math.max(1, stations.barStaff);
      if (rng.next() < speedBonus * 0.5) capacity += 1;
    }

    // 3. Serve waiting customers
    while (capacity > 0 && waiting.length > 0) {
      const c = waiting.shift()!;
      capacity--;

      const drink = pickDrinkForCustomer(c.archetype, catalog, rng);
      const price = resolvePrice(drink, state);
      const cost = drink?.costToMake ?? 2;
      const baseTip = Math.round(price * c.archetype.tipMultiplier);
      const charmFactor =
        stations.floorStaff > 0
          ? Math.min(1.5, 1 + stations.floorCharm / Math.max(1, stations.floorStaff))
          : 1;
      const tip = Math.round((baseTip + passiveTipBonus) * charmFactor);

      const net = price - cost + tip + config.atmosphereCashPerCustomer;
      const rep = Math.round(c.archetype.repInfluence * config.repPerSatisfied);

      report.customersServed++;
      addEntry(report, {
        tick,
        kind: 'Served',
        text: drink
          ? `Served ${c.archetype.displayName} a ${drink.displayName} (+$${net}, tip $${tip})`
          : `Served ${c.archetype.displayName} (+$${net})`,
        cashDelta: net,
        repDelta: rep,
        customerArchetypeId: c.archetype.id,
      });

      // Mishap roll on served customer
      if (rng.next() < c.archetype.mishapChance) {
        const mishapCost = -rng.intBetween(2, 8);
        addEntry(report, {
          tick,
          kind: 'Mishap',
          text: `${c.archetype.displayName} causes a small scene.`,
          cashDelta: mishapCost,
          repDelta: -1,
          customerArchetypeId: c.archetype.id,
        });
      }
    }

    // 4. Tick down patience for unserved customers
    for (let i = waiting.length - 1; i >= 0; i--) {
      waiting[i].patienceLeft--;
      if (waiting[i].patienceLeft <= 0) {
        const lost = waiting[i];
        waiting.splice(i, 1);
        report.customersLost++;
        const repHit = -Math.ceil(config.repPerWalkout);
        addEntry(report, {
          tick,
          kind: 'Walkout',
          text: `${lost.archetype.displayName} gets tired of waiting and leaves.`,
          cashDelta: 0,
          repDelta: repHit,
          customerArchetypeId: lost.archetype.id,
        });
      }
    }

    // 5. Random event roll (one event per tick max)
    for (const ev of catalog.events) {
      if (state.reputation < (ev.minReputation ?? 0)) continue;
      if (ev.requiresUpgradeId && !state.ownedUpgradeIds.includes(ev.requiresUpgradeId)) continue;
      if (ev.requiresNotUpgradeId && state.ownedUpgradeIds.includes(ev.requiresNotUpgradeId)) continue;

      if (rng.next() < ev.perTickChance) {
        let cd = ev.cashDelta;
        let rd = ev.repDelta;
        let narrative = ev.narrative;
        if (ev.tone === 'Crisis' && stations.doorStaff > 0) {
          cd = Math.round(cd / 2);
          rd = Math.round(rd / 2);
          narrative = `${ev.displayName} — bouncer steps in, defuses it.`;
        }
        addEntry(report, {
          tick,
          kind: 'Event',
          text: narrative,
          cashDelta: cd,
          repDelta: rd,
        });
        break;
      }
    }
  }

  // Anyone left waiting at close walks out.
  for (const c of waiting) {
    report.customersLost++;
    addEntry(report, {
      tick: config.tickCount,
      kind: 'Walkout',
      text: `${c.archetype.displayName} doesn't get served before close.`,
      cashDelta: 0,
      repDelta: -1,
      customerArchetypeId: c.archetype.id,
    });
  }

  return report;
}

/**
 * Apply a report to a GameState immutably and return the updated state +
 * the report annotated with wagesPaid.
 */
export function applyReport(state: GameState, report: ShiftReport): { state: GameState; report: ShiftReport } {
  const wages = state.hiredStaff.reduce((sum, h) => sum + h.wagePerDay, 0);
  const annotated: ShiftReport = { ...report, wagesPaid: wages };
  const newState: GameState = {
    ...state,
    cash: state.cash + report.cashDelta - wages,
    reputation: Math.max(0, Math.min(100, state.reputation + report.repDelta)),
  };
  return { state: newState, report: annotated };
}
