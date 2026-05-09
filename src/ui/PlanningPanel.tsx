import type { GameState } from '../game/types';
import { catalog } from '../game/content';

interface Props {
  state: GameState;
  onStartShift: () => void;
  onResetSave: () => void;
}

export function PlanningPanel({ state, onStartShift, onResetSave }: Props) {
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
            const assignment = state.assignments.find((a) => a.staffInstanceId === h.instanceId);
            return (
              <li key={h.instanceId} className="staff-card">
                <span className="emoji">{arch?.emoji ?? '🧍'}</span>
                <div className="staff-meta">
                  <div className="staff-name">{h.displayName}</div>
                  <div className="staff-role">{arch?.role ?? '?'} · ${h.wagePerDay}/day</div>
                  <div className="staff-station">@ {assignment?.station ?? 'Off-shift'}</div>
                </div>
              </li>
            );
          })}
        </ul>
        {state.hiredStaff.length === 0 && (
          <p className="empty-hint">You've got nobody behind the bar. Tonight will be quiet.</p>
        )}
      </div>

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
