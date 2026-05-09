import { Station, type GameState } from './types';

const STORAGE_KEY = 'bargame.save.v1';

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
  };
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
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
