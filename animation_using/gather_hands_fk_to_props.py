import math
import bpy


BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

ARM_ACTION = "PREP_brush_teeth_1_squeeze_toothpaste"


def clear_added_constraints_and_helpers(arm):
    prefixes = (
        "RightHand_IK_ForwardGrip",
        "LeftHand_IK_ForwardGrip",
        "RightHandGrip_CTRL",
        "LeftHandGrip_CTRL",
        "Forward_",
        "RightGrip_",
        "LeftGrip_",
        "ReachProps_",
    )
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)
    for pb in arm.pose.bones:
        for con in list(pb.constraints):
            if con.name.startswith(("ForwardGrip_", "BrushSequence_", "ReachProps_")):
                pb.constraints.remove(con)


def set_pose_key(arm, frame, pose):
    bpy.context.scene.frame_set(frame)
    for bone_name, deg in pose.items():
        pb = arm.pose.bones.get(bone_name)
        if not pb:
            continue
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = tuple(math.radians(v) for v in deg)
        pb.keyframe_insert(data_path="rotation_euler", frame=frame)


def set_bezier(action):
    if not action:
        return
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


scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 24

arm = bpy.data.objects["Armature"]
arm.animation_data_create()
arm_action = bpy.data.actions.get(ARM_ACTION)
if arm_action:
    arm.animation_data.action = arm_action

clear_added_constraints_and_helpers(arm)

# Keep the current body-side prop actions; only gather the arms with FK rotation.
# Z rotations pull the hands inward toward the props. Small forearm rotations keep
# the wrists from looking disconnected, but avoid IK stretching.
neutral = {
    "LeftArm": (0, 0, 0),
    "LeftForeArm": (0, 0, 0),
    "RightArm": (0, 0, 0),
    "RightForeArm": (0, 0, 0),
}
gather = {
    "LeftArm": (0, 0, 42),
    "LeftForeArm": (0, 0, 12),
    "RightArm": (0, 0, -42),
    "RightForeArm": (0, 0, -12),
}
release = {
    "LeftArm": (0, 0, 24),
    "LeftForeArm": (0, 0, 8),
    "RightArm": (0, 0, -24),
    "RightForeArm": (0, 0, -8),
}

for frame, pose in [
    (1, neutral),
    (12, release),
    (24, gather),
    (36, gather),
    (48, gather),
    (56, gather),
    (64, gather),
    (72, gather),
    (80, gather),
    (92, gather),
    (108, release),
    (120, neutral),
]:
    set_pose_key(arm, frame, pose)

for action in bpy.data.actions:
    set_bezier(action)

bpy.context.scene.frame_set(48)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
