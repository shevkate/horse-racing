// Central registry of SVG icons. Each icon is imported as a raw string
// (see Vite's `?raw` query) so the component can inline the markup and
// apply `currentColor` / sizing through parent CSS.
//
// Adding a new icon:
//   1. Drop `my-icon.svg` into this directory. Ensure the root <svg> uses
//      `fill="currentColor"` (not a hardcoded color) so consumers can tint it.
//   2. Import it below and add an entry to `ICONS` under a kebab-case key.
//   3. Its key is now a member of `IconName` and is usable everywhere.

import horseRunning from './horse-running.svg?raw';

export const ICONS = {
  'horse-running': horseRunning,
} as const;

export type IconName = keyof typeof ICONS;
