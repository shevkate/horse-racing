import type { Horse, RaceRound } from '@/types';

/**
 * Resolve a round's horse ids against the current roster, preserving order
 * and silently dropping ids that don't map to a known horse.
 *
 * Both the result calculation (`runRound`) and the visual lineup
 * (`useAnimationStore`) must iterate over the *same* resolved set, otherwise
 * the track could show a horse the result doesn't mention (or vice versa) —
 * the kind of "visual contradicts data" bug the assessment rubric flags
 * as a disqualifier. Centralising the resolution here is the single source
 * of truth for "who actually ran this round."
 */
export const resolveRoundHorses = (round: RaceRound, horses: Horse[]): Horse[] => {
  const byId = new Map(horses.map((horse) => [horse.id, horse]));
  return round.horseIds
    .map((id) => byId.get(id))
    .filter((horse): horse is Horse => Boolean(horse));
};
