import math
import bpy

old_name = "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"
old = bpy.data.objects.get(old_name)
old_nozzle = bpy.data.objects.get("Toothpaste_proxy_nozzle")

if old:
    old.name = old_name + "_old_hidden"
    old.hide_viewport = True
    old.hide_render = True

mesh = old.data.copy() if old and old.type == "MESH" else bpy.data.meshes.new("Toothpaste_clean_mesh")
tube = bpy.data.objects.new(old_name, mesh)
bpy.context.collection.objects.link(tube)
if old:
    tube.data.materials.clear()
    for mat in old.data.materials:
        tube.data.materials.append(mat)

if old_nozzle:
    old_nozzle.name = "Toothpaste_proxy_nozzle_old_hidden"
    old_nozzle.hide_viewport = True
    old_nozzle.hide_render = True
    nozzle_mesh = old_nozzle.data.copy()
else:
    nozzle_mesh = bpy.data.meshes.new("Toothpaste_nozzle_clean_mesh")
nozzle = bpy.data.objects.new("Toothpaste_proxy_nozzle", nozzle_mesh)
bpy.context.collection.objects.link(nozzle)
if old_nozzle:
    for mat in old_nozzle.data.materials:
        nozzle.data.materials.append(mat)
nozzle.parent = tube
nozzle.location = (0.135, 0, 0)
nozzle.rotation_euler = (0, 0, 0)
nozzle.scale = (1, 1, 1)

tube.rotation_mode = "XYZ"
tube_rot = (0.0, math.radians(-12), 0.0)
keys = {
    1: ((0.31, -0.405, 0.48), (1.10, 1.10, 1.10)),
    12: ((0.22, -0.43, 0.59), (1.10, 1.10, 1.10)),
    24: ((0.10, -0.47, 0.71), (1.10, 1.10, 1.10)),
    36: ((-0.1794, -0.5051, 0.7319), (1.10, 1.10, 1.10)),
    48: ((-0.1794, -0.5051, 0.7319), (1.10, 1.10, 1.10)),
    56: ((-0.1794, -0.5131, 0.7319), (1.254, 0.990, 1.056)),
    64: ((-0.1794, -0.5051, 0.7319), (1.10, 1.10, 1.10)),
    72: ((-0.1794, -0.5131, 0.7319), (1.265, 0.946, 1.034)),
    81: ((-0.1794, -0.5051, 0.7319), (1.10, 1.10, 1.10)),
    92: ((0.04, -0.47, 0.68), (1.10, 1.10, 1.10)),
    108: ((0.19, -0.42, 0.57), (1.10, 1.10, 1.10)),
}
for frame, (loc, scale) in keys.items():
    bpy.context.scene.frame_set(frame)
    tube.location = loc
    tube.rotation_euler = tube_rot
    tube.scale = scale
    tube.keyframe_insert(data_path="location", frame=frame)
    tube.keyframe_insert(data_path="rotation_euler", frame=frame)
    tube.keyframe_insert(data_path="scale", frame=frame)

if tube.type == "MESH":
    if not tube.data.shape_keys:
        tube.shape_key_add(name="Basis")
    if not tube.data.shape_keys.key_blocks.get("SqueezeGrip"):
        sq = tube.shape_key_add(name="SqueezeGrip")
        for v in sq.data:
            if abs(v.co.x) < 0.08:
                v.co.y *= 0.55
                v.co.z *= 0.72
    key = tube.data.shape_keys.key_blocks.get("SqueezeGrip")
    if key:
        for frame, value in [(1, 0), (48, 0), (56, 1), (64, 0.25), (72, 1), (81, 0.15), (92, 0), (108, 0)]:
            bpy.context.scene.frame_set(frame)
            key.value = value
            key.keyframe_insert(data_path="value", frame=frame)

con = tube.constraints.new(type="CHILD_OF")
con.name = "Reference_ChildOf_LeftHand"
con.target = bpy.data.objects["Armature"]
con.subtarget = "LeftHand"
con.influence = 0.0

# Reparent left grip helpers to the clean tube.
for name in ["LeftGrip_Index", "LeftGrip_Middle", "LeftGrip_Thumb"]:
    obj = bpy.data.objects.get(name)
    if obj:
        obj.parent = tube

bpy.context.scene.frame_set(81)
bpy.context.view_layer.update()
print("NEW_TUBE81", tuple(tube.matrix_world.translation))

bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
