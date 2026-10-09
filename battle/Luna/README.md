# Neon Street Guardians

A procedural 2.5D side-scrolling brawler built with Three.js. Characters, environments, scenery, and combat effects are assembled from generated geometry and canvas textures. Audio uses synthesized effects only; there is no background music or downloaded art.

## Run it

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production bundle, run `npm run build` and serve the generated `dist/` directory from a static web server.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move and change lane | WASD or arrow keys | Direction pad |
| Jump | Space | Jump |
| Punch combo | J | Punch |
| Kick | K | Kick |
| Spinning special | L | Spin |
| Grab or throw | E (press again to throw) | Grab (press again to throw) |
| Pause | Escape | Pause button |

The special attack recharges after use. Move toward an enemy in the same lane to attack; use up/down to dodge and line up attacks.

## Project modules

- `src/core/Game.js` owns the render loop, game states, level transitions, enemy waves, checkpoints, and HUD updates. `Renderer.js` sets up Three.js; `Physics.js` handles gravity and attack range checks.
- `src/core/Input.js` maps keyboard and touch input into game actions. `src/core/Audio.js` synthesizes short sound effects with Web Audio.
- `src/entities/Character.js` builds the shared procedural character rig. `Hero.js` handles player movement and actions; `src/ai/EnemyAI.js` runs enemy state machines through the `Enemy.js` entity.
- `src/combat/Combat.js` resolves attack ranges, damage, blocks, throws, destructible props, score, and hit effects.
- `src/world/Level.js` defines the three districts, builds their geometry and scenery, and manages destructible obstacles. `src/assets/ProceduralTextures.js` generates the tiled wall texture.
- `src/effects/Particles.js` creates hit sparks and the special-attack ring. `src/ui/UI.js` updates the HUD, announcements, and game screens.

## Game flow

1. `index.html` and `src/main.js` show the menu and start the app.
2. `Game` creates the scene, camera, lights, input, hero, and first district.
3. Each frame, input drives the hero; combat resolves player actions; enemy state machines chase, block, dodge, and strike.
4. Wave gates hold the player in each encounter. Clearing a district boss moves the run to the next checkpoint.
5. The HUD reflects health, lives, score, combos, special recharge, and boss health. Losing all lives ends the run; clearing all three bosses wins it.
