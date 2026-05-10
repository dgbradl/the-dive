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

describe('App smoke', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders the planning panel on first load', () => {
    render(<App />);
    expect(screen.getByText(/Tonight's crew/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /open the doors/i })).toBeTruthy();
  });

  it('clicking "Open the doors" transitions to the shift phase', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /open the doors/i }));
    expect(document.querySelector('.shift-panel')).toBeTruthy();
    // Skip button is the indicator that we're in the cinematic.
    expect(screen.getByRole('button', { name: /skip/i })).toBeTruthy();
  });

  it('skip jumps from shift to results, lock up returns to planning', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /open the doors/i }));
    await user.click(screen.getByRole('button', { name: /skip/i }));
    // The receipt should appear.
    expect(document.querySelector('.newspaper')).toBeTruthy();
    expect(screen.getByRole('button', { name: /lock up/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /lock up/i }));
    // Back to planning on the next day.
    expect(screen.getByRole('button', { name: /open the doors/i })).toBeTruthy();
  });

  it('settings sheet opens from the gear button and dismisses on close', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(document.querySelector('.settings-card')).toBeTruthy();
    // The masthead reads SETTINGS.
    expect(document.querySelector('.settings-card .masthead-title')?.textContent).toBe('SETTINGS');
    await user.click(screen.getByRole('button', { name: /close/i }));
    // Need a tick for state propagation.
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(document.querySelector('.settings-card')).toBeFalsy();
  });
});
