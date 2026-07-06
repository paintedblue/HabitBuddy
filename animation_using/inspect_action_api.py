import bpy

obj = bpy.data.objects["Toothpaste_proxy_REPLACE_WITH_FINAL_ASSET"]
action = obj.animation_data.action if obj.animation_data else None
print("ACTION", action, type(action))
if action:
    print("DIR", [a for a in dir(action) if not a.startswith("_")])
    print("SLOTS", getattr(action, "slots", None))
    print("LAYERS", getattr(action, "layers", None))
    for layer in getattr(action, "layers", []):
        print("LAYER", layer, type(layer), [a for a in dir(layer) if not a.startswith("_")])
        for strip in getattr(layer, "strips", []):
            print("STRIP", strip, type(strip), [a for a in dir(strip) if not a.startswith("_")])
            print("STRIP CHANNELBAGS", getattr(strip, "channelbags", None))
            for bag in getattr(strip, "channelbags", []):
                print("BAG", bag, type(bag), [a for a in dir(bag) if not a.startswith("_")])
                print("BAG FCURVES", getattr(bag, "fcurves", None))
                for fc in getattr(bag, "fcurves", []):
                    print("FC", fc.data_path, fc.array_index, len(fc.keyframe_points))
                    for kp in fc.keyframe_points:
                        if 70 <= kp.co.x <= 92:
                            print("KP", kp.co[:], kp.interpolation, kp.handle_left[:], kp.handle_right[:])
