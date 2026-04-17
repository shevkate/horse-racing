/// <reference types="cypress" />

// End-to-end smoke coverage for the whole race lifecycle. These tests run
// against the built app via `npm run test:e2e` and complement the unit tests
// by validating real browser rendering, CSS transitions, and user flow.
//
// Two-button UI (matches the assessment spec):
//   - [data-testid="btn-generate"]  — builds a fresh 6-round schedule;
//     doubles as reset (callable from any state except running).
//   - [data-testid="btn-toggle"]    — Start/Pause toggle. Label swaps via
//     [data-action="start" | "pause"] for readable assertions.
//
// Selector policy: `[data-testid="..."]` exclusively. Text assertions still
// target user-visible copy, which is the thing we actually want to guarantee.
//
// Timing: a full 6-round race takes ~40s because CSS transitions are real,
// plus the 3s between-rounds gap × 5. We do the "wait to finish" assertion
// once in the full-flow test with a generous timeout.

const FULL_RACE_TIMEOUT = 90_000;

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

  it('only Generate is enabled in idle state', () => {
    cy.get(testid('btn-generate')).should('be.enabled');
    cy.get(testid('btn-toggle')).should('be.disabled').and('contain', 'Start');
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
    cy.get(`${testid('schedule-round')}[data-active]`)
      .should('have.length', 1)
      .and('contain', 'Round 1');
    cy.get(testid('track-title')).should('contain', 'Round 1');
    cy.get(testid('lane')).should('have.length', 10);
    cy.get(testid('podium-badge')).should('not.exist');
  });

  it('promotes toggle to primary with "Start" label', () => {
    cy.get(testid('btn-toggle'))
      .should('be.enabled')
      .and('have.class', 'primary')
      .and('have.attr', 'data-action', 'start');
  });
});

describe('Horse Racing — full race flow', () => {
  it('runs all 6 rounds to completion and records results', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-toggle')).click();

    cy.get(testid('race-status')).should('contain', 'Race in progress');
    cy.get(testid('btn-toggle')).should('have.attr', 'data-action', 'pause');

    // Full 6-round race with inter-round pauses. Generous timeout.
    cy.get(testid('race-status'), { timeout: FULL_RACE_TIMEOUT }).should(
      'contain',
      'Race finished',
    );

    cy.get(testid('round-result')).should('have.length', 6);
    cy.get(`${testid('place')}[data-podium]`).should('have.length', 18); // 6 rounds × 3 podium places
  });

  it('Generate after finish wipes state and starts over', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-toggle')).click();
    cy.get(testid('race-status'), { timeout: FULL_RACE_TIMEOUT }).should(
      'contain',
      'Race finished',
    );

    cy.get(testid('btn-generate')).click();

    cy.get(testid('race-status')).should('contain', 'Schedule ready');
    cy.get(testid('round-result')).should('not.exist');
    cy.get(testid('schedule-round')).should('have.length', 6);
  });
});

describe('Horse Racing — pause and resume', () => {
  it('pause between rounds freezes status; resume finishes the race', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-toggle')).click();
    cy.get(testid('race-status')).should('contain', 'Race in progress');

    // Toggle is disabled while a round is animating. Wait until at least one
    // round has completed — that's when the between-rounds gap opens and the
    // Pause click becomes effective.
    cy.get(testid('round-result'), { timeout: 15_000 }).should('have.length.gte', 1);
    cy.get(testid('btn-toggle'), { timeout: 5_000 }).should('be.enabled').click();

    cy.get(testid('race-status')).should('contain', 'Paused');
    cy.get(testid('btn-toggle'))
      .should('have.class', 'primary')
      .and('have.attr', 'data-action', 'start');

    // Resume and wait for the full race to finish.
    cy.get(testid('btn-toggle')).click();
    cy.get(testid('race-status')).should('contain', 'Race in progress');
    cy.get(testid('race-status'), { timeout: FULL_RACE_TIMEOUT }).should(
      'contain',
      'Race finished',
    );

    cy.get(testid('round-result')).should('have.length', 6);
  });
});
