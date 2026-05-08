using UnityEngine;

namespace BarGame.Data
{
    [CreateAssetMenu(fileName = "Upgrade_", menuName = "BarGame/Upgrade")]
    public class UpgradeSO : ScriptableObject
    {
        public string id;
        public string displayName;
        [Min(0)] public int cost = 200;

        [Tooltip("Multiplier applied to per-tick spawn rate.")]
        public float spawnRateMultiplier = 1f;

        [Tooltip("Flat reputation gain per shift while owned.")]
        public int repPerShift = 0;

        [Tooltip("Flat tip bonus added per served customer (cents-of-flavor).")]
        public int tipBonus = 0;

        [TextArea(2, 4)] public string flavorText;
    }
}
