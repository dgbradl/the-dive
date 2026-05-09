/**
 * Mulberry32 — small, fast, deterministic 32-bit PRNG.
 * Same seed → same sequence, which is what makes the simulator replayable
 * and unit-testable.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Avoid zero state which would degenerate the sequence.
    this.state = (seed | 0) || 1;
  }

  /** Float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  intBetween(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Pick a random element from a non-empty array. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
