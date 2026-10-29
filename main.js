
import { Game } from "./Game.js";

const canvas = document.querySelector("#game");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Не найден игровой Canvas с id='game'.");
}

const game = new Game(canvas);

// Удобно для очистки экземпляра при ручной отладке.
window.addEventListener("pagehide", () => {
  game.destroy();
}, { once: true });
