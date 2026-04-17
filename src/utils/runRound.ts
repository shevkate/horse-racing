import type { Horse, RaceRound, RoundResult, RoundResultItem } from '@/types';

import { resolveRoundHorses } from './resolveRoundHorses';

/**
 * Race score = condition [1..100] + random [0..RANDOM_SPREAD].
 *
 * RANDOM_SPREAD=60 keeps condition dominant (a 95 horse always beats a 30
 * horse — their score ranges don't overlap at all) while still allowing
 * upsets between horses within ~60 points of each other. The previous
 * spread of 100 let condition-30 beat condition-95 whenever their rolls
 * were at opposite ends of the distribution, which looked broken under
 * repeated play. The assessment spec is silent on the formula, so this
 * is a design choice rather than a requirement.
 */
const RANDOM_SPREAD = 60;

const calculateScore = (horse: Horse): number => {
  return horse.condition + Math.random() * RANDOM_SPREAD;
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
