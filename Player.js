
import { resolvePlatformCollisions } from "./collision.js";

export class Player {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.width = 36;
    this.height = 36;

    this.speed = 250;
    this.jumpSpeed = 570;
    this.gravity = 1450;

    this.reset();
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.previous = { x: this.x, y: this.y };
    this.walkTime = 0;
  }

  update(dt, input, platforms) {
    this.previous = { x: this.x, y: this.y };

    const left = input.isLeft();
    const right = input.isRight();

    let direction = 0;
    if (left) direction -= 1;
    if (right) direction += 1;

    this.vx = direction * this.speed;

    if (direction !== 0) {
      this.facing = direction;
      this.walkTime += dt * 12;
    } else {
      this.walkTime = 0;
    }

    if (input.consumeJump() && this.onGround) {
      this.vy = -this.jumpSpeed;
      this.onGround = false;
    }

    this.vy += this.gravity * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Границы игрового мира.
    this.x = Math.max(0, Math.min(900 - this.width, this.x));

    resolvePlatformCollisions(this, platforms);
  }

  draw(ctx) {
    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    const bounce = this.onGround && this.vx !== 0
      ? Math.sin(this.walkTime) * 1.5
      : 0;

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + bounce);
    ctx.scale(this.facing, 1);

    // Ножки.
    ctx.fillStyle = "#d76e96";
    ctx.fillRect(-10, 11, 7, 7);
    ctx.fillRect(5, 11, 7, 7);

    // Ушки.
    ctx.fillStyle = "#f39cbb";
    ctx.beginPath();
    ctx.ellipse(-10, -11, 5, 9, -0.5, 0, Math.PI * 2);
    ctx.ellipse(8, -12, 5, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Тело.
    ctx.fillStyle = "#ffb9d0";
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e98dad";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Глаз.
    ctx.fillStyle = "#633b53";
    ctx.beginPath();
    ctx.arc(7, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Пятачок.
    ctx.fillStyle = "#ed82a7";
    ctx.beginPath();
    ctx.ellipse(12, 3, 7, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b74e76";
    ctx.beginPath();
    ctx.arc(10, 3, 1.2, 0, Math.PI * 2);
    ctx.arc(14, 3, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Завиток хвостика.
    ctx.strokeStyle = "#e98dad";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-16, 4, 4, 0, Math.PI * 1.7);
    ctx.stroke();

    // Блик.
    ctx.fillStyle = "#fff5fa";
    ctx.beginPath();
    ctx.arc(-5, -7, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
