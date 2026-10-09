// Универсальный конечный автомат (FSM). Используется и для состояний игры, и для ИИ врагов.
// Обработчики вызываются с this = owner, поэтому внутри можно обращаться к полям сущности.
export class StateMachine {
  constructor(owner) {
    this.owner = owner;
    this.states = {};
    this.name = null;
    this.time = 0; // сколько секунд прошло в текущем состоянии
  }

  add(name, { enter, update, exit }) {
    this.states[name] = { enter, update, exit };
  }

  set(name, ...args) {
    if (name === this.name) return;
    this.states[this.name]?.exit?.call(this.owner, this);
    this.name = name;
    this.time = 0;
    this.states[name].enter?.call(this.owner, this, ...args);
  }

  update(dt) {
    this.time += dt;
    this.states[this.name]?.update?.call(this.owner, dt, this);
  }
}
