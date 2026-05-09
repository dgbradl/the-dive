import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BarScene } from './PhaserBarScene';
import type { ShiftReport } from '../game/types';

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
  const logScrollRef = useRef<HTMLDivElement | null>(null);

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
    const lines: string[] = [];
    setLogLines([]);
    setSkipped(false);
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
      // Wait a frame before calling Phaser — scene may still be initializing
      sceneRef.current?.handleEntry(entry);
      window.setTimeout(step, TICK_MS);
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

  return (
    <div className="panel shift-panel">
      <div className="shift-header">
        <span>Day {report.day}</span>
        <button className="skip-btn" onClick={skip}>Skip</button>
      </div>
      <div ref={containerRef} className="phaser-container" />
      <div ref={logScrollRef} className="shift-log">
        {logLines.map((line, idx) => (
          <div key={idx} className="log-line">{line}</div>
        ))}
      </div>
    </div>
  );
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
