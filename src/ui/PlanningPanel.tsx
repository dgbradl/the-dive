import type { GameState, StaffArchetype, HiredStaff, StaffTrait } from '../game/types';
import { Station } from '../game/types';
import { catalog } from '../game/content';

interface Props {
  state: GameState;
  onStartShift: () => void;
  onResetSave: () => void;
  onHire: (archetypeId: string) => void;
  onFire: (instanceId: string) => void;
  onAssign: (instanceId: string, station: Station) => void;
}

const STATIONS: Station[] = [Station.OffShift, Station.Bar, Station.Floor, Station.Door];
const STATION_LABELS: Record<Station, string> = {
  [Station.OffShift]: 'Off',
  [Station.Bar]: 'Bar',
  [Station.Floor]: 'Floor',
  [Station.Door]: 'Door',
};

export function PlanningPanel({ state, onStartShift, onResetSave, onHire, onFire, onAssign }: Props) {
  const hiredArchetypeIds = new Set(state.hiredStaff.map((h) => h.archetypeId));
  const availableHires = catalog.staffArchetypes.filter((a) => !hiredArchetypeIds.has(a.id));

  return (
    <div className="panel planning-panel">
      <div className="header">
        <h1>Day {state.day}</h1>
        <div className="stats">
          <div className="stat">
            <span className="label">Cash</span>
            <span className="value">${state.cash}</span>
          </div>
          <div className="stat">
            <span className="label">Rep</span>
            <span className="value">{state.reputation}</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Tonight's crew</h2>
        <ul className="staff-list">
          {state.hiredStaff.map((h) => {
            const arch = catalog.staffArchetypes.find((a) => a.id === h.archetypeId);
            const station = state.assignments.find((a) => a.staffInstanceId === h.instanceId)?.station ?? Station.OffShift;
            return (
              <HiredCard
                key={h.instanceId}
                hired={h}
                archetype={arch}
                station={station}
                onAssign={(s) => onAssign(h.instanceId, s)}
                onFire={() => onFire(h.instanceId)}
              />
            );
          })}
        </ul>
        {state.hiredStaff.length === 0 && (
          <p className="empty-hint">You've got nobody behind the bar. Tonight will be quiet.</p>
        )}
      </div>

      {availableHires.length > 0 && (
        <div className="section">
          <h2>Looking for work</h2>
          <ul className="staff-list">
            {availableHires.map((arch) => (
              <HireCard
                key={arch.id}
                archetype={arch}
                cash={state.cash}
                onHire={() => onHire(arch.id)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="section flavor">
        <p>The dive opens at 8. Pour 'em strong.</p>
      </div>

      <div className="actions">
        <button className="primary" onClick={onStartShift}>Open the doors</button>
        <button className="ghost" onClick={onResetSave}>Reset save</button>
      </div>
    </div>
  );
}

interface HiredCardProps {
  hired: HiredStaff;
  archetype: StaffArchetype | undefined;
  station: Station;
  onAssign: (s: Station) => void;
  onFire: () => void;
}

function HiredCard({ hired, archetype, station, onAssign, onFire }: HiredCardProps) {
  return (
    <li className="staff-card">
      <span className="emoji">{archetype?.emoji ?? '🧍'}</span>
      <div className="staff-meta">
        <div className="staff-row-top">
          <span className="staff-name">{hired.displayName}</span>
          <button className="fire-btn" onClick={onFire} aria-label={`Fire ${hired.displayName}`}>×</button>
        </div>
        <div className="staff-role">{archetype?.role ?? '?'} · ${hired.wagePerDay}/day</div>
        {archetype && <TraitChips traits={archetype.traits} />}
        <div className="station-toggle" role="group" aria-label="Assign station">
          {STATIONS.map((s) => (
            <button
              key={s}
              className={`seg ${station === s ? 'active' : ''}`}
              onClick={() => onAssign(s)}
            >
              {STATION_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

interface HireCardProps {
  archetype: StaffArchetype;
  cash: number;
  onHire: () => void;
}

function HireCard({ archetype, cash, onHire }: HireCardProps) {
  const canAfford = cash >= archetype.hireCost;
  return (
    <li className="staff-card hire-card">
      <span className="emoji">{archetype.emoji}</span>
      <div className="staff-meta">
        <div className="staff-name">{archetype.displayName}</div>
        <div className="staff-role">{archetype.role} · ${archetype.baseWagePerDay}/day</div>
        <TraitChips traits={archetype.traits} />
        <div className="staff-flavor">{archetype.flavorText}</div>
        <button
          className="hire-btn"
          disabled={!canAfford}
          onClick={onHire}
        >
          {archetype.hireCost > 0 ? `Hire · $${archetype.hireCost}` : 'Hire (free)'}
        </button>
      </div>
    </li>
  );
}

function TraitChips({ traits }: { traits: StaffTrait[] }) {
  if (traits.length === 0) return null;
  return (
    <div className="trait-chips">
      {traits.map((t) => (
        <span key={t} className="chip">{t}</span>
      ))}
    </div>
  );
}
