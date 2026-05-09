import type { ActionKey, DecisionGate, DecisionOption, ShiftPhase } from '../game/types';
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
 * Action bar — five primary verbs in fixed slots.
 * When `options` is given, the matching slots light up and become
 * interactive; the others stay disabled. With no `options`, every slot
 * is disabled placeholder chrome.
 */
export interface ActionBarProps {
  options?: DecisionOption[];
  satisfiedGates?: DecisionGate[];
  onPick?: (option: DecisionOption, optionIndex: number) => void;
}

const ACTION_SLOTS: { key: ActionKey; index: number; label: string; tone?: 'primary' | 'danger' }[] = [
  { key: 'pour',       index: 1, label: 'Pour',    tone: 'primary' },
  { key: 'cut-off',    index: 2, label: 'Cut Off' },
  { key: 'eighty-six', index: 3, label: '86 Him',  tone: 'danger' },
  { key: 'ring-up',    index: 4, label: 'Ring Up' },
  { key: 'door',       index: 5, label: 'Door' },
];

function gateMet(option: DecisionOption, gates: DecisionGate[]): boolean {
  if (!option.requires) return true;
  return gates.includes(option.requires);
}

export function ActionBar({ options, satisfiedGates = [], onPick }: ActionBarProps) {
  // Map each slot to its option (if any). Stable order so layout never reflows.
  const slotOption: Record<ActionKey, { option: DecisionOption; index: number } | null> = {
    'pour': null, 'cut-off': null, 'eighty-six': null, 'ring-up': null, 'door': null,
  };
  if (options) {
    options.forEach((o, i) => {
      slotOption[o.key] = { option: o, index: i };
    });
  }

  return (
    <div
      className={`action-bar ${options ? 'live' : ''}`}
      role="toolbar"
      aria-label={options ? 'Decision — pick an action' : 'Shift actions'}
    >
      {ACTION_SLOTS.map((s) => {
        const filled = slotOption[s.key];
        const interactive = !!filled && gateMet(filled.option, satisfiedGates);
        const label = filled?.option.label ?? s.label;
        return (
          <button
            key={s.key}
            type="button"
            className={`action-btn ${s.tone ?? ''} ${interactive ? 'available' : ''}`}
            disabled={!interactive}
            aria-keyshortcuts={String(s.index)}
            onClick={() => filled && onPick?.(filled.option, filled.index)}
          >
            <span className="action-label">{label}</span>
            <span className="action-key">[{s.index}]</span>
          </button>
        );
      })}
    </div>
  );
}
