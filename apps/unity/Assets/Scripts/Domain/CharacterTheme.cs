using UnityEngine;

namespace HabitBuddy.Domain
{
    public sealed class CharacterTheme
    {
        public string Id;
        public string DisplayName;
        public Color Body;
        public Color Accent;
        public Color Background;
        public Color Rug;

        public static CharacterTheme Bear => new()
        {
            Id = "bear",
            DisplayName = "곰 토리",
            Body = new Color(.96f, .55f, .12f),
            Accent = new Color(1f, .76f, .42f),
            Background = new Color(1f, .94f, .84f),
            Rug = new Color(.74f, .9f, .78f)
        };

        public static CharacterTheme Bunny => new()
        {
            Id = "bunny",
            DisplayName = "토끼 달이",
            Body = new Color(.68f, .62f, .95f),
            Accent = new Color(1f, .72f, .84f),
            Background = new Color(.96f, .94f, 1f),
            Rug = new Color(.86f, .82f, 1f)
        };

        public static CharacterTheme FromId(string id) => id == "bunny" ? Bunny : Bear;
    }
}
