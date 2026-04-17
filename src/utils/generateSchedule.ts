import { HORSES_PER_ROUND, ROUND_DISTANCES, TOTAL_ROUNDS } from '@/constants/race';
import type { Horse, RaceRound } from '@/types';
import { takeRandom } from './random';

// Fail fast at module load if the race constants disagree with each other.
// Without this guard, bumping `TOTAL_ROUNDS` without extending
// `ROUND_DISTANCES` would produce rounds with `distance: undefined` (the
// non-null assertion below silently lies), and the first such round would
// crash deep inside the animation engine instead of here at boot.
if (ROUND_DISTANCES.length < TOTAL_ROUNDS) {
  throw new Error(
    `ROUND_DISTANCES has ${ROUND_DISTANCES.length} entries, need ${TOTAL_ROUNDS}.`,
  );
}

export const generateSchedule = (horses: Horse[]): RaceRound[] => {
  const horseIds = horses.map((horse) => horse.id);

  return Array.from({ length: TOTAL_ROUNDS }, (_, index) => ({
    round: index + 1,
    distance: ROUND_DISTANCES[index]!,
    horseIds: takeRandom(horseIds, HORSES_PER_ROUND),
  }));
};
