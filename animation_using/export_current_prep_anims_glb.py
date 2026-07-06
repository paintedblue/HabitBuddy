import bpy


BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"
OUT_GLB = "/Users/young/Desktop/HabitBuddy_3d_react/apps/web/public/assets/characters/fox_brushing_teeth_v4_prep_anims.glb"

bpy.ops.wm.open_mainfile(filepath=BLEND)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    export_animations=True,
    export_nla_strips=True,
    export_frame_range=True,
)
print(f"Exported {OUT_GLB}")
