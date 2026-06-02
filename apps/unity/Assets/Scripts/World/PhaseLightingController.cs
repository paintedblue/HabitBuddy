using HabitBuddy.Domain;
using UnityEngine;

namespace HabitBuddy.World
{
    public sealed class PhaseLightingController : MonoBehaviour
    {
        [SerializeField] private Light keyLight;
        [SerializeField] private Camera mainCamera;

        public void Apply(RoutinePhase phase)
        {
            switch (phase)
            {
                case RoutinePhase.Cue:
                    SetMood(new Color(1f, .92f, .76f), new Color(.84f, .96f, .91f));
                    break;
                case RoutinePhase.Routine:
                    SetMood(new Color(.9f, .97f, 1f), new Color(.88f, .97f, 1f));
                    break;
                case RoutinePhase.Reward:
                    SetMood(new Color(1f, .84f, .52f), new Color(1f, .94f, .8f));
                    break;
            }
        }

        private void SetMood(Color lightColor, Color background)
        {
            if (keyLight != null) keyLight.color = lightColor;
            if (mainCamera != null) mainCamera.backgroundColor = background;
        }
    }
}
