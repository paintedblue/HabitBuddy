using TMPro;
using System;
using UnityEngine;
using UnityEngine.UI;

namespace HabitBuddy.UI
{
    public sealed class SideDrawerPanel : MonoBehaviour
    {
        private RectTransform drawerRect;
        private RectTransform bodyRect;
        private RectTransform contentRoot;
        private RectTransform footerRoot;
        private TMP_Text titleLabel;
        private Button closeButton;
        private ScrollRect scrollRect;

        public RectTransform Content => contentRoot;
        public RectTransform Footer => footerRoot;
        public bool IsOpen => drawerRect != null && drawerRect.gameObject.activeSelf;
        public event Action Opened;
        public event Action Closed;

        public void Build()
        {
            if (drawerRect != null) return;

            var drawer = new GameObject("HtmlSideDrawer");
            drawer.transform.SetParent(transform, false);
            var image = drawer.AddComponent<Image>();
            SoftUiStyle.ApplyRounded(image, Color.white, 26);
            drawerRect = image.rectTransform;
            drawerRect.anchorMin = new Vector2(1f, 0f);
            drawerRect.anchorMax = new Vector2(1f, 1f);
            drawerRect.pivot = new Vector2(1f, .5f);
            drawerRect.offsetMin = new Vector2(-636f, 0f);
            drawerRect.offsetMax = Vector2.zero;

            var border = drawer.AddComponent<Shadow>();
            border.effectColor = new Color(0f, 0f, 0f, .08f);
            border.effectDistance = new Vector2(-1f, 0f);

            var header = new GameObject("Header");
            header.transform.SetParent(drawer.transform, false);
            var headerRect = header.AddComponent<RectTransform>();
            headerRect.anchorMin = new Vector2(0f, 1f);
            headerRect.anchorMax = new Vector2(1f, 1f);
            headerRect.pivot = new Vector2(.5f, 1f);
            headerRect.sizeDelta = new Vector2(0f, 76f);
            headerRect.anchoredPosition = Vector2.zero;

            titleLabel = HtmlMenuStyle.Label("Title", header.transform, "", 32, HtmlMenuStyle.Text, TextAlignmentOptions.Left, FontStyles.Bold);
            titleLabel.rectTransform.anchorMin = new Vector2(0f, .5f);
            titleLabel.rectTransform.anchorMax = new Vector2(1f, .5f);
            titleLabel.rectTransform.pivot = new Vector2(.5f, .5f);
            titleLabel.rectTransform.offsetMin = new Vector2(32f, -32f);
            titleLabel.rectTransform.offsetMax = new Vector2(-92f, 32f);

            closeButton = HtmlMenuStyle.Button("Close", header.transform, new Vector2(54, 54), new Vector2(-42, -38), new Color(1f, 1f, 1f, 0f), 8, Hide);
            var closeRect = closeButton.GetComponent<RectTransform>();
            closeRect.anchorMin = closeRect.anchorMax = new Vector2(1f, 1f);
            var closeText = HtmlMenuStyle.Label("Icon", closeButton.transform, "×", 34, HtmlMenuStyle.Muted, TextAlignmentOptions.Center, FontStyles.Normal);
            closeText.rectTransform.anchorMin = Vector2.zero;
            closeText.rectTransform.anchorMax = Vector2.one;
            closeText.rectTransform.offsetMin = Vector2.zero;
            closeText.rectTransform.offsetMax = Vector2.zero;

            var body = new GameObject("Body");
            body.transform.SetParent(drawer.transform, false);
            var bodyImage = body.AddComponent<Image>();
            bodyImage.color = new Color(1f, 1f, 1f, 0f);
            bodyRect = bodyImage.rectTransform;
            bodyRect.anchorMin = new Vector2(0f, 0f);
            bodyRect.anchorMax = new Vector2(1f, 1f);
            bodyRect.offsetMin = new Vector2(32f, 24f);
            bodyRect.offsetMax = new Vector2(-32f, -88f);
            body.AddComponent<RectMask2D>();
            scrollRect = body.AddComponent<ScrollRect>();
            scrollRect.horizontal = false;
            scrollRect.vertical = true;
            scrollRect.movementType = ScrollRect.MovementType.Clamped;
            scrollRect.viewport = bodyRect;

            var content = new GameObject("ContentRoot");
            content.transform.SetParent(body.transform, false);
            contentRoot = content.AddComponent<RectTransform>();
            contentRoot.anchorMin = new Vector2(0f, 1f);
            contentRoot.anchorMax = new Vector2(1f, 1f);
            contentRoot.pivot = new Vector2(.5f, 1f);
            contentRoot.anchoredPosition = Vector2.zero;
            contentRoot.sizeDelta = new Vector2(0f, 1120f);
            var layout = content.AddComponent<VerticalLayoutGroup>();
            layout.childAlignment = TextAnchor.UpperCenter;
            layout.childControlWidth = true;
            layout.childControlHeight = false;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
            layout.padding = new RectOffset(0, 0, 0, 24);
            layout.spacing = 18f;
            var fitter = content.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scrollRect.content = contentRoot;

            var footer = new GameObject("Footer");
            footer.transform.SetParent(drawer.transform, false);
            footerRoot = footer.AddComponent<RectTransform>();
            footerRoot.anchorMin = new Vector2(0f, 0f);
            footerRoot.anchorMax = new Vector2(1f, 0f);
            footerRoot.pivot = new Vector2(.5f, 0f);
            footerRoot.offsetMin = new Vector2(32f, 24f);
            footerRoot.offsetMax = new Vector2(-32f, 104f);
            var footerLayout = footer.AddComponent<HorizontalLayoutGroup>();
            footerLayout.childAlignment = TextAnchor.MiddleCenter;
            footerLayout.childControlWidth = false;
            footerLayout.childControlHeight = false;
            footerLayout.childForceExpandWidth = false;
            footerLayout.childForceExpandHeight = false;
            footer.SetActive(false);

            Hide();
        }

        public void Show(string title)
        {
            Build();
            Clear();
            ClearFooter();
            titleLabel.text = HtmlMenuStyle.CleanText(title);
            drawerRect.gameObject.SetActive(true);
            if (scrollRect != null) scrollRect.verticalNormalizedPosition = 1f;
            Opened?.Invoke();
            RefreshLayout();
        }

        public void Hide()
        {
            if (drawerRect == null || !drawerRect.gameObject.activeSelf) return;
            ClearFooter();
            drawerRect.gameObject.SetActive(false);
            Closed?.Invoke();
        }

        public void Clear()
        {
            if (contentRoot == null) return;
            for (var i = contentRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(contentRoot.GetChild(i).gameObject);
            }
        }

        public void ClearFooter()
        {
            if (footerRoot == null) return;
            for (var i = footerRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(footerRoot.GetChild(i).gameObject);
            }
            footerRoot.gameObject.SetActive(false);
            SetFooterVisible(false);
        }

        public void ShowFooter()
        {
            if (footerRoot == null) return;
            footerRoot.gameObject.SetActive(true);
            SetFooterVisible(true);
        }

        public void RefreshLayout()
        {
            if (contentRoot == null) return;
            Canvas.ForceUpdateCanvases();
            LayoutRebuilder.ForceRebuildLayoutImmediate(contentRoot);
            if (footerRoot != null) LayoutRebuilder.ForceRebuildLayoutImmediate(footerRoot);
        }

        private void SetFooterVisible(bool visible)
        {
            if (bodyRect == null) return;
            bodyRect.offsetMin = new Vector2(32f, visible ? 120f : 24f);
        }
    }
}
