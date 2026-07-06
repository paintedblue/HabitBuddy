import math
import bpy
from mathutils import Vector, Euler, Matrix

arm = bpy.data.objects["Armature"]
brush = bpy.data.objects["Toothbrush"]
tube = bpy.data.objects["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]
nozzle = bpy.data.objects["Toothpaste_proxy_nozzle"]


def local_from_world(loc):
    return arm.matrix_world.inverted() @ Vector(loc)


def set_target_keys(obj, keys):
    obj.animation_data_clear()
    obj.parent = arm
    obj.matrix_parent_inverse.identity()
    for frame, loc in keys.items():
        bpy.context.scene.frame_set(frame)
        obj.location = local_from_world(loc)
        obj.rotation_euler = (0, 0, 0)
        obj.keyframe_insert(data_path="location", frame=frame)
        obj.keyframe_insert(data_path="rotation_euler", frame=frame)


right_keys = {
    1: (-0.31, -0.40, 0.45),
    12: (-0.25, -0.43, 0.58),
    24: (-0.18, -0.46, 0.70),
    36: (-0.13, -0.48, 0.74),
    48: (-0.10, -0.50, 0.76),
    56: (-0.10, -0.50, 0.76),
    64: (-0.10, -0.50, 0.76),
    72: (-0.10, -0.50, 0.76),
    80: (-0.10, -0.50, 0.76),
    92: (-0.13, -0.48, 0.73),
    108: (-0.21, -0.42, 0.64),
}
left_keys = {
    1: (0.31, -0.40, 0.45),
    12: (0.25, -0.43, 0.60),
    24: (0.18, -0.47, 0.82),
    36: (0.03, -0.49, 0.85),
    48: (-0.05, -0.515, 0.86),
    56: (-0.075, -0.535, 0.845),
    64: (-0.052, -0.515, 0.865),
    72: (-0.080, -0.535, 0.845),
    80: (-0.050, -0.518, 0.865),
    92: (0.06, -0.48, 0.80),
    108: (0.19, -0.42, 0.66),
}

set_target_keys(bpy.data.objects["RightHand_IK_Brush_Sequence"], right_keys)
set_target_keys(bpy.data.objects["LeftHand_IK_Brush_Sequence"], left_keys)


def key_matrix_world(obj, frame, loc, rot, scale=None):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    current_scale = scale or obj.scale
    obj.matrix_world = Matrix.LocRotScale(Vector(loc), Euler(rot, "XYZ"), Vector(current_scale))
    obj.keyframe_insert(data_path="location", frame=frame)
    obj.keyframe_insert(data_path="rotation_euler", frame=frame)
    obj.keyframe_insert(data_path="scale", frame=frame)


brush_rot = (0, math.radians(90), math.radians(8))
brush_locs = {
    1: (-0.31, -0.405, 0.49),
    12: (-0.25, -0.43, 0.545),
    24: (-0.18, -0.46, 0.585),
    36: (-0.13, -0.48, 0.610),
    48: (-0.10, -0.50, 0.615),
    56: (-0.10, -0.50, 0.615),
    64: (-0.10, -0.50, 0.615),
    72: (-0.10, -0.50, 0.615),
    80: (-0.10, -0.50, 0.615),
    92: (-0.13, -0.47, 0.585),
    108: (-0.21, -0.42, 0.535),
}
for frame, loc in brush_locs.items():
    key_matrix_world(brush, frame, loc, brush_rot)


def brush_blob_site():
    return brush.matrix_world @ Vector((-0.135, 0, 0.035))


tube_rot_approach = (0, math.radians(-12), math.radians(0))
tube_rot_start = (0, math.radians(-12), math.radians(0))
nozzle_local = Vector((0.135, 0, 0))

for frame in [1, 12, 24, 36, 48, 56, 64, 72, 80, 92, 108]:
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    rot = tube_rot_start if frame < 36 or frame > 92 else tube_rot_approach
    if frame < 36:
        loc = {
            1: (0.31, -0.405, 0.48),
            12: (0.22, -0.43, 0.59),
            24: (0.10, -0.47, 0.71),
        }[frame]
    elif frame <= 80:
        site = Vector(brush_locs[frame]) + (Matrix.LocRotScale(Vector((0, 0, 0)), Euler(brush_rot, "XYZ"), Vector(brush.scale)) @ Vector((-0.135, 0, 0.035)))
        nozzle_target = site + Vector((0.018, -0.018 if frame in [56, 72] else -0.010, 0.010))
        offset = Euler(rot, "XYZ").to_matrix().to_4x4() @ nozzle_local
        loc = nozzle_target - offset
    else:
        loc = {
            92: (0.04, -0.47, 0.68),
            108: (0.19, -0.42, 0.57),
        }[frame]
    key_matrix_world(tube, frame, loc, rot)

# Keep the faux curled fingers visually locked around the props.
for name in ["RightGrip_Index", "RightGrip_Middle", "RightGrip_Thumb"]:
    obj = bpy.data.objects.get(name)
    if obj:
        world = obj.matrix_world.copy()
        obj.parent = brush
        obj.parent_type = "OBJECT"
        obj.matrix_world = world
for name in ["LeftGrip_Index", "LeftGrip_Middle", "LeftGrip_Thumb"]:
    obj = bpy.data.objects.get(name)
    if obj:
        world = obj.matrix_world.copy()
        obj.parent = tube
        obj.parent_type = "OBJECT"
        obj.matrix_world = world

# Move the squeeze ribbon into the actual nozzle-to-bristle contact area.
ribbon = bpy.data.objects.get("Toothpaste_nozzle_ribbon")
if ribbon:
    bpy.data.objects.remove(ribbon, do_unlink=True)
mat = bpy.data.materials.get("Fresh toothpaste white") or bpy.data.materials.new("Fresh toothpaste white")
curve = bpy.data.curves.new("Toothpaste_nozzle_ribbon", "CURVE")
curve.dimensions = "3D"
curve.resolution_u = 3
curve.bevel_depth = 0.009
curve.bevel_resolution = 4
spline = curve.splines.new("POLY")
spline.points.add(2)
for point, co in zip(spline.points, [(-0.075, -0.526, 0.795), (-0.088, -0.515, 0.782), (-0.102, -0.502, 0.768)]):
    point.co = (co[0], co[1], co[2], 1)
ribbon = bpy.data.objects.new("Toothpaste_nozzle_ribbon", curve)
bpy.context.collection.objects.link(ribbon)
ribbon.data.materials.append(mat)
for frame, scale in [(1, (0.01, 0.01, 0.01)), (48, (0.01, 0.01, 0.01)), (56, (1, 1, 1)), (64, (0.20, 0.20, 0.20)), (72, (1, 1, 1)), (80, (0.15, 0.15, 0.15)), (92, (0.01, 0.01, 0.01))]:
    bpy.context.scene.frame_set(frame)
    ribbon.scale = scale
    ribbon.keyframe_insert(data_path="scale", frame=frame)

bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
