using HabitBuddy.Domain;
using HabitBuddy.Character;
using System.Collections;
using UnityEngine;

namespace HabitBuddy.World
{
    public sealed class RoutineSceneDirector : MonoBehaviour
    {
        [SerializeField] private Camera mainCamera;
        [SerializeField] private PrototypeWorldBuilder world;
        [SerializeField] private ImageRoomStageController imageStage;
        [SerializeField] private GlbCharacterPresenter glbCharacter;

        public void FocusMainRoom()
        {
            if (imageStage != null)
            {
                imageStage.Show(RoomStage.MainRoom);
                glbCharacter?.ApplyPlacement(imageStage.CharacterPosition, imageStage.CharacterEuler, imageStage.CharacterScale);
                return;
            }

            FocusOn(world != null ? world.RoomFocus : null, new Vector3(0, 1.6f, -4.8f), Quaternion.Euler(5, 0, 0), new Vector3(0, 2.05f, -6.6f));
        }

        public void Focus(HabitTemplate habit)
        {
            if (imageStage != null)
            {
                var targetStage = IsBathroomHabit(habit) ? RoomStage.Bathroom : RoomStage.MainRoom;
                imageStage.Show(targetStage);
                glbCharacter?.ApplyPlacement(imageStage.CharacterPosition, imageStage.CharacterEuler, imageStage.CharacterScale);
                return;
            }

            if (habit.Id == "wash" || habit.Id == "brush")
            {
                FocusOn(world != null && world.SinkFocus != null ? world.SinkFocus : world != null ? world.BathroomFocus : null, new Vector3(0, 1.6f, -4.6f), Quaternion.Euler(5, -4, 0), new Vector3(1.7f, 2.05f, -6.25f));
                mainCamera.fieldOfView = 45f;
                if (world != null && world.ToothbrushProp != null) world.ToothbrushProp.SetActive(false);
                if (world != null && world.SoapProp != null) world.SoapProp.SetActive(true);
            }
            else
            {
                FocusOn(world != null ? world.RoomFocus : null, new Vector3(0, 1.6f, -4.8f), Quaternion.Euler(5, 0, 0), new Vector3(0, 2.05f, -6.6f));
                mainCamera.fieldOfView = 46f;
                if (world != null && world.ToothbrushProp != null) world.ToothbrushProp.SetActive(true);
                if (world != null && world.SoapProp != null) world.SoapProp.SetActive(false);
            }
        }

        public IEnumerator MoveCharacterOnCurrentStage(Vector3 fromOffset, Vector3 toOffset, float duration)
        {
            if (imageStage == null || glbCharacter == null) yield break;

            var elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                var t = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(elapsed / duration));
                ApplyCurrentStagePlacement(Vector3.Lerp(fromOffset, toOffset, t));
                yield return null;
            }
            ApplyCurrentStagePlacement(toOffset);
        }

        public void ApplyCurrentStagePlacement(Vector3 offset)
        {
            if (imageStage == null || glbCharacter == null) return;
            glbCharacter.ApplyPlacement(
                imageStage.CharacterPosition + offset,
                imageStage.CharacterEuler,
                imageStage.CharacterScale);
        }

        private static bool IsBathroomHabit(HabitTemplate habit)
        {
            return habit != null && (habit.Id == "brush" || habit.Id == "wash");
        }

        private void FocusOn(Transform focus, Vector3 offset, Quaternion rotation, Vector3 fallbackPosition)
        {
            mainCamera.transform.position = focus != null ? focus.position + offset : fallbackPosition;
            mainCamera.transform.rotation = rotation;
        }
    }
}
