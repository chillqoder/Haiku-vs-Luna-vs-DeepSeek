import { Timer } from 'three';

/**
 * Обёртка над THREE.Timer (Clock устарел начиная с r183).
 * Ограничивает шаг кадра, чтобы после паузы вкладки персонажи не телепортировались.
 */
export class Time {
  private readonly timer = new Timer();

  constructor(private readonly maxStep = 0.1) {
    this.timer.connect(document);
  }

  /** Вызывается один раз за кадр. Возвращает шаг и общее время в секундах. */
  tick(): { delta: number; elapsed: number } {
    this.timer.update();
    return {
      delta: Math.min(this.timer.getDelta(), this.maxStep),
      elapsed: this.timer.getElapsed(),
    };
  }

  dispose(): void {
    this.timer.dispose();
  }
}
