import { useEffect, useState } from 'react';
import {
  getVolume,
  isMuted,
  playSfx,
  setMuted,
  setVolume,
  subscribeMute,
  subscribeVolume,
} from './audio';

interface Props {
  open: boolean;
  onClose: () => void;
  onResetSave: () => void;
}

export function Settings({ open, onClose, onResetSave }: Props) {
  const [muted, setMutedLocal] = useState(isMuted);
  const [volume, setVolumeLocal] = useState(getVolume);

  useEffect(() => subscribeMute(setMutedLocal), []);
  useEffect(() => subscribeVolume(setVolumeLocal), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const onResetClick = () => {
    if (window.confirm('Reset save? This wipes the current run (career stats are kept).')) {
      onResetSave();
      onClose();
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <article
        className="settings-card grit-grain"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <header className="masthead">
          <span className="masthead-title">SETTINGS</span>
          <button type="button" className="settings-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="settings-row">
          <span className="settings-label">Sound</span>
          <button
            type="button"
            className="mute-btn"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (!next) playSfx('click');
            }}
            aria-pressed={muted}
          >
            {muted ? 'sound: off' : 'sound: on'}
          </button>
        </div>

        <div className="settings-row">
          <span className="settings-label">Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            onMouseUp={() => playSfx('click')}
            className="settings-volume"
            aria-label="Volume"
          />
          <span className="settings-volume-value">{Math.round(volume * 100)}</span>
        </div>

        <div className="settings-row">
          <span className="settings-label">Save</span>
          <button type="button" className="settings-reset" onClick={onResetClick}>
            Reset save
          </button>
        </div>

        <div className="settings-credits">
          <p><strong>The Dive</strong></p>
          <p>A Sepia-Tavern bar-management game. Built with Phaser, React, and a procedural Web Audio engine.</p>
          <p className="settings-flavor">Pour something stiff. Watch the rowdy kid at the bar.</p>
        </div>
      </article>
    </div>
  );
}
