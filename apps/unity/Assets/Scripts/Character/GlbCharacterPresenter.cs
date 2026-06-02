using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using UnityEngine.Animations;
using UnityEngine.Playables;
using UnityEngine;

namespace HabitBuddy.Character
{
    public sealed class GlbCharacterPresenter : MonoBehaviour
    {
        private const string BaseGlbRelativePath = "Characters/Base.glb";

        [SerializeField] private GameObject importedModelPrefab;
        [SerializeField] private string baseFbxResourcePath = "Art/Characters/FoxStopped";
        [SerializeField] private string waveFbxResourcePath = "Art/Characters/Animations/Waving";
        [SerializeField] private string brushFbxResourcePath = "Art/Characters/Animations/Hip Hop Dancing";
        [SerializeField] private string celebrateFbxResourcePath = "Art/Characters/Animations/Rumba Dancing";
        [SerializeField] private RuntimeAnimatorController animatorController;
        [SerializeField] private string idleState = "Idle";
        [SerializeField] private string appearState = "Appear";
        [SerializeField] private string walkState = "Walk";
        [SerializeField] private string waveState = "Wave";
        [SerializeField] private string brushState = "BrushTeeth";
        [SerializeField] private string praiseState = "Praise";
        [SerializeField] private string celebrateState = "DanceCelebrate";
        [SerializeField] private float transitionDuration = .2f;

        private Animator animator;
        private Animation legacyAnimation;
        private Animation currentExplicitAnimation;
        private Coroutine currentFallback;
        private Coroutine currentDanceFallback;
        private Transform rightArm;
        private Vector3 basePosition;
        private Quaternion baseRotation;
        private bool modelPostProcessed;
        private Texture2D embeddedCharacterTexture;
        private readonly Dictionary<string, AnimationClip> resourceClips = new Dictionary<string, AnimationClip>(StringComparer.Ordinal);
        private readonly Dictionary<string, string> resourceClipPaths = new Dictionary<string, string>(StringComparer.Ordinal);
        private PlayableGraph animationGraph;
        private AnimationPlayableOutput animationOutput;
        private AnimationClipPlayable activeClipPlayable;
        private Coroutine currentResourceClipLoop;
        private GameObject currentModel;
        private string currentResourcePath;

        private void Start()
        {
            basePosition = transform.position;
            baseRotation = transform.rotation;
            CacheResourceAnimationClips();
            if (importedModelPrefab != null) InstantiatePrefab(importedModelPrefab);
            else if (TryShowBaseFbxCharacterAsset()) { }
            else StartCoroutine(LoadGlbAsset());
            PlayIdle();
        }

        private void OnDestroy()
        {
            StopFbxClip();
        }

        public void ApplyPlacement(Vector3 position, Vector3 eulerAngles, float scale)
        {
            basePosition = position;
            transform.position = position;
            baseRotation = Quaternion.Euler(eulerAngles);
            transform.rotation = baseRotation;
            transform.localScale = Vector3.one * scale;
        }

        public void PlayIdle() => Play(idleState, FallbackIdle(), true);

        public void PlayAppear() => Play(appearState, FallbackAppear(), true);

        public void PlayWalk() => Play(walkState, FallbackWalk(), true);

        public void PlayWave() => Play(waveState, FallbackWave());

        public void PlayBrushTeeth() => PlayHipHopDancing();

        public void PlayPraise() => Play(praiseState, FallbackPraise());

        public void PlayCelebrate() => Play(celebrateState, FallbackCelebrate());

        public void PlayRewardSequence()
        {
            if (currentFallback != null) StopCoroutine(currentFallback);
            currentFallback = StartCoroutine(RewardSequence());
        }

        private void PlayHipHopDancing()
        {
            if (currentFallback != null)
            {
                StopCoroutine(currentFallback);
                currentFallback = null;
            }

            if (TryPlayExplicitFbxAnimation(brushState, brushFbxResourcePath, true, true)) return;

            Debug.LogWarning($"HabitBuddy could not play the requested hip hop dance FBX at Resources/{brushFbxResourcePath}. Falling back to procedural dance.");
            StopFbxClip();
            currentFallback = StartCoroutine(FallbackBrush());
        }

        private IEnumerator LoadGlbAsset()
        {
            var gltfAssetType = Type.GetType("GLTFast.GltfAsset, glTFast")
                                ?? Type.GetType("GLTFast.GltfAsset, GLTFast");
            if (gltfAssetType == null)
            {
                Debug.LogWarning("glTFast is not resolved yet. Open the Unity project once so Package Manager installs com.unity.cloud.gltfast.");
                BuildFallbackMarker();
                yield break;
            }

            var component = gameObject.AddComponent(gltfAssetType);
            var url = new Uri(Path.Combine(Application.streamingAssetsPath, BaseGlbRelativePath)).AbsoluteUri;
            SetStringMember(component, "url", url);
            SetMember(component, "Url", url);
            SetMember(component, "FullUrl", url);
            SetMember(component, "SceneId", 0);
            SetMember(component, "sceneId", 0);
            SetMember(component, "LoadOnStartup", true);
            SetMember(component, "loadOnStartup", true);

            var timeout = 4f;
            while (timeout > 0f && !modelPostProcessed)
            {
                timeout -= Time.deltaTime;
                CacheAnimationComponents();
                TryPostProcessLoadedModel();
                yield return null;
            }

            CacheAnimationComponents();
            CacheRigAnchors();
            TryPostProcessLoadedModel();
            if (animator == null && legacyAnimation == null)
            {
                Debug.LogWarning("GLB loaded without a controllable Animator/Animation component. Fallback motion will be used until animation clips are wired.");
            }
        }

        private void InstantiatePrefab(GameObject prefab)
        {
            ReplaceCurrentModel(prefab, "CharacterModel", null);
        }

        private void ReplaceCurrentModel(GameObject prefab, string modelName, string resourcePath)
        {
            if (currentModel != null)
            {
                currentModel.SetActive(false);
                Destroy(currentModel);
                currentModel = null;
            }

            modelPostProcessed = false;
            animator = null;
            legacyAnimation = null;
            currentExplicitAnimation = null;
            rightArm = null;
            var model = Instantiate(prefab, transform);
            model.name = modelName;
            model.transform.localPosition = Vector3.zero;
            model.transform.localRotation = Quaternion.identity;
            model.transform.localScale = Vector3.one;
            currentModel = model;
            currentResourcePath = resourcePath;
            CacheAnimationComponents();
            CacheRigAnchors();
            TryPostProcessLoadedModel();
        }

        private bool TryShowBaseFbxCharacterAsset()
        {
            if (string.IsNullOrWhiteSpace(baseFbxResourcePath)) return false;
            if (currentModel != null && currentResourcePath == baseFbxResourcePath) return true;

            var prefab = Resources.Load<GameObject>(baseFbxResourcePath);
            if (prefab == null) return false;

            ReplaceCurrentModel(prefab, "CharacterModel", baseFbxResourcePath);
            return true;
        }

        private void CacheResourceAnimationClips()
        {
            resourceClips.Clear();
            resourceClipPaths.Clear();
            AddResourceClip(waveState, waveFbxResourcePath);
            AddResourceClip(brushState, brushFbxResourcePath);
            AddResourceClip(celebrateState, celebrateFbxResourcePath);
            AddResourceClip(praiseState, waveFbxResourcePath);
        }

        private void AddResourceClip(string stateName, string resourcePath)
        {
            if (string.IsNullOrWhiteSpace(stateName) || string.IsNullOrWhiteSpace(resourcePath)) return;

            var clip = PickPlayableClip(Resources.LoadAll<AnimationClip>(resourcePath));
            if (clip == null) return;

            resourceClips[stateName] = clip;
            resourceClipPaths[stateName] = resourcePath;
        }

        private static AnimationClip PickPlayableClip(AnimationClip[] clips)
        {
            AnimationClip best = null;
            foreach (var clip in clips)
            {
                if (clip == null || clip.name.StartsWith("__", StringComparison.Ordinal)) continue;
                if (best == null || clip.length > best.length) best = clip;
            }
            return best;
        }

        private void CacheAnimationComponents()
        {
            animator = GetComponentInChildren<Animator>();
            legacyAnimation = GetComponentInChildren<Animation>();
            currentExplicitAnimation = legacyAnimation;
            if (animator != null && animatorController != null) animator.runtimeAnimatorController = animatorController;
            ConfigureAnimator(animator);
        }

        private static void ConfigureAnimator(Animator target)
        {
            if (target == null) return;

            target.applyRootMotion = false;
            target.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            target.updateMode = AnimatorUpdateMode.Normal;
        }

        private void CacheRigAnchors()
        {
            rightArm = FindDeepChild(transform, "RightArm") ?? FindDeepChild(transform, "RightForeArm") ?? FindDeepChild(transform, "RightHand");
        }

        private void Play(string stateName, IEnumerator fallback, bool useBaseForFallback = false, bool keepVisibleDanceFallback = false)
        {
            if (currentFallback != null)
            {
                StopCoroutine(currentFallback);
                currentFallback = null;
            }

            CacheAnimationComponents();
            CacheRigAnchors();

            if (TryPlayResourceClip(stateName, keepVisibleDanceFallback)) return;

            if (TryPlayImportedState(stateName)) return;

            StopFbxClip();
            if (useBaseForFallback) TryShowBaseFbxCharacterAsset();
            currentFallback = StartCoroutine(fallback);
        }

        private bool TryPlayImportedState(string stateName)
        {
            if (legacyAnimation != null && legacyAnimation.GetClip(stateName) != null)
            {
                StopFbxClip();
                legacyAnimation.CrossFade(stateName, transitionDuration);
                return true;
            }

            if (animator != null && animator.runtimeAnimatorController != null && HasAnimatorState(stateName))
            {
                StopFbxClip();
                ConfigureAnimator(animator);
                animator.CrossFadeInFixedTime(stateName, transitionDuration);
                return true;
            }

            return TryPlayResourceClip(stateName, false);
        }

        private bool TryPlayResourceClip(string stateName, bool keepVisibleDanceFallback)
        {
            if (!resourceClips.TryGetValue(stateName, out var clip) || clip == null) return false;
            if (!resourceClipPaths.TryGetValue(stateName, out var resourcePath) || string.IsNullOrWhiteSpace(resourcePath)) return false;
            return TryPlayExplicitFbxAnimation(stateName, resourcePath, IsLoopingResourceState(stateName), keepVisibleDanceFallback, clip);
        }

        private bool TryPlayExplicitFbxAnimation(string stateName, string resourcePath, bool loop, bool keepVisibleDanceFallback, AnimationClip knownClip = null)
        {
            if (string.IsNullOrWhiteSpace(resourcePath))
            {
                Debug.LogWarning($"HabitBuddy animation resource path is empty for state {stateName}.");
                return false;
            }

            var prefab = Resources.Load<GameObject>(resourcePath);
            if (prefab == null)
            {
                Debug.LogWarning($"HabitBuddy animation prefab not found: Resources/{resourcePath}");
                return false;
            }

            var clip = knownClip != null ? knownClip : PickPlayableClip(Resources.LoadAll<AnimationClip>(resourcePath));
            if (clip == null)
            {
                Debug.LogWarning($"HabitBuddy animation clip not found in Resources/{resourcePath}");
                return false;
            }

            if (!TryShowResourceFbxCharacterAsset(resourcePath, stateName, prefab)) return false;
            CacheAnimationComponents();
            if (TryPlayLegacyAnimationClip(stateName, clip, loop, keepVisibleDanceFallback, resourcePath)) return true;

            if (animator == null)
            {
                var modelRoot = transform.childCount > 0 ? transform.GetChild(0).gameObject : gameObject;
                animator = modelRoot.GetComponent<Animator>() ?? modelRoot.AddComponent<Animator>();
            }
            ConfigureAnimator(animator);

            StopFbxClip();
            clip.wrapMode = loop ? WrapMode.Loop : WrapMode.Once;
            animationGraph = PlayableGraph.Create($"HabitBuddy_{stateName}");
            animationGraph.SetTimeUpdateMode(DirectorUpdateMode.GameTime);
            activeClipPlayable = AnimationClipPlayable.Create(animationGraph, clip);
            activeClipPlayable.SetApplyFootIK(true);
            activeClipPlayable.SetSpeed(1d);
            activeClipPlayable.SetTime(0d);
            animationOutput = AnimationPlayableOutput.Create(animationGraph, $"{stateName}Output", animator);
            animationOutput.SetSourcePlayable(activeClipPlayable);
            animationGraph.Play();
            if (loop) currentResourceClipLoop = StartCoroutine(LoopResourceClip(clip));
            if (keepVisibleDanceFallback) StartDanceFallbackLoop();
            Debug.Log($"HabitBuddy character animation started from FBX: state={stateName}, resource=Resources/{resourcePath}, clip={clip.name}, length={clip.length:0.00}s, loop={loop}");
            return true;
        }

        private bool TryPlayLegacyAnimationClip(string stateName, AnimationClip clip, bool loop, bool keepVisibleDanceFallback, string resourcePath)
        {
            if (clip == null || currentModel == null) return false;

            StopFbxClip();
            currentExplicitAnimation = currentModel.GetComponent<Animation>() ?? currentModel.AddComponent<Animation>();
            legacyAnimation = currentExplicitAnimation;
            clip.wrapMode = loop ? WrapMode.Loop : WrapMode.Once;
            if (!clip.legacy)
            {
                Debug.LogWarning($"HabitBuddy FBX clip is not legacy yet: resource=Resources/{resourcePath}, clip={clip.name}. Falling back to PlayableGraph.");
                return false;
            }

            currentExplicitAnimation.playAutomatically = false;
            currentExplicitAnimation.cullingType = AnimationCullingType.AlwaysAnimate;
            currentExplicitAnimation.AddClip(clip, stateName);
            currentExplicitAnimation.clip = clip;
            currentExplicitAnimation.wrapMode = loop ? WrapMode.Loop : WrapMode.Once;
            currentExplicitAnimation.Play(stateName);
            if (keepVisibleDanceFallback) StartDanceFallbackLoop();
            Debug.Log($"HabitBuddy hip hop dance started with Legacy Animation: state={stateName}, resource=Resources/{resourcePath}, clip={clip.name}, length={clip.length:0.00}s, loop={loop}");
            return true;
        }

        private bool TryShowResourceFbxCharacterAsset(string resourcePath, string stateName, GameObject prefab = null)
        {
            if (currentModel != null && currentResourcePath == resourcePath) return true;

            prefab ??= Resources.Load<GameObject>(resourcePath);
            if (prefab == null) return false;

            ReplaceCurrentModel(prefab, $"{stateName}Model", resourcePath);
            return true;
        }

        private void StopFbxClip()
        {
            if (currentResourceClipLoop != null)
            {
                StopCoroutine(currentResourceClipLoop);
                currentResourceClipLoop = null;
            }
            if (currentDanceFallback != null)
            {
                StopCoroutine(currentDanceFallback);
                currentDanceFallback = null;
                transform.position = basePosition;
                transform.rotation = baseRotation;
            }
            if (currentExplicitAnimation != null) currentExplicitAnimation.Stop();
            if (animationGraph.IsValid()) animationGraph.Destroy();
        }

        private void StartDanceFallbackLoop()
        {
            if (currentDanceFallback != null) StopCoroutine(currentDanceFallback);
            currentDanceFallback = StartCoroutine(DanceFallbackLoop());
        }

        private bool IsLoopingResourceState(string stateName)
        {
            return stateName == brushState || stateName == celebrateState;
        }

        private IEnumerator LoopResourceClip(AnimationClip clip)
        {
            if (clip == null || clip.length <= 0f) yield break;

            while (animationGraph.IsValid() && activeClipPlayable.IsValid())
            {
                if (activeClipPlayable.GetTime() >= clip.length)
                {
                    activeClipPlayable.SetTime(0d);
                    activeClipPlayable.SetDone(false);
                }
                yield return null;
            }
        }

        private bool HasAnimatorState(string stateName)
        {
            if (animator == null || animator.runtimeAnimatorController == null) return false;
            var hash = Animator.StringToHash(stateName);
            return animator.HasState(0, hash);
        }

        private IEnumerator FallbackIdle()
        {
            while (true)
            {
                var y = Mathf.Sin(Time.time * 1.4f) * .035f;
                transform.position = basePosition + new Vector3(0f, y, 0f);
                yield return null;
            }
        }

        private IEnumerator FallbackAppear()
        {
            var from = basePosition + new Vector3(-1.2f, 0f, 0f);
            var elapsed = 0f;
            while (elapsed < .85f)
            {
                elapsed += Time.deltaTime;
                var t = Mathf.SmoothStep(0f, 1f, elapsed / .85f);
                transform.position = Vector3.Lerp(from, basePosition, t);
                yield return null;
            }
            currentFallback = StartCoroutine(FallbackIdle());
        }

        private IEnumerator FallbackWalk()
        {
            var elapsed = 0f;
            while (elapsed < 1.2f)
            {
                elapsed += Time.deltaTime;
                var y = Mathf.Abs(Mathf.Sin(elapsed * 9f)) * .06f;
                transform.position = basePosition + new Vector3(0f, y, 0f);
                yield return null;
            }
            currentFallback = StartCoroutine(FallbackIdle());
        }

        private IEnumerator FallbackWave()
        {
            var elapsed = 0f;
            while (elapsed < 1.8f)
            {
                elapsed += Time.deltaTime;
                RotateRightArm(-52f, Mathf.Sin(elapsed * 10f) * 20f);
                yield return null;
            }
            ResetRightArm();
            currentFallback = StartCoroutine(FallbackIdle());
        }

        private IEnumerator FallbackBrush()
        {
            while (true)
            {
                ApplyDanceFallbackPose(Time.time);
                yield return null;
            }
        }

        private IEnumerator DanceFallbackLoop()
        {
            while (true)
            {
                ApplyDanceFallbackPose(Time.time);
                yield return null;
            }
        }

        private void ApplyDanceFallbackPose(float time)
        {
            var bounce = Mathf.Abs(Mathf.Sin(time * 6.5f)) * .11f;
            var sway = Mathf.Sin(time * 4.2f) * .10f;
            var twist = Mathf.Sin(time * 5.4f) * 9f;
            var roll = Mathf.Sin(time * 8.2f) * 4f;
            transform.position = basePosition + new Vector3(sway, bounce, 0f);
            transform.rotation = baseRotation * Quaternion.Euler(0f, twist, roll);
            RotateRightArm(-72f, Mathf.Sin(time * 10.5f) * 24f);
        }

        private IEnumerator FallbackPraise()
        {
            var elapsed = 0f;
            while (elapsed < 1.6f)
            {
                elapsed += Time.deltaTime;
                transform.position = basePosition + new Vector3(0f, Mathf.Abs(Mathf.Sin(elapsed * 7f)) * .12f, 0f);
                yield return null;
            }
            currentFallback = StartCoroutine(FallbackIdle());
        }

        private IEnumerator FallbackCelebrate()
        {
            var elapsed = 0f;
            while (elapsed < 2.2f)
            {
                elapsed += Time.deltaTime;
                transform.position = basePosition + new Vector3(0f, Mathf.Abs(Mathf.Sin(elapsed * 8f)) * .18f, 0f);
                RotateRightArm(-90f, Mathf.Sin(elapsed * 12f) * 18f);
                yield return null;
            }
            ResetRightArm();
            currentFallback = StartCoroutine(FallbackIdle());
        }

        private IEnumerator RewardSequence()
        {
            CacheAnimationComponents();
            CacheRigAnchors();
            if (!TryPlayImportedState(praiseState))
            {
                var elapsed = 0f;
                while (elapsed < 1.2f)
                {
                    elapsed += Time.deltaTime;
                    transform.position = basePosition + new Vector3(0f, Mathf.Abs(Mathf.Sin(elapsed * 7f)) * .12f, 0f);
                    yield return null;
                }
            }
            yield return new WaitForSeconds(1.4f);
            if (!TryPlayImportedState(celebrateState)) yield return FallbackCelebrate();
        }

        private void RotateRightArm(float x, float zOffset)
        {
            if (rightArm != null) rightArm.localRotation = Quaternion.Euler(x, 0f, 18f + zOffset);
        }

        private void ResetRightArm()
        {
            if (rightArm != null) rightArm.localRotation = Quaternion.identity;
        }

        private void TryPostProcessLoadedModel()
        {
            if (modelPostProcessed) return;

            var renderers = GetComponentsInChildren<Renderer>(true);
            if (renderers.Length == 0) return;

            DisableDuplicateCharacterMeshes(renderers);
            embeddedCharacterTexture ??= LoadEmbeddedCharacterTexture();
            ApplyNaturalCharacterMaterials(renderers, embeddedCharacterTexture);
            NormalizeModelLocalBounds(renderers);
            CacheRigAnchors();
            modelPostProcessed = true;
        }

        private static void DisableDuplicateCharacterMeshes(Renderer[] renderers)
        {
            foreach (var renderer in renderers)
            {
                var lowerName = renderer.name.ToLowerInvariant();
                var looksLikeDuplicate = lowerName.Contains(".001") ||
                                         lowerName.EndsWith("_1");
                var looksLikeCharacterMesh = lowerName.Contains("char") || lowerName.Contains("mesh");
                if (looksLikeCharacterMesh && looksLikeDuplicate)
                {
                    renderer.enabled = false;
                    continue;
                }
            }
        }

        private static void ApplyNaturalCharacterMaterials(Renderer[] renderers, Texture embeddedTexture)
        {
            foreach (var renderer in renderers)
            {
                if (!renderer.enabled) continue;
                var materials = renderer.materials;
                for (var i = 0; i < materials.Length; i++)
                {
                    materials[i] = BuildReadableCharacterMaterial(materials[i], embeddedTexture);
                }
                renderer.materials = materials;
            }
        }

        private static Material BuildReadableCharacterMaterial(Material source, Texture embeddedTexture)
        {
            if (source == null) return null;

            var texture = embeddedTexture != null ? embeddedTexture : TryGetAnyMainTexture(source);
            if (texture == null)
            {
                Debug.LogWarning("Character texture missing: expected embedded GLB texture or squirrel texture asset. No fallback color was applied.");
                return source;
            }

            var shader = Shader.Find("Unlit/Texture")
                         ?? Shader.Find("Universal Render Pipeline/Unlit")
                         ?? Shader.Find("Universal Render Pipeline/Simple Lit")
                         ?? Shader.Find("Universal Render Pipeline/Lit")
                         ?? Shader.Find("Standard")
                         ?? source.shader;
            var material = new Material(shader)
            {
                name = $"{source.name}_HabitBuddyTexture"
            };

            SetTexture(material, "_BaseMap", texture);
            SetTexture(material, "_MainTex", texture);
            SetTexture(material, "_BaseColorMap", texture);
            material.mainTexture = texture;
            SetColor(material, "_BaseColor", Color.white);
            SetColor(material, "_Color", Color.white);
            SetColor(material, "_EmissionColor", Color.black);
            SetFloat(material, "_Metallic", 0f);
            SetFloat(material, "_Smoothness", 0f);
            SetFloat(material, "_Glossiness", 0f);
            SetFloat(material, "_SpecularHighlights", 0f);
            SetFloat(material, "_EnvironmentReflections", 0f);
            SetFloat(material, "_Cull", 0f);
            material.DisableKeyword("_EMISSION");
            material.color = Color.white;
            return material;
        }

        private static Texture2D LoadEmbeddedCharacterTexture()
        {
            var path = Path.Combine(Application.streamingAssetsPath, BaseGlbRelativePath);
            if (!File.Exists(path))
            {
                Debug.LogWarning($"Character GLB not found for texture extraction: {path}");
                return null;
            }

            try
            {
                using var stream = File.OpenRead(path);
                if (ReadUInt32(stream) != 0x46546C67) return null;
                _ = ReadUInt32(stream);
                _ = ReadUInt32(stream);

                var jsonLength = ReadUInt32(stream);
                var jsonType = ReadUInt32(stream);
                if (jsonType != 0x4E4F534A) return null;

                var jsonBytes = new byte[jsonLength];
                stream.Read(jsonBytes, 0, jsonBytes.Length);
                var json = Encoding.UTF8.GetString(jsonBytes);

                var binLength = ReadUInt32(stream);
                var binType = ReadUInt32(stream);
                if (binType != 0x004E4942) return null;

                var bufferViewIndex = ParseFirstImageBufferView(json);
                var byteOffset = ParseBufferViewInt(json, bufferViewIndex, "byteOffset", 0);
                var byteLength = ParseBufferViewInt(json, bufferViewIndex, "byteLength", -1);
                if (byteLength <= 0 || byteOffset < 0 || byteOffset + byteLength > binLength) return null;

                stream.Position += byteOffset;
                var imageBytes = new byte[byteLength];
                stream.Read(imageBytes, 0, imageBytes.Length);

                var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false)
                {
                    name = "GLB_texture_0",
                    wrapMode = TextureWrapMode.Repeat,
                    filterMode = FilterMode.Bilinear
                };
                if (!TryLoadPngIntoTexture(texture, imageBytes))
                {
                    UnityEngine.Object.Destroy(texture);
                    return null;
                }
                return texture;
            }
            catch (Exception exception)
            {
                Debug.LogWarning($"Character texture extraction failed: {exception.Message}");
                return null;
            }
        }

        private static bool TryLoadPngIntoTexture(Texture2D texture, byte[] imageBytes)
        {
            var imageConversionType = Type.GetType("UnityEngine.ImageConversion, UnityEngine.ImageConversionModule")
                                      ?? Type.GetType("UnityEngine.ImageConversion, UnityEngine.CoreModule");
            var loadImage = imageConversionType?.GetMethod(
                "LoadImage",
                BindingFlags.Public | BindingFlags.Static,
                null,
                new[] { typeof(Texture2D), typeof(byte[]) },
                null);
            return loadImage != null && (bool)loadImage.Invoke(null, new object[] { texture, imageBytes });
        }

        private static uint ReadUInt32(Stream stream)
        {
            var bytes = new byte[4];
            var read = stream.Read(bytes, 0, bytes.Length);
            return read == bytes.Length ? BitConverter.ToUInt32(bytes, 0) : 0;
        }

        private static int ParseFirstImageBufferView(string json)
        {
            var imagesIndex = json.IndexOf("\"images\"", StringComparison.Ordinal);
            if (imagesIndex < 0) return -1;
            var bufferViewIndex = json.IndexOf("\"bufferView\"", imagesIndex, StringComparison.Ordinal);
            if (bufferViewIndex < 0) return -1;
            return ParseIntAfterColon(json, bufferViewIndex, -1);
        }

        private static int ParseBufferViewInt(string json, int bufferViewIndex, string key, int fallback)
        {
            if (bufferViewIndex < 0) return fallback;
            var arrayIndex = json.IndexOf("\"bufferViews\"", StringComparison.Ordinal);
            if (arrayIndex < 0) return fallback;
            var cursor = json.IndexOf('[', arrayIndex);
            for (var i = 0; i <= bufferViewIndex; i++)
            {
                cursor = json.IndexOf('{', cursor + 1);
                if (cursor < 0) return fallback;
            }
            var end = json.IndexOf('}', cursor);
            var keyIndex = json.IndexOf($"\"{key}\"", cursor, end - cursor, StringComparison.Ordinal);
            return keyIndex < 0 ? fallback : ParseIntAfterColon(json, keyIndex, fallback);
        }

        private static int ParseIntAfterColon(string json, int keyIndex, int fallback)
        {
            var colon = json.IndexOf(':', keyIndex);
            if (colon < 0) return fallback;
            var cursor = colon + 1;
            while (cursor < json.Length && char.IsWhiteSpace(json[cursor])) cursor++;
            var start = cursor;
            while (cursor < json.Length && char.IsDigit(json[cursor])) cursor++;
            return int.TryParse(json.Substring(start, cursor - start), out var value) ? value : fallback;
        }

        private static Texture TryGetAnyMainTexture(Material material)
        {
            var texture = TryGetTexture(material, "_BaseMap") ??
                          TryGetTexture(material, "_MainTex") ??
                          TryGetTexture(material, "_BaseColorMap") ??
                          TryGetTexture(material, "_EmissionMap") ??
                          TryGetTexture(material, "_EmissiveColorMap");
            if (texture != null) return texture;

            foreach (var propertyName in material.GetTexturePropertyNames())
            {
                texture = material.GetTexture(propertyName);
                if (texture != null) return texture;
            }

            return null;
        }

        private static Texture TryGetTexture(Material material, string property)
        {
            return material != null && material.HasProperty(property) ? material.GetTexture(property) : null;
        }

        private static void SetTexture(Material material, string property, Texture texture)
        {
            if (material.HasProperty(property)) material.SetTexture(property, texture);
        }

        private static void SetColor(Material material, string property, Color color)
        {
            if (material.HasProperty(property)) material.SetColor(property, color);
        }

        private static void SetFloat(Material material, string property, float value)
        {
            if (material.HasProperty(property)) material.SetFloat(property, value);
        }

        private void NormalizeModelLocalBounds(Renderer[] renderers)
        {
            var activeRenderers = new System.Collections.Generic.List<Renderer>();
            foreach (var renderer in renderers)
            {
                if (renderer.enabled) activeRenderers.Add(renderer);
            }
            if (activeRenderers.Count == 0) return;

            var bounds = activeRenderers[0].bounds;
            for (var i = 1; i < activeRenderers.Count; i++) bounds.Encapsulate(activeRenderers[i].bounds);
            if (bounds.size == Vector3.zero) return;

            var targetHeight = 1.95f;
            var heightScale = targetHeight / bounds.size.y;
            foreach (Transform child in transform)
            {
                child.localScale *= heightScale;
            }

            bounds = activeRenderers[0].bounds;
            for (var i = 1; i < activeRenderers.Count; i++) bounds.Encapsulate(activeRenderers[i].bounds);
            var correction = new Vector3(basePosition.x - bounds.center.x, basePosition.y - bounds.min.y, basePosition.z - bounds.center.z);
            foreach (Transform child in transform)
            {
                child.position += correction;
            }
            transform.position = basePosition;
        }

        private void BuildFallbackMarker()
        {
            var marker = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            marker.name = "GlbCharacterFallbackMarker";
            marker.transform.SetParent(transform, false);
            marker.transform.localPosition = new Vector3(0f, .75f, 0f);
            marker.transform.localScale = new Vector3(.45f, .9f, .45f);
        }

        private static void SetMember(Component component, string name, object value)
        {
            var type = component.GetType();
            var property = type.GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (property != null && property.CanWrite)
            {
                property.SetValue(component, value);
                return;
            }

            var field = type.GetField(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            field?.SetValue(component, value);
        }

        private static void SetStringMember(Component component, string preferredName, string value)
        {
            var type = component.GetType();
            var fields = type.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            FieldInfo fallback = null;
            foreach (var field in fields)
            {
                if (field.FieldType != typeof(string)) continue;
                if (string.Equals(field.Name, preferredName, StringComparison.OrdinalIgnoreCase) ||
                    field.Name.IndexOf("url", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    field.Name.IndexOf("uri", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    field.SetValue(component, value);
                    return;
                }
                fallback ??= field;
            }
            fallback?.SetValue(component, value);
        }

        private static Transform FindDeepChild(Transform parent, string targetName)
        {
            if (parent.name == targetName) return parent;
            for (var i = 0; i < parent.childCount; i++)
            {
                var found = FindDeepChild(parent.GetChild(i), targetName);
                if (found != null) return found;
            }
            return null;
        }
    }
}
