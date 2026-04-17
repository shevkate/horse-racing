/// <reference types="cypress" />

// End-to-end smoke coverage for the whole race lifecycle. These tests run
// against the built app via `npm run test:e2e` and complement the unit tests
// by validating real browser rendering, CSS transitions, and user flow.
//
// Selector policy:
// - Use `[data-testid="..."]` exclusively for querying elements. Testids are
//   an explicit contract between the app and its tests — unlike classes they
//   don't move when someone restyles the UI.
// - Text assertions (`should('contain', ...)`) still target user-visible copy,
//   which is the thing we actually want to guarantee.
//
// Notes on timing:
// - A full 6-round race takes ~30s because CSS transitions are real. We do
//   the "wait to finish" assertion once in the full-flow test with a generous
//   timeout; the pause/resume test intentionally stays partial so the suite
//   doesn't balloon past a minute.
// - All waits are condition-based rather than `cy.wait(ms)`. That keeps tests
//   fast when the app is fast and robust when CI is slow.

const FULL_RACE_TIMEOUT = 60_000;

const testid = (id: string) => `[data-testid="${id}"]`;

describe('Horse Racing — initial state', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('renders the 20-horse roster and idle status', () => {
    cy.contains('h1', 'Horse Racing');
    cy.get(testid('horse-row')).should('have.length', 20);
    cy.get(testid('race-status')).should('contain', 'Ready');
  });

  it('shows empty states for schedule, results, and track', () => {
    cy.contains('No schedule. Click Generate');
    cy.contains('No results yet');
    cy.get(testid('track-title')).should('contain', 'Awaiting race');
    cy.get(testid('track-empty')).should('exist');
  });

  it('enables only Generate and Reset in idle state', () => {
    cy.get(testid('btn-generate')).should('be.enabled');
    cy.get(testid('btn-start')).should('be.disabled');
    cy.get(testid('btn-pause')).should('be.disabled');
    cy.get(testid('btn-resume')).should('be.disabled');
    cy.get(testid('btn-reset')).should('be.enabled');
  });
});

describe('Horse Racing — Generate', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
  });

  it('creates a 6-round schedule', () => {
    cy.get(testid('schedule-round')).should('have.length', 6);
    cy.get(testid('race-status')).should('contain', 'Schedule ready');
  });

  it('previews round 1 horses at the start line', () => {
    // Schedule is visible and round 1 is marked active.
    cy.get(`${testid('schedule-round')}[data-active]`)
      .should('have.length', 1)
      .and('contain', 'Round 1');
    // Track shows the round 1 title and 10 static lanes, no podium yet.
    cy.get(testid('track-title')).should('contain', 'Round 1');
    cy.get(testid('lane')).should('have.length', 10);
    cy.get(testid('podium-badge')).should('not.exist');
  });

  it('promotes Start to primary and disables Pause/Resume', () => {
    cy.get(testid('btn-start')).should('be.enabled').and('have.class', 'primary');
    cy.get(testid('btn-pause')).should('be.disabled');
    cy.get(testid('btn-resume')).should('be.disabled');
  });
});

describe('Horse Racing — full race flow', () => {
  it('runs all 6 rounds to completion and records results', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-start')).click();

    cy.get(testid('race-status')).should('contain', 'Race in progress');

    // Full 6-round race takes ~30s with inter-round pauses. Generous timeout.
    cy.get(testid('race-status'), { timeout: FULL_RACE_TIMEOUT }).should(
      'contain',
      'Race finished',
    );

    cy.get(testid('round-result')).should('have.length', 6);
    // Each result card should have top 3 podium markers rendered.
    cy.get(`${testid('place')}[data-podium]`).should('have.length', 18); // 6 rounds × 3 podium places
    cy.get(testid('btn-reset')).should('have.class', 'primary');
  });

  it('reset after finish returns to idle with empty schedule and results', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-start')).click();
    cy.get(testid('race-status'), { timeout: FULL_RACE_TIMEOUT }).should(
      'contain',
      'Race finished',
    );

    cy.get(testid('btn-reset')).click();

    cy.get(testid('race-status')).should('contain', 'Ready');
    cy.contains('No schedule. Click Generate');
    cy.contains('No results yet');
  });
});

describe('Horse Racing — pause and resume', () => {
  it('pause freezes status; resume picks up and finishes the race', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-start')).click();
    cy.get(testid('race-status')).should('contain', 'Race in progress');

    // Let the first round animate a bit, then pause.
    cy.get(testid('btn-pause')).click();
    cy.get(testid('race-status')).should('contain', 'Paused');

    // After pause, Resume becomes the primary and Pause is disabled.
    cy.get(testid('btn-resume')).should('be.enabled').and('have.class', 'primary');
    cy.get(testid('btn-pause')).should('be.disabled');

    // Resume and wait for the full race to finish.
    cy.get(testid('btn-resume')).click();
    cy.get(testid('race-status')).should('contain', 'Race in progress');
    cy.get(testid('race-status'), { timeout: FULL_RACE_TIMEOUT }).should(
      'contain',
      'Race finished',
    );

    cy.get(testid('round-result')).should('have.length', 6);
  });
});
