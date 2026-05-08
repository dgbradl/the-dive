using NUnit.Framework;
using UnityEngine;
using BarGame.Core;
using BarGame.Data;
using BarGame.Sim;

namespace BarGame.Tests
{
    public class ShiftSimulatorTests
    {
        GameState state;
        GameCatalog catalog;
        ShiftConfig config;

        [SetUp]
        public void SetUp()
        {
            // Drinks
            var pbr = ScriptableObject.CreateInstance<DrinkSO>();
            pbr.id = "pbr"; pbr.displayName = "PBR"; pbr.costToMake = 1; pbr.suggestedPrice = 4; pbr.prepTicks = 1;

            var whiskey = ScriptableObject.CreateInstance<DrinkSO>();
            whiskey.id = "whiskey_sour"; whiskey.displayName = "Whiskey Sour"; whiskey.costToMake = 3; whiskey.suggestedPrice = 9; whiskey.prepTicks = 2;

            // Customer
            var regular = ScriptableObject.CreateInstance<CustomerArchetypeSO>();
            regular.id = "dive_regular"; regular.displayName = "Dive Regular";
            regular.preferredDrinkIds.Add("pbr");
            regular.spawnWeight = 0.5f;
            regular.tipMultiplier = 0.1f;
            regular.patienceTicks = 4;
            regular.mishapChance = 0f;
            regular.repInfluence = 1f;

            // Staff
            var marv = ScriptableObject.CreateInstance<StaffSO>();
            marv.id = "marv_bartender"; marv.displayName = "Marv";
            marv.role = StaffRole.Bartender; marv.baseWagePerDay = 30; marv.speed = 0.6f;

            // Catalog
            catalog = ScriptableObject.CreateInstance<GameCatalog>();
            catalog.drinks.Add(pbr);
            catalog.drinks.Add(whiskey);
            catalog.customerArchetypes.Add(regular);
            catalog.staffArchetypes.Add(marv);

            // Config
            config = ScriptableObject.CreateInstance<ShiftConfig>();
            config.tickCount = 20;
            config.spawnRateScale = 1f;
            config.repPerSatisfied = 0.25f;
            config.repPerWalkout = 0.5f;
            config.atmosphereCashPerCustomer = 1;

            // State with one bartender at the bar
            state = GameState.NewGame();
        }

        [Test]
        public void DeterministicForGivenSeed()
        {
            var a = ShiftSimulator.Run(state, config, catalog, seed: 42);
            var b = ShiftSimulator.Run(state, config, catalog, seed: 42);

            Assert.AreEqual(a.cashDelta, b.cashDelta, "Cash delta must match for identical seed.");
            Assert.AreEqual(a.repDelta, b.repDelta, "Rep delta must match for identical seed.");
            Assert.AreEqual(a.entries.Count, b.entries.Count, "Entry counts must match.");
            Assert.AreEqual(a.customersServed, b.customersServed);
            Assert.AreEqual(a.customersLost, b.customersLost);
        }

        [Test]
        public void DifferentSeedsProduceDifferentReports()
        {
            var a = ShiftSimulator.Run(state, config, catalog, seed: 1);
            var b = ShiftSimulator.Run(state, config, catalog, seed: 9999);
            // Highly likely to differ; if they ever match exactly we want to investigate.
            Assert.IsTrue(
                a.cashDelta != b.cashDelta || a.entries.Count != b.entries.Count,
                "Different seeds should produce different shift outcomes.");
        }

        [Test]
        public void NewBarMakesProfitOnAverageOverManyShifts()
        {
            int total = 0;
            const int trials = 50;
            for (int i = 0; i < trials; i++)
            {
                var r = ShiftSimulator.Run(state, config, catalog, seed: 1000 + i);
                total += r.cashDelta;
            }
            // Should average net positive before wages — that's the design contract for Day 1.
            Assert.Greater(total, 0, $"Average shift cashDelta over {trials} trials was non-positive (total={total}).");
        }

        [Test]
        public void NoStaffMeansNoServiceButShiftStillRuns()
        {
            state.assignments.Clear();
            var r = ShiftSimulator.Run(state, config, catalog, seed: 7);
            Assert.AreEqual(0, r.customersServed, "No bartender should mean nobody gets served.");
            // Walkouts may or may not happen depending on spawns, but the report should not be empty.
            Assert.IsNotNull(r.entries);
        }
    }
}
