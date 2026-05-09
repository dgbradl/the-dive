import type { ShiftReport } from '../game/types';

interface Props {
  report: ShiftReport;
  onNextDay: () => void;
}

export function ResultsPanel({ report, onNextDay }: Props) {
  const net = report.cashDelta - report.wagesPaid;
  const headline = pickHeadline(net, report.customersServed, report.customersLost);

  return (
    <div className="panel results-panel">
      <h1 className="headline">{headline}</h1>
      <div className="results-grid">
        <Stat label="Earnings" value={`$${report.cashDelta}`} positive={report.cashDelta >= 0} />
        <Stat label="Wages" value={`-$${report.wagesPaid}`} positive={false} />
        <Stat label="Net" value={`$${net}`} positive={net >= 0} />
        <Stat label="Rep" value={signed(report.repDelta)} positive={report.repDelta >= 0} />
        <Stat label="Served" value={String(report.customersServed)} positive />
        <Stat label="Walkouts" value={String(report.customersLost)} positive={report.customersLost === 0} />
      </div>
      <button className="primary" onClick={onNextDay}>Lock up</button>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className={`result-stat ${positive ? 'good' : 'bad'}`}>
      <div className="result-label">{label}</div>
      <div className="result-value">{value}</div>
    </div>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function pickHeadline(net: number, served: number, lost: number): string {
  if (net > 80) return 'Banner night.';
  if (net > 0) return 'Solid night.';
  if (lost > served) return 'Brutal.';
  if (net === 0) return 'Broke even.';
  return 'Rough one.';
}
