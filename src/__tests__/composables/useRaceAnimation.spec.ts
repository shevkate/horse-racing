import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ANIMATION_TIMINGS, DURATION } from '@/constants/animation';
import { useRaceAnimation } from '@/composables/useRaceAnimation';
import type { Horse, RaceRound } from '@/types';

// The animation engine is a module-level singleton — every test must start
// from a clean slate or leftover timers/currentAnimation leak across cases.
const freshEngine = () => {
  const engine = useRaceAnimation();
  engine.reset();
  return engine;
};

const horses: Horse[] = [
  { id: 1, name: 'Horse 1', color: 'red', condition: 90 },
  { id: 2, name: 'Horse 2', color: 'blue', condition: 70 },
];

const round: RaceRound = { round: 1, distance: 1200, horseIds: [1, 2] };

// Base transition length for this round — longest lane finishes at
// base * (1 + lastPlaceSlowdown). Computed once so assertions don't drift
// if tunables change.
const baseMs = (round.distance / DURATION.metersPerSecond) * 1000;
const slowestMs = baseMs * (1 + DURATION.lastPlaceSlowdown);
const fullRoundMs = ANIMATION_TIMINGS.preRollMs + slowestMs;

describe('useRaceAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Drop any still-pending work before swapping timers back, otherwise
    // stray setTimeouts fire against the real clock in the next test.
    useRaceAnimation().reset();
    vi.useRealTimers();
  });

  describe('wait', () => {
    it('resolves true when it elapses normally', async () => {
      const { wait } = freshEngine();

      const promise = wait(100);
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).resolves.toBe(true);
    });

    it('does not fire its timer after reset (cancellation is synchronous)', async () => {
      const engine = freshEngine();
      let fired = false;
      const promise = engine.wait(100).then((value) => {
        fired = true;
        return value;
      });

      engine.reset();
      await vi.advanceTimersByTimeAsync(100);
      // Flush any microtasks that a rogue timer callback would have queued.
      await Promise.resolve();

      expect(fired).toBe(false);
      // Keep the unresolved promise reference alive until test teardown —
      // vitest doesn't care about pending promises, they just get GC'd.
      void promise;
    });
  });

  describe('playRound', () => {
    it('resolves with a RoundResult on completion', async () => {
      const { playRound } = freshEngine();

      const promise = playRound(round, horses);
      await vi.advanceTimersByTimeAsync(fullRoundMs);

      const result = await promise;
      expect(result).not.toBeNull();
      expect(result?.round).toBe(1);
      expect(result?.distance).toBe(1200);
      expect(result?.items).toHaveLength(2);
      expect(new Set(result?.items.map((item) => item.horseId))).toEqual(new Set([1, 2]));
    });

    it('populates currentAnimation with the lineup while running', async () => {
      const engine = freshEngine();

      const promise = engine.playRound(round, horses);
      // One microtask flush so buildLineup assignment is visible. We
      // haven't advanced timers yet, so we're still in the pre-roll gap.
      await Promise.resolve();

      expect(engine.currentAnimation.value).toHaveLength(2);
      expect(engine.animating.value).toBe(true);

      // Let it finish so we don't leak the pending transition.
      await vi.advanceTimersByTimeAsync(fullRoundMs);
      await promise;
    });

    it('cleans up engine state when reset() runs mid-flight and lets a fresh round start', async () => {
      const engine = freshEngine();

      // Abort partway through the first round.
      void engine.playRound(round, horses);
      await vi.advanceTimersByTimeAsync(ANIMATION_TIMINGS.preRollMs + 100);
      engine.reset();

      // State is wiped immediately.
      expect(engine.currentAnimation.value).toEqual([]);
      expect(engine.animating.value).toBe(false);

      // A fresh round started post-reset still completes with a real result —
      // proves the generation counter didn't wedge the engine.
      const secondPromise = engine.playRound(round, horses);
      await vi.advanceTimersByTimeAsync(fullRoundMs);

      const result = await secondPromise;
      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('clears currentAnimation and flips animating back to false', async () => {
      const engine = freshEngine();

      void engine.playRound(round, horses);
      await Promise.resolve();
      expect(engine.currentAnimation.value.length).toBeGreaterThan(0);
      expect(engine.animating.value).toBe(true);

      engine.reset();

      expect(engine.currentAnimation.value).toEqual([]);
      expect(engine.animating.value).toBe(false);
    });

    it('cancels every pending timer via clearTimeout', () => {
      const engine = freshEngine();
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

      // Queue two pending waits.
      void engine.wait(500);
      void engine.wait(1000);

      engine.reset();

      expect(clearSpy).toHaveBeenCalledTimes(2);
      clearSpy.mockRestore();
    });

    it('is safe to call when nothing is pending', () => {
      const engine = freshEngine();

      expect(() => engine.reset()).not.toThrow();
      expect(engine.currentAnimation.value).toEqual([]);
      expect(engine.animating.value).toBe(false);
    });
  });
});
