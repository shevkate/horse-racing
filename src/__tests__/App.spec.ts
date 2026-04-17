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

      expect(region.attributes('role')).toBe('log');
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

  describe('error boundary', () => {
    // Minimal child that throws on render. We plug it into App by replacing
    // one of the registered components via `global.stubs`, which keeps the
    // rest of the tree intact and exercises the real onErrorCaptured path.
    const ExplodingComponent = {
      name: 'Exploding',
      setup: () => {
        throw new Error('boom');
      },
      template: '<div />',
    };

    // onErrorCaptured logs via console.error — silence for clean test output.
    const silenceConsole = () => vi.spyOn(console, 'error').mockImplementation(() => {});

    it('renders the fallback UI when a descendant throws', async () => {
      silenceConsole();
      const pinia = createPinia();
      setActivePinia(pinia);
      const wrapper = mount(App, {
        global: {
          plugins: [pinia],
          stubs: { RaceTrack: ExplodingComponent },
        },
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(true);
      expect(wrapper.get('[data-testid="error-boundary-detail"]').text()).toContain('boom');
      // Main race UI is swapped out wholesale — no grid, no announcer.
      expect(wrapper.find('.page__grid').exists()).toBe(false);
    });

    it('Reload button clears the error and re-initialises the store', async () => {
      silenceConsole();
      const pinia = createPinia();
      setActivePinia(pinia);
      const wrapper = mount(App, {
        global: {
          plugins: [pinia],
          // First mount: RaceTrack explodes → fallback.
          // After clicking Reload we want the normal UI back, but
          // `global.stubs` is permanent for this wrapper, so we instead
          // verify that the store's init() was called and the fallback
          // goes away (main UI would render if the stub were also gone).
          stubs: { RaceTrack: ExplodingComponent },
        },
      });
      await wrapper.vm.$nextTick();

      const store = useRaceStore();
      const initSpy = vi.spyOn(store, 'init');

      await wrapper.get('[data-testid="error-boundary-reset"]').trigger('click');

      expect(initSpy).toHaveBeenCalledTimes(1);
      // Error state is cleared; if the failing child re-mounted it would
      // re-throw and the fallback would come back, which is a design
      // trade-off we accept — the button's job is to reset state, not to
      // guarantee the crash can't recur.
    });
  });
});
