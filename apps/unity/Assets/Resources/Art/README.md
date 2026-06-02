# HabitBuddy 3D Asset Drop-in Guide

Put Unity prefabs here to replace the procedural fallback scene.

## Required prefab paths

- `Assets/Resources/Art/Characters/Bear.prefab`
- `Assets/Resources/Art/Characters/Bunny.prefab`
- `Assets/Resources/Art/Rooms/KidsRoom.prefab`
- `Assets/Resources/Art/Rooms/Bathroom.prefab`

Unity loads these through `Resources.Load`, so the prefab names and folders must match exactly.

## Character prefab conventions

Preferred child names for procedural fallback animation compatibility:

- `LeftArm`
- `RightArm`
- `LeftLeg`
- `RightLeg`
- `Toothbrush`

If the model has an `Animator`, HabitBuddy will use it first. Add trigger parameters named:

- `Appear`
- `Walk`
- `Beckon`
- `CoPerform`
- `Celebrate`

If those triggers are missing, Unity will log Animator warnings, so either add them or remove the Animator from the prefab and let the fallback transform animation run.

## Room prefab conventions

Optional anchors:

- `RoomFocus`
- `BathroomFocus`
- `SinkFocus`
- `ToothbrushProp`
- `SoapProp`

These let the routine camera and habit props find the correct scene points. If they are absent, the prefab root is used as the focus.

## Recommended asset format

Use FBX prefabs for the first pass. Import GLB only if a Unity glTF importer package is added later.
