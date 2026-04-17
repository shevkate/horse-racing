# Horse Racing Game

A browser-based horse racing simulator. Twenty horses compete across a
randomly generated six-round schedule, each horse rides in ten rounds;
round winners are chosen by a condition-weighted score and visualised as a
CSS-animated track race.

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript** (strict)
- **Pinia** — state management
- **Vitest** + **@vue/test-utils** — unit + snapshot tests
- **Cypress** — end-to-end tests
- **Vite** — dev server / build
- **ESLint** + **Prettier** + **oxlint** — linting & formatting

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

### Scripts

| Command                   | What it does                                   |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Vite dev server with HMR                       |
| `npm run build`           | Production build (runs type-check in parallel) |
| `npm run preview`         | Serve the built bundle locally                 |
| `npm run test:unit`       | Run Vitest once                                |
| `npm run test:unit:watch` | Vitest in watch mode                           |
| `npm run test:e2e`        | Cypress against the built app (headless)       |
| `npm run test:e2e:dev`    | Cypress interactive runner against dev server  |
| `npm run lint`            | oxlint + eslint                                |
| `npm run lint:fix`        | Same, with autofix                             |
| `npm run format`          | Prettier write                                 |
| `npm run type-check`      | `vue-tsc --build`                              |

## Architecture at a glance

```
src/
├── components/       # Vue components (RaceTrack, RaceControls, PanelCard, …)
├── stores/race.ts    # Pinia store — pure domain state (horses, schedule, results, status)
├── composables/
│   └── useRaceAnimation.ts   # Module-level singleton: timers, lineup, animating ref
├── utils/runRound.ts         # Pure function: round → RoundResult (condition-weighted RNG)
├── constants/animation.ts    # Animation timings in one place
├── assets/icons/             # SVG icons (horse-running.svg) loaded via `?raw`
├── types/                    # Shared domain types
└── __tests__/                # Unit and snapshot tests, mirror-structured
```

**Separation of concerns.** The store owns the domain (what should happen),
`useRaceAnimation` owns the engine (when pixels move, which timers run).
The two are wired together in the store's `_playLoop` but have no shared
mutable state — the composable exposes refs, the store reads them.

**Cancellation safety.** The animation engine tracks every pending
`setTimeout` in a `Set` and increments a generation counter on reset/pause.
Any in-flight async that wakes up on a stale generation noops. That keeps
pause/resume and mid-race reset race-condition-free.

## Testing

- **Unit** — every component, the store, the composable, `runRound`. Tests
  stage state through the public API (store patches + composable primitives),
  not private implementation details.
- **Snapshots** — markup snapshots for `HorseIcon`, `RaceResults`, and three
  `RaceTrack` states (empty / lineup / podium). Catches regressions in DOM
  structure, classes, and a11y attributes.
- **E2E** — one Cypress spec drives the full lifecycle (Generate → Start
  → Pause → Resume → Finish → Reset). All selectors go through
  `[data-testid="…"]` rather than CSS classes so restyles don't rot the suite.

Run everything:

```bash
npm run type-check && npm run lint && npm run test:unit && npm run build && npm run test:e2e
```

## CI

GitHub Actions runs lint + type-check + unit + build + E2E on every PR to
`main`. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
