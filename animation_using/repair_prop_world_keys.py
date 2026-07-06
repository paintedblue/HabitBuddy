import math
import bpy
from mathutils import Vector, Euler, Matrix

arm = bpy.data.objects["Armature"]
brush = bpy.data.objects["Toothbrush"]
bristles = bpy.data.objects["Toothbrush_bristles"]
tube = bpy.data.objects["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]
nozzle = bpy.data.objects["Toothpaste_proxy_nozzle"]

brush.animation_data_clear()
tube.animation_data_clear()
bristles.location = (-0.115, 0, 0.025)
bristles.rotation_euler = (0, 0, 0)
bristles.scale = (1, 1, 1)
nozzle.location = (0.135, 0, 0)
nozzle.rotation_euler = (0, 0, 0)
nozzle.scale = (1, 1, 1)


def set_key(obj, frame, loc, rot, world_scale):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    obj.matrix_world = Matrix.LocRotScale(Vector(loc), Euler(rot, "XYZ"), Vector(world_scale))
    obj.keyframe_insert(data_path="location", frame=frame)
    obj.keyframe_insert(data_path="rotation_euler", frame=frame)
    obj.keyframe_insert(data_path="scale", frame=frame)


brush_rot = (0, math.radians(90), math.radians(8))
brush_scale = (1.25, 1.25, 1.25)
tube_scale_base = (1.10, 1.10, 1.10)
tube_rot = (0, math.radians(-12), 0)

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
    set_key(brush, frame, loc, brush_rot, brush_scale)

rot_m = Euler(brush_rot, "XYZ").to_matrix().to_4x4()
nozzle_rot_m = Euler(tube_rot, "XYZ").to_matrix().to_4x4()
nozzle_offset = nozzle_rot_m @ Vector((0.135, 0, 0))

for frame in [1, 12, 24, 36, 48, 56, 64, 72, 80, 92, 108]:
    if frame < 36:
        loc = {
            1: (0.31, -0.405, 0.48),
            12: (0.22, -0.43, 0.59),
            24: (0.10, -0.47, 0.71),
        }[frame]
    elif frame <= 80:
        site = Vector(brush_locs[frame]) + (rot_m @ Vector((-0.135, 0, 0.035)))
        close_y = -0.018 if frame in [56, 72] else -0.010
        nozzle_target = site + Vector((0.018, close_y, 0.010))
        loc = nozzle_target - nozzle_offset
    else:
        loc = {92: (0.04, -0.47, 0.68), 108: (0.19, -0.42, 0.57)}[frame]
    pulse = {
        56: (1.14, 0.90, 0.96),
        72: (1.15, 0.86, 0.94),
    }.get(frame, (1.0, 1.0, 1.0))
    scale = tuple(tube_scale_base[i] * pulse[i] for i in range(3))
    set_key(tube, frame, loc, tube_rot, scale)

# Recreate grip helper curves around the keyed props so no inherited bad scale remains.
for name in ["RightGrip_Index", "RightGrip_Middle", "RightGrip_Thumb", "LeftGrip_Index", "LeftGrip_Middle", "LeftGrip_Thumb"]:
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)

skin = bpy.data.materials.get("Grip helper warm skin") or bpy.data.materials.new("Grip helper warm skin")
skin.diffuse_color = (0.76, 0.43, 0.25, 1)


def curve(name, coords, radius, parent):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    sp = cu.splines.new("POLY")
    sp.points.add(len(coords) - 1)
    for point, co in zip(sp.points, coords):
        point.co = (co[0], co[1], co[2], 1)
    obj = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(skin)
    obj.parent = parent
    return obj

curve("RightGrip_Index", [(-0.055, -0.020, 0.030), (-0.005, -0.030, 0.040), (0.040, -0.018, 0.020)], 0.012, brush)
curve("RightGrip_Middle", [(-0.055, 0.000, 0.000), (-0.005, -0.015, 0.015), (0.045, 0.000, -0.005)], 0.013, brush)
curve("RightGrip_Thumb", [(0.055, 0.025, -0.020), (0.005, 0.015, 0.005), (-0.045, 0.020, 0.020)], 0.014, brush)
curve("LeftGrip_Index", [(-0.075, -0.026, 0.028), (-0.010, -0.040, 0.042), (0.065, -0.024, 0.020)], 0.014, tube)
curve("LeftGrip_Middle", [(-0.075, 0.000, 0.000), (-0.010, -0.020, 0.018), (0.065, 0.000, -0.008)], 0.015, tube)
curve("LeftGrip_Thumb", [(0.080, 0.030, -0.020), (0.010, 0.018, 0.006), (-0.070, 0.025, 0.022)], 0.015, tube)

bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
