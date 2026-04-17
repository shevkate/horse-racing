# CLAUDE.md

Project-specific guidance for Claude Code / agentic sessions working on this
repo. User-facing docs live in [README.md](README.md); this file captures the
*why* behind the architecture and the conventions that aren't obvious from
reading the code.

## Product in one paragraph

A horse racing simulator. The user generates a schedule (six rounds × ten
horses drawn from a 20-horse roster), then starts a race. Each round's
winner is decided by `condition + random * 100` (pure function in
`src/utils/runRound.ts`); the CSS-animated track visualises the result
with durations proportional to each horse's score. Pause freezes
auto-advance between rounds; Resume picks up from the next round.
<kbd>Space</kbd> toggles Start/Pause outside form controls.

## Architectural decisions

### Two-store split: domain vs. animation

`stores/race.ts` owns domain state: `horses`, `schedule`, `results`,
`currentRound`, `status`, `displayedRoundNumber`. No timers, no animation
frames, no `Date.now()`.

`stores/animation.ts` owns the engine:

- `currentAnimation` ref — the per-horse lineup (lane, color, progress, …)
- `animating` ref — true while a round's CSS transition is running
- `pendingTimers: Set<ReturnType<typeof setTimeout>>` — every live timer
- `generation: number` — incremented on reset; stale generations noop

`race.ts` imports `useAnimationStore` and re-exports `currentAnimation` /
`animating` via `storeToRefs` so consumers see one store. The store's
`_playLoop` is a while loop over the schedule that calls
`anim.playRound()` then `anim.wait(BETWEEN_ROUNDS_MS)`. Those methods
return `null`/`false` when aborted, which the loop reads as "bail out."

**Why a store rather than a module-level singleton:** Pinia gives us
per-test isolation via `setActivePinia(createPinia())` — no more
`.reset()` dance in `beforeEach`, no cross-test state leakage.

### Cancellation safety via tracked timers + generation counter

Every `setTimeout` gets tracked in the `Set` and cleared in `reset()`.
Every async that crosses an `await` boundary checks the current
generation before continuing. This means **you should never introduce a
bare `setTimeout` or unchecked `await new Promise`** — use
`anim.wait(ms)`, which handles both.

### `displayedRoundNumber` is explicit state, not a fallback chain

`RaceTrack`'s header reads `raceStore.displayedRound`, which is a
`computed` over `displayedRoundNumber`. The store sets that number
explicitly in `createSchedule` (preview round) and `_playLoop` (per
tick). Don't reintroduce a "lineup → lastResult → schedule[0]" fallback
chain in the component — keep the state single-source.

### SVG lives in `src/assets/icons/*.svg`, not in components

`HorseIcon.vue` is a thin wrapper (variant + color + label props). The
actual markup is loaded via `?raw` from `assets/icons/` and rendered
with `v-html`. Input is a build-time import (never user data), so
`v-html` is safe here. To add a new icon: drop the SVG in, register it
in `assets/icons/index.ts`, pick it via the `variant` prop.
`fill="currentColor"` makes `color` work.

### Design tokens in `src/assets/theme.css`

Colors, spacing, radii, shadows, **and track geometry** (`--horse-size`,
`--lane-pad`, `--horse-bounce-duration`) live in `theme.css`. Lane CSS,
horse-icon sizing, and bounce keyframes all read from the same
variables, so one edit keeps them aligned. Also contains the `.sr-only`
utility used by the live-region announcer.

### Animation timings in `src/constants/animation.ts`

Magic numbers for animation (inter-round pause, pre-roll, meters/second)
live there. If you need to change tempo, change it once.

### `data-testid` is an explicit contract

Classes are for styling, testids are for tests. E2E and snapshot tests
use `[data-testid="…"]` exclusively for locating components. State
attributes (`data-active`, `data-podium`, `data-finished`) use `|| null`
so Vue omits them when off — that gives clean presence-check semantics
(`[data-active]` matches only when the state is on). **If you change a
testid, update the E2E spec in the same commit.**

### Shared panel chrome lives in `PanelCard`

`HorseList` / `RaceSchedule` / `RaceResults` render through `<PanelCard
title empty empty-message>`. Don't re-duplicate `.panel` / `.panel__title`
/ `.panel__empty` styles in new side panels — extend `PanelCard` if you
need new slots.

### Accessibility triad

- **`prefers-reduced-motion`** (in `RaceTrack.vue`) disables only the
  bounce keyframe. The linear `left` transition stays — killing it would
  make horses teleport while JS still waits the full duration, leaving
  a static track.
- **Live region** in `App.vue` (`role="status" aria-live="polite"`) names
  round winners + the "Race finished." terminal message.
- **<kbd>Space</kbd> shortcut** in `App.vue` calls `toggleRace()`. The
  handler skips when the focus target is `BUTTON`/`INPUT`/`TEXTAREA`/
  `SELECT` so buttons aren't double-fired.

## Conventions

### Vue

- Composition API with `<script setup lang="ts">` everywhere
- Props typed via `defineProps<{…}>()`, not runtime declarations
- Prefer `computed` over methods for derived state — it caches and stays
  reactive (see `RaceSchedule.vue`'s `horseNamesByRound` Map)
- `watchEffect` over `watch` unless you specifically need old-value access

### TypeScript

- Strict mode on; `any` is a code smell, prefer `unknown` + narrowing
- Domain types live in `src/types/`; component-local types stay inline
- Use `satisfies` over type assertions when you want inference + validation

### Testing

- Pinia is reset per test via `setActivePinia(createPinia())`. **Do not**
  add manual `.reset()` calls on the animation store in `beforeEach` —
  fresh-per-test instances make that obsolete.
- Stage state through public API only — `store.$patch(...)`,
  `anim.showLineup(...)`. Don't reach into private helpers.
- Use `it.each` with `satisfies` for state-matrix tests (see
  `RaceControls.spec.ts`)
- Snapshots: a global serializer in `src/__tests__/setup.ts` strips
  scoped-CSS `data-v-*` hashes so style-only edits don't rewrite every
  snapshot file.
- E2E uses condition-based waits (`should('contain', …)`), never
  `cy.wait(ms)`

### Commits

- Incremental, single-concern commits. The final story should read as a
  sequence of reviewable diffs.
- Conventional-commit prefix: `feat:` / `fix:` / `refactor:` / `test:` /
  `docs:` / `chore:` / `ci:`
- Bodies explain *why*, not *what* — the diff already shows what changed

## Workflow expectations

Before declaring anything "done":

```bash
npm run type-check && npm run lint && npm run test:unit && npm run build
npm run test:e2e   # runs against built preview; ~2 minutes
```

E2E is slow (real CSS transitions, ~30s per full race), so run it last
and only when the rest is green. CI runs **ci** and **e2e** as parallel
jobs on every PR.

## Gotchas

- Pinia auto-unwraps refs on store instances. Inside the store's setup
  function you write `generation.value++`; from a consumer you write
  `anim.animating = true` (no `.value`). Destructuring a store drops
  reactivity — use `storeToRefs(store)` if you need refs out.
- `tsconfig.vitest.json` inherits from the app config — don't add
  `"lib": []` there or `.at()` and other ES2022 features break.
- `vite preview` serves the built bundle, so `npm run build` is required
  before `npm run test:e2e`. The `test:e2e` script handles this via
  `start-server-and-test`, but don't run `cypress run` directly without
  a build.
- Generate is deliberately enabled in the `finished` state — it's the
  "play again" path in the 2-button layout. Don't "fix" this by
  disabling it.

## What's intentionally not here

- **No Vuex.** Pinia replaces it — don't add it back.
- **No global CSS framework** (Tailwind, Bootstrap). Scoped styles + the
  design tokens in `src/assets/theme.css` are the whole system.
- **No Storybook.** The "visual testing" criterion is covered by
  snapshot tests; adding Storybook would be overkill for six components.
- **No deterministic-seed RNG.** Each race is meant to be a fresh roll;
  a seed control would be test plumbing leaking into the UI.
