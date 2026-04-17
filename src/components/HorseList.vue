<script setup lang="ts">
import { useRaceStore } from '@/stores/race';

const raceStore = useRaceStore();
</script>

<template>
  <section class="panel">
    <h2 class="panel__title">Horses</h2>

    <ul v-if="raceStore.horses.length" class="list">
      <li v-for="horse in raceStore.horses" :key="horse.id" class="list__item">
        <span class="horse">
          <span
            class="horse__color"
            :style="{ backgroundColor: horse.color }"
            :aria-label="`Horse color ${horse.color}`"
            role="img"
          />
          <span class="horse__name">{{ horse.name }}</span>
        </span>

        <span
          class="horse__condition"
          role="progressbar"
          :aria-valuenow="horse.condition"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${horse.name} condition`"
        >
          <span class="horse__bar" :style="{ width: `${horse.condition}%` }" />
          <span class="horse__value">{{ horse.condition }}</span>
        </span>
      </li>
    </ul>

    <p v-else class="panel__empty">No horses generated yet</p>
  </section>
</template>

<style scoped>
.panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  box-shadow: var(--shadow-panel);
}

.panel__title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent);
  margin-bottom: var(--space-md);
}

.panel__empty {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 70vh;
  overflow-y: auto;
}

.list__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
  padding: 8px 4px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
}

.list__item:last-child {
  border-bottom: none;
}

.horse {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.horse__color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.horse__name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.horse__condition {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 18px;
  border-radius: 999px;
  background: var(--bg-track-fill);
  overflow: hidden;
}

.horse__bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--condition-low) 0%,
    var(--condition-mid) 50%,
    var(--condition-high) 100%
  );
  background-size: 120px 100%;
  transition: width 0.3s ease;
}

.horse__value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  pointer-events: none;
}
</style>
