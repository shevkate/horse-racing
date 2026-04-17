import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import RaceResults from '@/components/RaceResults.vue';
import { useRaceStore } from '@/stores/race';
import type { Horse, RoundResult } from '@/types';

const horses: Horse[] = [
  { id: 1, name: 'Thunderbolt', color: 'red', condition: 90 },
  { id: 2, name: 'Silver Wind', color: 'blue', condition: 70 },
  { id: 3, name: 'Golden Dust', color: 'green', condition: 55 },
  { id: 4, name: 'Night Dancer', color: 'purple', condition: 40 },
];

const results: RoundResult[] = [
  {
    round: 1,
    distance: 1200,
    items: [
      { horseId: 1, position: 1, score: 99 },
      { horseId: 2, position: 2, score: 88 },
      { horseId: 3, position: 3, score: 77 },
      { horseId: 4, position: 4, score: 66 },
    ],
  },
];

describe('RaceResults', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders empty state when results are empty', () => {
    const wrapper = mount(RaceResults);

    expect(wrapper.text()).toContain('No results yet. Start the race');
    expect(wrapper.findAll('.result')).toHaveLength(0);
  });

  it('renders results cards', () => {
    const store = useRaceStore();
    store.$patch({
      horses,
      results,
    });

    const wrapper = mount(RaceResults);

    expect(wrapper.findAll('.result')).toHaveLength(1);
    expect(wrapper.text()).toContain('Round 1');
    expect(wrapper.text()).toContain('1200m');
  });

  it('renders horse names and positions', () => {
    const store = useRaceStore();
    store.$patch({
      horses,
      results,
    });

    const wrapper = mount(RaceResults);
    const positions = wrapper.findAll('.place__position');
    const names = wrapper.findAll('.place__name');

    expect(positions[0].text()).toBe('1');
    expect(positions[1].text()).toBe('2');
    expect(positions[2].text()).toBe('3');
    expect(positions[3].text()).toBe('4');

    expect(names[0].text()).toBe('Thunderbolt');
    expect(names[1].text()).toBe('Silver Wind');
    expect(names[2].text()).toBe('Golden Dust');
    expect(names[3].text()).toBe('Night Dancer');
  });

  it('renders medals for podium places', () => {
    const store = useRaceStore();
    store.$patch({
      horses,
      results,
    });

    const wrapper = mount(RaceResults);
    const medals = wrapper.findAll('.place__medal').map((node) => node.text());

    expect(medals).toEqual(['🥇', '🥈', '🥉', '']);
  });

  it('marks podium places with special class', () => {
    const store = useRaceStore();
    store.$patch({
      horses,
      results,
    });

    const wrapper = mount(RaceResults);
    const places = wrapper.findAll('.place');

    expect(places[0].classes()).toContain('place--podium');
    expect(places[1].classes()).toContain('place--podium');
    expect(places[2].classes()).toContain('place--podium');
    expect(places[3].classes()).not.toContain('place--podium');
  });

  // Inline snapshot of a single result card — locks the medal/position/name
  // layout plus the podium data-attributes that E2E relies on. Small enough
  // to read at a glance; any diff here is a meaningful visual change.
  it('matches inline snapshot for a full result card', () => {
    const store = useRaceStore();
    store.$patch({ horses, results });

    const wrapper = mount(RaceResults);
    const card = wrapper.get('[data-testid="round-result"]');

    expect(card.html()).toMatchInlineSnapshot(`
      "<li data-v-98f9fb31="" class="result" data-testid="round-result" data-round="1">
        <div data-v-98f9fb31="" class="result__head"><span data-v-98f9fb31="" class="result__round">Round 1</span><span data-v-98f9fb31="" class="result__distance">1200m</span></div>
        <ol data-v-98f9fb31="" class="result__places">
          <li data-v-98f9fb31="" class="place place--podium" data-testid="place" data-position="1" data-podium="true"><span data-v-98f9fb31="" class="place__medal">🥇</span><span data-v-98f9fb31="" class="place__position">1</span><span data-v-98f9fb31="" class="place__name">Thunderbolt</span></li>
          <li data-v-98f9fb31="" class="place place--podium" data-testid="place" data-position="2" data-podium="true"><span data-v-98f9fb31="" class="place__medal">🥈</span><span data-v-98f9fb31="" class="place__position">2</span><span data-v-98f9fb31="" class="place__name">Silver Wind</span></li>
          <li data-v-98f9fb31="" class="place place--podium" data-testid="place" data-position="3" data-podium="true"><span data-v-98f9fb31="" class="place__medal">🥉</span><span data-v-98f9fb31="" class="place__position">3</span><span data-v-98f9fb31="" class="place__name">Golden Dust</span></li>
          <li data-v-98f9fb31="" class="place" data-testid="place" data-position="4"><span data-v-98f9fb31="" class="place__medal"></span><span data-v-98f9fb31="" class="place__position">4</span><span data-v-98f9fb31="" class="place__name">Night Dancer</span></li>
        </ol>
      </li>"
    `);
  });
});
