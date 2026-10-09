import * as THREE from 'three';
import { POND } from './layout';
import { buildIsland } from './Island';
import { buildBuildings } from './Buildings';
import { buildEnvironment } from './Environment';
import { Water } from './Water';
import type { SimulationContext } from '../simulation/types';
import type { WorldPiece } from './meshUtils';

/**
 * Aggregates every static world piece behind one facade and exposes the
 * shared simulation context (water access for ripple spawning) to the
 * character layer.
 */
export class World {
  readonly group = new THREE.Group();
  readonly context: SimulationContext;

  private readonly water: Water;
  private readonly pieces: WorldPiece[];

  constructor() {
    this.group.name = 'world';

    const island = buildIsland();
    const buildings = buildBuildings();
    const environment = buildEnvironment(buildings.smokeSources ?? []);
    this.water = new Water();

    this.pieces = [island, buildings, environment];
    this.group.add(island.group, buildings.group, environment.group, this.water.group);

    this.context = {
      water: {
        x: POND.center[0],
        y: POND.surfaceY,
        z: POND.center[1],
        radius: POND.radius,
        spawnRipple: (x: number, z: number) => this.water.spawnRipple(x, z),
      },
    };
  }

  update(elapsed: number, dt: number): void {
    for (const piece of this.pieces) piece.update?.(elapsed, dt);
    this.water.update(elapsed, dt);
  }
}
