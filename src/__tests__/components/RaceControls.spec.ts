import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import RaceControls from '@/components/RaceControls.vue';
import { useRaceStore } from '@/stores/race';
import type { RaceStatus } from '@/types';

const mountComponent = (status: RaceStatus) => {
  setActivePinia(createPinia());

  const store = useRaceStore();
  store.$patch({ status });

  return {
    store,
    wrapper: mount(RaceControls),
  };
};

describe('RaceControls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['idle', 'Ready'],
    ['scheduled', 'Schedule ready'],
    ['running', 'Race in progress'],
    ['finished', 'Race finished'],
  ] satisfies [RaceStatus, string][])('renders correct status label for %s', (status, label) => {
    const { wrapper } = mountComponent(status);

    expect(wrapper.text()).toContain(label);
    expect(wrapper.find('.controls__status-dot').attributes('data-status')).toBe(status);
  });

  it('enables only Generate button in idle state', () => {
    const { wrapper } = mountComponent('idle');
    const buttons = wrapper.findAll('button');

    expect(buttons[0].text()).toBe('Generate');
    expect(buttons[0].attributes('disabled')).toBeUndefined();
    expect(buttons[0].classes()).toContain('primary');

    expect(buttons[1].attributes('disabled')).toBeDefined();
    expect(buttons[2].attributes('disabled')).toBeDefined();
    expect(buttons[3].attributes('disabled')).toBeUndefined();
  });

  it('enables only Start button in scheduled state', () => {
    const { wrapper } = mountComponent('scheduled');
    const buttons = wrapper.findAll('button');

    expect(buttons[0].attributes('disabled')).toBeUndefined();
    expect(buttons[1].attributes('disabled')).toBeUndefined();
    expect(buttons[1].classes()).toContain('primary');
    expect(buttons[2].attributes('disabled')).toBeDefined();
    expect(buttons[3].attributes('disabled')).toBeUndefined();
  });

  it('enables only Next round button in running state and disables Generate', () => {
    const { wrapper } = mountComponent('running');
    const buttons = wrapper.findAll('button');

    expect(buttons[0].attributes('disabled')).toBeDefined();
    expect(buttons[1].attributes('disabled')).toBeDefined();
    expect(buttons[2].attributes('disabled')).toBeUndefined();
    expect(buttons[2].classes()).toContain('primary');
    expect(buttons[3].attributes('disabled')).toBeUndefined();
  });

  it('marks Reset button as active in finished state', () => {
    const { wrapper } = mountComponent('finished');
    const buttons = wrapper.findAll('button');

    expect(buttons[0].attributes('disabled')).toBeUndefined();
    expect(buttons[1].attributes('disabled')).toBeDefined();
    expect(buttons[2].attributes('disabled')).toBeDefined();
    expect(buttons[3].attributes('disabled')).toBeUndefined();
    expect(buttons[3].classes()).toContain('primary');
  });

  it('calls createSchedule on Generate click', async () => {
    setActivePinia(createPinia());
    const store = useRaceStore();
    store.$patch({ status: 'idle' });
    const spy = vi.spyOn(store, 'createSchedule');

    const wrapper = mount(RaceControls);

    await wrapper.findAll('button')[0].trigger('click');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calls startRace on Start click', async () => {
    setActivePinia(createPinia());
    const store = useRaceStore();
    store.$patch({ status: 'scheduled' });
    const spy = vi.spyOn(store, 'startRace');

    const wrapper = mount(RaceControls);

    await wrapper.findAll('button')[1].trigger('click');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calls runNextRound on Next round click', async () => {
    setActivePinia(createPinia());
    const store = useRaceStore();
    store.$patch({ status: 'running' });
    const spy = vi.spyOn(store, 'runNextRound');

    const wrapper = mount(RaceControls);

    await wrapper.findAll('button')[2].trigger('click');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calls resetRace on Reset click', async () => {
    setActivePinia(createPinia());
    const store = useRaceStore();
    store.$patch({ status: 'finished' });
    const spy = vi.spyOn(store, 'resetRace');

    const wrapper = mount(RaceControls);

    await wrapper.findAll('button')[3].trigger('click');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
