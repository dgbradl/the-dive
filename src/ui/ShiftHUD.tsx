import type { ShiftPhase } from '../game/types';
import { dayOfWeek, phaseLabel, tickToClock, timeSubtitle } from './clockUtils';

/**
 * Top chalkboard HUD — `SHIFT 04 / TUESDAY · Last Call · 12:14 PM CLOCK`.
 */
export function ChalkboardHUD({
  day,
  phase,
  tick,
  tickCount,
}: {
  day: number;
  phase: ShiftPhase;
  tick: number;
  tickCount: number;
}) {
  return (
    <div className="chalkboard">
      <div className="chalkboard-cell left">
        <div className="chalkboard-label">SHIFT {String(day).padStart(2, '0')}</div>
        <div className="chalkboard-sub">{dayOfWeek(day)}</div>
      </div>
      <div className="chalkboard-cell center">
        <div className="chalkboard-phase">{phaseLabel(phase)}</div>
      </div>
      <div className="chalkboard-cell right">
        <div className="chalkboard-clock">{tickToClock(tick, tickCount)}</div>
        <div className="chalkboard-sub">{timeSubtitle(tick, tickCount, phase)}</div>
      </div>
    </div>
  );
}

/**
 * Bottom HUD strip — `TILL / TIME / HEAT / DAMAGE`. HEAT and DAMAGE are
 * stub values until Slice 8b adds them to the simulator.
 */
export function StatusStrip({
  till,
  lastPour,
  tick,
  tickCount,
  phase,
  heat,
  damage,
  damageItems,
}: {
  till: number;
  lastPour: number;
  tick: number;
  tickCount: number;
  phase: ShiftPhase;
  heat: number;       // 0..5 (stub)
  damage: number;     // dollars (stub)
  damageItems: string; // free text (stub)
}) {
  return (
    <div className="status-strip">
      <Cell
        label="Till"
        value={`$${till}`}
        sub={lastPour > 0 ? `+$${lastPour} last pour` : '—'}
      />
      <Cell
        label="Time"
        value={tickToClock(tick, tickCount)}
        sub={timeSubtitle(tick, tickCount, phase)}
      />
      <HeatCell heat={heat} />
      <Cell
        label="Damage"
        value={damage > 0 ? `$${damage}` : '—'}
        sub={damageItems || 'quiet'}
      />
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="status-cell">
      <div className="status-label">{label}</div>
      <div className="status-value">{value}</div>
      <div className="status-sub">{sub}</div>
    </div>
  );
}

function HeatCell({ heat }: { heat: number }) {
  const clamped = Math.max(0, Math.min(5, heat));
  return (
    <div className="status-cell">
      <div className="status-label">Heat</div>
      <div className="status-value heat-meter" aria-label={`Heat ${clamped} of 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`heat-pip ${i < clamped ? 'lit' : ''}`} />
        ))}
      </div>
      <div className="status-sub">{heatLabel(clamped)}</div>
    </div>
  );
}

function heatLabel(h: number): string {
  if (h <= 0) return 'quiet';
  if (h <= 1) return 'humming';
  if (h <= 2) return 'lively';
  if (h <= 3) return 'rowdy';
  if (h <= 4) return 'on edge';
  return 'about to break';
}

/**
 * Dialogue line — bartender-voice caption above the action bar.
 */
export function DialogueLine({ speaker, text }: { speaker: string; text: string }) {
  return (
    <div className="dialogue-line">
      <span className="dialogue-speaker">— {speaker.toUpperCase()}</span>
      <span className="dialogue-text">{text}<span className="caret">▌</span></span>
    </div>
  );
}

/**
 * Action bar — disabled in 8a, wired up in 8c. Five primary verbs with
 * 1..5 keyboard hints.
 */
const ACTIONS: { key: string; label: string; tone?: 'primary' | 'danger' }[] = [
  { key: '1', label: 'Pour', tone: 'primary' },
  { key: '2', label: 'Cut Off' },
  { key: '3', label: '86 Him', tone: 'danger' },
  { key: '4', label: 'Ring Up' },
  { key: '5', label: 'Door' },
];

export function ActionBar() {
  return (
    <div className="action-bar" role="toolbar" aria-label="Shift actions (disabled — coming in Slice 8c)">
      {ACTIONS.map((a) => (
        <button
          key={a.key}
          type="button"
          className={`action-btn ${a.tone ?? ''}`}
          disabled
          aria-keyshortcuts={a.key}
        >
          <span className="action-label">{a.label}</span>
          <span className="action-key">[{a.key}]</span>
        </button>
      ))}
    </div>
  );
}
