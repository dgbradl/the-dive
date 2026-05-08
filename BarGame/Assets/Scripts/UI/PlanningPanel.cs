using UnityEngine;
using UnityEngine.UI;
using BarGame.Core;

namespace BarGame.UI
{
    public class PlanningPanel : MonoBehaviour
    {
        [Header("Wire in Inspector")]
        [SerializeField] Text dayLabel;
        [SerializeField] Text cashLabel;
        [SerializeField] Text repLabel;
        [SerializeField] Text staffSummaryLabel;
        [SerializeField] Button startShiftButton;

        void OnEnable()
        {
            if (startShiftButton != null)
            {
                startShiftButton.onClick.RemoveAllListeners();
                startShiftButton.onClick.AddListener(OnStartShift);
            }
        }

        public void Refresh()
        {
            var gm = GameManager.Instance;
            if (gm == null) return;
            var s = gm.State;
            if (dayLabel != null) dayLabel.text = $"Day {s.day}";
            if (cashLabel != null) cashLabel.text = $"${s.cash}";
            if (repLabel != null) repLabel.text = $"Rep {s.reputation}";
            if (staffSummaryLabel != null)
            {
                int n = s.hiredStaff.Count;
                staffSummaryLabel.text = n == 0 ? "No staff!" : $"{n} on payroll";
            }
        }

        void OnStartShift()
        {
            var gm = GameManager.Instance;
            if (gm != null) gm.StartShift();
        }
    }
}
