using UnityEngine;
using UnityEngine.UI;
using BarGame.Core;

namespace BarGame.UI
{
    public class ResultsPanel : MonoBehaviour
    {
        [Header("Wire in Inspector")]
        [SerializeField] Text headlineLabel;
        [SerializeField] Text earningsLabel;
        [SerializeField] Text repLabel;
        [SerializeField] Text wagesLabel;
        [SerializeField] Text servedLabel;
        [SerializeField] Button nextDayButton;

        void OnEnable()
        {
            if (nextDayButton != null)
            {
                nextDayButton.onClick.RemoveAllListeners();
                nextDayButton.onClick.AddListener(OnNextDay);
            }
        }

        public void Refresh()
        {
            var gm = GameManager.Instance;
            if (gm == null || gm.LastReport == null) return;
            var r = gm.LastReport;

            if (headlineLabel != null)
            {
                headlineLabel.text = r.cashDelta - r.wagesPaid >= 0
                    ? "Solid night."
                    : "Rough one.";
            }
            if (earningsLabel != null) earningsLabel.text = $"Earnings: ${r.cashDelta}";
            if (repLabel != null) repLabel.text = $"Rep change: {r.repDelta:+#;-#;0}";
            if (wagesLabel != null) wagesLabel.text = $"Wages: -${r.wagesPaid}";
            if (servedLabel != null) servedLabel.text = $"Served {r.customersServed}, lost {r.customersLost}";
        }

        void OnNextDay()
        {
            var gm = GameManager.Instance;
            if (gm != null) gm.AdvanceToNextDay();
        }
    }
}
