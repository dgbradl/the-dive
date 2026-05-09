import { useCallback, useEffect, useState } from 'react';
import { catalog } from './game/content';
import { applyReport, runShift } from './game/simulator';
import { clearSave, load, newGame, nextDaySeed, save } from './game/save';
import { defaultShiftConfig, Station, StaffRole, type GameState, type ShiftReport } from './game/types';
import { PlanningPanel } from './ui/PlanningPanel';
import { ShiftPanel } from './ui/ShiftPanel';
import { ResultsPanel } from './ui/ResultsPanel';

type Phase = 'planning' | 'shift' | 'results';

function naturalStation(role: StaffRole): Station {
  switch (role) {
    case StaffRole.Bartender: return Station.Bar;
    case StaffRole.Server: return Station.Floor;
    case StaffRole.Bouncer: return Station.Door;
  }
}

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

  const hireStaff = useCallback((archetypeId: string) => {
    setState((s) => {
      const arch = catalog.staffArchetypes.find((a) => a.id === archetypeId);
      if (!arch) return s;
      if (s.hiredStaff.some((h) => h.archetypeId === archetypeId)) return s;
      if (s.cash < arch.hireCost) return s;
      const instanceId = crypto.randomUUID();
      return {
        ...s,
        cash: s.cash - arch.hireCost,
        hiredStaff: [
          ...s.hiredStaff,
          {
            instanceId,
            archetypeId: arch.id,
            displayName: arch.displayName,
            mood: 70,
            wagePerDay: arch.baseWagePerDay,
          },
        ],
        assignments: [...s.assignments, { staffInstanceId: instanceId, station: naturalStation(arch.role) }],
      };
    });
  }, []);

  const fireStaff = useCallback((instanceId: string) => {
    setState((s) => ({
      ...s,
      hiredStaff: s.hiredStaff.filter((h) => h.instanceId !== instanceId),
      assignments: s.assignments.filter((a) => a.staffInstanceId !== instanceId),
    }));
  }, []);

  const assignStaff = useCallback((instanceId: string, station: Station) => {
    setState((s) => {
      const others = s.assignments.filter((a) => a.staffInstanceId !== instanceId);
      if (station === Station.OffShift) {
        return { ...s, assignments: others };
      }
      return { ...s, assignments: [...others, { staffInstanceId: instanceId, station }] };
    });
  }, []);

  return (
    <div className="app">
      {phase === 'planning' && (
        <PlanningPanel
          state={state}
          onStartShift={startShift}
          onResetSave={resetSave}
          onHire={hireStaff}
          onFire={fireStaff}
          onAssign={assignStaff}
        />
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
