#if UNITY_EDITOR
using HabitBuddy.Bootstrap;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace HabitBuddy.Editor
{
    public static class CreatePrototypeScene
    {
        [MenuItem("HabitBuddy/Create Prototype Scene")]
        public static void Create()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            {
                AssetDatabase.CreateFolder("Assets", "Scenes");
            }

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var bootstrap = new GameObject("PrototypeBootstrap");
            bootstrap.AddComponent<PrototypeBootstrap>();
            EditorSceneManager.SaveScene(scene, "Assets/Scenes/Prototype.unity");
            AssetDatabase.Refresh();
        }
    }
}
#endif
