import math
import bpy

BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

right_target = bpy.data.objects["RightHand_IK_ForwardGrip"]
left_target = bpy.data.objects["LeftHand_IK_ForwardGrip"]

for target in [right_target, left_target]:
    if target.animation_data:
        target.animation_data_clear()

right_keys = {
    1: (-0.29, 0.02, 0.40),
    12: (-0.25, 0.00, 0.42),
    24: (-0.20, -0.08, 0.48),
    36: (-0.17, -0.12, 0.50),
    48: (-0.15, -0.14, 0.50),
    56: (-0.15, -0.14, 0.50),
    64: (-0.15, -0.14, 0.50),
    72: (-0.15, -0.14, 0.50),
    80: (-0.15, -0.14, 0.50),
    92: (-0.20, -0.08, 0.45),
    108: (-0.25, 0.02, 0.40),
}
left_keys = {
    1: (0.29, 0.02, 0.40),
    12: (0.24, 0.00, 0.44),
    24: (0.18, -0.08, 0.53),
    36: (0.135, -0.135, 0.585),
    48: (0.112, -0.155, 0.600),
    56: (0.105, -0.172, 0.595),
    64: (0.115, -0.155, 0.600),
    72: (0.102, -0.172, 0.595),
    80: (0.120, -0.155, 0.600),
    92: (0.18, -0.08, 0.48),
    108: (0.25, 0.02, 0.40),
}

for frame, loc in right_keys.items():
    bpy.context.scene.frame_set(frame)
    right_target.location = loc
    right_target.rotation_euler = (math.radians(3), math.radians(-8), math.radians(-4))
    right_target.keyframe_insert(data_path="location", frame=frame)
    right_target.keyframe_insert(data_path="rotation_euler", frame=frame)

for frame, loc in left_keys.items():
    bpy.context.scene.frame_set(frame)
    left_target.location = loc
    left_target.rotation_euler = (math.radians(-3), math.radians(8), math.radians(4))
    left_target.keyframe_insert(data_path="location", frame=frame)
    left_target.keyframe_insert(data_path="rotation_euler", frame=frame)

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
