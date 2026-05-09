import { describe, expect, it } from 'vitest';
import { migrate } from '../save';

describe('save migration v1 -> v2', () => {
  it('synthesizes a regulars array on legacy v1 saves', () => {
    const v1 = {
      day: 3,
      cash: 250,
      reputation: 12,
      rngSeed: 42,
      hiredStaff: [],
      drinkPrices: [],
      ownedUpgradeIds: [],
      assignments: [],
      nightlySpecialDrinkId: null,
    };
    const migrated = migrate(v1);
    expect(Array.isArray(migrated.regulars)).toBe(true);
    expect(migrated.regulars.length).toBeGreaterThan(0);
    expect(migrated.day).toBe(3);
    expect(migrated.cash).toBe(250);
  });

  it('preserves an existing regulars array on v2 saves', () => {
    const v2 = {
      day: 5, cash: 100, reputation: 0, rngSeed: 7,
      hiredStaff: [], drinkPrices: [], ownedUpgradeIds: [],
      assignments: [], nightlySpecialDrinkId: null,
      regulars: [{ id: 'r1', displayName: 'Foo', archetypeId: 'dive_regular', spriteId: 'dive_regular', loyalty: 4, lastSeenDay: 5 }],
    };
    const migrated = migrate(v2);
    expect(migrated.regulars).toHaveLength(1);
    expect(migrated.regulars[0].displayName).toBe('Foo');
  });
});
