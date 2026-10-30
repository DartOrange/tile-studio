import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMap,
  exampleMap,
  MAX_FILE_BYTES,
  parseMap,
  serializeMap,
  validateMap,
} from '../src/model';
import { DRAFT_KEY, isDirty, readDraft, writeDraft } from '../src/draft';

test('example and maximum-size maps round-trip every tile and dimension', () => {
  for (const map of [exampleMap(), createMap('Maximum', 64, 64, 10)])
    assert.deepEqual(parseMap(serializeMap(map)), map);
});
test('validation rejects malformed, unsupported, mismatched and unsafe input', () => {
  const valid = createMap('Test', 8, 8);
  for (const value of [
    null,
    [],
    {},
    { ...valid, version: 0 },
    { ...valid, version: 99 },
    { ...valid, format: 'other' },
    { ...valid, width: 7 },
    { ...valid, height: 65 },
    { ...valid, width: 8.5 },
    { ...valid, cells: [] },
    { ...valid, cells: [...valid.cells.slice(1), 11] },
    { ...valid, cells: [...valid.cells.slice(1), -1] },
    { ...valid, cells: [...valid.cells.slice(1), '1'] },
    { ...valid, cells: Array(64) },
    { ...valid, tileSize: 32 },
    { ...valid, name: '' },
    { ...valid, name: 'bad\u0000name' },
    { ...valid, name: 'x'.repeat(61) },
    { ...valid, extra: true },
  ]) {
    assert.throws(() => validateMap(value));
  }
  assert.throws(() => parseMap('{'), /Invalid JSON/);
  assert.throws(() => parseMap(' '.repeat(MAX_FILE_BYTES + 1)), /256 KiB/);
  assert.throws(() => parseMap('🌿'.repeat(MAX_FILE_BYTES / 4 + 1)), /256 KiB/);
});
test('validation returns an owned copy and never mutates the current map on failure', () => {
  const current = exampleMap();
  const before = serializeMap(current);
  const copy = validateMap(current);
  copy.cells[0] = 9;
  assert.equal(serializeMap(current), before);
  assert.throws(() => parseMap('{"version":99}'));
  assert.equal(serializeMap(current), before);
});
test('draft persists its map and saved baseline and restores unsaved status', () => {
  const values = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  });
  assert.deepEqual(readDraft(storage), { kind: 'empty' });
  const map = exampleMap();
  const saved = serializeMap(map);
  map.cells[0] = 5;
  assert.equal(writeDraft(storage, { map, saved }), null);
  const restored = readDraft(storage);
  assert.equal(restored.kind, 'restored');
  if (restored.kind === 'restored') {
    assert.deepEqual(restored.draft.map, map);
    assert.ok(isDirty(restored.draft.map, restored.draft.saved));
  }
  values.set(DRAFT_KEY, '{broken');
  assert.equal(readDraft(storage).kind, 'error');
  values.set(DRAFT_KEY, JSON.stringify({ version: 1, map, saved: 'broken' }));
  assert.equal(readDraft(storage).kind, 'error');
});
test('denied storage and full quota return visible recoverable errors', () => {
  const denied = () => {
    throw new Error('Denied');
  };
  assert.equal(readDraft(denied).kind, 'error');
  assert.match(
    writeDraft(denied, { map: exampleMap(), saved: null })!,
    /Save JSON/,
  );
  const full = () => ({
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  });
  assert.match(
    writeDraft(full, { map: exampleMap(), saved: null })!,
    /Save JSON/,
  );
});
