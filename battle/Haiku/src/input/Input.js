// Ввод: клавиатура и геймпад. Игровой код работает с абстрактными действиями (actions),
// а не с конкретными клавишами.

const KEY_ACTIONS = {
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  Space: ['jump', 'confirm'],
  KeyJ: ['attack'], KeyZ: ['attack'],
  KeyK: ['kick'], KeyX: ['kick'],
  KeyL: ['special'], KeyC: ['special'],
  KeyG: ['grab'],
  Escape: ['pause'], KeyP: ['pause'],
  Enter: ['confirm'],
  KeyQ: ['quit'],
  KeyM: ['mute'],
};

// Стандартная раскладка Gamepad API
const PAD_BUTTONS = {
  0: ['jump', 'confirm'],   // A
  1: ['special'],           // B
  2: ['attack'],            // X
  3: ['kick'],              // Y
  4: ['grab'], 5: ['grab'], // LB / RB
  9: ['pause', 'confirm'],  // Start
  12: ['up'], 13: ['down'], 14: ['left'], 15: ['right'], // крестовина
};

const STICK_DEAD_ZONE = 0.3;

export class Input {
  constructor() {
    this.keys = new Set();     // зажатые клавиши (event.code)
    this.padHeld = new Set();  // зажатые действия геймпада
    this.padPrev = new Set();
    this.pressed = new Set();  // фронты нажатий текущего кадра
    this.stick = { x: 0, y: 0 };

    window.addEventListener('keydown', (e) => {
      if (KEY_ACTIONS[e.code]) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      for (const action of KEY_ACTIONS[e.code] ?? []) this.pressed.add(action);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    // При потере фокуса окна отпускаем всё, иначе персонаж «залипнет» в движении
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.padHeld.clear();
    });
  }

  // Опрос геймпада раз в кадр: стики и фронты кнопок
  update() {
    this.stick.x = 0;
    this.stick.y = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const held = new Set();
    for (const pad of pads) {
      if (!pad) continue;
      const [ax = 0, ay = 0] = pad.axes;
      if (Math.abs(ax) > Math.abs(this.stick.x)) this.stick.x = ax;
      if (Math.abs(ay) > Math.abs(this.stick.y)) this.stick.y = ay;
      pad.buttons.forEach((button, i) => {
        if (!button.pressed) return;
        for (const action of PAD_BUTTONS[i] ?? []) held.add(action);
      });
    }
    for (const action of held) {
      if (!this.padPrev.has(action)) this.pressed.add(action);
    }
    this.padPrev = held;
    this.padHeld = held;
  }

  isDown(action) {
    for (const code of this.keys) {
      if (KEY_ACTIONS[code]?.includes(action)) return true;
    }
    return this.padHeld.has(action);
  }

  // Нажатие произошло в этом кадре (фронт, а не удержание)
  wasPressed(action) {
    return this.pressed.has(action);
  }

  // -1 (влево) … +1 (вправо)
  axisX() {
    if (Math.abs(this.stick.x) > STICK_DEAD_ZONE) return this.stick.x;
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  // -1 (к фону) … +1 (к камере): движение по глубине (полосам)
  axisLane() {
    if (Math.abs(this.stick.y) > STICK_DEAD_ZONE) return this.stick.y;
    return (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
  }

  endFrame() {
    this.pressed.clear();
  }
}
