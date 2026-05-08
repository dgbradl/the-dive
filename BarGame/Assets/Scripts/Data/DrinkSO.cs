using UnityEngine;

namespace BarGame.Data
{
    [CreateAssetMenu(fileName = "Drink_", menuName = "BarGame/Drink")]
    public class DrinkSO : ScriptableObject
    {
        public string id;
        public string displayName;
        [Min(0)] public int costToMake = 2;
        [Min(0)] public int suggestedPrice = 6;
        [Min(1)] public int prepTicks = 1;
        [Tooltip("Higher = customers love it more.")]
        [Range(0f, 1f)] public float quality = 0.5f;
    }
}
