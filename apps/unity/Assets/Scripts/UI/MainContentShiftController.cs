using HabitBuddy.Character;
using HabitBuddy.World;
using TMPro;
using UnityEngine;

namespace HabitBuddy.UI
{
    public sealed class MainContentShiftController : MonoBehaviour
    {
        [SerializeField] private SideDrawerPanel drawer;
        [SerializeField] private ImageRoomStageController stage;
        [SerializeField] private GlbCharacterPresenter character;
        [SerializeField] private RectTransform speechPanel;
        [SerializeField] private RectTransform messageText;
        [SerializeField] private float worldShiftX = -1.25f;
        [SerializeField] private float uiShiftX = -320f;
        [SerializeField] private float duration = .4f;

        private Coroutine current;
        private Vector2 speechBase;
        private Vector2 messageBase;

        public void Build()
        {
            if (speechPanel != null) speechBase = speechPanel.anchoredPosition;
            if (messageText != null) messageBase = messageText.anchoredPosition;
            if (drawer != null)
            {
                drawer.Opened += () => SetShifted(true);
                drawer.Closed += () => SetShifted(false);
            }
        }

        private void SetShifted(bool shifted)
        {
            if (current != null) StopCoroutine(current);
            current = StartCoroutine(Animate(shifted));
        }

        private System.Collections.IEnumerator Animate(bool shifted)
        {
            var elapsed = 0f;
            var fromCharacter = character != null ? character.transform.position : Vector3.zero;
            var targetBase = stage != null ? stage.CharacterPosition : fromCharacter;
            var toCharacter = shifted ? targetBase + new Vector3(worldShiftX, 0f, 0f) : targetBase;
            var fromSpeech = speechPanel != null ? speechPanel.anchoredPosition : Vector2.zero;
            var fromMessage = messageText != null ? messageText.anchoredPosition : Vector2.zero;
            var toSpeech = shifted ? speechBase + new Vector2(uiShiftX, 0f) : speechBase;
            var toMessage = shifted ? messageBase + new Vector2(uiShiftX, 0f) : messageBase;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                var t = Mathf.SmoothStep(0f, 1f, elapsed / duration);
                if (character != null)
                {
                    var position = Vector3.Lerp(fromCharacter, toCharacter, t);
                    character.ApplyPlacement(position, stage != null ? stage.CharacterEuler : character.transform.eulerAngles, stage != null ? stage.CharacterScale : character.transform.localScale.x);
                }
                if (speechPanel != null) speechPanel.anchoredPosition = Vector2.Lerp(fromSpeech, toSpeech, t);
                if (messageText != null) messageText.anchoredPosition = Vector2.Lerp(fromMessage, toMessage, t);
                yield return null;
            }

            if (character != null) character.ApplyPlacement(toCharacter, stage != null ? stage.CharacterEuler : character.transform.eulerAngles, stage != null ? stage.CharacterScale : character.transform.localScale.x);
            if (speechPanel != null) speechPanel.anchoredPosition = toSpeech;
            if (messageText != null) messageText.anchoredPosition = toMessage;
            current = null;
        }
    }
}
