using System.Collections.Generic;
using UnityEngine;
using BarGame.Data;

namespace BarGame.Core
{
    [CreateAssetMenu(fileName = "GameCatalog", menuName = "BarGame/Game Catalog")]
    public class GameCatalog : ScriptableObject
    {
        public List<DrinkSO> drinks = new List<DrinkSO>();
        public List<StaffSO> staffArchetypes = new List<StaffSO>();
        public List<CustomerArchetypeSO> customerArchetypes = new List<CustomerArchetypeSO>();
        public List<EventSO> events = new List<EventSO>();
        public List<UpgradeSO> upgrades = new List<UpgradeSO>();

        public DrinkSO FindDrink(string id) => drinks.Find(d => d != null && d.id == id);
        public StaffSO FindStaff(string id) => staffArchetypes.Find(s => s != null && s.id == id);
        public CustomerArchetypeSO FindCustomer(string id) => customerArchetypes.Find(c => c != null && c.id == id);
        public EventSO FindEvent(string id) => events.Find(e => e != null && e.id == id);
        public UpgradeSO FindUpgrade(string id) => upgrades.Find(u => u != null && u.id == id);
    }
}
