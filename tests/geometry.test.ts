import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitView, lineCells, screenToCell, zoomAt } from '../src/geometry';

test('cell transforms preserve coordinates after pan and zoom at CSS-pixel precision', () => {
  for (const zoom of [0.25, 0.53, 1, 1.7, 4])
    for (const x of [0, 7, 35, 63])
      for (const y of [0, 11, 25, 63]) {
        const view = { x: -157.35, y: 86.25, zoom };
        const point = {
          x: view.x + (x + 0.5) * 24 * zoom,
          y: view.y + (y + 0.5) * 24 * zoom,
        };
        assert.deepEqual(screenToCell(point, view, 24), { x, y });
        // Pointer coordinates remain in CSS pixels, even when the backing store is 2×.
        const backing = { x: point.x * 2, y: point.y * 2 };
        assert.deepEqual(
          screenToCell({ x: backing.x / 2, y: backing.y / 2 }, view, 24),
          { x, y },
        );
      }
});
test('tile boundaries and negative positions floor instead of truncating', () => {
  assert.deepEqual(
    screenToCell({ x: -0.01, y: 24 }, { x: 0, y: 0, zoom: 1 }, 24),
    { x: -1, y: 1 },
  );
});
test('zoom keeps its anchor stationary and respects limits', () => {
  const view = { x: -81, y: 56, zoom: 0.7 };
  const anchor = { x: 513, y: 177 };
  for (const requested of [0.01, 0.4, 2, 99]) {
    const next = zoomAt(view, anchor, requested);
    assert.ok(
      Math.abs(
        (anchor.x - next.x) / next.zoom - (anchor.x - view.x) / view.zoom,
      ) < 1e-8,
    );
    assert.ok(
      Math.abs(
        (anchor.y - next.y) / next.zoom - (anchor.y - view.y) / view.zoom,
      ) < 1e-8,
    );
    assert.ok(next.zoom >= 0.25 && next.zoom <= 4);
  }
});
test('fit centers ordinary laptop and high-resolution maps within the viewport', () => {
  for (const [w, h, mw, mh] of [
    [1082, 616, 36, 26],
    [1640, 900, 64, 64],
    [760, 520, 8, 8],
  ]) {
    const view = fitView(w!, h!, mw!, mh!, 24);
    assert.ok(view.x >= 0 && view.y >= 0);
    assert.ok(Math.abs(2 * view.x + mw! * 24 * view.zoom - w!) < 1e-8);
    assert.ok(Math.abs(2 * view.y + mh! * 24 * view.zoom - h!) < 1e-8);
  }
});
test('fast horizontal, steep, diagonal, and reverse strokes contain no gaps', () => {
  for (const end of [
    { x: 25, y: 3 },
    { x: 4, y: 25 },
    { x: 21, y: 21 },
    { x: -12, y: -18 },
  ]) {
    const start = { x: 3, y: 3 };
    const cells = lineCells(start, end);
    assert.deepEqual(cells[0], start);
    assert.deepEqual(cells.at(-1), end);
    assert.equal(
      cells.length,
      Math.max(Math.abs(end.x - 3), Math.abs(end.y - 3)) + 1,
    );
    for (let i = 1; i < cells.length; i++) {
      assert.ok(Math.abs(cells[i]!.x - cells[i - 1]!.x) <= 1);
      assert.ok(Math.abs(cells[i]!.y - cells[i - 1]!.y) <= 1);
    }
  }
});
