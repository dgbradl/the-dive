// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Stub Phaser entirely — JSDOM has no WebGL, and the smoke tests don't need
// the canvas. We just want to verify the React shell drives phase transitions.
vi.mock('phaser', () => ({
  default: {
    Game: class { destroy() {} },
    AUTO: 0,
    Scale: { RESIZE: 0, CENTER_BOTH: 0 },
    Scene: class {},
  },
}));

vi.mock('../ui/PhaserBarScene', () => ({
  BarScene: class {
    reset() {}
    handleEntry() {}
  },
}));

import { App } from '../App';

/** Pick the default scenario from the title screen so subsequent tests can
 *  exercise the planning → shift → results loop. */
async function pickInheritedDive(user: ReturnType<typeof userEvent.setup>) {
  const inherited = screen.getAllByRole('button').find((b) =>
    b.textContent?.includes('Inherited Dive'),
  );
  if (!inherited) throw new Error('Inherited Dive scenario button not found');
  await user.click(inherited);
}

describe('App smoke', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders the title panel on first load with the four scenarios', () => {
    render(<App />);
    expect(screen.getByText(/^The Dive$/i)).toBeTruthy();
    expect(document.querySelector('.title-panel')).toBeTruthy();
    expect(document.querySelectorAll('.scenario-button').length).toBe(4);
    // No save yet → no Continue.
    expect(document.querySelector('.title-continue')).toBeFalsy();
  });

  it('picking a scenario from the title routes to planning', async () => {
    const user = userEvent.setup();
    render(<App />);
    await pickInheritedDive(user);
    expect(document.querySelector('.planning-panel')).toBeTruthy();
    expect(screen.getByRole('button', { name: /open the doors/i })).toBeTruthy();
  });

  it('clicking "Open the doors" transitions to the shift phase', async () => {
    const user = userEvent.setup();
    render(<App />);
    await pickInheritedDive(user);
    await user.click(screen.getByRole('button', { name: /open the doors/i }));
    expect(document.querySelector('.shift-panel')).toBeTruthy();
    expect(screen.getByRole('button', { name: /skip/i })).toBeTruthy();
  });

  it('skip jumps from shift to results, lock up returns to planning', async () => {
    const user = userEvent.setup();
    render(<App />);
    await pickInheritedDive(user);
    await user.click(screen.getByRole('button', { name: /open the doors/i }));
    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(document.querySelector('.newspaper')).toBeTruthy();
    expect(screen.getByRole('button', { name: /lock up/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /lock up/i }));
    expect(screen.getByRole('button', { name: /open the doors/i })).toBeTruthy();
  });

  it('settings sheet opens from the title screen and dismisses on close', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^settings$/i }));
    expect(document.querySelector('.settings-card')).toBeTruthy();
    expect(document.querySelector('.settings-card .masthead-title')?.textContent).toBe('SETTINGS');
    await user.click(screen.getByRole('button', { name: /close/i }));
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(document.querySelector('.settings-card')).toBeFalsy();
  });
});
