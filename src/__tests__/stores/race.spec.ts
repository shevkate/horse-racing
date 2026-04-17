import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useRaceAnimation } from '@/composables/useRaceAnimation';
import { useRaceStore } from '@/stores/race';
import type { Horse, RaceRound, RoundResult } from '@/types';
import * as raceUtils from '@/utils';

describe('useRaceStore', () => {
  const horses: Horse[] = [
    { id: 1, name: 'Horse 1', color: 'red', condition: 90 },
    { id: 2, name: 'Horse 2', color: 'blue', condition: 70 },
  ];

  const schedule: RaceRound[] = [
    { round: 1, distance: 1200, horseIds: [1, 2] },
    { round: 2, distance: 1400, horseIds: [2, 1] },
  ];

  const firstResult: RoundResult = {
    round: 1,
    distance: 1200,
    items: [
      { horseId: 1, position: 1, score: 95 },
      { horseId: 2, position: 2, score: 80 },
    ],
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    // The animation engine is a module-level singleton — reset it between
    // tests so leftover state (pending timers, currentAnimation) doesn't leak.
    useRaceAnimation().reset();
  });

  describe('init', () => {
    it('generates horses and resets race state', () => {
      vi.spyOn(raceUtils, 'generateHorses').mockReturnValue(horses);

      const store = useRaceStore();
      store.$patch({
        schedule,
        results: [firstResult],
        currentRound: 1,
        status: 'running',
      });

      store.init();

      expect(store.horses).toEqual(horses);
      expect(store.schedule).toEqual([]);
      expect(store.results).toEqual([]);
      expect(store.currentRound).toBe(0);
      expect(store.status).toBe('idle');
    });
  });

  describe('createSchedule', () => {
    it('generates horses when the list is empty', () => {
      vi.spyOn(raceUtils, 'generateHorses').mockReturnValue(horses);
      vi.spyOn(raceUtils, 'generateSchedule').mockReturnValue(schedule);

      const store = useRaceStore();
      store.createSchedule();

      expect(raceUtils.generateHorses).toHaveBeenCalled();
      expect(raceUtils.generateSchedule).toHaveBeenCalledWith(horses);
      expect(store.horses).toEqual(horses);
      expect(store.schedule).toEqual(schedule);
      expect(store.status).toBe('scheduled');
    });

    it('reuses existing horses without regenerating', () => {
      const genHorsesSpy = vi.spyOn(raceUtils, 'generateHorses');
      vi.spyOn(raceUtils, 'generateSchedule').mockReturnValue(schedule);

      const store = useRaceStore();
      store.$patch({ horses });

      store.createSchedule();

      expect(genHorsesSpy).not.toHaveBeenCalled();
      expect(store.schedule).toEqual(schedule);
      expect(store.status).toBe('scheduled');
    });

    it('shows round 1 lineup as a static preview (progress=0, duration=0)', () => {
      vi.spyOn(raceUtils, 'generateHorses').mockReturnValue(horses);
      vi.spyOn(raceUtils, 'generateSchedule').mockReturnValue(schedule);

      const store = useRaceStore();
      store.createSchedule();

      expect(store.currentAnimation).toHaveLength(2);
      expect(store.currentAnimation.every((h) => h.progress === 0)).toBe(true);
      expect(store.currentAnimation.every((h) => h.duration === 0)).toBe(true);
    });
  });

  describe('status transitions', () => {
    it('startRace flips scheduled → running', () => {
      const store = useRaceStore();
      store.$patch({ horses, schedule, status: 'scheduled' });

      store.startRace();

      expect(store.status).toBe('running');
    });

    it('startRace is a no-op when not scheduled', () => {
      const store = useRaceStore();
      store.$patch({ status: 'idle' });

      store.startRace();

      expect(store.status).toBe('idle');
    });

    it('pauseRace flips running → paused', () => {
      const store = useRaceStore();
      store.$patch({ status: 'running' });

      store.pauseRace();

      expect(store.status).toBe('paused');
    });

    it('pauseRace is a no-op when not running', () => {
      const store = useRaceStore();
      store.$patch({ status: 'scheduled' });

      store.pauseRace();

      expect(store.status).toBe('scheduled');
    });

    it('resumeRace flips paused → running', () => {
      const store = useRaceStore();
      store.$patch({ schedule, status: 'paused' });

      store.resumeRace();

      expect(store.status).toBe('running');
    });

    it('resumeRace is a no-op when not paused', () => {
      const store = useRaceStore();
      store.$patch({ status: 'running' });

      store.resumeRace();

      expect(store.status).toBe('running');
    });
  });

  describe('resetRace', () => {
    it('clears schedule/results/currentRound but keeps horses', () => {
      const store = useRaceStore();
      store.$patch({
        horses,
        schedule,
        results: [firstResult],
        currentRound: 2,
        status: 'finished',
      });

      store.resetRace();

      expect(store.schedule).toEqual([]);
      expect(store.results).toEqual([]);
      expect(store.currentRound).toBe(0);
      expect(store.status).toBe('idle');
      expect(store.horses).toEqual(horses);
      expect(store.currentAnimation).toEqual([]);
    });
  });

  describe('horseNameById', () => {
    it('maps each horse id to its name', () => {
      const store = useRaceStore();
      store.$patch({ horses });

      expect(store.horseNameById.get(1)).toBe('Horse 1');
      expect(store.horseNameById.get(2)).toBe('Horse 2');
      expect(store.horseNameById.get(999)).toBeUndefined();
    });
  });
});
