import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import RaceControls from '@/components/RaceControls.vue';
import { useAnimationStore } from '@/stores/animation';
import { useRaceStore } from '@/stores/race';
import type { RaceStatus } from '@/types';

// Two-button layout: Generate + Start/Pause toggle. Tests stage each race
// state and assert both the visual contract (labels, disabled flags,
// primary highlight) and the wiring to the store's two actions.

const mountComponent = (status: RaceStatus, opts: { animating?: boolean } = {}) => {
  setActivePinia(createPinia());
  const store = useRaceStore();
  store.$patch({ status });

  if (opts.animating) {
    useAnimationStore().animating = true;
  }

  return { store, wrapper: mount(RaceControls) };
};

describe('RaceControls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('status label rendering', () => {
    it.each([
      ['idle', 'Ready'],
      ['scheduled', 'Schedule ready'],
      ['running', 'Race in progress'],
      ['paused', 'Paused'],
      ['finished', 'Race finished'],
    ] satisfies [RaceStatus, string][])('renders "%s" label in %s state', (status, label) => {
      const { wrapper } = mountComponent(status);

      expect(wrapper.text()).toContain(label);
      expect(wrapper.find('[data-testid="race-status"]').attributes('data-status')).toBe(status);
    });
  });

  describe('toggle button label', () => {
    it.each([
      ['idle', 'Start'],
      ['scheduled', 'Start'],
      ['running', 'Pause'],
      ['paused', 'Start'],
      ['finished', 'Start'],
    ] satisfies [RaceStatus, string][])('shows "%s" label in %s state', (status, label) => {
      const { wrapper } = mountComponent(status);
      const toggle = wrapper.get('[data-testid="btn-toggle"]');

      expect(toggle.text()).toBe(label);
      expect(toggle.attributes('data-action')).toBe(label.toLowerCase());
    });
  });

  describe('enabled/disabled matrix', () => {
    // Encoded as a table so adding a new status only requires one row.
    // Columns: [generate enabled, toggle enabled]
    it.each([
      // status,      generate, toggle
      ['idle', true, false],
      ['scheduled', true, true],
      ['running', false, true], // mid-round disabled handled in separate test below
      ['paused', true, true],
      ['finished', true, false],
    ] satisfies [RaceStatus, boolean, boolean][])(
      'in %s: generate=%s, toggle=%s',
      (status, generateEnabled, toggleEnabled) => {
        const { wrapper } = mountComponent(status);
        const generate = wrapper.get('[data-testid="btn-generate"]');
        const toggle = wrapper.get('[data-testid="btn-toggle"]');

        expect(generate.attributes('disabled') === undefined).toBe(generateEnabled);
        expect(toggle.attributes('disabled') === undefined).toBe(toggleEnabled);
      },
    );

    it('disables toggle while a round is animating (mid-round pause is a no-op)', () => {
      const { wrapper } = mountComponent('running', { animating: true });
      const toggle = wrapper.get('[data-testid="btn-toggle"]');

      expect(toggle.attributes('disabled')).toBeDefined();
    });
  });

  describe('primary highlight', () => {
    it.each([
      ['scheduled', true],
      ['paused', true],
      ['idle', false],
      ['running', false],
      ['finished', false],
    ] satisfies [RaceStatus, boolean][])(
      'toggle primary=%s in %s state',
      (status, isPrimary) => {
        const { wrapper } = mountComponent(status);
        const toggle = wrapper.get('[data-testid="btn-toggle"]');

        expect(toggle.classes().includes('primary')).toBe(isPrimary);
      },
    );
  });

  describe('click handlers', () => {
    it('Generate click dispatches createSchedule', async () => {
      setActivePinia(createPinia());
      const store = useRaceStore();
      const spy = vi.spyOn(store, 'createSchedule').mockImplementation(() => {});

      const wrapper = mount(RaceControls);
      await wrapper.get('[data-testid="btn-generate"]').trigger('click');

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it.each(['scheduled', 'running', 'paused'] satisfies RaceStatus[])(
      'toggle click dispatches toggleRace (from %s)',
      async (status) => {
        setActivePinia(createPinia());
        const store = useRaceStore();
        store.$patch({ status });
        const spy = vi.spyOn(store, 'toggleRace').mockImplementation(() => {});

        const wrapper = mount(RaceControls);
        await wrapper.get('[data-testid="btn-toggle"]').trigger('click');

        expect(spy).toHaveBeenCalledTimes(1);
      },
    );
  });
});
