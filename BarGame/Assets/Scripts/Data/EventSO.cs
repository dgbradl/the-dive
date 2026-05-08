using UnityEngine;

namespace BarGame.Data
{
    public enum EventTone
    {
        Whimsical,
        Crisis,
        Lucky,
        Mishap,
    }

    [CreateAssetMenu(fileName = "Event_", menuName = "BarGame/Random Event")]
    public class EventSO : ScriptableObject
    {
        public string id;
        public string displayName;
        public EventTone tone = EventTone.Whimsical;

        [Range(0f, 1f), Tooltip("Per-tick base chance the event triggers (subject to filters).")]
        public float perTickChance = 0.02f;

        [Tooltip("Cash effect when event resolves (negative = cost).")]
        public int cashDelta = 0;

        [Tooltip("Reputation effect when event resolves.")]
        public int repDelta = 0;

        [TextArea(2, 4), Tooltip("Narrative line shown in the shift log.")]
        public string narrative = "Something weird happens.";

        [Tooltip("If non-empty, only fires when an upgrade with this id is owned.")]
        public string requiresUpgradeId = string.Empty;

        [Tooltip("If non-empty, only fires when this upgrade is NOT owned (e.g., 'no good sign').")]
        public string requiresNotUpgradeId = string.Empty;

        [Range(0, 100), Tooltip("Only fire after the player reaches at least this reputation.")]
        public int minReputation = 0;
    }
}
