import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path("/Users/young/Desktop/HabitBuddy_3d_react")
BLEND = ROOT / "animation_using/fox_brushing_teeth_v4_prep_anims.blend"
PREVIEW_DIR = ROOT / "animation_using/previews"


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def frame_30_to_scene(frame):
    return max(1, round(frame * bpy.context.scene.render.fps / 30))


def sample_action(action_name, shape_action_name, frames):
    scene = bpy.context.scene
    arm = bpy.data.objects["Armature"]
    shape_keys = bpy.data.objects["char1"].data.shape_keys
    arm.animation_data.action = bpy.data.actions[action_name]
    shape_keys.animation_data.action = bpy.data.actions[shape_action_name]
    for obj_name in ["Toothbrush", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]:
        obj = bpy.data.objects.get(obj_name)
        prop_action = bpy.data.actions.get(f"{action_name}_{obj_name}")
        if obj and prop_action:
            obj.animation_data.action = prop_action
    paths = []
    for frame in frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        out = PREVIEW_DIR / f"{action_name}_F{frame:03d}.png"
        scene.render.filepath = str(out)
        bpy.ops.render.render(write_still=True)
        paths.append(str(out))
    return paths


def diff_pose(action_name, shape_action_name, end_frame):
    scene = bpy.context.scene
    arm = bpy.data.objects["Armature"]
    shape_keys = bpy.data.objects["char1"].data.shape_keys
    arm.animation_data.action = bpy.data.actions[action_name]
    shape_keys.animation_data.action = bpy.data.actions[shape_action_name]
    for obj_name in ["Toothbrush", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]:
        obj = bpy.data.objects.get(obj_name)
        prop_action = bpy.data.actions.get(f"{action_name}_{obj_name}")
        if obj and prop_action:
            obj.animation_data.action = prop_action

    scene.frame_set(1)
    bpy.context.view_layer.update()
    start = {
        pb.name: (
            tuple(round(v, 6) for v in pb.location),
            tuple(round(v, 6) for v in pb.rotation_quaternion),
            tuple(round(v, 6) for v in pb.scale),
        )
        for pb in arm.pose.bones
    }
    start_shapes = {kb.name: round(kb.value, 6) for kb in shape_keys.key_blocks}

    scene.frame_set(end_frame)
    bpy.context.view_layer.update()
    max_loc = 0.0
    max_rot = 0.0
    max_scale = 0.0
    for pb in arm.pose.bones:
        s_loc, s_rot, s_scale = start[pb.name]
        max_loc = max(max_loc, max(abs(pb.location[i] - s_loc[i]) for i in range(3)))
        max_rot = max(max_rot, max(abs(pb.rotation_quaternion[i] - s_rot[i]) for i in range(4)))
        max_scale = max(max_scale, max(abs(pb.scale[i] - s_scale[i]) for i in range(3)))
    end_shapes = {kb.name: round(kb.value, 6) for kb in shape_keys.key_blocks}
    shape_delta = {
        name: round(end_shapes[name] - start_shapes.get(name, 0.0), 6)
        for name in end_shapes
        if abs(end_shapes[name] - start_shapes.get(name, 0.0)) > 0.0001
    }
    return {
        "max_location_delta": round(max_loc, 6),
        "max_rotation_delta": round(max_rot, 6),
        "max_scale_delta": round(max_scale, 6),
        "shape_key_delta": shape_delta,
    }


bpy.ops.wm.open_mainfile(filepath=str(BLEND))
PREVIEW_DIR.mkdir(exist_ok=True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.eevee.taa_render_samples = 16

char = bpy.data.objects["char1"]
center = sum((char.matrix_world @ Vector(corner) for corner in char.bound_box), Vector()) / 8
cam = bpy.data.objects.get("VerificationCamera") or bpy.data.objects.new(
    "VerificationCamera", bpy.data.cameras.new("VerificationCamera")
)
if cam.name not in bpy.context.scene.collection.objects:
    bpy.context.scene.collection.objects.link(cam)
cam.location = center + Vector((0, -4.2, 0.7))
cam.data.type = "ORTHO"
cam.data.ortho_scale = 2.2
look_at(cam, center + Vector((0, 0, 0.2)))
scene.camera = cam

light = bpy.data.objects.get("VerificationLight") or bpy.data.objects.new(
    "VerificationLight", bpy.data.lights.new("VerificationLight", "AREA")
)
if light.name not in bpy.context.scene.collection.objects:
    bpy.context.scene.collection.objects.link(light)
light.location = center + Vector((0, -3, 4))
light.data.energy = 450
light.data.size = 4

anim1_end = frame_30_to_scene(150)
anim2_end = frame_30_to_scene(70)

result = {
    "fps": scene.render.fps,
    "actions": sorted([a.name for a in bpy.data.actions if a.name.startswith("PREP_brush_teeth")]),
    "objects": {
        "Toothbrush": bpy.data.objects.get("Toothbrush").parent_bone if bpy.data.objects.get("Toothbrush") else None,
        "Toothpaste_proxy": bpy.data.objects.get("Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET").parent_bone
        if bpy.data.objects.get("Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET")
        else None,
    },
    "shape_keys": list(bpy.data.objects["char1"].data.shape_keys.key_blocks.keys()),
    "idle_return": {
        "PREP_brush_teeth_1_squeeze_toothpaste": diff_pose(
            "PREP_brush_teeth_1_squeeze_toothpaste",
            "PREP_brush_teeth_1_squeeze_toothpaste_ShapeKeys",
            anim1_end,
        ),
        "PREP_brush_teeth_2_mouth_open": diff_pose(
            "PREP_brush_teeth_2_mouth_open",
            "PREP_brush_teeth_2_mouth_open_ShapeKeys",
            anim2_end,
        ),
    },
    "previews": {
        "PREP_brush_teeth_1_squeeze_toothpaste": sample_action(
            "PREP_brush_teeth_1_squeeze_toothpaste",
            "PREP_brush_teeth_1_squeeze_toothpaste_ShapeKeys",
            [1, frame_30_to_scene(30), frame_30_to_scene(60), frame_30_to_scene(90), anim1_end],
        ),
        "PREP_brush_teeth_2_mouth_open": sample_action(
            "PREP_brush_teeth_2_mouth_open",
            "PREP_brush_teeth_2_mouth_open_ShapeKeys",
            [1, frame_30_to_scene(20), frame_30_to_scene(40), anim2_end],
        ),
    },
}

print("VERIFY_JSON_START" + json.dumps(result, indent=2) + "VERIFY_JSON_END")
