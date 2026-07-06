import bpy
import math

tube = bpy.data.objects["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]
action = tube.animation_data.action

fixed_values = {
    ("location", 0): {72: -0.1794, 80: -0.1794, 81: -0.1794},
    ("location", 2): {72: 0.7319, 80: 0.7319, 81: 0.7319},
}

for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for fc in bag.fcurves:
                key = (fc.data_path, fc.array_index)
                if key not in fixed_values:
                    continue
                for kp in fc.keyframe_points:
                    frame = int(round(kp.co.x))
                    if frame in fixed_values[key]:
                        value = fixed_values[key][frame]
                        kp.co.y = value
                        kp.handle_left.y = value
                        kp.handle_right.y = value
                    if isinstance(kp.co.y, float) and math.isnan(kp.co.y):
                        value = fixed_values[key].get(frame, 0.0)
                        kp.co.y = value
                        kp.handle_left.y = value
                        kp.handle_right.y = value
                    if isinstance(kp.handle_left.y, float) and math.isnan(kp.handle_left.y):
                        kp.handle_left.y = kp.co.y
                    if isinstance(kp.handle_right.y, float) and math.isnan(kp.handle_right.y):
                        kp.handle_right.y = kp.co.y
                    kp.interpolation = "BEZIER"
                fc.update()

bpy.context.scene.frame_set(80)
bpy.context.view_layer.update()
print("FIXED_TUBE80", tuple(tube.matrix_world.translation))

bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
