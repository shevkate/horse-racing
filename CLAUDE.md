# CLAUDE.md

Project-specific guidance for Claude Code / agentic sessions working on this
repo. User-facing docs live in [README.md](README.md); this file captures the
*why* behind the architecture and the conventions that aren't obvious from
reading the code.

## Product in one paragraph

A horse racing simulator. The user generates a schedule (six rounds × ten
horses drawn from a 20-horse roster), then starts a race. Each round's
winner is decided by `condition + random` (pure function in
`src/utils/runRound.ts`); the CSS-animated track visualises the result with
durations proportional to each horse's score. Pause freezes auto-advance
between rounds; Resume picks up from the next round.

## Architectural decisions

### Store stays pure, composable owns the engine

`stores/race.ts` holds domain state only — horses, schedule, results,
`currentRound`, `status`. It does **not** hold timers, animation frames, or
anything time-dependent.

`composables/useRaceAnimation.ts` is a module-level singleton that owns:

- `currentAnimation` ref — the per-horse lineup (lane, color, progress, etc.)
- `animating` ref — true while a round's CSS transition is running
- `pendingTimers: Set<ReturnType<typeof setTimeout>>` — every live timer
- `generation: number` — incremented on reset; stale generations noop

The store's `_playLoop` is a while loop over the schedule that calls
`anim.playRound()` then `anim.wait(BETWEEN_ROUNDS_MS)`. The composable's
methods return `null` when aborted, which the loop reads as "bail out."

**Why this split:** tests can patch the store without booting timers; the
animation engine can be reset in isolation; domain logic is trivially
serialisable.

### Cancellation safety via tracked timers + generation counter

Every `setTimeout` gets tracked in the `Set` and cleared in `reset()`. Every
async that crosses an `await` boundary checks the current generation before
continuing. This means **you should never introduce a bare `setTimeout` or
unchecked `await new Promise`** — use the composable's `wait(ms)` helper,
which handles both.

### SVG lives in `src/assets/icons/*.svg`, not in components

`HorseIcon.vue` is a thin wrapper (variant + color + label props). The
actual markup is loaded via `?raw` from `assets/icons/` and rendered with
`v-html`. To add a new icon: drop the SVG in, register it in
`assets/icons/index.ts`, pick it via the `variant` prop. `fill="currentColor"`
makes `color` work.

### Animation timings in `src/constants/animation.ts`

Magic numbers for animation (inter-round pause, pre-roll, meters/second)
live there. If you need to change tempo, change it once.

### `data-testid` is an explicit contract

Classes are for styling, testids are for tests. E2E and snapshot tests use
`[data-testid="…"]` exclusively. State attributes (`data-active`,
`data-podium`, `data-finished`) use `|| null` so Vue omits them when off —
that gives clean presence-check semantics (`[data-active]` matches only
when the state is on). **If you change a testid, update the E2E spec in the
same commit.**

### Shared panel chrome lives in `PanelCard`

`HorseList` / `RaceSchedule` / `RaceResults` render through `<PanelCard
title empty empty-message>`. Don't re-duplicate `.panel` / `.panel__title`
/ `.panel__empty` styles in new side panels — extend `PanelCard` if you
need new slots.

## Conventions

### Vue

- Composition API with `<script setup lang="ts">` everywhere
- Props typed via `defineProps<{…}>()`, not runtime declarations
- Prefer `computed` over methods for derived state — it caches and stays
  reactive
- `watchEffect` over `watch` unless you specifically need old-value access

### TypeScript

- Strict mode on; `any` is a code smell, prefer `unknown` + narrowing
- Domain types live in `src/types/`; component-local types stay inline
- Use `satisfies` over type assertions when you want inference + validation

### Testing

- One `describe` block per concern; `beforeEach` resets Pinia + the
  `useRaceAnimation` singleton (both are module-level)
- Stage state through public API only — `store.$patch(...)`,
  `anim.showLineup(...)`. Don't reach into private helpers.
- Use `it.each` with `satisfies` for state-matrix tests (see
  `RaceControls.spec.ts`)
- Snapshots: inline for small/readable markup, file-based for large
  (`__snapshots__/*.snap`)
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
and only when the rest is green. CI runs the full suite on every PR.

## Gotchas

- `useRaceAnimation()` is a **singleton**, not a factory. Calling it
  multiple times returns the same refs. In tests, always `anim.reset()` in
  `beforeEach` or state from the previous test leaks.
- `tsconfig.vitest.json` inherits from the app config — don't add
  `"lib": []` there or `.at()` and other ES2022 features break.
- `vite preview` serves the built bundle, so `npm run build` is required
  before `npm run test:e2e`. The `test:e2e` script handles this via
  `start-server-and-test`, but don't run `cypress run` directly without a
  build.

## What's intentionally not here

- **No Vuex.** Pinia replaces it — don't add it back.
- **No global CSS framework** (Tailwind, Bootstrap). Scoped styles + a
  small set of design tokens in `src/assets/base.css` is the whole system.
- **No Storybook.** The "visual testing" criterion is covered by snapshot
  tests; adding Storybook would be overkill for six components.
