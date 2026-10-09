const KEY_MAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyJ: 'punch', KeyK: 'kick', KeyL: 'special', KeyE: 'grab',
};

export class Input {
  constructor(onPause) {
    this.keys = new Set();
    this.virtual = new Set();
    this.previous = new Set();
    this.onPause = onPause;
    this.onKeyDown = (event) => {
      if (KEY_MAP[event.code] || event.code === 'Escape') event.preventDefault();
      if (event.code === 'Escape' && !event.repeat) this.onPause();
      const action = KEY_MAP[event.code];
      if (action) this.keys.add(action);
    };
    this.onKeyUp = (event) => {
      const action = KEY_MAP[event.code];
      if (action) this.keys.delete(action);
    };
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => { this.keys.clear(); this.virtual.clear(); });
    document.querySelectorAll('[data-action]').forEach((button) => {
      const action = button.dataset.action;
      const press = (event) => { event.preventDefault(); this.virtual.add(action); button.setPointerCapture?.(event.pointerId); };
      const release = (event) => { event.preventDefault(); this.virtual.delete(action); };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    });
  }

  update() {
    this.current = new Set([...this.keys, ...this.virtual]);
  }

  down(action) { return this.current?.has(action) ?? false; }
  pressed(action) { return (this.current?.has(action) ?? false) && !this.previous.has(action); }
  finishFrame() { this.previous = new Set(this.current ?? []); }
}
