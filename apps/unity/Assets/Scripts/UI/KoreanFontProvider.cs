using TMPro;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;

namespace HabitBuddy.UI
{
    public static class KoreanFontProvider
    {
        private static TMP_FontAsset cached;

        public static TMP_FontAsset Get()
        {
            if (cached != null) return cached;
            var font = Resources.Load<Font>("Fonts/Pretendard-Regular");
            if (font == null)
            {
                font = Font.CreateDynamicFontFromOSFont("Pretendard", 90);
            }
            if (font == null) return null;
            cached = TMP_FontAsset.CreateFontAsset(
                font,
                90,
                9,
                GlyphRenderMode.SDFAA,
                1024,
                1024,
                AtlasPopulationMode.Dynamic,
                true
            );
            cached.name = "Pretendard Runtime";
            TMP_Settings.defaultFontAsset = cached;
            var emojiSpriteAsset = Resources.Load<TMP_SpriteAsset>("Sprite Assets/EmojiOne");
            if (emojiSpriteAsset != null) TMP_Settings.defaultSpriteAsset = emojiSpriteAsset;
            return cached;
        }
    }
}
