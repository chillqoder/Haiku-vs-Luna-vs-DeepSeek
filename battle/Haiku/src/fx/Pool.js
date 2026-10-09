// Универсальный пул объектов: переиспользует экземпляры вместо постоянного создания новых.
export class ObjectPool {
  constructor(create, reset) {
    this.create = create;
    this.reset = reset;
    this.free = [];
    this.active = [];
  }

  acquire() {
    const obj = this.free.pop() ?? this.create();
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const i = this.active.indexOf(obj);
    if (i === -1) return;
    this.active.splice(i, 1);
    this.reset?.(obj);
    this.free.push(obj);
  }
}
