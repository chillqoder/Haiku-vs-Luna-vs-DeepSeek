// Animator: plays procedural clips on a character rig with smooth blending.

import { CLIPS, newPose, resetPose, blendPose } from './Clips.js';

export class Animator {
  constructor(model) {
    this.joints = model.joints;
    this.body = model.body;
    this.hipY = model.hipY;
    this.current = newPose();
    this.target = newPose();
    this.clipName = 'idle';
    this.clip = CLIPS.idle;
    this.time = 0;
    this.progress = 0;
    this.params = {};
    this.onEnd = null;
    this.finished = false;
    this.blendRate = CLIPS.idle.blendRate ?? 14;
    this.speedScale = 1;
  }

  play(name, { params = {}, onEnd = null, restart = false } = {}) {
    const clip = CLIPS[name];
    if (!clip) return;

    if (this.clipName === name && !restart) {
      // Looping clip already running: just refresh params.
      this.params = { ...this.params, ...params };
      if (onEnd) this.onEnd = onEnd;
      return;
    }
    // Spins can leave the pose at N * 2PI; normalize to avoid an unwind
    // animation when the next clip blends back toward zero.
    const TWO_PI = Math.PI * 2;
    this.current.body[1] = ((this.current.body[1] % TWO_PI) + TWO_PI) % TWO_PI;
    if (this.current.body[1] > Math.PI) this.current.body[1] -= TWO_PI;

    this.clipName = name;
    this.clip = clip;
    this.time = 0;
    this.progress = 0;
    this.params = { ...params };
    this.onEnd = onEnd;
    this.finished = false;
    this.blendRate = clip.blendRate ?? 14;
  }

  // For walk/run cadence: 1 = normal, 2 = double speed.
  setSpeedScale(s) {
    this.speedScale = s;
  }

  get isFinished() {
    return this.finished;
  }

  update(dt) {
    const clip = this.clip;
    if (!clip) return;

    this.time += dt * this.speedScale * (this.params.timeScale ?? 1);

    if (clip.loop) {
      this.progress = (this.time % clip.duration) / clip.duration;
    } else {
      this.progress = Math.min(1, this.time / clip.duration);
      if (this.progress >= 1 && !this.finished) {
        this.finished = true;
        const cb = this.onEnd;
        // Clear before calling so the callback can start a new clip.
        this.onEnd = null;
        if (cb) cb();
      }
    }

    resetPose(this.target);
    clip.fn(this.target, this.progress, this.time, this.params);

    const k = 1 - Math.exp(-this.blendRate * dt);
    blendPose(this.current, this.target, k);
    this.apply();
  }

  apply() {
    const p = this.current;
    const j = this.joints;
    this.body.rotation.set(p.body[0], p.body[1], p.body[2]);
    this.body.position.y = p.bodyPosY;
    j.hips.position.y = this.hipY + p.hipsY;
    j.torso.rotation.set(p.torso[0], p.torso[1], p.torso[2]);
    j.head.rotation.set(p.head[0], p.head[1], p.head[2]);
    j.armA.rotation.set(p.armA[0], p.armA[1], p.armA[2]);
    j.armB.rotation.set(p.armB[0], p.armB[1], p.armB[2]);
    j.foreA.rotation.set(p.foreA[0], p.foreA[1], p.foreA[2]);
    j.foreB.rotation.set(p.foreB[0], p.foreB[1], p.foreB[2]);
    j.legA.rotation.set(p.legA[0], p.legA[1], p.legA[2]);
    j.legB.rotation.set(p.legB[0], p.legB[1], p.legB[2]);
    j.shinA.rotation.set(p.shinA[0], p.shinA[1], p.shinA[2]);
    j.shinB.rotation.set(p.shinB[0], p.shinB[1], p.shinB[2]);
  }
}
