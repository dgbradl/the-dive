import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BarScene } from './PhaserBarScene';
import type { DecisionOption, PendingDecision, ShiftEntry, ShiftPhase, ShiftReport } from '../game/types';
import { defaultShiftConfig } from '../game/types';
import { applyDecisionOverride } from '../game/simulator';
import { useCountUp } from './animation';
import { playSfx } from './audio';
import { MuteButton } from './MuteButton';
import { ActionBar, ChalkboardHUD, DialogueLine, StatusStrip } from './ShiftHUD';

interface CashToast {
  id: number;
  amount: number;
}

const TOAST_LIFETIME_MS = 1100;

interface Props {
  report: ShiftReport;
  onComplete: () => void;
}

const TICK_MS = 220;

export function ShiftPanel({ report, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BarScene | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [skipped, setSkipped] = useState(false);
  const [runningCash, setRunningCash] = useState(0);
  const [runningRep, setRunningRep] = useState(0);
  const [toasts, setToasts] = useState<CashToast[]>([]);
  const [currentTick, setCurrentTick] = useState(1);
  const [currentPhase, setCurrentPhase] = useState<ShiftPhase>('Early');
  const [lastPour, setLastPour] = useState(0);
  const [dialogueText, setDialogueText] = useState('Place looks dead. Let’s open up.');
  const [currentHeat, setCurrentHeat] = useState(0);
  const [damageTotal, setDamageTotal] = useState(0);
  const [damageItems, setDamageItems] = useState<string[]>([]);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const toastIdRef = useRef(0);
  const resumeRef = useRef<(() => void) | null>(null);

  const animatedCash = useCountUp(runningCash, 280);
  const animatedRep = useCountUp(runningRep, 400);

  // Mount Phaser once
  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new BarScene();
    sceneRef.current = scene;

    const rect = containerRef.current.getBoundingClientRect();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: Math.max(280, Math.floor(rect.width)),
      height: Math.max(220, Math.floor(rect.height)),
      backgroundColor: '#1a0f1f',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene,
    });
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // Drive playback whenever the report changes
  useEffect(() => {
    let cancelled = false;
    let i = 0;
    let cashSoFar = 0;
    let repSoFar = 0;
    const lines: string[] = [];
    setLogLines([]);
    setSkipped(false);
    setRunningCash(0);
    setRunningRep(0);
    setToasts([]);
    setCurrentTick(1);
    setCurrentPhase('Early');
    setLastPour(0);
    setDialogueText('Place looks dead. Let’s open up.');
    setCurrentHeat(0);
    setDamageTotal(0);
    setDamageItems([]);
    setPendingDecision(null);
    resumeRef.current = null;
    let damageRunningTotal = 0;
    const damageRunningItems: string[] = [];
    sceneRef.current?.reset();

    const step = () => {
      if (cancelled) return;
      if (i >= report.entries.length) {
        onComplete();
        return;
      }
      const entry = report.entries[i++];
      lines.push(formatEntry(entry));
      setLogLines([...lines]);
      cashSoFar += entry.cashDelta;
      repSoFar += entry.repDelta;
      setRunningCash(cashSoFar);
      setRunningRep(repSoFar);
      if (entry.tick > 0) setCurrentTick(entry.tick);
      if (entry.phase) setCurrentPhase(entry.phase);
      if (typeof entry.heatAfter === 'number') setCurrentHeat(entry.heatAfter);
      if (entry.kind === 'Mishap' && entry.damageItem) {
        damageRunningTotal += Math.max(0, -entry.cashDelta);
        if (!damageRunningItems.includes(entry.damageItem)) damageRunningItems.push(entry.damageItem);
        setDamageTotal(damageRunningTotal);
        setDamageItems([...damageRunningItems]);
      }
      if (entry.kind === 'Served' && entry.cashDelta > 0) setLastPour(entry.cashDelta);
      const voiceLine = bartenderVoiceFor(entry);
      if (voiceLine) setDialogueText(voiceLine);
      if (entry.cashDelta !== 0) emitToast(entry);
      sfxFor(entry);
      sceneRef.current?.handleEntry(entry);

      // Pause for player input on Decision entries.
      if (entry.kind === 'Decision' && entry.decisionIndex !== undefined) {
        const decision = report.decisions[entry.decisionIndex];
        if (decision) {
          // Snapshot pre-override state so resume() can apply the diff.
          const priorCash = entry.cashDelta;
          const priorRep = entry.repDelta;
          setPendingDecision(decision);
          resumeRef.current = () => {
            cashSoFar += entry.cashDelta - priorCash;
            repSoFar += entry.repDelta - priorRep;
            setRunningCash(cashSoFar);
            setRunningRep(repSoFar);
            if (typeof entry.heatAfter === 'number') setCurrentHeat(entry.heatAfter);
            setPendingDecision(null);
            resumeRef.current = null;
            window.setTimeout(step, TICK_MS);
          };
          return; // halt the timer chain — resume() restarts it
        }
      }

      window.setTimeout(step, TICK_MS);
    };

    const emitToast = (entry: ShiftEntry) => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, amount: entry.cashDelta }]);
      window.setTimeout(() => {
        if (cancelled) return;
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_LIFETIME_MS);
    };

    // Slight delay so the scene's create() runs first.
    const handle = window.setTimeout(step, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [report, onComplete]);

  // Auto-scroll log
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [logLines]);

  const skip = () => {
    if (skipped) return;
    setSkipped(true);
    setLogLines(report.entries.map(formatEntry));
    onComplete();
  };

  const onPickOption = (option: DecisionOption, optionIndex: number) => {
    if (!pendingDecision) return;
    if (option.requires && !pendingDecision.satisfiedGates.includes(option.requires)) return;
    const decisionIndex = report.decisions.indexOf(pendingDecision);
    if (decisionIndex !== -1) {
      applyDecisionOverride(report, decisionIndex, optionIndex);
    }
    playSfx('click');
    resumeRef.current?.();
  };

  // Keyboard 1..5 maps to action-bar slots while a decision is pending.
  useEffect(() => {
    if (!pendingDecision) return;
    const handler = (e: KeyboardEvent) => {
      const slotMap: Record<string, 'pour' | 'cut-off' | 'eighty-six' | 'ring-up' | 'door'> = {
        '1': 'pour', '2': 'cut-off', '3': 'eighty-six', '4': 'ring-up', '5': 'door',
      };
      const wantKey = slotMap[e.key];
      if (!wantKey) return;
      const idx = pendingDecision.options.findIndex((o) => o.key === wantKey);
      if (idx === -1) return;
      const option = pendingDecision.options[idx];
      if (option.requires && !pendingDecision.satisfiedGates.includes(option.requires)) return;
      e.preventDefault();
      onPickOption(option, idx);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDecision]);

  const cashSign = animatedCash < 0 ? '-' : '+';
  const repSign = animatedRep > 0 ? '+' : animatedRep < 0 ? '-' : '';

  return (
    <div className="panel shift-panel">
      <ChalkboardHUD
        day={report.day}
        phase={currentPhase}
        tick={currentTick}
        tickCount={defaultShiftConfig.tickCount}
      />
      <div className="shift-header compact">
        <span className="running-totals">
          <span className="running-cash">{`${cashSign}$${Math.abs(animatedCash)}`}</span>
          <span className="running-rep">{`rep ${repSign}${Math.abs(animatedRep)}`}</span>
        </span>
        <span className="header-actions">
          <MuteButton />
          <button className="skip-btn" onClick={skip}>Skip</button>
        </span>
      </div>
      <div className="phaser-wrap grit-scanlines grit-vignette">
        <div ref={containerRef} className="phaser-container" />
        <div className="cash-toasts">
          {toasts.map((t) => (
            <span
              key={t.id}
              className={`cash-toast ${t.amount >= 0 ? 'pos' : 'neg'} ${Math.abs(t.amount) >= 25 ? 'big' : ''}`}
            >
              {t.amount >= 0 ? `+$${t.amount}` : `-$${Math.abs(t.amount)}`}
            </span>
          ))}
        </div>
      </div>
      <StatusStrip
        till={Math.max(0, animatedCash)}
        lastPour={lastPour}
        tick={currentTick}
        tickCount={defaultShiftConfig.tickCount}
        phase={currentPhase}
        heat={Math.round(currentHeat)}
        damage={damageTotal}
        damageItems={damageItems.join(', ')}
      />
      <DialogueLine speaker="Marv" text={pendingDecision ? pendingDecision.prompt : dialogueText} />
      <ActionBar
        options={pendingDecision?.options}
        satisfiedGates={pendingDecision?.satisfiedGates}
        onPick={onPickOption}
      />
      <details className="shift-log-details">
        <summary>Show shift log</summary>
        <div ref={logScrollRef} className="shift-log">
          {logLines.map((line, idx) => (
            <div key={idx} className="log-line">{line}</div>
          ))}
        </div>
      </details>
    </div>
  );
}

/**
 * Pick a bartender-voice line for the current entry, or null if Marv
 * stays quiet. Phase notes drive most of the dialogue today; later
 * slices will surface richer barker reactions.
 */
function bartenderVoiceFor(entry: ShiftEntry): string | null {
  if (entry.kind === 'Note' && entry.phase) {
    if (entry.phase === 'Early') return 'Quiet so far. Lean into it.';
    if (entry.phase === 'Prime') return 'Place is filling up. Keep moving.';
    if (entry.phase === 'LastCall') return 'Last call. Watch the rowdy ones.';
  }
  if (entry.kind === 'Mishap') return 'Someone’s losing their grip.';
  if (entry.kind === 'Walkout') return 'There goes one out the door.';
  if (entry.kind === 'Event' && entry.cashDelta < 0) return 'That’s gonna leave a mark.';
  if (entry.kind === 'Event' && entry.cashDelta > 0) return 'Now we’re cooking.';
  return null;
}

function sfxFor(entry: ShiftEntry): void {
  switch (entry.kind) {
    case 'Served':
      if (entry.cashDelta >= 25) playSfx('chime');
      else playSfx('coin');
      return;
    case 'Walkout':
      playSfx('trombone');
      return;
    case 'Mishap':
      playSfx('break');
      return;
    case 'Event':
      if (entry.cashDelta >= 10) playSfx('chime');
      else if (entry.cashDelta <= -5) playSfx('break');
      return;
  }
}

function formatEntry(e: { tick: number; text: string; cashDelta: number; repDelta: number }): string {
  const t = `[t${String(e.tick).padStart(2, '0')}]`;
  const cash = e.cashDelta !== 0 ? ` $${signed(e.cashDelta)}` : '';
  const rep = e.repDelta !== 0 ? ` rep${signed(e.repDelta)}` : '';
  return `${t} ${e.text}${cash}${rep}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
