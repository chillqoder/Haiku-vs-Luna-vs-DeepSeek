// Entry point: boots the game and unlocks audio on the first interaction.

import './ui/style.css';
import { Game } from './core/Game.js';

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');

const game = new Game(canvas, uiRoot);

// Unlock the AudioContext on the first user gesture (browser policy).
const unlock = () => {
  game.audio.unlock();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// Also unlock when clicking menu items.
uiRoot.addEventListener('pointerdown', () => game.audio.unlock());

window.addEventListener('resize', () => game.renderer.resize());

game.start();

// Expose for debugging in the console.
window.__game = game;
