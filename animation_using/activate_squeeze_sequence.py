import bpy

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 24

assignments = {
    "Armature": "PREP_brush_teeth_1_squeeze_toothpaste",
    "Toothbrush": "PREP_brush_teeth_1_squeeze_toothpaste_Toothbrush",
    "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET": "PREP_brush_teeth_1_squeeze_toothpaste_Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET",
}

for obj_name, action_name in assignments.items():
    obj = bpy.data.objects.get(obj_name)
    action = bpy.data.actions.get(action_name)
    if obj and action:
        obj.animation_data_create()
        obj.animation_data.action = action
        print("ASSIGNED", obj_name, action_name, tuple(action.frame_range))
    else:
        print("MISSING", obj_name, action_name)

char = bpy.data.objects.get("char1")
shape_action = bpy.data.actions.get("PREP_brush_teeth_1_squeeze_toothpaste_ShapeKeys")
if char and char.data.shape_keys and shape_action:
    char.data.shape_keys.animation_data_create()
    char.data.shape_keys.animation_data.action = shape_action
    print("ASSIGNED_SHAPEKEYS", shape_action.name, tuple(shape_action.frame_range))

# Make sure the intended prop set is visible.
for name in ["Toothbrush", "Toothbrush_bristles", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET", "Toothpaste_proxy_nozzle"]:
    obj = bpy.data.objects.get(name)
    if obj:
        obj.hide_viewport = False
        obj.hide_render = False

# Keep interpolation Bezier for exposed legacy fcurves; Blender 5 layered actions are left intact.
for action in bpy.data.actions:
    if hasattr(action, "fcurves"):
        for fc in action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"

scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
