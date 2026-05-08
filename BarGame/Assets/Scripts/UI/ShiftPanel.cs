using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using BarGame.Core;
using BarGame.Sim;

namespace BarGame.UI
{
    public class ShiftPanel : MonoBehaviour
    {
        [Header("Wire in Inspector")]
        [SerializeField] Text logText;
        [SerializeField] ScrollRect logScroll;
        [SerializeField] Button skipButton;
        [SerializeField] float secondsPerEntry = 0.18f;

        Coroutine playRoutine;

        void OnEnable()
        {
            if (skipButton != null)
            {
                skipButton.onClick.RemoveAllListeners();
                skipButton.onClick.AddListener(Skip);
            }
        }

        public void Play()
        {
            if (playRoutine != null) StopCoroutine(playRoutine);
            playRoutine = StartCoroutine(PlayRoutine());
        }

        void Skip()
        {
            if (playRoutine != null) StopCoroutine(playRoutine);
            ShowAll();
            Done();
        }

        IEnumerator PlayRoutine()
        {
            var gm = GameManager.Instance;
            if (gm == null || gm.LastReport == null) { Done(); yield break; }
            if (logText != null) logText.text = string.Empty;

            var sb = new System.Text.StringBuilder();
            foreach (var entry in gm.LastReport.entries)
            {
                sb.AppendLine(FormatEntry(entry));
                if (logText != null) logText.text = sb.ToString();
                if (logScroll != null) logScroll.verticalNormalizedPosition = 0f;
                yield return new WaitForSeconds(secondsPerEntry);
            }
            Done();
        }

        void ShowAll()
        {
            var gm = GameManager.Instance;
            if (gm == null || gm.LastReport == null || logText == null) return;
            var sb = new System.Text.StringBuilder();
            foreach (var entry in gm.LastReport.entries) sb.AppendLine(FormatEntry(entry));
            logText.text = sb.ToString();
        }

        static string FormatEntry(ShiftEntry e)
        {
            string prefix = $"[t{e.tick:D2}]";
            string deltas = string.Empty;
            if (e.cashDelta != 0) deltas += $" ${e.cashDelta:+#;-#;0}";
            if (e.repDelta != 0) deltas += $" rep{e.repDelta:+#;-#;0}";
            return $"{prefix} {e.text}{deltas}";
        }

        void Done()
        {
            var gm = GameManager.Instance;
            if (gm != null) gm.OnShiftPlaybackComplete();
        }
    }
}
