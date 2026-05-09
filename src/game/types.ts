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
}
