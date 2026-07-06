import bpy

arm = bpy.data.objects.get("Armature")
print("FILE_OBJECTS", len(bpy.data.objects), "ACTIONS", len(bpy.data.actions))
print("FRAME_RANGE", bpy.context.scene.frame_start, bpy.context.scene.frame_end, bpy.context.scene.render.fps)

if arm:
    print("ARM_ACTION", arm.animation_data.action.name if arm.animation_data and arm.animation_data.action else None)
    print("BONES", [b.name for b in arm.pose.bones])
    for frame in [1, 24, 48, 56, 64, 72, 80, 100, 108, 120]:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        print("FRAME", frame)
        for bone in ["LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand"]:
            pb = arm.pose.bones.get(bone)
            if pb:
                head = arm.matrix_world @ pb.head
                tail = arm.matrix_world @ pb.tail
                print(bone, "head", tuple(round(v, 4) for v in head), "tail", tuple(round(v, 4) for v in tail), "rot", tuple(round(v, 4) for v in pb.rotation_euler))

for name in ["Toothbrush", "Toothbrush_bristles", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET", "Toothpaste_proxy_nozzle"]:
    obj = bpy.data.objects.get(name)
    if obj:
        print(
            "OBJ",
            name,
            "parent", obj.parent.name if obj.parent else None,
            "ptype", obj.parent_type,
            "pbone", obj.parent_bone,
            "action", obj.animation_data.action.name if obj.animation_data and obj.animation_data.action else None,
            "loc", tuple(round(v, 4) for v in obj.location),
            "scale", tuple(round(v, 4) for v in obj.scale),
        )
