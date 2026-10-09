# Skyhold Village — Technical Blueprint

Complete architecture, contracts and implementation notes for the modular
Next.js + Three.js floating-island diorama.

---

## 1. Objectives & constraints

| Requirement | Decision |
| --- | --- |
| Next.js App Router, TypeScript | App router, strict TS, server components by default |
| Full-screen WebGL canvas | `DioramaApp` owns renderer, `ResizeObserver`, RAF loop |
| Low-poly flat shading | `flatShading: true` on every shared `MeshStandardMaterial` |
| Crisp low-poly shadows | `PCFSoftShadowMap`, 2048² shadow map, tuned frustum |
| < 15 characters | 13 NPCs, 7 controller archetypes |
| Simulation data updates without recompiling | Scene manifest served by an API route, fetched at boot |
| No WebGL context leaks | `DioramaApp.dispose()` traversal + `forceContextLoss()` |
| SSR-safe | Canvas behind `dynamic(..., { ssr: false })` client wrapper |

## 2. Stack

- **Next.js 14.2** (App Router) + React 18
- **three 0.169** (`three/examples/jsm` for `OrbitControls`, `GLTFLoader`, `DRACOLoader`)
- No physics engine, no state library — the render loop is the single clock.

## 3. System architecture

```
┌─────────────────────── Server (Node) ────────────────────────┐
│  app/page.tsx  (RSC)                                         │
│      └─ components/DioramaCanvasMount.tsx  ('use client')    │
│              └─ dynamic import { ssr:false }                 │
│  app/api/simulation-config/route.ts                          │
│      └─ simulation/manifest.ts  (pure data)                  │
│              └─ world/layout.ts  (single source of truth)    │
└──────────────────────────────────────────────────────────────┘
                              │ JSON manifest (fetch, no-store)
┌─────────────────────── Client (WebGL) ───────────────────────┐
│  DioramaCanvas.tsx                                           │
│      └─ core/DioramaApp.ts                                   │
│           ├─ core/CameraController.ts  (OrbitControls)       │
│           ├─ core/Lighting.ts          (sun + hemisphere)    │
│           ├─ world/World.ts                                  │
│           │    ├─ Island.ts        (terrain, paths, shore)   │
│           │    ├─ Buildings.ts     (castle, cottages, well)  │
│           │    ├─ Environment.ts   (trees, fire, dock, props)│
│           │    └─ Water.ts         (pond + ripple pool)      │
│           └─ simulation/CharacterManager.ts                  │
│                └─ controllers (King/Guard/…) → rigs          │
└──────────────────────────────────────────────────────────────┘
```

### Frame loop

```
RAF tick
 ├─ Time.update()                 → clamped dt (≤ 50 ms)
 ├─ World.update(elapsed, dt)     → smoke, ripples, flame flicker, flag
 ├─ CharacterManager.update()     → dt × timeScale, per-NPC controller.update
 ├─ CameraController.update()     → OrbitControls damping
 └─ renderer.render(scene, camera)
```

## 4. Directory structure

```
village/DeepSeek
├─ public/models/            # GLB drop-in folder + palette.json + contract README
├─ docs/BLUEPRINT.md
├─ src
│  ├─ app
│  │  ├─ api/simulation-config/route.ts
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components
│  │  ├─ DioramaCanvas.tsx
│  │  └─ DioramaCanvasMount.tsx
│  └─ diorama
│     ├─ core
│     │  ├─ CameraController.ts
│     │  ├─ DioramaApp.ts
│     │  └─ Lighting.ts
│     ├─ world
│     │  ├─ Buildings.ts   Environment.ts   Island.ts
│     │  ├─ Water.ts       Particles.ts     World.ts
│     │  ├─ layout.ts      meshUtils.ts     palette.ts
│     ├─ simulation
│     │  ├─ types.ts           manifest.ts
│     │  ├─ CharacterBase.ts   CharacterManager.ts
│     │  ├─ KingController.ts  GuardController.ts
│     │  ├─ LumberjackController.ts  CookController.ts
│     │  ├─ FishermanController.ts   ChildrenController.ts
│     │  └─ VillagerController.ts
│     ├─ characters/CharacterFactory.ts
│     └─ utils/{AssetLoader,Time,geometry,rng}.ts
```

## 5. API contract — `GET /api/simulation-config`

Route: `src/app/api/simulation-config/route.ts` (`force-dynamic`, `no-store`).

Query parameters:

| Param | Range | Effect |
| --- | --- | --- |
| `timeScale` | 0.25 – 2 | Global simulation speed multiplier |

Response (abridged):

```jsonc
{
  "version": 1,
  "generatedAt": "2026-10-09T11:30:24.966Z",
  "timeScale": 1,
  "environment": {
    "clearColor": "#b6dcff",
    "fog": { "color": "#cfe6fb", "near": 60, "far": 150 },
    "sun": { "position": [14, 24, 10], "color": "#ffe6bd", "intensity": 2.4 },
    "hemisphere": { "skyColor": "#cfe6ff", "groundColor": "#7d8f5e", "intensity": 0.8 },
    "camera": {
      "target": [0, 0, 0], "minDistance": 16, "maxDistance": 48,
      "minPolarDeg": 15, "maxPolarDeg": 75, "dampingFactor": 0.05
    }
  },
  "assets": { "basePath": "/models/", "dracoPath": "/draco/", "palette": "/models/palette.json" },
  "waypoints": {
    "guard-gate": [[-1.7, 2.2, -1.9], [1.7, 2.2, -1.9]],
    "guard-perimeter": [[4.6, 2.2, -4.2], "..."],
    "roam-ring": [[5.0, 2.2, 2.0], "..."]
  },
  "characters": [
    {
      "id": "king",
      "kind": "king",
      "controller": "king",
      "model": null,                      // "king.glb" once authored
      "position": [0, 4, -6.3],
      "rotationY": 0,
      "clip": "Observe_Gaze_Turn",
      "params": { "loopSeconds": 8 }
    }
  ]
}
```

`layout.ts` is the single source of truth: the manifest (server) and the world
builders (client) read identical coordinates, so NPC spawns always sit on the
baked terrain.

## 6. World layout (from the scene breakdown sheet)

| Region | Contents | Coordinates (approx.) |
| --- | --- | --- |
| North (elevated) | Castle keep on rocky terrace, balcony, flag | `(0, 4.0, −6.3)` balcony |
| Village center (south) | Stone plaza + well, children tag route r = 2.6 | `(0, 2.2, 2.8)` |
| West | Pond r 3.1, shore ring, dock, fisherman seat | pond `(−7.2, 0.4)` |
| East | Woodcutting stump, logs, worker | `(6.2, 2.2, 1.6)` |
| South-east | Cottage cluster + campfire, cook, cauldron | fire `(2.5, 2.2, 4.3)` |
| Ring | 12 mixed pine/oak trees, fences, barrels, crates, benches | r ≈ 11–13 |

Terrain is one jittered 14-gon plateau (`triangleFan`) with three tapering
cliff bands (`ringBand`) closed by a tip cone (`coneTip`), plus hanging rock
spires and floating rubble. All shapes are non-indexed with per-face normals,
which is what produces the faceted look even before `flatShading`.

## 7. Animation state machines

All loops are deterministic functions of `elapsed % loopSeconds` with
`smoothstep` easing — no accumulated drift, phase-offset ready.

| Controller | Loop | Phases | Procedural channels |
| --- | --- | --- | --- |
| King | 8 s | survey 0–4.2 → raise 4.2–5.4 → gesture 5.4–6.6 → rest 6.6–8 | head yaw ±0.65, armR lift −2.45 rad + wave |
| Guard | — | `walk` → `inspect` (2 s) → `turn` (0.9 s slerp) → walk back | leg/arm swing, 3.5 cm bob, head sweep on inspect |
| Lumberjack | 4 s | idle 0–0.9 → raise 0.9–1.7 → chop 1.7–2.05 → impact 2.05–2.6 → reset | both arms 0→2.55→−0.95 rad, torso lean, head follow |
| Cook | 5 s | stir 0–2.6 → taste 2.6–3.4 → brow wipe 3.4–4.1 → resume | armR circle ω = 2.8, head tilt |
| Fisherman | 8 s | cast 0–0.9 → wait 0.9–6 (tug every 1.5 s + ripple) → reel 6–7.2 → settle | seated legs −1.45 rad, rod arm, `Water.spawnRipple` at rod tip |
| Children | ∞ | angle = ω·t − trail (child B trails 0.55 rad, ±18 % surge) | 10 Hz run cycle, bounce, lean |
| Villager (roamer) | — | `walk` → random `pause` 2–5 s → wrap ring | slow cycle, idle sway, head wander |

Waypoint navigation (guards/roamers) moves `root.position` directly and damps
`root.rotation.y` via shortest-path angle damping; clips must be in-place.

## 8. Character rig & asset pipeline

Two interchangeable sources feed the same `CharacterRig`:

1. **Procedural (default).** `CharacterFactory.buildCharacterRig()` assembles
   ~30 flat-shaded primitives per character: pivoted `legL/R`, `armL/R`
   groups, `torso`, `head` (+ crown/helmet/straw/chef gear), hands and a
   tool group (`axe`, `spear`, `rod` with `userData.tip`, `ladle`).
   A `parts[]` table stores rest transforms; controllers reset every frame
   and apply absolute poses, so nothing drifts.
2. **GLB (opt-in).** `rigFromGltfScene()` matches documented node names
   (case-insensitive, non-letter stripping); missing parts become empty
   proxies. Clips named per `public/models/README.md` are played through an
   `AnimationMixer`; the controller then skips limb animation but keeps
   navigation, facing and ripple side-effects.

`AssetLoader` caches load promises and never throws: a 404 resolves to
`null` and the procedural rig is used, with one `console.info` line.

## 9. Rendering & lighting

- `WebGLRenderer`: antialias, DPR clamped to 2, `SRGBColorSpace`.
- `DirectionalLight` sun: warm `#ffe6bd` @ 2.4, shadow frustum ±22, bias
  −0.0006, `normalBias` 0.03.
- `HemisphereLight` `#cfe6ff`/`#7d8f5e` @ 0.8 for soft sky/ground fill.
- Fog `#cfe6fb` 60→150 frames the floating silhouette against the sky.
- Materials are cached by color + options (`flatMat`), so the whole scene
  shares a small material set; smoke uses a per-emitter `PointsMaterial`,
  ripples a small pool of opacity-animated `MeshBasicMaterial` rings.

**Budget:** ~350 draws (4 cottages, castle, 12 trees, 13 characters, props,
smoke/ripples), well within a 16 ms frame on mid hardware. If it ever grows,
merge static props per material (`BufferGeometryUtils.mergeGeometries`);
dynamic pieces stay separate.

## 10. Lifecycle & cleanup

`DioramaCanvas` mounts `DioramaApp` in an effect and disposes it on unmount
(React StrictMode-safe: dispose is idempotent). `dispose()`:

1. cancels RAF, disconnects `ResizeObserver`,
2. stops mixers / uncaches roots (`CharacterManager.dispose`),
3. `controls.dispose()`, `Time.dispose()`,
4. traverses the scene collecting unique geometries, materials and textures
   → disposes each exactly once,
5. `renderer.dispose()` + `renderer.forceContextLoss()`, removes the canvas.

Because the app also re-fetches the manifest on mount, StrictMode's double
mount is harmless — the second instance atomically replaces the first.

## 11. Dynamic configuration workflow

1. Edit `src/diorama/simulation/manifest.ts` (spawns, params, clips) or
   `world/layout.ts` (geometry anchors) — both are plain data.
2. Restart to pick up new layout; or point `configUrl`
   (`<DioramaCanvas configUrl="…" />`) at any endpoint serving the same
   `SimulationConfig` JSON to update positions, speeds, loop lengths,
   patrol routes, lighting and camera limits **without touching client
   code**.
3. `?timeScale=` demonstrates runtime overrides (0.25–2×).

## 12. Verification

```bash
npm run typecheck        # strict TS across app + engine
npm run build            # production build incl. lint
npm run start            # smoke test
curl -s localhost:3000/api/simulation-config | jq .characters | jq length   # 13
```

Manual QA checklist: orbit clamps, no pan, shadows crisp, king loop reads in
8 s, guards turn 180° cleanly, ripples spawn only on rod tugs, chimney smoke
continuous, resize keeps DPR crisp, unmount leaves no WebGL context warning.

## 13. Roadmap

- Authored GLB roster + Draco decoder files in `public/draco/`.
- True pond depression via a heightfield variant of the plateau fan.
- Day/night cycle driving sun color and window emissives.
- Merge/instance static props if the tree/prop count grows.
- Optional post-processing (SSAO) behind a quality toggle.
