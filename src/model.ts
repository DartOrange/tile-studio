export const TILE_SIZE = 24;
export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_DIMENSION = 64;
export const MIN_DIMENSION = 8;
export const MAX_TILE_ID = 10;

export interface TileMap {
  format: 'tile-studio';
  version: 1;
  name: string;
  width: number;
  height: number;
  tileSize: 24;
  cells: number[];
}

export function createMap(
  name: string,
  width: number,
  height: number,
  fill = 0,
): TileMap {
  return validateMap({
    format: 'tile-studio',
    version: 1,
    name,
    width,
    height,
    tileSize: TILE_SIZE,
    cells: Array<number>(width * height).fill(fill),
  });
}

export function validateMap(value: unknown): TileMap {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a Tile Studio map object.');
  const map = value as Record<string, unknown>;
  if (map.format !== 'tile-studio')
    throw new Error('This is not a Tile Studio map.');
  if (map.version !== 1)
    throw new Error('Unsupported map version. Only version 1 is supported.');
  const keys = [
    'format',
    'version',
    'name',
    'width',
    'height',
    'tileSize',
    'cells',
  ];
  if (Object.keys(map).some((key) => !keys.includes(key)))
    throw new Error('Unexpected map fields. Use the version 1 schema.');
  if (
    typeof map.name !== 'string' ||
    !map.name.trim() ||
    map.name.length > 60 ||
    Array.from(map.name).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new Error('Map name must be 1–60 readable characters.');
  for (const key of ['width', 'height'] as const) {
    if (
      !Number.isInteger(map[key]) ||
      (map[key] as number) < MIN_DIMENSION ||
      (map[key] as number) > MAX_DIMENSION
    )
      throw new Error('Map dimensions must be whole numbers from 8 to 64.');
  }
  if (map.tileSize !== TILE_SIZE)
    throw new Error('Version 1 maps use 24-pixel tiles.');
  const width = map.width as number;
  const height = map.height as number;
  if (!Array.isArray(map.cells) || map.cells.length !== width * height)
    throw new Error(
      'Cell count must match width × height (at most 4,096 cells).',
    );
  // Array.from also exposes sparse-array holes as invalid values.
  const cells = Array.from(map.cells) as unknown[];
  if (
    cells.some(
      (tile) =>
        !Number.isInteger(tile) ||
        (tile as number) < 0 ||
        (tile as number) > MAX_TILE_ID,
    )
  )
    throw new Error('Unknown tile ID. Allowed IDs are 0–10.');
  return {
    format: 'tile-studio',
    version: 1,
    name: map.name.trim(),
    width,
    height,
    tileSize: TILE_SIZE,
    cells: cells as number[],
  };
}

export function parseMap(text: string): TileMap {
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES)
    throw new Error('Map file exceeds the 256 KiB limit.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      'Invalid JSON. Choose an unmodified Tile Studio JSON file.',
    );
  }
  return validateMap(value);
}

export function serializeMap(map: TileMap): string {
  return JSON.stringify(map);
}

export function exampleMap(): TileMap {
  const map = createMap('Willow Bay', 36, 26, 3);
  const set = (x: number, y: number, tile: number) => {
    map.cells[y * map.width + x] = tile;
  };
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const distance = ((x - 17.5) / 14.8) ** 2 + ((y - 12.5) / 10.5) ** 2;
      const edge = 0.06 * Math.sin(x * 1.8 + y * 1.1) + 0.04 * Math.cos(y * 2);
      if (distance < 1 + edge) set(x, y, 2);
      if (distance < 0.76 + edge) set(x, y, 1);
    }
  }
  // A stream feeds the bay on the eastern shore.
  for (let y = 4; y <= 18; y++) {
    const x = 23 + Math.round(Math.sin(y * 0.36) * 2);
    set(x, y, 3);
    set(x + 1, y, 3);
    if (y > 14) set(x + 2, y, 3);
  }
  // Village paths, clearing, and a small jetty.
  for (let x = 10; x <= 26; x++) {
    set(x, 14, 4);
    set(x, 15, 4);
  }
  for (let y = 8; y <= 19; y++) {
    set(16, y, 4);
    set(17, y, 4);
  }
  for (let y = 10; y <= 13; y++) for (let x = 11; x <= 20; x++) set(x, y, 4);
  for (const [x, y] of [
    [12, 10],
    [15, 10],
    [19, 11],
    [11, 17],
  ] as const)
    set(x, y, 8);
  for (let x = 23; x <= 27; x++) {
    set(x, 14, 9);
    set(x, 15, 9);
  }
  for (let y = 20; y <= 23; y++) {
    set(16, y, 9);
    set(17, y, 9);
  }
  for (let y = 3; y < 23; y++)
    for (let x = 3; x < 33; x++) {
      if (map.cells[y * 36 + x] !== 1) continue;
      const seed = (x * 37 + y * 19 + x * y * 7) % 41;
      if (seed < 10 && !(x >= 10 && x <= 21 && y >= 8 && y <= 18)) set(x, y, 5);
      else if (seed === 11 || seed === 12) set(x, y, 7);
      else if (seed === 14) set(x, y, 6);
      else if (seed === 17) set(x, y, 10);
    }
  return map;
}
