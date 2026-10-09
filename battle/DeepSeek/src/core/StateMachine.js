// Tiny finite state machine used for the overall game flow and entity state.

export class StateMachine {
  constructor(initial, states = {}) {
    this.states = states;
    this.current = initial;
    this.timeInState = 0;
    this.previous = null;
    this._enter(this.current);
  }

  _enter(name) {
    const s = this.states[name];
    if (s && typeof s.enter === 'function') s.enter();
  }

  _exit(name) {
    const s = this.states[name];
    if (s && typeof s.exit === 'function') s.exit();
  }

  can(name) {
    const s = this.states[name];
    return !s || typeof s.canEnter !== 'function' || s.canEnter(name);
  }

  set(name, payload = {}) {
    if (name === this.current) return false;
    if (!this.can(name)) return false;
    this._exit(this.current);
    this.previous = this.current;
    this.current = name;
    this.timeInState = 0;
    const s = this.states[name];
    if (s && typeof s.enter === 'function') s.enter(payload);
    return true;
  }

  is(...names) {
    return names.includes(this.current);
  }

  update(dt) {
    this.timeInState += dt;
    const s = this.states[this.current];
    if (s && typeof s.update === 'function') s.update(dt);
  }
}
