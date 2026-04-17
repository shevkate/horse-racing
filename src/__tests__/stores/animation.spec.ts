import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { DURATION } from '@/constants/animation';
import { useAnimationStore } from '@/stores/animation';
import type { Horse, RaceRound } from '@/types';

const horses: Horse[] = [
  { id: 1, name: 'Horse 1', color: 'red', condition: 90 },
  { id: 2, name: 'Horse 2', color: 'blue', condition: 70 },
];

const round: RaceRound = { round: 1, distance: 1200, horseIds: [1, 2] };

// Base transition length for this round — longest lane finishes at
// base * (1 + lastPlaceSlowdown). Computed once so assertions don't drift
// if tunables change. The extra 200ms covers the JS-timer fallback grace
// window that fires when `transitionend` is never observed (happy-dom
// doesn't run real CSS transitions, so the fallback is the only signal
// under test). `nextPaint` is double-rAF; vi's fake timers mock rAF at
// ~16ms per frame, so advancing by `fullRoundMs` is plenty to flush both
// rAF callbacks plus the transition duration.
const baseMs = (round.distance / DURATION.metersPerSecond) * 1000;
const slowestMs = baseMs * (1 + DURATION.lastPlaceSlowdown);
const fullRoundMs = slowestMs + 200;

describe('useAnimationStore', () => {
  beforeEach(() => {
    // Fresh Pinia = fresh engine closure (pendingTimers, generation).
    // This is the whole reason the engine lives in a store instead of as
    // a module-level singleton.
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('wait', () => {
    it('resolves true when it elapses normally', async () => {
      const { wait } = useAnimationStore();

      const promise = wait(100);
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).resolves.toBe(true);
    });

    it('resolves false when reset cancels it', async () => {
      const engine = useAnimationStore();
      const promise = engine.wait(100);

      engine.reset();

      // Resolver is invoked synchronously during reset() — no need to
      // advance fake timers. This is what lets `finally` blocks and any
      // state updates past `await wait(...)` run after a cancellation
      // instead of hanging forever.
      await expect(promise).resolves.toBe(false);
    });

    it('does not let the cancelled timer fire later', async () => {
      const engine = useAnimationStore();
      const promise = engine.wait(100);

      engine.reset();
      // The underlying setTimeout was clearTimeout'd, but even if it slipped
      // through, the resolver has already been called once — a second call
      // is a no-op. Advancing the clock must not re-settle the promise or
      // throw.
      await vi.advanceTimersByTimeAsync(500);

      await expect(promise).resolves.toBe(false);
    });
  });

  describe('playRound', () => {
    it('resolves with a RoundResult on completion', async () => {
      const { playRound } = useAnimationStore();

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
      const engine = useAnimationStore();

      const promise = engine.playRound(round, horses);
      // One microtask flush so buildLineup assignment is visible. We
      // haven't advanced timers yet, so we're still in the pre-roll gap.
      await Promise.resolve();

      expect(engine.currentAnimation).toHaveLength(2);
      expect(engine.animating).toBe(true);

      // Let it finish so we don't leak the pending transition.
      await vi.advanceTimersByTimeAsync(fullRoundMs);
      await promise;
    });

    it('cleans up engine state when reset() runs mid-flight and lets a fresh round start', async () => {
      const engine = useAnimationStore();

      // Abort partway through the first round.
      void engine.playRound(round, horses);
      // Flush a couple of rAF frames (nextPaint) plus a bit of the
      // transition, then reset mid-round.
      await vi.advanceTimersByTimeAsync(100);
      engine.reset();

      // State is wiped immediately.
      expect(engine.currentAnimation).toEqual([]);
      expect(engine.animating).toBe(false);

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
      const engine = useAnimationStore();

      void engine.playRound(round, horses);
      await Promise.resolve();
      expect(engine.currentAnimation.length).toBeGreaterThan(0);
      expect(engine.animating).toBe(true);

      engine.reset();

      expect(engine.currentAnimation).toEqual([]);
      expect(engine.animating).toBe(false);
    });

    it('cancels every pending timer via clearTimeout', () => {
      const engine = useAnimationStore();
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

      // Queue two pending waits.
      void engine.wait(500);
      void engine.wait(1000);

      engine.reset();

      expect(clearSpy).toHaveBeenCalledTimes(2);
      clearSpy.mockRestore();
    });

    it('is safe to call when nothing is pending', () => {
      const engine = useAnimationStore();

      expect(() => engine.reset()).not.toThrow();
      expect(engine.currentAnimation).toEqual([]);
      expect(engine.animating).toBe(false);
    });
  });

  describe('store isolation', () => {
    it('fresh Pinia gives a fresh engine — no leakage between activations', () => {
      const first = useAnimationStore();
      void first.wait(500);
      first.showLineup(round, horses);
      expect(first.currentAnimation.length).toBeGreaterThan(0);

      // Swap in a new Pinia and the store re-runs its setup fn from scratch.
      setActivePinia(createPinia());
      const second = useAnimationStore();

      expect(second.currentAnimation).toEqual([]);
      expect(second.animating).toBe(false);
    });
  });
});
