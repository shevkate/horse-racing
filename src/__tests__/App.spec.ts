import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import App from '@/App.vue';
import { useRaceStore } from '@/stores/race';
import type { Horse, RoundResult } from '@/types';

const mountApp = () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(App, { global: { plugins: [pinia] } });
};

describe('App', () => {
  it('renders the game title', () => {
    const wrapper = mountApp();
    expect(wrapper.text()).toContain('Horse Racing');
  });

  it('renders all main sections', () => {
    const wrapper = mountApp();
    expect(wrapper.find('.page__header').exists()).toBe(true);
    expect(wrapper.find('.page__grid').exists()).toBe(true);
  });

  describe('screen-reader announcer', () => {
    it('mounts the live region with polite/atomic wiring', () => {
      const wrapper = mountApp();
      const region = wrapper.get('[data-testid="race-announcer"]');

      expect(region.attributes('role')).toBe('status');
      expect(region.attributes('aria-live')).toBe('polite');
      expect(region.attributes('aria-atomic')).toBe('true');
    });

    it('stays empty while no rounds have finished', () => {
      const wrapper = mountApp();
      expect(wrapper.get('[data-testid="race-announcer"]').text()).toBe('');
    });

    it('announces the round winner after a result is recorded', async () => {
      const wrapper = mountApp();
      const store = useRaceStore();

      const horses: Horse[] = [
        { id: 1, name: 'Thunder', color: 'red', condition: 90 },
        { id: 2, name: 'Storm', color: 'blue', condition: 70 },
      ];
      const result: RoundResult = {
        round: 2,
        distance: 1400,
        items: [
          { horseId: 1, position: 1, score: 150 },
          { horseId: 2, position: 2, score: 100 },
        ],
      };

      store.$patch({ horses, results: [result], status: 'running' });
      await wrapper.vm.$nextTick();

      expect(wrapper.get('[data-testid="race-announcer"]').text()).toBe(
        'Round 2 complete. Thunder won.',
      );
    });

    it('appends "Race finished" on the final round', async () => {
      const wrapper = mountApp();
      const store = useRaceStore();

      const horses: Horse[] = [
        { id: 1, name: 'Thunder', color: 'red', condition: 90 },
      ];
      const result: RoundResult = {
        round: 6,
        distance: 2200,
        items: [{ horseId: 1, position: 1, score: 180 }],
      };

      store.$patch({ horses, results: [result], status: 'finished' });
      await wrapper.vm.$nextTick();

      expect(wrapper.get('[data-testid="race-announcer"]').text()).toContain(
        'Race finished.',
      );
    });
  });

  describe('keyboard shortcut', () => {
    it('Space toggles the race when focus is outside interactive elements', () => {
      const wrapper = mountApp();
      const store = useRaceStore();
      const spy = vi.spyOn(store, 'toggleRace').mockImplementation(() => {});

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(spy).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    });

    it('Space does nothing when a button has focus (browser already triggers click)', () => {
      const wrapper = mountApp();
      const store = useRaceStore();
      const spy = vi.spyOn(store, 'toggleRace').mockImplementation(() => {});

      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      button.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));

      expect(spy).not.toHaveBeenCalled();

      button.remove();
      wrapper.unmount();
    });

    it('removes its listener on unmount', () => {
      const wrapper = mountApp();
      const store = useRaceStore();
      const spy = vi.spyOn(store, 'toggleRace').mockImplementation(() => {});

      wrapper.unmount();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
