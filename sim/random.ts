/** A small seeded generator, so every run with the same seed is the same run. */
export type Rand = () => number;

export function rng(seed: number): Rand {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)];
