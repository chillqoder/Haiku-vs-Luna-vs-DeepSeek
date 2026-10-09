You are an expert game developer and creative AI. Your task is to create a complete, playable side-scrolling beat 'em up game using Three.js (and optionally Next.js for project structure). The game must be modular, well-organized, and feature a single playable hero fighting against various enemies across multiple levels. You must generate all graphics yourself using code (procedural textures, simple 3D models, canvas-generated sprites, or geometric shapes). Do not use external image assets. You may use the Web Audio API to generate sound effects procedurally. There must be no background music—only sound effects (punches, hits, jumps, etc.).

**Important:** Do not mention or reference any existing game titles. This is an original creation inspired by classic side-scrolling beat 'em ups.

**Game Overview:**
- **Genre:** 2.5D side-scrolling beat 'em up.
- **Camera:** Fixed side view with slight perspective, following the hero horizontally.
- **Hero:** A single character with a unique appearance, able to move left/right, jump, attack with punches and kicks, perform combos, grab and throw enemies, and use a special attack. The hero has health and lives.
- **Enemies:** Multiple types (e.g., grunt, brute, agile) with distinct looks, behaviors, and attack patterns. They spawn in waves and must be defeated to progress.
- **Levels:** At least 3 distinct levels (e.g., street, dojo, industrial). Each level has a scrolling environment, obstacles, and a boss at the end. Levels have a start and end, with checkpoints.
- **Combat:** Real-time fighting with hitboxes, damage, knockback, invincibility frames, and combo counters. Enemies can block, dodge, and attack in groups.
- **Animations:** Procedural or keyframe-based animations for idle, walk, run, jump, punch, kick, hit, fall, etc. Use Three.js AnimationMixer or manual bone manipulation.
- **UI:** Health bars for hero and boss, score, lives, level indicator, game over and victory screens.
- **Sound:** Procedural sound effects for actions (punch, kick, hit, jump, land, enemy defeat, etc.). No music.

**Modular Architecture:**
Organize the code into clear modules:
1. `Core` – game loop, state management, scene setup.
2. `Renderer` – Three.js renderer, camera, lighting.
3. `Input` – keyboard/gamepad handling.
4. `Physics` – simple collision detection (AABB or sphere), gravity, ground checks.
5. `Entities` – base classes for Hero, Enemy, Projectile, etc.
6. `Combat` – hitbox management, damage calculation, combo system.
7. `AI` – enemy behavior trees or state machines.
8. `Level` – level data, spawning, scrolling, obstacles.
9. `UI` – HUD, menus, health bars.
10. `Audio` – sound effect generation and playback.
11. `Assets` – procedural generation of textures, materials, and simple models.

**Development Stages:**
Proceed step by step, explaining each stage and providing complete code for each module. Do not skip steps. After each stage, ensure the game is runnable and testable.

**Stage 1: Project Setup**
- Set up a Next.js project (or plain HTML/JS with ES modules). Install Three.js.
- Create basic file structure and a simple Three.js scene with a ground plane and a camera.

**Stage 2: Core Engine**
- Implement game loop with `requestAnimationFrame`, delta time, and state manager (menu, playing, paused, game over).
- Set up input handling for keyboard (arrow keys, WASD, attack keys).

**Stage 3: Hero Entity**
- Create a procedurally generated 3D model for the hero using Three.js primitives (boxes, spheres, cylinders) or a simple skeletal system.
- Implement movement (left/right, jump) with physics (gravity, ground collision).
- Add basic animations: idle, walk, jump.

**Stage 4: Combat System**
- Implement hitboxes for punches and kicks.
- Add damage, knockback, and invincibility frames.
- Create a combo system (e.g., three-hit combo).
- Add special attack (e.g., spinning kick) with cooldown.

**Stage 5: Enemies**
- Create 2–3 enemy types with distinct models and colors.
- Implement AI: patrol, chase, attack, retreat. Use state machines.
- Enemies can block, get hit, and die with animations.

**Stage 6: Level Design**
- Create a scrolling level with a background (parallax layers using simple shapes).
- Add obstacles (barrels, crates) that can be destroyed or used.
- Spawn enemies in waves. Implement level progression and boss fight.

**Stage 7: UI and HUD**
- Add health bars for hero and boss, score, lives, and level indicator.
- Create menus: start, pause, game over, victory.

**Stage 8: Audio**
- Use Web Audio API to synthesize sound effects (punch, hit, jump, etc.). No music.
- Trigger sounds on events.

**Stage 9: Polish and Optimization**
- Add particle effects (hit sparks, dust).
- Optimize performance (object pooling, frustum culling).
- Ensure game is playable and fun.

**Graphics Generation:**
- Use Three.js `CanvasTexture` to generate textures procedurally (e.g., noise, gradients, patterns).
- For characters, use simple geometric shapes combined into a humanoid figure. Animate by rotating limbs.
- For environments, use tiled textures, simple buildings, and parallax backgrounds made of colored planes.

**Sound Generation:**
- Use `OscillatorNode` and `GainNode` to create punch sounds (short noise bursts with low-pass filter), hit sounds (square wave with quick decay), jump sounds (sine sweep), etc.
- No background music.

**Deliverables:**
- Complete source code for all modules.
- Instructions on how to run the game.
- Explanation of each module and how they interact.

Begin with Stage 1 and proceed sequentially. After each stage, provide the code and a brief explanation. Ensure the game is fully playable by the end.