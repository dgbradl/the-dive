import { startingRegulars } from './content';
import { Station, type GameState } from './types';

const STORAGE_KEY = 'bargame.save.v2';
const STORAGE_KEY_V1 = 'bargame.save.v1';

export function newGame(): GameState {
  const seed = (Math.random() * 0x7fffffff) | 0 || 1337;
  const marvId = crypto.randomUUID();
  return {
    day: 1,
    cash: 200,
    reputation: 5,
    rngSeed: seed,
    hiredStaff: [
      {
        instanceId: marvId,
        archetypeId: 'marv_bartender',
        displayName: 'Marv',
        mood: 70,
        wagePerDay: 30,
      },
    ],
    drinkPrices: [],
    ownedUpgradeIds: [],
    assignments: [{ staffInstanceId: marvId, station: Station.Bar }],
    nightlySpecialDrinkId: null,
    regulars: startingRegulars.map((r) => ({ ...r })),
    heat: 0,
    rentPerDay: 40,
  };
}

export function migrate(raw: unknown): GameState {
  // Defensive: synthesize missing fields on legacy saves.
  const s = raw as Partial<GameState>;
  return {
    ...s,
    regulars: Array.isArray(s.regulars) ? s.regulars : startingRegulars.map((r) => ({ ...r })),
    heat: typeof s.heat === 'number' ? s.heat : 0,
    rentPerDay: typeof s.rentPerDay === 'number' ? s.rentPerDay : 40,
  } as GameState;
}

export function load(): GameState | null {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return migrate(JSON.parse(v2));
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const upgraded = migrate(JSON.parse(v1));
      // Migrate forward and clear the old slot.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
      localStorage.removeItem(STORAGE_KEY_V1);
      return upgraded;
    }
    return null;
  } catch {
    return null;
  }
}

export function save(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or private mode — ignore for MVP.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function nextDaySeed(currentSeed: number, day: number): number {
  // Deterministic per-day seed derived from the run seed.
  return (Math.imul(currentSeed, 1103515245) + 12345 + day) | 0;
}
