import math
import bpy
from mathutils import Vector, Euler

BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

right_target = bpy.data.objects["RightHand_IK_ForwardGrip"]
left_target = bpy.data.objects["LeftHand_IK_ForwardGrip"]
right_grip = bpy.data.objects["RightHandGrip_CTRL"]
left_grip = bpy.data.objects["LeftHandGrip_CTRL"]
brush = bpy.data.objects["Toothbrush"]
tube = bpy.data.objects["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]
bristles = bpy.data.objects["Toothbrush_bristles"]
nozzle = bpy.data.objects["Toothpaste_proxy_nozzle"]

for grip, target in [(right_grip, right_target), (left_grip, left_target)]:
    grip.parent = target
    grip.parent_type = "OBJECT"
    grip.matrix_parent_inverse.identity()
    grip.location = (0, 0, 0)
    grip.rotation_euler = (0, 0, 0)
    grip.scale = (1, 1, 1)
    if grip.animation_data and grip is right_grip:
        grip.animation_data_clear()

# Keep left-grip squeeze pulses after making it target-relative.
if left_grip.animation_data:
    left_grip.animation_data_clear()
for frame, scale in [(1, (1, 1, 1)), (48, (1, 1, 1)), (56, (0.98, 0.96, 1.0)), (64, (1, 1, 1)), (72, (0.96, 0.94, 1.0)), (80, (1, 1, 1)), (108, (1, 1, 1))]:
    bpy.context.scene.frame_set(frame)
    left_grip.scale = scale
    left_grip.keyframe_insert(data_path="scale", frame=frame)

# Fixed object offsets inside each hand grip.
brush.parent = right_grip
brush.location = (0.12, -0.03, -0.02)
brush.rotation_euler = (0, math.radians(90), math.radians(8))
brush.scale = (1.15, 1.15, 1.15)
if brush.animation_data:
    brush.animation_data_clear()

tube.parent = left_grip
tube.location = (-0.27, -0.015, -0.005)
tube.rotation_euler = (0, math.radians(-12), 0)
tube.scale = (0.95, 0.95, 0.95)
if tube.animation_data:
    tube.animation_data_clear()

bristles.parent = brush
bristles.location = (-0.115, 0, 0.025)
bristles.rotation_euler = (0, 0, 0)
bristles.scale = (1, 1, 1)

nozzle.parent = tube
nozzle.location = (0.135, 0, 0)
nozzle.rotation_euler = (0, 0, 0)
nozzle.scale = (1, 1, 1)

# Place the blob exactly on the bristles in brush local space.
blob = bpy.data.objects.get("Forward_Toothpaste_Blob")
if blob:
    blob.parent = brush
    blob.location = (-0.135, 0.0, 0.035)
    blob.rotation_euler = (0, 0, 0)

ribbon = bpy.data.objects.get("Forward_Toothpaste_Ribbon")
if ribbon:
    ribbon.parent = brush
    ribbon.location = (0, 0, 0)
    ribbon.rotation_euler = (0, 0, 0)

# Reparent visual grip fingers to the correct held object and reset inherited transforms.
for name in ["RightGrip_Index", "RightGrip_Middle", "RightGrip_Thumb"]:
    o = bpy.data.objects.get(name)
    if o:
        o.parent = brush
for name in ["LeftGrip_Index", "LeftGrip_Middle", "LeftGrip_Thumb"]:
    o = bpy.data.objects.get(name)
    if o:
        o.parent = tube

# Keep all visible interpolation Bezier.
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
