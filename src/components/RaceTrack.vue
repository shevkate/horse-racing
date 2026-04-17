<script setup lang="ts">
import { computed } from 'vue';

import { useRaceStore } from '@/stores/race';

const raceStore = useRaceStore();

const activeRound = computed(() => {
  const index = raceStore.currentRound;
  return raceStore.schedule[index] ?? raceStore.schedule[index - 1] ?? null;
});

const lanes = computed(() => {
  if (!activeRound.value) return [];

  return activeRound.value.horseIds.map((horseId, index) => {
    const horse = raceStore.horses.find((item) => item.id === horseId);

    return {
      lane: index + 1,
      horseId,
      name: horse?.name ?? '',
      color: horse?.color ?? '#888',
    };
  });
});
</script>

<template>
  <section class="track">
    <header class="track__header">
      <h2 class="track__title">
        <span v-if="activeRound">
          Round {{ activeRound.round }} — {{ activeRound.distance }}m
        </span>
        <span v-else class="track__title--muted">Awaiting race</span>
      </h2>
    </header>

    <div class="track__lanes">
      <div v-if="lanes.length === 0" class="track__empty">Generate a schedule to see the track</div>

      <div v-for="lane in lanes" :key="lane.horseId" class="lane">
        <span class="lane__number">{{ lane.lane }}</span>

        <div class="lane__strip">
          <span class="lane__horse" :style="{ backgroundColor: lane.color }" :title="lane.name" />
        </div>

        <span class="lane__finish" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.track {
  background: linear-gradient(180deg, var(--track-grass) 0%, var(--track-grass-stripe) 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-panel);
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.track__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track__title {
  font-size: 18px;
  color: var(--text-primary);
}

.track__title--muted {
  color: var(--text-secondary);
}

.track__lanes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.track__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--text-secondary);
  font-style: italic;
}

.lane {
  display: grid;
  grid-template-columns: 28px 1fr 4px;
  align-items: center;
  gap: var(--space-sm);
}

.lane__number {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-align: center;
}

.lane__strip {
  position: relative;
  height: 32px;
  background: repeating-linear-gradient(
    90deg,
    var(--track-lane) 0 20px,
    var(--track-lane-alt) 20px 40px
  );
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.lane__horse {
  position: absolute;
  top: 50%;
  left: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.3);
  transform: translateY(-50%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.lane__finish {
  width: 4px;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    var(--track-finish) 0 6px,
    var(--text-primary) 6px 12px
  );
  border-radius: 2px;
}
</style>
