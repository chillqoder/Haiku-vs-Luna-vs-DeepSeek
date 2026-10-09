import * as THREE from 'three';
import { CharacterController, type CharacterContext } from './CharacterController';
import type { Vec3, VillagerConfig } from './manifest';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const TURN_RATE = 8;

type VillagerConfigBehavior = VillagerConfig['behavior'];
type RoamBehavior = Extract<VillagerConfigBehavior, { type: 'roam' }>;
type OrbitBehavior = Extract<VillagerConfigBehavior, { type: 'orbit' }>;

/** Пересёк ли таймлайн клипа момент at за шаг от prev до cur (с учётом зацикливания). */
function crossed(prev: number, cur: number, at: number): boolean {
  if (cur >= prev) return prev < at && at <= cur;
  return at > prev || at <= cur;
}

/**
 * Житель трёх типов поведения:
 *  - stationary: работает на месте по зацикленному клипу (лесоруб, повар, рыбак);
 *    может излучать события ряби в заданные моменты клипа;
 *  - roam: бродит между точками зоны, чередуя ходьбу и паузы;
 *  - orbit: бегает по окружности вокруг центра (дети).
 */
export class VillagerController extends CharacterController {
  private readonly heading = new THREE.Quaternion();
  private readonly turnTarget = new THREE.Quaternion();
  private readonly target = new THREE.Vector3();
  private readonly step = new THREE.Vector3();
  private readonly anchorPoint = new THREE.Vector3();
  private elapsed = 0;
  private lastClipTime = 0;
  private roamMode: 'idle' | 'walk' = 'idle';
  private idleLeft = 0;
  private targetIndex = -1;
  private orbitStartAngle = 0;

  constructor(
    private readonly config: VillagerConfig,
    root: THREE.Object3D,
    clips: readonly THREE.AnimationClip[],
    private readonly context: CharacterContext,
    private readonly area: readonly Vec3[],
  ) {
    super(config.id, root, clips);

    root.traverse((node) => {
      if (node.name.startsWith('Tool_') && !config.tools.includes(node.name)) node.visible = false;
    });

    this.heading.setFromAxisAngle(UP, (config.yawDeg * Math.PI) / 180);
    root.quaternion.copy(this.heading);

    const behavior = config.behavior;
    switch (behavior.type) {
      case 'stationary':
        this.play(config.clips.loop, 0);
        break;
      case 'orbit': {
        this.play(config.clips.loop, 0);
        const [cx, , cz] = behavior.center;
        this.orbitStartAngle = Math.atan2(config.position[2] - cz, config.position[0] - cx);
        this.placeOnOrbit(behavior);
        break;
      }
      case 'roam':
        this.enterIdle(behavior);
        break;
    }
  }

  protected tick(dt: number): void {
    this.elapsed += dt;
    const behavior = this.config.behavior;
    switch (behavior.type) {
      case 'stationary':
        this.tickStationary();
        break;
      case 'roam':
        this.tickRoam(dt, behavior);
        break;
      case 'orbit':
        this.placeOnOrbit(behavior);
        break;
    }
  }

  private tickStationary(): void {
    const ripples = this.config.ripples;
    if (!ripples) return;

    const time = this.clipTime;
    for (const at of ripples.atSeconds) {
      if (crossed(this.lastClipTime, time, at % this.clipDuration)) this.emitRipple(ripples.anchor);
    }
    this.lastClipTime = time;
  }

  private emitRipple(anchorName: string): void {
    const anchor = this.root.getObjectByName(anchorName);
    if (!anchor) return;
    this.root.updateMatrixWorld(true);
    anchor.getWorldPosition(this.anchorPoint);
    this.context.ripples.spawn(this.anchorPoint.x, this.anchorPoint.z);
  }

  private tickRoam(dt: number, behavior: RoamBehavior): void {
    if (this.roamMode === 'idle') {
      this.idleLeft -= dt;
      if (this.idleLeft <= 0) this.startWalk();
      return;
    }

    const position = this.root.position;
    this.step.subVectors(this.target, position);
    this.step.y = 0;
    const distance = this.step.length();
    const stride = behavior.speed * dt;

    if (distance <= stride) {
      position.set(this.target.x, position.y, this.target.z);
      this.enterIdle(behavior);
      return;
    }

    this.step.multiplyScalar(stride / distance);
    position.add(this.step);
    this.turnTarget.setFromAxisAngle(UP, Math.atan2(this.step.x, this.step.z));
    this.root.quaternion.slerp(this.turnTarget, 1 - Math.exp(-TURN_RATE * dt));
  }

  private enterIdle(behavior: RoamBehavior): void {
    this.roamMode = 'idle';
    const [min, max] = behavior.idleSeconds;
    this.idleLeft = min + Math.random() * (max - min);
    this.play(this.config.clips.idle);
  }

  private startWalk(): void {
    const points = this.area;
    let index = Math.floor(Math.random() * points.length);
    // Не выбираем ту же точку дважды подряд, если точек больше одной.
    if (points.length > 1 && index === this.targetIndex) index = (index + 1) % points.length;
    this.targetIndex = index;

    const point = points[index];
    this.target.set(point[0], point[1], point[2]);
    this.roamMode = 'walk';
    this.play(this.config.clips.walk);
  }

  private placeOnOrbit(behavior: OrbitBehavior): void {
    const angle = this.orbitStartAngle + (TAU * this.elapsed) / behavior.lapSeconds;
    const [cx, cy, cz] = behavior.center;
    this.root.position.set(cx + Math.cos(angle) * behavior.radius, cy, cz + Math.sin(angle) * behavior.radius);
    // Касательная к окружности: направление движения против часовой стрелки сверху.
    this.root.quaternion.setFromAxisAngle(UP, Math.atan2(-Math.sin(angle), Math.cos(angle)));
  }
}
