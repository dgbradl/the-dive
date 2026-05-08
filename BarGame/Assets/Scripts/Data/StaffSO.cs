using System;
using UnityEngine;

namespace BarGame.Data
{
    [Flags]
    public enum StaffTrait
    {
        None    = 0,
        Quick   = 1 << 0,
        Chatty  = 1 << 1,
        Lazy    = 1 << 2,
        Klutz   = 1 << 3,
        Surly   = 1 << 4,
        Charming = 1 << 5,
    }

    public enum StaffRole
    {
        Bartender,
        Server,
        Bouncer,
    }

    [CreateAssetMenu(fileName = "Staff_", menuName = "BarGame/Staff Archetype")]
    public class StaffSO : ScriptableObject
    {
        public string id;
        public string displayName;
        public StaffRole role;
        [Min(0)] public int baseWagePerDay = 30;
        [Min(0)] public int hireCost = 100;
        public StaffTrait traits = StaffTrait.None;

        [Range(0f, 1f)] public float speed = 0.5f;
        [Range(0f, 1f)] public float charm = 0.5f;
        [Range(0f, 1f)] public float reliability = 0.5f;

        [TextArea(2, 4)] public string flavorText;

        public bool HasTrait(StaffTrait t) => (traits & t) == t;
    }
}
