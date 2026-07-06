import json
from pathlib import Path

import bpy
from mathutils import Vector


BLEND = Path("/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend")


def bbox(obj):
    coords = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mn = Vector((min(v.x for v in coords), min(v.y for v in coords), min(v.z for v in coords)))
    mx = Vector((max(v.x for v in coords), max(v.y for v in coords), max(v.z for v in coords)))
    return {
        "min": [round(v, 4) for v in mn],
        "max": [round(v, 4) for v in mx],
        "center": [round(v, 4) for v in (mn + mx) / 2],
        "size": [round(v, 4) for v in (mx - mn)],
    }


bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene = bpy.context.scene
arm = bpy.data.objects["Armature"]
arm.animation_data.action = bpy.data.actions["PREP_brush_teeth_1_squeeze_toothpaste"]
scene.frame_set(48)
bpy.context.view_layer.update()

data = {}
for name in ["char1", "Toothbrush", "Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET", "Toothpaste_proxy_nozzle"]:
    obj = bpy.data.objects.get(name)
    if obj:
        data[name] = {
            "parent": obj.parent.name if obj.parent else None,
            "parent_type": obj.parent_type,
            "parent_bone": obj.parent_bone,
            "hide_render": obj.hide_render,
            "hide_viewport": obj.hide_viewport,
            "location": [round(v, 4) for v in obj.location],
            "scale": [round(v, 4) for v in obj.scale],
            "matrix_translation": [round(v, 4) for v in obj.matrix_world.translation],
            "bbox": bbox(obj),
        }
for bone in ["LeftHand", "RightHand"]:
    pb = arm.pose.bones[bone]
    data[bone] = {
        "head": [round(v, 4) for v in (arm.matrix_world @ pb.head)],
        "tail": [round(v, 4) for v in (arm.matrix_world @ pb.tail)],
    }
print("PROP_DEBUG_START" + json.dumps(data, indent=2) + "PROP_DEBUG_END")
