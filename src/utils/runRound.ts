import type { Horse, RaceRound, RoundResult, RoundResultItem } from '@/types';

import { resolveRoundHorses } from './resolveRoundHorses';

const calculateScore = (horse: Horse): number => {
  return horse.condition + Math.random() * 100;
};

export const runRound = (round: RaceRound, horses: Horse[]): RoundResult => {
  // `resolveRoundHorses` is also what the animation composable uses to build
  // the visual lineup — keeping both paths in sync is what prevents a horse
  // from appearing on the track without a row in the results (and vice versa).
  const selectedHorses = resolveRoundHorses(round, horses);

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
