
export function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function resolvePlatformCollisions(player, platforms) {
  const previous = player.previous;
  let landed = false;

  for (const platform of platforms) {
    const horizontalOverlap =
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width;

    if (!horizontalOverlap) continue;

    const previousBottom = previous.y + player.height;
    const currentBottom = player.y + player.height;

    // Приземление на верхнюю поверхность.
    if (
      player.vy >= 0 &&
      previousBottom <= platform.y &&
      currentBottom >= platform.y
    ) {
      player.y = platform.y - player.height;
      player.vy = 0;
      landed = true;
      continue;
    }

    // Удар головой о нижнюю поверхность.
    const previousTop = previous.y;
    const currentTop = player.y;

    if (
      player.vy < 0 &&
      previousTop >= platform.y + platform.height &&
      currentTop <= platform.y + platform.height
    ) {
      player.y = platform.y + platform.height;
      player.vy = 0;
    }
  }

  // Корректируем горизонтальное движение у стен платформ.
  for (const platform of platforms) {
    if (!intersects(player, platform)) continue;

    const previousRight = previous.x + player.width;
    const previousLeft = previous.x;

    if (previousRight <= platform.x && player.x + player.width > platform.x) {
      player.x = platform.x - player.width;
      player.vx = 0;
    } else if (
      previousLeft >= platform.x + platform.width &&
      player.x < platform.x + platform.width
    ) {
      player.x = platform.x + platform.width;
      player.vx = 0;
    }
  }

  player.onGround = landed;
}
