import { useState } from 'react';
import { ACHIEVEMENTS } from '../game/achievements';
import type { CareerStats } from '../game/careerStats';
import { SCENARIOS, getScenario } from '../game/scenarios';
import type { GameState } from '../game/types';
import { Settings } from './Settings';

interface Props {
  /** The currently-loaded save state, or null on first run. */
  savedState: GameState | null;
  career: CareerStats;
  onContinue: () => void;
  onPickScenario: (scenarioId: string) => void;
  onResetSave: () => void;
}

export function TitlePanel({
  savedState,
  career,
  onContinue,
  onPickScenario,
  onResetSave,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const continueLabel = savedState
    ? `Continue · Day ${savedState.day} · $${savedState.cash} · ${getScenario(savedState.scenarioId).displayName}`
    : null;

  return (
    <div className="panel title-panel">
      <div className="title-hero">
        <img className="title-stamp" src="/brand/wordmark-stamp.svg" alt="The Dive" />
        <h1 className="title-headline">The Dive</h1>
        <p className="title-tagline">A whimsical, gritty sepia-tavern bar-management game.</p>
        {career.runsPlayed > 0 && (
          <p className="title-career">
            {career.runsPlayed} run{career.runsPlayed === 1 ? '' : 's'} ·
            best {career.bestRunDays} day{career.bestRunDays === 1 ? '' : 's'} ·
            {' '}{career.unlockedAchievements.length}/{ACHIEVEMENTS.length} ★
          </p>
        )}
      </div>

      {continueLabel && (
        <button type="button" className="title-continue" onClick={onContinue}>
          {continueLabel}
        </button>
      )}

      <section className="scenario-picker">
        <h2 className="scenario-heading">{savedState ? 'Or pick a fresh gig' : 'Pick your gig'}</h2>
        <ul className="scenario-list">
          {SCENARIOS.map((s) => (
            <li key={s.id} className="scenario-card">
              <button
                type="button"
                className="scenario-button"
                onClick={() => onPickScenario(s.id)}
              >
                <div className="scenario-name">{s.displayName}</div>
                <div className="scenario-tagline">{s.tagline}</div>
                <div className="scenario-description">{s.description}</div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        className="title-settings-link"
        onClick={() => setSettingsOpen(true)}
      >
        Settings
      </button>

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetSave={onResetSave}
      />
    </div>
  );
}
