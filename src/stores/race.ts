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
  // Runs rounds sequentially while status stays 'running'. The loop exits
  // gracefully on pause (status flips away from 'running') or reset (anim
  // cancellation signals propagate through `playRound` / `wait`).
  //
  // Cancellation semantics live in `useRaceAnimation` — the loop never
  // touches timers directly.
  // -----------------------------------------------------------------------

  let loopRunning = false;

  const _playLoop = async (): Promise<void> => {
    if (loopRunning) return; // guard against double-spawn (start + toggle race)
    loopRunning = true;
    try {
      while (currentRound.value < schedule.value.length && status.value === 'running') {
        const round = schedule.value[currentRound.value];
        if (!round) break;

        const result = await anim.playRound(round, horses.value);
        // Aborted (reset) — state is already cleaned up elsewhere.
        if (!result) return;

        results.value.push(result);
        currentRound.value += 1;

        // Pause between rounds, but not after the last one. This is also the
        // only window in which the user's Pause click takes visible effect.
        if (currentRound.value < schedule.value.length) {
          const completed = await anim.wait(ANIMATION_TIMINGS.betweenRoundsMs);
          if (!completed || status.value !== 'running') return;
        }
      }

      if (currentRound.value >= schedule.value.length) {
        status.value = 'finished';
      }
    } finally {
      loopRunning = false;
    }
  };

  // ---- Public actions ---------------------------------------------------

  /**
   * Boot-time: generate horses + reset everything. Called once by App.vue
   * on mount. Separate from `createSchedule` so the horse roster survives
   * repeated schedule regenerations.
   */
  const init = (): void => {
    anim.reset();
    horses.value = generateHorses();
    schedule.value = [];
    results.value = [];
    currentRound.value = 0;
    status.value = 'idle';
  };

  /**
   * Build a fresh 6-round schedule. Doubles as the "reset" action — callable
   * from any state. Cancels any in-flight animation, clears prior results,
   * and shows a static round-1 preview at the start line.
   */
  const createSchedule = (): void => {
    anim.reset();
    if (horses.value.length === 0) {
      horses.value = generateHorses();
    }
    schedule.value = generateSchedule(horses.value);
    results.value = [];
    currentRound.value = 0;
    status.value = 'scheduled';

    const firstRound = schedule.value[0];
    if (firstRound) anim.showLineup(firstRound, horses.value);
  };

  /**
   * Single toggle used by the Start/Pause button.
   *
   *   scheduled → running  (start the race)
   *   running   → paused   (pause auto-advance; effective between rounds)
   *   paused    → running  (resume from the next round)
   *
   * Any other status is a no-op so the action is safe to call from the UI
   * without pre-checking state.
   */
  const toggleRace = (): void => {
    if (status.value === 'scheduled' || status.value === 'paused') {
      status.value = 'running';
      // _playLoop itself guards against double-spawn via `loopRunning`,
      // so we don't need to inspect `animating` here.
      void _playLoop();
      return;
    }
    if (status.value === 'running') {
      status.value = 'paused';
    }
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
    toggleRace,
  };
});
