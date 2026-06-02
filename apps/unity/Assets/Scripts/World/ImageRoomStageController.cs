using UnityEngine;

namespace HabitBuddy.World
{
    public enum RoomStage
    {
        MainRoom,
        Bathroom
    }

    public sealed class ImageRoomStageController : MonoBehaviour
    {
        private const string MainRoomResourcePath = "Art/Backgrounds/main_room";
        private const string BathroomResourcePath = "Art/Backgrounds/bathroom";

        [SerializeField] private Camera mainCamera;
        [SerializeField] private Sprite mainRoomSprite;
        [SerializeField] private Sprite bathroomSprite;
        [SerializeField] private float backgroundDistance = 10f;
        [SerializeField] private Color cameraBackgroundColor = new(.86f, .91f, .94f);

        private SpriteRenderer backgroundRenderer;

        public event System.Action StageLayoutChanged;
        public RoomStage CurrentStage { get; private set; } = RoomStage.MainRoom;

        public Vector3 CharacterPosition => CurrentStage == RoomStage.Bathroom
            ? new Vector3(-1.18f, -1.6f, 0f)
            : new Vector3(0f, -2.18f, 0f);

        public Vector3 CharacterEuler => CurrentStage == RoomStage.Bathroom
            ? new Vector3(0f, 177f, 0f)
            : new Vector3(0f, 180f, 0f);

        public float CharacterScale => CurrentStage == RoomStage.Bathroom
            ? 1.48f
            : 1.22f;

        public void Build()
        {
            if (mainCamera == null) mainCamera = Camera.main;
            mainRoomSprite ??= LoadSprite(MainRoomResourcePath);
            bathroomSprite ??= LoadSprite(BathroomResourcePath);

            var background = new GameObject("RoomImageBackground");
            background.transform.SetParent(transform, false);
            backgroundRenderer = background.AddComponent<SpriteRenderer>();
            backgroundRenderer.sortingOrder = -100;

            ConfigureCamera();
            Show(RoomStage.MainRoom, true);
        }

        public void Show(RoomStage stage, bool immediate = false)
        {
            CurrentStage = stage;
            if (backgroundRenderer == null) return;

            backgroundRenderer.enabled = true;
            backgroundRenderer.sprite = stage == RoomStage.Bathroom ? bathroomSprite : mainRoomSprite;
            backgroundRenderer.color = Color.white;
            FitBackgroundToCamera();
            if (!immediate) StartCoroutine(PulseBackground());
            StageLayoutChanged?.Invoke();
        }

        private void ConfigureCamera()
        {
            if (mainCamera == null) return;
            mainCamera.clearFlags = CameraClearFlags.SolidColor;
            mainCamera.backgroundColor = cameraBackgroundColor;
            mainCamera.orthographic = true;
            mainCamera.orthographicSize = 3f;
            mainCamera.transform.position = new Vector3(0f, 0f, -backgroundDistance);
            mainCamera.transform.rotation = Quaternion.identity;
            mainCamera.fieldOfView = 46f;
        }

        private void FitBackgroundToCamera()
        {
            if (mainCamera == null || backgroundRenderer.sprite == null) return;

            var cameraHeight = mainCamera.orthographicSize * 2f;
            var cameraWidth = cameraHeight * mainCamera.aspect;
            var spriteSize = backgroundRenderer.sprite.bounds.size;
            var scale = Mathf.Max(cameraWidth / spriteSize.x, cameraHeight / spriteSize.y) * 1.01f;

            backgroundRenderer.transform.position = new Vector3(0f, 0f, 2.5f);
            backgroundRenderer.transform.localScale = Vector3.one * scale;
        }

        private static Sprite LoadSprite(string resourcePath)
        {
            var sprite = Resources.Load<Sprite>(resourcePath);
            if (sprite != null) return sprite;

            var texture = Resources.Load<Texture2D>(resourcePath);
            if (texture == null) return null;
            return Sprite.Create(texture, new Rect(0f, 0f, texture.width, texture.height), new Vector2(.5f, .5f), 100f);
        }

        private System.Collections.IEnumerator PulseBackground()
        {
            if (!backgroundRenderer.enabled) yield break;
            var start = new Color(1f, 1f, 1f, .72f);
            var end = Color.white;
            var elapsed = 0f;
            while (elapsed < .18f)
            {
                elapsed += Time.deltaTime;
                backgroundRenderer.color = Color.Lerp(start, end, elapsed / .18f);
                yield return null;
            }
            backgroundRenderer.color = end;
        }

    }
}
