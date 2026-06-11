# Character Assets — HabitBuddy 3D

3D characters and their motions for the React (react-three-fiber) app. Each
character is exported as a **self-contained `.glb`**: skinned mesh + skeleton +
animation, ready to drop into the app.

## Where files live

This `Character/` folder is the **Blender working / source folder**. The app
actually loads GLBs from the web app's public folder:

```
apps/web/public/assets/characters/        ← served at /assets/characters/...
├─ rabbit/rabbit_eating_vegetable_v1.glb
├─ squirrel/squirrel_eating_vegetable_v1.glb
├─ fox_brushing_teeth_v4.glb              ← pre-existing (squirrel brushing), kept at root
└─ HabitBuddy_eat_animation.glb           ← old combined eat export (superseded)
```

> When you re-export, update the file here in `Character/<id>/` **and** copy it
> into `apps/web/public/assets/characters/<id>/`. The app only sees the public copy.

```
Character/                        (this working folder)
├─ rabbit/rabbit_eating_vegetable_v1.glb
├─ squirrel/squirrel_eating_vegetable_v1.glb  (+ squirrel_*.fbx source motions)
├─ characters.manifest.json       ← machine-readable index (load this in the app)
├─ README.md                      ← this file
├─ Meshy_AI_Chipmunk_Cutie_..._fbx/  ← SOURCE squirrel mesh + textures
├─ Movement/                      ← SOURCE Mixamo motion clips (fbx)
└─ _archive/                      ← old/intermediate fbx iterations (safe to ignore)
```

## Naming convention

```
{character}_{motion}_v{N}.glb
```

e.g. `rabbit_eating_vegetable_v2.glb`. Bump `vN` on every re-export; never
overwrite a shipped version. Keep each character's files in its own
`<id>/` subfolder.

## The eating GLBs

| | Squirrel | Rabbit |
|---|---|---|
| File | `squirrel/squirrel_eating_vegetable_v1.glb` | `rabbit/rabbit_eating_vegetable_v1.glb` |
| Mesh | `char1` | `Mesh_0` |
| Skeleton | custom-31 (no finger bones, no `mixamorig:` prefix) | mixamorig-41 (with fingers) |
| Clips | `eat_vegetable`, `broccoli` | `eat_vegetable`, `broccoli` |
| Prop | broccoli (parented to left hand) | broccoli (parented to left hand) |
| Frames / fps | 1–192 @ 30 fps (6.4 s) | 1–192 @ 30 fps (6.4 s) |
| Root scale | 0.01 | 0.01 |
| Size | ~25 MB | ~21 MB |

Two clips per file by design: `eat_vegetable` drives the skeleton, `broccoli`
shrinks the prop to zero around frame 55 (the "bite"). **Play both together.**

> The two characters use **different skeletons**, so an animation clip from one
> will NOT play on the other without retargeting. New characters should be built
> on the **mixamorig** rig (like the rabbit) to keep motions interchangeable.

## Using a GLB in react-three-fiber

```jsx
import { useGLTF, useAnimations } from '@react-three/drei'
import { useEffect, useRef } from 'react'

export function Character({ file }) {
  const group = useRef()
  // file e.g. "/assets/characters/rabbit/rabbit_eating_vegetable_v1.glb"
  const { scene, animations } = useGLTF(file)
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    // play EVERY clip (eat_vegetable + broccoli) in sync
    Object.values(actions).forEach((a) => a.reset().play())
  }, [actions])

  return <primitive ref={group} object={scene} />
}
```

Load the manifest to list characters dynamically:

```js
import manifest from './characters.manifest.json'
manifest.characters.forEach(c => preload(`${manifest.assetBase}/${c.file}`))
// -> /assets/characters/rabbit/rabbit_eating_vegetable_v1.glb, etc.
```

## Reusing the SAME motion on a NEW character (the recipe)

The goal: any future character performs the identical "eat vegetable" motion.

1. **Rig the new character on the mixamorig skeleton.** Upload the mesh to
   Mixamo (or copy weights from the rabbit). Bone names must match the rabbit's
   (`mixamorig:Hips`, `mixamorig:LeftHand`, …) — this is what makes the clip reusable.
2. **In Blender, apply the eat action.** Open the eating `.blend`, select the new
   armature, and assign the `RT_Rabbit_EatVegetable` action (or copy it via the
   Action editor). Same bone names ⇒ it plays directly; different names ⇒ retarget
   (e.g. Auto-Rig Pro / Rokoko) first.
3. **Attach the broccoli prop.** Parent the broccoli to `mixamorig:LeftHand`
   (Object → Parent → Bone) and copy the `BroccoliRabbitEatAction` scale keys
   (full size frames 1–54, →0 at frame 57). Position it so the florets sit just
   above/in front of the fist (see the rabbit for reference offset).
4. **Export** with the exact settings below, into `Character/<id>/<id>_eating_vegetable_v1.glb`.
5. **Copy** the GLB to `apps/web/public/assets/characters/<id>/`, add an entry to
   `characters.manifest.json`, and bump the version in the filename.

## Export settings (keep these identical for every character)

Blender → File → Export → glTF 2.0 (`.glb`):

| Setting | Value |
|---|---|
| Format | `glTF Binary (.glb)` |
| Include | **Selected Objects** (select armature + mesh + props only) |
| Transform | **+Y Up** |
| Data → Mesh | Apply Modifiers ✓ |
| Animation → Mode | **Scene** |
| Animation | Frame range 1–192, Optimize Animation Size ✓ |
| Skinning | ✓ |

After export, rename the two clips to `eat_vegetable` and `broccoli` for
consistency (the app keys off these names).

**Heavy props:** the source broccoli is ~1.7 M triangles — far too heavy for web.
Add a temporary **Decimate** modifier (ratio ≈ 0.005) to the prop before export,
then remove it. This is what kept these files near ~20 MB instead of ~70 MB.
The source mesh in the `.blend` is left untouched.
