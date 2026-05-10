import { useEffect } from 'react';
import { findAchievement } from '../game/achievements';
import type { GameCatalog, GameState, ShiftReport } from '../game/types';
import { useCountUp } from './animation';
import { playSfx } from './audio';
import { composeStory, pickHeadline } from './newspaper';

interface Props {
  report: ShiftReport;
  state: GameState;
  catalog: GameCatalog;
  onNextDay: () => void;
  newlyUnlockedIds?: string[];
}

export function ResultsPanel({ report, state, catalog, onNextDay, newlyUnlockedIds = [] }: Props) {
  const rent = report.rentPaid ?? 0;
  const net = report.cashDelta - report.wagesPaid - rent;
  const headline = pickHeadline(net, report.customersServed, report.customersLost);
  const sentences = composeStory(report, state, catalog);
  if (rent > 0) sentences.push(`Rent ate $${rent}.`);

  useEffect(() => {
    playSfx(net > 0 ? 'chime' : 'trombone');
  }, [net]);

  return (
    <div className="panel results-panel">
      <article className="newspaper grit-grain">
        <span className="newspaper-stamp" aria-hidden="true" />
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
          <NetTotal target={net} />
          <RepTotal target={report.repDelta} />
          <CountTotal label="Served" target={report.customersServed} good />
          <CountTotal label="Walkouts" target={report.customersLost} good={report.customersLost === 0} />
        </dl>
      </article>

      {newlyUnlockedIds.length > 0 && (
        <ul className="achievement-banner">
          {newlyUnlockedIds.map((id) => {
            const a = findAchievement(id);
            if (!a) return null;
            return (
              <li key={id} className="achievement-unlock">
                <span className="achievement-tag">Unlocked</span>
                <span className="achievement-name">{a.displayName}</span>
                <span className="achievement-desc">{a.description}</span>
              </li>
            );
          })}
        </ul>
      )}

      <button className="primary" onClick={onNextDay}>Lock up</button>
    </div>
  );
}

function NetTotal({ target }: { target: number }) {
  const v = useCountUp(target, 900, 0);
  const sign = v < 0 ? '-' : '';
  return (
    <div className={`newspaper-total ${target >= 0 ? 'good' : 'bad'}`}>
      <dt>Net</dt>
      <dd>{`${sign}$${Math.abs(v)}`}</dd>
    </div>
  );
}

function RepTotal({ target }: { target: number }) {
  const v = useCountUp(target, 900, 0);
  const label = v > 0 ? `+${v}` : `${v}`;
  return (
    <div className={`newspaper-total ${target >= 0 ? 'good' : 'bad'}`}>
      <dt>Rep</dt>
      <dd>{label}</dd>
    </div>
  );
}

function CountTotal({ label, target, good }: { label: string; target: number; good: boolean }) {
  const v = useCountUp(target, 900, 0);
  return (
    <div className={`newspaper-total ${good ? 'good' : 'bad'}`}>
      <dt>{label}</dt>
      <dd>{v}</dd>
    </div>
  );
}
