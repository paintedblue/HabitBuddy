import math
import bpy
from mathutils import Matrix, Vector, Euler


ARMATURE = "Armature"
RIGHT_HAND = "RightHand"
LEFT_HAND = "LeftHand"
RIGHT_FOREARM = "RightForeArm"
LEFT_FOREARM = "LeftForeArm"

BRUSH = "Toothbrush"
BRISTLES = "Toothbrush_bristles"
TUBE = "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"
NOZZLE = "Toothpaste_proxy_nozzle"


def get_obj(name):
    obj = bpy.data.objects.get(name)
    if not obj:
        raise RuntimeError(f"Missing object: {name}")
    return obj


def make_mat(name, color):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    return mat


def remove_if_exists(name):
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)


def set_world(obj, loc, rot=(0, 0, 0), scale=(1, 1, 1)):
    obj.matrix_world = Matrix.LocRotScale(Vector(loc), Euler(rot, "XYZ"), Vector(scale))


def parent_to_bone_keep_world(obj, arm, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def insert_loc_rot(obj, frame, loc, rot=(0, 0, 0)):
    bpy.context.scene.frame_set(frame)
    obj.location = loc
    obj.rotation_euler = rot
    obj.keyframe_insert(data_path="location", frame=frame)
    obj.keyframe_insert(data_path="rotation_euler", frame=frame)


def insert_scale(obj, frame, scale):
    bpy.context.scene.frame_set(frame)
    obj.scale = scale
    obj.keyframe_insert(data_path="scale", frame=frame)


def set_pose_rot(pb, frame, rot):
    bpy.context.scene.frame_set(frame)
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = rot
    pb.keyframe_insert(data_path="rotation_euler", frame=frame)


def add_ik_target(name, loc):
    remove_if_exists(name)
    empty = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(empty)
    empty.empty_display_type = "SPHERE"
    empty.empty_display_size = 0.08
    empty.location = loc
    empty.rotation_mode = "XYZ"
    return empty


def add_ik(pb, target, chain_count=2):
    for con in list(pb.constraints):
        if con.type == "IK" and con.name.startswith("BrushSequence_"):
            pb.constraints.remove(con)
    con = pb.constraints.new(type="IK")
    con.name = "BrushSequence_Hand_IK"
    con.target = target
    con.chain_count = chain_count
    con.use_rotation = True
    con.influence = 1.0
    return con


def add_curve_finger(name, coords, radius, mat, parent_obj=None, parent_bone=None):
    remove_if_exists(name)
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 3
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    spline.points.add(len(coords) - 1)
    for p, co in zip(spline.points, coords):
        p.co = (co[0], co[1], co[2], 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if parent_obj and parent_bone:
        parent_to_bone_keep_world(obj, parent_obj, parent_bone)
    return obj


def pulse_shape_key(obj, key_name, frames_values):
    key = obj.data.shape_keys.key_blocks.get(key_name)
    if not key:
        return
    for frame, value in frames_values:
        bpy.context.scene.frame_set(frame)
        key.value = value
        key.keyframe_insert(data_path="value", frame=frame)


scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 108
scene.render.fps = 24

arm = get_obj(ARMATURE)
brush = get_obj(BRUSH)
bristles = get_obj(BRISTLES)
tube = get_obj(TUBE)
nozzle = get_obj(NOZZLE)

# Keep body mesh animation untouched; replace the failed arm/prop setup.
for obj in [arm, brush, tube, nozzle]:
    if obj.animation_data:
        obj.animation_data_clear()

for obj_name in [
    "RightHand_IK_Brush_Sequence",
    "LeftHand_IK_Brush_Sequence",
    "Toothpaste_blob_on_bristles",
    "Toothpaste_nozzle_ribbon",
]:
    remove_if_exists(obj_name)

skin = make_mat("Grip helper warm skin", (0.76, 0.43, 0.25, 1.0))
paste_mat = make_mat("Fresh toothpaste white", (0.98, 0.98, 0.92, 1.0))

right_target = add_ik_target("RightHand_IK_Brush_Sequence", (-0.31, -0.40, 0.45))
left_target = add_ik_target("LeftHand_IK_Brush_Sequence", (0.31, -0.40, 0.45))

right_pb = arm.pose.bones[RIGHT_HAND]
left_pb = arm.pose.bones[LEFT_HAND]
add_ik(right_pb, right_target)
add_ik(left_pb, left_target)

# Arm targets: grip, lift, approach, squeeze rhythm, release.
target_keys = {
    1:  ((-0.31, -0.40, 0.45), (0.31, -0.40, 0.45)),
    12: ((-0.25, -0.43, 0.58), (0.25, -0.43, 0.60)),
    24: ((-0.18, -0.46, 0.70), (0.18, -0.47, 0.82)),
    36: ((-0.13, -0.48, 0.74), (0.03, -0.49, 0.85)),
    48: ((-0.10, -0.50, 0.76), (-0.05, -0.515, 0.86)),
    56: ((-0.10, -0.50, 0.76), (-0.075, -0.535, 0.845)),
    64: ((-0.10, -0.50, 0.76), (-0.052, -0.515, 0.865)),
    72: ((-0.10, -0.50, 0.76), (-0.080, -0.535, 0.845)),
    80: ((-0.10, -0.50, 0.76), (-0.050, -0.518, 0.865)),
    92: ((-0.13, -0.48, 0.73), (0.06, -0.48, 0.80)),
    108:((-0.21, -0.42, 0.64), (0.19, -0.42, 0.66)),
}

for frame, (r_loc, l_loc) in target_keys.items():
    # Subtle wrist rotations keep the props from looking locked to rails.
    r_rot = (math.radians(4), math.radians(-8), math.radians(-6 + frame * 0.03))
    l_rot = (math.radians(-4), math.radians(10), math.radians(7 - frame * 0.02))
    insert_loc_rot(right_target, frame, r_loc, r_rot)
    insert_loc_rot(left_target, frame, l_loc, l_rot)

# Small shoulder/forearm offsets give a delayed FK arc on top of IK placement.
pose_keys = {
    1:  {"RightArm": (0.05, -0.08, -0.18), "RightForeArm": (0.02, 0.02, 0.18), "LeftArm": (0.05, 0.08, 0.18), "LeftForeArm": (0.02, -0.02, -0.18)},
    24: {"RightArm": (-0.25, -0.18, -0.36), "RightForeArm": (0.20, 0.04, 0.38), "LeftArm": (-0.28, 0.20, 0.36), "LeftForeArm": (0.24, -0.04, -0.36)},
    48: {"RightArm": (-0.34, -0.22, -0.42), "RightForeArm": (0.30, 0.02, 0.46), "LeftArm": (-0.42, 0.18, 0.30), "LeftForeArm": (0.36, -0.02, -0.32)},
    80: {"RightArm": (-0.34, -0.22, -0.42), "RightForeArm": (0.30, 0.02, 0.46), "LeftArm": (-0.43, 0.20, 0.30), "LeftForeArm": (0.39, -0.02, -0.34)},
    108: {"RightArm": (-0.18, -0.14, -0.28), "RightForeArm": (0.18, 0.04, 0.30), "LeftArm": (-0.20, 0.14, 0.28), "LeftForeArm": (0.18, -0.04, -0.28)},
}
for frame, bones in pose_keys.items():
    for bone, rot in bones.items():
        if bone in arm.pose.bones:
            set_pose_rot(arm.pose.bones[bone], frame, rot)

# Move props into palms before parenting to hand bones.
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
set_world(brush, (-0.31, -0.405, 0.49), (0, math.radians(90), math.radians(8)), brush.scale)
set_world(tube, (0.31, -0.405, 0.48), (0, math.radians(-12), math.radians(0)), tube.scale)
parent_to_bone_keep_world(brush, arm, RIGHT_HAND)
parent_to_bone_keep_world(tube, arm, LEFT_HAND)

# Keep child pieces connected to their tools.
bristles.parent = brush
nozzle.parent = tube

# Visual grip helpers because the rig has no individual finger bones.
finger_specs = [
    ("RightGrip_Index", [(-0.36, -0.43, 0.52), (-0.315, -0.445, 0.535), (-0.285, -0.43, 0.505)], 0.012, RIGHT_HAND),
    ("RightGrip_Middle", [(-0.355, -0.41, 0.49), (-0.315, -0.425, 0.505), (-0.285, -0.41, 0.48)], 0.013, RIGHT_HAND),
    ("RightGrip_Thumb", [(-0.285, -0.385, 0.47), (-0.32, -0.398, 0.485), (-0.355, -0.39, 0.50)], 0.014, RIGHT_HAND),
    ("LeftGrip_Index", [(0.36, -0.43, 0.515), (0.31, -0.448, 0.535), (0.27, -0.43, 0.505)], 0.014, LEFT_HAND),
    ("LeftGrip_Middle", [(0.36, -0.405, 0.485), (0.31, -0.425, 0.505), (0.27, -0.405, 0.475)], 0.015, LEFT_HAND),
    ("LeftGrip_Thumb", [(0.27, -0.385, 0.47), (0.31, -0.398, 0.49), (0.36, -0.388, 0.505)], 0.015, LEFT_HAND),
]
for name, coords, radius, bone in finger_specs:
    add_curve_finger(name, coords, radius, skin, arm, bone)

# Toothpaste blob grows on the bristles during squeeze.
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.035, location=(0, 0, 0))
blob = bpy.context.object
blob.name = "Toothpaste_blob_on_bristles"
blob.data.materials.append(paste_mat)
blob.parent = brush
blob.location = (-0.135, 0.0, 0.035)
blob.rotation_euler = (0, 0, 0)
blob.scale = (0.01, 0.01, 0.01)
for frame, scale in [(1, (0.01, 0.01, 0.01)), (48, (0.01, 0.01, 0.01)), (56, (0.55, 0.35, 0.22)), (64, (0.70, 0.45, 0.30)), (72, (0.92, 0.58, 0.38)), (80, (1.15, 0.70, 0.45)), (108, (1.18, 0.70, 0.45))]:
    insert_scale(blob, frame, scale)

# Short toothpaste ribbon from nozzle to blob, visible only through the squeeze.
add_curve_finger(
    "Toothpaste_nozzle_ribbon",
    [(-0.07, -0.525, 0.84), (-0.087, -0.515, 0.81), (-0.105, -0.505, 0.78)],
    0.009,
    paste_mat,
)
ribbon = bpy.data.objects["Toothpaste_nozzle_ribbon"]
for frame, scale in [(1, (0.01, 0.01, 0.01)), (48, (0.01, 0.01, 0.01)), (56, (1.0, 1.0, 1.0)), (64, (0.20, 0.20, 0.20)), (72, (1.0, 1.0, 1.0)), (80, (0.15, 0.15, 0.15)), (92, (0.01, 0.01, 0.01))]:
    insert_scale(ribbon, frame, scale)

# Tube squeeze: shape key when geometry permits, plus rhythmic local scale pulses.
if tube.type == "MESH":
    if not tube.data.shape_keys:
        tube.shape_key_add(name="Basis")
    if not tube.data.shape_keys.key_blocks.get("SqueezeGrip"):
        sq = tube.shape_key_add(name="SqueezeGrip")
        for v in sq.data:
            # Compress the middle band where fingers visually press.
            if abs(v.co.x) < 0.08:
                v.co.y *= 0.55
                v.co.z *= 0.72
            elif v.co.x < -0.08:
                v.co.z *= 0.88
    pulse_shape_key(tube, "SqueezeGrip", [(1, 0), (48, 0), (56, 1), (64, 0.25), (72, 1), (80, 0.15), (92, 0), (108, 0)])

tube_scale = tuple(tube.scale)
for frame, mul in [(1, (1, 1, 1)), (48, (1, 1, 1)), (56, (1.035, 0.82, 0.88)), (64, (1.0, 0.98, 0.98)), (72, (1.045, 0.78, 0.86)), (80, (1.0, 0.98, 0.98)), (108, (1, 1, 1))]:
    insert_scale(tube, frame, (tube_scale[0] * mul[0], tube_scale[1] * mul[1], tube_scale[2] * mul[2]))

# Grip helper fingers tighten on the tube during squeeze.
for name in ["LeftGrip_Index", "LeftGrip_Middle", "LeftGrip_Thumb"]:
    obj = bpy.data.objects.get(name)
    if obj:
        for frame, scale in [(1, (1, 1, 1)), (48, (1, 1, 1)), (56, (0.92, 0.92, 0.92)), (64, (1, 1, 1)), (72, (0.88, 0.88, 0.88)), (80, (1, 1, 1)), (108, (1, 1, 1))]:
            insert_scale(obj, frame, scale)

# Default key interpolation is Bezier; enforce where old-style fcurves are exposed.
for datablock in list(bpy.data.objects) + [arm]:
    ad = getattr(datablock, "animation_data", None)
    action = ad.action if ad else None
    if action and hasattr(action, "fcurves"):
        for fc in action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"

if tube.data.shape_keys and tube.data.shape_keys.animation_data and tube.data.shape_keys.animation_data.action:
    action = tube.data.shape_keys.animation_data.action
    if hasattr(action, "fcurves"):
        for fc in action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"

scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
