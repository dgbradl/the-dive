import { describe, expect, it } from 'vitest';
import { migrate } from '../save';

describe('save migrations', () => {
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

  it('synthesizes an empty signatures array on saves missing the field', () => {
    const v2 = {
      day: 4, cash: 100, reputation: 0, rngSeed: 7,
      hiredStaff: [], drinkPrices: [], ownedUpgradeIds: [],
      assignments: [], nightlySpecialDrinkId: null,
      regulars: [], heat: 0, rentPerDay: 40,
      drinkStock: { pbr: 12 },
    };
    const migrated = migrate(v2);
    expect(Array.isArray(migrated.signatures)).toBe(true);
    expect(migrated.signatures).toHaveLength(0);
  });

  it('preserves existing signatures on v3 saves', () => {
    const v3 = {
      day: 8, cash: 100, reputation: 0, rngSeed: 7,
      hiredStaff: [], drinkPrices: [], ownedUpgradeIds: ['cocktail_shaker'],
      assignments: [], nightlySpecialDrinkId: null,
      regulars: [], heat: 0, rentPerDay: 40,
      drinkStock: {},
      signatures: [{ id: 'sig_a', displayName: 'Knockout', baseDrinkIds: ['pbr', 'whiskey_sour'], suggestedPrice: 9, costToMake: 4 }],
    };
    const migrated = migrate(v3);
    expect(migrated.signatures).toHaveLength(1);
    expect(migrated.signatures[0].displayName).toBe('Knockout');
  });
});
