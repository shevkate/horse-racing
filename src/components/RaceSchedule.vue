<script setup lang="ts">
import { computed } from 'vue';

import PanelCard from '@/components/PanelCard.vue';
import { useRaceStore } from '@/stores/race';

const raceStore = useRaceStore();

// Pre-resolve "H1, H2, …" strings once per schedule/roster change.
// A method in the template re-ran on every render for every round;
// this keyed Map means the template does a single O(1) lookup per row.
const horseNamesByRound = computed(() => {
  const nameById = raceStore.horseNameById;
  return new Map(
    raceStore.schedule.map((round) => [
      round.round,
      round.horseIds
        .map((id) => nameById.get(id))
        .filter((name): name is string => Boolean(name))
        .join(', '),
    ]),
  );
});
</script>

<template>
  <PanelCard
    title="Race Schedule"
    :empty="!raceStore.schedule.length"
    empty-message="No schedule. Click Generate"
  >
    <ul class="list" data-testid="schedule-list">
      <li
        v-for="round in raceStore.schedule"
        :key="round.round"
        class="round"
        :class="{
          'round--active': round.round === raceStore.currentRound + 1,
          'round--done': round.round <= raceStore.currentRound,
        }"
        data-testid="schedule-round"
        :data-round="round.round"
        :data-active="round.round === raceStore.currentRound + 1 || null"
      >
        <div class="round__head">
          <span class="round__number">Round {{ round.round }}</span>
          <span class="round__distance">{{ round.distance }}m</span>
        </div>

        <p class="round__horses">{{ horseNamesByRound.get(round.round) }}</p>
      </li>
    </ul>
  </PanelCard>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.round {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.round--active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(245, 197, 24, 0.15);
}

.round--done {
  opacity: 0.5;
}

.round__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
}

.round__number {
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.round__distance {
  color: var(--accent);
}

.round__horses {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}
</style>
