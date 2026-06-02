using HabitBuddy.Domain;
using HabitBuddy.Research;
using HabitBuddy.Routine;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public sealed class ObserverFormPanel : MonoBehaviour
    {
        [SerializeField] private ObserverNoteController observerNotes;
        [SerializeField] private RoutineSessionController routine;
        [SerializeField] private RoutineUiPresenter routineUi;
        [SerializeField] private TMP_Text statusLabel;
        [SerializeField] private SideDrawerPanel drawer;
        [SerializeField] private HabitSelectionPanel habitSelection;

        private const int StepCount = 6;
        private const string DirectInputLabel = "직접 입력";
        private readonly string[] difficultLabels = { "이 닦기", "손 씻기", "이불 정리", "장난감 정리", "일찍 자기", "밥 잘 먹기" };
        private readonly string[] difficultIcons = { "🪥", "🫧", "🛏️", "🧸", "😴", "🍽️" };
        private readonly string[] difficultFallbacks = { "칫솔", "거품", "침대", "정리", "잠", "밥" };
        private readonly string[] identityLabels = { "소방관", "의사", "우주비행사", "운동선수" };
        private readonly string[] identityIcons = { "🚒", "🩺", "🚀", "⚽" };
        private readonly string[] identityFallbacks = { "소방", "의사", "우주", "운동" };
        private readonly string[] foodLabels = { "피자", "라면", "떡볶이", "김밥", "치킨", "아이스크림" };
        private readonly string[] foodIcons = { "🍕", "🍜", "🌶️", "🍙", "🍗", "🍦" };
        private readonly string[] foodFallbacks = { "피자", "라면", "떡", "김밥", "치킨", "아이스" };
        private readonly string[] colorNames = { "주황", "노랑", "연두", "연초록", "민트", "하늘", "파랑", "남색", "보라", "분홍", "초록" };
        private readonly Color[] colors =
        {
            HtmlMenuStyle.Hex("#F5962A"), HtmlMenuStyle.Hex("#FFCC2E"), HtmlMenuStyle.Hex("#BFCC28"),
            HtmlMenuStyle.Hex("#84CC3C"), HtmlMenuStyle.Hex("#3ECFB2"), HtmlMenuStyle.Hex("#7BC8EE"),
            HtmlMenuStyle.Hex("#5B9FDA"), HtmlMenuStyle.Hex("#3877F7"), HtmlMenuStyle.Hex("#9279DF"),
            HtmlMenuStyle.Hex("#FF8CAD"), HtmlMenuStyle.Hex("#48CA02")
        };

        private int step;
        private Color favoriteColor = HtmlMenuStyle.Accent;

        public void Build()
        {
            gameObject.SetActive(true);
            drawer?.Build();
        }

        public void Show()
        {
            routineUi?.ShowProfilePrompt();
            step = 0;
            Render();
        }

        public void SetDrawer(SideDrawerPanel value) => drawer = value;

        public void SetHabitSelection(HabitSelectionPanel value) => habitSelection = value;

        private ChildProfile Profile => routine != null ? routine.Profile : null;

        private void Render()
        {
            if (drawer == null) return;
            drawer.Show("★ 너에 대해 알려줘");
            var root = drawer.Content;
            CreateDots(root);

            switch (step)
            {
                case 0:
                    RenderTextStep(root, "너의 이름이 뭐야?", "이름을 알려줘!", Profile?.Name ?? "", value => { if (Profile != null) Profile.Name = value; });
                    break;
                case 1:
                    RenderChoiceGrid(root, "어떤 게 제일 어려워?", difficultIcons, difficultFallbacks, difficultLabels, Profile?.HardHabit ?? "", "어려운 습관을 적어주세요", value =>
                    {
                        if (Profile != null)
                        {
                            Profile.HardHabit = value;
                            Profile.HabitBarrier = BarrierChoices(value)[0];
                        }
                        Next();
                    }, () =>
                    {
                        if (Profile == null) return;
                        Profile.HardHabit = DirectInputLabel;
                        Profile.HabitBarrier = "";
                        Render();
                    });
                    break;
                case 2:
                    RenderBarrierGrid(root);
                    break;
                case 3:
                    RenderIdentityGrid(root);
                    break;
                case 4:
                    RenderChoiceGrid(root, "제일 좋아하는 음식은?", foodIcons, foodFallbacks, foodLabels, Profile?.FavoriteFood ?? "", "좋아하는 음식을 적어주세요", value => { if (Profile != null) Profile.FavoriteFood = value; Next(); }, () =>
                    {
                        if (Profile == null) return;
                        Profile.FavoriteFood = DirectInputLabel;
                        Render();
                    });
                    break;
                case 5:
                    RenderColorGrid(root);
                    break;
                default:
                    RenderDone(root);
                    break;
            }
            CreateFooterButtons();
            drawer.RefreshLayout();
        }

        private void CreateDots(Transform root)
        {
            var row = new GameObject("StepDots");
            row.transform.SetParent(root, false);
            var layout = row.AddComponent<HorizontalLayoutGroup>();
            layout.childAlignment = TextAnchor.MiddleCenter;
            layout.childControlWidth = false;
            layout.childControlHeight = false;
            layout.spacing = 8f;
            var rowLayout = row.AddComponent<LayoutElement>();
            rowLayout.preferredHeight = 20;
            rowLayout.minHeight = 20;
            for (var i = 0; i < StepCount; i++)
            {
                var dot = HtmlMenuStyle.Panel($"Dot{i}", row.transform, new Vector2(i == step ? 48 : 20, 20), Vector2.zero, i <= step ? HtmlMenuStyle.Accent : HtmlMenuStyle.Hex("#E0E0E0"), 5);
                var dotLayout = dot.gameObject.AddComponent<LayoutElement>();
                dotLayout.preferredWidth = i == step ? 48 : 20;
                dotLayout.preferredHeight = 20;
                dotLayout.minWidth = i == step ? 48 : 20;
                dotLayout.minHeight = 20;
            }
        }

        private void RenderTextStep(Transform root, string question, string placeholder, string value, System.Action<string> update)
        {
            HtmlMenuStyle.FlowLabel("Question", root, question, 30, HtmlMenuStyle.Text, 64);
            var input = HtmlMenuStyle.FlowInput("ProfileInput", root, placeholder, 76);
            input.text = HtmlMenuStyle.StripTags(value);
            input.onValueChanged.AddListener(v => update(HtmlMenuStyle.StripTags(v).Trim()));
            CreatePrimaryButton(root, "확인! →", Next);
        }

        private void RenderChoiceGrid(Transform root, string question, string[] icons, string[] fallbacks, string[] labels, string currentValue, string placeholder, System.Action<string> onSelect, System.Action onDirectInput)
        {
            HtmlMenuStyle.FlowLabel("Question", root, question, 30, HtmlMenuStyle.Text, 64);
            var grid = RenderChoiceGridBody(root, "ChoiceGrid", icons, fallbacks, labels, GridHeightFor(labels.Length + 1, 2), value =>
            {
                onSelect(value);
            });
            if (currentValue == DirectInputLabel) RenderDirectInputChoice(root, currentValue, placeholder, onSelect);
            else CreateDirectInputChoiceCard(grid.transform, onDirectInput);
        }

        private void RenderBarrierGrid(Transform root)
        {
            HtmlMenuStyle.FlowLabel("Question", root, "왜 제일 어려울까요?", 30, HtmlMenuStyle.Text, 64);
            var labels = BarrierChoices(Profile?.HardHabit);
            var icons = new[] { "💬", "💬", "💬" };
            var fallbacks = new[] { "말", "말", "말" };
            var grid = RenderChoiceGridBody(root, "BarrierGrid", icons, fallbacks, labels, GridHeightFor(labels.Length + 1, 2), value =>
            {
                if (Profile != null) Profile.HabitBarrier = value;
                Next();
            });
            if (Profile?.HabitBarrier == DirectInputLabel)
            {
                RenderDirectInputChoice(root, Profile.HabitBarrier, "어려운 이유를 적어주세요", result =>
                {
                    if (Profile != null) Profile.HabitBarrier = result;
                    Next();
                });
            }
            else
            {
                CreateDirectInputChoiceCard(grid.transform, () =>
                {
                    if (Profile == null) return;
                    Profile.HabitBarrier = DirectInputLabel;
                    Render();
                });
            }
        }

        private void RenderIdentityGrid(Transform root)
        {
            HtmlMenuStyle.FlowLabel("Question", root, "커서 어떤 모습이 되고 싶어?", 28, HtmlMenuStyle.Text, 64);
            var grid = RenderChoiceGridBody(root, "IdentityGrid", identityIcons, identityFallbacks, identityLabels, GridHeightFor(identityLabels.Length + 1, 2), value =>
            {
                if (Profile == null) return;
                Profile.DreamIdentity = value;
                Profile.DreamIdentityCustom = "";
                Next();
            });
            if (Profile?.DreamIdentity == "기타")
            {
                var input = HtmlMenuStyle.FlowInput("DreamInput", root, "어떤 모습인지 알려줘!", 76);
                input.text = HtmlMenuStyle.StripTags(Profile?.DreamIdentityCustom ?? "");
                input.onValueChanged.AddListener(v =>
                {
                    if (Profile != null) Profile.DreamIdentityCustom = HtmlMenuStyle.StripTags(v).Trim();
                });
                CreatePrimaryButton(root, "확인! →", () =>
                {
                    if (string.IsNullOrWhiteSpace(Profile?.DreamIdentityCustom)) return;
                    Next();
                });
            }
            else
            {
                CreateDirectInputChoiceCard(grid.transform, () =>
                {
                    if (Profile == null) return;
                    Profile.DreamIdentity = "기타";
                    Render();
                });
            }
        }

        private GridLayoutGroup RenderChoiceGridBody(Transform root, string name, string[] icons, string[] fallbacks, string[] labels, float height, System.Action<string> onSelect)
        {
            var grid = CreateGrid(root, name, 2, 22, height);
            for (var i = 0; i < labels.Length; i++)
            {
                var label = labels[i];
                var index = i;
                var button = HtmlMenuStyle.Button($"{name}Choice{i}", grid.transform, new Vector2(0, 168), Vector2.zero, HtmlMenuStyle.Hex("#F6F6F4"), 18, () => onSelect(label));
                var buttonLayout = button.gameObject.AddComponent<LayoutElement>();
                buttonLayout.preferredWidth = 275;
                buttonLayout.preferredHeight = 168;
                buttonLayout.minWidth = 275;
                buttonLayout.minHeight = 168;
                var v = button.gameObject.AddComponent<VerticalLayoutGroup>();
                v.childAlignment = TextAnchor.MiddleCenter;
                v.childControlHeight = false;
                v.childControlWidth = true;
                v.spacing = 4;
                var icon = HtmlMenuStyle.IconLabel("Icon", button.transform, icons[index], fallbacks[index], 40, HtmlMenuStyle.Text);
                var iconLayout = icon.gameObject.AddComponent<LayoutElement>();
                iconLayout.preferredHeight = 58;
                iconLayout.minHeight = 58;
                HtmlMenuStyle.FlowLabel("Label", button.transform, label, label.Length > 10 ? 20 : 24, HtmlMenuStyle.Text, 58);
            }
            return grid;
        }

        private void RenderColorGrid(Transform root)
        {
            HtmlMenuStyle.FlowLabel("Question", root, "제일 좋아하는 색깔은?", 30, HtmlMenuStyle.Text, 64);
            var grid = CreateGrid(root, "ColorGrid", 3, 14, 546);
            for (var i = 0; i < colors.Length; i++)
            {
                var index = i;
                var swatch = HtmlMenuStyle.Button($"Color{index}", grid.transform, new Vector2(0, 126), Vector2.zero, colors[index], 16, () =>
                {
                    favoriteColor = colors[index];
                    Next();
                });
                var swatchLayout = swatch.gameObject.AddComponent<LayoutElement>();
                swatchLayout.preferredWidth = 166;
                swatchLayout.preferredHeight = 126;
                swatchLayout.minWidth = 166;
                swatchLayout.minHeight = 126;
                var label = HtmlMenuStyle.Label("Label", swatch.transform, colorNames[index], 22, Color.white);
                Stretch(label.rectTransform);
            }
        }

        private void RenderDone(Transform root)
        {
            var name = string.IsNullOrWhiteSpace(Profile?.Name) ? "친구" : Profile.Name;
            var hardHabit = string.IsNullOrWhiteSpace(Profile?.HardHabit) ? "습관" : Profile.HardHabit;
            var barrier = string.IsNullOrWhiteSpace(Profile?.HabitBarrier) ? "조금 어려워도" : Profile.HabitBarrier;
            var dream = Profile?.DreamIdentity == "기타" ? Profile?.DreamIdentityCustom : Profile?.DreamIdentity;
            if (string.IsNullOrWhiteSpace(dream)) dream = "멋진 모습";
            HtmlMenuStyle.FlowLabel("DoneIcon", root, "!", 64, HtmlMenuStyle.Accent, 76);
            HtmlMenuStyle.FlowLabel("DoneTitle", root, $"{name}야, 완성됐어!", 30, HtmlMenuStyle.Text, 48);
            var card = HtmlMenuStyle.FlowPanel("SongCard", root, 176, new Color(favoriteColor.r, favoriteColor.g, favoriteColor.b, .16f), 18);
            var text = HtmlMenuStyle.Label("Song", card.transform, $"♪ \"{name}야, {hardHabit} 같이 해봐요~\"\n{barrier} 괜찮아\n{dream}처럼 멋진 {name}만의 동요!", 22, HtmlMenuStyle.OrangeText);
            text.lineSpacing = 16;
            Stretch(text.rectTransform, 16, 12);
            CreatePrimaryButton(root, "같이 습관 해보러 가기!", ShowHabitSelection);
        }

        private GridLayoutGroup CreateGrid(Transform root, string name, int columns, float spacing, float height)
        {
            var go = new GameObject(name);
            go.transform.SetParent(root, false);
            var layoutElement = go.AddComponent<LayoutElement>();
            layoutElement.preferredHeight = height;
            layoutElement.minHeight = height;
            layoutElement.preferredWidth = columns == 2 ? 572 : 526;
            var grid = go.AddComponent<GridLayoutGroup>();
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            grid.constraintCount = columns;
            grid.spacing = new Vector2(spacing, spacing);
            grid.cellSize = columns == 2 ? new Vector2(275, 168) : new Vector2(166, 126);
            return grid;
        }

        private void CreatePrimaryButton(Transform root, string label, UnityEngine.Events.UnityAction action)
        {
            var button = HtmlMenuStyle.FlowButton("Primary", root, 76, HtmlMenuStyle.Accent, 18, action);
            var text = HtmlMenuStyle.Label("Label", button.transform, label, 27, Color.white);
            Stretch(text.rectTransform);
        }

        private void Next()
        {
            step++;
            Render();
        }

        private void Back()
        {
            if (step <= 0) return;
            step--;
            Render();
        }

        private void CreateFooterButtons()
        {
            if (drawer == null || drawer.Footer == null || step >= StepCount) return;
            var hasBack = step > 0;
            if (!hasBack) return;

            drawer.ShowFooter();
            CreateFooterButton("Back", "← 뒤로", Color.white, new Color(.4f, .4f, .4f), Back, 260, false);
        }

        private static string[] BarrierChoices(string habit)
        {
            var choices = habit switch
            {
                "손 씻기" => new[] { "물이 차가워요", "비누 느낌이 싫어요", "빨리 놀고 싶어요" },
                "이불 정리" => new[] { "어떻게 해야 할지 몰라요", "귀찮아요", "혼자 하기 싫어요" },
                "장난감 정리" => new[] { "아직 더 놀고 싶어요", "어디에 둘지 몰라요", "너무 많아요" },
                "일찍 자기" => new[] { "어두운 게 무서워요", "더 놀고 싶어요", "잠이 안 와요" },
                "밥 잘 먹기" => new[] { "맛이 낯설어요", "씹기 힘들어요", "배가 안 고파요" },
                _ => new[] { "맛이 싫어요", "귀찮아요", "입에 넣는 느낌이 싫어요" }
            };
            return choices;
        }

        private void CreateFooterButton(string name, string labelText, Color background, Color textColor, UnityEngine.Events.UnityAction action, float width, bool outline)
        {
            var button = HtmlMenuStyle.Button(name, drawer.Footer, new Vector2(width, 58), Vector2.zero, background, 14, action);
            var buttonLayout = button.gameObject.AddComponent<LayoutElement>();
            buttonLayout.preferredWidth = width;
            buttonLayout.preferredHeight = 58;
            buttonLayout.minWidth = width;
            buttonLayout.minHeight = 58;
            if (outline)
            {
                var buttonOutline = button.gameObject.AddComponent<Outline>();
                buttonOutline.effectColor = new Color(0f, 0f, 0f, .08f);
                buttonOutline.effectDistance = new Vector2(1f, -1f);
            }
            var label = HtmlMenuStyle.Label("Label", button.transform, labelText, labelText.Length > 5 ? 21 : 22, textColor, TextAlignmentOptions.Center, FontStyles.Bold);
            Stretch(label.rectTransform);
        }

        private void CreateDirectInputChoiceCard(Transform root, System.Action action)
        {
            var button = HtmlMenuStyle.Button("DirectInputChoice", root, new Vector2(0, 168), Vector2.zero, HtmlMenuStyle.Hex("#F6F6F4"), 18, () => action?.Invoke());
            var buttonLayout = button.gameObject.AddComponent<LayoutElement>();
            buttonLayout.preferredWidth = 275;
            buttonLayout.preferredHeight = 168;
            buttonLayout.minWidth = 275;
            buttonLayout.minHeight = 168;
            var v = button.gameObject.AddComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.childControlHeight = false;
            v.childControlWidth = true;
            v.spacing = 4;
            var icon = HtmlMenuStyle.IconLabel("Icon", button.transform, "✎", "직접", 40, HtmlMenuStyle.Text);
            var iconLayout = icon.gameObject.AddComponent<LayoutElement>();
            iconLayout.preferredHeight = 58;
            iconLayout.minHeight = 58;
            HtmlMenuStyle.FlowLabel("Label", button.transform, "직접 입력하기", 22, HtmlMenuStyle.Text, 58);
        }

        private void RenderDirectInputChoice(Transform root, string currentValue, string placeholder, System.Action<string> onConfirm)
        {
            var input = HtmlMenuStyle.FlowInput("DirectInput", root, placeholder, 76);
            input.text = HtmlMenuStyle.StripTags(currentValue == DirectInputLabel ? "" : currentValue);
            var value = input.text;
            input.onValueChanged.AddListener(v => value = HtmlMenuStyle.StripTags(v).Trim());
            CreatePrimaryButton(root, "확인! →", () =>
            {
                if (string.IsNullOrWhiteSpace(value)) return;
                onConfirm(value);
            });
        }

        private void ShowHabitSelection()
        {
            if (habitSelection == null) return;
            habitSelection.Show();
        }

        private static float GridHeightFor(int itemCount, int columns)
        {
            const float cardHeight = 168f;
            const float gap = 22f;
            var rows = Mathf.CeilToInt(itemCount / (float)columns);
            return rows * cardHeight + Mathf.Max(0, rows - 1) * gap;
        }

        private static void Stretch(RectTransform rect, float x = 0f, float y = 0f)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(x, y);
            rect.offsetMax = new Vector2(-x, -y);
        }
    }
}
