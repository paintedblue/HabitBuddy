using HabitBuddy.Domain;
using HabitBuddy.Routine;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public sealed class HabitSelectionPanel : MonoBehaviour
    {
        [SerializeField] private RoutineSessionController routine;
        [SerializeField] private TMP_Text currentLabel;
        [SerializeField] private SideDrawerPanel drawer;

        public void Build()
        {
            routine?.SetHabit(HabitCatalog.Brushing);
            if (currentLabel != null) currentLabel.text = "";
            drawer?.Build();
        }

        public void SetDrawer(SideDrawerPanel value) => drawer = value;

        public void Show()
        {
            if (drawer == null) return;
            drawer.Show("시작 같이 해봐요!");
            var root = drawer.Content;
            HtmlMenuStyle.FlowLabel("Intro", root, "같이 해볼 습관을 골라봐요!", 23, new Color(.4f, .4f, .4f), 42, TextAlignmentOptions.Left, FontStyles.Bold);

            var grid = new GameObject("HabitGrid");
            grid.transform.SetParent(root, false);
            var element = grid.AddComponent<LayoutElement>();
            element.preferredHeight = 494;
            element.minHeight = 494;
            var layout = grid.AddComponent<GridLayoutGroup>();
            layout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            layout.constraintCount = 2;
            layout.spacing = new Vector2(22, 22);
            layout.cellSize = new Vector2(275, 236);

            CreateHabitCard(grid.transform, "🪥", "칫솔", "이 닦기", "약 2분", HtmlMenuStyle.Blue, HabitCatalog.Brushing);
            CreateHabitCard(grid.transform, "🫧", "거품", "손 씻기", "약 1분", HtmlMenuStyle.Hex("#E2FAF6"), HabitCatalog.Handwashing);
            CreateHabitCard(grid.transform, "🛏️", "침대", "이불 정리", "약 1분", HtmlMenuStyle.Hex("#F2EEFF"), new HabitTemplate
            {
                Id = "sleep",
                DisplayName = "이불 정리",
                DurationSeconds = 90,
                ProgressLyric = "반듯반듯 예쁘게"
            });
            CreateHabitCard(grid.transform, "🧸", "정리", "장난감 정리", "약 2분", HtmlMenuStyle.Hex("#FFF4E2"), new HabitTemplate
            {
                Id = "tidy",
                DisplayName = "장난감 정리",
                DurationSeconds = 120,
                ProgressLyric = "제자리에 쏙쏙쏙"
            });
            drawer.RefreshLayout();
        }

        private void CreateHabitCard(Transform root, string icon, string fallback, string label, string duration, Color color, HabitTemplate habit)
        {
            var button = HtmlMenuStyle.Button($"{label}Card", root, new Vector2(0, 236), Vector2.zero, color, 18, () => Select(habit));
            var buttonLayout = button.gameObject.AddComponent<LayoutElement>();
            buttonLayout.preferredWidth = 275;
            buttonLayout.preferredHeight = 236;
            buttonLayout.minWidth = 275;
            buttonLayout.minHeight = 236;
            var vertical = button.gameObject.AddComponent<VerticalLayoutGroup>();
            vertical.childAlignment = TextAnchor.MiddleCenter;
            vertical.childControlWidth = true;
            vertical.childControlHeight = false;
            vertical.childForceExpandHeight = false;
            vertical.spacing = 8;
            var iconLabel = HtmlMenuStyle.IconLabel("Icon", button.transform, icon, fallback, 44, HtmlMenuStyle.Text);
            var iconLayout = iconLabel.gameObject.AddComponent<LayoutElement>();
            iconLayout.preferredHeight = 62;
            iconLayout.minHeight = 62;
            HtmlMenuStyle.FlowLabel("Name", button.transform, label, 32, HtmlMenuStyle.Text, 48);
            HtmlMenuStyle.FlowLabel("Duration", button.transform, duration, 24, HtmlMenuStyle.Muted, 38, TextAlignmentOptions.Center, FontStyles.Bold);
        }

        private void Select(HabitTemplate habit)
        {
            routine.SetHabit(habit);
            if (currentLabel != null) currentLabel.text = $"오늘의 습관: {habit.DisplayName}";
            drawer?.Hide();
            routine.StartSelectedHabitIntro();
        }
    }
}
