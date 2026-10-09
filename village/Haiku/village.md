Act as a Principal Full-Stack WebGL Engineer and 3D Technical Architect. Generate a complete, end-to-end technical specification, system architecture, and production-ready implementation plan for a modular 3D web application running on Next.js (App Router) powered by Three.js.

### Project Overview
The objective is to create an interactive 3D diorama of a living medieval village situated on a floating sky island. The application runs inside a full-screen WebGL canvas managed by Next.js, featuring low-poly aesthetics, orbit camera navigation, modular code organization, and ambient life simulation with looping NPC animations (under 15 total characters).

---

### Part 1: Visual Style & 3D Assets Breakdown
1. Visual Identity:
   - Low-poly minimalist aesthetic with explicit flat shading (flatShading: true on all materials). No smoothed vertex normals.
   - Vibrant daylight palette using solid hex colors or a lightweight palette texture atlas.
   - Lighting: Warm directional sunlight with PCFSoftShadowMap enabled for crisp low-poly shadows; hemisphere light for soft ambient sky/ground fill.

2. Modular Environment Assets:
   - Floating Island: Polygonal green top plateau with stone paths and a depression for a pond; rugged, jagged underside tapering into the sky with exposed geometric roots and rock spires.
   - Castle / Keep: Compact fortified stone keep elevated on a rocky terrace at the northern edge, featuring battlements and a royal observation balcony overlooking the settlement.
   - Village Cottages: 3–4 stylized timber-and-plaster houses with pitched slate/straw roofs and blocky chimneys emitting low-poly smoke particles.
   - Workstations & Props: Woodcutting stump with logs; stone campfire with a cauldron on a tripod; small wooden dock extending into the pond; 5–8 stylized pine/oak trees, fences, barrels, and a stone well.

3. Character Roster (<15 distinct humanoid models):
   - The King (1): Stationed on the castle balcony.
   - Royal Guards (2–3): Heavy plate armor, helmets, holding spears/polearms.
   - Villagers (7–9): Peasants in tunics performing dedicated looping tasks (1 Lumberjack, 1 Cook, 1 Fisherman, 2 Children playing tag, 2–3 ambient roaming/idling villagers).

---

### Part 2: Animation & Simulation Behavior Logic
Each character must be controlled by a dedicated state/mixer loop:
- The King: 8-second loop. Stands at the balcony railing, surveys the land from left to right, raises a hand in a royal gesture toward the village, returns to idle rest.
- Guards (Patrol Logic): Ping-pong waypoint interpolation along straight patrol corridors (gate and outer perimeter). Walk for 12 seconds, stop for 2 seconds to inspect surroundings, rotate 180 degrees using quaternion slerp, and walk back.
- Lumberjack: 4-second loop. Raises axe with two hands, executes a forceful downward chop onto the wood block, holds brief impact recoil, resets.
- Cook: 5-second loop. Circular ladle stirring over the firepit cauldron, pauses to taste/inspect, wipes brow, and resumes stirring.
- Fisherman: 8-second loop. Sitting on the pier holding a rod, gentle tugging motion, causing low-poly expanding ripple mesh rings on the water surface.
- Children (2 units): Continuous synchronized circular running/tag sequence around the village well with Child B trailing Child A.

---

### Part 3: Architecture & Next.js Server Integration
The project must use Next.js (App Router, TypeScript) with clear separation of concerns between server, client UI, and 3D engine logic:

1. Server / Next.js Layer:
   - `src/app/page.tsx`: Serves the entry page.
   - `src/app/api/simulation-config/route.ts`: API Route returning the scene manifest (initial NPC coordinates, patrol waypoints, animation clip references, and asset paths) so the simulation parameters can be updated dynamically without recompiling the 3D client code.
   - `public/models/`: Static hosting for all GLTF/GLB models and palettes.

2. Client-Side Rendering Bridge:
   - `src/components/DioramaCanvas.tsx`: Marked with `'use client'`. Dynamically imported in `page.tsx` with `{ ssr: false }` to prevent SSR window/WebGL crashes.
   - Manages mounting and unmounting, initiating the main Three.js controller and invoking strict cleanup (`renderer.dispose()`, scene geometry/material disposal) on component unmount to prevent WebGL context leaks.

3. Modular Three.js Engine Directory (`src/diorama/`):
   - `core/DioramaApp.ts`: Central facade initializing WebGLRenderer, PerspectiveCamera, Scene, requestAnimationFrame render loop, and ResizeObserver.
   - `core/CameraController.ts`: OrbitControls wrapper. Locks target to island center (0, 0, 0), enforces polar angle clamp (15° to 75°), disables panning (`enablePan: false`), and enables smooth damping (`dampingFactor: 0.05`).
   - `core/Lighting.ts`: Manages DirectionalLight with tuned shadow frustum and HemisphereLight.
   - `world/Island.ts`, `world/Buildings.ts`, `world/Environment.ts`: Modular mesh placement, instantiation, and hierarchy setup.
   - `simulation/CharacterManager.ts`: Fetches config from `/api/simulation-config`, loads GLTF character meshes via AssetLoader, and orchestrates updates for all character controllers.
   - `simulation/KingController.ts`, `simulation/GuardController.ts`, `simulation/VillagerController.ts`: Specialized tick-update classes handling AnimationMixer playback, waypoint navigation, and root motion.
   - `utils/AssetLoader.ts`: Cached GLTFLoader and DracoLoader pipeline.
   - `utils/Time.ts`: Delta-time calculation wrapper using Three.js Clock.

---

### Deliverable Instructions
Provide the complete technical blueprint, the fully configured Next.js project structure, the exact API route contract, the client-side bridge implementation, and the complete TypeScript code for `DioramaApp.ts`, `CameraController.ts`, and `CharacterManager.ts` to build and run this modular interactive simulation.