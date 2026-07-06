import math
from pathlib import Path

import bpy
from mathutils import Euler, Vector


ROOT = Path("/Users/young/Desktop/HabitBuddy_3d_react")
SRC = ROOT / "apps/web/public/assets/characters/fox_brushing_teeth_v4.glb"
OUT_GLB = ROOT / "apps/web/public/assets/characters/fox_brushing_teeth_v4_prep_anims.glb"
OUT_BLEND = ROOT / "animation_using/fox_brushing_teeth_v4_prep_anims.blend"


def frame_30_to_scene(frame):
    return max(1, round(frame * bpy.context.scene.render.fps / 30))


def ensure_material(name, color):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    return mat


def key_bone(pb, frame):
    pb.keyframe_insert("location", frame=frame)
    pb.keyframe_insert("rotation_quaternion", frame=frame)
    pb.keyframe_insert("scale", frame=frame)


def set_pose(arm, initial, frame, rotations=None, locations=None):
    rotations = rotations or {}
    locations = locations or {}
    for name, values in initial.items():
        pb = arm.pose.bones[name]
        pb.location = values["location"].copy()
        pb.rotation_quaternion = values["rotation"].copy()
        pb.scale = values["scale"].copy()
    for name, rot in rotations.items():
        if name in arm.pose.bones:
            pb = arm.pose.bones[name]
            pb.rotation_quaternion = initial[name]["rotation"] @ Euler(rot, "XYZ").to_quaternion()
    for name, loc in locations.items():
        if name in arm.pose.bones:
            arm.pose.bones[name].location = initial[name]["location"] + Vector(loc)
    for pb in arm.pose.bones:
        key_bone(pb, frame)


def key_shape(key_block, frame, value):
    key_block.value = value
    key_block.keyframe_insert("value", frame=frame)


def ensure_shape_keys(mesh_obj):
    if not mesh_obj.data.shape_keys:
        mesh_obj.shape_key_add(name="Basis")
    basis = mesh_obj.data.shape_keys.key_blocks["Basis"]
    mouth = mesh_obj.data.shape_keys.key_blocks.get("mouth_open_wide")
    happy = mesh_obj.data.shape_keys.key_blocks.get("happy")
    if not mouth:
        mouth = mesh_obj.shape_key_add(name="mouth_open_wide", from_mix=False)
    if not happy:
        happy = mesh_obj.shape_key_add(name="happy", from_mix=False)

    coords = [mesh_obj.matrix_world @ v.co for v in mesh_obj.data.vertices]
    min_z = min(v.z for v in coords)
    max_z = max(v.z for v in coords)
    min_y = min(v.y for v in coords)
    max_y = max(v.y for v in coords)
    min_x = min(v.x for v in coords)
    max_x = max(v.x for v in coords)
    head_z = min_z + (max_z - min_z) * 0.58
    face_y = min_y + (max_y - min_y) * 0.28
    center_x = (min_x + max_x) * 0.5

    for i, vertex in enumerate(mesh_obj.data.vertices):
        world = mesh_obj.matrix_world @ vertex.co
        z_norm = (world.z - head_z) / max(max_z - min_z, 0.0001)
        x_abs = abs(world.x - center_x) / max(max_x - min_x, 0.0001)
        is_mouth_zone = world.z > head_z and world.y < face_y and x_abs < 0.18
        if is_mouth_zone:
            lower_weight = max(0.0, min(1.0, 1.0 - abs(z_norm - 0.11) * 12.0))
            upper_weight = max(0.0, min(1.0, 1.0 - abs(z_norm - 0.17) * 12.0))
            side_weight = max(0.0, min(1.0, (x_abs - 0.07) * 10.0))
            mouth.data[i].co = basis.data[i].co + Vector((0, -0.018 * lower_weight, -0.035 * lower_weight))
            if upper_weight > lower_weight:
                mouth.data[i].co = basis.data[i].co + Vector((0, -0.01 * upper_weight, 0.02 * upper_weight))
            happy.data[i].co = basis.data[i].co + Vector((0, -0.008, 0.018 * side_weight))
    return mouth, happy


def add_toothpaste_proxy():
    mat = ensure_material("ToothpasteProxyMat", (0.92, 0.18, 0.22, 1.0))
    cap = ensure_material("ToothpasteCapProxyMat", (0.95, 0.95, 0.95, 1.0))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    tube = bpy.context.object
    tube.name = "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"
    tube.dimensions = (0.24, 0.045, 0.065)
    tube.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tube["asset_note"] = "Temporary cylinder proxy; replace with final toothpaste tube asset."
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.135, 0, 0))
    nozzle = bpy.context.object
    nozzle.name = "Toothpaste_proxy_nozzle"
    nozzle.dimensions = (0.035, 0.028, 0.028)
    nozzle.data.materials.append(cap)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    nozzle.parent = tube
    return tube


def make_toothbrush_proxy(existing):
    if existing:
        bpy.data.objects.remove(existing, do_unlink=True)
    mat = ensure_material("BrushMat", (0.22, 0.58, 0.86, 1.0))
    bristle_mat = ensure_material("BrushBristleMat", (0.9, 0.96, 1.0, 1.0))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    brush = bpy.context.object
    brush.name = "Toothbrush"
    brush.dimensions = (0.26, 0.025, 0.025)
    brush.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.115, 0, 0.025))
    bristles = bpy.context.object
    bristles.name = "Toothbrush_bristles"
    bristles.dimensions = (0.045, 0.035, 0.035)
    bristles.data.materials.append(bristle_mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bristles.parent = brush
    brush["asset_note"] = "Simplified Toothbrush proxy preserving BrushMat; replace with authored prop if needed."
    return brush


def clear_parent_to_world(obj):
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.parent_type = "OBJECT"
    obj.matrix_world = world


def make_prop_action(obj, name, end_frame, keyframes):
    action = bpy.data.actions.new(f"{name}_{obj.name}")
    obj.animation_data_create()
    obj.animation_data.action = action
    for frame, loc, rot, scale in keyframes:
        obj.location = loc
        obj.rotation_euler = rot
        obj.scale = scale
        obj.keyframe_insert("location", frame=frame)
        obj.keyframe_insert("rotation_euler", frame=frame)
        obj.keyframe_insert("scale", frame=frame)
    track = obj.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 1, action)
    strip.frame_end = end_frame


def make_action(arm, name, end_frame, poses, shape_keys=None):
    action = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = action
    for frame, rotations, locations in poses:
        set_pose(arm, INITIAL, frame, rotations, locations)
    if shape_keys:
        sk_data = shape_keys[0][0].id_data
        sk_action = bpy.data.actions.new(f"{name}_ShapeKeys")
        sk_data.animation_data_create()
        sk_data.animation_data.action = sk_action
        for key_block, keys in shape_keys:
            for frame, value in keys:
                key_shape(key_block, frame, value)
        sk_track = sk_data.animation_data.nla_tracks.new()
        sk_track.name = name
        sk_strip = sk_track.strips.new(name, 1, sk_action)
        sk_strip.frame_end = end_frame
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 1, action)
    strip.frame_end = end_frame
    strip.use_auto_blend = False
    return action


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=str(SRC))

for obj in bpy.data.objects:
    obj.animation_data_clear()
for mesh in bpy.data.meshes:
    if mesh.shape_keys:
        mesh.shape_keys.animation_data_clear()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)

scene = bpy.context.scene
fps = scene.render.fps
arm = bpy.data.objects["Armature"]
char = bpy.data.objects["char1"]
toothbrush = make_toothbrush_proxy(bpy.data.objects.get("Toothbrush"))
toothpaste = bpy.data.objects.get("Toothpaste") or add_toothpaste_proxy()

mouth_key, happy_key = ensure_shape_keys(char)

INITIAL = {
    pb.name: {
        "location": pb.location.copy(),
        "rotation": pb.rotation_quaternion.copy(),
        "scale": pb.scale.copy(),
    }
    for pb in arm.pose.bones
}

clear_parent_to_world(toothbrush)
clear_parent_to_world(toothpaste)
toothbrush["attach_note"] = "Baked world transforms near LeftHand because imported bone scale makes direct bone parenting unstable."
toothpaste["attach_note"] = "Temporary toothpaste proxy with baked world transforms near RightHand; replace with final asset later."

f1 = 1
f30 = frame_30_to_scene(30)
f45 = frame_30_to_scene(45)
f60 = frame_30_to_scene(60)
f75 = frame_30_to_scene(75)
f90 = frame_30_to_scene(90)
f110 = frame_30_to_scene(110)
f150 = frame_30_to_scene(150)

base_up = {
    "Spine": (math.radians(1), 0, 0),
    "LeftShoulder": (0, 0, math.radians(-4)),
    "LeftArm": (math.radians(-24), math.radians(8), math.radians(12)),
    "LeftForeArm": (math.radians(-44), math.radians(2), math.radians(-8)),
    "LeftHand": (math.radians(2), math.radians(8), math.radians(-4)),
    "RightShoulder": (0, 0, math.radians(4)),
    "RightArm": (math.radians(-26), math.radians(-10), math.radians(-12)),
    "RightForeArm": (math.radians(-48), math.radians(-3), math.radians(8)),
    "RightHand": (math.radians(2), math.radians(-10), math.radians(4)),
    "Head": (0, 0, 0),
}
squeeze_a = dict(base_up)
squeeze_a["RightHand"] = (math.radians(12), math.radians(-26), math.radians(9))
squeeze_b = dict(base_up)
squeeze_b["RightHand"] = (math.radians(-1), math.radians(-8), math.radians(-6))

make_action(
    arm,
    "PREP_brush_teeth_1_squeeze_toothpaste",
    f150,
    [
        (f1, {}, {}),
        (f30, base_up, {}),
        (f45, squeeze_a, {}),
        (f60, squeeze_b, {}),
        (f75, squeeze_a, {}),
        (f90, base_up, {}),
        (f110, {}, {}),
        (f150, {}, {}),
    ],
    shape_keys=[
        (mouth_key, [(f1, 0), (f150, 0)]),
        (happy_key, [(f1, 0), (f90, 1), (f110, 0.35), (f150, 0)]),
    ],
)

tb_rot = Euler((math.radians(0), math.radians(0), math.radians(0)), "XYZ")
tp_rot = Euler((math.radians(0), math.radians(0), math.radians(0)), "XYZ")
make_prop_action(
    toothbrush,
    "PREP_brush_teeth_1_squeeze_toothpaste",
    f150,
    [
        (f1, Vector((0.52, -0.54, 0.40)), tb_rot, Vector((1.15, 1.15, 1.15))),
        (f30, Vector((0.20, -0.60, 0.66)), tb_rot, Vector((1.15, 1.15, 1.15))),
        (f45, Vector((0.20, -0.60, 0.66)), tb_rot, Vector((1.15, 1.15, 1.15))),
        (f60, Vector((0.20, -0.60, 0.66)), tb_rot, Vector((1.15, 1.15, 1.15))),
        (f75, Vector((0.20, -0.60, 0.66)), tb_rot, Vector((1.15, 1.15, 1.15))),
        (f90, Vector((0.20, -0.60, 0.66)), tb_rot, Vector((1.15, 1.15, 1.15))),
        (f110, Vector((0.42, -0.54, 0.50)), tb_rot, Vector((1.15, 1.15, 1.15))),
        (f150, Vector((0.52, -0.54, 0.40)), tb_rot, Vector((1.15, 1.15, 1.15))),
    ],
)
make_prop_action(
    toothpaste,
    "PREP_brush_teeth_1_squeeze_toothpaste",
    f150,
    [
        (f1, Vector((-0.52, -0.54, 0.40)), tp_rot, Vector((0.95, 0.95, 0.95))),
        (f30, Vector((-0.22, -0.60, 0.72)), tp_rot, Vector((0.95, 0.95, 0.95))),
        (f45, Vector((-0.06, -0.61, 0.72)), tp_rot, Vector((0.84, 0.95, 0.95))),
        (f60, Vector((-0.10, -0.60, 0.72)), tp_rot, Vector((0.95, 0.95, 0.95))),
        (f75, Vector((-0.06, -0.61, 0.72)), tp_rot, Vector((0.84, 0.95, 0.95))),
        (f90, Vector((-0.22, -0.60, 0.72)), tp_rot, Vector((0.95, 0.95, 0.95))),
        (f110, Vector((-0.42, -0.54, 0.50)), tp_rot, Vector((0.95, 0.95, 0.95))),
        (f150, Vector((-0.52, -0.54, 0.40)), tp_rot, Vector((0.95, 0.95, 0.95))),
    ],
)

f20 = frame_30_to_scene(20)
f40 = frame_30_to_scene(40)
f70 = frame_30_to_scene(70)

make_action(
    arm,
    "PREP_brush_teeth_2_mouth_open",
    f70,
    [
        (f1, {}, {}),
        (f20, {"Head": (math.radians(5), 0, 0), "neck": (math.radians(2), 0, 0)}, {}),
        (f40, {}, {}),
        (f70, {}, {}),
    ],
    shape_keys=[
        (mouth_key, [(f1, 0), (f20, 1), (f40, 0), (f70, 0)]),
        (happy_key, [(f1, 0), (f70, 0)]),
    ],
)
make_prop_action(
    toothbrush,
    "PREP_brush_teeth_2_mouth_open",
    f70,
    [(f1, Vector((0.24, -0.52, 0.45)), tb_rot, Vector((1.25, 1.25, 1.25))), (f70, Vector((0.24, -0.52, 0.45)), tb_rot, Vector((1.25, 1.25, 1.25)))],
)
make_prop_action(
    toothpaste,
    "PREP_brush_teeth_2_mouth_open",
    f70,
    [(f1, Vector((-0.34, -0.52, 0.45)), tp_rot, Vector((1.1, 1.1, 1.1))), (f70, Vector((-0.34, -0.52, 0.45)), tp_rot, Vector((1.1, 1.1, 1.1)))],
)

scene.render.fps = fps
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
bpy.ops.export_scene.gltf(
    filepath=str(OUT_GLB),
    export_format="GLB",
    export_animations=True,
    export_nla_strips=True,
    export_frame_range=True,
)
print(f"Created {OUT_BLEND}")
print(f"Created {OUT_GLB}")
