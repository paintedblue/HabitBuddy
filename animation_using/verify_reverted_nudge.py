import bpy

helper_prefixes = (
    "RightGrip_",
    "LeftGrip_",
    "Forward_",
    "RightHandGrip_CTRL",
    "LeftHandGrip_CTRL",
    "RightHand_IK_ForwardGrip",
    "LeftHand_IK_ForwardGrip",
)
helpers = [o.name for o in bpy.data.objects if o.name.startswith(helper_prefixes)]
print("HELPERS", helpers)

scene = bpy.context.scene
print("FRAME_RANGE", scene.frame_start, scene.frame_end, scene.render.fps)

arm = bpy.data.objects.get("Armature")
print("ARM_ACTION", arm.animation_data.action.name if arm and arm.animation_data and arm.animation_data.action else None)

for name in ["Toothbrush", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]:
    obj = bpy.data.objects.get(name)
    print(
        "PROP",
        name,
        "parent", obj.parent.name if obj and obj.parent else None,
        "action", obj.animation_data.action.name if obj and obj.animation_data and obj.animation_data.action else None,
    )

for frame in [1, 24, 48, 56, 64, 80, 108, 120]:
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    print("FRAME", frame)
    for name in ["Toothbrush", "Toothbrush_bristles", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET", "Toothpaste_proxy_nozzle"]:
        obj = bpy.data.objects.get(name)
        if obj:
            print(name, tuple(round(v, 4) for v in obj.matrix_world.translation))
