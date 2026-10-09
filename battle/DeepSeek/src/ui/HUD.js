// DOM-based HUD + menus. Kept out of the WebGL layer for crisp text.

import { LEVEL_NAMES } from '../core/Constants.js';

export class HUD {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this._build();

    this._msgTimer = 0;
    this._comboDisplay = 0;
    this._lastCombo = 0;
    this._vignetteTimer = 0;
    this._bossRef = null;
    this.menuIndex = 0;
    this.currentScreen = 'menu';
    this._menuItems = [];
  }

  _build() {
    this.root.innerHTML = `
      <div id="hud">
        <div class="hud-top">
          <div class="hud-left">
            <div class="portrait"><div class="portrait-face"></div></div>
            <div class="stat-bars">
              <div class="bar health"><div class="fill" id="health-fill"></div><span class="bar-label" id="health-text">120</span></div>
              <div class="bar energy"><div class="fill" id="energy-fill"></div><span class="bar-label small">SP</span></div>
            </div>
            <div class="lives" id="lives"></div>
          </div>
          <div class="hud-center">
            <div id="level-label">NEON STREETS</div>
            <div id="go-arrow" class="hidden">GO &rarr;</div>
          </div>
          <div class="hud-right">
            <div id="score">0</div>
            <div id="high-label">SCORE</div>
          </div>
        </div>
        <div id="combo" class="hidden"><span id="combo-num">0</span><small>HITS</small></div>
        <div id="boss-bar" class="hidden">
          <div id="boss-name">BOSS</div>
          <div class="bar boss"><div class="fill" id="boss-fill"></div></div>
        </div>
        <div id="banner" class="hidden"><div id="banner-title"></div><div id="banner-sub"></div></div>
        <div id="vignette"></div>
        <div id="hitflash"></div>
      </div>
      <div id="screens">
        <div class="screen" id="screen-menu">
          <div class="logo">NEON<span>FIST</span></div>
          <div class="tagline">A procedural street-fighting brawler</div>
          <div class="menu" id="menu-main"></div>
          <div class="controls">
            <div class="controls-title">CONTROLS</div>
            <div class="control-grid">
              <span>MOVE</span><b>WASD / ARROWS</b>
              <span>JUMP</span><b>SPACE</b>
              <span>PUNCH</span><b>J</b>
              <span>KICK</span><b>K</b>
              <span>GRAB / THROW</span><b>E</b>
              <span>SPECIAL</span><b>L</b>
              <span>PAUSE</span><b>P</b>
            </div>
            <div class="gamepad-note">Gamepads supported (A jump, X punch, Y kick, B grab, LB/RB special)</div>
          </div>
        </div>
        <div class="screen hidden" id="screen-pause">
          <div class="panel-title">PAUSED</div>
          <div class="menu" id="menu-pause"></div>
        </div>
        <div class="screen hidden" id="screen-gameover">
          <div class="panel-title red">GAME OVER</div>
          <div class="score-line">FINAL SCORE <b id="gameover-score">0</b></div>
          <div class="menu" id="menu-gameover"></div>
        </div>
        <div class="screen hidden" id="screen-victory">
          <div class="panel-title gold">YOU CLEARED THE CITY</div>
          <div class="score-line">FINAL SCORE <b id="victory-score">0</b></div>
          <div class="menu" id="menu-victory"></div>
        </div>
        <div class="screen hidden" id="screen-stageclear">
          <div class="panel-title gold" id="stageclear-title">STAGE CLEAR</div>
          <div class="score-line">NEXT STOP <b id="stageclear-next">-</b></div>
          <div class="hint">Press ENTER to continue</div>
        </div>
      </div>
    `;

    const $ = (id) => this.root.querySelector(id);
    this.el = {
      healthFill: $('#health-fill'),
      healthText: $('#health-text'),
      energyFill: $('#energy-fill'),
      lives: $('#lives'),
      score: $('#score'),
      levelLabel: $('#level-label'),
      goArrow: $('#go-arrow'),
      combo: $('#combo'),
      comboNum: $('#combo-num'),
      bossBar: $('#boss-bar'),
      bossName: $('#boss-name'),
      bossFill: $('#boss-fill'),
      banner: $('#banner'),
      bannerTitle: $('#banner-title'),
      bannerSub: $('#banner-sub'),
      vignette: $('#vignette'),
      hitflash: $('#hitflash'),
      screens: {
        menu: $('#screen-menu'),
        pause: $('#screen-pause'),
        gameover: $('#screen-gameover'),
        victory: $('#screen-victory'),
        stageclear: $('#screen-stageclear'),
      },
      menus: {
        menu: $('#menu-main'),
        pause: $('#menu-pause'),
        gameover: $('#menu-gameover'),
        victory: $('#menu-victory'),
      },
      gameoverScore: $('#gameover-score'),
      victoryScore: $('#victory-score'),
      stageclearTitle: $('#stageclear-title'),
      stageclearNext: $('#stageclear-next'),
    };
  }

  // ---- screens ----------------------------------------------------------

  setScreen(name) {
    const prev = this.currentScreen;
    // Level intro banner appears right before gameplay; keep menu hidden then.
    for (const [key, el] of Object.entries(this.el.screens)) {
      el.classList.toggle('hidden', key !== name);
    }
    // With name === null hide everything
    if (name === null) {
      for (const el of Object.values(this.el.screens)) el.classList.add('hidden');
    }
    this.currentScreen = name;
    this.menuIndex = 0;
    this.refreshMenuSelection();
  }

  setMenu(screenName, items) {
    this._menuItems = items;
    const menuEl = this.el.menus[screenName];
    menuEl.innerHTML = '';
    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'menu-item';
      row.textContent = item.label;
      row.addEventListener('mouseenter', () => {
        this.menuIndex = i;
        this.refreshMenuSelection();
      });
      row.addEventListener('click', () => {
        item.action();
      });
      menuEl.appendChild(row);
    });
    this.menuIndex = 0;
    this.refreshMenuSelection();
  }

  refreshMenuSelection() {
    const menuEl = this.el.menus[this.currentScreen];
    if (!menuEl) return;
    const rows = menuEl.querySelectorAll('.menu-item');
    rows.forEach((r, i) => r.classList.toggle('selected', i === this.menuIndex));
  }

  navigateMenu(dt, input, onConfirm) {
    const rows = this.el.menus[this.currentScreen];
    const n = this._menuItems.length;
    if (!rows || n === 0) return;
    if (input.justPressed('up')) {
      this.menuIndex = (this.menuIndex - 1 + n) % n;
      this.game.audio.uiMove();
      this.refreshMenuSelection();
    }
    if (input.justPressed('down')) {
      this.menuIndex = (this.menuIndex + 1) % n;
      this.game.audio.uiMove();
      this.refreshMenuSelection();
    }
    if (input.justPressed('confirm', 'jump')) {
      this.game.audio.uiConfirm();
      const item = this._menuItems[this.menuIndex];
      if (item) item.action();
    }
  }

  // ---- gameplay widgets --------------------------------------------------

  update(dt) {
    const game = this.game;
    const hero = game.getHero();

    if (hero) {
      const hp = Math.max(0, hero.health) / hero.maxHealth;
      this.el.healthFill.style.width = `${hp * 100}%`;
      this.el.healthFill.classList.toggle('low', hp < 0.3);
      this.el.healthText.textContent = `${Math.max(0, Math.ceil(hero.health))}`;
      this.el.energyFill.style.width = `${(hero.energy / hero.maxEnergy) * 100}%`;
      this.el.energyFill.classList.toggle('full', hero.energy >= 35);
    }

    this.el.score.textContent = game.score.toLocaleString();
    this.el.levelLabel.textContent = game.level ? game.level.def.name : '';

    // Lives
    const lives = game.getLives();
    if (this._lastLives !== lives) {
      this._lastLives = lives;
      this.el.lives.innerHTML = '';
      for (let i = 0; i < Math.max(0, lives); i++) {
        const pip = document.createElement('div');
        pip.className = 'life-pip';
        this.el.lives.appendChild(pip);
      }
    }

    // GO arrow: visible when not locked and there's more level ahead
    const showGo = game.level && !game.level.isLocked() && game.state.is('playing')
      && game.level.waveIndex <= game.level.def.waves.length;
    this.el.goArrow.classList.toggle('hidden', !showGo);

    // Combo
    const combo = game.combat.combo;
    if (combo >= 2) {
      this.el.combo.classList.remove('hidden');
      if (combo !== this._lastCombo) {
        this._lastCombo = combo;
        this.el.comboNum.textContent = combo;
        this.el.combo.classList.remove('pop');
        void this.el.combo.offsetWidth;
        this.el.combo.classList.add('pop');
      }
    } else {
      this.el.combo.classList.add('hidden');
      this._lastCombo = 0;
    }

    // Boss bar
    const boss = game.getActiveBoss();
    if (boss && !boss.dead) {
      this.el.bossBar.classList.remove('hidden');
      this.el.bossName.textContent = boss.bossTitle;
      this.el.bossFill.style.width = `${(boss.health / boss.maxHealth) * 100}%`;
    } else {
      this.el.bossBar.classList.add('hidden');
    }

    // Banner
    if (this._msgTimer > 0) {
      this._msgTimer -= dt;
      if (this._msgTimer <= 0) this.el.banner.classList.add('hidden');
    }

    // Vignette (damage flash)
    if (this._vignetteTimer > 0) {
      this._vignetteTimer -= dt;
      this.el.vignette.style.opacity = Math.max(0, this._vignetteTimer * 2.2).toString();
    } else {
      this.el.vignette.style.opacity = '0';
    }
  }

  showBanner(title, sub = '', duration = 2.2, cls = '') {
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub;
    this.el.banner.className = cls;
    this.el.banner.classList.remove('hidden');
    this._msgTimer = duration;
  }

  flashDamage() {
    this._vignetteTimer = 0.45;
  }

  showGameOver(score) {
    this.el.gameoverScore.textContent = score.toLocaleString();
  }

  showVictory(score) {
    this.el.victoryScore.textContent = score.toLocaleString();
  }

  showStageClear(nextName) {
    this.el.stageclearNext.textContent = nextName || '—';
  }
}
