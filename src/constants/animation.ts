/**
 * Centralised tunables for the race animation. Collected here (rather than
 * scattered across store + composable) so that the "feel" of the race can be
 * adjusted in one place — a common interview question during code review.
 */

export const ANIMATION_TIMINGS = {
  /**
   * Delay between placing horses at the start (progress=0, duration=0) and
   * triggering the CSS transition to progress=100. The browser needs one
   * paint at progress=0 first, otherwise the transition collapses to nothing.
   */
  preRollMs: 50,

  /** Pause between rounds before the next one auto-starts. */
  betweenRoundsMs: 1500,
} as const;

export const DURATION = {
  /**
   * Pace: 1 second per 400 meters. 1200m → 3s, 2200m → 5.5s.
   * Change this alone to make the whole race feel faster/slower.
   */
  metersPerSecond: 400,

  /**
   * How much slower the last-place horse is compared to the winner.
   * 0.4 = last horse takes 40% longer. Applied as a linear interpolation
   * across the score spread of a round.
   */
  lastPlaceSlowdown: 0.4,
} as const;
