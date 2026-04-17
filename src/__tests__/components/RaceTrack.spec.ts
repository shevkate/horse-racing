import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import RaceTrack from '@/components/RaceTrack.vue';
import { useAnimationStore } from '@/stores/animation';
import { useRaceStore } from '@/stores/race';
import type { Horse, RaceRound, RoundResult } from '@/types';

const horses: Horse[] = [
  { id: 1, name: 'Thunderbolt', color: '#ff0000', condition: 90 },
  { id: 2, name: 'Silver Wind', color: '#0000ff', condition: 70 },
  { id: 3, name: 'Golden Dust', color: '#00ff00', condition: 55 },
  { id: 4, name: 'Night Dancer', color: '#8800ff', condition: 40 },
];

const round: RaceRound = { round: 1, distance: 1200, horseIds: [1, 2, 3, 4] };
const schedule: RaceRound[] = [round];

const result: RoundResult = {
  round: 1,
  distance: 1200,
  items: [
    { horseId: 1, position: 1, score: 99 },
    { horseId: 2, position: 2, score: 88 },
    { horseId: 3, position: 3, score: 77 },
    { horseId: 4, position: 4, score: 66 },
  ],
};

/**
 * Helper: stage the track in a given race phase by populating the store's
 * domain state and the animation composable's lineup. Covers every visible
 * state the template branches on.
 */
const setupTrack = (options: {
  status?: 'idle' | 'scheduled' | 'running' | 'paused' | 'finished';
  withLineup?: boolean;
  withResult?: boolean;
  animating?: boolean;
  finishedHorseIds?: number[];
} = {}) => {
  const store = useRaceStore();
  const anim = useAnimationStore();

  store.$patch({
    horses,
    schedule,
    status: options.status ?? 'idle',
    results: options.withResult ? [result] : [],
    // Mirror what `_playLoop` / `createSchedule` would set — the track reads
    // `displayedRound` (derived) to render its header.
    displayedRoundNumber: options.withLineup || options.withResult ? round.round : null,
  });

  if (options.withLineup) {
    anim.showLineup(round, horses);
  }

  if (options.animating) {
    anim.animating = true;
  }

  if (options.finishedHorseIds?.length) {
    anim.currentAnimation = anim.currentAnimation.map((h) =>
      options.finishedHorseIds!.includes(h.horseId) ? { ...h, finished: true } : h,
    );
  }

  return { store, anim };
};

describe('RaceTrack', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('empty state', () => {
    it('shows "Click Generate" hint when idle with no lineup', () => {
      setupTrack({ status: 'idle' });
      const wrapper = mount(RaceTrack);

      expect(wrapper.text()).toContain('Click Generate');
      expect(wrapper.findAll('.lane')).toHaveLength(0);
    });

    it('shows "Preparing track…" hint when non-idle with no lineup', () => {
      setupTrack({ status: 'scheduled' });
      const wrapper = mount(RaceTrack);

      expect(wrapper.text()).toContain('Preparing track');
    });

    it('shows "Awaiting race" title when no active round', () => {
      setupTrack({ status: 'idle' });
      const wrapper = mount(RaceTrack);

      expect(wrapper.text()).toContain('Awaiting race');
    });
  });

  describe('lane rendering', () => {
    beforeEach(() => {
      setupTrack({ status: 'scheduled', withLineup: true });
    });

    it('renders one lane per horse in currentAnimation', () => {
      const wrapper = mount(RaceTrack);
      expect(wrapper.findAll('.lane')).toHaveLength(4);
    });

    it('renders lane numbers 1..N in order', () => {
      const wrapper = mount(RaceTrack);
      const numbers = wrapper.findAll('.lane__number').map((n) => n.text());
      expect(numbers).toEqual(['1', '2', '3', '4']);
    });

    it('renders round title with distance', () => {
      const wrapper = mount(RaceTrack);
      expect(wrapper.text()).toContain('Round 1');
      expect(wrapper.text()).toContain('1200m');
    });
  });

  describe('podium badges (after round finishes)', () => {
    it('shows badges for top 3 horses when not animating', () => {
      setupTrack({ status: 'paused', withLineup: true, withResult: true });
      const wrapper = mount(RaceTrack);
      const badges = wrapper.findAll('.lane__badge');

      expect(badges).toHaveLength(3);
      expect(badges[0]!.text()).toContain('#1');
      expect(badges[0]!.text()).toContain('Thunderbolt');
      expect(badges[1]!.text()).toContain('#2');
      expect(badges[1]!.text()).toContain('Silver Wind');
      expect(badges[2]!.text()).toContain('#3');
      expect(badges[2]!.text()).toContain('Golden Dust');
    });

    it('hides all badges while animating', () => {
      setupTrack({
        status: 'running',
        withLineup: true,
        withResult: true,
        animating: true,
      });
      const wrapper = mount(RaceTrack);

      expect(wrapper.findAll('.lane__badge')).toHaveLength(0);
    });

    it('applies podium class to top 3 horse icons only', () => {
      setupTrack({ status: 'paused', withLineup: true, withResult: true });
      const wrapper = mount(RaceTrack);
      const icons = wrapper.findAll('.lane__horse');

      expect(icons[0]!.classes()).toContain('lane__horse--podium');
      expect(icons[1]!.classes()).toContain('lane__horse--podium');
      expect(icons[2]!.classes()).toContain('lane__horse--podium');
      expect(icons[3]!.classes()).not.toContain('lane__horse--podium');
    });
  });

  describe('running state (--running class)', () => {
    it('applies running class to every horse while animating', () => {
      setupTrack({ status: 'running', withLineup: true, animating: true });
      const wrapper = mount(RaceTrack);
      const icons = wrapper.findAll('.lane__horse');

      expect(icons).toHaveLength(4);
      icons.forEach((icon) => {
        expect(icon.classes()).toContain('lane__horse--running');
      });
    });

    it('drops running class from a horse as soon as it finishes', () => {
      setupTrack({
        status: 'running',
        withLineup: true,
        animating: true,
        finishedHorseIds: [1],
      });
      const wrapper = mount(RaceTrack);
      const icons = wrapper.findAll('.lane__horse');

      expect(icons[0]!.classes()).not.toContain('lane__horse--running');
      expect(icons[1]!.classes()).toContain('lane__horse--running');
    });

    it('does not apply running class when lineup exists but not animating', () => {
      setupTrack({ status: 'scheduled', withLineup: true });
      const wrapper = mount(RaceTrack);
      const icons = wrapper.findAll('.lane__horse');

      icons.forEach((icon) => {
        expect(icon.classes()).not.toContain('lane__horse--running');
      });
    });
  });

  describe('header round title', () => {
    it('shows the displayed round even after the lineup is cleared', () => {
      setupTrack({ status: 'finished', withResult: true });
      const wrapper = mount(RaceTrack);

      // No lineup, but `displayedRound` still points at the last round —
      // the header keeps showing it instead of collapsing to "Awaiting race".
      expect(wrapper.text()).toContain('Round 1');
      expect(wrapper.text()).toContain('1200m');
    });
  });

  // File snapshots for the three visually distinct track states. The full
  // `.html()` is too large for inline snapshots but each one locks a concrete
  // visual contract (empty → starting grid → podium). Update via `vitest -u`
  // when the template or styling intentionally changes.
  describe('snapshots', () => {
    it('empty state', () => {
      setupTrack({ status: 'idle' });
      const wrapper = mount(RaceTrack);

      expect(wrapper.html()).toMatchSnapshot();
    });

    it('lineup at the start line (scheduled)', () => {
      setupTrack({ status: 'scheduled', withLineup: true });
      const wrapper = mount(RaceTrack);

      expect(wrapper.html()).toMatchSnapshot();
    });

    it('podium view after round finishes', () => {
      setupTrack({ status: 'paused', withLineup: true, withResult: true });
      const wrapper = mount(RaceTrack);

      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});
