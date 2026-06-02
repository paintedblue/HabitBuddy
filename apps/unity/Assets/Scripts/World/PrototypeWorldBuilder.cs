using UnityEngine;

namespace HabitBuddy.World
{
    public sealed class PrototypeWorldBuilder : MonoBehaviour
    {
        private const string RoomPrefabPath = "Art/Rooms/KidsRoom";
        private const string BathroomPrefabPath = "Art/Rooms/Bathroom";
        private const string FurniturePath = "Art/KenneyFurniture/";

        [SerializeField] private GameObject roomPrefab;
        [SerializeField] private GameObject bathroomPrefab;
        [SerializeField] private Material wallMaterial;
        [SerializeField] private Material floorMaterial;
        [SerializeField] private Material accentMaterial;
        [SerializeField] private Material rugMaterial;
        public Transform SinkFocus { get; private set; }
        public Transform BathroomFocus { get; private set; }
        public Transform RoomFocus { get; private set; }
        public GameObject ToothbrushProp { get; private set; }
        public GameObject SoapProp { get; private set; }

        public void Build()
        {
            for (var i = transform.childCount - 1; i >= 0; i--)
            {
                Destroy(transform.GetChild(i).gameObject);
            }
            var loadedRoom = LoadPrefab(roomPrefab, RoomPrefabPath);
            var loadedBathroom = LoadPrefab(bathroomPrefab, BathroomPrefabPath);
            if (loadedRoom != null || loadedBathroom != null)
            {
                BuildPrefabScene(loadedRoom, loadedBathroom);
                return;
            }
            if (HasFurnitureAsset("bedSingle"))
            {
                BuildAssetKitRoom();
                BuildAssetKitBathroom();
                return;
            }
            BuildFallbackRoom();
            BuildFallbackBathroom();
        }

        private void BuildPrefabScene(GameObject loadedRoom, GameObject loadedBathroom)
        {
            if (loadedRoom != null)
            {
                var room = Instantiate(loadedRoom, transform);
                room.name = "KidsRoomModel";
                room.transform.localPosition = new Vector3(-2.7f, 0, 0);
                RoomFocus = FindDeepChild(room.transform, "RoomFocus") ?? room.transform;
                ToothbrushProp = FindDeepChild(room.transform, "ToothbrushProp")?.gameObject;
            }
            else
            {
                BuildFallbackRoom();
            }

            if (loadedBathroom != null)
            {
                var bathroom = Instantiate(loadedBathroom, transform);
                bathroom.name = "BathroomModel";
                bathroom.transform.localPosition = new Vector3(2.7f, 0, 0);
                BathroomFocus = FindDeepChild(bathroom.transform, "BathroomFocus") ?? bathroom.transform;
                SinkFocus = FindDeepChild(bathroom.transform, "SinkFocus") ?? bathroom.transform;
                SoapProp = FindDeepChild(bathroom.transform, "SoapProp")?.gameObject;
            }
            else
            {
                BuildFallbackBathroom();
            }
        }

        private void BuildFallbackRoom()
        {
            CreateCube("RoomFloor", new Vector3(-2.7f, -.08f, .05f), new Vector3(5.4f, .15f, 5.1f), floorMaterial);
            CreateCube("RoomBackWall", new Vector3(-2.7f, 1.75f, 2.5f), new Vector3(5.4f, 3.5f, .16f), wallMaterial);
            CreateCube("RoomSideWall", new Vector3(-5.4f, 1.75f, .35f), new Vector3(.16f, 3.5f, 4.4f), wallMaterial);
            CreateCube("Baseboard", new Vector3(-2.7f, .12f, 2.39f), new Vector3(5.4f, .18f, .08f), accentMaterial);
            CreateCube("BedFrame", new Vector3(-3.62f, .28f, .98f), new Vector3(1.42f, .42f, 1.12f), accentMaterial);
            CreateCube("BedMattress", new Vector3(-3.62f, .55f, .9f), new Vector3(1.28f, .22f, .96f), rugMaterial);
            CreateCube("BedPillow", new Vector3(-4.05f, .72f, 1.2f), new Vector3(.56f, .18f, .38f), wallMaterial);
            CreateCube("Blanket", new Vector3(-3.45f, .75f, .72f), new Vector3(.72f, .14f, .52f), floorMaterial);
            CreateCube("WindowFrame", new Vector3(-3.6f, 2.08f, 2.39f), new Vector3(1.18f, .92f, .06f), accentMaterial);
            CreateCube("WindowGlass", new Vector3(-3.6f, 2.08f, 2.34f), new Vector3(.94f, .68f, .04f), rugMaterial);
            CreateCube("WindowCrossV", new Vector3(-3.6f, 2.08f, 2.29f), new Vector3(.06f, .72f, .04f), accentMaterial);
            CreateCube("WindowCrossH", new Vector3(-3.6f, 2.08f, 2.28f), new Vector3(.98f, .05f, .04f), accentMaterial);
            CreateCube("CurtainLeft", new Vector3(-4.24f, 2.02f, 2.32f), new Vector3(.18f, .92f, .08f), floorMaterial);
            CreateCube("CurtainRight", new Vector3(-2.96f, 2.02f, 2.32f), new Vector3(.18f, .92f, .08f), floorMaterial);
            CreateCube("ToyShelf", new Vector3(-1.45f, .74f, 1.55f), new Vector3(1.02f, 1.1f, .32f), accentMaterial);
            CreateCube("ShelfTop", new Vector3(-1.45f, 1.28f, 1.31f), new Vector3(1.12f, .08f, .42f), floorMaterial);
            CreateCube("ShelfMiddle", new Vector3(-1.45f, .82f, 1.31f), new Vector3(1.12f, .08f, .42f), floorMaterial);
            CreateSphere("BallToy", new Vector3(-1.78f, .48f, 1.05f), new Vector3(.18f, .18f, .18f), rugMaterial);
            CreateCube("BlockToyA", new Vector3(-1.42f, .48f, 1.04f), new Vector3(.2f, .2f, .2f), floorMaterial);
            CreateCube("BlockToyB", new Vector3(-1.16f, .49f, 1.04f), new Vector3(.22f, .22f, .22f), rugMaterial);
            CreateCube("RoomRug", new Vector3(-2.55f, .01f, -.62f), new Vector3(2f, .04f, 1.2f), rugMaterial);
            CreateCube("PictureFrame", new Vector3(-1.9f, 2.08f, 2.39f), new Vector3(.74f, .62f, .05f), accentMaterial);
            CreateCube("PictureSky", new Vector3(-1.9f, 2.08f, 2.34f), new Vector3(.58f, .42f, .04f), rugMaterial);
            CreateCylinder("LampStand", new Vector3(-.62f, .56f, 1.1f), new Vector3(.06f, .56f, .06f), accentMaterial);
            CreateCylinder("LampShade", new Vector3(-.62f, 1.12f, 1.1f), new Vector3(.36f, .18f, .36f), floorMaterial);
            RoomFocus = transform;
        }

        private void BuildAssetKitRoom()
        {
            CreateCube("RoomBackWall", new Vector3(-2.7f, 1.75f, 2.65f), new Vector3(5.8f, 3.5f, .12f), wallMaterial);
            CreateCube("RoomSideWall", new Vector3(-5.55f, 1.75f, .25f), new Vector3(.12f, 3.5f, 4.8f), wallMaterial);
            CreateCube("RoomFloor", new Vector3(-2.7f, -.08f, .1f), new Vector3(5.8f, .12f, 5.1f), floorMaterial);

            SpawnFurniture("floorFull", "WoodFloorTileA", new Vector3(-3.9f, 0, .9f), Vector3.one * 1.35f, new Vector3(0, 45, 0));
            SpawnFurniture("floorFull", "WoodFloorTileB", new Vector3(-2.5f, 0, .9f), Vector3.one * 1.35f, new Vector3(0, 45, 0));
            SpawnFurniture("floorFull", "WoodFloorTileC", new Vector3(-1.1f, 0, .9f), Vector3.one * 1.35f, new Vector3(0, 45, 0));
            SpawnFurniture("wallWindow", "WindowModel", new Vector3(-3.75f, 1.55f, 2.48f), Vector3.one * 1.25f, Vector3.zero);
            SpawnFurniture("bedSingle", "BedModel", new Vector3(-4.05f, .05f, 1.15f), Vector3.one * 1.15f, new Vector3(0, 90, 0));
            SpawnFurniture("bookcaseOpen", "BookcaseModel", new Vector3(-1.35f, .05f, 1.7f), Vector3.one * 1.08f, Vector3.zero);
            SpawnFurniture("books", "BooksModel", new Vector3(-1.5f, .96f, 1.34f), Vector3.one * .8f, Vector3.zero);
            SpawnFurniture("sideTable", "SideTableModel", new Vector3(-3.02f, .05f, 1.55f), Vector3.one * .8f, Vector3.zero);
            SpawnFurniture("lampSquareFloor", "FloorLampModel", new Vector3(-.68f, .04f, 1.25f), Vector3.one * .92f, Vector3.zero);
            SpawnFurniture("pottedPlant", "PlantModel", new Vector3(-.82f, .05f, 2.08f), Vector3.one * .75f, Vector3.zero);
            SpawnFurniture("rugRectangle", "RoomRugModel", new Vector3(-2.55f, .03f, -.66f), new Vector3(1.45f, 1f, 1.1f), new Vector3(0, 90, 0));

            var roomFocus = new GameObject("RoomFocus").transform;
            roomFocus.SetParent(transform, false);
            roomFocus.localPosition = new Vector3(-2.5f, .6f, .4f);
            RoomFocus = roomFocus;
        }

        private void BuildFallbackBathroom()
        {
            CreateCube("BathroomFloor", new Vector3(2.7f, -.08f, .05f), new Vector3(5.4f, .15f, 5.1f), floorMaterial);
            CreateCube("BathroomBackWall", new Vector3(2.7f, 1.75f, 2.5f), new Vector3(5.4f, 3.5f, .16f), wallMaterial);
            CreateCube("BathroomSideWall", new Vector3(5.4f, 1.75f, .35f), new Vector3(.16f, 3.5f, 4.4f), wallMaterial);
            var sink = CreateCube("SinkCabinet", new Vector3(2.75f, .42f, 1.32f), new Vector3(1.35f, .78f, .5f), accentMaterial);
            CreateCube("SinkBasin", new Vector3(2.75f, .88f, 1.16f), new Vector3(1f, .18f, .42f), rugMaterial);
            CreateCube("Mirror", new Vector3(2.75f, 1.88f, 2.39f), new Vector3(1.08f, .94f, .05f), accentMaterial);
            CreateCube("DoorFrame", new Vector3(0, 1.38f, 2.42f), new Vector3(.18f, 2.76f, .18f), accentMaterial);
            CreateCube("BathMat", new Vector3(1.45f, .01f, .18f), new Vector3(1.25f, .04f, .78f), accentMaterial);
            CreateCube("Towel", new Vector3(3.95f, 1.52f, 2.39f), new Vector3(.45f, .74f, .05f), rugMaterial);
            ToothbrushProp = CreateCube("ToothbrushCup", new Vector3(2.25f, 1f, 1.08f), new Vector3(.16f, .3f, .16f), accentMaterial);
            SoapProp = CreateCube("SoapPump", new Vector3(3.18f, .98f, 1.08f), new Vector3(.18f, .26f, .18f), rugMaterial);
            SinkFocus = sink.transform;
            BathroomFocus = GameObject.Find("Mirror").transform;
        }

        private void BuildAssetKitBathroom()
        {
            CreateCube("BathroomBackWall", new Vector3(2.7f, 1.75f, 2.65f), new Vector3(5.8f, 3.5f, .12f), wallMaterial);
            CreateCube("BathroomSideWall", new Vector3(5.55f, 1.75f, .25f), new Vector3(.12f, 3.5f, 4.8f), wallMaterial);
            CreateCube("BathroomFloor", new Vector3(2.7f, -.08f, .1f), new Vector3(5.8f, .12f, 5.1f), floorMaterial);

            SpawnFurniture("floorFull", "BathroomFloorTileA", new Vector3(1.3f, 0, .9f), Vector3.one * 1.35f, new Vector3(0, 45, 0));
            SpawnFurniture("floorFull", "BathroomFloorTileB", new Vector3(2.7f, 0, .9f), Vector3.one * 1.35f, new Vector3(0, 45, 0));
            SpawnFurniture("floorFull", "BathroomFloorTileC", new Vector3(4.1f, 0, .9f), Vector3.one * 1.35f, new Vector3(0, 45, 0));
            var sink = SpawnFurniture("bathroomSinkSquare", "SinkModel", new Vector3(2.42f, .04f, 1.55f), Vector3.one * 1.05f, Vector3.zero);
            SpawnFurniture("bathroomMirror", "MirrorModel", new Vector3(2.42f, 1.45f, 2.48f), Vector3.one * 1.1f, Vector3.zero);
            SpawnFurniture("bathroomCabinetDrawer", "BathroomCabinetModel", new Vector3(3.46f, .04f, 1.55f), Vector3.one * .9f, Vector3.zero);
            SpawnFurniture("toilet", "ToiletModel", new Vector3(4.2f, .03f, 1.55f), Vector3.one * .9f, Vector3.zero);
            SpawnFurniture("bathtub", "BathtubModel", new Vector3(1.15f, .03f, 1.55f), Vector3.one * .95f, Vector3.zero);
            SpawnFurniture("rugRectangle", "BathMat", new Vector3(2.3f, .04f, -.45f), new Vector3(.82f, 1f, .52f), new Vector3(0, 90, 0));

            var sinkFocus = new GameObject("SinkFocus").transform;
            sinkFocus.SetParent(transform, false);
            sinkFocus.localPosition = sink != null ? sink.transform.localPosition + new Vector3(0, .65f, -.15f) : new Vector3(2.42f, .65f, 1.4f);
            SinkFocus = sinkFocus;

            var bathroomFocus = new GameObject("BathroomFocus").transform;
            bathroomFocus.SetParent(transform, false);
            bathroomFocus.localPosition = new Vector3(2.7f, .75f, .65f);
            BathroomFocus = bathroomFocus;

            ToothbrushProp = CreateCube("ToothbrushProp", new Vector3(2.1f, .83f, 1.1f), new Vector3(.06f, .36f, .06f), rugMaterial);
            SoapProp = CreateCube("SoapProp", new Vector3(2.76f, .78f, 1.1f), new Vector3(.18f, .22f, .18f), rugMaterial);
        }

        private GameObject CreateCube(string name, Vector3 position, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(transform, false);
            go.transform.localPosition = position;
            go.transform.localScale = scale;
            if (material != null) go.GetComponent<Renderer>().material = material;
            return go;
        }

        private GameObject CreateSphere(string name, Vector3 position, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = name;
            go.transform.SetParent(transform, false);
            go.transform.localPosition = position;
            go.transform.localScale = scale;
            if (material != null) go.GetComponent<Renderer>().material = material;
            return go;
        }

        private GameObject CreateCylinder(string name, Vector3 position, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.name = name;
            go.transform.SetParent(transform, false);
            go.transform.localPosition = position;
            go.transform.localScale = scale;
            if (material != null) go.GetComponent<Renderer>().material = material;
            return go;
        }

        private static GameObject LoadPrefab(GameObject assigned, string resourcePath)
        {
            return assigned != null ? assigned : Resources.Load<GameObject>(resourcePath);
        }

        private static bool HasFurnitureAsset(string assetName)
        {
            return Resources.Load<GameObject>(FurniturePath + assetName) != null;
        }

        private GameObject SpawnFurniture(string assetName, string instanceName, Vector3 position, Vector3 scale, Vector3 eulerAngles)
        {
            var prefab = Resources.Load<GameObject>(FurniturePath + assetName);
            if (prefab == null) return null;
            var instance = Instantiate(prefab, transform);
            instance.name = instanceName;
            instance.transform.localPosition = position;
            instance.transform.localRotation = Quaternion.Euler(eulerAngles);
            instance.transform.localScale = scale;
            return instance;
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
