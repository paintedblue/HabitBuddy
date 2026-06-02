using TMPro;
using HabitBuddy.UI;
using UnityEngine.UI;
using UnityEngine;

namespace HabitBuddy.Routine
{
    public sealed class RoutineUiPresenter : MonoBehaviour
    {
        [SerializeField] private TMP_Text phaseLabel;
        [SerializeField] private TMP_Text messageLabel;
        [SerializeField] private TMP_Text timerLabel;
        [SerializeField] private TMP_Text lyricHintLabel;
        [SerializeField] private CharacterSelectionPanel characterSelection;
        [SerializeField] private RectTransform speechPanel;

        private RectTransform routinePanel;
        private RectTransform routineTitlePill;
        private TMP_Text routineTitleLabel;
        private TMP_Text routineLyricsLabel;
        private TMP_Text routineTimerLabel;
        private Image timerFill;
        private int routineTotalSeconds;
        private static Sprite circleSprite;

        public void ShowCue(string message)
        {
            HideRoutinePanel();
            ShowSpeechPanel();
            characterSelection?.ShowTopButton();
            phaseLabel.text = "노래 준비";
            messageLabel.text = message;
            timerLabel.text = "";
            lyricHintLabel.text = "노래를 듣고 친구를 따라가요";
        }

        public void ShowRoutine(int secondsLeft, string lyrics)
        {
            BuildRoutinePanel();
            routinePanel.gameObject.SetActive(true);
            HideSpeechPanel();
            characterSelection?.HideTopButton();
            if (routineTotalSeconds <= 0 || secondsLeft > routineTotalSeconds) routineTotalSeconds = secondsLeft;
            var progress = routineTotalSeconds > 0 ? Mathf.Clamp01(secondsLeft / (float)routineTotalSeconds) : 0f;

            phaseLabel.text = "같이 해보기";
            messageLabel.text = "";
            timerLabel.text = "";
            lyricHintLabel.text = "";
            routineTitlePill.gameObject.SetActive(true);
            routineTitleLabel.text = "노래 들으며 같이 해봐요";
            routineLyricsLabel.text = HtmlMenuStyle.CleanText(lyrics);
            routineTimerLabel.text = $"{secondsLeft / 60:00}:{secondsLeft % 60:00}";
            timerFill.fillAmount = progress;
        }

        public void ShowReward(string message)
        {
            HideRoutinePanel();
            ShowSpeechPanel();
            characterSelection?.ShowTopButton();
            phaseLabel.text = "칭찬 시간";
            messageLabel.text = message;
            timerLabel.text = "+2";
            lyricHintLabel.text = "스티커를 받았어요";
            routineTotalSeconds = 0;
        }

        public void ShowProfilePrompt()
        {
            HideRoutinePanel();
            ShowSpeechPanel();
            characterSelection?.ShowTopButton();
            phaseLabel.text = "♪ 동요 만들기";
            messageLabel.text = "같이 노래 만들어보자!";
            timerLabel.text = "";
            lyricHintLabel.text = "";
            routineTotalSeconds = 0;
        }

        public void ShowHome()
        {
            HideRoutinePanel();
            ShowSpeechPanel();
            characterSelection?.ShowTopButton();
            phaseLabel.text = "♪ 동요 친구";
            messageLabel.text = "오늘은 어떤 습관을 같이 해볼까요?";
            timerLabel.text = "";
            lyricHintLabel.text = "";
            routineTotalSeconds = 0;
        }

        private void BuildRoutinePanel()
        {
            if (routinePanel != null) return;

            var panelGo = new GameObject("BathroomRoutinePanel");
            panelGo.transform.SetParent(transform, false);
            var panelImage = panelGo.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(panelImage, new Color(1f, 1f, 1f, .94f), 28);
            var shadow = panelGo.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, .12f);
            shadow.effectDistance = new Vector2(0f, -6f);
            routinePanel = panelImage.rectTransform;
            routinePanel.anchorMin = routinePanel.anchorMax = new Vector2(.5f, .5f);
            routinePanel.sizeDelta = new Vector2(440f, 455f);
            routinePanel.anchoredPosition = new Vector2(210f, 35f);

            var titlePillImage = HtmlMenuStyle.Panel("RoutineTitlePill", transform, new Vector2(330f, 58f), new Vector2(210f, 302f), HtmlMenuStyle.AccentBg, 24);
            var titleShadow = titlePillImage.gameObject.AddComponent<Shadow>();
            titleShadow.effectColor = new Color(.54f, .29f, .02f, .12f);
            titleShadow.effectDistance = new Vector2(0f, -3f);
            var titleOutline = titlePillImage.gameObject.AddComponent<Outline>();
            titleOutline.effectColor = new Color(1f, .67f, .28f, .34f);
            titleOutline.effectDistance = new Vector2(2f, -2f);
            routineTitlePill = titlePillImage.rectTransform;

            routineTitleLabel = CreatePanelLabel("RoutineTitle", routineTitlePill, "노래 들으며 같이 해봐요", 24, HtmlMenuStyle.OrangeText, TextAlignmentOptions.Center);
            routineTitleLabel.rectTransform.anchorMin = Vector2.zero;
            routineTitleLabel.rectTransform.anchorMax = Vector2.one;
            routineTitleLabel.rectTransform.offsetMin = new Vector2(18f, 0f);
            routineTitleLabel.rectTransform.offsetMax = new Vector2(-18f, 0f);

            routineLyricsLabel = CreatePanelLabel("RoutineLyrics", routinePanel, "", 25, HtmlMenuStyle.Text, TextAlignmentOptions.Center);
            routineLyricsLabel.textWrappingMode = TextWrappingModes.Normal;
            routineLyricsLabel.lineSpacing = 14f;
            routineLyricsLabel.rectTransform.anchorMin = routineLyricsLabel.rectTransform.anchorMax = new Vector2(.5f, 1f);
            routineLyricsLabel.rectTransform.sizeDelta = new Vector2(372f, 128f);
            routineLyricsLabel.rectTransform.anchoredPosition = new Vector2(0f, -96f);

            var timerWrap = new GameObject("ClockTimer");
            timerWrap.transform.SetParent(routinePanel, false);
            var timerRect = timerWrap.AddComponent<RectTransform>();
            timerRect.anchorMin = timerRect.anchorMax = new Vector2(.5f, 0f);
            timerRect.sizeDelta = new Vector2(142f, 142f);
            timerRect.anchoredPosition = new Vector2(0f, 122f);

            var baseCircle = CreateCircleImage("TimerBase", timerWrap.transform, new Color(.95f, .94f, .9f, 1f), Image.Type.Simple);
            baseCircle.rectTransform.sizeDelta = new Vector2(142f, 142f);

            timerFill = CreateCircleImage("TimerFill", timerWrap.transform, HtmlMenuStyle.Accent, Image.Type.Filled);
            timerFill.fillMethod = Image.FillMethod.Radial360;
            timerFill.fillOrigin = (int)Image.Origin360.Top;
            timerFill.fillClockwise = false;
            timerFill.fillAmount = 1f;
            timerFill.rectTransform.sizeDelta = new Vector2(142f, 142f);

            var innerCircle = CreateCircleImage("TimerInner", timerWrap.transform, Color.white, Image.Type.Simple);
            innerCircle.rectTransform.sizeDelta = new Vector2(100f, 100f);

            routineTimerLabel = CreatePanelLabel("TimerText", timerWrap.transform, "02:00", 32, HtmlMenuStyle.Text, TextAlignmentOptions.Center);
            routineTimerLabel.rectTransform.anchorMin = routineTimerLabel.rectTransform.anchorMax = new Vector2(.5f, .5f);
            routineTimerLabel.rectTransform.sizeDelta = new Vector2(118f, 50f);
            routineTimerLabel.rectTransform.anchoredPosition = Vector2.zero;

            var caption = CreatePanelLabel("TimerCaption", routinePanel, "남은 시간", 18, HtmlMenuStyle.Muted, TextAlignmentOptions.Center);
            caption.rectTransform.anchorMin = caption.rectTransform.anchorMax = new Vector2(.5f, 0f);
            caption.rectTransform.sizeDelta = new Vector2(180f, 30f);
            caption.rectTransform.anchoredPosition = new Vector2(0f, 22f);

            routineTitlePill.transform.SetAsLastSibling();
            routineTitlePill.gameObject.SetActive(false);
            routinePanel.gameObject.SetActive(false);
        }

        private void HideRoutinePanel()
        {
            if (routinePanel != null) routinePanel.gameObject.SetActive(false);
            if (routineTitlePill != null) routineTitlePill.gameObject.SetActive(false);
        }

        private void ShowSpeechPanel()
        {
            if (speechPanel != null) speechPanel.gameObject.SetActive(true);
        }

        private void HideSpeechPanel()
        {
            if (speechPanel != null) speechPanel.gameObject.SetActive(false);
        }

        private static TMP_Text CreatePanelLabel(string name, Transform parent, string value, float fontSize, Color color, TextAlignmentOptions alignment)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<TextMeshProUGUI>();
            var font = KoreanFontProvider.Get();
            if (font != null) text.font = font;
            text.text = value;
            text.fontSize = fontSize;
            text.fontStyle = FontStyles.Bold;
            text.alignment = alignment;
            text.color = color;
            text.richText = false;
            return text;
        }

        private static Image CreateCircleImage(string name, Transform parent, Color color, Image.Type type)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var image = go.AddComponent<Image>();
            image.sprite = GetCircleSprite();
            image.type = type;
            image.color = color;
            image.rectTransform.anchorMin = image.rectTransform.anchorMax = new Vector2(.5f, .5f);
            image.rectTransform.anchoredPosition = Vector2.zero;
            return image;
        }

        private static Sprite GetCircleSprite()
        {
            if (circleSprite != null) return circleSprite;

            const int size = 128;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false)
            {
                name = "HabitBuddyCircle",
                wrapMode = TextureWrapMode.Clamp,
                filterMode = FilterMode.Bilinear
            };
            var pixels = new Color32[size * size];
            var center = (size - 1) * .5f;
            var radius = center - 1f;
            for (var y = 0; y < size; y++)
            {
                for (var x = 0; x < size; x++)
                {
                    var distance = Vector2.Distance(new Vector2(x, y), new Vector2(center, center));
                    pixels[y * size + x] = distance <= radius ? Color.white : new Color32(255, 255, 255, 0);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply();
            circleSprite = Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(.5f, .5f), 100f);
            return circleSprite;
        }
    }
}
