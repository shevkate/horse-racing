<script setup lang="ts">
import { onMounted } from 'vue';

import HorseList from '@/components/HorseList.vue';
import RaceControls from '@/components/RaceControls.vue';
import RaceResults from '@/components/RaceResults.vue';
import RaceSchedule from '@/components/RaceSchedule.vue';
import RaceTrack from '@/components/RaceTrack.vue';
import { useRaceStore } from '@/stores/race';

const raceStore = useRaceStore();

onMounted(() => {
  raceStore.init();
});
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">🏇 Horse Racing</h1>
      <RaceControls />
    </header>

    <section class="page__grid">
      <aside class="page__side">
        <HorseList />
      </aside>

      <section class="page__main">
        <RaceTrack />
        <RaceResults />
      </section>

      <aside class="page__side">
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

.page__grid {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: var(--space-lg);
  align-items: start;
}

.page__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-height: 500px;
}

.page__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

@media (max-width: 1100px) {
  .page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
