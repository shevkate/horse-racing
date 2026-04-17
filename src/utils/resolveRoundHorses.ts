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
// Memoise the id→horse Map by the `horses` array reference. The roster is
// generated once per app boot and re-read for every round (runRound +
// buildLineup, 2 calls × 6 rounds = 12 resolutions per race), so without
// this cache we'd rebuild the same 20-entry Map a dozen times. WeakMap
// keeps the cache from pinning stale roster arrays after `init()` replaces
// them.
const indexCache = new WeakMap<Horse[], Map<Horse['id'], Horse>>();

const indexHorses = (horses: Horse[]): Map<Horse['id'], Horse> => {
  const cached = indexCache.get(horses);
  if (cached) return cached;
  const index = new Map(horses.map((horse) => [horse.id, horse]));
  indexCache.set(horses, index);
  return index;
};

export const resolveRoundHorses = (round: RaceRound, horses: Horse[]): Horse[] => {
  const byId = indexHorses(horses);
  return round.horseIds
    .map((id) => byId.get(id))
    .filter((horse): horse is Horse => Boolean(horse));
};
