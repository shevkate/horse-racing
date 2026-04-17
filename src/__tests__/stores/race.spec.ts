import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useRaceStore } from '@/stores/race';
import * as raceUtils from '@/utils';
import * as roundUtils from '@/utils/runRound';
import type { Horse, RaceRound, RoundResult } from '@/types';

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

  const secondResult: RoundResult = {
    round: 2,
    distance: 1400,
    items: [
      { horseId: 2, position: 1, score: 90 },
      { horseId: 1, position: 2, score: 85 },
    ],
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('init generates horses and resets race state', () => {
    vi.spyOn(raceUtils, 'generateHorses').mockReturnValue(horses);

    const store = useRaceStore();

    store.schedule = schedule;
    store.results = [firstResult];
    store.currentRound = 1;
    store.status = 'running';

    store.init();

    expect(store.horses).toEqual(horses);
    expect(store.schedule).toEqual([]);
    expect(store.results).toEqual([]);
    expect(store.currentRound).toBe(0);
    expect(store.status).toBe('idle');
  });

  it('createSchedule generates horses when horses list is empty', () => {
    vi.spyOn(raceUtils, 'generateHorses').mockReturnValue(horses);
    vi.spyOn(raceUtils, 'generateSchedule').mockReturnValue(schedule);

    const store = useRaceStore();

    store.createSchedule();

    expect(raceUtils.generateHorses).toHaveBeenCalled();
    expect(raceUtils.generateSchedule).toHaveBeenCalledWith(horses);
    expect(store.horses).toEqual(horses);
    expect(store.schedule).toEqual(schedule);
    expect(store.results).toEqual([]);
    expect(store.currentRound).toBe(0);
    expect(store.status).toBe('scheduled');
  });

  it('createSchedule reuses existing horses', () => {
    vi.spyOn(raceUtils, 'generateHorses');
    vi.spyOn(raceUtils, 'generateSchedule').mockReturnValue(schedule);

    const store = useRaceStore();
    store.horses = horses;

    store.createSchedule();

    expect(store.schedule).toEqual(schedule);
    expect(store.status).toBe('scheduled');
    expect(raceUtils.generateHorses).not.toHaveBeenCalled();
  });

  it('startRace switches status to running when schedule exists', () => {
    const store = useRaceStore();
    store.schedule = schedule;
    store.status = 'scheduled';
    store.startRace();

    expect(store.status).toBe('running');
  });

  it('startRace does nothing when schedule is empty', () => {
    const store = useRaceStore();

    store.startRace();

    expect(store.status).toBe('idle');
  });

  it('runNextRound appends result and increments current round', () => {
    vi.spyOn(roundUtils, 'runRound').mockReturnValue(firstResult);

    const store = useRaceStore();
    store.horses = horses;
    store.schedule = schedule;
    store.status = 'running';

    const result = store.runNextRound();

    expect(roundUtils.runRound).toHaveBeenCalledWith(schedule[0], horses);
    expect(result).toEqual(firstResult);
    expect(store.results).toEqual([firstResult]);
    expect(store.currentRound).toBe(1);
    expect(store.status).toBe('running');
  });

  it('runNextRound marks race as finished after the last round', () => {
    vi.spyOn(roundUtils, 'runRound').mockReturnValue(secondResult);

    const store = useRaceStore();
    store.horses = horses;
    store.schedule = schedule;
    store.currentRound = 1;
    store.status = 'running';

    const result = store.runNextRound();

    expect(result).toEqual(secondResult);
    expect(store.results).toEqual([secondResult]);
    expect(store.currentRound).toBe(2);
    expect(store.status).toBe('finished');
  });

  it('runNextRound returns null when all rounds are completed', () => {
    const store = useRaceStore();
    store.schedule = schedule;
    store.currentRound = schedule.length;
    store.status = 'running';

    const result = store.runNextRound();

    expect(result).toBeNull();
    expect(store.status).toBe('finished');
  });

  it('resetRace clears schedule results and current progress', () => {
    const store = useRaceStore();

    store.horses = horses;
    store.schedule = schedule;
    store.results = [firstResult, secondResult];
    store.currentRound = 2;
    store.status = 'finished';

    store.resetRace();

    expect(store.schedule).toEqual([]);
    expect(store.results).toEqual([]);
    expect(store.currentRound).toBe(0);
    expect(store.status).toBe('idle');
    expect(store.horses).toEqual(horses);
  });
});
