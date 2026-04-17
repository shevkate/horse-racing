import { defineStore } from 'pinia';
import { ref } from 'vue';

import { ANIMATION_TIMINGS, DURATION } from '@/constants/animation';
import type { Horse, HorseId, RaceRound, RoundResult, RoundResultItem } from '@/types';
import { resolveRoundHorses } from '@/utils/resolveRoundHorses';
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

// Must resolve through `resolveRoundHorses` — the same helper `runRound` uses —
// so the visual lineup and the result set iterate the exact same horses. Using
// `round.horseIds` directly here would re-open the "ghost lane" bug: an id
// that doesn't map to a known horse would appear on the track (with a
// placeholder color/name) but never show up in `RoundResult.items`, because
// `runRound` silently drops it.
const buildLineup = (round: RaceRound, horses: Horse[]): HorseAnimation[] => {
  return resolveRoundHorses(round, horses).map((horse, index) => ({
    round: round.round,
    horseId: horse.id,
    color: horse.color,
    name: horse.name,
    lane: index + 1,
    progress: 0,
    duration: 0,
    finished: false,
  }));
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

  // Each pending wait is tracked as its timer handle *and* its resolver, so
  // `reset()` can both cancel the timer and settle the promise with `false`.
  // The previous version only stored the handle, which meant an aborted
  // `wait()` promise never settled at all — safe today, but it leaks pending
  // awaiters and prevents any `finally`/cleanup downstream of `await wait(...)`
  // from ever running. Resolving with `false` on cancel keeps the async graph
  // observable and composable.
  interface PendingTimer {
    handle: ReturnType<typeof setTimeout>;
    resolve: (completed: boolean) => void;
  }
  const pendingTimers = new Set<PendingTimer>();
  let generation = 0;

  /**
   * Cancellable sleep. Resolves to `true` if it elapsed normally and to
   * `false` if `reset()` cancelled it. Callers use the boolean to decide
   * whether to keep mutating state — the generation counter is still the
   * authoritative abort signal for multi-step flows (see `playRound`), but
   * single-step waiters can branch on the return value alone.
   */
  const wait = (ms: number): Promise<boolean> => {
    const snapshot = generation;
    return new Promise((resolve) => {
      const entry: PendingTimer = {
        handle: setTimeout(() => {
          pendingTimers.delete(entry);
          resolve(snapshot === generation);
        }, ms),
        resolve,
      };
      pendingTimers.add(entry);
    });
  };

  const reset = (): void => {
    for (const entry of pendingTimers) {
      clearTimeout(entry.handle);
      entry.resolve(false); // unblock awaiters so downstream cleanup can run
    }
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

    // `buildLineup` and `runRound` now iterate the same resolved horse set
    // (via `resolveRoundHorses`), so every lane horseId has a matching
    // entry in `durations`. The `!` assertions document that invariant.
    currentAnimation.value = currentAnimation.value.map((h) => ({
      ...h,
      progress: 100,
      duration: durations.get(h.horseId)!,
    }));

    // Flip `finished` on each horse exactly when its CSS transition ends.
    await Promise.all(
      currentAnimation.value.map(async (horse) => {
        const duration = durations.get(horse.horseId)!;
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
