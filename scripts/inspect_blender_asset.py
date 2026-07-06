import json
import sys
from pathlib import Path

import bpy


asset_path = Path(sys.argv[-1])

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=str(asset_path))

scene = bpy.context.scene

armatures = []
for obj in bpy.data.objects:
    if obj.type == "ARMATURE":
        bones = []
        for pb in obj.pose.bones:
            bones.append(
                {
                    "name": pb.name,
                    "rotation_mode": pb.rotation_mode,
                    "parent": pb.parent.name if pb.parent else None,
                }
            )
        armatures.append({"name": obj.name, "bones": bones})

shape_keys = {}
for obj in bpy.data.objects:
    if obj.type == "MESH" and obj.data.shape_keys:
        shape_keys[obj.name] = [kb.name for kb in obj.data.shape_keys.key_blocks]

objects = []
for obj in bpy.data.objects:
    objects.append(
        {
            "name": obj.name,
            "type": obj.type,
            "parent": obj.parent.name if obj.parent else None,
            "dimensions": [round(v, 4) for v in obj.dimensions],
            "materials": [slot.material.name for slot in obj.material_slots if slot.material],
        }
    )

actions = [a.name for a in bpy.data.actions]

print(
    "ASSET_INSPECT_JSON_START"
    + json.dumps(
        {
            "asset": str(asset_path),
            "fps": scene.render.fps,
            "frame_start": scene.frame_start,
            "frame_end": scene.frame_end,
            "armatures": armatures,
            "shape_keys": shape_keys,
            "objects": objects,
            "actions": actions,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "ASSET_INSPECT_JSON_END"
)
