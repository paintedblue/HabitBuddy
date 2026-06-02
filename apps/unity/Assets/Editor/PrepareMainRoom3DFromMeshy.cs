using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace HabitBuddy.EditorTools
{
    public static class PrepareMainRoom3DFromMeshy
    {
        private const string MeshyImportRoot = "Assets/MeshyImports";
        private const string TargetPrefabPath = "Assets/Resources/Art/Rooms/MainRoom3D.prefab";

        [MenuItem("HabitBuddy/Prepare Main Room 3D from Meshy Import")]
        public static void PrepareLatestImport()
        {
            var sourcePath = FindBestMeshyModelPath();
            if (string.IsNullOrEmpty(sourcePath))
            {
                Debug.LogWarning("[HabitBuddy] No Meshy model found under Assets/MeshyImports.");
                return;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(TargetPrefabPath));

            var source = AssetDatabase.LoadAssetAtPath<GameObject>(sourcePath);
            if (source == null)
            {
                Debug.LogWarning($"[HabitBuddy] Meshy model could not be loaded as a GameObject: {sourcePath}");
                return;
            }

            var root = new GameObject("MainRoom3D");
            var instance = PrefabUtility.InstantiatePrefab(source) as GameObject;
            if (instance == null)
            {
                Object.DestroyImmediate(root);
                Debug.LogWarning($"[HabitBuddy] Meshy model could not be instantiated: {sourcePath}");
                return;
            }

            instance.transform.SetParent(root.transform, false);
            NormalizeToStage(instance.transform);

            PrefabUtility.SaveAsPrefabAsset(root, TargetPrefabPath);
            Object.DestroyImmediate(root);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log($"[HabitBuddy] Prepared MainRoom3D prefab from {sourcePath} -> {TargetPrefabPath}");
        }

        private static string FindBestMeshyModelPath()
        {
            if (!AssetDatabase.IsValidFolder(MeshyImportRoot)) return null;

            var modelGuids = AssetDatabase.FindAssets("t:Model", new[] { MeshyImportRoot });
            return modelGuids
                .Select(AssetDatabase.GUIDToAssetPath)
                .OrderByDescending(path => ScorePath(path))
                .ThenByDescending(File.GetLastWriteTimeUtc)
                .FirstOrDefault();
        }

        private static int ScorePath(string path)
        {
            var lower = path.ToLowerInvariant();
            var score = 0;
            if (lower.Contains("main")) score += 4;
            if (lower.Contains("living")) score += 4;
            if (lower.Contains("room")) score += 4;
            if (lower.Contains("interior")) score += 2;
            return score;
        }

        private static void NormalizeToStage(Transform instance)
        {
            instance.localPosition = Vector3.zero;
            instance.localRotation = Quaternion.identity;
            instance.localScale = Vector3.one;

            var renderers = instance.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0) return;

            var bounds = renderers[0].bounds;
            for (var i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
            if (bounds.size == Vector3.zero) return;

            var maxSize = Mathf.Max(bounds.size.x, bounds.size.y, bounds.size.z);
            var scale = maxSize > 0f ? 5.2f / maxSize : 1f;
            instance.localScale = Vector3.one * scale;

            bounds = renderers[0].bounds;
            for (var i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
            instance.position += new Vector3(-bounds.center.x, -2.18f - bounds.min.y, 2f - bounds.center.z);
        }
    }
}
