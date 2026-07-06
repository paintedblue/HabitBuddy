import math
import bpy


BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

ARM_ACTION = "PREP_brush_teeth_1_squeeze_toothpaste"


def clear_helpers_and_constraints(arm):
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


def set_bone_rot(arm, frame, bone_name, deg):
    pb = arm.pose.bones.get(bone_name)
    if not pb:
        return
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = tuple(math.radians(v) for v in deg)
    pb.keyframe_insert(data_path="rotation_euler", frame=frame)


def pose_for_frame(frame):
    # FK-only follow: arms open at the start/end, then gather as the props move
    # to the squeeze area. No IK/copy-location is used, so limb lengths stay natural.
    table = {
        1: 0.00,
        12: 0.35,
        24: 0.62,
        36: 0.82,
        48: 1.00,
        56: 1.05,
        64: 1.00,
        72: 1.05,
        80: 1.00,
        92: 0.78,
        108: 0.45,
        120: 0.18,
    }
    amount = table[frame]
    # Z gathers hands toward the props; X bends the elbows slightly forward/down
    # so the palms visually travel with the moving toothbrush/tube rather than
    # staying as static open hands.
    return {
        "LeftArm": (-4 * amount, 0, 38 * amount),
        "LeftForeArm": (3 * amount, 0, 14 * amount),
        "LeftHand": (0, 0, 8 * amount),
        "RightArm": (-4 * amount, 0, -38 * amount),
        "RightForeArm": (3 * amount, 0, -14 * amount),
        "RightHand": (0, 0, -8 * amount),
    }


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
action = bpy.data.actions.get(ARM_ACTION)
if action:
    arm.animation_data.action = action

clear_helpers_and_constraints(arm)

frames = [1, 12, 24, 36, 48, 56, 64, 72, 80, 92, 108, 120]
for frame in frames:
    scene.frame_set(frame)
    for bone_name, deg in pose_for_frame(frame).items():
        set_bone_rot(arm, frame, bone_name, deg)

for action in bpy.data.actions:
    set_bezier(action)

scene.frame_set(48)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
