// HUD (DOM поверх канваса): здоровье героя, жизни, счёт, название уровня, полоса босса,
// комбо, перезарядка спин-кика и всплывающие баннеры. Элементы создаются один раз,
// дальше обновляются только текст и ширина полос.
const TEMPLATE = `
  <div class="hud-left">
    <div class="label">HERO</div>
    <div class="bar"><div class="fill" data-el="heroFill"></div></div>
    <div class="stats"><span data-el="lives"></span><span data-el="score"></span></div>
    <div class="label small">SPIN</div>
    <div class="bar thin"><div class="fill spin" data-el="specialFill"></div></div>
  </div>
  <div class="hud-top" data-el="title"></div>
  <div class="hud-right hidden" data-el="bossWrap">
    <div class="label" data-el="bossName"></div>
    <div class="bar boss"><div class="fill boss" data-el="bossFill"></div></div>
  </div>
  <div class="combo hidden" data-el="combo"></div>
  <div class="banner hidden" data-el="banner">
    <div class="banner-title" data-el="bannerTitle"></div>
    <div class="banner-sub" data-el="bannerSub"></div>
  </div>
  <div class="hint">Move: arrows / WASD &middot; Jump: Space &middot; Punch: J &middot; Kick: K &middot; Spin: L &middot; Grab: G &middot; Pause: P</div>
`;

export class HUD {
  constructor(root) {
    root.innerHTML = TEMPLATE;
    this.el = {};
    root.querySelectorAll('[data-el]').forEach((node) => {
      this.el[node.dataset.el] = node;
    });
    this.root = root;
    this.bannerTime = 0;
  }

  setTitle(text) {
    this.el.title.textContent = text;
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
  }

  // Баннер по центру экрана: «STAGE 1», «LIFE LOST», «STAGE CLEAR» и т.п.
  flash(title, sub = '', seconds = 2) {
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub;
    this.el.banner.classList.remove('hidden');
    this.bannerTime = seconds;
  }

  hideBanner() {
    this.el.banner.classList.add('hidden');
    this.bannerTime = 0;
  }

  update(game, dt) {
    const { hero, level, combat, session } = game;
    const el = this.el;

    el.heroFill.style.width = `${(Math.max(0, hero.health) / hero.maxHealth) * 100}%`;
    el.lives.textContent = `LIVES ×${session.lives}`;
    el.score.textContent = `SCORE ${session.score}`;
    const ready = 1 - hero.specialCooldown / hero.specialMax;
    el.specialFill.style.width = `${Math.max(0, Math.min(1, ready)) * 100}%`;

    const boss = level?.boss ?? null;
    el.bossWrap.classList.toggle('hidden', !boss);
    if (boss) {
      el.bossName.textContent = boss.def.name;
      el.bossFill.style.width = `${(Math.max(0, boss.health) / boss.maxHealth) * 100}%`;
    }

    const showCombo = combat.combo >= 2;
    el.combo.classList.toggle('hidden', !showCombo);
    if (showCombo) el.combo.textContent = `COMBO ×${combat.combo}`;

    if (this.bannerTime > 0) {
      this.bannerTime -= dt;
      if (this.bannerTime <= 0) this.hideBanner();
    }
  }
}
