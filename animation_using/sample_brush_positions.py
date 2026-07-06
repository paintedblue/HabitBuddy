import bpy
from mathutils import Vector

scene = bpy.context.scene
names = [
    "Toothbrush",
    "Toothbrush_bristles",
    "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET",
    "Toothpaste_proxy_nozzle",
    "Toothpaste_blob_on_bristles",
    "RightHand_IK_Brush_Sequence",
    "LeftHand_IK_Brush_Sequence",
]

for frame in [1, 24, 48, 56, 64, 72, 80, 108]:
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    print("FRAME", frame)
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj:
            print(name, tuple(round(v, 4) for v in obj.matrix_world.translation))
    brush = bpy.data.objects.get("Toothbrush")
    nozzle = bpy.data.objects.get("Toothpaste_proxy_nozzle")
    if brush and nozzle:
        blob_world = brush.matrix_world @ Vector((-0.135, 0, 0.035))
        dist = (nozzle.matrix_world.translation - blob_world).length
        print("NOZZLE_TO_BLOB_SITE_DIST", round(dist, 4))
