import { describe, expect, it } from 'vitest';
import { HORSES_PER_ROUND, ROUND_DISTANCES, TOTAL_ROUNDS } from '@/constants/race';
import { generateHorses } from '@/utils/generateHorses';
import { generateSchedule } from '@/utils/generateSchedule';

describe('generateSchedule', () => {
  it('generates the expected number of rounds', () => {
    const horses = generateHorses();
    const schedule = generateSchedule(horses);

    expect(schedule).toHaveLength(TOTAL_ROUNDS);
  });

  it('assigns sequential round numbers', () => {
    const horses = generateHorses();
    const schedule = generateSchedule(horses);

    expect(schedule.map((round) => round.round)).toEqual(
      Array.from({ length: TOTAL_ROUNDS }, (_, index) => index + 1),
    );
  });

  it('uses predefined distances in the correct order', () => {
    const horses = generateHorses();
    const schedule = generateSchedule(horses);

    expect(schedule.map((round) => round.distance)).toEqual(ROUND_DISTANCES);
  });

  it('includes the required number of horses in each round', () => {
    const horses = generateHorses();
    const schedule = generateSchedule(horses);

    schedule.forEach((round) => {
      expect(round.horseIds).toHaveLength(HORSES_PER_ROUND);
    });
  });

  it('includes only valid horse ids', () => {
    const horses = generateHorses();
    const schedule = generateSchedule(horses);
    const validHorseIds = horses.map((horse) => horse.id);

    schedule.forEach((round) => {
      round.horseIds.forEach((horseId) => {
        expect(validHorseIds).toContain(horseId);
      });
    });
  });

  it('does not duplicate horse ids within the same round', () => {
    const horses = generateHorses();
    const schedule = generateSchedule(horses);

    schedule.forEach((round) => {
      expect(new Set(round.horseIds).size).toBe(round.horseIds.length);
    });
  });
});
