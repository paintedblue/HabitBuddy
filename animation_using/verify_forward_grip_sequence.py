import bpy
from mathutils import Vector

arm = bpy.data.objects.get("Armature")
print("FRAME_RANGE", bpy.context.scene.frame_start, bpy.context.scene.frame_end, bpy.context.scene.render.fps)
print("ARM_ACTION", arm.animation_data.action.name if arm and arm.animation_data and arm.animation_data.action else None)

for name in [
    "RightHand_IK_ForwardGrip",
    "LeftHand_IK_ForwardGrip",
    "RightHandGrip_CTRL",
    "LeftHandGrip_CTRL",
    "Toothbrush",
    "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET",
    "Forward_Toothpaste_Blob",
    "Forward_Toothpaste_Ribbon",
]:
    obj = bpy.data.objects.get(name)
    if obj:
        print(
            "OBJ",
            name,
            "parent", obj.parent.name if obj.parent else None,
            "ptype", obj.parent_type,
            "pbone", obj.parent_bone,
            "action", obj.animation_data.action.name if obj.animation_data and obj.animation_data.action else None,
        )
    else:
        print("MISSING", name)

for bone in ["RightHand", "LeftHand"]:
    pb = arm.pose.bones.get(bone)
    print("CONSTRAINTS", bone, [(c.name, c.type, c.target.name if c.target else None, getattr(c, "chain_count", None), c.influence) for c in pb.constraints])

for frame in [1, 24, 48, 56, 64, 72, 80, 92, 108]:
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    print("FRAME", frame)
    data = {}
    for name in ["RightHandGrip_CTRL", "LeftHandGrip_CTRL", "Toothbrush", "Toothbrush_bristles", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET", "Toothpaste_proxy_nozzle", "Forward_Toothpaste_Blob"]:
        obj = bpy.data.objects.get(name)
        if obj:
            data[name] = obj.matrix_world.translation.copy()
            print(name, tuple(round(v, 4) for v in data[name]))
    if "RightHandGrip_CTRL" in data and "Toothbrush" in data:
        print("RIGHT_GRIP_TO_BRUSH", round((data["RightHandGrip_CTRL"] - data["Toothbrush"]).length, 4))
    if "LeftHandGrip_CTRL" in data and "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET" in data:
        print("LEFT_GRIP_TO_TUBE", round((data["LeftHandGrip_CTRL"] - data["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]).length, 4))
    if "Toothpaste_proxy_nozzle" in data and "Forward_Toothpaste_Blob" in data:
        print("NOZZLE_TO_BLOB", round((data["Toothpaste_proxy_nozzle"] - data["Forward_Toothpaste_Blob"]).length, 4))
