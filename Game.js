
import { Player } from "./Player.js";
import { Input } from "./input.js";
import { intersects } from "./collision.js";

const WIDTH = 900;
const HEIGHT = 520;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.input = new Input();
    this.input.onPause = () => this.togglePause();

    // Пять платформ плюс земля.
    this.platforms = [
      { x: 0, y: 470, width: 900, height: 50, ground: true },
      { x: 120, y: 385, width: 145, height: 18 },
      { x: 315, y: 310, width: 145, height: 18 },
      { x: 510, y: 370, width: 125, height: 18 },
      { x: 665, y: 285, width: 125, height: 18 },
      { x: 390, y: 205, width: 125, height: 18 }
    ];

    // Три монеты. При рестарте их позиции восстанавливаются.
    this.coinStart = [
      { x: 177, y: 345 },
      { x: 365, y: 270 },
      { x: 708, y: 245 }
    ];

    this.hazard = { x: 430, y: 450, width: 100, height: 20 };
    this.finish = { x: 830, y: 410, width: 40, height: 60 };

    this.player = new Player(35, 420);

    this.state = "ready";
    this.score = 0;
    this.best = this.loadBest();
    this.coins = [];
    this.lastTime = null;
    this.rafId = null;
    this.destroyed = false;

    this.ui = {
      score: document.querySelector("#score"),
      best: document.querySelector("#best"),
      status: document.querySelector("#status"),
      overlay: document.querySelector("#overlay"),
      overlayEmoji: document.querySelector("#overlayEmoji"),
      overlayTitle: document.querySelector("#overlayTitle"),
      overlayText: document.querySelector("#overlayText"),
      overlayButton: document.querySelector("#overlayButton"),
      start: document.querySelector("#startButton"),
      pause: document.querySelector("#pauseButton"),
      resume: document.querySelector("#resumeButton"),
      restart: document.querySelector("#restartButton")
    };

    this.handleVisibility = this.handleVisibility.bind(this);
    this.bindUI();
    this.resetWorld();
    this.updateUI();

    document.addEventListener("visibilitychange", this.handleVisibility);

    // Единственный постоянный цикл анимации.
    this.requestFrame();
  }

  bindUI() {
    this.ui.start.addEventListener("click", () => this.start());
    this.ui.pause.addEventListener("click", () => this.pause());
    this.ui.resume.addEventListener("click", () => this.resume());
    this.ui.restart.addEventListener("click", () => this.restart());

    this.ui.overlayButton.addEventListener("click", () => {
      if (this.state === "paused") {
        this.resume();
      } else {
        this.start();
      }
    });
  }

  loadBest() {
    try {
      const value = Number(localStorage.getItem("piggy-best") || 0);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      localStorage.setItem("piggy-best", String(this.best));
    } catch {
      // Игра продолжает работать, даже если хранилище недоступно.
    }
  }

  resetWorld() {
    this.player.reset();
    this.score = 0;
    this.coins = this.coinStart.map((coin) => ({
      ...coin,
      radius: 12,
      collected: false,
      phase: Math.random() * Math.PI * 2
    }));
    this.updateUI();
  }

  start() {
    if (this.destroyed) return;

    if (this.state === "running") return;

    this.resetWorld();
    this.state = "running";
    this.input.setActive(true);
    this.lastTime = null;
    this.hideOverlay();
    this.updateUI();
  }

  pause() {
    if (this.state !== "running") return;

    this.state = "paused";
    this.input.setActive(false);
    this.lastTime = null;

    this.showOverlay(
      "⏸️",
      "Пауза",
      "Передохни немного. Монетки ждут!",
      "Продолжить"
    );

    this.updateUI();
  }

  resume() {
    if (this.state !== "paused") return;

    this.state = "running";
    this.input.setActive(true);
    this.lastTime = null;
    this.hideOverlay();
    this.updateUI();
  }

  togglePause() {
    if (this.state === "running") this.pause();
    else if (this.state === "paused") this.resume();
  }

  restart() {
    if (this.destroyed) return;

    this.input.setActive(false);
    this.resetWorld();
    this.state = "ready";
    this.lastTime = null;

    this.showOverlay(
      "🐷",
      "На старт!",
      "Собери все три монетки и найди финиш.",
      "Играть!"
    );

    this.updateUI();
  }

  handleVisibility() {
    if (document.hidden && this.state === "running") {
      this.pause();
    }
    this.lastTime = null;
  }

  requestFrame() {
    if (this.rafId !== null || this.destroyed) return;

    this.rafId = requestAnimationFrame((time) => {
      this.rafId = null;
      this.frame(time);
    });
  }

  frame(time) {
    if (this.destroyed) return;

    if (this.state === "running") {
      if (this.lastTime === null) {
        this.lastTime = time;
      } else {
        // Ограничение dt предотвращает скачки физики после задержки.
        const dt = Math.min((time - this.lastTime) / 1000, 0.033);
        this.lastTime = time;
        this.update(dt);
      }
    } else {
      this.lastTime = null;
    }

    this.render();
    this.requestFrame();
  }

  update(dt) {
    this.player.update(dt, this.input, this.platforms);

    // Сбор монет.
    for (const coin of this.coins) {
      if (coin.collected) continue;

      const coinBox = {
        x: coin.x - coin.radius,
        y: coin.y - coin.radius,
        width: coin.radius * 2,
        height: coin.radius * 2
      };

      if (intersects(this.player, coinBox)) {
        coin.collected = true;
        this.score += 1;

        if (this.score > this.best) {
          this.best = this.score;
          this.saveBest();
        }

        this.updateUI();
      }
    }

    // Падение за пределы уровня.
    if (this.player.y > HEIGHT + 60) {
      this.finishGame(false, "Ой! Свинка упала за край уровня.");
      return;
    }

    // Опасная зона.
    if (intersects(this.player, this.hazard)) {
      this.finishGame(false, "Осторожнее! Ты попала в опасную зону.");
      return;
    }

    // Финиш доступен только после сбора всех монет.
    if (intersects(this.player, this.finish)) {
      if (this.score === this.coins.length) {
        this.finishGame(true, "Все монетки собраны. Ты великолепна!");
      } else {
        this.ui.status.textContent = "Собери все монеты!";
      }
    }
  }

  finishGame(won, message) {
    this.state = won ? "won" : "lost";
    this.input.setActive(false);
    this.lastTime = null;

    this.showOverlay(
      won ? "🏆" : "💗",
      won ? "Ура, победа!" : "Попробуем ещё?",
      message,
      "Заново"
    );

    this.updateUI();
  }

  updateUI() {
    this.ui.score.textContent = `${this.score} / ${this.coins.length}`;
    this.ui.best.textContent = String(this.best);

    const labels = {
      ready: "Готов к игре",
      running: "Свинка в пути!",
      paused: "Пауза",
      won: "Победа!",
      lost: "Игра окончена"
    };

    this.ui.status.textContent = labels[this.state] || "Готов к игре";

    this.ui.start.disabled = this.state === "running";
    this.ui.pause.disabled = this.state !== "running";
    this.ui.resume.disabled = this.state !== "paused";
  }

  showOverlay(emoji, title, message, buttonText) {
    this.ui.overlayEmoji.textContent = emoji;
    this.ui.overlayTitle.textContent = title;
    this.ui.overlayText.textContent = message;
    this.ui.overlayButton.textContent = buttonText;
    this.ui.overlay.classList.remove("hidden");
  }

  hideOverlay() {
    this.ui.overlay.classList.add("hidden");
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawBackground(ctx);
    this.drawPlatforms(ctx);
    this.drawHazard(ctx);
    this.drawFinish(ctx);
    this.drawCoins(ctx);
    this.player.draw(ctx);
  }

  drawBackground(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#c6edff");
    sky.addColorStop(1, "#fff0f4");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Далёкие холмы.
    ctx.fillStyle = "#c6e9c4";
    ctx.beginPath();
    ctx.moveTo(0, 380);
    ctx.quadraticCurveTo(150, 260, 310, 380);
    ctx.quadraticCurveTo(470, 290, 630, 375);
    ctx.quadraticCurveTo(790, 260, 900, 350);
    ctx.lineTo(900, 470);
    ctx.lineTo(0, 470);
    ctx.fill();

    // Облачка.
    this.drawCloud(ctx, 100, 95, 1);
    this.drawCloud(ctx, 410, 80, 0.75);
    this.drawCloud(ctx, 730, 120, 0.9);

    // Декоративные звёздочки.
    ctx.fillStyle = "#ffffffaa";
    for (const [x, y] of [[275, 130], [580, 155], [820, 65], [45, 215]]) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCloud(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffffd9";
    ctx.beginPath();
    ctx.arc(0, 12, 18, 0, Math.PI * 2);
    ctx.arc(21, 1, 24, 0, Math.PI * 2);
    ctx.arc(45, 12, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPlatforms(ctx) {
    for (const p of this.platforms) {
      if (p.ground) {
        ctx.fillStyle = "#b5dfa4";
        ctx.fillRect(p.x, p.y, p.width, p.height);

        ctx.fillStyle = "#8bc984";
        ctx.fillRect(p.x, p.y, p.width, 8);

        ctx.fillStyle = "#9bd58d";
        for (let x = 10; x < WIDTH; x += 42) {
          ctx.beginPath();
          ctx.arc(x, p.y + 20, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "#a984c9";
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 8);
        ctx.fill();

        ctx.fillStyle = "#d7b9ed";
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, 6, 4);
        ctx.fill();

        ctx.fillStyle = "#8f6ab2";
        for (let x = p.x + 17; x < p.x + p.width - 8; x += 30) {
          ctx.beginPath();
          ctx.arc(x, p.y + 13, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawHazard(ctx) {
    const h = this.hazard;

    ctx.fillStyle = "#e98d9b";
    ctx.fillRect(h.x, h.y, h.width, h.height);

    ctx.fillStyle = "#fff0f1";
    for (let x = h.x + 5; x < h.x + h.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, h.y + h.height);
      ctx.lineTo(x + 10, h.y);
      ctx.lineTo(x + 16, h.y);
      ctx.lineTo(x + 6, h.y + h.height);
      ctx.fill();
    }

    ctx.fillStyle = "#b85371";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("ОПАСНО!", h.x + h.width / 2, h.y - 8);
  }

  drawFinish(ctx) {
    const f = this.finish;

    ctx.fillStyle = "#a984c9";
    ctx.fillRect(f.x + 4, f.y, 5, f.height);

    ctx.fillStyle = this.score === this.coins.length
      ? "#f7cf65"
      : "#f5a3c0";

    ctx.beginPath();
    ctx.moveTo(f.x + 9, f.y + 2);
    ctx.lineTo(f.x + 37, f.y + 12);
    ctx.lineTo(f.x + 9, f.y + 24);
    ctx.closePath();
    ctx.fill();

    ctx.font = "bold 13px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillStyle = "#79536f";
    ctx.fillText("ФИНИШ", f.x + 20, f.y - 8);
  }

  drawCoins(ctx) {
    for (const coin of this.coins) {
      if (coin.collected) continue;

      const bob = Math.sin(performance.now() / 300 + coin.phase) * 4;

      ctx.save();
      ctx.translate(coin.x, coin.y + bob);

      ctx.fillStyle = "#ffcf57";
      ctx.beginPath();
      ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#efa92e";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#fff0a6";
      ctx.beginPath();
      ctx.arc(-3, -4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#d28a20";
      ctx.font = "bold 15px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 1);

      ctx.restore();
    }
  }

  destroy() {
    this.destroyed = true;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.input.destroy();
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibility
    );
  }
}
