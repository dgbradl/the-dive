import { describe, expect, it } from 'vitest';
import { catalog } from '../../game/content';
import { runShift } from '../../game/simulator';
import { newGame } from '../../game/save';
import { defaultShiftConfig, type GameState, type ShiftReport } from '../../game/types';
import { composeStory, pickHeadline } from '../newspaper';

function freshState(): GameState {
  const s = newGame();
  s.rngSeed = 1337;
  return s;
}

function emptyReport(day: number): ShiftReport {
  return {
    day,
    seed: 1,
    cashDelta: 0,
    repDelta: 0,
    customersServed: 0,
    customersLost: 0,
    wagesPaid: 0,
    entries: [],
    heatAtClose: 0,
    damages: [],
    decisions: [],
    rentPaid: 0,
    stockUsed: {},
  };
}

describe('composeStory', () => {
  it('opens with a quiet-night line when nothing happened', () => {
    const sentences = composeStory(emptyReport(1), freshState(), catalog);
    expect(sentences[0]).toMatch(/quiet night/i);
  });

  it('credits the bartender by name when they served customers', () => {
    const state = freshState();
    const report = runShift(state, defaultShiftConfig, catalog, 42);
    const sentences = composeStory(report, state, catalog).join(' ');
    expect(sentences).toContain('Marv');
  });

  it('mentions tray drops with the staff name', () => {
    const state = freshState();
    const report: ShiftReport = {
      ...emptyReport(1),
      customersServed: 3,
      entries: [
        {
          tick: 5,
          kind: 'Mishap',
          text: 'Dee drops a tray.',
          cashDelta: -3,
          repDelta: 0,
          staffInstanceId: state.hiredStaff[0].instanceId,
        },
      ],
    };
    const sentences = composeStory(report, state, catalog).join(' ');
    expect(sentences).toMatch(/dropped a tray/i);
    expect(sentences).toContain(state.hiredStaff[0].displayName);
  });

  it('counts repeated jukebox events', () => {
    const state = freshState();
    const report: ShiftReport = {
      ...emptyReport(1),
      entries: [
        { tick: 1, kind: 'Event', text: 'The jukebox eats a quarter.', cashDelta: 0, repDelta: 0 },
        { tick: 4, kind: 'Event', text: 'The jukebox eats a quarter.', cashDelta: 0, repDelta: 0 },
        { tick: 9, kind: 'Event', text: 'The jukebox eats a quarter.', cashDelta: 0, repDelta: 0 },
      ],
    };
    const text = composeStory(report, state, catalog).join(' ');
    expect(text).toMatch(/jukebox ate 3 quarters/i);
  });

  it('flags rep-tier color (Yelp / Wedding) when those archetypes arrived', () => {
    const state = freshState();
    const report: ShiftReport = {
      ...emptyReport(1),
      entries: [
        {
          tick: 8,
          kind: 'CustomerArrived',
          text: 'Yelp Reviewer walks in.',
          cashDelta: 0,
          repDelta: 0,
          customerArchetypeId: 'yelp_reviewer',
        },
        {
          tick: 17,
          kind: 'CustomerArrived',
          text: 'Wedding Party walks in.',
          cashDelta: 0,
          repDelta: 0,
          customerArchetypeId: 'wedding_party',
        },
      ],
    };
    const text = composeStory(report, state, catalog).join(' ');
    expect(text).toMatch(/notepad/i);
    expect(text).toMatch(/wedding party/i);
  });

  it('with one bartender that did nothing (no served, no walkout) just opens quietly', () => {
    const state = freshState();
    state.assignments = []; // unassign Marv
    const report = emptyReport(1);
    const sentences = composeStory(report, state, catalog);
    expect(sentences).toHaveLength(1);
    expect(sentences[0]).toMatch(/quiet/i);
  });
});

describe('pickHeadline', () => {
  it('rewards a clean profitable night with Clean Sweep', () => {
    expect(pickHeadline(50, 10, 0)).toBe('Clean Sweep');
  });
  it('Banner Night for big nets', () => {
    expect(pickHeadline(120, 18, 1)).toBe('Banner Night');
  });
  it('Brutal when walkouts exceed serves', () => {
    expect(pickHeadline(-20, 2, 5)).toBe('Brutal');
  });
});
