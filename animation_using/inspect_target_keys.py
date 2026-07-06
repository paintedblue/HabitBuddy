import bpy

for name in ["RightHand_IK_ForwardGrip", "LeftHand_IK_ForwardGrip"]:
    o = bpy.data.objects.get(name)
    print("TARGET", name, "loc", tuple(o.location), "action", o.animation_data.action.name if o.animation_data and o.animation_data.action else None)
    action = o.animation_data.action if o.animation_data else None
    if action:
        for layer in getattr(action, "layers", []):
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        print("FC", fc.data_path, fc.array_index, [(round(k.co.x, 2), round(k.co.y, 4)) for k in fc.keyframe_points])
