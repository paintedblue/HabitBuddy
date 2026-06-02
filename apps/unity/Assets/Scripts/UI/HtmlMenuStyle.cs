using TMPro;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public static class HtmlMenuStyle
    {
        public static readonly Color Text = Hex("#1E1E1E");
        public static readonly Color Muted = Hex("#888888");
        public static readonly Color PanelBorder = new(0f, 0f, 0f, .08f);
        public static readonly Color Blue = Hex("#DCF1FF");
        public static readonly Color BlueText = Hex("#0E68AB");
        public static readonly Color Green = Hex("#DFFAEA");
        public static readonly Color GreenText = Hex("#0A7840");
        public static readonly Color Orange = Hex("#FFF0DC");
        public static readonly Color OrangeText = Hex("#A05A00");
        public static readonly Color Accent = Hex("#F5962A");
        public static readonly Color AccentBg = Hex("#FFF4E2");
        private static readonly Dictionary<string, string> EmojiReplacements = new()
        {
            { "🌟", "★" }, { "🎉", "!" }, { "🐾", "" }, { "🐻", "곰" }, { "🐰", "토끼" }, { "🦊", "여우" },
            { "🐥", "병아리" }, { "🪥", "칫솔" }, { "🫧", "거품" }, { "🛏️", "침대" }, { "🛏", "침대" },
            { "🧸", "정리" }, { "😴", "잠" }, { "🍽️", "밥" }, { "🍽", "밥" }, { "🍕", "피자" },
            { "🍜", "라면" }, { "🌶️", "떡볶이" }, { "🌶", "떡볶이" }, { "🍙", "김밥" },
            { "🍗", "치킨" }, { "🍦", "아이스크림" }, { "🎨", "색" }, { "👫", "친구" },
            { "📅", "달력" }, { "🔥", "연속" }, { "⭐", "★" }, { "🚀", "시작" }, { "👋", "" },
            { "🎵", "♪" }, { "🎶", "♪" }, { "😊", "" }, { "💪", "" }, { "😅", "" }, { "🍴", "음식" }
        };

        public static Color Hex(string value)
        {
            ColorUtility.TryParseHtmlString(value, out var color);
            return color;
        }

        public static TMP_Text Label(string name, Transform parent, string value, float fontSize, Color color, TextAlignmentOptions alignment = TextAlignmentOptions.Center, FontStyles style = FontStyles.Bold)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<TextMeshProUGUI>();
            var font = KoreanFontProvider.Get();
            if (font != null) text.font = font;
            text.text = CleanText(value);
            text.fontSize = fontSize;
            text.fontStyle = style;
            text.alignment = alignment;
            text.color = color;
            text.richText = false;
            text.textWrappingMode = TextWrappingModes.Normal;
            return text;
        }

        public static TMP_Text IconLabel(string name, Transform parent, string value, string fallback, float fontSize, Color color, TextAlignmentOptions alignment = TextAlignmentOptions.Center)
        {
            var text = Label(name, parent, value, fontSize, color, alignment, FontStyles.Bold);
            text.text = string.IsNullOrWhiteSpace(value) ? fallback : value;
            text.textWrappingMode = TextWrappingModes.NoWrap;
            text.enableAutoSizing = true;
            text.fontSizeMin = Mathf.Max(18f, fontSize - 18f);
            text.fontSizeMax = fontSize;
            return text;
        }

        public static string CleanText(string value)
        {
            if (string.IsNullOrEmpty(value)) return value;
            foreach (var pair in EmojiReplacements) value = value.Replace(pair.Key, pair.Value);
            return value;
        }

        public static string StripTags(string value)
        {
            if (string.IsNullOrEmpty(value) || value.IndexOf('<') < 0) return value;
            var result = "";
            var inside = false;
            foreach (var ch in value)
            {
                if (ch == '<')
                {
                    inside = true;
                    continue;
                }
                if (ch == '>')
                {
                    inside = false;
                    continue;
                }
                if (!inside) result += ch;
            }
            return result;
        }

        public static Image Panel(string name, Transform parent, Vector2 size, Vector2 anchoredPosition, Color color, int radius)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var image = go.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(image, color, radius);
            var rect = image.rectTransform;
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = anchoredPosition;
            return image;
        }

        public static Image FlowPanel(string name, Transform parent, float height, Color color, int radius)
        {
            var image = Panel(name, parent, new Vector2(0, height), Vector2.zero, color, radius);
            var layout = image.gameObject.AddComponent<LayoutElement>();
            layout.preferredHeight = height;
            layout.minHeight = height;
            return image;
        }

        public static TMP_Text FlowLabel(string name, Transform parent, string value, float fontSize, Color color, float height, TextAlignmentOptions alignment = TextAlignmentOptions.Center, FontStyles style = FontStyles.Bold)
        {
            var text = Label(name, parent, value, fontSize, color, alignment, style);
            var layout = text.gameObject.AddComponent<LayoutElement>();
            layout.preferredHeight = height;
            layout.minHeight = height;
            return text;
        }

        public static Button Button(string name, Transform parent, Vector2 size, Vector2 anchoredPosition, Color background, int radius, UnityAction onClick)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var image = go.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(image, background, radius);
            var button = go.AddComponent<Button>();
            SoftUiStyle.ApplyButtonTransition(button, background);
            if (onClick != null) button.onClick.AddListener(onClick);
            var rect = image.rectTransform;
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = anchoredPosition;
            return button;
        }

        public static Button FlowButton(string name, Transform parent, float height, Color background, int radius, UnityAction onClick)
        {
            var button = Button(name, parent, new Vector2(0, height), Vector2.zero, background, radius, onClick);
            var layout = button.gameObject.AddComponent<LayoutElement>();
            layout.preferredHeight = height;
            layout.minHeight = height;
            return button;
        }

        public static TMP_InputField Input(string name, Transform parent, string placeholder, Vector2 size, Vector2 anchoredPosition)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var image = go.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(image, Color.white, 18);
            var input = go.AddComponent<TMP_InputField>();
            input.richText = false;
            var sanitizing = false;
            input.onValueChanged.AddListener(value =>
            {
                if (sanitizing) return;
                var clean = StripTags(value);
                if (clean == value) return;
                sanitizing = true;
                input.text = clean;
                input.caretPosition = clean.Length;
                sanitizing = false;
            });
            var rect = image.rectTransform;
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = anchoredPosition;

            var text = Label("Text", go.transform, "", 34, Text, TextAlignmentOptions.Center, FontStyles.Normal);
            text.richText = false;
            text.parseCtrlCharacters = false;
            text.rectTransform.anchorMin = Vector2.zero;
            text.rectTransform.anchorMax = Vector2.one;
            text.rectTransform.offsetMin = new Vector2(16, 0);
            text.rectTransform.offsetMax = new Vector2(-16, 0);
            input.textComponent = text;

            var ph = Label("Placeholder", go.transform, placeholder, 28, new Color(.8f, .8f, .8f), TextAlignmentOptions.Center, FontStyles.Normal);
            ph.richText = false;
            ph.parseCtrlCharacters = false;
            ph.rectTransform.anchorMin = Vector2.zero;
            ph.rectTransform.anchorMax = Vector2.one;
            ph.rectTransform.offsetMin = new Vector2(16, 0);
            ph.rectTransform.offsetMax = new Vector2(-16, 0);
            input.placeholder = ph;
            return input;
        }

        public static TMP_InputField FlowInput(string name, Transform parent, string placeholder, float height)
        {
            var input = Input(name, parent, placeholder, new Vector2(0, height), Vector2.zero);
            var layout = input.gameObject.AddComponent<LayoutElement>();
            layout.preferredHeight = height;
            layout.minHeight = height;
            return input;
        }
    }
}
