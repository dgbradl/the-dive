import { useCallback, useEffect, useState } from 'react';
import { catalog } from './game/content';
import { applyReport, runShift } from './game/simulator';
import { clearSave, load, newGame, nextDaySeed, save } from './game/save';
import { defaultShiftConfig, type GameState, type ShiftReport } from './game/types';
import { PlanningPanel } from './ui/PlanningPanel';
import { ShiftPanel } from './ui/ShiftPanel';
import { ResultsPanel } from './ui/ResultsPanel';

type Phase = 'planning' | 'shift' | 'results';

export function App() {
  const [state, setState] = useState<GameState>(() => load() ?? newGame());
  const [phase, setPhase] = useState<Phase>('planning');
  const [lastReport, setLastReport] = useState<ShiftReport | null>(null);

  // Persist on every state change.
  useEffect(() => {
    save(state);
  }, [state]);

  const startShift = useCallback(() => {
    const seed = nextDaySeed(state.rngSeed, state.day);
    const raw = runShift(state, defaultShiftConfig, catalog, seed);
    const { state: postState, report } = applyReport(state, raw);
    setLastReport(report);
    setState(postState);
    setPhase('shift');
  }, [state]);

  const onShiftComplete = useCallback(() => setPhase('results'), []);

  const advanceDay = useCallback(() => {
    setState((s) => ({
      ...s,
      day: s.day + 1,
      rngSeed: nextDaySeed(s.rngSeed, s.day + 1),
    }));
    setPhase('planning');
  }, []);

  const resetSave = useCallback(() => {
    clearSave();
    setState(newGame());
    setLastReport(null);
    setPhase('planning');
  }, []);

  return (
    <div className="app">
      {phase === 'planning' && (
        <PlanningPanel state={state} onStartShift={startShift} onResetSave={resetSave} />
      )}
      {phase === 'shift' && lastReport && (
        <ShiftPanel report={lastReport} onComplete={onShiftComplete} />
      )}
      {phase === 'results' && lastReport && (
        <ResultsPanel report={lastReport} onNextDay={advanceDay} />
      )}
    </div>
  );
}
