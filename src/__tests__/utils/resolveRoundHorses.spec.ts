import { describe, expect, it } from 'vitest';

import type { Horse, RaceRound } from '@/types';
import { resolveRoundHorses } from '@/utils/resolveRoundHorses';

const horses: Horse[] = [
  { id: 1, name: 'Thunderbolt', color: 'red', condition: 90 },
  { id: 2, name: 'Silver Wind', color: 'blue', condition: 70 },
  { id: 3, name: 'Golden Dust', color: 'green', condition: 55 },
];

describe('resolveRoundHorses', () => {
  it('returns horses in the order listed by the round', () => {
    const round: RaceRound = { round: 1, distance: 1200, horseIds: [3, 1, 2] };
    const resolved = resolveRoundHorses(round, horses);

    expect(resolved.map((h) => h.id)).toEqual([3, 1, 2]);
  });

  it('silently drops ids that are not in the roster', () => {
    const round: RaceRound = { round: 1, distance: 1200, horseIds: [1, 999, 2, 42] };
    const resolved = resolveRoundHorses(round, horses);

    expect(resolved.map((h) => h.id)).toEqual([1, 2]);
  });

  it('returns an empty array when every id is missing', () => {
    const round: RaceRound = { round: 1, distance: 1200, horseIds: [100, 200] };
    expect(resolveRoundHorses(round, horses)).toEqual([]);
  });

  it('returns an empty array for an empty roster', () => {
    const round: RaceRound = { round: 1, distance: 1200, horseIds: [1, 2] };
    expect(resolveRoundHorses(round, [])).toEqual([]);
  });
});
