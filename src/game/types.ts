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
  /**
   * If present, the event becomes an interactive Decision instead of an
   * automatic Event entry. The first option marked `isDefault` is applied
   * if the player doesn't override.
   */
  decisionOptions?: DecisionOption[];
  /** Prompt shown above the action bar when the decision pauses playback. */
  decisionPrompt?: string;
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
  /** Flat rent deducted from cash at the close of every shift. */
  rentPerDay: number;
}

/** A weekly milestone — the lease threats and rep gates that pressure the run. */
export interface Milestone {
  id: 'day7-lease' | 'day14-rep';
  /** The day on which the check fires (morning of). */
  dueDay: number;
  /** Human description of the threshold. */
  description: string;
  /** Returns true if the threshold is met. */
  check(state: GameState): boolean;
  /** Banner copy shown on planning before the check. */
  bannerLabel(state: GameState): string;
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
  | 'Wages'
  | 'Decision';

/** Player-facing verbs on the action bar. */
export type ActionKey = 'pour' | 'cut-off' | 'eighty-six' | 'ring-up' | 'door';

/** Gates that must be met for a DecisionOption to be selectable. */
export type DecisionGate = 'bouncer-on-door' | 'charming-on-floor' | 'cash-50';

export interface DecisionOption {
  /** Which action-bar verb this option occupies. */
  key: ActionKey;
  /** Button label override (defaults to the key's label). */
  label?: string;
  /** If unmet, the button is disabled. */
  requires?: DecisionGate;
  cashDelta: number;
  repDelta: number;
  heatDelta?: number;
  /** Replaces the entry's text when this option is applied. */
  narrative: string;
  /** Marked the default — applied if the player doesn't override. */
  isDefault?: boolean;
}

export interface PendingDecision {
  /** Index into report.entries — the Decision entry this resolves. */
  entryIndex: number;
  prompt: string;
  options: DecisionOption[];
  /** Resolved gate flags computed by the simulator at decision time. */
  satisfiedGates: DecisionGate[];
}

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
  /** Set on Decision entries — index into report.decisions. */
  decisionIndex?: number;
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
  /** Pause-points the player can override during cinematic playback. */
  decisions: PendingDecision[];
  /** Rent deducted at the close of this shift. */
  rentPaid: number;
}
