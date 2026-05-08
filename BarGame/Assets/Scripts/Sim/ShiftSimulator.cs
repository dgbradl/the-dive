using System;
using System.Collections.Generic;
using BarGame.Core;
using BarGame.Data;

namespace BarGame.Sim
{
    /// <summary>
    /// Pure C# turn-based shift simulator. Deterministic given a seed.
    /// No Unity API references so this file is fully unit-testable.
    /// </summary>
    public static class ShiftSimulator
    {
        public static ShiftReport Run(GameState state, ShiftConfig config, GameCatalog catalog, int seed)
        {
            var report = new ShiftReport { day = state.day, seed = seed };
            if (state == null || config == null || catalog == null)
            {
                report.entries.Add(new ShiftEntry { tick = 0, kind = ShiftEntryKind.Note, text = "Missing data — empty shift." });
                return report;
            }

            var rng = new Random(seed);

            // Index assignments by station for quick lookup.
            int barStaff = 0, floorStaff = 0, doorStaff = 0;
            float barSpeed = 0f, floorCharm = 0f;
            foreach (var a in state.assignments)
            {
                var hired = state.hiredStaff.Find(h => h.instanceId == a.staffInstanceId);
                if (hired == null) continue;
                var arch = catalog.FindStaff(hired.staffArchetypeId);
                switch (a.station)
                {
                    case Station.Bar:
                        barStaff++;
                        barSpeed += arch != null ? arch.speed : 0.4f;
                        break;
                    case Station.Floor:
                        floorStaff++;
                        floorCharm += arch != null ? arch.charm : 0.4f;
                        break;
                    case Station.Door:
                        doorStaff++;
                        break;
                }
            }

            // Aggregate upgrade modifiers
            float spawnMult = config.spawnRateScale;
            int passiveTipBonus = 0;
            int passiveRep = 0;
            foreach (var upId in state.ownedUpgradeIds)
            {
                var up = catalog.FindUpgrade(upId);
                if (up == null) continue;
                spawnMult *= up.spawnRateMultiplier;
                passiveTipBonus += up.tipBonus;
                passiveRep += up.repPerShift;
            }
            if (passiveRep != 0)
            {
                report.Add(new ShiftEntry
                {
                    tick = 0,
                    kind = ShiftEntryKind.Note,
                    text = $"Atmosphere boost: +{passiveRep} rep",
                    repDelta = passiveRep,
                });
            }

            // Track waiting customers: each is a tick countdown until walkout.
            var waiting = new List<WaitingCustomer>();

            for (int tick = 1; tick <= config.tickCount; tick++)
            {
                // 1. Spawn customers
                foreach (var arch in catalog.customerArchetypes)
                {
                    if (arch == null) continue;
                    float roll = (float)rng.NextDouble();
                    if (roll < arch.spawnWeight * spawnMult)
                    {
                        waiting.Add(new WaitingCustomer
                        {
                            archetype = arch,
                            patienceLeft = arch.patienceTicks,
                        });
                        report.Add(new ShiftEntry
                        {
                            tick = tick,
                            kind = ShiftEntryKind.CustomerArrived,
                            text = $"{arch.displayName} walks in.",
                        });
                    }
                }

                // 2. Service capacity for this tick
                int capacity = Math.Max(0, barStaff) + (floorStaff > 0 ? 1 : 0);
                if (capacity == 0 && barStaff == 0)
                {
                    // No bartender = no service this tick.
                }
                else
                {
                    // Speed bonus from quick bartenders gives extra serves with diminishing returns.
                    float speedBonus = barStaff > 0 ? barSpeed / Math.Max(1, barStaff) : 0f;
                    if (rng.NextDouble() < speedBonus * 0.5f) capacity += 1;
                }

                // 3. Serve waiting customers
                while (capacity > 0 && waiting.Count > 0)
                {
                    var c = waiting[0];
                    waiting.RemoveAt(0);
                    capacity--;

                    var drink = PickDrinkForCustomer(c.archetype, catalog, rng);
                    int price = ResolvePrice(drink, state);
                    int cost = drink != null ? drink.costToMake : 2;
                    int baseTip = (int)Math.Round(price * c.archetype.tipMultiplier);
                    float charmFactor = floorStaff > 0 ? Math.Min(1.5f, 1f + (floorCharm / Math.Max(1, floorStaff))) : 1f;
                    int tip = (int)Math.Round((baseTip + passiveTipBonus) * charmFactor);

                    int net = (price - cost) + tip + config.atmosphereCashPerCustomer;
                    int rep = (int)Math.Round(c.archetype.repInfluence * config.repPerSatisfied);

                    report.customersServed++;
                    report.Add(new ShiftEntry
                    {
                        tick = tick,
                        kind = ShiftEntryKind.Served,
                        text = drink != null
                            ? $"Served {c.archetype.displayName} a {drink.displayName} (+${net}, tip ${tip})"
                            : $"Served {c.archetype.displayName} (+${net})",
                        cashDelta = net,
                        repDelta = rep,
                    });

                    // Mishap roll on served customer
                    if (rng.NextDouble() < c.archetype.mishapChance)
                    {
                        int mishapCost = -(rng.Next(2, 8));
                        report.Add(new ShiftEntry
                        {
                            tick = tick,
                            kind = ShiftEntryKind.Mishap,
                            text = $"{c.archetype.displayName} causes a small scene.",
                            cashDelta = mishapCost,
                            repDelta = -1,
                        });
                    }
                }

                // 4. Tick down patience for unserved customers
                for (int i = waiting.Count - 1; i >= 0; i--)
                {
                    waiting[i].patienceLeft--;
                    if (waiting[i].patienceLeft <= 0)
                    {
                        var lost = waiting[i];
                        waiting.RemoveAt(i);
                        report.customersLost++;
                        int repHit = -(int)Math.Ceiling(config.repPerWalkout);
                        report.Add(new ShiftEntry
                        {
                            tick = tick,
                            kind = ShiftEntryKind.Walkout,
                            text = $"{lost.archetype.displayName} gets tired of waiting and leaves.",
                            repDelta = repHit,
                        });
                    }
                }

                // 5. Random event roll
                MaybeFireEvent(tick, state, catalog, rng, report, doorStaff > 0);
            }

            // Anyone left waiting at close walks out.
            foreach (var c in waiting)
            {
                report.customersLost++;
                report.Add(new ShiftEntry
                {
                    tick = config.tickCount,
                    kind = ShiftEntryKind.Walkout,
                    text = $"{c.archetype.displayName} doesn't get served before close.",
                    repDelta = -1,
                });
            }

            return report;
        }

        static DrinkSO PickDrinkForCustomer(CustomerArchetypeSO arch, GameCatalog catalog, Random rng)
        {
            if (arch.preferredDrinkIds != null && arch.preferredDrinkIds.Count > 0)
            {
                var id = arch.preferredDrinkIds[rng.Next(arch.preferredDrinkIds.Count)];
                var d = catalog.FindDrink(id);
                if (d != null) return d;
            }
            if (catalog.drinks.Count == 0) return null;
            return catalog.drinks[rng.Next(catalog.drinks.Count)];
        }

        static int ResolvePrice(DrinkSO drink, GameState state)
        {
            if (drink == null) return 5;
            var ovr = state.drinkPrices.Find(p => p.drinkId == drink.id);
            return ovr != null && ovr.price > 0 ? ovr.price : drink.suggestedPrice;
        }

        static void MaybeFireEvent(int tick, GameState state, GameCatalog catalog, Random rng, ShiftReport report, bool hasBouncer)
        {
            if (catalog.events == null) return;
            foreach (var ev in catalog.events)
            {
                if (ev == null) continue;
                if (state.reputation < ev.minReputation) continue;
                if (!string.IsNullOrEmpty(ev.requiresUpgradeId) && !state.ownedUpgradeIds.Contains(ev.requiresUpgradeId)) continue;
                if (!string.IsNullOrEmpty(ev.requiresNotUpgradeId) && state.ownedUpgradeIds.Contains(ev.requiresNotUpgradeId)) continue;

                if (rng.NextDouble() < ev.perTickChance)
                {
                    int cd = ev.cashDelta;
                    int rd = ev.repDelta;
                    string narrative = ev.narrative;

                    // Bouncer mitigates Crisis-tone events.
                    if (ev.tone == EventTone.Crisis && hasBouncer)
                    {
                        cd = cd / 2;
                        rd = rd / 2;
                        narrative = $"{ev.displayName} — bouncer steps in, defuses it.";
                    }

                    report.Add(new ShiftEntry
                    {
                        tick = tick,
                        kind = ShiftEntryKind.Event,
                        text = narrative,
                        cashDelta = cd,
                        repDelta = rd,
                    });
                    return; // one event per tick max
                }
            }
        }

        sealed class WaitingCustomer
        {
            public CustomerArchetypeSO archetype;
            public int patienceLeft;
        }
    }
}
