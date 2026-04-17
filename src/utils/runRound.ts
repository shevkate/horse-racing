import type { Horse, RaceRound, RoundResult, RoundResultItem } from '@/types';

import { resolveRoundHorses } from './resolveRoundHorses';

/**
 * Race score = condition [1..100] + random [0..100].
 *
 * Condition contributes up to 50% of the ceiling, so it biases outcomes
 * without making them deterministic — a condition-95 horse almost always
 * beats a condition-30 horse, but a condition-30 horse sometimes wins
 * against condition-60. That randomness is intentional: without it every
 * race would have the same winner and the app would lose any dramatic
 * tension. The assessment spec is silent on the formula, so this is a
 * design choice worth flagging rather than a bug.
 */
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
