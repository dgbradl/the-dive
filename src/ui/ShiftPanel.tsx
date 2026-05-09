import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BarScene } from './PhaserBarScene';
import type { ShiftEntry, ShiftReport } from '../game/types';
import { useCountUp } from './animation';
import { playSfx } from './audio';
import { MuteButton } from './MuteButton';

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
  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const toastIdRef = useRef(0);

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
      if (entry.cashDelta !== 0) emitToast(entry);
      sfxFor(entry);
      sceneRef.current?.handleEntry(entry);
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

  const cashSign = animatedCash < 0 ? '-' : '+';
  const repSign = animatedRep > 0 ? '+' : animatedRep < 0 ? '-' : '';

  return (
    <div className="panel shift-panel">
      <div className="shift-header">
        <span>Day {report.day}</span>
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
      <div ref={logScrollRef} className="shift-log">
        {logLines.map((line, idx) => (
          <div key={idx} className="log-line">{line}</div>
        ))}
      </div>
    </div>
  );
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
