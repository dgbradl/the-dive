using UnityEngine;

namespace BarGame.UI
{
    public class UIRouter : MonoBehaviour
    {
        [SerializeField] PlanningPanel planning;
        [SerializeField] ShiftPanel shift;
        [SerializeField] ResultsPanel results;

        public void ShowPlanning()
        {
            SetActive(planning, shift, results, planning);
            if (planning != null) planning.Refresh();
        }

        public void ShowShift()
        {
            SetActive(planning, shift, results, shift);
            if (shift != null) shift.Play();
        }

        public void ShowResults()
        {
            SetActive(planning, shift, results, results);
            if (results != null) results.Refresh();
        }

        static void SetActive(PlanningPanel p, ShiftPanel s, ResultsPanel r, Behaviour active)
        {
            if (p != null) p.gameObject.SetActive(p == active);
            if (s != null) s.gameObject.SetActive(s == active);
            if (r != null) r.gameObject.SetActive(r == active);
        }
    }
}
