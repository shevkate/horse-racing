import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import RaceControls from '@/components/RaceControls.vue';
import { useRaceStore } from '@/stores/race';
import type { RaceStatus } from '@/types';

// Button order in RaceControls.vue — kept as constants so tests stay readable
// and the indices are meaningful instead of magic numbers.
const BUTTON = {
  Generate: 0,
  Start: 1,
  Pause: 2,
  Resume: 3,
  Reset: 4,
} as const;

const mountComponent = (status: RaceStatus) => {
  setActivePinia(createPinia());
  const store = useRaceStore();
  store.$patch({ status });

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
      expect(wrapper.find('.controls__status-dot').attributes('data-status')).toBe(status);
    });
  });

  describe('button enabled/active matrix', () => {
    // For every status we know which button should be "primary" (active)
    // and which should be enabled. Encoding the expectation as a table
    // keeps the test compact and easy to update when buttons change.
    type Enabled = [boolean, boolean, boolean, boolean, boolean]; // [G, S, P, R, Reset]

    it.each([
      // status,       enabled flags,               primary label
      ['idle', [true, false, false, false, true], 'Generate'],
      ['scheduled', [true, true, false, false, true], 'Start'],
      ['running', [false, false, true, false, true], 'Pause'],
      ['paused', [false, false, false, true, true], 'Resume'],
      ['finished', [true, false, false, false, true], 'Reset'],
    ] satisfies [RaceStatus, Enabled, string][])(
      'in %s state: correct enabled buttons and active=%s',
      (status, enabled, primaryLabel) => {
        const { wrapper } = mountComponent(status);
        const buttons = wrapper.findAll('button');

        expect(buttons).toHaveLength(5);

        enabled.forEach((isEnabled, index) => {
          const disabledAttr = buttons[index]!.attributes('disabled');
          expect(disabledAttr === undefined).toBe(isEnabled);
        });

        const activeButton = buttons.find((btn) => btn.classes().includes('primary'));
        expect(activeButton?.text()).toBe(primaryLabel);
      },
    );
  });

  describe('click handlers', () => {
    // Each handler test: set the status that enables the button, spy on
    // the store action BEFORE mount (required — `buttons` computed captures
    // the handler references at mount time), then trigger the click.
    it.each([
      ['Generate', 'idle', BUTTON.Generate, 'createSchedule'],
      ['Start', 'scheduled', BUTTON.Start, 'startRace'],
      ['Pause', 'running', BUTTON.Pause, 'pauseRace'],
      ['Resume', 'paused', BUTTON.Resume, 'resumeRace'],
      ['Reset', 'finished', BUTTON.Reset, 'resetRace'],
    ] satisfies [
      string,
      RaceStatus,
      number,
      'createSchedule' | 'startRace' | 'pauseRace' | 'resumeRace' | 'resetRace',
    ][])('calls %s action on %s-state click', async (_, status, index, action) => {
      setActivePinia(createPinia());
      const store = useRaceStore();
      store.$patch({ status });
      const spy = vi.spyOn(store, action).mockImplementation(() => {});

      const wrapper = mount(RaceControls);

      await wrapper.findAll('button')[index]!.trigger('click');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
