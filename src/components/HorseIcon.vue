<script setup lang="ts">
import { computed } from 'vue';

import { ICONS, type IconName } from '@/assets/icons';

// Presentational component: takes an icon name + a color, renders the SVG.
// The SVG markup itself lives in `src/assets/icons/*.svg` — the component
// only handles sizing, accessibility, and `currentColor` tinting.
const props = withDefaults(
  defineProps<{
    /** Which horse icon to render. Defaults to the running pose. */
    variant?: IconName;
    /** Any CSS color — applied via `currentColor` inside the SVG. */
    color: string;
    /** Accessible label. Omit for purely decorative usage. */
    label?: string;
  }>(),
  {
    variant: 'horse-running',
    label: undefined,
  },
);

const svgMarkup = computed(() => ICONS[props.variant]);
</script>

<template>
  <span
    class="horse-icon"
    :style="{ color }"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
    v-html="svgMarkup"
  />
</template>

<style scoped>
.horse-icon {
  display: inline-flex;
  line-height: 0;
}

/* SVG fills the wrapper span — consumers control size by setting width/height
   (or font-size with 1em fallback) on `.horse-icon`, no inner sizing needed.
   `:deep()` reaches past scoped boundaries because v-html injects raw markup. */
.horse-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
