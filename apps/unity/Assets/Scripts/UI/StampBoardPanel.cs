using HabitBuddy.Research;
using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public sealed class StampBoardPanel : MonoBehaviour
    {
        [SerializeField] private ResearchLogStore store;
        [SerializeField] private TMP_Text titleLabel;
        [SerializeField] private TMP_Text stampsLabel;
        [SerializeField] private SideDrawerPanel drawer;

        private readonly Dictionary<int, string> demoCalendar = new()
        {
            { 1, "칫솔" }, { 2, "칫솔" }, { 3, "칫솔" }, { 5, "칫솔" }, { 6, "칫솔" }, { 7, "칫솔" },
            { 8, "칫솔" }, { 10, "칫솔" }, { 12, "칫솔" }, { 13, "칫솔" }
        };

        public void SetDrawer(SideDrawerPanel value) => drawer = value;

        public void Show()
        {
            Refresh();
            if (drawer == null) return;
            drawer.Show("이 닦기 도장판");
            Render(drawer.Content);
        }

        public void Hide() => drawer?.Hide();

        public void Refresh()
        {
            var today = DateTimeOffset.Now;
            if (titleLabel != null) titleLabel.text = $"{today:yyyy년 M월} 도장판";
            if (stampsLabel != null) stampsLabel.text = "";
        }

        private void Render(Transform root)
        {
            var byDay = LoadCalendar();
            var today = DateTimeOffset.Now;

            const float cellSize = 64f;
            const float cellGap = 5f;
            const float calendarWidth = cellSize * 7f + cellGap * 6f;
            var firstDayOffset = (int)new DateTime(today.Year, today.Month, 1).DayOfWeek;
            var daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
            var totalCells = Mathf.CeilToInt((firstDayOffset + daysInMonth) / 7f) * 7;
            var rowCount = Mathf.Max(5, totalCells / 7);
            var gridHeight = (rowCount + 1) * cellSize + rowCount * cellGap;
            var cardHeight = 92f + gridHeight;

            var calendarCard = HtmlMenuStyle.FlowPanel("CalendarCard", root, cardHeight, Color.white, 18);
            var calendarLayout = calendarCard.gameObject.GetComponent<LayoutElement>();
            calendarLayout.preferredWidth = 540f;
            var cardLayout = calendarCard.gameObject.AddComponent<VerticalLayoutGroup>();
            cardLayout.childAlignment = TextAnchor.UpperCenter;
            cardLayout.childControlWidth = false;
            cardLayout.childControlHeight = false;
            cardLayout.childForceExpandWidth = false;
            cardLayout.childForceExpandHeight = false;
            cardLayout.padding = new RectOffset(18, 18, 12, 12);
            cardLayout.spacing = 7f;

            var header = new GameObject("CalendarHeader");
            header.transform.SetParent(calendarCard.transform, false);
            var headerElement = header.AddComponent<LayoutElement>();
            headerElement.preferredWidth = calendarWidth;
            headerElement.preferredHeight = 44;
            headerElement.minHeight = 44;
            var headerLayout = header.AddComponent<HorizontalLayoutGroup>();
            headerLayout.childAlignment = TextAnchor.MiddleCenter;
            headerLayout.childControlWidth = false;
            headerLayout.childControlHeight = true;
            headerLayout.childForceExpandWidth = false;

            var month = HtmlMenuStyle.Label("Month", header.transform, $"{today:yyyy년 M월}", 23, HtmlMenuStyle.Text, TextAlignmentOptions.Left, FontStyles.Bold);
            month.gameObject.AddComponent<LayoutElement>().preferredWidth = 300;
            var todayLabel = HtmlMenuStyle.Label("Today", header.transform, $"오늘 {today.Day}일", 19, HtmlMenuStyle.Muted, TextAlignmentOptions.Right, FontStyles.Bold);
            todayLabel.gameObject.AddComponent<LayoutElement>().preferredWidth = 170;

            var gridGo = new GameObject("CalendarGrid");
            gridGo.transform.SetParent(calendarCard.transform, false);
            var gridElement = gridGo.AddComponent<LayoutElement>();
            gridElement.preferredWidth = calendarWidth;
            gridElement.preferredHeight = gridHeight;
            gridElement.minHeight = gridHeight;
            var grid = gridGo.AddComponent<GridLayoutGroup>();
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            grid.constraintCount = 7;
            grid.childAlignment = TextAnchor.UpperCenter;
            grid.spacing = new Vector2(cellGap, cellGap);
            grid.cellSize = new Vector2(cellSize, cellSize);

            foreach (var dayName in new[] { "일", "월", "화", "수", "목", "금", "토" })
            {
                CreateWeekdayCell(gridGo.transform, dayName);
            }

            for (var index = 0; index < totalCells; index++)
            {
                var day = index - firstDayOffset + 1;
                if (day < 1 || day > daysInMonth)
                {
                    CreateBlankCalendarCell(gridGo.transform);
                    continue;
                }

                CreateCalendarCell(gridGo.transform, day, byDay.TryGetValue(day, out var stamp) ? stamp : "", day == today.Day);
            }

            var legend = HtmlMenuStyle.FlowPanel("StampLegend", root, 72, HtmlMenuStyle.Hex("#F7F6F1"), 16);
            var legendLayout = legend.gameObject.AddComponent<HorizontalLayoutGroup>();
            legendLayout.childAlignment = TextAnchor.MiddleCenter;
            legendLayout.childControlWidth = false;
            legendLayout.childControlHeight = true;
            legendLayout.childForceExpandWidth = false;
            legendLayout.spacing = 14f;
            CreateLegendItem(legend.transform, "이 닦기 완료");

            var streak = HtmlMenuStyle.FlowPanel("Streak", root, 96, HtmlMenuStyle.Hex("#F0F0EE"), 16);
            var row = streak.gameObject.AddComponent<HorizontalLayoutGroup>();
            row.childAlignment = TextAnchor.MiddleCenter;
            row.childControlHeight = true;
            row.childControlWidth = false;
            row.childForceExpandWidth = false;
            row.padding = new RectOffset(20, 20, 10, 10);
            row.spacing = 14;
            var fire = HtmlMenuStyle.IconLabel("Fire", streak.transform, "🔥", "연속", 30, HtmlMenuStyle.Text);
            var fireElement = fire.gameObject.AddComponent<LayoutElement>();
            fireElement.preferredWidth = 72;
            fireElement.preferredHeight = 72;
            fireElement.minHeight = 72;
            var texts = new GameObject("Texts");
            texts.transform.SetParent(streak.transform, false);
            var textsElement = texts.AddComponent<LayoutElement>();
            textsElement.preferredWidth = 410;
            textsElement.preferredHeight = 72;
            var v = texts.AddComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleLeft;
            v.childControlHeight = false;
            v.childControlWidth = true;
            v.childForceExpandWidth = true;
            v.spacing = 2;
            HtmlMenuStyle.FlowLabel("Title", texts.transform, "5일 연속!", 24, HtmlMenuStyle.Text, 32, TextAlignmentOptions.Left, FontStyles.Bold);
            HtmlMenuStyle.FlowLabel("Sub", texts.transform, "이 닦기 연속 기록이에요", 17, HtmlMenuStyle.Muted, 26, TextAlignmentOptions.Left, FontStyles.Bold);

            HtmlMenuStyle.FlowLabel("Stars", root, $"★ 총 {byDay.Count}일 이 닦기를 완료했어요!", 22, HtmlMenuStyle.Muted, 42);
            drawer.RefreshLayout();
        }

        private static void CreateLegendItem(Transform root, string labelText)
        {
            var item = new GameObject($"Legend{labelText}");
            item.transform.SetParent(root, false);
            var itemElement = item.AddComponent<LayoutElement>();
            itemElement.preferredWidth = 190f;
            itemElement.preferredHeight = 46f;
            var itemLayout = item.AddComponent<HorizontalLayoutGroup>();
            itemLayout.childAlignment = TextAnchor.MiddleCenter;
            itemLayout.childControlWidth = false;
            itemLayout.childControlHeight = false;
            itemLayout.spacing = 6f;

            var badge = HtmlMenuStyle.Panel("Badge", item.transform, new Vector2(28f, 28f), Vector2.zero, StampColor(), 14);
            badge.gameObject.AddComponent<LayoutElement>().preferredWidth = 28f;
            CreateCellText("Check", badge.transform, "✓", 18, Color.white, Vector2.zero, new Vector2(28f, 28f));

            var label = HtmlMenuStyle.Label("Label", item.transform, labelText, 17, HtmlMenuStyle.Text, TextAlignmentOptions.Left, FontStyles.Bold);
            label.gameObject.AddComponent<LayoutElement>().preferredWidth = 140f;
        }

        private static void CreateBlankCalendarCell(Transform root)
        {
            var cell = HtmlMenuStyle.Panel("Empty", root, new Vector2(64, 64), Vector2.zero, new Color(1f, 1f, 1f, 0f), 8);
            cell.raycastTarget = false;
        }

        private static void CreateWeekdayCell(Transform root, string dayName)
        {
            var cell = HtmlMenuStyle.Panel($"Weekday{dayName}", root, new Vector2(64, 64), Vector2.zero, new Color(1f, 1f, 1f, 0f), 8);
            cell.raycastTarget = false;
            var label = HtmlMenuStyle.Label("Label", cell.transform, dayName, 16, HtmlMenuStyle.Muted, TextAlignmentOptions.Center, FontStyles.Bold);
            label.rectTransform.anchorMin = Vector2.zero;
            label.rectTransform.anchorMax = Vector2.one;
            label.rectTransform.offsetMin = Vector2.zero;
            label.rectTransform.offsetMax = Vector2.zero;
        }

        private static void CreateCalendarCell(Transform root, int day, string stamp, bool today)
        {
            var hasStamp = !string.IsNullOrWhiteSpace(stamp);
            var cell = HtmlMenuStyle.Panel($"Calendar{day}", root, new Vector2(64, 64), Vector2.zero, hasStamp ? HtmlMenuStyle.AccentBg : HtmlMenuStyle.Hex("#F5F5F2"), 10);
            if (today)
            {
                var outline = cell.gameObject.AddComponent<Outline>();
                outline.effectColor = HtmlMenuStyle.Accent;
                outline.effectDistance = new Vector2(1.5f, -1.5f);
            }
            RenderCalendarCell(cell.transform, day, stamp, today);
        }

        private static TMP_Text CreateCellText(string name, Transform root, string value, float size, Color color, Vector2 position, Vector2 box)
        {
            var go = new GameObject(name);
            go.transform.SetParent(root, false);
            var text = go.AddComponent<TextMeshProUGUI>();
            var font = KoreanFontProvider.Get();
            if (font != null) text.font = font;
            text.text = value;
            text.fontSize = size;
            text.fontStyle = FontStyles.Bold;
            text.alignment = TextAlignmentOptions.Center;
            text.color = color;
            text.richText = false;
            text.textWrappingMode = TextWrappingModes.NoWrap;
            text.enableAutoSizing = true;
            text.fontSizeMin = Mathf.Max(8f, size - 5f);
            text.fontSizeMax = size;
            text.rectTransform.anchorMin = text.rectTransform.anchorMax = new Vector2(.5f, .5f);
            text.rectTransform.sizeDelta = box;
            text.rectTransform.anchoredPosition = position;
            return text;
        }

        private static void RenderCalendarCell(Transform root, int day, string stamp, bool today)
        {
            var hasStamp = !string.IsNullOrWhiteSpace(stamp);
            CreateCellText("Day", root, day.ToString(), hasStamp ? 14 : 20, today ? HtmlMenuStyle.OrangeText : HtmlMenuStyle.Muted, hasStamp ? new Vector2(0f, -18f) : Vector2.zero, hasStamp ? new Vector2(54f, 18f) : new Vector2(54f, 34f));

            if (!hasStamp) return;

            var badge = HtmlMenuStyle.Panel("StampBadge", root, new Vector2(30f, 30f), new Vector2(0f, 11f), StampColor(), 15);
            badge.raycastTarget = false;
            CreateCellText("Stamp", badge.transform, "✓", 19, Color.white, Vector2.zero, new Vector2(30f, 30f));
        }

        private static Color StampColor() => HtmlMenuStyle.Accent;

        private Dictionary<int, string> LoadCalendar()
        {
            var today = DateTimeOffset.Now;
            var byDay = new Dictionary<int, string>(demoCalendar);
            if (store == null) return byDay;

            foreach (var session in store.LoadSessions())
            {
                if (string.IsNullOrWhiteSpace(session.CompletedAtIso)) continue;
                if (!DateTimeOffset.TryParse(session.CompletedAtIso, out var date)) continue;
                if (date.Year != today.Year || date.Month != today.Month) continue;
                byDay[date.Day] = "칫솔";
            }
            return byDay;
        }

    }
}
