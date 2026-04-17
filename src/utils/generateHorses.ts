import { HORSE_NAMES, TOTAL_HORSES } from '@/constants/race';
import type { Horse } from '@/types';
import { getRandomInt } from './random';

// Evenly spaced hues around the colour wheel. Good up to ~24 horses
// (15° apart, still visually distinct); beyond that we'd need a curated
// palette or lightness variation to keep lanes tellable apart.
const MAX_DISTINCT_HUES = 24;
if (TOTAL_HORSES > MAX_DISTINCT_HUES) {
  throw new Error(
    `TOTAL_HORSES=${TOTAL_HORSES} exceeds ${MAX_DISTINCT_HUES}: hue-only palette can't keep lanes visually distinct. Switch to a curated palette.`,
  );
}
// HORSE_NAMES must also be long enough to cover every generated horse.
if (HORSE_NAMES.length < TOTAL_HORSES) {
  throw new Error(
    `HORSE_NAMES has ${HORSE_NAMES.length} entries, need ${TOTAL_HORSES}.`,
  );
}

const generateColor = (index: number): string => {
  const hue = Math.floor((index / TOTAL_HORSES) * 360);
  return `hsl(${hue}, 70%, 50%)`;
};

export const generateHorses = (): Horse[] => {
  return Array.from({ length: TOTAL_HORSES }, (_, index) => ({
    id: index + 1,
    name: HORSE_NAMES[index]!,
    color: generateColor(index),
    condition: getRandomInt(1, 100),
  }));
};
