import math
import bpy


arm = bpy.data.objects["Armature"]
scene = bpy.context.scene
action = bpy.data.actions.get("PREP_brush_teeth_1_squeeze_toothpaste")
arm.animation_data_create()
if action:
    arm.animation_data.action = action


def sample(label):
    scene.frame_set(1)
    bpy.context.view_layer.update()
    lh = arm.matrix_world @ arm.pose.bones["LeftHand"].head
    rh = arm.matrix_world @ arm.pose.bones["RightHand"].head
    print(label, "LH", tuple(round(v, 4) for v in lh), "RH", tuple(round(v, 4) for v in rh))


tests = [
    ("LeftArm_x_-20", "LeftArm", (-20, 0, 0)),
    ("LeftArm_y_-20", "LeftArm", (0, -20, 0)),
    ("LeftArm_y_20", "LeftArm", (0, 20, 0)),
    ("LeftArm_z_-20", "LeftArm", (0, 0, -20)),
    ("LeftArm_z_20", "LeftArm", (0, 0, 20)),
    ("LeftForeArm_x_20", "LeftForeArm", (20, 0, 0)),
    ("LeftForeArm_y_20", "LeftForeArm", (0, 20, 0)),
    ("LeftForeArm_z_20", "LeftForeArm", (0, 0, 20)),
    ("RightArm_x_-20", "RightArm", (-20, 0, 0)),
    ("RightArm_y_-20", "RightArm", (0, -20, 0)),
    ("RightArm_y_20", "RightArm", (0, 20, 0)),
    ("RightArm_z_-20", "RightArm", (0, 0, -20)),
    ("RightArm_z_20", "RightArm", (0, 0, 20)),
    ("RightForeArm_x_20", "RightForeArm", (20, 0, 0)),
    ("RightForeArm_y_20", "RightForeArm", (0, 20, 0)),
    ("RightForeArm_z_20", "RightForeArm", (0, 0, 20)),
]

sample("BASE")
for label, bone, deg in tests:
    scene.frame_set(1)
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (0, 0, 0)
    pb = arm.pose.bones[bone]
    pb.rotation_euler = tuple(math.radians(v) for v in deg)
    sample(label)
