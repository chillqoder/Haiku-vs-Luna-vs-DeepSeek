const byId = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.overlay = byId('overlay');
    this.screens = [...document.querySelectorAll('[data-screen]')];
    this.toastTimer = null;
  }

  bind(actions) {
    byId('start-button').addEventListener('click', actions.start);
    byId('resume-button').addEventListener('click', actions.resume);
    byId('pause-restart').addEventListener('click', actions.restart);
    byId('retry-button').addEventListener('click', actions.restart);
    byId('victory-restart').addEventListener('click', actions.restart);
    byId('pause-button').addEventListener('click', actions.pause);
  }

  showScreen(name) {
    this.screens.forEach((screen) => screen.classList.toggle('active', screen.dataset.screen === name));
    this.overlay.classList.toggle('hidden', name === 'playing');
  }

  update(data) {
    const { hero, score, level, combo, boss, specialCooldown, enemies } = data;
    const healthPercent = Math.max(0, hero.health / hero.maxHealth * 100);
    byId('hero-health').style.width = `${healthPercent}%`;
    byId('hero-health-label').textContent = `${Math.ceil(hero.health)} / ${hero.maxHealth}`;
    byId('lives').textContent = `${'♥ '.repeat(Math.max(0, hero.lives)).trim()}${hero.lives === 0 ? '—' : ''}`;
    byId('score').textContent = String(score).padStart(6, '0');
    byId('stage-number').textContent = level.code;
    byId('stage-name').textContent = level.name;
    byId('combo-count').textContent = combo;
    byId('combo-label').classList.toggle('visible', combo >= 2);
    byId('boss-panel').classList.toggle('hidden', !boss);
    if (boss) {
      byId('boss-name').textContent = boss.title.toUpperCase();
      byId('boss-health').style.width = `${Math.max(0, boss.health / boss.maxHealth * 100)}%`;
    }
    const hint = specialCooldown > 0 ? `SPIN CHARGING · ${specialCooldown.toFixed(0)}s` : 'SPECIAL READY · CLEAR THE BLOCK';
    byId('bottom-hint').textContent = boss ? `BOSS FIGHT · ${hint}` : enemies ? `CLEAR THE BLOCK · ${hint}` : `KEEP MOVING RIGHT · ${hint}`;
  }

  toast(message, duration = 1700) {
    const element = byId('toast');
    element.textContent = message;
    element.classList.add('visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => element.classList.remove('visible'), duration);
  }

  finalScore(score) { byId('final-score').textContent = String(score).padStart(6, '0'); }
}
