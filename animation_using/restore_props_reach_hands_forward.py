import bpy
from mathutils import Vector


BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

ARM = "Armature"
BRUSH = "Toothbrush"
TUBE = "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"


def obj(name):
    found = bpy.data.objects.get(name)
    if not found:
        raise RuntimeError(f"Missing object: {name}")
    return found


def remove_prefixed(prefixes):
    for found in list(bpy.data.objects):
        if found.name.startswith(prefixes):
            bpy.data.objects.remove(found, do_unlink=True)


def clear_reach_constraints(arm):
    for pb in arm.pose.bones:
        for con in list(pb.constraints):
            if con.name.startswith(("ForwardGrip_", "BrushSequence_", "ReachProps_")):
                pb.constraints.remove(con)


def make_empty(name):
    found = bpy.data.objects.get(name)
    if found:
        bpy.data.objects.remove(found, do_unlink=True)
    empty = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(empty)
    empty.empty_display_type = "SPHERE"
    empty.empty_display_size = 0.045
    empty.rotation_mode = "XYZ"
    return empty


def add_soft_ik(pb, target, influence=0.62):
    con = pb.constraints.new(type="IK")
    con.name = "ReachProps_Soft_IK"
    con.target = target
    con.chain_count = 2
    con.use_rotation = False
    con.influence = influence
    return con


def add_forearm_pull(pb, target, influence=0.08):
    con = pb.constraints.new(type="COPY_LOCATION")
    con.name = "ReachProps_Forearm_Pull"
    con.target = target
    con.target_space = "WORLD"
    con.owner_space = "WORLD"
    con.use_offset = True
    con.influence = influence
    return con


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


scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 24

arm = obj(ARM)
brush = obj(BRUSH)
tube = obj(TUBE)

# Remove the crossed-hand forward-grip experiment but keep the original prop actions.
remove_prefixed(
    (
        "RightHand_IK_ForwardGrip",
        "LeftHand_IK_ForwardGrip",
        "RightHandGrip_CTRL",
        "LeftHandGrip_CTRL",
        "Forward_",
        "RightGrip_",
        "LeftGrip_",
        "ReachProps_",
    )
)
clear_reach_constraints(arm)

assignments = {
    ARM: "PREP_brush_teeth_1_squeeze_toothpaste",
    BRUSH: "PREP_brush_teeth_1_squeeze_toothpaste_Toothbrush",
    TUBE: "PREP_brush_teeth_1_squeeze_toothpaste_Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET",
}
for obj_name, action_name in assignments.items():
    target = obj(obj_name)
    action = bpy.data.actions.get(action_name)
    target.parent = None
    target.animation_data_create()
    if action:
        target.animation_data.action = action

bristles = bpy.data.objects.get("Toothbrush_bristles")
if bristles:
    bristles.parent = brush
    bristles.location = (-0.115, 0, 0.025)
    bristles.rotation_euler = (0, 0, 0)
    bristles.scale = (1, 1, 1)

nozzle = bpy.data.objects.get("Toothpaste_proxy_nozzle")
if nozzle:
    nozzle.parent = tube
    nozzle.location = (0.135, 0, 0)
    nozzle.rotation_euler = (0, 0, 0)
    nozzle.scale = (1, 1, 1)

# Same-side reach: left hand goes to the toothbrush, right hand goes to the toothpaste.
# This avoids the crossed-arm bend from the previous attempt.
left_target = make_empty("ReachProps_LeftHand_Toothbrush")
right_target = make_empty("ReachProps_RightHand_Toothpaste")

key_frames = [1, 12, 24, 36, 48, 56, 64, 72, 80, 92, 108, 120]
for frame in key_frames:
    scene.frame_set(frame)
    bpy.context.view_layer.update()

    brush_loc = brush.matrix_world.translation
    tube_loc = tube.matrix_world.translation

    # Keep targets just behind and slightly below the held objects: closer to the palm,
    # without forcing the wrist exactly onto the prop center.
    left_target.location = brush_loc + Vector((0.03, 0.055, -0.025))
    right_target.location = tube_loc + Vector((-0.03, 0.055, -0.025))

    left_target.keyframe_insert(data_path="location", frame=frame)
    right_target.keyframe_insert(data_path="location", frame=frame)

add_soft_ik(arm.pose.bones["LeftHand"], left_target, 0.62)
add_soft_ik(arm.pose.bones["RightHand"], right_target, 0.62)
add_forearm_pull(arm.pose.bones["LeftForeArm"], left_target, 0.08)
add_forearm_pull(arm.pose.bones["RightForeArm"], right_target, 0.08)

# A small shoulder/forearm reach rotation sells the hands moving forward without
# forcing the elbows into the extreme IK fold.
pose_offsets = {
    1: {
        "LeftArm": (-0.04, 0.08, 0.08),
        "LeftForeArm": (0.08, -0.02, -0.10),
        "RightArm": (-0.04, -0.08, -0.08),
        "RightForeArm": (0.08, 0.02, 0.10),
    },
    36: {
        "LeftArm": (-0.15, 0.16, 0.14),
        "LeftForeArm": (0.16, -0.03, -0.16),
        "RightArm": (-0.15, -0.16, -0.14),
        "RightForeArm": (0.16, 0.03, 0.16),
    },
    56: {
        "LeftArm": (-0.18, 0.18, 0.16),
        "LeftForeArm": (0.18, -0.03, -0.18),
        "RightArm": (-0.18, -0.18, -0.16),
        "RightForeArm": (0.18, 0.03, 0.18),
    },
    80: {
        "LeftArm": (-0.18, 0.18, 0.16),
        "LeftForeArm": (0.18, -0.03, -0.18),
        "RightArm": (-0.18, -0.18, -0.16),
        "RightForeArm": (0.18, 0.03, 0.18),
    },
    120: {
        "LeftArm": (-0.06, 0.10, 0.10),
        "LeftForeArm": (0.10, -0.02, -0.12),
        "RightArm": (-0.06, -0.10, -0.10),
        "RightForeArm": (0.10, 0.02, 0.12),
    },
}
for frame, bones in pose_offsets.items():
    scene.frame_set(frame)
    for bone_name, rot in bones.items():
        pb = arm.pose.bones.get(bone_name)
        if pb:
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = rot
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

for action in bpy.data.actions:
    set_bezier(action)

scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
