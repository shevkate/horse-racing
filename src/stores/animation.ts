import { defineStore } from 'pinia';
import { ref } from 'vue';

import { ANIMATION_TIMINGS, DURATION } from '@/constants/animation';
import type { Horse, HorseId, RaceRound, RoundResult, RoundResultItem } from '@/types';
import { runRound } from '@/utils/runRound';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HorseAnimation {
  round: number;
  horseId: HorseId;
  color: string;
  name: string;
  lane: number;
  /** 0 = at start line, 100 = at finish line. Driven by CSS transitions. */
  progress: number;
  /** CSS transition-duration in seconds. */
  duration: number;
  /** Flipped to true when this horse's transition completes. */
  finished: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const baseDuration = (distance: number): number => distance / DURATION.metersPerSecond;

const computeDurations = (
  items: RoundResultItem[],
  distance: number,
): Map<HorseId, number> => {
  const base = baseDuration(distance);
  const scores = items.map((i) => i.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const scoreRange = maxScore - minScore || 1; // avoid /0 when all scores equal

  return new Map(
    items.map((item) => {
      const normalized = (maxScore - item.score) / scoreRange; // 0 = winner, 1 = last
      return [item.horseId, base + normalized * base * DURATION.lastPlaceSlowdown];
    }),
  );
};

const buildLineup = (round: RaceRound, horses: Horse[]): HorseAnimation[] => {
  const byId = new Map(horses.map((h) => [h.id, h]));

  return round.horseIds.map((horseId, index) => {
    const horse = byId.get(horseId);
    return {
      round: round.round,
      horseId,
      color: horse?.color ?? '#888',
      name: horse?.name ?? '',
      lane: index + 1,
      progress: 0,
      duration: 0,
      finished: false,
    };
  });
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
//
// The animation engine used to live as a module-level singleton composable.
// Moving it behind a Pinia store gives us automatic per-test isolation
// (`setActivePinia(createPinia())` wipes both domain and engine state in one
// line) and keeps consumers' import ergonomics identical.
//
// Two cancellation primitives, both kept in the setup-fn closure so fresh
// Pinia instance = fresh engine:
//   1. `pendingTimers` — every setTimeout handle is tracked so `reset()`
//      can cancel them synchronously.
//   2. `generation` — monotonic counter. Every async flow snapshots the
//      generation it started in and bails out if it changes underneath them.
//      This protects against in-flight microtasks that slip past the
//      synchronous timer cleanup.
// ---------------------------------------------------------------------------

export const useAnimationStore = defineStore('animation', () => {
  const currentAnimation = ref<HorseAnimation[]>([]);
  const animating = ref(false);

  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
  let generation = 0;

  /**
   * Cancellable sleep. Resolves to `true` if it elapsed normally. The timer
   * is cleared synchronously by `reset()`, so an aborted wait simply never
   * settles — the generation guard inside the callback is defence-in-depth
   * for the case where a timer callback has already been queued but not yet
   * run when `reset()` runs.
   */
  const wait = (ms: number): Promise<boolean> => {
    const snapshot = generation;
    return new Promise((resolve) => {
      const handle = setTimeout(() => {
        pendingTimers.delete(handle);
        resolve(snapshot === generation);
      }, ms);
      pendingTimers.add(handle);
    });
  };

  const reset = (): void => {
    for (const handle of pendingTimers) clearTimeout(handle);
    pendingTimers.clear();
    generation += 1; // invalidate any async work that survives the clear
    currentAnimation.value = [];
    animating.value = false;
  };

  /** Static preview — place horses at the start line without animating. */
  const showLineup = (round: RaceRound, horses: Horse[]): void => {
    currentAnimation.value = buildLineup(round, horses);
  };

  /**
   * Play a single round to completion.
   *
   * Returns the computed `RoundResult` on success, or `null` if the animation
   * was aborted (reset) before it could finish. The caller (race store) uses
   * this to decide whether to record the result and advance.
   */
  const playRound = async (
    round: RaceRound,
    horses: Horse[],
  ): Promise<RoundResult | null> => {
    const snapshot = generation;
    const isStale = (): boolean => snapshot !== generation;

    const result = runRound(round, horses);
    const durations = computeDurations(result.items, round.distance);

    // Place at start, no transition.
    currentAnimation.value = buildLineup(round, horses);
    animating.value = true;

    // Let the DOM paint progress=0 before we flip to 100 (otherwise the CSS
    // transition is skipped because the browser collapses same-frame changes).
    if (!(await wait(ANIMATION_TIMINGS.preRollMs)) || isStale()) {
      animating.value = false;
      return null;
    }

    currentAnimation.value = currentAnimation.value.map((h) => ({
      ...h,
      progress: 100,
      duration: durations.get(h.horseId) ?? baseDuration(round.distance),
    }));

    // Flip `finished` on each horse exactly when its CSS transition ends.
    await Promise.all(
      currentAnimation.value.map(async (horse) => {
        const duration = durations.get(horse.horseId) ?? baseDuration(round.distance);
        if (!(await wait(duration * 1000)) || isStale()) return;

        currentAnimation.value = currentAnimation.value.map((h) =>
          h.horseId === horse.horseId ? { ...h, finished: true } : h,
        );
      }),
    );

    if (isStale()) return null;
    animating.value = false;
    return result;
  };

  return {
    // State
    currentAnimation,
    animating,
    // Commands
    showLineup,
    playRound,
    reset,
    wait,
  };
});
