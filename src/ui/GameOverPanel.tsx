import { useState } from 'react';
import { ACHIEVEMENTS } from '../game/achievements';
import type { CareerStats } from '../game/careerStats';
import { dailyShareText } from '../game/dailyShare';
import { SCENARIOS } from '../game/scenarios';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  career: CareerStats;
  onRestart: (scenarioId?: string) => void;
}

export function GameOverPanel({ state, career, onRestart }: Props) {
  const daysThisRun = Math.max(0, state.day - 1);
  const shareText = dailyShareText(state, career);
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — clipboard might be denied; the user can still read it on screen
      setCopied(false);
    }
  };
  return (
    <div className="panel game-over-panel">
      <article className="game-over-card grit-grain">
        <header className="masthead">
          <span className="masthead-title">FINAL NOTICE</span>
          <span className="masthead-day">Day {state.day}</span>
        </header>
        <h1 className="game-over-headline">DOORS CLOSED FOR GOOD</h1>
        <div className="game-over-byline">— a hand-delivered slip from the landlord</div>
        <div className="game-over-body">
          <p>
            Couldn’t make rent on the lease. The landlord locked the front door
            this morning while Marv was wiping down stools.
          </p>
          <p>
            <strong>Days survived:</strong> {daysThisRun}<br />
            <strong>Final cash:</strong> ${state.cash}<br />
            <strong>Final reputation:</strong> {state.reputation}
          </p>
          <p className="game-over-flavor">
            Skeeter helped Marv carry the jukebox out back. The neon sign
            stays dark. Maybe next time.
          </p>
        </div>
      </article>

      <article className="career-card grit-grain">
        <header className="masthead">
          <span className="masthead-title">CAREER LEDGER</span>
          <span className="masthead-day">Run {career.runsPlayed}</span>
        </header>
        <dl className="career-grid">
          <div className="career-row">
            <dt>Best run</dt>
            <dd>{career.bestRunDays} days · ${career.bestRunCash}</dd>
          </div>
          <div className="career-row">
            <dt>Lifetime days</dt>
            <dd>{career.daysSurvivedTotal}</dd>
          </div>
          <div className="career-row">
            <dt>Biggest tip</dt>
            <dd>${career.biggestTip}</dd>
          </div>
          <div className="career-row">
            <dt>Busiest night</dt>
            <dd>{career.busiestNight} served</dd>
          </div>
          <div className="career-row">
            <dt>Achievements</dt>
            <dd>{career.unlockedAchievements.length} / {ACHIEVEMENTS.length}</dd>
          </div>
        </dl>
      </article>

      {shareText && (
        <section className="daily-share">
          <pre className="daily-share-text">{shareText}</pre>
          <button type="button" className="daily-share-btn" onClick={onShare}>
            {copied ? 'Copied!' : 'Copy daily result'}
          </button>
        </section>
      )}

      <section className="scenario-picker">
        <h2 className="scenario-heading">Pick your next gig</h2>
        <ul className="scenario-list">
          {SCENARIOS.map((s) => (
            <li key={s.id} className="scenario-card">
              <button type="button" className="scenario-button" onClick={() => onRestart(s.id)}>
                <div className="scenario-name">{s.displayName}</div>
                <div className="scenario-tagline">{s.tagline}</div>
                <div className="scenario-description">{s.description}</div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
