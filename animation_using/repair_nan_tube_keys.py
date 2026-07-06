import bpy

tube = bpy.data.objects["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]

for fc in tube.animation_data.action.fcurves:
    if fc.data_path in {"location", "rotation_euler", "scale"}:
        for kp in fc.keyframe_points:
            if abs(kp.co.x - 80) < 0.001:
                if fc.data_path == "location":
                    values = [-0.1794, -0.5051, 0.7319]
                    kp.co.y = values[fc.array_index]
                    kp.handle_left.y = kp.co.y
                    kp.handle_right.y = kp.co.y
                elif fc.data_path == "rotation_euler":
                    values = [0.0, -0.2094395102, 0.0]
                    kp.co.y = values[fc.array_index]
                    kp.handle_left.y = kp.co.y
                    kp.handle_right.y = kp.co.y
                elif fc.data_path == "scale":
                    values = [1.10, 1.10, 1.10]
                    kp.co.y = values[fc.array_index]
                    kp.handle_left.y = kp.co.y
                    kp.handle_right.y = kp.co.y
            kp.interpolation = "BEZIER"
        fc.update()

bpy.context.scene.frame_set(80)
tube.location = (-0.1794, -0.5051, 0.7319)
tube.rotation_euler = (0, -0.2094395102, 0)
tube.scale = (1.10, 1.10, 1.10)
tube.keyframe_insert(data_path="location", frame=80)
tube.keyframe_insert(data_path="rotation_euler", frame=80)
tube.keyframe_insert(data_path="scale", frame=80)

bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
