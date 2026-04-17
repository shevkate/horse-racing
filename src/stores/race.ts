import { defineStore, storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import { ANIMATION_TIMINGS } from '@/constants/animation';
import { useAnimationStore } from '@/stores/animation';
import type { Horse, RaceRound, RaceStatus, RoundResult } from '@/types';
import { generateHorses, generateSchedule } from '@/utils';

export const useRaceStore = defineStore('race', () => {
  const anim = useAnimationStore();
  // `storeToRefs` preserves reactivity when re-exporting pieces of another
  // store — `anim.currentAnimation` on its own is already unwrapped, which
  // would drop reactivity when we return it below.
  //
  // IMPORTANT: these are READ-ONLY re-exports. Consumers MUST NOT write to
  // `raceStore.currentAnimation` / `raceStore.animating` — the refs belong
  // to the animation store, so mutations would bypass that store's own
  // invariants (generation counter, pendingFinishes lifecycle). If you
  // need to mutate animation state, go through `useAnimationStore()`
  // directly. The re-export exists only so components don't need to
  // import both stores just to read the animation state they already see
  // via the race store.
  const { currentAnimation, animating } = storeToRefs(anim);

  // ---- Domain state ------------------------------------------------------

  const horses = ref<Horse[]>([]);
  const schedule = ref<RaceRound[]>([]);
  const results = ref<RoundResult[]>([]);
  const currentRound = ref(0);
  const status = ref<RaceStatus>('idle');
  /**
   * Round number (1-indexed) currently shown on the track — set explicitly
   * by `createSchedule` (preview) and by `_playLoop` (per round). Decouples
   * the "what's on screen" question from the `currentRound`/animation state
   * so `RaceTrack` can resolve the active round with a single lookup instead
   * of a lineup-then-lastResult fallback chain.
   */
  const displayedRoundNumber = ref<number | null>(null);

  const horseNameById = computed(
    () => new Map(horses.value.map((horse) => [horse.id, horse.name])),
  );

  // Most recent completed round, or undefined before the first round
  // finishes. Lives here (not in `RaceTrack.vue`) so every consumer shares
  // one computed instead of each component maintaining its own `.at(-1)`
  // lookup — keeps the component's dep surface to store reads only.
  const lastResult = computed(() => results.value.at(-1));

  // Schedule rounds are 1-indexed and always dense (round N sits at index
  // N-1), so we can skip the `.find` scan and index directly. Falls back
  // to `?? null` so a stale `displayedRoundNumber` pointing past the end
  // of a regenerated schedule still returns null instead of undefined.
  const displayedRound = computed<RaceRound | null>(() => {
    if (displayedRoundNumber.value == null) return null;
    return schedule.value[displayedRoundNumber.value - 1] ?? null;
  });

  // ---- Internal: auto-advance loop --------------------------------------
  //
  // Runs rounds sequentially while status stays 'running'. The loop exits
  // gracefully on pause (status flips away from 'running') or reset (anim
  // cancellation signals propagate through `playRound` / `wait`).
  //
  // Cancellation semantics live in `useAnimationStore` — the loop never
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

        displayedRoundNumber.value = round.round;

        const result = await anim.playRound(round, horses.value);
        // `playRound` returns null only when `anim.reset()` cancelled it
        // mid-round. The only callers of reset are `init` and
        // `createSchedule`, both synchronous: they call anim.reset() and
        // then update `status` (to 'idle' / 'scheduled') before yielding.
        // Our `await` can't resume until those functions return, so by
        // the time we read `status` after this line the domain state is
        // already coherent. Any future reset path MUST also update
        // `status` synchronously in the same tick, or the loop would
        // resume here with a stale 'running' status and the UI would
        // stay mid-race.
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
    displayedRoundNumber.value = null;
    status.value = 'idle';
  };

  /**
   * Build a fresh 6-round schedule. Doubles as the "reset" action — callable
   * from `idle`, `scheduled`, `paused`, and `finished` states. Cancels any
   * in-flight animation, clears prior results, and shows a static round-1
   * preview at the start line.
   *
   * Forbidden during `running` — the UI already disables Generate mid-race,
   * but the public API must defend itself: an accidental programmatic call
   * would otherwise clear schedule/results while `_playLoop` still holds
   * references to them, leaving state in an inconsistent half-reset shape.
   * `paused` is allowed so the user can legitimately abandon a paused race.
   */
  const createSchedule = (): void => {
    if (status.value === 'running') return;

    anim.reset();
    if (horses.value.length === 0) {
      horses.value = generateHorses();
    }
    schedule.value = generateSchedule(horses.value);
    results.value = [];
    currentRound.value = 0;
    status.value = 'scheduled';

    const firstRound = schedule.value[0];
    displayedRoundNumber.value = firstRound?.round ?? null;
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
    displayedRoundNumber,
    horseNameById,
    lastResult,
    displayedRound,
    // Animation state — re-exported so existing consumers (RaceTrack etc.)
    // don't need to import the animation store separately. Components that
    // care only about animation can call `useAnimationStore()` directly.
    currentAnimation,
    animating,
    // Actions
    init,
    createSchedule,
    toggleRace,
  };
});
