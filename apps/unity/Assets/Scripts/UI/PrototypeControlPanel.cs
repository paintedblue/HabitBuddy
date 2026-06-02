using HabitBuddy.Research;
using HabitBuddy.Domain;
using HabitBuddy.Routine;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public sealed class PrototypeControlPanel : MonoBehaviour
    {
        [SerializeField] private RoutineSessionController routine;
        [SerializeField] private ObserverFormPanel observerForm;
        [SerializeField] private ResearchExportService exporter;
        [SerializeField] private TMP_Text statusLabel;
        [SerializeField] private HabitSelectionPanel habitSelection;
        [SerializeField] private StampBoardPanel stampBoard;
        [SerializeField] private SideDrawerPanel drawer;
        private Outline profileOutline;
        private Outline habitOutline;
        private Outline stampOutline;
        private GameObject pauseButton;
        private GameObject pauseOverlay;
        private TMP_Text pauseIconLabel;
        private string activeMenu;
        private bool controlsVisible = true;
        private bool drawerOpen;

        public void Build()
        {
            CreateDock();
            profileOutline = CreateButton("♡", "너에 대해", "알려줘", new Vector2(-360, -388), HtmlMenuStyle.Blue, HtmlMenuStyle.BlueText, () => Toggle("profile", observerForm.Show));
            habitOutline = CreateButton("↗", "같이", "해봐요!", new Vector2(0, -388), HtmlMenuStyle.Green, HtmlMenuStyle.GreenText, () => Toggle("habit", habitSelection.Show));
            stampOutline = CreateButton("▣", "내", "도장판", new Vector2(360, -388), HtmlMenuStyle.Orange, HtmlMenuStyle.OrangeText, () => Toggle("stamp", stampBoard.Show));
            pauseButton = CreatePauseButton();
            pauseOverlay = CreatePauseOverlay();
            if (drawer != null)
            {
                drawer.Opened += HandleDrawerOpened;
                drawer.Closed += HandleDrawerClosed;
            }
            if (statusLabel != null) statusLabel.text = "";
            SetPauseVisible(false);
        }

        private void Update()
        {
            var routineBlocking = IsRoutineBlockingMenus();
            if (routineBlocking && drawerOpen) drawer?.Hide();
            var shouldShow = !routineBlocking && !drawerOpen;
            SetPauseVisible(IsRoutinePausable());
            if (shouldShow == controlsVisible) return;
            SetControlsVisible(shouldShow);
            if (shouldShow) HidePauseOverlay();
        }

        private void Toggle(string key, UnityEngine.Events.UnityAction action)
        {
            if (IsRoutineBlockingMenus())
            {
                drawer?.Hide();
                ClearActive();
                return;
            }

            if (activeMenu == key && drawer != null && drawer.IsOpen)
            {
                drawer.Hide();
                return;
            }
            activeMenu = key;
            action?.Invoke();
            ApplyActive();
            if (statusLabel != null) statusLabel.text = "";
        }

        private bool IsRoutineBlockingMenus()
        {
            return routine != null && routine.ActiveSession != null && routine.ActiveSession.Phase == RoutinePhase.Routine;
        }

        private bool IsRoutinePausable()
        {
            return IsRoutineBlockingMenus() && routine != null && !routine.AwaitingParentConfirmation;
        }

        private void SetControlsVisible(bool visible)
        {
            controlsVisible = visible;
            SetButtonVisible(profileOutline, visible);
            SetButtonVisible(habitOutline, visible);
            SetButtonVisible(stampOutline, visible);
        }

        private static void SetButtonVisible(Outline outline, bool visible)
        {
            if (outline == null) return;
            outline.gameObject.SetActive(visible);
            var button = outline.GetComponent<Button>();
            if (button != null) button.interactable = visible;
        }

        private void SetPauseVisible(bool visible)
        {
            if (pauseButton != null) pauseButton.SetActive(visible);
        }

        private void ApplyActive()
        {
            SetOutline(profileOutline, activeMenu == "profile", HtmlMenuStyle.BlueText);
            SetOutline(habitOutline, activeMenu == "habit", HtmlMenuStyle.GreenText);
            SetOutline(stampOutline, activeMenu == "stamp", HtmlMenuStyle.OrangeText);
        }

        private void ClearActive()
        {
            activeMenu = "";
            ApplyActive();
        }

        private void HandleDrawerOpened()
        {
            drawerOpen = true;
            SetControlsVisible(false);
        }

        private void HandleDrawerClosed()
        {
            drawerOpen = false;
            ClearActive();
            if (!IsRoutineBlockingMenus()) SetControlsVisible(true);
        }

        private static void SetOutline(Outline outline, bool active, Color color)
        {
            if (outline == null) return;
            outline.effectColor = active ? color : Color.clear;
            outline.effectDistance = active ? new Vector2(3f, -3f) : Vector2.zero;
        }

        private void CreateDock()
        {
            var dock = new GameObject("HtmlBottomDock");
            dock.transform.SetParent(transform, false);
            var rect = dock.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 0f);
            rect.anchorMax = new Vector2(1f, 0f);
            rect.pivot = new Vector2(.5f, 0f);
            rect.sizeDelta = new Vector2(0f, 150f);
            rect.anchoredPosition = Vector2.zero;
        }

        private GameObject CreatePauseButton()
        {
            var go = new GameObject("RoutinePauseButton");
            go.transform.SetParent(transform, false);
            var image = go.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(image, new Color(1f, 1f, 1f, .94f), 22);
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, .1f);
            shadow.effectDistance = new Vector2(0f, -4f);
            var button = go.AddComponent<Button>();
            SoftUiStyle.ApplyButtonTransition(button, Color.white);
            button.onClick.AddListener(ShowPauseOverlay);

            var rect = image.rectTransform;
            rect.sizeDelta = new Vector2(76f, 76f);
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.anchoredPosition = new Vector2(210f, -250f);

            pauseIconLabel = SoftUiStyle.CreateCenteredLabel("Icon", go.transform, "Ⅱ", 34, HtmlMenuStyle.OrangeText);
            pauseIconLabel.rectTransform.anchorMin = Vector2.zero;
            pauseIconLabel.rectTransform.anchorMax = Vector2.one;
            pauseIconLabel.rectTransform.offsetMin = Vector2.zero;
            pauseIconLabel.rectTransform.offsetMax = Vector2.zero;
            return go;
        }

        private GameObject CreatePauseOverlay()
        {
            var overlay = new GameObject("RoutinePauseOverlay");
            overlay.transform.SetParent(transform, false);
            var dim = overlay.AddComponent<Image>();
            dim.color = new Color(0f, 0f, 0f, .24f);
            var dimRect = dim.rectTransform;
            dimRect.anchorMin = Vector2.zero;
            dimRect.anchorMax = Vector2.one;
            dimRect.offsetMin = Vector2.zero;
            dimRect.offsetMax = Vector2.zero;

            var panel = new GameObject("PausePanel");
            panel.transform.SetParent(overlay.transform, false);
            var panelImage = panel.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(panelImage, Color.white, 28);
            var shadow = panel.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, .16f);
            shadow.effectDistance = new Vector2(0f, -6f);
            var panelRect = panelImage.rectTransform;
            panelRect.anchorMin = panelRect.anchorMax = new Vector2(.5f, .5f);
            panelRect.sizeDelta = new Vector2(520f, 300f);
            panelRect.anchoredPosition = Vector2.zero;

            var title = HtmlMenuStyle.Label("Title", panel.transform, "잠깐 쉬어갈까요?", 30, HtmlMenuStyle.Text);
            title.rectTransform.anchorMin = title.rectTransform.anchorMax = new Vector2(.5f, .5f);
            title.rectTransform.sizeDelta = new Vector2(440f, 48f);
            title.rectTransform.anchoredPosition = new Vector2(0f, 86f);

            var message = HtmlMenuStyle.Label("Message", panel.transform, "계속하려면 다시 시작하고,\n그만하려면 홈으로 돌아가요.", 21, HtmlMenuStyle.Muted, TextAlignmentOptions.Center, FontStyles.Bold);
            message.rectTransform.anchorMin = message.rectTransform.anchorMax = new Vector2(.5f, .5f);
            message.rectTransform.sizeDelta = new Vector2(430f, 70f);
            message.rectTransform.anchoredPosition = new Vector2(0f, 30f);

            CreatePauseOverlayButton(panel.transform, "Continue", "▶ 계속하기", new Vector2(-128f, -82f), HtmlMenuStyle.Green, HtmlMenuStyle.GreenText, ContinueRoutine);
            CreatePauseOverlayButton(panel.transform, "Home", "그만하고 홈으로", new Vector2(128f, -82f), HtmlMenuStyle.Orange, HtmlMenuStyle.OrangeText, ReturnHome);

            overlay.SetActive(false);
            return overlay;
        }

        private void CreatePauseOverlayButton(Transform parent, string name, string labelText, Vector2 position, Color color, Color textColor, UnityEngine.Events.UnityAction action)
        {
            var button = HtmlMenuStyle.Button(name, parent, new Vector2(220f, 68f), position, color, 18, action);
            var label = HtmlMenuStyle.Label("Label", button.transform, labelText, 22, textColor);
            label.rectTransform.anchorMin = Vector2.zero;
            label.rectTransform.anchorMax = Vector2.one;
            label.rectTransform.offsetMin = Vector2.zero;
            label.rectTransform.offsetMax = Vector2.zero;
        }

        private void ShowPauseOverlay()
        {
            if (!IsRoutineBlockingMenus()) return;
            routine?.PauseRoutine();
            if (pauseOverlay != null)
            {
                pauseOverlay.SetActive(true);
                pauseOverlay.transform.SetAsLastSibling();
            }
        }

        private void HidePauseOverlay()
        {
            if (pauseOverlay != null) pauseOverlay.SetActive(false);
        }

        private void ContinueRoutine()
        {
            HidePauseOverlay();
            routine?.ResumeRoutine();
        }

        private void ReturnHome()
        {
            HidePauseOverlay();
            routine?.ReturnHomeFromRoutine();
            SetControlsVisible(true);
            SetPauseVisible(false);
        }

        private Outline CreateButton(string icon, string line1, string line2, Vector2 position, Color color, Color textColor, UnityEngine.Events.UnityAction onClick)
        {
            var go = new GameObject($"{line1}{line2}");
            go.transform.SetParent(transform, false);
            var image = go.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(image, color, 18);
            var button = go.AddComponent<Button>();
            SoftUiStyle.ApplyButtonTransition(button, color);
            button.onClick.AddListener(onClick);
            var outline = go.AddComponent<Outline>();
            outline.effectColor = Color.clear;
            outline.effectDistance = Vector2.zero;
            var rect = image.rectTransform;
            rect.sizeDelta = new Vector2(340, 118);
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.anchoredPosition = position;

            var iconLabel = SoftUiStyle.CreateCenteredLabel("Icon", go.transform, icon, 42, textColor);
            iconLabel.fontStyle = FontStyles.Bold;
            var iconRect = iconLabel.rectTransform;
            iconRect.anchorMin = iconRect.anchorMax = new Vector2(.5f, .5f);
            iconRect.sizeDelta = new Vector2(300, 42);
            iconRect.anchoredPosition = new Vector2(0, 27);

            var text = SoftUiStyle.CreateCenteredLabel("Label", go.transform, $"{line1}\n{line2}", 21, textColor);
            text.lineSpacing = -4f;
            var textRect = text.rectTransform;
            textRect.anchorMin = textRect.anchorMax = new Vector2(.5f, .5f);
            textRect.sizeDelta = new Vector2(300, 60);
            textRect.anchoredPosition = new Vector2(0, -33);
            return outline;
        }

    }
}
