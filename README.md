# Horse Racing Game

A browser-based horse racing simulator. Twenty horses compete across a
randomly generated six-round schedule; each horse rides in ten rounds.
Round winners are chosen by a condition-weighted score and visualised as
a CSS-animated track race.

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript** (strict)
- **Pinia** — state management (two setup stores: domain + animation)
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

## Gameplay

Two buttons drive the whole app:

- **Generate** — build a fresh 6-round schedule and show the round-1
  lineup at the start line. Callable from any non-running state
  (including `finished`, which is how you "play again").
- **Start / Pause** — single toggle. `scheduled → running` starts the
  race; `running → paused` stops auto-advance between rounds;
  `paused → running` resumes from the next round.

**Keyboard:** press <kbd>Space</kbd> anywhere outside a button/input to
toggle Start/Pause.

## Architecture at a glance

```
src/
├── components/            # Vue components (RaceTrack, RaceControls, PanelCard, …)
├── stores/
│   ├── race.ts            # Domain store — horses, schedule, results, status
│   └── animation.ts       # Animation engine — lineup, timers, generation counter
├── utils/
│   ├── runRound.ts            # Pure: round → RoundResult (condition + random)
│   ├── resolveRoundHorses.ts  # Shared lookup used by both store and engine
│   ├── generateHorses.ts      # Boot-time horse roster
│   └── generateSchedule.ts    # 6-round schedule generator
├── constants/animation.ts # Animation timings in one place
├── assets/
│   ├── theme.css          # Design tokens (colors, spacing, track geometry)
│   └── icons/             # SVG icons loaded via `?raw`
├── types/                 # Shared domain types
└── __tests__/             # Unit + snapshot tests (mirrors src/)
```

**Separation of concerns.** `race.ts` owns *what* should happen — horses,
schedule, results, `status`, `currentRound`, `displayedRoundNumber`.
`animation.ts` owns *when pixels move* — the per-horse lineup, the
`animating` flag, every live timer, and the generation counter used for
cancellation. `race.ts` imports `animation.ts`, not the other way round;
components never reach past `race.ts` for state it already re-exports.

**Cancellation safety.** The animation store tracks every pending
`setTimeout` in a `Set` and increments a generation counter on
`reset()`. Async tasks that wake up on a stale generation noop, so
pause/resume and mid-race reset are race-condition-free. Use
`anim.wait(ms)` instead of a bare `setTimeout` — it does both.

## Accessibility

- **`prefers-reduced-motion`** — the horse-bounce keyframe is disabled;
  the linear `left` transition (the race itself) stays so there's still
  something to watch.
- **Live region** — an `aria-live="polite"` status announcer names the
  winner of each completed round and the final "Race finished." line.
- **Keyboard shortcut** — <kbd>Space</kbd> toggles Start/Pause outside
  form controls.

## Testing

- **Unit** — every component, both stores, `runRound`, and the schedule
  helpers. Tests stage state through the public API (store `$patch`,
  `animation.showLineup(...)`), not private helpers.
- **Snapshots** — markup snapshots for `HorseIcon`, `RaceResults`, and
  three `RaceTrack` states (empty / lineup / podium). A global
  serializer (`src/__tests__/setup.ts`) strips scoped-CSS `data-v-*`
  hashes so snapshots don't rot on style edits.
- **E2E** — one Cypress spec drives the full lifecycle (Generate →
  Start → Pause → Resume → Finish → Reset). Selectors go through
  `[data-testid="…"]` rather than CSS classes.

Run everything:

```bash
npm run type-check && npm run lint && npm run test:unit && npm run build && npm run test:e2e
```

## CI

GitHub Actions runs two parallel jobs on every PR to `main`:

- **ci** — lint, type-check, unit tests, build.
- **e2e** — Cypress against the built bundle via
  [`cypress-io/github-action`](https://github.com/cypress-io/github-action).

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
