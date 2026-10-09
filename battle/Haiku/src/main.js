// Точка входа: подключаем стили и запускаем игру.
import './ui/hud.css';
import { Game } from './core/Game.js';

const game = new Game(document.getElementById('app'));
game.start();

// Для отладки из консоли браузера
window.__game = game;
