import bpy


BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

ARM = "Armature"
BRUSH = "Toothbrush"
TUBE = "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"

ARM_ACTION = "PREP_brush_teeth_1_squeeze_toothpaste"
BRUSH_ACTION = "PREP_brush_teeth_1_squeeze_toothpaste_Toothbrush"
TUBE_ACTION = "PREP_brush_teeth_1_squeeze_toothpaste_Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"

# Positive Y is back toward the character in this scene. Move both held props by
# the same amount so the nozzle/bristle contact stays intact while the arms can
# remain close to the original pose.
BODY_SIDE_Y_OFFSET = 0.30


def remove_helpers():
    prefixes = (
        "RightHand_IK_ForwardGrip",
        "LeftHand_IK_ForwardGrip",
        "RightHandGrip_CTRL",
        "LeftHandGrip_CTRL",
        "Forward_",
        "RightGrip_",
        "LeftGrip_",
        "ReachProps_",
        "Toothpaste_blob_on_bristles",
        "Toothpaste_nozzle_ribbon",
    )
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def clear_added_constraints(arm):
    for pb in arm.pose.bones:
        for con in list(pb.constraints):
            if con.name.startswith(("ForwardGrip_", "BrushSequence_", "ReachProps_")):
                pb.constraints.remove(con)


def shift_location_y(action, amount):
    if not action:
        return

    def process_fcurve(fc):
        if fc.data_path == "location" and fc.array_index == 1:
            for kp in fc.keyframe_points:
                kp.co.y += amount
                kp.handle_left.y += amount
                kp.handle_right.y += amount
                kp.interpolation = "BEZIER"
            fc.update()
        else:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
            fc.update()

    if hasattr(action, "layers"):
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        process_fcurve(fc)

    if hasattr(action, "fcurves"):
        for fc in action.fcurves:
            process_fcurve(fc)


def assign_action(obj_name, action_name):
    obj = bpy.data.objects.get(obj_name)
    action = bpy.data.actions.get(action_name)
    if obj and action:
        obj.parent = None
        obj.animation_data_create()
        obj.animation_data.action = action
    return obj, action


scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 24

arm = bpy.data.objects.get(ARM)
if not arm:
    raise RuntimeError("Missing Armature")

remove_helpers()
clear_added_constraints(arm)

arm.animation_data_create()
if bpy.data.actions.get(ARM_ACTION):
    arm.animation_data.action = bpy.data.actions[ARM_ACTION]

brush, brush_action = assign_action(BRUSH, BRUSH_ACTION)
tube, tube_action = assign_action(TUBE, TUBE_ACTION)

# Apply the body-side shift to a fresh restored backup action exactly once.
shift_location_y(brush_action, BODY_SIDE_Y_OFFSET)
shift_location_y(tube_action, BODY_SIDE_Y_OFFSET)

bristles = bpy.data.objects.get("Toothbrush_bristles")
if bristles and brush:
    bristles.parent = brush
    bristles.location = (-0.115, 0.0, 0.025)
    bristles.rotation_euler = (0, 0, 0)
    bristles.scale = (1, 1, 1)

nozzle = bpy.data.objects.get("Toothpaste_proxy_nozzle")
if nozzle and tube:
    nozzle.parent = tube
    nozzle.location = (0.135, 0, 0)
    nozzle.rotation_euler = (0, 0, 0)
    nozzle.scale = (1, 1, 1)

scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
