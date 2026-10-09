# NEON FIST

An original 2.5D side-scrolling beat 'em up built with **Three.js**, where every
graphic and every sound is generated procedurally in code. No external image,
model or audio assets are used anywhere.

- 1 playable hero with punches, kicks, combos, grab & throw, a spin special move
- 3 enemy archetypes (Thug, Shadow, Bruiser) with distinct AI, stats and looks
- 3 stages (Neon Streets, Dragon Dojo, Iron Foundry) with parallax backgrounds,
  destructible props, food pickups, wave battles, camera-locked arenas and a
  unique boss at the end of each stage
- Health/energy/lives/score/combo HUD, pause, game over, stage clear and victory
  screens
- Procedural Web Audio sound effects only - **no music**

## Requirements

- Node.js 18+ (tested on Node 24)

## How to run

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

Open the printed URL and press **ENTER** (or click **START GAME**).

Other commands:

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build
npm test         # headless logic smoke test (Node, no browser needed)
```

> Note: the build uses ES modules, so open it through `npm run dev` or
> `npm run preview` rather than a `file://` URL.

## Controls

| Action        | Keyboard          | Gamepad (standard) |
| ------------- | ----------------- | ------------------ |
| Move          | WASD / Arrow keys | D-pad / L-stick    |
| Jump          | Space             | A                  |
| Punch (combo) | J                 | X                  |
| Kick          | K                 | Y                  |
| Grab / Throw  | E                 | B                  |
| Special       | L                 | LB / RB            |
| Pause         | P / Escape        | Start              |
| Confirm menu  | Enter             | Start / A          |

Combat tips:

- Mash **Punch** for a 3-hit chain (jab, cross, heavy uppercut that knocks down).
- **Grab** a nearby enemy, then **Punch** for knees or **Kick/Grab** to throw
  them - thrown bodies damage other enemies.
- Getting hit builds energy; at full meter spend it on the **Special** spinning
  attack (it hits every enemy around you and grants temporary invincibility).
- Some enemies block or dodge - use kicks, jump attacks or the special to break
  their guard, or attack them from behind.

## Module overview

```
src/
  main.js                 Boot: creates the Game, starts the loop, unlocks audio
  core/
    Constants.js          All tuning values (physics, combat, stats, archetypes)
    StateMachine.js       Tiny FSM used for the game flow
    Game.js               Orchestrator + the "world" interface entities talk to
  renderer/
    Renderer.js           WebGL renderer, camera rig, lights, screen shake
  input/
    Input.js              Keyboard + gamepad mapped to named actions
  physics/
    Physics.js            AABBs, attack boxes, gravity integration, lane clamps
  entities/
    Entity.js             Base entity: health, hit reactions, knockdown flow
    Hero.js               The player character and its full move set
    Enemy.js              Enemy entity: blocking, dodging, grab/throw handling
  combat/
    CombatSystem.js       Attack tables, active hitboxes, damage resolution,
                          hit-stop, combo counter
  ai/
    EnemyAI.js            Enemy behavior state machine + attack token manager
  level/
    LevelData.js          The three stage definitions
    Level.js              Environment building, parallax, waves, progress gating
    Obstacle.js           Destructible props (crates, barrels, dummies) + pickups
  ui/
    HUD.js                DOM HUD (bars, score, lives, combo, boss bar, menus)
    style.css             All HUD/menu styling
  audio/
    AudioManager.js       Web Audio synthesis of every sound effect
  assets/
    Textures.js           Canvas-generated textures (asphalt, wood, metal, neon...)
    ModelFactory.js       Procedural humanoid rigs and environment props
    Particles.js          Pooled THREE.Points particle system
  anim/
    Clips.js              Procedural pose functions for every animation clip
    Animator.js           Pose blending/playback on the character rig
tests/
  smoke.test.js           Headless smoke test of physics, combat, AI, levels
```

### How it fits together

1. `main.js` constructs `Game`, which owns the `Renderer`, `Input`,
   `AudioManager`, `ParticleSystem`, `CombatSystem` and `HUD`.
2. `Game.state` (a `StateMachine`) drives the flow: title -> playing -> paused /
   stage-clear / game-over / victory.
3. A level is a `Level` instance built from `LevelData`. It generates the
   ground, back wall, parallax layers, decorations and destructible obstacles,
   then watches the hero to trigger waves. During a wave the camera locks and
   the hero is fenced into the visible arena until all spawned enemies die.
4. `Hero` and `Enemy` extend `Entity`. They animate themselves through the
   `Animator` (pose functions in `Clips.js`) and fight through the
   `CombatSystem`, which spawns short-lived hitboxes and resolves them against
   the opposite faction.
5. Enemies are driven by `EnemyAI` state machines (`spawn`, `approach`,
   `strafe`, `attack`, `block`, `dodge`, `retreat`). An `AttackTokenManager`
   limits how many enemies may attack simultaneously so crowds stay fair.
6. `Game` receives combat events (`onHeroHit`, `onEnemyHitHero`, `onBlock`,
   ...) and turns them into score, combos, hit-stop, camera shake, particles
   and sounds. `HUD` renders all of that in a DOM overlay.

All geometry, textures, characters and sounds are produced at runtime by
`Textures.js`, `ModelFactory.js`, `Particles.js` and `AudioManager.js`.
