using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public static class SoftUiStyle
    {
        private static readonly Dictionary<int, Sprite> RoundedSprites = new();

        public static void ApplyRounded(Image image, Color color, int radius = 32)
        {
            image.sprite = GetRoundedSprite(radius);
            image.type = Image.Type.Sliced;
            image.color = color;
        }

        public static void ApplyButton(Image image, Color color, int radius = 34)
        {
            ApplyRounded(image, color, radius);
            var shadow = image.gameObject.GetComponent<Shadow>() ?? image.gameObject.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, .08f);
            shadow.effectDistance = new Vector2(0f, -5f);
        }

        public static void ApplyButtonTransition(Button button, Color baseColor)
        {
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1f, 1f, 1f, .9f);
            colors.pressedColor = new Color(.96f, .96f, .96f, 1f);
            colors.selectedColor = Color.white;
            colors.disabledColor = new Color(baseColor.r, baseColor.g, baseColor.b, .45f);
            colors.fadeDuration = .12f;
            button.colors = colors;
            button.transition = Selectable.Transition.ColorTint;
        }

        public static TMP_Text CreateCenteredLabel(string name, Transform parent, string value, int fontSize, Color color)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<TextMeshProUGUI>();
            var font = KoreanFontProvider.Get();
            if (font != null) text.font = font;
            text.text = HtmlMenuStyle.CleanText(value);
            text.fontSize = fontSize;
            text.fontStyle = FontStyles.Bold;
            text.alignment = TextAlignmentOptions.Center;
            text.color = color;
            text.textWrappingMode = TextWrappingModes.NoWrap;
            return text;
        }

        public static Color TextColorFor(Color background)
        {
            if (background.b > background.r && background.b > background.g) return new Color(.02f, .36f, .66f);
            if (background.g > background.r && background.g > background.b) return new Color(.02f, .45f, .23f);
            if (background.r > .9f && background.g > .82f) return new Color(.54f, .29f, .02f);
            return new Color(.12f, .12f, .12f);
        }

        private static Sprite GetRoundedSprite(int radius)
        {
            if (RoundedSprites.TryGetValue(radius, out var sprite)) return sprite;

            const int size = 128;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false)
            {
                name = $"SoftRounded_{radius}",
                wrapMode = TextureWrapMode.Clamp,
                filterMode = FilterMode.Bilinear
            };

            var pixels = new Color32[size * size];
            var r = Mathf.Clamp(radius, 1, size / 2);
            for (var y = 0; y < size; y++)
            {
                for (var x = 0; x < size; x++)
                {
                    var dx = x < r ? r - x : x >= size - r ? x - (size - r - 1) : 0;
                    var dy = y < r ? r - y : y >= size - r ? y - (size - r - 1) : 0;
                    var dist = Mathf.Sqrt(dx * dx + dy * dy);
                    var alpha = dist <= r ? 255 : 0;
                    pixels[y * size + x] = new Color32(255, 255, 255, (byte)alpha);
                }
            }

            texture.SetPixels32(pixels);
            texture.Apply();
            sprite = Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(.5f, .5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(radius, radius, radius, radius));
            RoundedSprites[radius] = sprite;
            return sprite;
        }
    }
}
