// Состояния игры: меню, вступление уровня, игра, пауза, переход между уровнями, game over, победа.
// Обработчики вызываются с this = Game (см. StateMachine).
import { LEVELS } from '../level/levels.js';

export function createStates(sm) {
  // Меню: демонстрационный уровень за спиной, герой не управляется
  sm.add('title', {
    enter() {
      this.world.acceptInput = false;
      this.hud.setVisible(false);
      this.loadLevel(0);
      this.screens.title(this.session.best);
    },
    update(dt, sm) {
      this.updateWorld(dt);
      if (this.input.wasPressed('confirm')) {
        this.audio.play('select');
        this.startNewGame();
      }
    },
    exit() {
      this.screens.hide();
    },
  });

  // Вступление: баннер с названием уровня или сообщением, управление заблокировано
  sm.add('intro', {
    enter(sm, { title, sub = '', seconds = 2.2 } = {}) {
      this.world.acceptInput = false;
      this.hud.setVisible(true);
      this.hud.flash(title, sub, seconds);
      this.stateTimer = seconds;
    },
    update(dt, sm) {
      this.updateWorld(dt);
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) sm.set('playing');
    },
  });

  sm.add('playing', {
    enter() {
      this.world.acceptInput = true;
      this.hud.setVisible(true);
    },
    update(dt, sm) {
      this.updateWorld(dt);
      if (this.hero.dying) {
        this.hero.deathTimer += dt;
        if (this.hero.deathTimer > 1.8) return this.onHeroDeath(sm);
        return;
      }
      if (this.input.wasPressed('pause')) return sm.set('paused');
      if (this.level.isComplete()) return sm.set('levelclear');
    },
  });

  sm.add('paused', {
    enter() {
      this.world.acceptInput = false;
      this.screens.pause();
    },
    update(dt, sm) {
      if (this.input.wasPressed('pause')) return sm.set('playing');
      if (this.input.wasPressed('quit')) return sm.set('title');
    },
    exit() {
      this.screens.hide();
    },
  });

  sm.add('levelclear', {
    enter(sm) {
      this.world.acceptInput = false;
      this.stateTimer = 3;
      this.addScore(1000);
      this.audio.play('pickup');
      this.hud.flash('STAGE CLEAR', 'Bonus +1000', 3);
    },
    update(dt, sm) {
      this.updateWorld(dt);
      this.stateTimer -= dt;
      if (this.stateTimer > 0) return;
      const next = this.session.levelIndex + 1;
      if (next < LEVELS.length) {
        this.loadLevel(next);
        return sm.set('intro', { title: LEVELS[next].title, sub: 'Get ready', seconds: 2.4 });
      }
      return sm.set('victory');
    },
  });

  sm.add('gameover', {
    enter() {
      this.world.acceptInput = false;
      this.hud.setVisible(false);
      this.saveBest();
      this.screens.gameOver(this.session.score, this.session.best);
    },
    update(dt, sm) {
      this.updateWorld(dt);
      if (this.input.wasPressed('confirm')) sm.set('title');
    },
    exit() {
      this.screens.hide();
    },
  });

  sm.add('victory', {
    enter() {
      this.world.acceptInput = false;
      this.hud.setVisible(false);
      this.saveBest();
      this.screens.victory(this.session.score, this.session.best);
    },
    update(dt, sm) {
      this.updateWorld(dt);
      if (this.input.wasPressed('confirm')) sm.set('title');
    },
    exit() {
      this.screens.hide();
    },
  });
}
