<script setup lang="ts">
import PanelCard from '@/components/PanelCard.vue';
import { useRaceStore } from '@/stores/race';

const raceStore = useRaceStore();

const medalFor = (position: number): string => {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return '';
};
</script>

<template>
  <PanelCard
    title="Results"
    :empty="!raceStore.results.length"
    empty-message="No results yet. Start the race"
  >
    <ul class="list" data-testid="results-list">
      <li
        v-for="result in raceStore.results"
        :key="result.round"
        class="result"
        data-testid="round-result"
        :data-round="result.round"
      >
        <div class="result__head">
          <span class="result__round">Round {{ result.round }}</span>
          <span class="result__distance">{{ result.distance }}m</span>
        </div>

        <ol class="result__places">
          <li
            v-for="item in result.items"
            :key="item.horseId"
            class="place"
            :class="{ 'place--podium': item.position <= 3 }"
            data-testid="place"
            :data-position="item.position"
            :data-podium="item.position <= 3 || null"
          >
            <span class="place__medal">{{ medalFor(item.position) }}</span>
            <span class="place__position">{{ item.position }}</span>
            <span class="place__name">
              {{ raceStore.horseNameById.get(item.horseId) }}
            </span>
          </li>
        </ol>
      </li>
    </ul>
  </PanelCard>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

.result {
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
}

.result__head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
}

.result__round {
  color: var(--text-primary);
}

.result__distance {
  color: var(--accent);
}

.result__places {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.place {
  display: grid;
  grid-template-columns: 24px 24px 1fr;
  align-items: center;
  gap: var(--space-sm);
  padding: 3px 0;
  font-size: 12px;
}

.place--podium {
  font-weight: 600;
}

.place__medal {
  font-size: 14px;
}

.place__position {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.place__name {
  color: var(--text-primary);
}
</style>
