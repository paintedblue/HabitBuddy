using HabitBuddy.Audio;
using HabitBuddy.Character;
using HabitBuddy.Domain;
using HabitBuddy.Research;
using HabitBuddy.Routine;
using HabitBuddy.UI;
using HabitBuddy.World;
using TMPro;
using UnityEngine;

namespace HabitBuddy.Bootstrap
{
    public sealed class PrototypeBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            HabitBuddy.UI.KoreanFontProvider.Get();

            var warm = CreateMaterial("Warm", new Color(1f, .77f, .45f));
            var cream = CreateMaterial("Cream", new Color(1f, .95f, .88f));
            var wood = CreateMaterial("Wood", new Color(.68f, .45f, .24f));
            var dark = CreateMaterial("Dark", new Color(.1f, .08f, .08f));
            var blush = CreateMaterial("Blush", new Color(1f, .74f, .72f));
            var mint = CreateMaterial("Mint", new Color(.73f, .93f, .84f));
            var confettiMaterial = CreateMaterial("Confetti", new Color(1f, .84f, .28f));
            var camera = BuildCamera();
            var light = BuildLight();
            BuildFillLight();

            var stage = new GameObject("ImageRoomStage");
            var stageController = stage.AddComponent<ImageRoomStageController>();
            Assign(stageController, "mainCamera", camera);
            stageController.Build();

            var character = new GameObject("Character");
            var glbPresenter = character.AddComponent<GlbCharacterPresenter>();
            glbPresenter.ApplyPlacement(stageController.CharacterPosition, stageController.CharacterEuler, stageController.CharacterScale);
            stageController.StageLayoutChanged += () => glbPresenter.ApplyPlacement(stageController.CharacterPosition, stageController.CharacterEuler, stageController.CharacterScale);
            var animationController = character.AddComponent<CharacterAnimationController>();
            Assign(animationController, "glbPresenter", glbPresenter);

            var canvas = BuildCanvas(out var phaseText, out var messageText, out var timerText, out var statusText, out var characterLabel, out var lyricHint, out var habitLabel, out var stampTitle, out var stampText, out var speechPanel);
            var ui = canvas.AddComponent<RoutineUiPresenter>();
            Assign(ui, "phaseLabel", phaseText);
            Assign(ui, "messageLabel", messageText);
            Assign(ui, "timerLabel", timerText);
            Assign(ui, "lyricHintLabel", lyricHint);
            Assign(ui, "speechPanel", speechPanel);

            var routineGo = new GameObject("RoutineController");
            var routine = routineGo.AddComponent<RoutineSessionController>();
            Assign(routine, "character", animationController);
            Assign(routine, "ui", ui);
            var cueSource = routineGo.AddComponent<AudioSource>();
            cueSource.clip = PrototypeAudioFactory.CreateCueClip();
            var routineSource = routineGo.AddComponent<AudioSource>();
            routineSource.clip = PrototypeAudioFactory.CreateRoutineClip();
            routineSource.loop = true;
            var rewardSource = routineGo.AddComponent<AudioSource>();
            rewardSource.clip = PrototypeAudioFactory.CreateRewardClip();
            Assign(routine, "cueSong", cueSource);
            Assign(routine, "routineSong", routineSource);
            Assign(routine, "rewardSound", rewardSource);

            var logStore = routineGo.AddComponent<ResearchLogStore>();
            var observer = routineGo.AddComponent<ObserverNoteController>();
            Assign(observer, "routine", routine);
            Assign(observer, "store", logStore);
            var exporter = routineGo.AddComponent<ResearchExportService>();
            Assign(exporter, "store", logStore);
            var confetti = routineGo.AddComponent<RewardConfettiController>();
            Assign(confetti, "confettiMaterial", confettiMaterial);
            Assign(routine, "confetti", confetti);
            var sideDrawer = canvas.AddComponent<SideDrawerPanel>();
            sideDrawer.Build();
            var parentGate = canvas.AddComponent<ParentCompletionGatePanel>();
            Assign(parentGate, "routine", routine);
            parentGate.Build();
            Assign(routine, "parentCompletionGate", parentGate);
            Assign(routine, "store", logStore);
            var shiftController = canvas.AddComponent<MainContentShiftController>();
            Assign(shiftController, "drawer", sideDrawer);
            Assign(shiftController, "stage", stageController);
            Assign(shiftController, "character", glbPresenter);
            Assign(shiftController, "speechPanel", speechPanel);
            Assign(shiftController, "messageText", messageText.rectTransform);
            shiftController.Build();

            var observerForm = BuildObserverForm(canvas.transform, observer, routine, ui, statusText, sideDrawer);
            var characterSelection = canvas.AddComponent<CharacterSelectionPanel>();
            Assign(characterSelection, "currentLabel", characterLabel);
            Assign(characterSelection, "profile", routine.Profile);
            characterSelection.Build();
            sideDrawer.Opened += () => characterSelection.SuppressTopButton(true);
            sideDrawer.Closed += () => characterSelection.SuppressTopButton(false);
            Assign(ui, "characterSelection", characterSelection);
            var habitSelection = canvas.AddComponent<HabitSelectionPanel>();
            Assign(habitSelection, "routine", routine);
            Assign(habitSelection, "currentLabel", habitLabel);
            Assign(habitSelection, "drawer", sideDrawer);
            habitSelection.Build();
            Assign(observerForm, "habitSelection", habitSelection);
            var stampBoard = canvas.AddComponent<StampBoardPanel>();
            Assign(stampBoard, "store", logStore);
            Assign(stampBoard, "titleLabel", stampTitle);
            Assign(stampBoard, "stampsLabel", stampText);
            Assign(stampBoard, "drawer", sideDrawer);
            stampBoard.Refresh();
            stampBoard.Hide();
            Assign(routine, "stampBoard", stampBoard);
            Assign(observer, "stampBoard", stampBoard);
            var controls = canvas.AddComponent<PrototypeControlPanel>();
            Assign(controls, "routine", routine);
            Assign(controls, "observerForm", observerForm);
            Assign(controls, "exporter", exporter);
            Assign(controls, "statusLabel", statusText);
            Assign(controls, "habitSelection", habitSelection);
            Assign(controls, "stampBoard", stampBoard);
            Assign(controls, "drawer", sideDrawer);
            controls.Build();

            var lighting = routineGo.AddComponent<PhaseLightingController>();
            Assign(lighting, "keyLight", light);
            Assign(lighting, "mainCamera", camera);
            Assign(routine, "lighting", lighting);
            var sceneDirector = routineGo.AddComponent<RoutineSceneDirector>();
            Assign(sceneDirector, "mainCamera", camera);
            Assign(sceneDirector, "imageStage", stageController);
            Assign(sceneDirector, "glbCharacter", glbPresenter);
            Assign(routine, "sceneDirector", sceneDirector);

        }

        private static GameObject BuildCanvas(out TMP_Text phaseText, out TMP_Text messageText, out TMP_Text timerText, out TMP_Text statusText, out TMP_Text characterLabel, out TMP_Text lyricHint, out TMP_Text habitLabel, out TMP_Text stampTitle, out TMP_Text stampText, out RectTransform speechPanel)
        {
            HabitBuddy.UI.KoreanFontProvider.Get();

            var canvas = new GameObject("PrototypeUI");
            var root = canvas.AddComponent<Canvas>();
            root.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvas.AddComponent<UnityEngine.UI.CanvasScaler>();
            scaler.uiScaleMode = UnityEngine.UI.CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1600, 900);
            scaler.matchWidthOrHeight = .5f;
            canvas.AddComponent<UnityEngine.UI.GraphicRaycaster>();
            EnsureEventSystem();

            speechPanel = CreateSpeechBubble(canvas.transform, new Vector2(0, 300));

            phaseText = CreateText("PhaseText", canvas.transform, new Vector2(-630, 390), 26);
            messageText = CreateText("MessageText", canvas.transform, new Vector2(0, 300), 23);
            timerText = CreateText("TimerText", canvas.transform, new Vector2(0, 230), 34);
            statusText = CreateText("StatusText", canvas.transform, new Vector2(0, -238), 18);
            characterLabel = CreateText("CharacterLabel", canvas.transform, new Vector2(540, 342), 20);
            lyricHint = CreateText("LyricHint", canvas.transform, new Vector2(0, 252), 17);
            habitLabel = CreateText("HabitLabel", canvas.transform, new Vector2(0, -248), 18);
            stampTitle = CreateText("StampTitle", canvas.transform, new Vector2(680, 342), 20);
            stampText = CreateText("StampText", canvas.transform, new Vector2(680, 308), 18);

            phaseText.text = "♪ 동요 친구";
            phaseText.alignment = TextAlignmentOptions.Left;
            phaseText.rectTransform.sizeDelta = new Vector2(300, 52);
            messageText.text = "오늘은 어떤 습관을 같이 해볼까요?";
            messageText.textWrappingMode = TextWrappingModes.Normal;
            messageText.enableAutoSizing = true;
            messageText.fontSizeMin = 16;
            messageText.fontSizeMax = 23;
            messageText.rectTransform.sizeDelta = new Vector2(500, 54);
            timerText.text = "";
            statusText.text = "";
            characterLabel.text = "";
            lyricHint.text = "";
            habitLabel.text = "";
            stampTitle.text = "";
            stampText.text = "";
            characterLabel.gameObject.SetActive(false);
            lyricHint.gameObject.SetActive(false);
            habitLabel.gameObject.SetActive(false);
            stampTitle.gameObject.SetActive(false);
            stampText.gameObject.SetActive(false);
            return canvas;
        }

        private static void EnsureEventSystem()
        {
            if (UnityEngine.EventSystems.EventSystem.current != null) return;

            var eventSystem = new GameObject("EventSystem");
            eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
            eventSystem.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
        }

        private static ObserverFormPanel BuildObserverForm(Transform parent, ObserverNoteController observer, RoutineSessionController routine, RoutineUiPresenter routineUi, TMP_Text statusText, SideDrawerPanel drawer)
        {
            var panel = new GameObject("ObserverForm");
            panel.transform.SetParent(parent, false);
            var form = panel.AddComponent<ObserverFormPanel>();
            Assign(form, "observerNotes", observer);
            Assign(form, "routine", routine);
            Assign(form, "routineUi", routineUi);
            Assign(form, "statusLabel", statusText);
            Assign(form, "drawer", drawer);
            form.Build();
            return form;
        }

        private static TMP_InputField CreateInput(string name, Transform parent, Vector2 anchoredPosition, string placeholder)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var image = go.AddComponent<UnityEngine.UI.Image>();
            HabitBuddy.UI.SoftUiStyle.ApplyRounded(image, new Color(.96f, .96f, .96f), 18);
            var input = go.AddComponent<TMP_InputField>();
            var rect = image.rectTransform;
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.sizeDelta = new Vector2(270, 48);
            rect.anchoredPosition = anchoredPosition;

            var text = CreateText("Text", go.transform, Vector2.zero, 20);
            text.alignment = TextAlignmentOptions.Left;
            input.textComponent = text;
            var placeholderText = CreateText("Placeholder", go.transform, Vector2.zero, 20);
            placeholderText.text = placeholder;
            placeholderText.color = new Color(.55f, .55f, .55f);
            placeholderText.alignment = TextAlignmentOptions.Left;
            input.placeholder = placeholderText;
            return input;
        }

        private static TMP_Text CreateText(string name, Transform parent, Vector2 anchoredPosition, int fontSize)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<TextMeshProUGUI>();
            text.fontSize = fontSize;
            text.alignment = TextAlignmentOptions.Center;
            text.color = new Color(.16f, .16f, .16f);
            text.textWrappingMode = TextWrappingModes.NoWrap;
            text.richText = false;
            var koreanFont = HabitBuddy.UI.KoreanFontProvider.Get();
            if (koreanFont != null) text.font = koreanFont;
            var rect = text.rectTransform;
            rect.anchorMin = new Vector2(.5f, .5f);
            rect.anchorMax = new Vector2(.5f, .5f);
            rect.sizeDelta = new Vector2(1000, 60);
            rect.anchoredPosition = anchoredPosition;
            return text;
        }

        private static UnityEngine.UI.Image CreatePanel(string name, Transform parent, Vector2 anchoredPosition, Vector2 size, Color color, int radius = 20, bool shadow = false)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var image = go.AddComponent<UnityEngine.UI.Image>();
            HabitBuddy.UI.SoftUiStyle.ApplyRounded(image, color, radius);
            if (shadow)
            {
                var panelShadow = go.AddComponent<UnityEngine.UI.Shadow>();
                panelShadow.effectColor = new Color(0f, 0f, 0f, .07f);
                panelShadow.effectDistance = new Vector2(0f, -4f);
            }
            var rect = image.rectTransform;
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = anchoredPosition;
            return image;
        }

        private static RectTransform CreateSpeechBubble(Transform parent, Vector2 anchoredPosition)
        {
            var body = CreatePanel("TopSpeechPanel", parent, anchoredPosition, new Vector2(560, 78), new Color(1f, 1f, 1f, .96f), 24, true);
            var bodyRect = body.rectTransform;
            var outline = body.gameObject.AddComponent<UnityEngine.UI.Outline>();
            outline.effectColor = new Color(0f, 0f, 0f, .08f);
            outline.effectDistance = new Vector2(1f, -1f);

            var tailGo = new GameObject("SpeechBubbleTail");
            tailGo.transform.SetParent(body.transform, false);
            var tail = tailGo.AddComponent<UnityEngine.UI.Image>();
            tail.sprite = GetSpeechTailSprite();
            tail.color = new Color(1f, 1f, 1f, .96f);
            tail.raycastTarget = false;
            var tailRect = tail.rectTransform;
            tailRect.anchorMin = tailRect.anchorMax = new Vector2(.5f, 0f);
            tailRect.pivot = new Vector2(.5f, 1f);
            tailRect.sizeDelta = new Vector2(34f, 18f);
            tailRect.anchoredPosition = new Vector2(0f, 1f);
            return bodyRect;
        }

        private static Sprite speechTailSprite;

        private static Sprite GetSpeechTailSprite()
        {
            if (speechTailSprite != null) return speechTailSprite;

            const int width = 64;
            const int height = 36;
            var texture = new Texture2D(width, height, TextureFormat.RGBA32, false)
            {
                name = "SpeechBubbleTail",
                wrapMode = TextureWrapMode.Clamp,
                filterMode = FilterMode.Bilinear
            };
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var halfWidth = Mathf.Lerp(0f, width * .48f, y / (height - 1f));
                var center = width * .5f;
                for (var x = 0; x < width; x++)
                {
                    var inside = Mathf.Abs(x - center) <= halfWidth;
                    pixels[y * width + x] = inside ? new Color32(255, 255, 255, 255) : new Color32(255, 255, 255, 0);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply();
            speechTailSprite = Sprite.Create(texture, new Rect(0, 0, width, height), new Vector2(.5f, 1f), 100f);
            return speechTailSprite;
        }

        private static Camera BuildCamera()
        {
            var cameraGo = new GameObject("Main Camera");
            cameraGo.tag = "MainCamera";
            var camera = cameraGo.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.transform.position = new Vector3(0, 2.05f, -6.6f);
            camera.transform.rotation = Quaternion.Euler(5, 0, 0);
            camera.fieldOfView = 46f;
            camera.backgroundColor = new Color(.84f, .96f, .91f);
            RenderSettings.skybox = null;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(.88f, .9f, .92f);
            return camera;
        }

        private static Light BuildLight()
        {
            var lightGo = new GameObject("Key Light");
            lightGo.transform.rotation = Quaternion.Euler(48, -34, 0);
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.55f;
            light.shadows = LightShadows.Soft;
            light.shadowStrength = .55f;
            return light;
        }

        private static void BuildFillLight()
        {
            var fillGo = new GameObject("Room Fill Light");
            fillGo.transform.position = new Vector3(-2.5f, 2.8f, -2.6f);
            var fill = fillGo.AddComponent<Light>();
            fill.type = LightType.Point;
            fill.range = 7f;
            fill.intensity = .75f;
            fill.color = new Color(1f, .86f, .66f);
        }

        private static Material CreateMaterial(string name, Color color)
        {
            var shader = Shader.Find("Unlit/Color")
                         ?? Shader.Find("Standard")
                         ?? Shader.Find("Universal Render Pipeline/Simple Lit")
                         ?? Shader.Find("Universal Render Pipeline/Lit")
                         ?? Shader.Find("Sprites/Default")
                         ?? Shader.Find("UI/Default");
            var material = new Material(shader) { name = name };
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            material.color = color;
            return material;
        }

        private static void Assign(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName, System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
            field?.SetValue(target, value);
        }

        private static Renderer[] FindSceneRenderers(params string[] names)
        {
            var list = new System.Collections.Generic.List<Renderer>();
            foreach (var name in names)
            {
                var go = GameObject.Find(name);
                if (go != null && go.TryGetComponent<Renderer>(out var renderer)) list.Add(renderer);
            }
            return list.ToArray();
        }
    }
}
