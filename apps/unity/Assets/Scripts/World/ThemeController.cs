using HabitBuddy.Domain;
using UnityEngine;

namespace HabitBuddy.World
{
    public sealed class ThemeController : MonoBehaviour
    {
        [SerializeField] private Camera mainCamera;
        [SerializeField] private Transform characterRoot;
        [SerializeField] private Renderer[] backgroundRenderers;
        [SerializeField] private Renderer[] rugRenderers;

        public void Apply(CharacterTheme theme)
        {
            ApplyColor(FindCharacterRenderers("Body", "Head", "LeftEar", "RightEar", "LeftArm", "RightArm", "LeftLeg", "RightLeg"), theme.Body);
            ApplyColor(FindCharacterRenderers("Belly", "Muzzle", "LeftInnerEar", "RightInnerEar"), theme.Accent);
            ApplyColor(FindCharacterRenderers("LeftCheek", "RightCheek"), new Color(1f, .68f, .58f));
            ApplyColor(FindCharacterRenderers("Toothbrush", "ToothbrushHead"), new Color(.26f, .68f, .78f));
            ApplyColor(FindCharacterRenderers("Tail"), theme.Body);
            ApplyColor(FindCharacterRenderers("Nose", "MouthLeft", "MouthCenter", "MouthRight"), new Color(.12f, .08f, .08f));
            ApplyColor(backgroundRenderers, theme.Background);
            ApplyColor(rugRenderers, theme.Rug);
            if (mainCamera != null) mainCamera.backgroundColor = theme.Background;
        }

        private static void ApplyColor(Renderer[] renderers, Color color)
        {
            foreach (var renderer in renderers)
            {
                if (renderer != null) renderer.material.color = color;
            }
        }

        private Renderer[] FindCharacterRenderers(params string[] names)
        {
            var list = new System.Collections.Generic.List<Renderer>();
            foreach (var name in names)
            {
                var child = characterRoot.Find(name);
                if (child != null && child.TryGetComponent<Renderer>(out var renderer)) list.Add(renderer);
            }
            return list.ToArray();
        }
    }
}
