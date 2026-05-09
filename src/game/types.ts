export const enum Station {
  OffShift = 'OffShift',
  Bar = 'Bar',
  Floor = 'Floor',
  Door = 'Door',
}

export const enum StaffRole {
  Bartender = 'Bartender',
  Server = 'Server',
  Bouncer = 'Bouncer',
}

export type StaffTrait =
  | 'Quick'
  | 'Chatty'
  | 'Lazy'
  | 'Klutz'
  | 'Surly'
  | 'Charming';

export const enum EventTone {
  Whimsical = 'Whimsical',
  Crisis = 'Crisis',
  Lucky = 'Lucky',
  Mishap = 'Mishap',
}

export interface Drink {
  id: string;
  displayName: string;
  costToMake: number;
  suggestedPrice: number;
  prepTicks: number;
  quality: number; // 0..1
}

export interface StaffArchetype {
  id: string;
  displayName: string;
  role: StaffRole;
  baseWagePerDay: number;
  hireCost: number;
  traits: StaffTrait[];
  speed: number; // 0..1
  charm: number; // 0..1
  reliability: number; // 0..1
  flavorText: string;
  emoji: string; // for placeholder visuals
}

export type ShiftPhase = 'Early' | 'Prime' | 'LastCall';

export interface PhaseSpawnMultiplier {
  early?: number;
  prime?: number;
  lastCall?: number;
}

export interface CustomerArchetype {
  id: string;
  displayName: string;
  preferredDrinkIds: string[];
  spawnWeight: number; // 0..1 chance per tick
  tipMultiplier: number;
  patienceTicks: number;
  mishapChance: number;
  repInfluence: number;
  flavorText: string;
  emoji: string;
  /** Min reputation before this archetype spawns. Defaults to 0. */
  minReputation?: number;
  /** Per-phase spawn-weight multiplier (default 1 each). */
  phaseSpawnMultiplier?: PhaseSpawnMultiplier;
}

export interface RandomEvent {
  id: string;
  displayName: string;
  tone: EventTone;
  perTickChance: number;
  cashDelta: number;
  repDelta: number;
  narrative: string;
  requiresUpgradeId?: string;
  requiresNotUpgradeId?: string;
  minReputation?: number;
}

export interface Upgrade {
  id: string;
  displayName: string;
  cost: number;
  spawnRateMultiplier: number;
  repPerShift: number;
  tipBonus: number;
  flavorText: string;
}

export interface HiredStaff {
  instanceId: string;
  archetypeId: string;
  displayName: string;
  mood: number; // 0..100
  wagePerDay: number;
}

/**
 * Named recurring customer. Same archetype as one of the
 * `CustomerArchetype`s, but persists across days with a loyalty score.
 * When loyalty < 0 the regular doesn't spawn until they recover.
 */
export interface Regular {
  id: string;            // stable id, used in save + entries
  displayName: string;   // "Wheezer", "Rook", etc.
  archetypeId: string;   // mirrors a CustomerArchetype.id
  spriteId: string;      // sprite key suffix; reuses archetype art for now
  loyalty: number;       // -10..10 typical range
  lastSeenDay: number;   // day index they last walked in (0 = never)
}

export interface DrinkPriceOverride {
  drinkId: string;
  price: number;
}

export interface StaffAssignment {
  staffInstanceId: string;
  station: Station;
}

export interface GameState {
  day: number;
  cash: number;
  reputation: number;
  rngSeed: number;
  hiredStaff: HiredStaff[];
  drinkPrices: DrinkPriceOverride[];
  ownedUpgradeIds: string[];
  assignments: StaffAssignment[];
  nightlySpecialDrinkId: string | null;
  regulars: Regular[];
  /** Lingering rowdiness carried into tonight from yesterday (0..5). */
  heat: number;
}

export interface GameCatalog {
  drinks: Drink[];
  staffArchetypes: StaffArchetype[];
  customerArchetypes: CustomerArchetype[];
  events: RandomEvent[];
  upgrades: Upgrade[];
}

export interface ShiftConfig {
  tickCount: number;
  spawnRateScale: number;
  repPerSatisfied: number;
  repPerWalkout: number;
  atmosphereCashPerCustomer: number;
}

export const defaultShiftConfig: ShiftConfig = {
  tickCount: 20,
  spawnRateScale: 1,
  repPerSatisfied: 0.25,
  repPerWalkout: 0.5,
  atmosphereCashPerCustomer: 1,
};

export type ShiftEntryKind =
  | 'Note'
  | 'CustomerArrived'
  | 'Served'
  | 'Walkout'
  | 'Mishap'
  | 'Event'
  | 'Wages';

export interface ShiftEntry {
  tick: number;
  kind: ShiftEntryKind;
  text: string;
  cashDelta: number;
  repDelta: number;
  /** Optional refs for the Phaser visualizer. */
  customerArchetypeId?: string;
  staffInstanceId?: string;
  /** Named regular instance, if this entry refers to one. */
  regularId?: string;
  /** Display name of the customer/regular for visualizers. */
  customerDisplayName?: string;
  /** Set on phase-change Notes so the visualizer can react. */
  phase?: ShiftPhase;
  /** Set on Mishap entries that broke physical property. */
  damageItem?: string;
  /** Heat level immediately after this tick resolves (0..5). */
  heatAfter?: number;
}

export interface DamageRecord {
  tick: number;
  item: string;
  cost: number;
}

export interface ShiftReport {
  day: number;
  seed: number;
  cashDelta: number;
  repDelta: number;
  customersServed: number;
  customersLost: number;
  wagesPaid: number;
  entries: ShiftEntry[];
  /** Heat at close of shift (0..5). */
  heatAtClose: number;
  /** Damage accumulated tonight, itemized. */
  damages: DamageRecord[];
}
