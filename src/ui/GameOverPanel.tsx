import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onRestart: () => void;
}

export function GameOverPanel({ state, onRestart }: Props) {
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
            <strong>Days survived:</strong> {state.day - 1}<br />
            <strong>Final cash:</strong> ${state.cash}<br />
            <strong>Final reputation:</strong> {state.reputation}
          </p>
          <p className="game-over-flavor">
            Skeeter helped Marv carry the jukebox out back. The neon sign
            stays dark. Maybe next time.
          </p>
        </div>
      </article>
      <button className="primary" onClick={onRestart}>Open a new place</button>
    </div>
  );
}
