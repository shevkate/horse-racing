<script setup lang="ts">
import { computed } from 'vue';

import HorseIcon from '@/components/HorseIcon.vue';
import { useRaceStore } from '@/stores/race';
import type { RoundResult } from '@/types';

const raceStore = useRaceStore();

type ResultItem = RoundResult['items'][number];

const lastResult = computed(() => raceStore.results.at(-1));

const resultByHorseId = computed(() => {
  const map = new Map<number, ResultItem>();
  lastResult.value?.items.forEach((item) => map.set(item.horseId, item));
  return map;
});

/**
 * Enriches each animated horse with its podium position (1–3) once the round
 * is over. A single computed means the template never calls a lookup twice
 * per horse and keeps TypeScript happy without non-null assertions.
 */
const laneData = computed(() =>
  raceStore.currentAnimation.map((horse) => {
    const result = resultByHorseId.value.get(horse.horseId);
    const podiumPosition =
      !raceStore.animating && result && result.position <= 3 ? result.position : null;

    return { ...horse, podiumPosition };
  }),
);

/** Round currently animating; falls back to the last completed round when idle. */
const activeRound = computed(() => {
  const animRound = raceStore.currentAnimation.at(0)?.round;
  if (animRound != null) {
    return raceStore.schedule.find((r) => r.round === animRound) ?? null;
  }
  const last = lastResult.value;
  if (last) {
    return raceStore.schedule.find((r) => r.round === last.round) ?? null;
  }
  return null;
});
</script>

<template>
  <section class="track">
    <header class="track__header">
      <h2 class="track__title" data-testid="track-title">
        <span v-if="activeRound">Round {{ activeRound.round }} — {{ activeRound.distance }}m</span>
        <span v-else class="track__title--muted">Awaiting race</span>
      </h2>
    </header>

    <div class="track__lanes" data-testid="track-lanes">
      <div v-if="laneData.length === 0" class="track__empty" data-testid="track-empty">
        {{ raceStore.status === 'idle' ? 'Click Generate to load horses' : 'Preparing track…' }}
      </div>

      <div
        v-for="lane in laneData"
        :key="`${lane.round}-${lane.horseId}`"
        class="lane"
        data-testid="lane"
        :data-horse-id="lane.horseId"
        :data-finished="lane.finished || null"
      >
        <span class="lane__number">{{ lane.lane }}</span>

        <div class="lane__strip">
          <HorseIcon
            :class="[
              'lane__horse',
              {
                'lane__horse--running': raceStore.animating && !lane.finished,
                'lane__horse--podium': lane.podiumPosition !== null,
              },
            ]"
            :color="lane.color"
            :style="{
              left:
                lane.progress === 100
                  ? 'calc(100% - var(--horse-size) - var(--lane-pad))'
                  : 'var(--lane-pad)',
              transitionDuration: `${lane.duration}s`,
            }"
            :label="lane.name"
          />
          <span
            v-if="lane.podiumPosition !== null"
            class="lane__badge"
            data-testid="podium-badge"
            :data-position="lane.podiumPosition"
          >
            <span>#{{ lane.podiumPosition }}</span>
            {{ lane.name }}
          </span>
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
  gap: var(--space-xs, 6px);
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

/* single source of truth for all horse geometry.
   Change --horse-size here and the lane, the icon, and the finish offset
   (calc in inline style) all stay in sync! */
.lane__strip {
  --horse-size: 52px;
  --lane-pad: 4px;

  position: relative;
  height: var(--horse-size);
  background: repeating-linear-gradient(
    90deg,
    var(--track-lane) 0 20px,
    var(--track-lane-alt) 20px 40px
  );
  border-radius: var(--radius-sm);
  overflow: hidden;

  display: flex;
}

.lane__horse {
  position: absolute;
  top: 50%;
  left: var(--lane-pad);
  width: var(--horse-size);
  height: var(--horse-size);
  transform: translateY(-50%);
  transition-property: left;
  transition-timing-function: linear;
  will-change: left;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

@keyframes horse-run-bounce {
  0%,
  100% {
    transform: translateY(-50%) translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-50%) translateY(-3px) rotate(-2deg);
  }
}

.lane__horse--running {
  animation: horse-run-bounce 0.35s ease-in-out infinite;
  transform-origin: center;
}

.lane__horse--podium {
  filter: drop-shadow(0 0 10px var(--accent));
}

.lane__badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: var(--space-sm);
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
