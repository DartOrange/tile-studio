export interface Point {
  x: number;
  y: number;
}
export interface View {
  x: number;
  y: number;
  zoom: number;
}
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export function screenToCell(
  point: Point,
  view: View,
  tileSize: number,
): Point {
  return {
    x: Math.floor((point.x - view.x) / (tileSize * view.zoom)),
    y: Math.floor((point.y - view.y) / (tileSize * view.zoom)),
  };
}

export function zoomAt(view: View, anchor: Point, zoom: number): View {
  const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  const ratio = next / view.zoom;
  return {
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
    zoom: next,
  };
}

export function fitView(
  width: number,
  height: number,
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
): View {
  const zoom = Math.max(
    MIN_ZOOM,
    Math.min(
      2,
      (width - 100) / (mapWidth * tileSize),
      (height - 120) / (mapHeight * tileSize),
    ),
  );
  return {
    x: (width - mapWidth * tileSize * zoom) / 2,
    y: (height - mapHeight * tileSize * zoom) / 2,
    zoom,
  };
}

/** Bresenham interpolation includes both endpoints, in either direction. */
export function lineCells(from: Point, to: Point): Point[] {
  const cells: Point[] = [];
  let { x, y } = from;
  const dx = Math.abs(to.x - x);
  const dy = -Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1;
  const sy = y < to.y ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    cells.push({ x, y });
    if (x === to.x && y === to.y) break;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
  }
  return cells;
}
