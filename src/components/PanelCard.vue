<script setup lang="ts">
// Shared chrome for the three side panels (Horses / Schedule / Results).
// Each panel has the same visual wrapper: surface background, accent title,
// and a graceful empty state. This component owns that contract so the
// three call sites only care about their own content.
//
// Usage:
//   <PanelCard title="Horses" :empty="!horses.length" empty-message="…">
//     <ul>…</ul>
//   </PanelCard>
defineProps<{
  title: string;
  /** When true, `emptyMessage` is shown instead of the default slot. */
  empty?: boolean;
  emptyMessage?: string;
}>();
</script>

<template>
  <section class="panel">
    <h2 class="panel__title">{{ title }}</h2>

    <p v-if="empty" class="panel__empty">{{ emptyMessage }}</p>
    <slot v-else />
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
</style>
