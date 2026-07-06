import math
import bpy
from mathutils import Vector


BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

ARM = "Armature"
BRUSH = "Toothbrush"
TUBE = "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"
BRISTLES = "Toothbrush_bristles"
NOZZLE = "Toothpaste_proxy_nozzle"


def clear_added_constraints_and_helpers(arm):
    prefixes = (
        "RightHand_IK_ForwardGrip",
        "LeftHand_IK_ForwardGrip",
        "RightHandGrip_CTRL",
        "LeftHandGrip_CTRL",
        "Forward_",
        "ReachProps_",
    )
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)
    for pb in arm.pose.bones:
        for con in list(pb.constraints):
            if con.name.startswith(("ForwardGrip_", "BrushSequence_", "ReachProps_")):
                pb.constraints.remove(con)


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


def key_fk_gather(arm):
    def set_rot(frame, bone_name, deg):
        pb = arm.pose.bones.get(bone_name)
        if not pb:
            return
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = tuple(math.radians(v) for v in deg)
        pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    def pose(amount):
        return {
            "LeftArm": (-3 * amount, 0, 34 * amount),
            "LeftForeArm": (3 * amount, 0, 12 * amount),
            "LeftHand": (0, 0, 6 * amount),
            "RightArm": (-3 * amount, 0, -34 * amount),
            "RightForeArm": (3 * amount, 0, -12 * amount),
            "RightHand": (0, 0, -6 * amount),
        }

    amounts = {
        1: 0.20,
        12: 0.40,
        24: 0.70,
        36: 0.90,
        48: 1.00,
        56: 1.00,
        64: 1.00,
        72: 1.00,
        80: 0.96,
        92: 0.75,
        108: 0.45,
        120: 0.25,
    }
    for frame, amount in amounts.items():
        bpy.context.scene.frame_set(frame)
        for bone_name, deg in pose(amount).items():
            set_rot(frame, bone_name, deg)


def parent_to_bone_keep_world(obj, arm, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def clear_object_animation(obj):
    if obj.animation_data:
        obj.animation_data_clear()
    for con in list(obj.constraints):
        obj.constraints.remove(con)


scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 24

arm = bpy.data.objects[ARM]
brush = bpy.data.objects[BRUSH]
tube = bpy.data.objects[TUBE]
bristles = bpy.data.objects[BRISTLES]
nozzle = bpy.data.objects[NOZZLE]

clear_added_constraints_and_helpers(arm)
arm.animation_data_create()
arm.animation_data.action = bpy.data.actions.get("PREP_brush_teeth_1_squeeze_toothpaste")
key_fk_gather(arm)

# Use the current body-side contact pose as the held pose. Once parented, the
# tools follow the hands instead of running their own world-space animation.
scene.frame_set(48)
bpy.context.view_layer.update()

# Place each tool in the palm area before parenting. Left hand holds the
# toothbrush, right hand holds the toothpaste tube.
brush.matrix_world.translation = Vector((0.19, -0.26, 0.60))
tube.matrix_world.translation = Vector((-0.13, -0.26, 0.66))

clear_object_animation(brush)
clear_object_animation(tube)

parent_to_bone_keep_world(brush, arm, "LeftHand")
parent_to_bone_keep_world(tube, arm, "RightHand")

bristles.parent = brush
bristles.location = (-0.115, 0.0, 0.025)
bristles.rotation_euler = (0, 0, 0)
bristles.scale = (1, 1, 1)

nozzle.parent = tube
nozzle.location = (0.135, 0, 0)
nozzle.rotation_euler = (0, 0, 0)
nozzle.scale = (1, 1, 1)

# Add small palm/grip visual curves parented to the held tools. They are mesh-free
# helpers, not constraints, and make the tools read as being held rather than floating.
skin = bpy.data.materials.get("Grip helper warm skin") or bpy.data.materials.new("Grip helper warm skin")
skin.diffuse_color = (0.76, 0.43, 0.25, 1.0)

def add_curve(name, parent, coords, radius):
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 3
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    spline.points.add(len(coords) - 1)
    for point, co in zip(spline.points, coords):
        point.co = (co[0], co[1], co[2], 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(skin)
    obj.parent = parent
    return obj

add_curve("LeftGrip_Wrap_Toothbrush", brush, [(-0.025, -0.030, 0.030), (0.020, -0.040, 0.050), (0.070, -0.030, 0.025)], 0.010)
add_curve("RightGrip_Wrap_Toothpaste", tube, [(-0.055, -0.032, 0.030), (0.015, -0.044, 0.050), (0.085, -0.032, 0.020)], 0.012)

for action in bpy.data.actions:
    set_bezier(action)

scene.frame_set(48)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
