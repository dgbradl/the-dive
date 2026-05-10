import { Rng } from './rng';
import {
  Station,
  type CustomerArchetype,
  type DecisionGate,
  type DecisionOption,
  type Drink,
  type GameCatalog,
  type GameState,
  type HiredStaff,
  type PendingDecision,
  type Regular,
  type ShiftConfig,
  type ShiftEntry,
  type ShiftPhase,
  type ShiftReport,
  type StaffArchetype,
  type StaffTrait,
} from './types';

const HEAT_DECISION_THRESHOLD = 2.0;
const DOOR_DECISION_THRESHOLD = 3.5;
const MAX_DECISIONS_PER_SHIFT = 2;
const DECISION_COOLDOWN_TICKS = 5;

/** Chance of using a named regular when one is eligible for the spawning archetype. */
const REGULAR_PICK_CHANCE = 0.6;

/** Heat tuning constants. */
const HEAT = {
  // Per-archetype heat contribution per arrival.
  rowdyArrival: 0.6,
  weddingArrival: 0.4,
  defaultArrival: 0.05,
  // Per Mishap entry.
  perMishap: 0.6,
  // Per Walkout (frustrated customers raise tension).
  perWalkout: 0.2,
  // Per Served (calming effect — bartender keeping it together).
  perServe: -0.08,
  // Passive decay per tick on top of event-driven changes.
  perTickDecay: 0.05,
  // Overnight decay (applied in applyReport).
  overnightDecay: 1.5,
};

/** Items that get damaged in a Mishap. Picked deterministically by rng. */
const DAMAGE_ITEMS = [
  'busted glass',
  'cracked stool',
  'spilled tray',
  'broken bottle',
  'torn upholstery',
];

function clampHeat(h: number): number {
  return Math.max(0, Math.min(5, h));
}

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
  charmingTipBonus: 0.30,      // per Charming: +30% tip when neutral mood
  surlyTipPenalty: 0.30,       // per Surly: -30% tip when neutral mood
  chattyPatienceBonus: 1,      // per Chatty
  chattyPatienceCap: 3,        // total max bonus across all Chatty
  // Door-only.
  doorCharmDefuseChance: 0.6,  // per Charming on door: chance to fully defuse a Crisis
};

/** Mood drift magnitudes — applied in applyReport. */
const MOOD = {
  busyServeQuick: 0.4,    // +mood per serve for Quick at bar
  busyServeLazy: -0.5,    // -mood per serve for Lazy at bar
  walkoutAtStation: -1.5, // every staffer at the affected station gets yelled at
  mishapByStaff: -0.5,    // per mishap a specific staffer caused
  driftToward: 60,        // baseline mood
  passiveDrift: 1,        // pull toward baseline if no events
  perShiftClampMag: 12,   // |total drift| per shift
  highMoodThreshold: 80,
  lowMoodThreshold: 30,
};

/**
 * Returns a multiplier for a trait's magnitude based on the staffer's mood.
 *
 * - Below 30 mood ("rough"):  beneficial traits dampened, harmful traits amplified.
 * - Between 30 and 80 mood:    no change (neutral band).
 * - Above 80 mood ("dialed"):  beneficial traits boosted, harmful traits dampened.
 */
function moodScale(mood: number, kind: 'bonus' | 'penalty'): number {
  if (mood < MOOD.lowMoodThreshold) {
    const t = (MOOD.lowMoodThreshold - mood) / MOOD.lowMoodThreshold; // 0..1
    return kind === 'bonus' ? 1 - 0.5 * t : 1 + 0.5 * t;
  }
  if (mood > MOOD.highMoodThreshold) {
    const t = (mood - MOOD.highMoodThreshold) / 20; // 0..1
    return kind === 'bonus' ? 1 + 0.3 * t : 1 - 0.3 * t;
  }
  return 1;
}

interface WaitingCustomer {
  archetype: CustomerArchetype;
  patienceLeft: number;
  regular?: Regular;
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

/** +20% pick weight if the special is in the customer's preferred list. */
const SPECIAL_PICK_BIAS = 0.20;

function pickDrinkForCustomer(
  arch: CustomerArchetype,
  catalog: GameCatalog,
  rng: Rng,
  specialDrinkId: string | null,
): Drink | null {
  // If the customer prefers tonight's special, bias toward picking it.
  if (
    specialDrinkId &&
    arch.preferredDrinkIds.includes(specialDrinkId) &&
    rng.next() < SPECIAL_PICK_BIAS
  ) {
    const special = catalog.drinks.find((d) => d.id === specialDrinkId);
    if (special) return special;
  }
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
    heatAtClose: 0,
    damages: [],
    decisions: [],
    rentPaid: 0,
    stockUsed: {},
    staffMoodDelta: {},
  };

  // Per-staff mood drift accumulator; pushed onto the report at end of shift.
  const moodDelta = new Map<string, number>();
  const moodTouched = new Set<string>();
  const bumpMood = (instanceId: string, delta: number) => {
    moodDelta.set(instanceId, (moodDelta.get(instanceId) ?? 0) + delta);
    moodTouched.add(instanceId);
  };

  // Local copy of inventory mutated through the shift; report.stockUsed
  // tells applyReport how much to deduct from state.drinkStock.
  const runtimeStock: Record<string, number> = { ...(state.drinkStock ?? {}) };

  let heat = clampHeat(state.heat);
  let lastDecisionTick = -DECISION_COOLDOWN_TICKS;

  /** Push an entry onto the report, stamping it with the current heat reading. */
  const addE = (e: Omit<ShiftEntry, 'heatAfter'>) => {
    addEntry(report, { ...e, heatAfter: heat });
  };

  const computeGates = (): DecisionGate[] => {
    const gates: DecisionGate[] = [];
    if (stations.door.length > 0) gates.push('bouncer-on-door');
    if (withTrait(stations.floor, 'Charming').length > 0) gates.push('charming-on-floor');
    if (state.cash >= 50) gates.push('cash-50');
    return gates;
  };

  type DecisionKind = 'heat' | 'mishap' | 'door';

  const buildDoorDecision = (
    tick: number,
    arrivalName: string,
  ): { entry: Omit<ShiftEntry, 'heatAfter'>; pending: PendingDecision } => {
    const prompt = `${arrivalName} at the door — let them in?`;
    const options: DecisionOption[] = [
      {
        key: 'pour',
        label: 'Let In',
        cashDelta: 0,
        repDelta: 0,
        narrative: `Marv waves ${arrivalName} in. Place keeps cooking.`,
        isDefault: true,
      },
      {
        key: 'door',
        label: 'Refuse',
        cashDelta: 0,
        repDelta: 0,
        heatDelta: -0.8,
        narrative: `Marv shakes his head — ${arrivalName} grumbles back into the night. Heat eases.`,
      },
    ];
    const idx = report.entries.length;
    return {
      entry: {
        tick,
        kind: 'Decision',
        text: `Marv: ${prompt}`,
        cashDelta: 0,
        repDelta: 0,
        decisionIndex: report.decisions.length,
      },
      pending: {
        entryIndex: idx,
        prompt,
        options,
        satisfiedGates: computeGates(),
      },
    };
  };

  const buildDecision = (
    tick: number,
    kind: DecisionKind,
    customerName?: string,
  ): { entry: Omit<ShiftEntry, 'heatAfter'>; pending: PendingDecision } => {
    const gates = computeGates();
    const subject = customerName ?? 'the rowdy';
    const prompt = kind === 'mishap'
      ? `${customerName ?? 'A customer'} is making a scene — what’s the call?`
      : 'Rowdy at the bar — what’s the call?';
    const options: DecisionOption[] = [
      {
        key: 'pour',
        label: 'Pour',
        cashDelta: 0,
        repDelta: 0,
        narrative: kind === 'mishap'
          ? `Marv shrugs it off and keeps pouring. ${subject} settles down on their own.`
          : 'Marv keeps pouring. Watch the rowdy.',
        isDefault: true,
      },
      {
        key: 'cut-off',
        label: 'Cut Off',
        cashDelta: 0,
        repDelta: 0,
        heatDelta: -1.5,
        narrative: `Cut off — ${subject} grumbles, finishes their beer, and leaves.`,
      },
      {
        key: 'eighty-six',
        label: '86 Him',
        requires: 'bouncer-on-door',
        cashDelta: 0,
        repDelta: -1,
        heatDelta: -2,
        narrative: `Bouncer walks ${subject} out — heat drops, room exhales.`,
      },
    ];
    const idx = report.entries.length;
    return {
      entry: {
        tick,
        kind: 'Decision',
        text: `Marv: ${prompt}`,
        cashDelta: 0,
        repDelta: 0,
        decisionIndex: report.decisions.length,
      },
      pending: {
        entryIndex: idx,
        prompt,
        options,
        satisfiedGates: gates,
      },
    };
  };

  const decisionsAvailable = (tick: number): boolean => {
    if (report.decisions.length >= MAX_DECISIONS_PER_SHIFT) return false;
    if (tick - lastDecisionTick < DECISION_COOLDOWN_TICKS) return false;
    return true;
  };

  const maybeEmitHeatDecision = (tick: number, arrivalName?: string) => {
    if (!decisionsAvailable(tick)) return;
    // Higher heat → door-refusal framing wins over the bar-rowdy framing.
    if (heat >= DOOR_DECISION_THRESHOLD && arrivalName) {
      const { entry, pending } = buildDoorDecision(tick, arrivalName);
      addE(entry);
      report.decisions.push(pending);
      lastDecisionTick = tick;
      return;
    }
    if (heat < HEAT_DECISION_THRESHOLD) return;
    const { entry, pending } = buildDecision(tick, 'heat');
    addE(entry);
    report.decisions.push(pending);
    lastDecisionTick = tick;
  };

  const maybeEmitMishapDecision = (tick: number, customerName: string) => {
    if (!decisionsAvailable(tick)) return;
    const { entry, pending } = buildDecision(tick, 'mishap', customerName);
    addE(entry);
    report.decisions.push(pending);
    lastDecisionTick = tick;
  };

  const archetypeHeat = (archetypeId?: string): number => {
    if (archetypeId === 'rowdy_college_kid') return HEAT.rowdyArrival;
    if (archetypeId === 'wedding_party') return HEAT.weddingArrival;
    return HEAT.defaultArrival;
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
  const charmingFacing = withTrait(customerFacing, 'Charming');
  const surlyFacing = withTrait(customerFacing, 'Surly');
  const chattyFacing = withTrait(customerFacing, 'Chatty');

  // Per-staff mood-aware patience bonus, capped across all Chatty.
  const rawPatienceBonus = chattyFacing.reduce(
    (sum, s) => sum + TRAIT.chattyPatienceBonus * moodScale(s.hired.mood, 'bonus'),
    0,
  );
  const patienceBonus = Math.round(Math.min(rawPatienceBonus, TRAIT.chattyPatienceCap));

  // Per-staff mood-aware tip multiplier — each Charming/Surly contributes
  // multiplicatively, with magnitude scaled by their personal mood.
  const moodAwareTipMult = (() => {
    let mult = 1;
    for (const s of charmingFacing) {
      mult *= 1 + TRAIT.charmingTipBonus * moodScale(s.hired.mood, 'bonus');
    }
    for (const s of surlyFacing) {
      mult *= 1 - TRAIT.surlyTipPenalty * moodScale(s.hired.mood, 'penalty');
    }
    return mult;
  })();

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
    addE({
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

  // Per-shift pool of eligible regulars by archetype (loyalty >= 0, not yet spawned).
  const regularPool = new Map<string, Regular[]>();
  for (const reg of state.regulars) {
    if (reg.loyalty < 0) continue;
    const list = regularPool.get(reg.archetypeId) ?? [];
    list.push(reg);
    regularPool.set(reg.archetypeId, list);
  }

  let prevPhase: ShiftPhase | null = null;
  for (let tick = 1; tick <= config.tickCount; tick++) {
    // Passive per-tick heat decay.
    heat = clampHeat(heat - HEAT.perTickDecay);

    const phase = phaseForTick(tick, config.tickCount);
    if (phase !== prevPhase) {
      const text =
        phase === 'Early'
          ? 'Early shift — the regulars trickle in.'
          : phase === 'Prime'
            ? 'Prime time. The bar fills up.'
            : 'Last call. The night gets rowdy.';
      addE({ tick, kind: 'Note', text, cashDelta: 0, repDelta: 0, phase });
      prevPhase = phase;
    }

    // 1. Spawn customers (Chatty extends patience)
    for (const arch of catalog.customerArchetypes) {
      if (state.reputation < (arch.minReputation ?? 0)) continue;
      const phaseMult = phaseMultiplier(arch, phase);
      if (rng.next() < arch.spawnWeight * spawnMult * phaseMult) {
        // Try to pick a named regular of this archetype.
        let regular: Regular | undefined;
        const pool = regularPool.get(arch.id);
        if (pool && pool.length > 0 && rng.next() < REGULAR_PICK_CHANCE) {
          regular = pool.shift();
        }
        waiting.push({ archetype: arch, patienceLeft: arch.patienceTicks + patienceBonus, regular });
        const arrivalName = regular ? regular.displayName : arch.displayName;
        heat = clampHeat(heat + archetypeHeat(arch.id));
        addE({
          tick,
          kind: 'CustomerArrived',
          text: `${arrivalName} walks in.`,
          cashDelta: 0,
          repDelta: 0,
          customerArchetypeId: arch.id,
          regularId: regular?.id,
          customerDisplayName: arrivalName,
        });
        maybeEmitHeatDecision(tick, arrivalName);
      }
    }

    // 2. Service capacity for this tick
    let capacity = barCount + (floorCount > 0 ? 1 : 0);
    if (barCount > 0) {
      const speedBonus = barSpeed / Math.max(1, barCount);
      if (rng.next() < speedBonus * 0.5) capacity += 1;
    }
    // Quick: per-tick chance of +1 capacity per Quick at bar.
    for (const q of quickAtBar) {
      const chance = TRAIT.quickCapacityChance * moodScale(q.hired.mood, 'bonus');
      if (rng.next() < chance) capacity += 1;
    }
    // Lazy: scheduled smoke break this tick.
    const lazyThisTick = lazyTicks.get(tick);
    if (lazyThisTick) {
      capacity = Math.max(0, capacity - 1);
      addE({
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

      const drink = pickDrinkForCustomer(c.archetype, catalog, rng, state.nightlySpecialDrinkId);

      // Stockout? They walk. Cost is already sunk in this morning's case order
      // so nothing else to deduct — but the walkout still hurts rep + heat.
      if (drink && (runtimeStock[drink.id] ?? 0) <= 0) {
        const customerName = c.regular ? c.regular.displayName : c.archetype.displayName;
        report.customersLost++;
        heat = clampHeat(heat + HEAT.perWalkout);
        addE({
          tick,
          kind: 'Walkout',
          text: `${customerName} wanted a ${drink.displayName} — out of stock. Walks.`,
          cashDelta: 0,
          repDelta: -Math.ceil(config.repPerWalkout),
          customerArchetypeId: c.archetype.id,
          regularId: c.regular?.id,
          customerDisplayName: customerName,
        });
        continue;
      }

      if (drink) {
        runtimeStock[drink.id] = (runtimeStock[drink.id] ?? 0) - 1;
        report.stockUsed[drink.id] = (report.stockUsed[drink.id] ?? 0) + 1;
      }

      const price = resolvePrice(drink, state);
      // Inventory cost is paid at morning order time, not per pour.
      const cost = 0;
      const baseTip = Math.round(price * c.archetype.tipMultiplier);
      const charmFactor =
        floorCount > 0
          ? Math.min(1.5, 1 + floorCharm / Math.max(1, floorCount))
          : 1;
      // Trait modifiers stack multiplicatively. Each Charming/Surly's
      // magnitude is scaled by their personal mood (computed above).
      const tipMult = charmFactor * moodAwareTipMult;
      const tip = Math.max(0, Math.round((baseTip + passiveTipBonus) * tipMult));

      const net = price - cost + tip + config.atmosphereCashPerCustomer;
      const baseRep = Math.round(c.archetype.repInfluence * config.repPerSatisfied);
      const isSpecial = drink !== null && drink.id === state.nightlySpecialDrinkId;
      const rep = baseRep + (isSpecial ? 1 : 0);

      const customerName = c.regular ? c.regular.displayName : c.archetype.displayName;
      report.customersServed++;
      heat = clampHeat(heat + HEAT.perServe);
      addE({
        tick,
        kind: 'Served',
        text: drink
          ? `Served ${customerName} a ${drink.displayName} (+$${net}, tip $${tip})`
          : `Served ${customerName} (+$${net})`,
        cashDelta: net,
        repDelta: rep,
        customerArchetypeId: c.archetype.id,
        regularId: c.regular?.id,
        customerDisplayName: customerName,
      });

      // Customer-driven mishap roll (existing behavior).
      if (rng.next() < c.archetype.mishapChance) {
        const mishapCost = -rng.intBetween(2, 8);
        const item = rng.pick(DAMAGE_ITEMS);
        heat = clampHeat(heat + HEAT.perMishap);
        report.damages.push({ tick, item, cost: -mishapCost });
        addE({
          tick,
          kind: 'Mishap',
          text: `${customerName} causes a small scene — ${item}.`,
          cashDelta: mishapCost,
          repDelta: -1,
          customerArchetypeId: c.archetype.id,
          regularId: c.regular?.id,
          customerDisplayName: customerName,
          damageItem: item,
        });
        maybeEmitMishapDecision(tick, customerName);
      }

      // Klutz: per Klutz on floor, chance to drop a tray after this serve.
      for (const klutz of klutzAtFloor) {
        const chance = TRAIT.klutzTrayChance * moodScale(klutz.hired.mood, 'penalty');
        if (rng.next() < chance) {
          const dropCost = -rng.intBetween(2, 6);
          heat = clampHeat(heat + HEAT.perMishap * 0.5);
          report.damages.push({ tick, item: 'spilled tray', cost: -dropCost });
          addE({
            tick,
            kind: 'Mishap',
            text: `${klutz.hired.displayName} drops a tray.`,
            cashDelta: dropCost,
            repDelta: 0,
            staffInstanceId: klutz.hired.instanceId,
            damageItem: 'spilled tray',
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
        const lostName = lost.regular ? lost.regular.displayName : lost.archetype.displayName;
        heat = clampHeat(heat + HEAT.perWalkout);
        addE({
          tick,
          kind: 'Walkout',
          text: `${lostName} gets tired of waiting and leaves.`,
          cashDelta: 0,
          repDelta: repHit,
          customerArchetypeId: lost.archetype.id,
          regularId: lost.regular?.id,
          customerDisplayName: lostName,
        });
      }
    }

    // 5. Random event roll (one event per tick max)
    for (const ev of catalog.events) {
      if (state.reputation < (ev.minReputation ?? 0)) continue;
      if (ev.requiresUpgradeId && !state.ownedUpgradeIds.includes(ev.requiresUpgradeId)) continue;
      if (ev.requiresNotUpgradeId && state.ownedUpgradeIds.includes(ev.requiresNotUpgradeId)) continue;

      if (rng.next() < ev.perTickChance) {
        // Decision-flavored events take over the slot when the player has
        // budget. Otherwise they fall through to the default-option outcome.
        if (ev.decisionOptions && ev.decisionOptions.length > 0 && decisionsAvailable(tick)) {
          const def = ev.decisionOptions.find((o) => o.isDefault) ?? ev.decisionOptions[0];
          const idx = report.entries.length;
          addE({
            tick,
            kind: 'Decision',
            text: `${ev.displayName} — ${def.narrative}`,
            cashDelta: def.cashDelta,
            repDelta: def.repDelta,
            decisionIndex: report.decisions.length,
          });
          if (def.heatDelta) heat = clampHeat(heat + def.heatDelta);
          report.decisions.push({
            entryIndex: idx,
            prompt: ev.decisionPrompt ?? `${ev.displayName} — what's the call?`,
            options: ev.decisionOptions,
            satisfiedGates: computeGates(),
          });
          lastDecisionTick = tick;
          break;
        }

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
        addE({
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
    const closeName = c.regular ? c.regular.displayName : c.archetype.displayName;
    heat = clampHeat(heat + HEAT.perWalkout);
    addE({
      tick: config.tickCount,
      kind: 'Walkout',
      text: `${closeName} doesn't get served before close.`,
      cashDelta: 0,
      repDelta: -1,
      customerArchetypeId: c.archetype.id,
      regularId: c.regular?.id,
      customerDisplayName: closeName,
    });
  }

  report.heatAtClose = heat;

  // ---- Mood drift bookkeeping ----
  // Walk the report once, accumulate per-staff drift.
  const customerFacingIds = [...stations.bar, ...stations.floor].map((s) => s.hired.instanceId);
  const quickBarIds = quickAtBar.map((s) => s.hired.instanceId);
  const lazyBarIds = lazyAtBar.map((s) => s.hired.instanceId);
  for (const e of report.entries) {
    if (e.kind === 'Served') {
      for (const id of quickBarIds) bumpMood(id, MOOD.busyServeQuick);
      for (const id of lazyBarIds) bumpMood(id, MOOD.busyServeLazy);
    } else if (e.kind === 'Walkout') {
      for (const id of customerFacingIds) bumpMood(id, MOOD.walkoutAtStation);
    } else if (e.kind === 'Mishap' && e.staffInstanceId) {
      bumpMood(e.staffInstanceId, MOOD.mishapByStaff);
    }
  }
  // Passive drift toward baseline for staff nothing touched tonight.
  for (const h of state.hiredStaff) {
    if (moodTouched.has(h.instanceId)) continue;
    if (h.mood < MOOD.driftToward) moodDelta.set(h.instanceId, MOOD.passiveDrift);
    else if (h.mood > MOOD.driftToward) moodDelta.set(h.instanceId, -MOOD.passiveDrift);
  }
  // Clamp magnitude of any single shift's drift, write to the report.
  for (const [id, delta] of moodDelta) {
    const clamped = Math.max(-MOOD.perShiftClampMag, Math.min(MOOD.perShiftClampMag, delta));
    if (clamped !== 0) report.staffMoodDelta[id] = clamped;
  }

  return report;
}

/**
 * Apply a report to a GameState immutably and return the updated state +
 * the report annotated with wagesPaid.
 */
export function applyReport(state: GameState, report: ShiftReport): { state: GameState; report: ShiftReport } {
  const wages = state.hiredStaff.reduce((sum, h) => sum + h.wagePerDay, 0);
  const rent = state.rentPerDay;
  const annotated: ShiftReport = { ...report, wagesPaid: wages, rentPaid: rent };

  // Aggregate loyalty deltas + last-seen tracking per regular.
  const loyaltyDelta = new Map<string, number>();
  const seenIds = new Set<string>();
  for (const e of report.entries) {
    if (!e.regularId) continue;
    seenIds.add(e.regularId);
    if (e.kind === 'Served') {
      loyaltyDelta.set(e.regularId, (loyaltyDelta.get(e.regularId) ?? 0) + 1);
    } else if (e.kind === 'Walkout') {
      loyaltyDelta.set(e.regularId, (loyaltyDelta.get(e.regularId) ?? 0) - 3);
    }
  }
  const updatedRegulars = state.regulars.map((r) => {
    const delta = loyaltyDelta.get(r.id) ?? 0;
    const seen = seenIds.has(r.id);
    if (delta === 0 && !seen) return r;
    return {
      ...r,
      loyalty: Math.max(-10, Math.min(10, r.loyalty + delta)),
      lastSeenDay: seen ? state.day : r.lastSeenDay,
    };
  });

  const updatedStock: Record<string, number> = { ...(state.drinkStock ?? {}) };
  for (const [id, used] of Object.entries(report.stockUsed)) {
    updatedStock[id] = Math.max(0, (updatedStock[id] ?? 0) - used);
  }

  // Mood drift per staffer (computed during runShift, stashed on report).
  const updatedStaff = state.hiredStaff.map((h) => {
    const delta = report.staffMoodDelta[h.instanceId] ?? 0;
    if (delta === 0) return h;
    return { ...h, mood: Math.max(0, Math.min(100, Math.round(h.mood + delta))) };
  });

  const newState: GameState = {
    ...state,
    cash: state.cash + report.cashDelta - wages - rent,
    reputation: Math.max(0, Math.min(100, state.reputation + report.repDelta)),
    hiredStaff: updatedStaff,
    regulars: updatedRegulars,
    heat: clampHeat(report.heatAtClose - HEAT.overnightDecay),
    drinkStock: updatedStock,
  };
  return { state: newState, report: annotated };
}


/**
 * Override the player's choice at a pending decision. Mutates the report
 * in place (the entry's text + cashDelta + repDelta + heatAfter on the
 * decision entry, and applies any heatDelta to all subsequent entries'
 * heatAfter snapshots). Aggregate cashDelta/repDelta on the report are
 * adjusted as well.
 *
 * No-op if `optionIndex` points at the default option (the report
 * already reflects that choice).
 */
export function applyDecisionOverride(
  report: ShiftReport,
  decisionIndex: number,
  optionIndex: number,
): void {
  const decision = report.decisions[decisionIndex];
  if (!decision) return;
  const option = decision.options[optionIndex];
  if (!option) return;
  if (option.isDefault) return;

  const entry = report.entries[decision.entryIndex];
  if (!entry || entry.kind !== 'Decision') return;

  // Adjust report aggregates for the swap.
  const cashDiff = option.cashDelta - entry.cashDelta;
  const repDiff = option.repDelta - entry.repDelta;
  report.cashDelta += cashDiff;
  report.repDelta += repDiff;

  entry.text = option.narrative;
  entry.cashDelta = option.cashDelta;
  entry.repDelta = option.repDelta;

  if (option.heatDelta) {
    // Apply heat shift to this entry and every subsequent entry's snapshot.
    const startHeat = entry.heatAfter ?? 0;
    const newHeat = Math.max(0, Math.min(5, startHeat + option.heatDelta));
    const delta = newHeat - startHeat;
    if (delta !== 0) {
      for (let i = decision.entryIndex; i < report.entries.length; i++) {
        const e = report.entries[i];
        if (typeof e.heatAfter === 'number') {
          e.heatAfter = Math.max(0, Math.min(5, e.heatAfter + delta));
        }
      }
      report.heatAtClose = Math.max(0, Math.min(5, report.heatAtClose + delta));
    }
  }
}
