<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';

import HorseList from '@/components/HorseList.vue';
import RaceControls from '@/components/RaceControls.vue';
import RaceResults from '@/components/RaceResults.vue';
import RaceSchedule from '@/components/RaceSchedule.vue';
import RaceTrack from '@/components/RaceTrack.vue';
import { useRaceStore } from '@/stores/race';

const raceStore = useRaceStore();

/**
 * Global Space shortcut → toggle race. Browsers already activate a focused
 * button when Space is pressed, so we only intercept when the event target
 * is NOT an interactive element — otherwise we'd fire `toggleRace` twice
 * (once via the keydown listener, once via the button's own click).
 */
const INTERACTIVE_TAGS = new Set(['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']);

const onKeydown = (event: KeyboardEvent): void => {
  if (event.code !== 'Space') return;
  const target = event.target as HTMLElement | null;
  if (target && INTERACTIVE_TAGS.has(target.tagName)) return;

  event.preventDefault(); // stop page scroll
  raceStore.toggleRace();
};

onMounted(() => {
  raceStore.init();
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});

/**
 * Screen-reader announcement for round completion. Reads out the winner
 * of the most-recently-completed round, or "Race finished" when every
 * round is done. Stays empty in idle/scheduled states so we don't chatter
 * at startup.
 */
const announcement = computed(() => {
  const last = raceStore.lastResult;
  if (!last) return '';

  const winner = last.items.find((item) => item.position === 1);
  const winnerName = winner ? raceStore.horseNameById.get(winner.horseId) : undefined;
  const roundText = winnerName
    ? `Round ${last.round} complete. ${winnerName} won.`
    : `Round ${last.round} complete.`;

  return raceStore.status === 'finished' ? `${roundText} Race finished.` : roundText;
});
</script>

<template>
  <main class="page">
    <!-- Off-screen live region: screen readers announce round winners and
         race completion without us having to steal focus. `role="log"` fits
         the "sequence of entries" UX of a race commentary better than
         `role="status"`, which semantically denotes a single current
         state ("Loading…") rather than a running narrative. `polite`
         queues each announcement after the current utterance instead of
         interrupting. `aria-atomic="true"` keeps the whole message read
         as one chunk even though only part of it changes between rounds. -->
    <div
      class="sr-only"
      role="log"
      aria-live="polite"
      aria-atomic="true"
      data-testid="race-announcer"
    >
      {{ announcement }}
    </div>

    <header class="page__header">
      <h1 class="page__title">🏇 Horse Racing</h1>
      <RaceControls />
    </header>

    <section class="page__grid">
      <aside class="page__side page__side--horses">
        <HorseList />
      </aside>

      <section class="page__main">
        <RaceTrack />
        <RaceResults />
      </section>

      <aside class="page__side page__side--schedule">
        <RaceSchedule />
      </aside>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 1600px;
  margin: 0 auto;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.page__title {
  font-size: 28px;
  letter-spacing: 0.04em;
}

/* Three layouts driven by two breakpoints. `grid-template-areas` keeps the
   DOM order stable while letting each breakpoint re-wire which panel sits
   where, so no duplication of markup per viewport.
   - Wide    (≥1100px): horses | track | schedule  (original 3-col layout)
   - Medium  (700-1099px): horses sidebar beside the track, schedule
     promoted to full-width below — HorseList is secondary reference data
     and shouldn't claim a full-width row of its own at this size.
   - Narrow  (<700px): single-column stack for phones. */
.page__grid {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  grid-template-areas: 'horses main schedule';
  gap: var(--space-lg);
  align-items: start;
}

.page__side--horses {
  grid-area: horses;
}

.page__main {
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-height: 500px;
}

.page__side--schedule {
  grid-area: schedule;
}

.page__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

@media (max-width: 1100px) {
  .page__grid {
    grid-template-columns: 200px 1fr;
    grid-template-areas:
      'horses main'
      'schedule schedule';
  }
}

@media (max-width: 700px) {
  .page__grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      'horses'
      'main'
      'schedule';
  }
}
</style>
