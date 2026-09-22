const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Bounds include the full soft vision edge and the directional pulse, clipped
// to the maze: lighting outside the world should not force excessive zoom.
function lightingBounds(maze, player, visionRadius, pulse) {
  const radius = (visionRadius * 1.3 + .5) * maze.tileSize;
  let left = player.x - radius, right = player.x + radius;
  let top = player.y - radius, bottom = player.y + radius;
  if (pulse) {
    const angles = [pulse.angle - pulse.halfAngle, pulse.angle + pulse.halfAngle];
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const difference = Math.atan2(Math.sin(angle - pulse.angle), Math.cos(angle - pulse.angle));
      if (Math.abs(difference) <= pulse.halfAngle) angles.push(angle);
    }
    const padding = maze.tileSize * .5;
    const points = [{ x: pulse.x, y: pulse.y }, ...angles.map((angle) => ({ x: pulse.x + Math.cos(angle) * pulse.radius, y: pulse.y + Math.sin(angle) * pulse.radius }))];
    for (const point of points) {
      left = Math.min(left, point.x - padding); right = Math.max(right, point.x + padding);
      top = Math.min(top, point.y - padding); bottom = Math.max(bottom, point.y + padding);
    }
  }
  return { left: clamp(left, 0, maze.width), right: clamp(right, 0, maze.width), top: clamp(top, 0, maze.height), bottom: clamp(bottom, 0, maze.height) };
}

export function getCamera(maze, player, aspect, follow, { visionRadius = 3, pulse = null, previous = null, dt = 0 } = {}) {
  const overviewWidth = Math.max(maze.width, maze.height * aspect);
  if (!follow) return { width: overviewWidth, height: overviewWidth / aspect, x: (maze.width - overviewWidth) / 2, y: (maze.height - overviewWidth / aspect) / 2 };
  const bounds = lightingBounds(maze, player, visionRadius, pulse);
  const targetWidth = Math.max(Math.min(maze.width, maze.tileSize * 11), bounds.right - bounds.left, (bounds.bottom - bounds.top) * aspect);
  // Widen immediately so even a short flash is fully visible. Ease only
  // the return zoom; smoothing both directions would crop most of the pulse.
  const zoomBlend = 1 - Math.exp(-Math.max(0, dt) * 3);
  const width = Math.min(overviewWidth, previous ? Math.max(targetWidth, previous.width + (targetWidth - previous.width) * zoomBlend) : targetWidth);
  const height = width / aspect;
  const centerBlend = 1 - Math.exp(-Math.max(0, dt) * 8);
  const place = (position, extent, world, low, high, previousCenter) => {
    if (extent >= world) return (world - extent) / 2;
    const targetCenter = pulse ? (low + high) / 2 : position;
    const center = previous ? previousCenter + (targetCenter - previousCenter) * centerBlend : targetCenter;
    // Camera bounds must contain the light even during pan/zoom transitions.
    return clamp(center - extent / 2, Math.max(0, high - extent), Math.min(world - extent, low));
  };
  return {
    width, height,
    x: place(player.x, width, maze.width, bounds.left, bounds.right, previous ? previous.x + previous.width / 2 : player.x),
    y: place(player.y, height, maze.height, bounds.top, bounds.bottom, previous ? previous.y + previous.height / 2 : player.y)
  };
}
