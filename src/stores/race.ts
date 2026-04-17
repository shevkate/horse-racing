import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useRaceAnimation } from '@/composables/useRaceAnimation';
import { ANIMATION_TIMINGS } from '@/constants/animation';
import type { Horse, RaceRound, RaceStatus, RoundResult } from '@/types';
import { generateHorses, generateSchedule } from '@/utils';

export const useRaceStore = defineStore('race', () => {
  const anim = useRaceAnimation();

  // ---- Domain state ------------------------------------------------------

  const horses = ref<Horse[]>([]);
  const schedule = ref<RaceRound[]>([]);
  const results = ref<RoundResult[]>([]);
  const currentRound = ref(0);
  const status = ref<RaceStatus>('idle');

  const horseNameById = computed(
    () => new Map(horses.value.map((horse) => [horse.id, horse.name])),
  );

  // ---- Internal: auto-advance loop --------------------------------------
  //
  // Runs rounds sequentially while status stays 'running'. On pause, the
  // current round's animation finishes normally (so its result still lands
  // cleanly), then the loop exits. Resume restarts the loop from wherever
  // `currentRound` sits.
  //
  // The loop never touches timers directly — cancellation semantics live
  // in `useRaceAnimation` (via `wait()` and `reset()`).
  // -----------------------------------------------------------------------

  const _playLoop = async (): Promise<void> => {
    while (currentRound.value < schedule.value.length && status.value === 'running') {
      const round = schedule.value[currentRound.value];
      if (!round) break;

      const result = await anim.playRound(round, horses.value);
      // Aborted (reset) — state is already cleaned up elsewhere.
      if (!result) return;

      results.value.push(result);
      currentRound.value += 1;

      // Pause between rounds, but not after the last one.
      if (currentRound.value < schedule.value.length) {
        const completed = await anim.wait(ANIMATION_TIMINGS.betweenRoundsMs);
        if (!completed || status.value !== 'running') return;
      }
    }

    if (currentRound.value >= schedule.value.length) {
      status.value = 'finished';
    }
  };

  // ---- Public actions ---------------------------------------------------

  const init = (): void => {
    anim.reset();
    horses.value = generateHorses();
    schedule.value = [];
    results.value = [];
    currentRound.value = 0;
    status.value = 'idle';
  };

  const createSchedule = (): void => {
    if (horses.value.length === 0) {
      horses.value = generateHorses();
    }
    schedule.value = generateSchedule(horses.value);
    results.value = [];
    currentRound.value = 0;
    status.value = 'scheduled';

    // Static preview of round 1 at the start line so the track isn't empty before Start.
    const firstRound = schedule.value[0];
    if (firstRound) anim.showLineup(firstRound, horses.value);
  };

  const startRace = (): void => {
    if (status.value !== 'scheduled') return;
    status.value = 'running';
    void _playLoop();
  };

  const pauseRace = (): void => {
    if (status.value !== 'running') return;
    status.value = 'paused';
    // No timer cleanup needed — the loop will notice status !== 'running'
    // after the current round finishes and exit on its own.
  };

  const resumeRace = (): void => {
    if (status.value !== 'paused') return;
    status.value = 'running';
    // Restart the loop only if no round is currently animating; otherwise
    // the existing loop iteration will just continue past the status check.
    if (!anim.animating.value) void _playLoop();
  };

  const resetRace = (): void => {
    anim.reset();
    schedule.value = [];
    results.value = [];
    currentRound.value = 0;
    status.value = 'idle';
  };

  return {
    // Domain state
    horses,
    schedule,
    results,
    currentRound,
    status,
    horseNameById,
    // Animation state — re-exported so existing consumers (RaceTrack etc.)
    // don't need to import the composable separately. Components that care
    // only about animation can call `useRaceAnimation()` directly.
    currentAnimation: anim.currentAnimation,
    animating: anim.animating,
    // Actions
    init,
    createSchedule,
    startRace,
    pauseRace,
    resumeRace,
    resetRace,
  };
});
