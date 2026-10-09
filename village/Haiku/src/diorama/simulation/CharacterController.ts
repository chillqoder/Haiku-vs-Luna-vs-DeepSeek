import * as THREE from 'three';

/** Сервисы, которые менеджер передаёт каждому контроллеру. */
export interface CharacterContext {
  ripples: { spawn(x: number, z: number): void };
}

/**
 * Базовый контроллер персонажа: владеет AnimationMixer и переключает клипы с кроссфейдом.
 * Поведение конкретного типа (король, стражник, житель) реализуется в tick().
 */
export abstract class CharacterController {
  protected readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private active: THREE.AnimationAction | null = null;

  constructor(
    readonly id: string,
    readonly root: THREE.Object3D,
    clips: readonly THREE.AnimationClip[],
  ) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of clips) {
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }
  }

  update(dt: number): void {
    this.mixer.update(dt);
    this.tick(dt);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }

  protected abstract tick(dt: number): void;

  /** Проигрывает клип с кроссфейдом. Повторный вызов с тем же клипом ничего не меняет. */
  protected play(clipName: string, fadeSeconds = 0.3): void {
    const next = this.actions.get(clipName);
    if (!next) throw new Error(`Клип "${clipName}" не найден в модели персонажа "${this.id}"`);
    if (next === this.active) return;
    this.active?.fadeOut(fadeSeconds);
    next.reset().fadeIn(fadeSeconds).play();
    this.active = next;
  }

  protected get clipTime(): number {
    return this.active?.time ?? 0;
  }

  protected get clipDuration(): number {
    return this.active?.getClip().duration ?? 1;
  }
}
