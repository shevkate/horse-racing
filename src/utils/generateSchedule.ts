import { HORSES_PER_ROUND, ROUND_DISTANCES, TOTAL_ROUNDS } from '@/constants/race';
import type { Horse, RaceRound } from '@/types';
import { takeRandom } from './random';

export const generateSchedule = (horses: Horse[]): RaceRound[] => {
  const horseIds = horses.map((horse) => horse.id);

  return Array.from({ length: TOTAL_ROUNDS }, (_, index) => ({
    round: index + 1,
    distance: ROUND_DISTANCES[index]!,
    horseIds: takeRandom(horseIds, HORSES_PER_ROUND),
  }));
};
