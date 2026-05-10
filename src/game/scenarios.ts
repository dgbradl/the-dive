import { startingRegulars } from './content';
import { Station, type GameState } from './types';

export interface Scenario {
  id: string;
  displayName: string;
  /** One-line pitch shown on the picker. */
  tagline: string;
  /** Longer flavor for the description body. */
  description: string;
  /** Builds a fresh GameState for this scenario. */
  build: () => GameState;
}

function bartenderState(overrides: Partial<GameState>): GameState {
  const seed = (Math.random() * 0x7fffffff) | 0 || 1337;
  const marvId = crypto.randomUUID();
  const base: GameState = {
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
    drinkStock: { pbr: 12, whiskey_sour: 8, house_special: 6 },
    signatures: [],
  };
  return { ...base, ...overrides };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'inherited',
    displayName: 'Inherited Dive',
    tagline: 'Marv, $200, a busted lease, and the regulars who never left.',
    description: 'Your uncle left you a bar. The lease is up in a week. Standard run.',
    build: () => bartenderState({ scenarioId: 'inherited' }),
  },
  {
    id: 'wreck',
    displayName: 'Bought a Wreck',
    tagline: '$100, $50/day rent, zero rep. Sink or swim.',
    description: 'You spent everything getting the keys. The walls smell like spilled beer. Tight from night one.',
    build: () => bartenderState({
      scenarioId: 'wreck',
      cash: 100,
      reputation: 0,
      rentPerDay: 50,
      drinkStock: { pbr: 6, whiskey_sour: 4, house_special: 2 },
    }),
  },
  {
    id: 'popup',
    displayName: 'Pop-Up Bar',
    tagline: '$350, no rent, no regulars. Move-fast money grab.',
    description: 'Borrowed the venue for a stretch. No lease, no regulars, no overhead. Pure margin.',
    build: () => bartenderState({
      scenarioId: 'popup',
      cash: 350,
      reputation: 10,
      rentPerDay: 0,
      regulars: [],
      drinkStock: { pbr: 24, whiskey_sour: 16, house_special: 12 },
    }),
  },
];

export const DEFAULT_SCENARIO_ID = 'inherited';

export function getScenario(id: string | undefined): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
