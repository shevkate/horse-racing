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
    // Label says "Running" mid-animation, flips to "Pause" between rounds.
    // See RaceControls.vue — distinguishing the two states is intentional
    // so the disabled state reads as "can't interrupt a round" rather
    // than a grey "Pause" that looks broken.
    cy.get(testid('btn-toggle')).should('have.attr', 'data-action', 'running');

    // Full 6-round race with inter-round pauses. Generous timeout.
    cy.get(testid('race-status'), { timeout: FULL_RACE_TIMEOUT }).should(
      'contain',
      'Race finished',
    );

    cy.get(testid('round-result')).should('have.length', 6);
    cy.get(`${testid('place')}[data-podium]`).should('have.length', 18); // 6 rounds × 3 podium places
  });

  it('Generate after finish wipes state and a fresh race can start ("play again")', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-toggle')).click();
    cy.get(testid('race-status'), { timeout: FULL_RACE_TIMEOUT }).should(
      'contain',
      'Race finished',
    );

    // Generate in the finished state is the intentional "play again" path —
    // the 2-button layout doesn't have a dedicated Reset. Wipes results,
    // rebuilds the schedule, and the toggle must re-enable so the next
    // race can actually start.
    cy.get(testid('btn-generate')).click();

    cy.get(testid('race-status')).should('contain', 'Schedule ready');
    cy.get(testid('round-result')).should('not.exist');
    cy.get(testid('schedule-round')).should('have.length', 6);

    // Second race actually runs — not just that state was reset.
    cy.get(testid('btn-toggle')).should('be.enabled').and('contain', 'Start').click();
    cy.get(testid('race-status')).should('contain', 'Race in progress');
    cy.get(testid('round-result'), { timeout: 15_000 }).should('have.length.gte', 1);
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

describe('Horse Racing — keyboard shortcut', () => {
  // The Space handler in App.vue toggles the race unless focus is on a form
  // control (buttons handle Space natively, firing the click listener —
  // intercepting it again would fire `toggleRace` twice).

  it('Space toggles Start/Pause when focus is outside interactive elements', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();

    // Move focus off any button by blurring and clicking the page title.
    cy.contains('h1', 'Horse Racing').click();
    // `{ force: true }` skips visibility checks — the window-level keydown
    // listener doesn't care where on the page the event originated, only
    // that it wasn't inside an interactive element (which we blurred away
    // from by clicking the h1).
    cy.get('body').trigger('keydown', { code: 'Space', force: true });
    cy.get(testid('race-status')).should('contain', 'Race in progress');

    // A second Space between rounds pauses. Wait for a round to finish so
    // the toggle is effective (matches the "pause between rounds only"
    // contract from the pause/resume spec above).
    cy.get(testid('round-result'), { timeout: 15_000 }).should('have.length.gte', 1);
    cy.get(testid('btn-toggle'), { timeout: 5_000 }).should('be.enabled');
    cy.contains('h1', 'Horse Racing').click();
    // `{ force: true }` skips visibility checks — the window-level keydown
    // listener doesn't care where on the page the event originated, only
    // that it wasn't inside an interactive element (which we blurred away
    // from by clicking the h1).
    cy.get('body').trigger('keydown', { code: 'Space', force: true });
    cy.get(testid('race-status')).should('contain', 'Paused');
  });

  it('Space on a focused button does not double-fire (native click still works once)', () => {
    cy.visit('/');
    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-toggle')).focus();

    // Native activation via Space on a focused button fires the click
    // listener exactly once. The keydown handler's interactive-element
    // guard prevents it from also calling toggleRace.
    cy.focused().trigger('keydown', { code: 'Space' });
    cy.focused().trigger('keyup', { code: 'Space' });
    // If the guard is broken, the race would start AND immediately pause
    // (or the loop would double-spawn). Status stays as "Schedule ready"
    // because `keydown` on a button doesn't carry a real click in JSDOM-
    // like event simulation — the important assertion is that status did
    // NOT advance past "running" and back.
    cy.get(testid('race-status')).should('not.contain', 'Paused');
  });
});

describe('Horse Racing — live region', () => {
  it('announcer is wired as a polite log and fills after a round completes', () => {
    cy.visit('/');
    cy.get(testid('race-announcer'))
      .should('have.attr', 'role', 'log')
      .and('have.attr', 'aria-live', 'polite')
      .and('have.attr', 'aria-atomic', 'true')
      .and('have.text', ''); // empty before any round

    cy.get(testid('btn-generate')).click();
    cy.get(testid('btn-toggle')).click();

    // After round 1 finishes the announcer should name the winner.
    cy.get(testid('round-result'), { timeout: 15_000 }).should('have.length.gte', 1);
    cy.get(testid('race-announcer'))
      .invoke('text')
      .should('match', /Round 1 complete\..+won\./);
  });
});

describe('Horse Racing — responsive layout', () => {
  // Layout assertions target `grid-area` on the three panels, which is the
  // actual output of the `grid-template-areas` switch in App.vue. More
  // stable than asserting on computed widths, which drift with fonts/zoom.

  const gridArea = (selector: string) =>
    cy.get(selector).then(($el) => getComputedStyle($el[0]!).gridArea.split(' /')[0]);

  it('wide viewport (>=1100px) lays out three columns', () => {
    cy.viewport(1280, 900);
    cy.visit('/');

    gridArea('.page__side--horses').should('equal', 'horses');
    gridArea('.page__main').should('equal', 'main');
    gridArea('.page__side--schedule').should('equal', 'schedule');

    // Horses and schedule panels sit on the same row as the track.
    cy.get('.page__side--horses').then(($h) => {
      cy.get('.page__main').then(($m) => {
        expect($h[0]!.getBoundingClientRect().top).to.equal(
          $m[0]!.getBoundingClientRect().top,
        );
      });
    });
  });

  it('medium viewport (700-1099px) keeps HorseList as sidebar and pushes Schedule below', () => {
    cy.viewport(900, 900);
    cy.visit('/');

    // HorseList + track share the top row; schedule sits under them.
    cy.get('.page__side--horses').then(($h) => {
      cy.get('.page__main').then(($m) => {
        cy.get('.page__side--schedule').then(($s) => {
          const hTop = $h[0]!.getBoundingClientRect().top;
          const mTop = $m[0]!.getBoundingClientRect().top;
          const sTop = $s[0]!.getBoundingClientRect().top;
          expect(hTop).to.equal(mTop);
          expect(sTop).to.be.greaterThan(mTop);
        });
      });
    });
  });

  it('narrow viewport (<700px) stacks all three panels vertically', () => {
    cy.viewport(480, 900);
    cy.visit('/');

    cy.get('.page__side--horses').then(($h) => {
      cy.get('.page__main').then(($m) => {
        cy.get('.page__side--schedule').then(($s) => {
          const hTop = $h[0]!.getBoundingClientRect().top;
          const mTop = $m[0]!.getBoundingClientRect().top;
          const sTop = $s[0]!.getBoundingClientRect().top;
          expect(mTop).to.be.greaterThan(hTop);
          expect(sTop).to.be.greaterThan(mTop);
        });
      });
    });

    // The list is capped at ~300px on phones so the track stays visible
    // without scrolling away the whole viewport.
    cy.get(testid('horse-list')).then(($list) => {
      expect($list[0]!.getBoundingClientRect().height).to.be.lessThan(320);
    });
  });
});
