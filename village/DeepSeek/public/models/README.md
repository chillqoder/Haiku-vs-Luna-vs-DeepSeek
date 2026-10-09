# Character model contract

The diorama runs **with zero external assets**: every NPC is generated
procedurally in `src/diorama/characters/CharacterFactory.ts` using flat-shaded
primitives. Authored GLBs are an optional upgrade.

## Enabling a GLB

1. Export a `.glb` per character (feet at the origin, character facing `+Z`,
   meters as units, in-place animations only — root motion is driven by the
   controller).
2. Drop it into this folder, e.g. `king.glb`, `guard.glb`, `peasant.glb`.
3. Map the rig kind in `src/diorama/simulation/manifest.ts`:

```ts
const MODEL_FILES: Partial<Record<RigKind, string>> = {
  king: 'king.glb',
  guard: 'guard.glb',
};
```

Any entry left unmapped (or any file that fails to load) silently falls back
to the procedural rig, so partial adoption is safe.

## Node naming contract

The loader (`rigFromGltfScene`) matches node names case-insensitively,
stripping non-letters. Missing nodes are replaced by empty proxy objects so
controllers keep working.

| Rig slot | Accepted node names                      |
| -------- | ---------------------------------------- |
| Torso    | `Torso`, `Body`, `Spine`, `Chest`        |
| Head     | `Head`                                   |
| Arms     | `ArmL` / `LeftArm`, `ArmR` / `RightArm`  |
| Legs     | `LegL` / `LeftLeg`, `LegR` / `RightLeg`  |
| Hands    | `HandL` / `LeftHand`, `HandR` / `RightHand` |
| Tool     | `Tool` (child of `HandR`)                |

## Animation clips

Clip names come straight from the animation breakdown sheet. Use these exact
names in the GLB so the manifest references resolve:

| Character    | Clip name           | Loop  |
| ------------ | ------------------- | ----- |
| King         | `Observe_Gaze_Turn` | 8 s   |
| Guards       | `Patrol_Segment`    | —     |
| Lumberjack   | `Chop_Lift_Rest`    | 4 s   |
| Cook         | `Stir_Taste_Refill` | 5 s   |
| Fisherman    | `Cast_Wait_Reel`    | 8 s   |
| Children     | `Chase_1_Chase_2`   | —     |

When a clip is found, the controller defers limb animation to the
`AnimationMixer` but still owns waypoint navigation, facing and ripple
spawning.

## Draco

Compressed GLBs are supported out of the box; the loader registers a
`DRACOLoader` pointing at `/draco/`. Ship the decoder files there if you use
Draco compression.
