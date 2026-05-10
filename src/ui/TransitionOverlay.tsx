import { useEffect } from 'react';

export type TransitionKind = 'dolly' | 'lights-up';

interface Props {
  kind: TransitionKind;
  onDone: () => void;
}

const DURATIONS: Record<TransitionKind, number> = {
  'dolly':     700,
  'lights-up': 500,
};

/**
 * Fullscreen overlay that runs a single CSS animation, then calls
 * `onDone` so the parent can unmount us. Pointer-events disabled so
 * input doesn't get blocked while the animation runs.
 */
export function TransitionOverlay({ kind, onDone }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onDone, DURATIONS[kind]);
    return () => window.clearTimeout(t);
  }, [kind, onDone]);
  return <div className={`transition-overlay ${kind}`} aria-hidden="true" />;
}
