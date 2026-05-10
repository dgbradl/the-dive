import { useCallback, useEffect, useRef, useState } from 'react';
import { catalog } from './game/content';
import { newlyUnlocked } from './game/achievements';
import {
  loadCareerStats,
  recordRunEnd,
  recordShift,
  saveCareerStats,
  type CareerStats,
} from './game/careerStats';
import { evaluateMilestoneFor } from './game/milestones';
import { applyReport, runShift } from './game/simulator';
import { clearSave, load, newGame, nextDaySeed, save } from './game/save';
import { defaultShiftConfig, Station, StaffRole, type GameState, type ShiftReport, type Signature } from './game/types';
import { PlanningPanel } from './ui/PlanningPanel';
import { ShiftPanel } from './ui/ShiftPanel';
import { ResultsPanel } from './ui/ResultsPanel';
import { GameOverPanel } from './ui/GameOverPanel';
import { TransitionOverlay, type TransitionKind } from './ui/TransitionOverlay';

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
  const [career, setCareer] = useState<CareerStats>(() => loadCareerStats());
  const [unlockedThisShift, setUnlockedThisShift] = useState<string[]>([]);
  const [transition, setTransition] = useState<TransitionKind | null>(null);
  const prevPhaseRef = useRef<Phase>('planning');

  // Fire a transition overlay when the phase changes. planning→shift = dolly
  // (camera dolly into the bar). shift→results = lights-up cut.
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev !== phase) {
      if (prev === 'planning' && phase === 'shift') setTransition('dolly');
      else if (prev === 'shift' && phase === 'results') setTransition('lights-up');
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  // Persist on every state change.
  useEffect(() => {
    save(state);
  }, [state]);

  useEffect(() => {
    saveCareerStats(career);
  }, [career]);

  const startShift = useCallback(() => {
    const seed = nextDaySeed(state.rngSeed, state.day);
    const raw = runShift(state, defaultShiftConfig, catalog, seed);
    const { state: postState, report } = applyReport(state, raw);
    setLastReport(report);
    setState(postState);
    setCareer((c) => recordShift(c, report));
    setUnlockedThisShift([]); // reset for this shift; the effect below fills it
    setPhase('shift');
  }, [state]);

  // Evaluate achievement unlocks whenever the report or the day changes.
  // This covers both shift-driven (Crowded House, Big Tipper, Spotless…)
  // and day-state achievements (First Night, Lease Survivor).
  useEffect(() => {
    if (!lastReport) return;
    const unlocks = newlyUnlocked(
      { report: lastReport, state, career },
      career.unlockedAchievements,
    );
    if (unlocks.length === 0) return;
    setCareer((c) => ({ ...c, unlockedAchievements: [...c.unlockedAchievements, ...unlocks] }));
    setUnlockedThisShift((prev) => Array.from(new Set([...prev, ...unlocks])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.day, lastReport]);

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

  // After advancing day, if the lease check failed, record the run-end
  // and transition to game over.
  useEffect(() => {
    const flagged = (state as GameState & { _leaseFailed?: boolean })._leaseFailed;
    if (flagged) {
      setCareer((c) => recordRunEnd(c, state));
      setPhase('gameOver');
    }
  }, [state]);

  const resetSave = useCallback((scenarioId?: string) => {
    // If the player abandoned a run mid-stream (i.e. didn't already game-
    // over via lease loss), still credit the days survived to career stats.
    setState((current) => {
      const flagged = (current as GameState & { _leaseFailed?: boolean })._leaseFailed;
      if (!flagged) {
        setCareer((c) => recordRunEnd(c, current));
      }
      clearSave();
      return newGame(scenarioId);
    });
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

  const createSignature = useCallback((name: string, baseDrinkIds: [string, string]) => {
    setState((s) => {
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed) return s;
      const a = catalog.drinks.find((d) => d.id === baseDrinkIds[0]);
      const b = catalog.drinks.find((d) => d.id === baseDrinkIds[1]);
      if (!a || !b) return s;
      const id = `sig_${Date.now().toString(36)}`;
      const suggestedPrice = Math.max(2, Math.round(((a.suggestedPrice + b.suggestedPrice) / 2) * 1.4));
      const costToMake = a.costToMake + b.costToMake; // narrative — actual stock cost is the two bases
      const next: Signature = {
        id,
        displayName: trimmed,
        baseDrinkIds,
        suggestedPrice,
        costToMake,
      };
      return { ...s, signatures: [...s.signatures, next] };
    });
  }, []);

  const deleteSignature = useCallback((id: string) => {
    setState((s) => ({ ...s, signatures: s.signatures.filter((sig) => sig.id !== id) }));
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
          onCreateSignature={createSignature}
          onDeleteSignature={deleteSignature}
        />
      )}
      {phase === 'shift' && lastReport && (
        <ShiftPanel report={lastReport} onComplete={onShiftComplete} />
      )}
      {phase === 'results' && lastReport && (
        <ResultsPanel
          report={lastReport}
          state={state}
          catalog={catalog}
          onNextDay={advanceDay}
          newlyUnlockedIds={unlockedThisShift}
        />
      )}
      {phase === 'gameOver' && (
        <GameOverPanel state={state} career={career} onRestart={resetSave} />
      )}
      {transition && (
        <TransitionOverlay kind={transition} onDone={() => setTransition(null)} />
      )}
    </div>
  );
}
