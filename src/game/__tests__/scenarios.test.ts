import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO_ID, SCENARIOS, getScenario } from '../scenarios';

describe('scenarios', () => {
  it('exposes the four authored scenarios', () => {
    const ids = SCENARIOS.map((s) => s.id).sort();
    expect(ids).toEqual(['daily', 'inherited', 'popup', 'wreck']);
  });

  it('inherited dive is the default', () => {
    expect(DEFAULT_SCENARIO_ID).toBe('inherited');
    expect(getScenario(undefined).id).toBe('inherited');
    expect(getScenario('not-a-real-id').id).toBe('inherited');
  });

  it('build() stamps scenarioId on the new state', () => {
    for (const s of SCENARIOS) {
      const state = s.build();
      expect(state.scenarioId).toBe(s.id);
    }
  });

  it('Bought a Wreck starts tighter than Inherited', () => {
    const inherited = getScenario('inherited').build();
    const wreck = getScenario('wreck').build();
    expect(wreck.cash).toBeLessThan(inherited.cash);
    expect(wreck.rentPerDay).toBeGreaterThan(inherited.rentPerDay);
    expect(wreck.reputation).toBeLessThan(inherited.reputation);
  });

  it('Pop-up Bar has no rent and no regulars', () => {
    const popup = getScenario('popup').build();
    expect(popup.rentPerDay).toBe(0);
    expect(popup.regulars).toHaveLength(0);
    expect(popup.cash).toBeGreaterThan(0);
  });
});
