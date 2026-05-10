import { ACHIEVEMENTS } from './achievements';
import type { CareerStats } from './careerStats';
import { todaysDailyKey } from './scenarios';
import type { GameState } from './types';

/**
 * Format a copy-pasteable result line for the daily challenge.
 * Returns null if the run wasn't a daily run.
 */
export function dailyShareText(state: GameState, career: CareerStats, now: Date = new Date()): string | null {
  if (state.scenarioId !== 'daily') return null;
  const days = Math.max(0, state.day - 1);
  const ach = career.unlockedAchievements.length;
  const total = ACHIEVEMENTS.length;
  return [
    `The Dive · Daily ${todaysDailyKey(now)}`,
    `Survived ${days} day${days === 1 ? '' : 's'} · $${state.cash} final · rep ${state.reputation}`,
    `Achievements ${ach}/${total}`,
  ].join('\n');
}
