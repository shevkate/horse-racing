import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import RaceSchedule from '@/components/RaceSchedule.vue';
import { useRaceStore } from '@/stores/race';
import type { Horse, RaceRound } from '@/types';

const horses: Horse[] = [
  { id: 1, name: 'Thunderbolt', color: 'red', condition: 90 },
  { id: 2, name: 'Silver Wind', color: 'blue', condition: 70 },
  { id: 3, name: 'Golden Dust', color: 'green', condition: 55 },
];

const schedule: RaceRound[] = [
  { round: 1, distance: 1200, horseIds: [1, 2] },
  { round: 2, distance: 1400, horseIds: [2, 3] },
];

describe('RaceSchedule', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders empty state when schedule is empty', () => {
    const wrapper = mount(RaceSchedule);

    expect(wrapper.text()).toContain('No schedule. Click Generate');
    expect(wrapper.findAll('.round')).toHaveLength(0);
  });

  it('renders schedule rounds', () => {
    const store = useRaceStore();
    store.$patch({
      horses,
      schedule,
      currentRound: 0,
    });

    const wrapper = mount(RaceSchedule);
    const rounds = wrapper.findAll('.round');

    expect(rounds).toHaveLength(2);
    expect(wrapper.text()).toContain('Round 1');
    expect(wrapper.text()).toContain('1200m');
    expect(wrapper.text()).toContain('Round 2');
    expect(wrapper.text()).toContain('1400m');
  });

  it('renders horse names for each round', () => {
    const store = useRaceStore();
    store.$patch({
      horses,
      schedule,
      currentRound: 0,
    });

    const wrapper = mount(RaceSchedule);
    const rounds = wrapper.findAll('.round');

    expect(rounds[0].text()).toContain('Thunderbolt');
    expect(rounds[0].text()).toContain('Silver Wind');
    expect(rounds[1].text()).toContain('Silver Wind');
    expect(rounds[1].text()).toContain('Golden Dust');
  });

  it('marks active and completed rounds correctly', () => {
    const store = useRaceStore();
    store.$patch({
      horses,
      schedule,
      currentRound: 1,
    });

    const wrapper = mount(RaceSchedule);
    const rounds = wrapper.findAll('.round');

    expect(rounds[0].classes()).toContain('round--done');
    expect(rounds[1].classes()).toContain('round--active');
  });
});
