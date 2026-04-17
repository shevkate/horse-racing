export const getRandomInt = (min: number, max: number): number => {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);

  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
};

export const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    // Indices i and j are always within bounds — non-null assertions are safe here
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }

  return copy;
};

/**
 * Uniform random sample of `count` items, preserving no particular order.
 *
 * Uses a partial Fisher–Yates: only the first `count` positions of the
 * working copy are finalised, so the work is O(count) rather than O(n) of
 * a full shuffle. Equivalent distribution to `shuffle(items).slice(0, count)`
 * but cheaper when `count << items.length`. At 10-of-20 the savings are
 * cosmetic; the point is that the function no longer degrades quadratically
 * if the pool or round size ever grows.
 */
export const takeRandom = <T>(items: T[], count: number): T[] => {
  const take = Math.min(count, items.length);
  const copy = [...items];

  for (let i = 0; i < take; i += 1) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    // Both indices are within bounds by construction — non-null assertion safe.
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }

  return copy.slice(0, take);
};
