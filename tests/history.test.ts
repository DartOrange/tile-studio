import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMap } from '../src/model';
import {
  History,
  Stroke,
  HISTORY_CELL_BUDGET,
  HISTORY_LIMIT,
} from '../src/history';

test('one undo reverts an entire interpolated stroke and redo restores it', () => {
  const map = createMap('Test', 16, 16);
  const history = new History();
  const stroke = new Stroke(map, 5);
  stroke.visit({ x: 1, y: 2 });
  stroke.visit({ x: 13, y: 2 });
  stroke.visit({ x: 1, y: 2 });
  assert.equal(stroke.finish().length, 13);
  history.push(stroke.finish());
  assert.equal(map.cells.filter((id) => id === 5).length, 13);
  assert.ok(history.undo(map));
  assert.deepEqual(map.cells, Array<number>(256).fill(0));
  assert.ok(history.redo(map));
  assert.equal(map.cells.filter((id) => id === 5).length, 13);
});
test('new edits invalidate redo; no-ops preserve it', () => {
  const map = createMap('Test', 8, 8);
  const history = new History();
  const stroke = new Stroke(map, 1);
  stroke.visit({ x: 0, y: 0 });
  history.push(stroke.finish());
  history.undo(map);
  const noop = new Stroke(map, 0);
  noop.visit({ x: 4, y: 4 });
  assert.equal(history.push(noop.finish()), false);
  assert.equal(history.redoCount, 1);
  const edit = new Stroke(map, 2);
  edit.visit({ x: 3, y: 4 });
  history.push(edit.finish());
  assert.equal(history.redoCount, 0);
});
test('cancellation restores all cells without touching committed history', () => {
  const map = createMap('Test', 8, 8, 3);
  const before = [...map.cells];
  const history = new History();
  const stroke = new Stroke(map, 0);
  stroke.visit({ x: 0, y: 0 });
  stroke.visit({ x: 7, y: 7 });
  stroke.cancel();
  assert.deepEqual(map.cells, before);
  assert.deepEqual(stroke.finish(), []);
  assert.equal(history.undoCount, 0);
});
test('outside excursions break interpolation rather than drawing across re-entry', () => {
  const map = createMap('Test', 16, 16);
  const stroke = new Stroke(map, 1);
  stroke.visit({ x: 0, y: 0 });
  stroke.visit({ x: -1, y: 0 });
  stroke.visit({ x: 15, y: 15 });
  assert.equal(stroke.finish().length, 2);
  assert.equal(map.cells.length, 256);
});
test('history bounds both operation count and total retained cell changes', () => {
  const map = createMap('Test', 64, 64);
  const history = new History();
  for (let i = 0; i < 140; i++)
    history.push([{ index: 0, before: 0, after: 1 }]);
  assert.equal(history.undoCount, HISTORY_LIMIT);
  history.clear();
  for (let i = 0; i < 20; i++)
    history.push(
      Array.from({ length: 4096 }, (_, index) => ({
        index,
        before: 0,
        after: 1,
      })),
    );
  assert.ok(history.storedCells <= HISTORY_CELL_BUDGET);
  assert.equal(history.undoCount, 8);
  history.undo(map);
  assert.ok(history.storedCells <= HISTORY_CELL_BUDGET);
});
