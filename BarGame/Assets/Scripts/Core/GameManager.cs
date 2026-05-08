using UnityEngine;
using BarGame.Sim;
using BarGame.UI;

namespace BarGame.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [SerializeField] GameCatalog catalog;
        [SerializeField] UIRouter router;
        [SerializeField] ShiftConfig shiftConfig;

        public GameState State { get; private set; }
        public GameCatalog Catalog => catalog;
        public ShiftConfig ShiftConfig => shiftConfig != null ? shiftConfig : ShiftConfig.Default;

        ShiftReport lastReport;
        public ShiftReport LastReport => lastReport;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;

            State = SaveSystem.Load() ?? GameState.NewGame();
        }

        void Start()
        {
            if (router != null) router.ShowPlanning();
        }

        public void StartShift()
        {
            int seed = State.rngSeed ^ State.day;
            lastReport = ShiftSimulator.Run(State, ShiftConfig, catalog, seed);
            ApplyReport(lastReport);
            if (router != null) router.ShowShift();
        }

        public void OnShiftPlaybackComplete()
        {
            if (router != null) router.ShowResults();
        }

        public void AdvanceToNextDay()
        {
            State.day += 1;
            State.rngSeed = unchecked(State.rngSeed * 1103515245 + 12345);
            SaveSystem.Save(State);
            if (router != null) router.ShowPlanning();
        }

        void ApplyReport(ShiftReport report)
        {
            State.cash += report.cashDelta;
            State.reputation = Mathf.Clamp(State.reputation + report.repDelta, 0, 100);
            // Pay wages at end of shift
            int wages = 0;
            foreach (var s in State.hiredStaff) wages += s.wagePerDay;
            State.cash -= wages;
            report.wagesPaid = wages;
        }
    }
}
