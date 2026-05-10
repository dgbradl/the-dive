import type { CareerStats } from '../game/careerStats';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  career: CareerStats;
  onRestart: () => void;
}

export function GameOverPanel({ state, career, onRestart }: Props) {
  const daysThisRun = Math.max(0, state.day - 1);
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
        </dl>
      </article>

      <button className="primary" onClick={onRestart}>Open a new place</button>
    </div>
  );
}
