<script setup lang="ts">
import { computed } from 'vue';

import { useRaceStore } from '@/stores/race';
import type { RaceStatus } from '@/types';

const raceStore = useRaceStore();

const statusLabels: Record<RaceStatus, string> = {
  idle: 'Ready',
  scheduled: 'Schedule ready',
  running: 'Race in progress',
  paused: 'Paused',
  finished: 'Race finished',
}
const statusLabel = computed(() => statusLabels[raceStore.status])

const buttons = computed(() => [
  {
    label: 'Generate',
    active: raceStore.status === 'idle',
    disabled: raceStore.status === 'running' || raceStore.status === 'paused',
    handler: raceStore.createSchedule,
  },
  {
    label: 'Start',
    active: raceStore.status === 'scheduled',
    disabled: raceStore.status !== 'scheduled',
    handler: raceStore.startRace,
  },
  {
    label: 'Pause',
    active: raceStore.status === 'running',
    disabled: raceStore.status !== 'running',
    handler: raceStore.pauseRace,
  },
  {
    label: 'Resume',
    active: raceStore.status === 'paused',
    disabled: raceStore.status !== 'paused',
    handler: raceStore.resumeRace,
  },
  {
    label: 'Reset',
    active: raceStore.status === 'finished',
    disabled: false,
    handler: raceStore.resetRace,
  },
])
</script>

<template>
  <div class="controls">
    <span class="controls__status">
      <span class="controls__status-dot" :data-status="raceStore.status" />
      {{ statusLabel }}
    </span>

    <div class="controls__buttons">
      <button
        v-for="btn in buttons"
        :key="btn.label"
        type="button"
        :class="{ primary: btn.active }"
        :disabled="btn.disabled"
        @click="btn.handler()"
      >
        {{ btn.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.controls__buttons {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.controls__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.controls__status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-muted);
}

.controls__status-dot[data-status='running'] {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: pulse 1.2s ease-in-out infinite;
}

.controls__status-dot[data-status='scheduled'] {
  background: var(--accent);
}

.controls__status-dot[data-status='paused'] {
  background: var(--accent);
  opacity: 0.5;
}

.controls__status-dot[data-status='finished'] {
  background: var(--accent-danger);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
