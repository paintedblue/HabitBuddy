using HabitBuddy.Character;
using HabitBuddy.Domain;
using HabitBuddy.World;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public sealed class CharacterSelectionPanel : MonoBehaviour
    {
        [SerializeField] private TMP_Text currentLabel;
        [SerializeField] private ProceduralCharacterBuilder characterBuilder;
        [SerializeField] private ChildProfile profile;
        [SerializeField] private ThemeController themeController;

        private GameObject overlay;
        private GameObject topButton;
        private TMP_Text buttonName;
        private bool topButtonRequestedVisible = true;
        private bool topButtonSuppressed;
        public string SelectedCharacterId { get; private set; } = "bear";

        public void Build()
        {
            CreateTopButton();
            BuildOverlay();
            Select("bear", "토리", false);
        }

        private void CreateTopButton()
        {
            var button = HtmlMenuStyle.Button("CharacterTopButton", transform, new Vector2(220, 58), new Vector2(650, 410), new Color(1f, 1f, 1f, .92f), 29, Show);
            topButton = button.gameObject;
            var shadow = topButton.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, .1f);
            shadow.effectDistance = new Vector2(0f, -4f);
            var outline = topButton.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 1f, 1f, .5f);
            outline.effectDistance = new Vector2(2f, -2f);

            buttonName = HtmlMenuStyle.Label("Name", button.transform, "토리 ▾", 22, HtmlMenuStyle.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            buttonName.rectTransform.anchorMin = Vector2.zero;
            buttonName.rectTransform.anchorMax = Vector2.one;
            buttonName.rectTransform.offsetMin = Vector2.zero;
            buttonName.rectTransform.offsetMax = Vector2.zero;
        }

        private void BuildOverlay()
        {
            overlay = new GameObject("CharacterOverlay");
            overlay.transform.SetParent(transform, false);
            var image = overlay.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(image, new Color(1f, .96f, .89f, .94f), 26);
            var rect = image.rectTransform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            var title = HtmlMenuStyle.Label("Title", overlay.transform, "함께할 친구를 골라봐요! 🐾", 32, HtmlMenuStyle.Text);
            title.rectTransform.anchorMin = title.rectTransform.anchorMax = new Vector2(.5f, .5f);
            title.rectTransform.sizeDelta = new Vector2(600, 54);
            title.rectTransform.anchoredPosition = new Vector2(0, 150);

            CreateCharacterCard("bear", "토리", "곰", "🐻", new Vector2(-300, 10), HtmlMenuStyle.Accent);
            CreateCharacterCard("bunny", "달이", "토끼", "🐰", new Vector2(-100, 10), HtmlMenuStyle.Hex("#9279DF"));
            CreateCharacterCard("forest", "숲이", "여우", "🦊", new Vector2(100, 10), HtmlMenuStyle.Hex("#84CC3C"));
            CreateCharacterCard("chick", "뽀이", "병아리", "🐥", new Vector2(300, 10), HtmlMenuStyle.Hex("#3ECFB2"));

            var ok = HtmlMenuStyle.Button("Done", overlay.transform, new Vector2(220, 64), new Vector2(0, -170), HtmlMenuStyle.Accent, 26, Hide);
            var okText = HtmlMenuStyle.Label("Label", ok.transform, "선택 완료! 🎉", 24, Color.white);
            okText.rectTransform.anchorMin = Vector2.zero;
            okText.rectTransform.anchorMax = Vector2.one;
            okText.rectTransform.offsetMin = Vector2.zero;
            okText.rectTransform.offsetMax = Vector2.zero;
            Hide();
        }

        private void CreateCharacterCard(string id, string name, string type, string icon, Vector2 position, Color accent)
        {
            var button = HtmlMenuStyle.Button($"{id}Card", overlay.transform, new Vector2(170, 150), position, new Color(1f, 1f, 1f, .75f), 20, () => Select(id, name, true));
            var emoji = HtmlMenuStyle.Label("Icon", button.transform, icon, 48, HtmlMenuStyle.Text);
            emoji.rectTransform.anchorMin = emoji.rectTransform.anchorMax = new Vector2(.5f, .5f);
            emoji.rectTransform.sizeDelta = new Vector2(140, 52);
            emoji.rectTransform.anchoredPosition = new Vector2(0, 34);

            var nm = HtmlMenuStyle.Label("Name", button.transform, name, 23, HtmlMenuStyle.Text);
            nm.rectTransform.anchorMin = nm.rectTransform.anchorMax = new Vector2(.5f, .5f);
            nm.rectTransform.sizeDelta = new Vector2(140, 32);
            nm.rectTransform.anchoredPosition = new Vector2(0, -18);

            var tp = HtmlMenuStyle.Label("Type", button.transform, type, 18, HtmlMenuStyle.Muted, TextAlignmentOptions.Center, FontStyles.Bold);
            tp.rectTransform.anchorMin = tp.rectTransform.anchorMax = new Vector2(.5f, .5f);
            tp.rectTransform.sizeDelta = new Vector2(140, 28);
            tp.rectTransform.anchoredPosition = new Vector2(0, -48);

            var outline = button.gameObject.AddComponent<Outline>();
            outline.effectColor = accent;
            outline.effectDistance = Vector2.zero;
        }

        private void Show() => overlay?.SetActive(true);
        private void Hide() => overlay?.SetActive(false);
        public void ShowTopButton()
        {
            topButtonRequestedVisible = true;
            ApplyTopButtonVisibility();
        }

        public void HideTopButton()
        {
            topButtonRequestedVisible = false;
            ApplyTopButtonVisibility();
            Hide();
        }

        public void SuppressTopButton(bool suppressed)
        {
            topButtonSuppressed = suppressed;
            ApplyTopButtonVisibility();
            if (suppressed) Hide();
        }

        private void ApplyTopButtonVisibility()
        {
            topButton?.SetActive(topButtonRequestedVisible && !topButtonSuppressed);
        }

        private void Select(string id, string label, bool keepOpen)
        {
            SelectedCharacterId = id;
            if (profile != null) profile.CharacterId = id;
            if (characterBuilder != null) characterBuilder.Rebuild(id);
            if (themeController != null) themeController.Apply(CharacterTheme.FromId(id));
            if (currentLabel != null) currentLabel.text = $"동요 친구: {label}";
            if (buttonName != null) buttonName.text = $"{label} ▾";
            if (!keepOpen) Hide();
        }
    }
}
