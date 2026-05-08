using System;
using System.Collections.Generic;

namespace BarGame.Core
{
    [Serializable]
    public class GameState
    {
        public int day = 1;
        public int cash = 200;
        public int reputation = 5;
        public int rngSeed = 1337;

        public List<HiredStaff> hiredStaff = new List<HiredStaff>();
        public List<DrinkPriceOverride> drinkPrices = new List<DrinkPriceOverride>();
        public List<string> ownedUpgradeIds = new List<string>();
        public List<StaffAssignment> assignments = new List<StaffAssignment>();
        public string nightlySpecialDrinkId = string.Empty;

        public static GameState NewGame()
        {
            var s = new GameState
            {
                day = 1,
                cash = 200,
                reputation = 5,
                rngSeed = new Random().Next(1, int.MaxValue),
            };
            s.hiredStaff.Add(new HiredStaff
            {
                instanceId = Guid.NewGuid().ToString("N"),
                staffArchetypeId = "marv_bartender",
                displayName = "Marv",
                mood = 70,
                wagePerDay = 30,
            });
            s.assignments.Add(new StaffAssignment
            {
                staffInstanceId = s.hiredStaff[0].instanceId,
                station = Station.Bar,
            });
            return s;
        }
    }

    [Serializable]
    public class HiredStaff
    {
        public string instanceId;
        public string staffArchetypeId;
        public string displayName;
        public int mood;
        public int wagePerDay;
    }

    [Serializable]
    public class DrinkPriceOverride
    {
        public string drinkId;
        public int price;
    }

    [Serializable]
    public class StaffAssignment
    {
        public string staffInstanceId;
        public Station station;
    }
}
