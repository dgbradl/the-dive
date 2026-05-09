import type { ShiftPhase } from '../game/types';

/** The bar opens at 8:00 PM. 20 ticks span 6 hours, so each tick = 18 minutes. */
const OPEN_HOUR_24 = 20; // 8:00 PM
const SHIFT_MINUTES = 6 * 60;

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function dayOfWeek(day: number): string {
  // Day 1 → Monday by convention.
  return DAY_NAMES[((day - 1) % 7 + 1 + 7) % 7];
}

/** Convert a 1-indexed tick into the in-game clock time, e.g. "8:00 PM". */
export function tickToClock(tick: number, tickCount: number): string {
  const minutesPerTick = SHIFT_MINUTES / tickCount;
  const totalMinutes = (tick - 1) * minutesPerTick;
  const totalH = OPEN_HOUR_24 * 60 + Math.round(totalMinutes);
  const h24 = Math.floor(totalH / 60) % 24;
  const m = totalH % 60;
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${meridiem}`;
}

/** Human label for a phase. */
export function phaseLabel(phase: ShiftPhase): string {
  switch (phase) {
    case 'Early': return 'Early';
    case 'Prime': return 'Prime Time';
    case 'LastCall': return 'Last Call';
  }
}

/** Format minutes-remaining as "Xh Ym" (or "Ym" under an hour). */
export function formatRemaining(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

/**
 * Subtitle for the TIME cell:
 *   - Early/Prime: "until last call"
 *   - LastCall:    "until close"
 */
export function timeSubtitle(tick: number, tickCount: number, phase: ShiftPhase): string {
  const minutesPerTick = SHIFT_MINUTES / tickCount;
  if (phase === 'LastCall') {
    const remainingTicks = tickCount - tick + 1;
    return `${formatRemaining(remainingTicks * minutesPerTick)} to close`;
  }
  const lastCallStartTick = Math.floor(tickCount * 0.7) + 1;
  const ticksUntil = Math.max(0, lastCallStartTick - tick);
  return `last call ${formatRemaining(ticksUntil * minutesPerTick)}`;
}
