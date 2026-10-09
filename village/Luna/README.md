# Cloudrest — floating village diorama

Cloudrest is a full-screen, interactive low-poly village scene built with the Next.js App Router and Three.js. The scene is generated from local geometry, so the keep, island, homes, props, trees, and ten villagers appear without downloading any model files. Optional GLTF models can be added under `public/models/` later.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Drag to orbit, scroll to zoom, use **Reset view** to return to the starting camera, and use **Pause** to stop character and environment animation. The simulation-config route is available at `/api/simulation-config`.

## Project layout

```text
src/
├── app/
│   ├── api/simulation-config/route.ts  # Versioned scene manifest endpoint
│   ├── globals.css                     # Full-screen diorama interface
│   ├── layout.tsx                      # Metadata and root layout
│   └── page.tsx                        # UI and client-only scene import
├── components/
│   └── DioramaCanvas.tsx               # WebGL mount and React lifecycle bridge
└── diorama/
    ├── core/
    │   ├── CameraController.ts         # OrbitControls and camera bounds
    │   ├── DioramaApp.ts                # Renderer, resize, frame loop, cleanup
    │   └── Lighting.ts                  # Daylight, sky fill, and soft shadows
    ├── simulation/
    │   ├── CharacterFactory.ts          # Procedural low-poly humanoid rigs
    │   ├── CharacterManager.ts          # Manifest, asset loading, ticks, ripples
    │   ├── GuardController.ts           # Gate patrol and turn timing
    │   ├── KingController.ts            # Survey and royal gesture loop
    │   └── VillagerController.ts        # Work, fishing, play, and ambient loops
    ├── utils/
    │   ├── AssetLoader.ts               # Cached GLTFLoader + Draco pipeline
    │   ├── dispose.ts                   # Geometry, material, and texture cleanup
    │   └── Time.ts                      # Capped delta-time clock
    ├── world/
    │   ├── Buildings.ts                 # Keep and timber cottages
    │   ├── Environment.ts               # Paths, pond, props, flora, smoke, fire
    │   └── Island.ts                    # Faceted plateau and tapered stone base
    ├── defaultManifest.ts               # Bundled fallback from the public JSON
    └── types.ts                         # Shared API and scene types
public/
├── draco/                               # Optional self-hosted Draco decoder files
├── models/                              # Optional GLB/GLTF character assets
└── simulation-config.json               # Runtime editable scene manifest
```

## Runtime architecture

The page keeps the interface in React and loads `DioramaCanvas` through `next/dynamic` with `ssr: false`. This import lives in the client page because Next.js only permits `ssr: false` dynamic imports inside Client Components. The bridge constructs one `DioramaApp` in an effect and disposes it on unmount.

`DioramaApp` owns the renderer, scene, camera, orbit controls, resize observer, clock, environment animation, and `CharacterManager`. It caps the pixel ratio, uses `PCFSoftShadowMap`, applies color management and tone mapping, and releases scene geometry, materials, textures, controls, and renderer resources when disposed. All authored materials use flat shading.

The island and settlement are procedural Three.js meshes. The scene includes a jagged floating rock base, grass plateau, pale paths, north keep and balcony, four cottages, pond and dock, well, woodcutting yard, campfire and cauldron, fences, trees, barrels, smoke, and fire flicker.

The ten characters are one king, two guards, one woodcutter, one cook, one fisherman, two children, and two ambient villagers. They are created as low-poly rigs in code. If a manifest entry supplies `assetPath`, `CharacterManager` loads the GLTF, uses a named animation clip when available (otherwise the first clip), and keeps the procedural rig as a fallback if loading fails.

## Simulation-config API contract

`GET /api/simulation-config` returns JSON with this versioned shape:

```ts
interface SimulationManifest {
  version: number;
  island: {
    center: [number, number, number];
    topRadius: [number, number];
  };
  characters: Array<{
    id: string;
    name: string;
    kind: "king" | "guard" | "lumberjack" | "cook" | "fisherman" | "child" | "ambient";
    position: [number, number, number];
    facing?: number;                 // radians around world Y
    color?: string;                  // base garment or armor color
    accent?: string;                 // secondary color
    assetPath?: string;              // optional path under public/
    clip?: string;                   // GLTF clip name fragment or procedural loop id
    startOffset?: number;            // seconds into the animation loop
    patrol?: [number, number, number][]; // guard waypoint list
  }>;
}
```

The route reads `public/simulation-config.json` at request time, responds with `Cache-Control: no-store`, and includes an `X-Simulation-Version` header. Coordinates are world-space metres. Edit or replace that JSON file to change NPC positions, palettes, offsets, patrol routes, or model paths while the server is running; the 3D client bundle does not need to be rebuilt. `src/diorama/defaultManifest.ts` imports the same JSON as a client fallback for API failures.

Animation timings are: king survey and gesture (8 s); guards walk each patrol leg (12 s), inspect (2 s), and turn (1 s); woodcutter chop (4 s); cook stir, taste, and return (5 s); fisherman cast, wait, and reel (8 s) with water ripples; children run a shared circular tag route; ambient islanders wander and idle.

## Adding authored models

Place `.glb` files under `public/models/` and set an entry's `assetPath`, such as `/models/characters/guard.glb`. Draco-compressed files are supported by `AssetLoader`; place the decoder files in `public/draco/`. No model or decoder download is needed for the bundled procedural scene.
