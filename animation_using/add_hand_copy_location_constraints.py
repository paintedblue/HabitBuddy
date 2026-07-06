import bpy

BLEND = "/Users/young/Desktop/HabitBuddy_3d_react/animation_using/fox_brushing_teeth_v4_prep_anims.blend"

arm = bpy.data.objects["Armature"]
pairs = [
    ("RightHand", "RightHand_IK_ForwardGrip"),
    ("LeftHand", "LeftHand_IK_ForwardGrip"),
]

for bone_name, target_name in pairs:
    pb = arm.pose.bones[bone_name]
    for c in list(pb.constraints):
        if c.name.startswith("ForwardGrip_CopyLoc"):
            pb.constraints.remove(c)
    c = pb.constraints.new(type="COPY_LOCATION")
    c.name = "ForwardGrip_CopyLoc_To_Grip"
    c.target = bpy.data.objects[target_name]
    c.target_space = "WORLD"
    c.owner_space = "WORLD"
    c.use_offset = False
    c.influence = 0.82

# Add a softer copy-location pull on forearms so the elbows visually reach forward with the hands.
soft_pairs = [
    ("RightForeArm", "RightHand_IK_ForwardGrip", 0.18),
    ("LeftForeArm", "LeftHand_IK_ForwardGrip", 0.18),
]
for bone_name, target_name, influence in soft_pairs:
    pb = arm.pose.bones[bone_name]
    for c in list(pb.constraints):
        if c.name.startswith("ForwardGrip_ForearmPull"):
            pb.constraints.remove(c)
    c = pb.constraints.new(type="COPY_LOCATION")
    c.name = "ForwardGrip_ForearmPull"
    c.target = bpy.data.objects[target_name]
    c.target_space = "WORLD"
    c.owner_space = "WORLD"
    c.use_offset = True
    c.influence = influence

bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
