using UnityEngine;

namespace HabitBuddy.Character
{
    public sealed class ProceduralCharacterBuilder : MonoBehaviour
    {
        private const string BearPrefabPath = "Art/Characters/Bear";
        private const string BunnyPrefabPath = "Art/Characters/Bunny";

        [SerializeField] private GameObject bearPrefab;
        [SerializeField] private GameObject bunnyPrefab;
        [SerializeField] private Material bodyMaterial;
        [SerializeField] private Material accentMaterial;
        [SerializeField] private Material eyeMaterial;
        [SerializeField] private Material blushMaterial;
        [SerializeField] private string characterId = "bear";

        public Transform LeftArm { get; private set; }
        public Transform RightArm { get; private set; }
        public Transform LeftLeg { get; private set; }
        public Transform RightLeg { get; private set; }
        public Transform Toothbrush { get; private set; }
        public Animator ModelAnimator { get; private set; }

        public void Rebuild(string nextCharacterId)
        {
            characterId = nextCharacterId;
            ModelAnimator = null;
            LeftArm = RightArm = LeftLeg = RightLeg = Toothbrush = null;
            for (var i = transform.childCount - 1; i >= 0; i--)
            {
                Destroy(transform.GetChild(i).gameObject);
            }
            var modelPrefab = LoadCharacterPrefab();
            if (modelPrefab != null)
            {
                BuildModelCharacter(modelPrefab);
                return;
            }
            if (characterId == "bunny") BuildBunny();
            else BuildBear();
        }

        private GameObject LoadCharacterPrefab()
        {
            if (characterId == "bunny")
            {
                return bunnyPrefab != null ? bunnyPrefab : Resources.Load<GameObject>(BunnyPrefabPath);
            }
            return bearPrefab != null ? bearPrefab : Resources.Load<GameObject>(BearPrefabPath);
        }

        private void BuildModelCharacter(GameObject modelPrefab)
        {
            var model = Instantiate(modelPrefab, transform);
            model.name = $"{characterId}-model";
            model.transform.localPosition = Vector3.zero;
            model.transform.localRotation = Quaternion.identity;
            model.transform.localScale = Vector3.one;
            ModelAnimator = model.GetComponentInChildren<Animator>();

            LeftArm = FindDeepChild(model.transform, "LeftArm") ?? CreateAnchor("LeftArmPivot", new Vector3(-.42f, .86f, .02f));
            RightArm = FindDeepChild(model.transform, "RightArm") ?? CreateAnchor("RightArmPivot", new Vector3(.42f, .86f, .02f));
            LeftLeg = FindDeepChild(model.transform, "LeftLeg") ?? CreateAnchor("LeftLegPivot", new Vector3(-.17f, .32f, .02f));
            RightLeg = FindDeepChild(model.transform, "RightLeg") ?? CreateAnchor("RightLegPivot", new Vector3(.17f, .32f, .02f));
            Toothbrush = FindDeepChild(model.transform, "Toothbrush") ?? CreateAnchor("Toothbrush", new Vector3(.55f, .52f, -.15f));
        }

        private void BuildBear()
        {
            CreateSphere("Body", transform, new Vector3(0, .78f, .08f), new Vector3(.52f, .58f, .38f), bodyMaterial);
            CreateSphere("Belly", transform, new Vector3(0, .78f, -.19f), new Vector3(.33f, .34f, .04f), accentMaterial);
            CreateSphere("Head", transform, new Vector3(0, 1.5f, 0), new Vector3(.72f, .68f, .46f), bodyMaterial);
            CreateSphere("Muzzle", transform, new Vector3(0, 1.43f, -.33f), new Vector3(.42f, .25f, .055f), accentMaterial);
            CreateSphere("LeftEar", transform, new Vector3(-.43f, 1.95f, .02f), new Vector3(.24f, .24f, .15f), bodyMaterial);
            CreateSphere("RightEar", transform, new Vector3(.43f, 1.95f, .02f), new Vector3(.24f, .24f, .15f), bodyMaterial);
            CreateSphere("LeftInnerEar", transform, new Vector3(-.43f, 1.94f, -.1f), new Vector3(.12f, .12f, .025f), accentMaterial);
            CreateSphere("RightInnerEar", transform, new Vector3(.43f, 1.94f, -.1f), new Vector3(.12f, .12f, .025f), accentMaterial);
            CreateSphere("LeftEye", transform, new Vector3(-.21f, 1.62f, -.37f), new Vector3(.09f, .12f, .016f), eyeMaterial);
            CreateSphere("RightEye", transform, new Vector3(.21f, 1.62f, -.37f), new Vector3(.09f, .12f, .016f), eyeMaterial);
            CreateSphere("LeftEyeShine", transform, new Vector3(-.18f, 1.66f, -.39f), new Vector3(.026f, .03f, .007f), accentMaterial);
            CreateSphere("RightEyeShine", transform, new Vector3(.24f, 1.66f, -.39f), new Vector3(.026f, .03f, .007f), accentMaterial);
            CreateSphere("Nose", transform, new Vector3(0, 1.42f, -.39f), new Vector3(.085f, .06f, .014f), eyeMaterial);
            CreateSmile(1.32f, -.395f, eyeMaterial);
            CreateSphere("LeftBlush", transform, new Vector3(-.34f, 1.43f, -.37f), new Vector3(.12f, .065f, .012f), blushMaterial);
            CreateSphere("RightBlush", transform, new Vector3(.34f, 1.43f, -.37f), new Vector3(.12f, .065f, .012f), blushMaterial);

            LeftArm = CreateLimb("LeftArm", new Vector3(-.42f, .86f, .02f), new Vector3(.14f, .4f, .14f));
            RightArm = CreateLimb("RightArm", new Vector3(.42f, .86f, .02f), new Vector3(.14f, .4f, .14f));
            LeftLeg = CreateLimb("LeftLeg", new Vector3(-.17f, .32f, .02f), new Vector3(.17f, .34f, .17f));
            RightLeg = CreateLimb("RightLeg", new Vector3(.17f, .32f, .02f), new Vector3(.17f, .34f, .17f));

            Toothbrush = CreateCube("Toothbrush", RightArm, new Vector3(0, -.38f, -.14f), new Vector3(.08f, .55f, .08f), accentMaterial).transform;
            Toothbrush.localRotation = Quaternion.Euler(0, 0, 18);
            CreateSphere("Tail", transform, new Vector3(0, .76f, .3f), Vector3.one * .15f, accentMaterial);
            CreateCube("ToothbrushHead", Toothbrush, new Vector3(0, -.32f, 0), new Vector3(.16f, .16f, .12f), accentMaterial);
        }

        private void BuildBunny()
        {
            CreateSphere("Body", transform, new Vector3(0, .78f, .08f), new Vector3(.48f, .56f, .36f), accentMaterial);
            CreateSphere("Belly", transform, new Vector3(0, .78f, -.18f), new Vector3(.3f, .32f, .04f), blushMaterial);
            CreateSphere("Head", transform, new Vector3(0, 1.5f, 0), new Vector3(.68f, .66f, .44f), accentMaterial);
            CreateSphere("Muzzle", transform, new Vector3(0, 1.42f, -.32f), new Vector3(.38f, .24f, .055f), blushMaterial);
            CreateSphere("LeftEar", transform, new Vector3(-.24f, 2.16f, .02f), new Vector3(.16f, .48f, .12f), accentMaterial);
            CreateSphere("RightEar", transform, new Vector3(.24f, 2.16f, .02f), new Vector3(.16f, .48f, .12f), accentMaterial);
            CreateSphere("LeftInnerEar", transform, new Vector3(-.24f, 2.15f, -.08f), new Vector3(.08f, .32f, .02f), blushMaterial);
            CreateSphere("RightInnerEar", transform, new Vector3(.24f, 2.15f, -.08f), new Vector3(.08f, .32f, .02f), blushMaterial);
            CreateSphere("LeftEye", transform, new Vector3(-.2f, 1.62f, -.36f), new Vector3(.08f, .11f, .015f), eyeMaterial);
            CreateSphere("RightEye", transform, new Vector3(.2f, 1.62f, -.36f), new Vector3(.08f, .11f, .015f), eyeMaterial);
            CreateSphere("LeftEyeShine", transform, new Vector3(-.172f, 1.655f, -.38f), new Vector3(.024f, .028f, .007f), bodyMaterial);
            CreateSphere("RightEyeShine", transform, new Vector3(.228f, 1.655f, -.38f), new Vector3(.024f, .028f, .007f), bodyMaterial);
            CreateSphere("Nose", transform, new Vector3(0, 1.41f, -.385f), new Vector3(.07f, .052f, .014f), eyeMaterial);
            CreateSmile(1.31f, -.39f, eyeMaterial);
            CreateSphere("LeftBlush", transform, new Vector3(-.31f, 1.43f, -.36f), new Vector3(.1f, .06f, .012f), blushMaterial);
            CreateSphere("RightBlush", transform, new Vector3(.31f, 1.43f, -.36f), new Vector3(.1f, .06f, .012f), blushMaterial);

            LeftArm = CreateLimb("LeftArm", new Vector3(-.4f, .86f, .02f), new Vector3(.13f, .38f, .13f));
            RightArm = CreateLimb("RightArm", new Vector3(.4f, .86f, .02f), new Vector3(.13f, .38f, .13f));
            LeftLeg = CreateLimb("LeftLeg", new Vector3(-.16f, .32f, .02f), new Vector3(.16f, .32f, .16f));
            RightLeg = CreateLimb("RightLeg", new Vector3(.16f, .32f, .02f), new Vector3(.16f, .32f, .16f));

            Toothbrush = CreateCube("Toothbrush", RightArm, new Vector3(0, -.36f, -.14f), new Vector3(.08f, .52f, .08f), bodyMaterial).transform;
            Toothbrush.localRotation = Quaternion.Euler(0, 0, 18);
            CreateSphere("Tail", transform, new Vector3(0, .76f, .3f), Vector3.one * .15f, bodyMaterial);
            CreateCube("ToothbrushHead", Toothbrush, new Vector3(0, -.3f, 0), new Vector3(.16f, .16f, .12f), bodyMaterial);
        }

        private Transform CreateLimb(string name, Vector3 localPosition, Vector3 scale)
        {
            var pivot = new GameObject($"{name}Pivot").transform;
            pivot.SetParent(transform, false);
            pivot.localPosition = localPosition;
            CreateCapsule(name, pivot, Vector3.zero, scale, bodyMaterial);
            return pivot;
        }

        private Transform CreateAnchor(string name, Vector3 localPosition)
        {
            var anchor = new GameObject(name).transform;
            anchor.SetParent(transform, false);
            anchor.localPosition = localPosition;
            return anchor;
        }

        private void CreateSmile(float y, float z, Material material)
        {
            var left = CreateCube("MouthLeft", transform, new Vector3(-.045f, y, z), new Vector3(.085f, .018f, .012f), material);
            left.transform.localRotation = Quaternion.Euler(0, 0, -22);
            var center = CreateCube("MouthCenter", transform, new Vector3(0, y - .024f, z), new Vector3(.07f, .018f, .012f), material);
            var right = CreateCube("MouthRight", transform, new Vector3(.045f, y, z), new Vector3(.085f, .018f, .012f), material);
            right.transform.localRotation = Quaternion.Euler(0, 0, 22);
        }

        private GameObject CreateSphere(string name, Transform parent, Vector3 localPosition, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPosition;
            go.transform.localScale = scale;
            if (material != null) go.GetComponent<Renderer>().material = material;
            return go;
        }

        private GameObject CreateCapsule(string name, Transform parent, Vector3 localPosition, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPosition;
            go.transform.localScale = scale;
            if (material != null) go.GetComponent<Renderer>().material = material;
            return go;
        }

        private GameObject CreateCube(string name, Transform parent, Vector3 localPosition, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPosition;
            go.transform.localScale = scale;
            if (material != null) go.GetComponent<Renderer>().material = material;
            return go;
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
