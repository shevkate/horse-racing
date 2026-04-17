import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages deploy sets BASE_PATH=/horse-racing/ so asset URLs
  // resolve under the project subpath. Dev, local preview, and the
  // Cypress E2E preview all leave it unset, so they serve from root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
