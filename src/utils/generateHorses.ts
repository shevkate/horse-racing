import { HORSE_NAMES, TOTAL_HORSES } from '@/constants/race';
import type { Horse } from '@/types';
import { getRandomInt } from './random';

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
