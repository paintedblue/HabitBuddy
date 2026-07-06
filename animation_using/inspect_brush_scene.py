import bpy

print("SCENE", bpy.context.scene.name)
print("FRAME_RANGE", bpy.context.scene.frame_start, bpy.context.scene.frame_end, bpy.context.scene.render.fps)

print("OBJECTS")
for obj in bpy.data.objects:
    print(f"{obj.name}|{obj.type}|parent={obj.parent.name if obj.parent else ''}|data={obj.data.name if getattr(obj, 'data', None) else ''}")

print("ARMATURES")
for arm in [o for o in bpy.data.objects if o.type == "ARMATURE"]:
    print("ARMATURE", arm.name)
    for bone in arm.pose.bones:
        print("BONE", bone.name)

print("TRANSFORMS")
for name in ["Armature", "Toothbrush", "Toothbrush_bristles", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET", "Toothpaste_proxy_nozzle", "Icosphere"]:
    obj = bpy.data.objects.get(name)
    if obj:
        print(
            name,
            "loc", tuple(round(v, 4) for v in obj.location),
            "rot", tuple(round(v, 4) for v in obj.rotation_euler),
            "scale", tuple(round(v, 4) for v in obj.scale),
            "dims", tuple(round(v, 4) for v in obj.dimensions),
        )

print("POSE")
arm = bpy.data.objects.get("Armature")
if arm:
    for name in ["Spine", "Spine01", "Spine02", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand"]:
        pb = arm.pose.bones.get(name)
        if pb:
            print(name, "head", tuple(round(v, 4) for v in pb.head), "tail", tuple(round(v, 4) for v in pb.tail), "rot", tuple(round(v, 4) for v in pb.rotation_euler))

print("ACTIONS")
for action in bpy.data.actions:
    print("ACTION", action.name, "range", tuple(action.frame_range))

print("CHECKS")
for name in ["Toothbrush", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET", "RightHand_IK_Brush_Sequence", "LeftHand_IK_Brush_Sequence", "Toothpaste_blob_on_bristles", "Toothpaste_nozzle_ribbon"]:
    obj = bpy.data.objects.get(name)
    if obj:
        keys = []
        if obj.animation_data and obj.animation_data.action:
            keys.append(obj.animation_data.action.name)
        print(
            name,
            "parent", obj.parent.name if obj.parent else "",
            "ptype", obj.parent_type,
            "pbone", obj.parent_bone,
            "keys", keys,
        )

tube = bpy.data.objects.get("Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET")
if tube and tube.data.shape_keys:
    print("TUBE_SHAPE_KEYS", [k.name for k in tube.data.shape_keys.key_blocks])
    if tube.data.shape_keys.animation_data and tube.data.shape_keys.animation_data.action:
        print("TUBE_SHAPE_ACTION", tube.data.shape_keys.animation_data.action.name, tuple(tube.data.shape_keys.animation_data.action.frame_range))

arm = bpy.data.objects.get("Armature")
if arm:
    for bone in ["RightHand", "LeftHand"]:
        pb = arm.pose.bones.get(bone)
        if pb:
            print("CONSTRAINTS", bone, [(c.name, c.type, c.target.name if c.target else "", getattr(c, "chain_count", "")) for c in pb.constraints])
