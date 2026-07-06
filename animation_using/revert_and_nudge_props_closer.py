import bpy

BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

# Remove every helper/control object created by the failed forward-grip pass.
helper_prefixes = (
    "RightGrip_",
    "LeftGrip_",
    "Forward_",
    "RightHandGrip_CTRL",
    "LeftHandGrip_CTRL",
    "RightHand_IK_ForwardGrip",
    "LeftHand_IK_ForwardGrip",
)
for obj in list(bpy.data.objects):
    if obj.name.startswith(helper_prefixes):
        bpy.data.objects.remove(obj, do_unlink=True)

arm = bpy.data.objects.get("Armature")
if arm:
    squeeze_action = bpy.data.actions.get("PREP_brush_teeth_1_squeeze_toothpaste")
    arm.animation_data_create()
    if squeeze_action:
        arm.animation_data.action = squeeze_action
    for pb in arm.pose.bones:
        for con in list(pb.constraints):
            if con.name.startswith("ForwardGrip_"):
                pb.constraints.remove(con)

# Restore intended active prop actions.
assignments = {
    "Toothbrush": "PREP_brush_teeth_1_squeeze_toothpaste_Toothbrush",
    "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET": "PREP_brush_teeth_1_squeeze_toothpaste_Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET",
}

for obj_name, action_name in assignments.items():
    obj = bpy.data.objects.get(obj_name)
    action = bpy.data.actions.get(action_name)
    if not obj or not action:
        continue
    obj.parent = None
    obj.animation_data_create()
    obj.animation_data.action = action
    for con in list(obj.constraints):
        obj.constraints.remove(con)

# The existing animation is otherwise good; move both held props just a bit back toward the hands.
# In this scene the props were too far forward on Y, so increasing Y makes them sit closer to the palms.
NUDGE_Y = 0.045
prop_action_names = [
    "PREP_brush_teeth_1_squeeze_toothpaste_Toothbrush",
    "PREP_brush_teeth_1_squeeze_toothpaste_Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET",
]

for action_name in prop_action_names:
    action = bpy.data.actions.get(action_name)
    if not action:
        continue
    # Blender 5 layered actions.
    if hasattr(action, "layers"):
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        if fc.data_path == "location" and fc.array_index == 1:
                            for kp in fc.keyframe_points:
                                kp.co.y += NUDGE_Y
                                kp.handle_left.y += NUDGE_Y
                                kp.handle_right.y += NUDGE_Y
                                kp.interpolation = "BEZIER"
                            fc.update()
                        else:
                            for kp in fc.keyframe_points:
                                kp.interpolation = "BEZIER"
    # Legacy fallback.
    if hasattr(action, "fcurves"):
        for fc in action.fcurves:
            if fc.data_path == "location" and fc.array_index == 1:
                for kp in fc.keyframe_points:
                    kp.co.y += NUDGE_Y
                    kp.handle_left.y += NUDGE_Y
                    kp.handle_right.y += NUDGE_Y
                    kp.interpolation = "BEZIER"
                fc.update()
            else:
                for kp in fc.keyframe_points:
                    kp.interpolation = "BEZIER"

# Keep original children attached to props.
bristles = bpy.data.objects.get("Toothbrush_bristles")
brush = bpy.data.objects.get("Toothbrush")
if bristles and brush:
    bristles.parent = brush
    bristles.location = (-0.115, 0.0, 0.025)
    bristles.rotation_euler = (0, 0, 0)
    bristles.scale = (1, 1, 1)

nozzle = bpy.data.objects.get("Toothpaste_proxy_nozzle")
tube = bpy.data.objects.get("Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET")
if nozzle and tube:
    nozzle.parent = tube
    nozzle.location = (0.135, 0, 0)
    nozzle.rotation_euler = (0, 0, 0)
    nozzle.scale = (1, 1, 1)

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 24
scene.frame_set(1)

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
