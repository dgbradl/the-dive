import { useCallback, useEffect, useState } from 'react';
import { catalog } from './game/content';
import { evaluateMilestoneFor } from './game/milestones';
import { applyReport, runShift } from './game/simulator';
import { clearSave, load, newGame, nextDaySeed, save } from './game/save';
import { defaultShiftConfig, Station, StaffRole, type GameState, type ShiftReport } from './game/types';
import { PlanningPanel } from './ui/PlanningPanel';
import { ShiftPanel } from './ui/ShiftPanel';
import { ResultsPanel } from './ui/ResultsPanel';
import { GameOverPanel } from './ui/GameOverPanel';

type Phase = 'planning' | 'shift' | 'results' | 'gameOver';

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
    setState((s) => {
      const next: GameState = {
        ...s,
        day: s.day + 1,
        rngSeed: nextDaySeed(s.rngSeed, s.day + 1),
      };
      const outcome = evaluateMilestoneFor(next);
      if (outcome?.kind === 'fail-lease') {
        // Defer phase change — handled below in useEffect.
        return { ...next, _leaseFailed: true } as GameState & { _leaseFailed?: boolean };
      }
      if (outcome?.kind === 'fail-rep') {
        return { ...next, rentPerDay: outcome.newRent };
      }
      return next;
    });
    setPhase('planning');
  }, []);

  // After advancing day, if the lease check failed, transition to game over.
  useEffect(() => {
    const flagged = (state as GameState & { _leaseFailed?: boolean })._leaseFailed;
    if (flagged) setPhase('gameOver');
  }, [state]);

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

  const buyUpgrade = useCallback((upgradeId: string) => {
    setState((s) => {
      const up = catalog.upgrades.find((u) => u.id === upgradeId);
      if (!up) return s;
      if (s.ownedUpgradeIds.includes(upgradeId)) return s;
      if (s.cash < up.cost) return s;
      return {
        ...s,
        cash: s.cash - up.cost,
        ownedUpgradeIds: [...s.ownedUpgradeIds, upgradeId],
      };
    });
  }, []);

  const setNightlySpecial = useCallback((drinkId: string | null) => {
    setState((s) => ({ ...s, nightlySpecialDrinkId: drinkId }));
  }, []);

  const orderCase = useCallback((drinkId: string) => {
    setState((s) => {
      const drink = catalog.drinks.find((d) => d.id === drinkId);
      if (!drink) return s;
      if (s.cash < drink.casePrice) return s;
      const next = { ...s.drinkStock };
      next[drinkId] = (next[drinkId] ?? 0) + drink.caseSize;
      return { ...s, cash: s.cash - drink.casePrice, drinkStock: next };
    });
  }, []);

  const setDrinkPrice = useCallback((drinkId: string, price: number | null) => {
    setState((s) => {
      const others = s.drinkPrices.filter((p) => p.drinkId !== drinkId);
      if (price === null) {
        return { ...s, drinkPrices: others };
      }
      return { ...s, drinkPrices: [...others, { drinkId, price }] };
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
          onBuyUpgrade={buyUpgrade}
          onSetDrinkPrice={setDrinkPrice}
          onOrderCase={orderCase}
          onSetSpecial={setNightlySpecial}
        />
      )}
      {phase === 'shift' && lastReport && (
        <ShiftPanel report={lastReport} onComplete={onShiftComplete} />
      )}
      {phase === 'results' && lastReport && (
        <ResultsPanel report={lastReport} state={state} catalog={catalog} onNextDay={advanceDay} />
      )}
      {phase === 'gameOver' && (
        <GameOverPanel state={state} onRestart={resetSave} />
      )}
    </div>
  );
}
