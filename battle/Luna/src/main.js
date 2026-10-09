import './styles.css';
import { Game } from './core/Game.js';
import { UI } from './ui/UI.js';

const ui = new UI();
const game = new Game(document.querySelector('#game-canvas'), ui);
ui.bind({
  start: () => game.startRun(),
  resume: () => game.resume(),
  restart: () => game.startRun(),
  pause: () => game.togglePause(),
});
game.run();
