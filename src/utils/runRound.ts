import type { Horse, RaceRound, RoundResult, RoundResultItem } from '@/types';

const calculateScore = (horse: Horse): number => {
  return horse.condition + Math.random() * 100;
};

export const runRound = (round: RaceRound, horses: Horse[]): RoundResult => {
  // Build an id→horse lookup once instead of doing an O(n) `find` per participant.
  const byId = new Map(horses.map((horse) => [horse.id, horse]));
  const selectedHorses = round.horseIds
    .map((horseId) => byId.get(horseId))
    .filter((horse): horse is Horse => Boolean(horse));

  const items: RoundResultItem[] = selectedHorses
    .map((horse) => ({
      horseId: horse.id,
      score: calculateScore(horse),
    }))
    .sort((firstHorse, secondHorse) => secondHorse.score - firstHorse.score)
    .map((horse, index) => ({
      ...horse,
      position: index + 1,
    }));

  return {
    round: round.round,
    distance: round.distance,
    items,
  };
};
