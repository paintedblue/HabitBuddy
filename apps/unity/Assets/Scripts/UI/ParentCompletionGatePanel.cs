using HabitBuddy.Routine;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public sealed class ParentCompletionGatePanel : MonoBehaviour
    {
        [SerializeField] private RoutineSessionController routine;

        private GameObject overlay;
        private TMP_Text problemLabel;
        private TMP_Text feedbackLabel;
        private TMP_InputField answerInput;
        private int answer;

        public void SetRoutine(RoutineSessionController value) => routine = value;

        public void Build()
        {
            if (overlay != null) return;

            overlay = new GameObject("ParentCompletionGate");
            overlay.transform.SetParent(transform, false);
            var dim = overlay.AddComponent<Image>();
            dim.color = new Color(0f, 0f, 0f, .3f);
            var dimRect = dim.rectTransform;
            dimRect.anchorMin = Vector2.zero;
            dimRect.anchorMax = Vector2.one;
            dimRect.offsetMin = Vector2.zero;
            dimRect.offsetMax = Vector2.zero;

            var panel = new GameObject("GatePanel");
            panel.transform.SetParent(overlay.transform, false);
            var panelImage = panel.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(panelImage, Color.white, 28);
            var shadow = panel.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, .18f);
            shadow.effectDistance = new Vector2(0f, -7f);
            var panelRect = panelImage.rectTransform;
            panelRect.anchorMin = panelRect.anchorMax = new Vector2(.5f, .5f);
            panelRect.sizeDelta = new Vector2(560f, 420f);
            panelRect.anchoredPosition = Vector2.zero;

            var title = HtmlMenuStyle.Label("Title", panel.transform, "오늘 습관을 잘 완료했나요?", 30, HtmlMenuStyle.Text);
            title.rectTransform.anchorMin = title.rectTransform.anchorMax = new Vector2(.5f, .5f);
            title.rectTransform.sizeDelta = new Vector2(500f, 48f);
            title.rectTransform.anchoredPosition = new Vector2(0f, 145f);

            var message = HtmlMenuStyle.Label("Message", panel.transform, "부모님 확인 후 완료할 수 있어요.", 21, HtmlMenuStyle.Muted, TextAlignmentOptions.Center, FontStyles.Bold);
            message.rectTransform.anchorMin = message.rectTransform.anchorMax = new Vector2(.5f, .5f);
            message.rectTransform.sizeDelta = new Vector2(470f, 36f);
            message.rectTransform.anchoredPosition = new Vector2(0f, 98f);

            problemLabel = HtmlMenuStyle.Label("Problem", panel.transform, "", 34, HtmlMenuStyle.OrangeText);
            problemLabel.rectTransform.anchorMin = problemLabel.rectTransform.anchorMax = new Vector2(.5f, .5f);
            problemLabel.rectTransform.sizeDelta = new Vector2(430f, 56f);
            problemLabel.rectTransform.anchoredPosition = new Vector2(0f, 39f);

            answerInput = HtmlMenuStyle.Input("AnswerInput", panel.transform, "정답", new Vector2(220f, 58f), new Vector2(0f, -30f));
            answerInput.contentType = TMP_InputField.ContentType.IntegerNumber;
            answerInput.characterLimit = 3;
            answerInput.onSubmit.AddListener(_ => TryComplete());

            feedbackLabel = HtmlMenuStyle.Label("Feedback", panel.transform, "", 18, HtmlMenuStyle.OrangeText, TextAlignmentOptions.Center, FontStyles.Bold);
            feedbackLabel.rectTransform.anchorMin = feedbackLabel.rectTransform.anchorMax = new Vector2(.5f, .5f);
            feedbackLabel.rectTransform.sizeDelta = new Vector2(430f, 30f);
            feedbackLabel.rectTransform.anchoredPosition = new Vector2(0f, -78f);

            CreateButton(panel.transform, "More", "조금 더 할게요", new Vector2(-135f, -145f), HtmlMenuStyle.Blue, HtmlMenuStyle.BlueText, ResumeRoutine);
            CreateButton(panel.transform, "Complete", "완료", new Vector2(135f, -145f), HtmlMenuStyle.Green, HtmlMenuStyle.GreenText, TryComplete);

            overlay.SetActive(false);
        }

        public void Show()
        {
            Build();
            GenerateProblem();
            feedbackLabel.text = "";
            answerInput.text = "";
            overlay.SetActive(true);
            overlay.transform.SetAsLastSibling();
            answerInput.ActivateInputField();
        }

        public void Hide()
        {
            if (overlay != null) overlay.SetActive(false);
        }

        private void GenerateProblem()
        {
            var useAddition = Random.value > .35f;
            if (useAddition)
            {
                var left = Random.Range(6, 13);
                var right = Random.Range(4, 10);
                answer = left + right;
                problemLabel.text = $"{left} + {right} = ?";
                return;
            }

            var minuend = Random.Range(12, 20);
            var subtrahend = Random.Range(3, 9);
            answer = minuend - subtrahend;
            problemLabel.text = $"{minuend} - {subtrahend} = ?";
        }

        private void TryComplete()
        {
            if (!int.TryParse(answerInput.text, out var value) || value != answer)
            {
                feedbackLabel.text = "다시 확인해 주세요";
                answerInput.text = "";
                answerInput.ActivateInputField();
                return;
            }

            Hide();
            routine?.ConfirmRoutineCompletedByParent();
        }

        private void ResumeRoutine()
        {
            Hide();
            routine?.ResumeRoutineAfterParentDecline();
        }

        private static void CreateButton(Transform parent, string name, string labelText, Vector2 position, Color color, Color textColor, UnityEngine.Events.UnityAction action)
        {
            var button = HtmlMenuStyle.Button(name, parent, new Vector2(232f, 68f), position, color, 18, action);
            var label = HtmlMenuStyle.Label("Label", button.transform, labelText, 22, textColor);
            label.rectTransform.anchorMin = Vector2.zero;
            label.rectTransform.anchorMax = Vector2.one;
            label.rectTransform.offsetMin = Vector2.zero;
            label.rectTransform.offsetMax = Vector2.zero;
        }
    }
}
