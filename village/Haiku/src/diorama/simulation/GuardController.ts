import * as THREE from 'three';
import { CharacterController } from './CharacterController';
import type { PatrolRoute } from './manifest';

const UP = new THREE.Vector3(0, 1, 0);
/** Разворот на 180° вокруг вертикальной оси. */
const U_TURN = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);

const smooth = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

/** Угол поворота вокруг Y, при котором локальная ось +Z смотрит по направлению direction. */
const yawQuaternion = (direction: THREE.Vector3) =>
  new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(direction.x, direction.z));

/**
 * Стражник патрулирует прямой коридор туда и обратно: идёт walkSeconds,
 * останавливается на pauseSeconds и разворачивается на 180° slerp-интерполяцией кватернионов.
 */
export class GuardController extends CharacterController {
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private readonly heading = new THREE.Quaternion();
  private readonly turnFrom = new THREE.Quaternion();
  private readonly turnTo = new THREE.Quaternion();
  private readonly direction = new THREE.Vector3();
  private phase: 'walk' | 'pause' = 'walk';
  private phaseTime = 0;

  constructor(
    id: string,
    root: THREE.Object3D,
    clips: readonly THREE.AnimationClip[],
    private readonly route: PatrolRoute,
    startSeconds: number,
    private readonly clipNames: { walk: string; inspect: string },
  ) {
    super(id, root, clips);
    const [start, end] = route.waypoints;
    this.from.set(start[0], start[1], start[2]);
    this.to.set(end[0], end[1], end[2]);
    this.beginWalk();
    // Сдвиг по фазе: стражники на одном патруле не шагают синхронно.
    this.advance(startSeconds);
  }

  protected tick(dt: number): void {
    this.advance(dt);
  }

  private beginWalk(): void {
    this.phase = 'walk';
    this.phaseTime = 0;
    this.direction.subVectors(this.to, this.from);
    this.heading.copy(yawQuaternion(this.direction));
    this.play(this.clipNames.walk);
    this.applyPose();
  }

  /** Продвигает фазы на dt, перенося остаток времени между фазами. */
  private advance(dt: number): void {
    let remaining = dt;
    while (remaining > 0) {
      const duration = this.phase === 'walk' ? this.route.walkSeconds : this.route.pauseSeconds;
      const step = Math.min(remaining, duration - this.phaseTime);
      this.phaseTime += step;
      remaining -= step;
      if (this.phaseTime >= duration) this.finishPhase();
    }
    this.applyPose();
  }

  private finishPhase(): void {
    if (this.phase === 'walk') {
      this.phase = 'pause';
      this.phaseTime = 0;
      this.turnFrom.copy(this.heading);
      this.turnTo.copy(this.heading).multiply(U_TURN);
      this.play(this.clipNames.inspect);
      return;
    }
    // Остановка закончилась: меняем концы коридора местами и идём обратно.
    [this.from, this.to] = [this.to, this.from];
    this.beginWalk();
  }

  private applyPose(): void {
    if (this.phase === 'walk') {
      const t = this.phaseTime / this.route.walkSeconds;
      this.root.position.lerpVectors(this.from, this.to, t);
      this.root.quaternion.copy(this.heading);
    } else {
      this.root.position.copy(this.to);
      this.root.quaternion.slerpQuaternions(this.turnFrom, this.turnTo, smooth(this.phaseTime / this.route.pauseSeconds));
    }
  }
}
