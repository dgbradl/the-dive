using System;
using System.Collections.Generic;

namespace BarGame.Sim
{
    public enum ShiftEntryKind
    {
        Note,
        CustomerArrived,
        Served,
        Walkout,
        Mishap,
        Event,
        Wages,
    }

    [Serializable]
    public class ShiftEntry
    {
        public int tick;
        public ShiftEntryKind kind;
        public string text;
        public int cashDelta;
        public int repDelta;
    }

    [Serializable]
    public class ShiftReport
    {
        public int day;
        public int seed;
        public int cashDelta;
        public int repDelta;
        public int customersServed;
        public int customersLost;
        public int wagesPaid;
        public List<ShiftEntry> entries = new List<ShiftEntry>();

        public void Add(ShiftEntry e)
        {
            entries.Add(e);
            cashDelta += e.cashDelta;
            repDelta += e.repDelta;
        }
    }
}
