import math
import bpy
from mathutils import Vector, Euler, Matrix

BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

ARM = "Armature"
BRUSH = "Toothbrush"
BRISTLES = "Toothbrush_bristles"
TUBE = "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"
NOZZLE = "Toothpaste_proxy_nozzle"


def obj(name):
    found = bpy.data.objects.get(name)
    if not found:
        raise RuntimeError(f"Missing object: {name}")
    return found


def remove(name):
    found = bpy.data.objects.get(name)
    if found:
        bpy.data.objects.remove(found, do_unlink=True)


def mat(name, rgba):
    found = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    found.diffuse_color = rgba
    return found


def key_obj(o, frame, data_paths=("location", "rotation_euler", "scale")):
    bpy.context.scene.frame_set(frame)
    for path in data_paths:
        o.keyframe_insert(data_path=path, frame=frame)


def set_bezier_for_action(action):
    if not action:
        return
    # Blender 5 layered action API.
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


def parent_to_bone_keep_world(o, arm, bone_name):
    world = o.matrix_world.copy()
    o.parent = arm
    o.parent_type = "BONE"
    o.parent_bone = bone_name
    o.matrix_world = world


def parent_keep_world(child, parent):
    world = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = world


def make_empty(name, loc, display="PLAIN_AXES", size=0.08):
    remove(name)
    e = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(e)
    e.empty_display_type = display
    e.empty_display_size = size
    e.location = loc
    e.rotation_mode = "XYZ"
    return e


def add_ik(hand_bone, target, chain_count=3):
    for c in list(hand_bone.constraints):
        if c.name.startswith("ForwardGrip_"):
            hand_bone.constraints.remove(c)
    c = hand_bone.constraints.new(type="IK")
    c.name = "ForwardGrip_Hand_IK"
    c.target = target
    c.chain_count = chain_count
    c.use_rotation = True
    c.influence = 1.0
    return c


def add_curve(name, coords, radius, material, parent):
    remove(name)
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.resolution_u = 3
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    sp = cu.splines.new("POLY")
    sp.points.add(len(coords) - 1)
    for p, co in zip(sp.points, coords):
        p.co = (co[0], co[1], co[2], 1.0)
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    o.parent = parent
    return o


scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 108
scene.render.fps = 24

arm = obj(ARM)
brush = obj(BRUSH)
bristles = obj(BRISTLES)
tube = obj(TUBE)
nozzle = obj(NOZZLE)

# Clean helpers from previous attempts.
for name in [
    "RightHand_IK_ForwardGrip",
    "LeftHand_IK_ForwardGrip",
    "RightHandGrip_CTRL",
    "LeftHandGrip_CTRL",
    "Forward_Toothpaste_Blob",
    "Forward_Toothpaste_Ribbon",
    "RightGrip_Index",
    "RightGrip_Middle",
    "RightGrip_Thumb",
    "LeftGrip_Index",
    "LeftGrip_Middle",
    "LeftGrip_Thumb",
]:
    remove(name)

# Activate a new action name while preserving existing actions.
base = bpy.data.actions.get("PREP_brush_teeth_1_squeeze_toothpaste")
new_action = base.copy() if base else bpy.data.actions.new("PREP_brush_teeth_3_forward_grip_squeeze")
new_action.name = "PREP_brush_teeth_3_forward_grip_squeeze"
arm.animation_data_create()
arm.animation_data.action = new_action

# Props must be fixed to grip controls, so remove their old world-space actions.
for o in [brush, tube]:
    if o.animation_data:
        o.animation_data_clear()
    for c in list(o.constraints):
        o.constraints.remove(c)

# IK targets: negative Y is in front of the character/camera in this scene.
right_target = make_empty("RightHand_IK_ForwardGrip", (-0.29, -0.34, 0.58), "SPHERE", 0.06)
left_target = make_empty("LeftHand_IK_ForwardGrip", (0.29, -0.34, 0.58), "SPHERE", 0.06)
add_ik(arm.pose.bones["RightHand"], right_target)
add_ik(arm.pose.bones["LeftHand"], left_target)

right_keys = {
    1: (-0.29, -0.34, 0.58),
    12: (-0.25, -0.42, 0.64),
    24: (-0.20, -0.50, 0.70),
    36: (-0.17, -0.54, 0.72),
    48: (-0.15, -0.56, 0.72),
    56: (-0.15, -0.56, 0.72),
    64: (-0.15, -0.56, 0.72),
    72: (-0.15, -0.56, 0.72),
    80: (-0.15, -0.56, 0.72),
    92: (-0.20, -0.50, 0.67),
    108: (-0.25, -0.40, 0.62),
}
left_keys = {
    1: (0.29, -0.34, 0.58),
    12: (0.24, -0.42, 0.66),
    24: (0.18, -0.50, 0.75),
    36: (0.11, -0.55, 0.75),
    48: (0.08, -0.57, 0.74),
    56: (0.06, -0.585, 0.735),
    64: (0.08, -0.57, 0.74),
    72: (0.055, -0.585, 0.735),
    80: (0.08, -0.57, 0.74),
    92: (0.16, -0.50, 0.68),
    108: (0.25, -0.40, 0.62),
}
for frame, loc in right_keys.items():
    bpy.context.scene.frame_set(frame)
    right_target.location = loc
    right_target.rotation_euler = (math.radians(3), math.radians(-8), math.radians(-4))
    key_obj(right_target, frame, ("location", "rotation_euler"))
for frame, loc in left_keys.items():
    bpy.context.scene.frame_set(frame)
    left_target.location = loc
    left_target.rotation_euler = (math.radians(-3), math.radians(8), math.radians(4))
    key_obj(left_target, frame, ("location", "rotation_euler"))

# Add shoulder/forearm offsets so arms read as pushed forward rather than folded inward.
pose_keys = {
    1: {
        "RightShoulder": (0.0, -0.10, -0.10), "RightArm": (-0.10, -0.18, -0.18), "RightForeArm": (0.12, 0.02, 0.20),
        "LeftShoulder": (0.0, 0.10, 0.10), "LeftArm": (-0.10, 0.18, 0.18), "LeftForeArm": (0.12, -0.02, -0.20),
    },
    24: {
        "RightShoulder": (-0.06, -0.22, -0.18), "RightArm": (-0.26, -0.30, -0.30), "RightForeArm": (0.30, 0.04, 0.34),
        "LeftShoulder": (-0.06, 0.22, 0.18), "LeftArm": (-0.26, 0.30, 0.30), "LeftForeArm": (0.30, -0.04, -0.34),
    },
    48: {
        "RightShoulder": (-0.08, -0.26, -0.18), "RightArm": (-0.30, -0.32, -0.34), "RightForeArm": (0.36, 0.04, 0.40),
        "LeftShoulder": (-0.08, 0.26, 0.18), "LeftArm": (-0.30, 0.32, 0.34), "LeftForeArm": (0.36, -0.04, -0.40),
    },
    80: {
        "RightShoulder": (-0.08, -0.26, -0.18), "RightArm": (-0.30, -0.32, -0.34), "RightForeArm": (0.34, 0.04, 0.38),
        "LeftShoulder": (-0.08, 0.26, 0.18), "LeftArm": (-0.31, 0.34, 0.36), "LeftForeArm": (0.38, -0.04, -0.42),
    },
    108: {
        "RightShoulder": (-0.02, -0.14, -0.10), "RightArm": (-0.18, -0.22, -0.22), "RightForeArm": (0.22, 0.02, 0.26),
        "LeftShoulder": (-0.02, 0.14, 0.10), "LeftArm": (-0.18, 0.22, 0.22), "LeftForeArm": (0.22, -0.02, -0.26),
    },
}
for frame, bones in pose_keys.items():
    bpy.context.scene.frame_set(frame)
    for bone, rot in bones.items():
        pb = arm.pose.bones.get(bone)
        if pb:
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = rot
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

# Evaluate the start pose, create grip empties in the palms, and bone-parent them.
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
right_grip = make_empty("RightHandGrip_CTRL", (-0.29, -0.34, 0.58), "CUBE", 0.055)
left_grip = make_empty("LeftHandGrip_CTRL", (0.29, -0.34, 0.58), "CUBE", 0.055)
parent_to_bone_keep_world(right_grip, arm, "RightHand")
parent_to_bone_keep_world(left_grip, arm, "LeftHand")

# Put props in the hands, then make them children of the grip controls.
# Toothbrush is in the right hand; bristles point upward. Tube is in the left hand facing the bristles.
brush.matrix_world = Matrix.LocRotScale(Vector((-0.17, -0.37, 0.56)), Euler((0, math.radians(90), math.radians(8)), "XYZ"), Vector((1.15, 1.15, 1.15)))
tube.matrix_world = Matrix.LocRotScale(Vector((0.01, -0.36, 0.59)), Euler((0, math.radians(-12), 0), "XYZ"), Vector((0.95, 0.95, 0.95)))
parent_keep_world(brush, right_grip)
parent_keep_world(tube, left_grip)

bristles.parent = brush
bristles.location = (-0.115, 0, 0.025)
bristles.rotation_euler = (0, 0, 0)
bristles.scale = (1, 1, 1)
nozzle.parent = tube
nozzle.location = (0.135, 0, 0)
nozzle.rotation_euler = (0, 0, 0)
nozzle.scale = (1, 1, 1)

# Small local squeeze pulses on the left grip control keep the prop fixed to the hand while fingers press.
for frame, scale in [(1, (1, 1, 1)), (48, (1, 1, 1)), (56, (0.98, 0.96, 1.0)), (64, (1, 1, 1)), (72, (0.96, 0.94, 1.0)), (80, (1, 1, 1)), (108, (1, 1, 1))]:
    bpy.context.scene.frame_set(frame)
    left_grip.scale = scale
    left_grip.keyframe_insert(data_path="scale", frame=frame)

# Tube mesh squeeze with a shape key.
if tube.type == "MESH":
    if not tube.data.shape_keys:
        tube.shape_key_add(name="Basis")
    sq = tube.data.shape_keys.key_blocks.get("ForwardGrip_Squeeze")
    if not sq:
        sq = tube.shape_key_add(name="ForwardGrip_Squeeze")
        for v in sq.data:
            if abs(v.co.x) < 0.08:
                v.co.y *= 0.55
                v.co.z *= 0.70
            elif v.co.x < -0.08:
                v.co.z *= 0.88
    for frame, value in [(1, 0), (48, 0), (56, 1), (64, 0.20), (72, 1), (80, 0.15), (92, 0), (108, 0)]:
        bpy.context.scene.frame_set(frame)
        sq.value = value
        sq.keyframe_insert(data_path="value", frame=frame)

# Toothpaste blob and short ribbon, both in brush space so they stay on the bristles.
paste = mat("Forward toothpaste white", (0.98, 0.98, 0.92, 1))
skin = mat("Grip helper warm skin", (0.76, 0.43, 0.25, 1))

bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.035, location=(0, 0, 0))
blob = bpy.context.object
blob.name = "Forward_Toothpaste_Blob"
blob.data.materials.append(paste)
blob.parent = brush
blob.location = (-0.135, 0.0, 0.035)
blob.rotation_euler = (0, 0, 0)
for frame, scale in [(1, (0.01, 0.01, 0.01)), (48, (0.01, 0.01, 0.01)), (56, (0.55, 0.35, 0.22)), (64, (0.75, 0.45, 0.30)), (72, (0.95, 0.58, 0.38)), (80, (1.18, 0.70, 0.45)), (108, (1.18, 0.70, 0.45))]:
    bpy.context.scene.frame_set(frame)
    blob.scale = scale
    blob.keyframe_insert(data_path="scale", frame=frame)

ribbon = add_curve("Forward_Toothpaste_Ribbon", [(-0.11, -0.004, 0.04), (-0.13, 0.0, 0.045), (-0.145, 0.0, 0.04)], 0.0075, paste, brush)
for frame, scale in [(1, (0.01, 0.01, 0.01)), (48, (0.01, 0.01, 0.01)), (56, (1, 1, 1)), (64, (0.20, 0.20, 0.20)), (72, (1, 1, 1)), (80, (0.15, 0.15, 0.15)), (92, (0.01, 0.01, 0.01))]:
    bpy.context.scene.frame_set(frame)
    ribbon.scale = scale
    ribbon.keyframe_insert(data_path="scale", frame=frame)

# Visual curled fingers. There are no finger bones in this rig, so these are the only possible per-finger grip controls.
add_curve("RightGrip_Index", [(-0.050, -0.018, 0.025), (-0.006, -0.030, 0.040), (0.040, -0.018, 0.018)], 0.010, skin, brush)
add_curve("RightGrip_Middle", [(-0.050, 0.000, 0.000), (-0.006, -0.014, 0.014), (0.042, 0.000, -0.004)], 0.011, skin, brush)
add_curve("RightGrip_Thumb", [(0.052, 0.026, -0.018), (0.006, 0.014, 0.004), (-0.040, 0.020, 0.018)], 0.012, skin, brush)
left_index = add_curve("LeftGrip_Index", [(-0.070, -0.026, 0.026), (-0.010, -0.040, 0.040), (0.065, -0.024, 0.018)], 0.012, skin, tube)
left_middle = add_curve("LeftGrip_Middle", [(-0.070, 0.000, 0.000), (-0.010, -0.020, 0.018), (0.065, 0.000, -0.008)], 0.013, skin, tube)
left_thumb = add_curve("LeftGrip_Thumb", [(0.078, 0.030, -0.020), (0.010, 0.018, 0.006), (-0.068, 0.025, 0.022)], 0.013, skin, tube)
for helper in [left_index, left_middle, left_thumb]:
    for frame, scale in [(1, (1, 1, 1)), (48, (1, 1, 1)), (56, (0.92, 0.92, 0.92)), (64, (1, 1, 1)), (72, (0.88, 0.88, 0.88)), (80, (1, 1, 1)), (108, (1, 1, 1))]:
        bpy.context.scene.frame_set(frame)
        helper.scale = scale
        helper.keyframe_insert(data_path="scale", frame=frame)

# Keep the original mouth/head squeeze shape keys active if present.
char = bpy.data.objects.get("char1")
shape_action = bpy.data.actions.get("PREP_brush_teeth_1_squeeze_toothpaste_ShapeKeys")
if char and char.data.shape_keys and shape_action:
    char.data.shape_keys.animation_data_create()
    char.data.shape_keys.animation_data.action = shape_action

for action in bpy.data.actions:
    set_bezier_for_action(action)
if tube.data.shape_keys and tube.data.shape_keys.animation_data:
    set_bezier_for_action(tube.data.shape_keys.animation_data.action)

bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
