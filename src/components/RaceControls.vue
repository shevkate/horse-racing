<script setup lang="ts">
import { computed } from 'vue';

import { useRaceStore } from '@/stores/race';
import type { RaceStatus } from '@/types';

const raceStore = useRaceStore();

// UI mirrors the spec's two-button layout exactly: one Generate, one
// Start/Pause toggle. The toggle's label swaps based on current status.

const statusLabels: Record<RaceStatus, string> = {
  idle: 'Ready',
  scheduled: 'Schedule ready',
  running: 'Race in progress',
  paused: 'Paused',
  finished: 'Race finished',
};
const statusLabel = computed(() => statusLabels[raceStore.status]);

// Generate is always available except mid-race — pausing first is fine,
// since Generate itself resets the in-flight state cleanly via anim.reset().
const generateDisabled = computed(() => raceStore.status === 'running');

// Toggle label tracks the transition the click would cause:
//   scheduled/paused        → "Start" (idle state for the toggle)
//   running + animating     → "Running" (disabled — pause only takes
//                                        effect between rounds)
//   running + !animating    → "Pause"  (between-rounds window)
// Showing "Running" instead of a disabled "Pause" avoids the label
// flickering between the same text across enabled/disabled states and
// reads as a more honest explanation of why the click does nothing.
const toggleLabel = computed(() => {
  if (raceStore.status !== 'running') return 'Start';
  return raceStore.animating ? 'Running' : 'Pause';
});

// Disabled when there's nothing to start (no schedule or race over), and
// mid-round while animating — pause only has an effect between rounds, so
// we surface that as the button being inert during the animation itself.
const toggleDisabled = computed(
  () =>
    raceStore.status === 'idle' ||
    raceStore.status === 'finished' ||
    (raceStore.status === 'running' && raceStore.animating),
);

// Primary ring highlights the "next expected action" — start after Generate,
// resume after Pause. Not shown on the Pause label itself.
const togglePrimary = computed(
  () => raceStore.status === 'scheduled' || raceStore.status === 'paused',
);
</script>

<template>
  <div class="controls">
    <span class="controls__status" data-testid="race-status" :data-status="raceStore.status">
      <span class="controls__status-dot" :data-status="raceStore.status" />
      {{ statusLabel }}
    </span>

    <div class="controls__buttons">
      <button
        type="button"
        data-testid="btn-generate"
        :disabled="generateDisabled"
        @click="raceStore.createSchedule()"
      >
        Generate
      </button>

      <button
        type="button"
        data-testid="btn-toggle"
        :data-action="toggleLabel.toLowerCase()"
        :class="{ primary: togglePrimary }"
        :disabled="toggleDisabled"
        @click="raceStore.toggleRace()"
      >
        {{ toggleLabel }}
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
