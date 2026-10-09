import type * as THREE from 'three';
import { CharacterController } from './CharacterController';

/**
 * Король стоит на балконе. Восьмисекундный цикл (обзор слева направо, жест, возврат)
 * целиком записан в клип king_observe, контроллер его только запускает.
 */
export class KingController extends CharacterController {
  constructor(id: string, root: THREE.Object3D, clips: readonly THREE.AnimationClip[], loopClip: string) {
    super(id, root, clips);
    this.play(loopClip, 0);
  }

  protected tick(): void {
    // Поведение полностью задаётся клипом.
  }
}
