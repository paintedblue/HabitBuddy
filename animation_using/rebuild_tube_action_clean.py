import math
import bpy
from mathutils import Vector, Euler, Matrix

tube = bpy.data.objects["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]
nozzle = bpy.data.objects["Toothpaste_proxy_nozzle"]

old_action = tube.animation_data.action if tube.animation_data and tube.animation_data.action else None
tube.animation_data_clear()
if old_action and old_action.users == 0:
    bpy.data.actions.remove(old_action)

for con in list(tube.constraints):
    if con.name.startswith("Reference_ChildOf_"):
        tube.constraints.remove(con)

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
    80: ((-0.1794, -0.5051, 0.7319), (1.10, 1.10, 1.10)),
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

con = tube.constraints.new(type="CHILD_OF")
con.name = "Reference_ChildOf_LeftHand"
con.target = bpy.data.objects["Armature"]
con.subtarget = "LeftHand"
con.influence = 0.0

bpy.context.scene.frame_set(80)
bpy.context.view_layer.update()
print("TUBE80", tuple(tube.matrix_world.translation))

bpy.ops.wm.save_as_mainfile(filepath="/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")
