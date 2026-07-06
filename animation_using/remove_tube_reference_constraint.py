import bpy

tube = bpy.data.objects["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]
for con in list(tube.constraints):
    tube.constraints.remove(con)

bpy.context.scene.frame_set(80)
bpy.context.view_layer.update()
print("TUBE80_NO_CONSTRAINT", tuple(tube.matrix_world.translation))

bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
