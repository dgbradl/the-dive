import { Rng } from './rng';
import {
  Station,
  type CustomerArchetype,
  type Drink,
  type GameCatalog,
  type GameState,
  type HiredStaff,
  type ShiftConfig,
  type ShiftEntry,
  type ShiftPhase,
  type ShiftReport,
  type StaffArchetype,
  type StaffTrait,
} from './types';

function phaseForTick(tick: number, tickCount: number): ShiftPhase {
  const earlyEnd = Math.max(1, Math.floor(tickCount * 0.3));
  const primeEnd = Math.max(earlyEnd + 1, Math.floor(tickCount * 0.7));
  if (tick <= earlyEnd) return 'Early';
  if (tick <= primeEnd) return 'Prime';
  return 'LastCall';
}

function phaseMultiplier(arch: CustomerArchetype, phase: ShiftPhase): number {
  const m = arch.phaseSpawnMultiplier;
  if (!m) return 1;
  switch (phase) {
    case 'Early': return m.early ?? 1;
    case 'Prime': return m.prime ?? 1;
    case 'LastCall': return m.lastCall ?? 1;
  }
}

// Trait magnitudes — tunable in one place.
const TRAIT = {
  // Bar-only.
  quickCapacityChance: 0.25,   // per Quick at bar, per tick: chance of +1 capacity
  // Floor-only.
  klutzTrayChance: 0.08,       // per Klutz on floor, per serve: chance of a tray drop
  // Customer-facing (bar + floor).
  charmingTipMult: 1.30,       // per Charming
  surlyTipMult: 0.70,          // per Surly
  chattyPatienceBonus: 1,      // per Chatty
  chattyPatienceCap: 3,        // total max bonus across all Chatty
  // Door-only.
  doorCharmDefuseChance: 0.6,  // per Charming on door: chance to fully defuse a Crisis
};

interface WaitingCustomer {
  archetype: CustomerArchetype;
  patienceLeft: number;
}

interface OnShift {
  hired: HiredStaff;
  archetype: StaffArchetype;
}

interface StationSummary {
  bar: OnShift[];
  floor: OnShift[];
  door: OnShift[];
}

function summarizeStations(state: GameState, catalog: GameCatalog): StationSummary {
  const out: StationSummary = { bar: [], floor: [], door: [] };
  for (const a of state.assignments) {
    const hired = state.hiredStaff.find((h) => h.instanceId === a.staffInstanceId);
    if (!hired) continue;
    const archetype = catalog.staffArchetypes.find((x) => x.id === hired.archetypeId);
    if (!archetype) continue;
    const ref: OnShift = { hired, archetype };
    switch (a.station) {
      case Station.Bar: out.bar.push(ref); break;
      case Station.Floor: out.floor.push(ref); break;
      case Station.Door: out.door.push(ref); break;
    }
  }
  return out;
}

function withTrait(staff: OnShift[], trait: StaffTrait): OnShift[] {
  return staff.filter((s) => s.archetype.traits.includes(trait));
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
 * The caller (App) is responsible for applying the report to the
 * persisted GameState.
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

  const barCount = stations.bar.length;
  const floorCount = stations.floor.length;
  const doorCount = stations.door.length;
  const barSpeed = stations.bar.reduce((sum, s) => sum + s.archetype.speed, 0);
  const floorCharm = stations.floor.reduce((sum, s) => sum + s.archetype.charm, 0);

  // Customer-facing stations are where charm/surl/chat traits fire.
  const customerFacing: OnShift[] = [...stations.bar, ...stations.floor];
  const charmingCount = withTrait(customerFacing, 'Charming').length;
  const surlyCount = withTrait(customerFacing, 'Surly').length;
  const chattyCount = withTrait(customerFacing, 'Chatty').length;
  const patienceBonus = Math.min(chattyCount * TRAIT.chattyPatienceBonus, TRAIT.chattyPatienceCap);

  // Bar-only.
  const quickAtBar = withTrait(stations.bar, 'Quick');
  const lazyAtBar = withTrait(stations.bar, 'Lazy');
  // Floor-only.
  const klutzAtFloor = withTrait(stations.floor, 'Klutz');
  // Door.
  const charmingAtDoor = withTrait(stations.door, 'Charming').length;

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

  // Schedule Lazy "smoke break" ticks at shift start — one per Lazy at bar.
  const lazyTicks = new Map<number, OnShift>();
  for (const lazy of lazyAtBar) {
    const t = rng.intBetween(2, Math.max(2, config.tickCount - 1));
    if (!lazyTicks.has(t)) lazyTicks.set(t, lazy);
  }

  const waiting: WaitingCustomer[] = [];

  let prevPhase: ShiftPhase | null = null;
  for (let tick = 1; tick <= config.tickCount; tick++) {
    const phase = phaseForTick(tick, config.tickCount);
    if (phase !== prevPhase) {
      const text =
        phase === 'Early'
          ? 'Early shift — the regulars trickle in.'
          : phase === 'Prime'
            ? 'Prime time. The bar fills up.'
            : 'Last call. The night gets rowdy.';
      addEntry(report, { tick, kind: 'Note', text, cashDelta: 0, repDelta: 0, phase });
      prevPhase = phase;
    }

    // 1. Spawn customers (Chatty extends patience)
    for (const arch of catalog.customerArchetypes) {
      if (state.reputation < (arch.minReputation ?? 0)) continue;
      const phaseMult = phaseMultiplier(arch, phase);
      if (rng.next() < arch.spawnWeight * spawnMult * phaseMult) {
        waiting.push({ archetype: arch, patienceLeft: arch.patienceTicks + patienceBonus });
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
    let capacity = barCount + (floorCount > 0 ? 1 : 0);
    if (barCount > 0) {
      const speedBonus = barSpeed / Math.max(1, barCount);
      if (rng.next() < speedBonus * 0.5) capacity += 1;
    }
    // Quick: per-tick chance of +1 capacity per Quick at bar.
    for (let i = 0; i < quickAtBar.length; i++) {
      if (rng.next() < TRAIT.quickCapacityChance) capacity += 1;
    }
    // Lazy: scheduled smoke break this tick.
    const lazyThisTick = lazyTicks.get(tick);
    if (lazyThisTick) {
      capacity = Math.max(0, capacity - 1);
      addEntry(report, {
        tick,
        kind: 'Note',
        text: `${lazyThisTick.hired.displayName} ducks out for a smoke. Service stalls.`,
        cashDelta: 0,
        repDelta: 0,
        staffInstanceId: lazyThisTick.hired.instanceId,
      });
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
        floorCount > 0
          ? Math.min(1.5, 1 + floorCharm / Math.max(1, floorCount))
          : 1;
      // Trait modifiers stack multiplicatively: each Charming +10%, each Surly -30%.
      const tipMult =
        charmFactor *
        Math.pow(TRAIT.charmingTipMult, charmingCount) *
        Math.pow(TRAIT.surlyTipMult, surlyCount);
      const tip = Math.max(0, Math.round((baseTip + passiveTipBonus) * tipMult));

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

      // Customer-driven mishap roll (existing behavior).
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

      // Klutz: per Klutz on floor, chance to drop a tray after this serve.
      for (const klutz of klutzAtFloor) {
        if (rng.next() < TRAIT.klutzTrayChance) {
          const dropCost = -rng.intBetween(2, 6);
          addEntry(report, {
            tick,
            kind: 'Mishap',
            text: `${klutz.hired.displayName} drops a tray.`,
            cashDelta: dropCost,
            repDelta: 0,
            staffInstanceId: klutz.hired.instanceId,
          });
        }
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
        if (ev.tone === 'Crisis' && doorCount > 0) {
          // Standard bouncer presence halves the impact.
          cd = Math.round(cd / 2);
          rd = Math.round(rd / 2);
          narrative = `${ev.displayName} — bouncer steps in, defuses it.`;
          // Charming on Door: per Charming, chance to fully defuse instead.
          for (let i = 0; i < charmingAtDoor; i++) {
            if (rng.next() < TRAIT.doorCharmDefuseChance) {
              cd = 0;
              rd = 0;
              narrative = `${ev.displayName} — bouncer charms them right back out the door.`;
              break;
            }
          }
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
