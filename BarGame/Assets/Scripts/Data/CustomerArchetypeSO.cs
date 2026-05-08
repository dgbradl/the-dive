using System.Collections.Generic;
using UnityEngine;

namespace BarGame.Data
{
    [CreateAssetMenu(fileName = "Customer_", menuName = "BarGame/Customer Archetype")]
    public class CustomerArchetypeSO : ScriptableObject
    {
        public string id;
        public string displayName;

        [Tooltip("Drinks this customer prefers, by Drink id. Empty = no preference.")]
        public List<string> preferredDrinkIds = new List<string>();

        [Range(0f, 1f), Tooltip("Chance per tick this customer type spawns at the door.")]
        public float spawnWeight = 0.3f;

        [Range(0f, 5f), Tooltip("Tip multiplier on top of price.")]
        public float tipMultiplier = 0.15f;

        [Range(0, 10), Tooltip("Ticks before they leave if not served.")]
        public int patienceTicks = 4;

        [Range(0f, 1f), Tooltip("Chance they cause some kind of mishap when present.")]
        public float mishapChance = 0.05f;

        [Range(0f, 2f), Tooltip("Influence on reputation when satisfied.")]
        public float repInfluence = 1f;

        [TextArea(2, 4)] public string flavorText;
    }
}
