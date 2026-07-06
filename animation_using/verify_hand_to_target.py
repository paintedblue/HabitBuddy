import bpy

arm = bpy.data.objects["Armature"]
checks = [
    ("RightHand", "RightHand_IK_ForwardGrip"),
    ("LeftHand", "LeftHand_IK_ForwardGrip"),
]

for frame in [1, 24, 48, 56, 72, 80, 108]:
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    print("FRAME", frame)
    for bone, target_name in checks:
        pb = arm.pose.bones[bone]
        target = bpy.data.objects[target_name]
        head = arm.matrix_world @ pb.head
        tail = arm.matrix_world @ pb.tail
        target_loc = target.matrix_world.translation
        print(
            bone,
            "head", tuple(round(v, 4) for v in head),
            "tail", tuple(round(v, 4) for v in tail),
            "target", tuple(round(v, 4) for v in target_loc),
            "head_to_target", round((head - target_loc).length, 4),
        )
