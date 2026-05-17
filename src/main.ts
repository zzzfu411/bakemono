import './style.css';
import { startGame } from './game';
import { showStartScreen } from './start-screen';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

(async () => {
  await showStartScreen();
  document.body.classList.remove('pre-game');
  startGame(canvas);
})();
