import math
import bpy


arm = bpy.data.objects["Armature"]
scene = bpy.context.scene
arm.animation_data_create()
arm.animation_data.action = bpy.data.actions.get("PREP_brush_teeth_1_squeeze_toothpaste")


def set_rot(name, deg):
    pb = arm.pose.bones[name]
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = tuple(math.radians(v) for v in deg)


def sample(label, values):
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (0, 0, 0)
    for name, deg in values.items():
        set_rot(name, deg)
    scene.frame_set(48)
    bpy.context.view_layer.update()
    lh = arm.matrix_world @ arm.pose.bones["LeftHand"].head
    rh = arm.matrix_world @ arm.pose.bones["RightHand"].head
    print(label, "LH", tuple(round(v, 4) for v in lh), "RH", tuple(round(v, 4) for v in rh))


candidates = {
    "mild": {
        "LeftArm": (0, 0, 28),
        "LeftForeArm": (0, 0, 8),
        "RightArm": (0, 0, -28),
        "RightForeArm": (0, 0, -8),
    },
    "medium": {
        "LeftArm": (0, 0, 38),
        "LeftForeArm": (0, 0, 12),
        "RightArm": (0, 0, -38),
        "RightForeArm": (0, 0, -12),
    },
    "medium_forward": {
        "LeftArm": (-8, 0, 34),
        "LeftForeArm": (0, 0, 12),
        "RightArm": (-8, 0, -34),
        "RightForeArm": (0, 0, -12),
    },
    "strong": {
        "LeftArm": (0, 0, 48),
        "LeftForeArm": (0, 0, 16),
        "RightArm": (0, 0, -48),
        "RightForeArm": (0, 0, -16),
    },
    "raised_medium": {
        "LeftArm": (0, -18, 40),
        "LeftForeArm": (0, -8, 10),
        "RightArm": (0, 18, -40),
        "RightForeArm": (0, 8, -10),
    },
    "raised_strong": {
        "LeftArm": (0, -24, 48),
        "LeftForeArm": (0, -10, 12),
        "RightArm": (0, 24, -48),
        "RightForeArm": (0, 10, -12),
    },
}

sample("base", {})
for label, values in candidates.items():
    sample(label, values)
