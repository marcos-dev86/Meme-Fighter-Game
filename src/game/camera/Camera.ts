import type { MapDef, Vector2 } from '@/types/game';

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Ideal top-left world-space offset for the camera to show `target`
 * centered on screen, clamped so the viewport never shows past the map
 * edges. If the map is smaller than the viewport on an axis, that axis is
 * centered on the map instead of clamped to [0, max].
 *
 * This is a pure function on purpose: smoothing/lerp toward this value
 * happens once, in the game loop, so this stays easy to reason about and
 * reuse (e.g. for a future cutscene camera that doesn't want smoothing).
 */
export function computeCameraPosition(map: MapDef, target: Vector2, viewport: Viewport): Vector2 {
  const mapPixelWidth = map.width * map.tileSize;
  const mapPixelHeight = map.height * map.tileSize;

  let x = target.x - viewport.width / 2;
  let y = target.y - viewport.height / 2;

  const maxX = Math.max(0, mapPixelWidth - viewport.width);
  const maxY = Math.max(0, mapPixelHeight - viewport.height);

  x = Math.min(Math.max(x, 0), maxX);
  y = Math.min(Math.max(y, 0), maxY);

  if (mapPixelWidth < viewport.width) {
    x = -(viewport.width - mapPixelWidth) / 2;
  }
  if (mapPixelHeight < viewport.height) {
    y = -(viewport.height - mapPixelHeight) / 2;
  }

  return { x, y };
}
