import bpy


BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

arm = bpy.data.objects["Armature"]
left_target = bpy.data.objects["ReachProps_LeftHand_Toothbrush"]
right_target = bpy.data.objects["ReachProps_RightHand_Toothpaste"]

for pb in arm.pose.bones:
    for con in list(pb.constraints):
        if con.name.startswith("ReachProps_"):
            pb.constraints.remove(con)

settings = [
    ("LeftHand", left_target, 0.72),
    ("RightHand", right_target, 0.72),
    ("LeftForeArm", left_target, 0.16),
    ("RightForeArm", right_target, 0.16),
]

for bone_name, target, influence in settings:
    pb = arm.pose.bones[bone_name]
    con = pb.constraints.new(type="COPY_LOCATION")
    con.name = "ReachProps_Soft_CopyLocation"
    con.target = target
    con.target_space = "WORLD"
    con.owner_space = "WORLD"
    con.use_offset = False if bone_name.endswith("Hand") else True
    con.influence = influence

for action in bpy.data.actions:
    if hasattr(action, "layers"):
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for kp in fc.keyframe_points:
                            kp.interpolation = "BEZIER"
                        fc.update()
    if hasattr(action, "fcurves"):
        for fc in action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
            fc.update()

bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
