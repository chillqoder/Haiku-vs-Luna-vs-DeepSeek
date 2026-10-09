# Skyhold Village — Living Diorama

Interactive 3D diorama of a living medieval village on a floating sky island.
Full-screen WebGL canvas, low-poly flat-shaded aesthetics, orbit camera and
13 autonomous NPCs with looping behaviors — built with **Next.js (App Router,
TypeScript)** and **Three.js**.

The diorama ships with **zero external assets**: every character, building and
prop is generated procedurally, and authored GLBs can be dropped in later
without code changes (see `public/models/README.md`).

## Quickstart

```bash
npm install
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

Quality gates:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

## How it works

- `src/app/page.tsx` — server component entry, mounts the client bridge.
- `src/components/DioramaCanvasMount.tsx` — `'use client'` wrapper that
  dynamically imports the canvas with `{ ssr: false }`.
- `src/components/DioramaCanvas.tsx` — owns the app lifecycle (mount,
  strict cleanup) and renders the HUD.
- `src/app/api/simulation-config/route.ts` — scene manifest endpoint (NPC
  spawns, patrol waypoints, clip references, lighting/camera parameters).
  Tunable at runtime: `GET /api/simulation-config?timeScale=0.5`.
- `src/diorama/` — the engine: `core/` (renderer facade, camera, lighting),
  `world/` (island, buildings, environment, water, particles), `simulation/`
  (character controllers + manager), `characters/` (procedural rig factory),
  `utils/` (assets, time, rng, geometry).

Full architecture, API contract and animation tables:
[`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

## Controls

- **Drag** — orbit the camera around the island center.
- **Scroll / pinch** — zoom (distance clamped 16–48, polar angle 15°–75°).

## Cast (13 NPCs)

| Character | Behavior |
| --- | --- |
| King | 8 s loop on the castle balcony: survey, royal gesture, rest |
| Guards ×3 | Ping-pong patrols at the gate and along the perimeter, 2 s inspections, 180° turns |
| Lumberjack | 4 s chop/lift/rest loop at the woodcutting stump |
| Cook | 5 s stir/taste/brow-wipe loop at the campfire cauldron |
| Fisherman | 8 s seated cast/wait/reel loop spawning pond ripple rings |
| Children ×2 | Continuous tag chase orbiting the village well |
| Villagers ×4 | Ambient roamers with pauses around the village ring |
