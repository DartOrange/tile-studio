export const TILES = [
  { id: 1, name: 'Meadow', family: 'Ground', color: '#90ad72' },
  { id: 2, name: 'Sand', family: 'Ground', color: '#e2c998' },
  { id: 3, name: 'Water', family: 'Ground', color: '#437e88' },
  { id: 4, name: 'Path', family: 'Ground', color: '#cba67d' },
  { id: 5, name: 'Pine', family: 'Nature', color: '#355e4c' },
  { id: 6, name: 'Stone', family: 'Nature', color: '#8d9992' },
  { id: 7, name: 'Flowers', family: 'Nature', color: '#d99286' },
  { id: 8, name: 'Cottage', family: 'Objects', color: '#bc7254' },
  { id: 9, name: 'Boardwalk', family: 'Objects', color: '#ac835c' },
  { id: 10, name: 'Reeds', family: 'Nature', color: '#b1ba75' },
] as const;

/** Original geometric artwork. Coordinates use a 24 × 24 logical tile. */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: number,
  x: number,
  y: number,
  variant = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  const rect = (color: string, a: number, b: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(a, b, w, h);
  };
  const poly = (color: string, points: number[]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0]!, points[1]!);
    for (let i = 2; i < points.length; i += 2)
      ctx.lineTo(points[i]!, points[i + 1]!);
    ctx.closePath();
    ctx.fill();
  };
  if (tile === 0) {
    ctx.restore();
    return;
  }
  const grass = () => {
    rect(variant % 3 === 0 ? '#91ae75' : '#8ca96e', 0, 0, 24, 24);
    rect('#a2bb83', 3 + (variant % 4), 5, 3, 1);
    rect('#7d9d63', 16, 16 - (variant % 3), 2, 2);
    rect('#a4bd84', 12, 21, 2, 1);
  };
  if (
    tile === 1 ||
    tile === 5 ||
    tile === 6 ||
    tile === 7 ||
    tile === 8 ||
    tile === 10
  )
    grass();
  if (tile === 2) {
    rect(variant % 2 ? '#e1c796' : '#e5cc9d', 0, 0, 24, 24);
    rect('#cbb382', 4, 16, 2, 1);
    rect('#f1deb5', 14, 5, 4, 1);
    rect('#d4bb8b', 20, 20, 1, 1);
  }
  if (tile === 3) {
    rect(variant % 4 === 0 ? '#417b86' : '#437f89', 0, 0, 24, 24);
    rect('#61959b', 4 + (variant % 5), 7, 7, 1);
    rect('#376e7b', 12, 19, 7, 1);
    if (variant % 3 === 0) rect('#76a6a8', 7, 6, 3, 1);
  }
  if (tile === 4) {
    rect('#cbaa80', 0, 0, 24, 24);
    rect('#d7b98f', 1, 2, 9, 8);
    rect('#c2a077', 13, 12, 10, 10);
    rect('#b99870', 7, 15, 3, 1);
    rect('#e1c59c', 15, 4, 3, 2);
  }
  if (tile === 5) {
    poly('#75925e', [5, 19, 17, 16, 24, 20, 15, 24, 5, 22]);
    rect('#87684c', 10, 16, 4, 7);
    poly('#315847', [12, 1, 21, 12, 18, 12, 23, 19, 2, 19, 6, 12, 3, 12]);
    poly('#467558', [12, 1, 12, 17, 3, 17, 7, 11, 5, 11]);
    poly('#598762', [12, 2, 12, 10, 7, 10]);
    rect('#294e40', 6, 19, 13, 2);
  }
  if (tile === 6) {
    poly('#75925f', [4, 18, 18, 16, 23, 20, 18, 23, 4, 22]);
    poly('#89968e', [4, 12, 9, 7, 17, 8, 21, 15, 18, 20, 5, 20]);
    poly('#acb4a4', [4, 12, 9, 7, 17, 8, 14, 13, 6, 15]);
    poly('#74867f', [14, 13, 17, 8, 21, 15, 18, 20, 13, 19]);
    rect('#c0c5b2', 8, 10, 4, 1);
  }
  if (tile === 7) {
    for (const [a, b] of [
      [5, 8],
      [15, 14],
      [7, 19],
      [19, 5],
    ]) {
      rect('#678d59', a!, b!, 1, 5);
      rect('#edd3a3', a! - 1, b! - 1, 3, 3);
      rect('#c98279', a!, b!, 1, 1);
    }
  }
  if (tile === 8) {
    rect('#769261', 3, 18, 21, 5);
    rect('#e5cf9f', 5, 10, 15, 12);
    rect('#b89670', 5, 19, 15, 3);
    rect('#685d4c', 11, 15, 4, 7);
    rect('#415e59', 6, 13, 3, 3);
    rect('#f1deb3', 6, 13, 1, 2);
    poly('#a65f48', [2, 11, 12, 2, 23, 11, 23, 13, 2, 13]);
    poly('#d18b65', [2, 10, 12, 1, 18, 7, 7, 10]);
    rect('#e0a278', 9, 5, 6, 1);
    rect('#735b4e', 17, 2, 3, 5);
  }
  if (tile === 9) {
    rect('#3e737b', 0, 0, 24, 24);
    rect('#785c47', 1, 0, 22, 24);
    for (let row = 1; row < 24; row += 6) {
      rect(row % 2 ? '#b08c62' : '#be9870', 2, row, 20, 5);
      rect('#d0aa7c', 3, row, 18, 1);
      rect('#6d5745', 4, row + 2, 1, 1);
      rect('#6d5745', 19, row + 2, 1, 1);
    }
  }
  if (tile === 10) {
    for (let a = 4; a <= 20; a += 4) {
      rect('#607b46', a, 8 + (a % 6), 1, 13 - (a % 6));
      rect('#bac27d', a + 1, 6 + (a % 6), 1, 11);
      rect('#8c794c', a, 5 + (a % 6), 2, 4);
    }
  }
  ctx.restore();
}
