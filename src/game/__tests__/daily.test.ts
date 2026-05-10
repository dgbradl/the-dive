import { describe, expect, it } from 'vitest';
import { defaultCareerStats } from '../careerStats';
import { dailyShareText } from '../dailyShare';
import { newGame } from '../save';
import { getScenario, todaysDailyKey, todaysDailySeed } from '../scenarios';

describe('daily challenge', () => {
  it('todaysDailySeed is identical for two runs on the same date', () => {
    const a = new Date('2026-05-10T03:00:00Z');
    const b = new Date('2026-05-10T22:30:00Z');
    expect(todaysDailySeed(a)).toBe(todaysDailySeed(b));
  });

  it('todaysDailySeed differs day to day', () => {
    expect(todaysDailySeed(new Date('2026-05-10T12:00:00Z'))).not.toBe(
      todaysDailySeed(new Date('2026-05-11T12:00:00Z')),
    );
  });

  it('todaysDailyKey formats as YYYY-MM-DD', () => {
    expect(todaysDailyKey(new Date('2026-05-09T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('Daily scenario builds with the deterministic seed and scenarioId=daily', () => {
    const a = getScenario('daily').build();
    const b = getScenario('daily').build();
    expect(a.scenarioId).toBe('daily');
    expect(a.rngSeed).toBe(b.rngSeed);
    expect(a.rngSeed).toBe(todaysDailySeed());
  });

  it('dailyShareText returns null for non-daily runs', () => {
    const s = newGame('inherited');
    expect(dailyShareText(s, defaultCareerStats)).toBeNull();
  });

  it('dailyShareText formats the result line for a daily run', () => {
    const s = newGame('daily');
    s.day = 8;
    s.cash = 412;
    s.reputation = 22;
    const text = dailyShareText(s, { ...defaultCareerStats, unlockedAchievements: ['first_night', 'crowded_house'] });
    expect(text).toContain('The Dive · Daily');
    expect(text).toContain('Survived 7 days');
    expect(text).toContain('$412');
    expect(text).toContain('rep 22');
    expect(text).toContain('Achievements 2/');
  });
});
