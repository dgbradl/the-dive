import type { GameCatalog, GameState, ShiftReport } from '../game/types';
import { composeStory, pickHeadline } from './newspaper';

interface Props {
  report: ShiftReport;
  state: GameState;
  catalog: GameCatalog;
  onNextDay: () => void;
}

export function ResultsPanel({ report, state, catalog, onNextDay }: Props) {
  const net = report.cashDelta - report.wagesPaid;
  const headline = pickHeadline(net, report.customersServed, report.customersLost);
  const sentences = composeStory(report, state, catalog);

  return (
    <div className="panel results-panel">
      <article className="newspaper">
        <header className="masthead">
          <span className="masthead-title">THE DIVE TIMES</span>
          <span className="masthead-day">Day {report.day}</span>
        </header>
        <h1 className="newspaper-headline">{headline.toUpperCase()}</h1>
        <div className="newspaper-byline">— from the floor</div>
        <div className="newspaper-body">
          {sentences.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
        <dl className="newspaper-totals">
          <Total label="Net" value={`$${net}`} good={net >= 0} />
          <Total label="Rep" value={signed(report.repDelta)} good={report.repDelta >= 0} />
          <Total label="Served" value={String(report.customersServed)} good />
          <Total label="Walkouts" value={String(report.customersLost)} good={report.customersLost === 0} />
        </dl>
      </article>
      <button className="primary" onClick={onNextDay}>Lock up</button>
    </div>
  );
}

function Total({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={`newspaper-total ${good ? 'good' : 'bad'}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
