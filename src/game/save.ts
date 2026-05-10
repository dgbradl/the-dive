import { startingRegulars } from './content';
import { getScenario } from './scenarios';
import type { GameState } from './types';

const STORAGE_KEY = 'bargame.save.v3';
const STORAGE_KEY_V2 = 'bargame.save.v2';
const STORAGE_KEY_V1 = 'bargame.save.v1';

/**
 * Creates a fresh GameState. With no scenarioId (or unknown id),
 * defaults to the "Inherited Dive" scenario.
 */
export function newGame(scenarioId?: string): GameState {
  return getScenario(scenarioId).build();
}

export function migrate(raw: unknown): GameState {
  // Defensive: synthesize missing fields on legacy saves.
  const s = raw as Partial<GameState>;
  return {
    ...s,
    regulars: Array.isArray(s.regulars) ? s.regulars : startingRegulars.map((r) => ({ ...r })),
    heat: typeof s.heat === 'number' ? s.heat : 0,
    rentPerDay: typeof s.rentPerDay === 'number' ? s.rentPerDay : 40,
    drinkStock: (s.drinkStock && typeof s.drinkStock === 'object')
      ? s.drinkStock
      : { pbr: 12, whiskey_sour: 8, house_special: 6 },
    signatures: Array.isArray(s.signatures) ? s.signatures : [],
  } as GameState;
}

export function load(): GameState | null {
  try {
    const v3 = localStorage.getItem(STORAGE_KEY);
    if (v3) return migrate(JSON.parse(v3));
    const v2 = localStorage.getItem(STORAGE_KEY_V2);
    if (v2) {
      const upgraded = migrate(JSON.parse(v2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
      localStorage.removeItem(STORAGE_KEY_V2);
      return upgraded;
    }
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const upgraded = migrate(JSON.parse(v1));
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
