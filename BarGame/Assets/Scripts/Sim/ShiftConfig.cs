using UnityEngine;

namespace BarGame.Sim
{
    [CreateAssetMenu(fileName = "ShiftConfig", menuName = "BarGame/Shift Config")]
    public class ShiftConfig : ScriptableObject
    {
        [Min(1)] public int tickCount = 20;

        [Range(0f, 5f), Tooltip("Multiplier on customer spawn weights.")]
        public float spawnRateScale = 1f;

        [Tooltip("Reputation gained per satisfied customer (rounded).")]
        public float repPerSatisfied = 0.25f;

        [Tooltip("Reputation lost per walkout (customer leaves unserved).")]
        public float repPerWalkout = 0.5f;

        [Tooltip("Cash earned baseline per drink served regardless of price (atmosphere/cover).")]
        public int atmosphereCashPerCustomer = 1;

        public static ShiftConfig Default
        {
            get
            {
                var s = CreateInstance<ShiftConfig>();
                s.tickCount = 20;
                s.spawnRateScale = 1f;
                s.repPerSatisfied = 0.25f;
                s.repPerWalkout = 0.5f;
                s.atmosphereCashPerCustomer = 1;
                return s;
            }
        }
    }
}
