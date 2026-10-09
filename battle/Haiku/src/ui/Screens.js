// Полноэкранные меню: титульный экран, пауза, game over, победа.
// Разметка создаётся строками и вставляется в один контейнер.
export class Screens {
  constructor(root) {
    this.root = root;
  }

  show(html) {
    this.root.innerHTML = `<div class="panel">${html}</div>`;
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }

  title(highScore) {
    this.show(`
      <h1>ALLEY RIOT</h1>
      <p class="lead">Press <b>ENTER</b> / <b>SPACE</b> / gamepad <b>A</b> to start</p>
      <div class="controls">
        <div><b>Move</b> arrows / WASD / left stick</div>
        <div><b>Jump</b> Space &middot; <b>Punch</b> J &middot; <b>Kick</b> K</div>
        <div><b>Spin kick</b> L &middot; <b>Grab / throw</b> G, then J &middot; <b>Pause</b> P / Esc &middot; <b>Mute</b> M</div>
      </div>
      <p class="best">Best score: ${highScore}</p>
    `);
  }

  pause() {
    this.show(`
      <h2>PAUSED</h2>
      <p class="lead">Press <b>P</b> / <b>Esc</b> to resume &middot; <b>Q</b> to quit to title</p>
    `);
  }

  gameOver(score, highScore) {
    this.show(`
      <h2 class="bad">GAME OVER</h2>
      <p class="lead">Score: <b>${score}</b> &middot; Best: ${highScore}</p>
      <p class="lead">Press <b>ENTER</b> to return to title</p>
    `);
  }

  victory(score, highScore) {
    this.show(`
      <h2 class="good">VICTORY</h2>
      <p class="lead">The streets are quiet again.</p>
      <p class="lead">Final score: <b>${score}</b> &middot; Best: ${highScore}</p>
      <p class="lead">Press <b>ENTER</b> to return to title</p>
    `);
  }
}
