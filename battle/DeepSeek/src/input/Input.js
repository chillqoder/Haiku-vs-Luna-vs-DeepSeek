// Keyboard + gamepad input mapped to game actions.

const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
  KeyJ: 'punch',
  KeyK: 'kick',
  KeyE: 'grab',
  KeyL: 'special',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  KeyP: 'pause',
  Escape: 'pause',
};

// Gamepad: standard mapping
const PAD_BUTTONS = {
  0: 'jump', // A / cross
  1: 'grab', // B / circle
  2: 'punch', // X / square
  3: 'kick', // Y / triangle
  4: 'special', // LB
  5: 'special', // RB
  9: 'pause', // start
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.actions = new Set();
    this.prevActions = new Set();
    this.justPressedActions = new Set();
    this.justReleasedActions = new Set();
    this.gamepadIndex = null;
    this.anyKeyThisFrame = false;

    this._onKeyDown = (e) => {
      if (KEY_MAP[e.code]) {
        // Prevent page scrolling with arrows/space while playing.
        e.preventDefault();
      }
      this.keys.add(e.code);
      this.anyKeyThisFrame = true;
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this._onBlur = () => {
      this.keys.clear();
    };

    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    this._padActions = new Set();
  }

  _readGamepad() {
    this._padActions.clear();
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad = null;
    for (const p of pads) {
      if (p && p.connected) {
        pad = p;
        break;
      }
    }
    if (!pad) {
      this.gamepadIndex = null;
      return;
    }
    this.gamepadIndex = pad.index;
    for (const [index, action] of Object.entries(PAD_BUTTONS)) {
      if (pad.buttons[index] && pad.buttons[index].pressed) this._padActions.add(action);
    }
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    const dead = 0.35;
    if (ax < -dead) this._padActions.add('left');
    if (ax > dead) this._padActions.add('right');
    if (ay < -dead) this._padActions.add('up');
    if (ay > dead) this._padActions.add('down');
  }

  update() {
    this._readGamepad();
    this.prevActions = new Set(this.actions);
    const next = new Set();
    for (const code of this.keys) {
      const a = KEY_MAP[code];
      if (a) next.add(a);
    }
    for (const a of this._padActions) next.add(a);
    this.actions = next;

    this.justPressedActions.clear();
    this.justReleasedActions.clear();
    for (const a of this.actions) {
      if (!this.prevActions.has(a)) this.justPressedActions.add(a);
    }
    for (const a of this.prevActions) {
      if (!this.actions.has(a)) this.justReleasedActions.add(a);
    }
  }

  endFrame() {
    this.anyKeyThisFrame = false;
  }

  isDown(...actionsList) {
    return actionsList.some((a) => this.actions.has(a));
  }

  justPressed(...actionsList) {
    return actionsList.some((a) => this.justPressedActions.has(a));
  }

  justReleased(...actionsList) {
    return actionsList.some((a) => this.justReleasedActions.has(a));
  }

  // Returns -1/0/1 on an axis, from keys + dpad/analog.
  axis(neg, pos) {
    let v = 0;
    if (this.isDown(neg)) v -= 1;
    if (this.isDown(pos)) v += 1;
    return v;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
