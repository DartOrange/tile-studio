import { test, expect, type Page, type Download } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { TileMap } from '../../src/model';
import { exampleMap } from '../../src/model';
import { fitView, zoomAt, type View } from '../../src/geometry';

const root = fileURLToPath(new URL('../../', import.meta.url));
const demoRoot = path.join(root, 'demo');
const demoUrl = pathToFileURL(path.join(demoRoot, 'index.html')).href;
const errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()))
      errors.push(`Network request: ${request.url()}`);
  });
  page.on('requestfailed', (request) =>
    errors.push(`Failed request: ${request.url()}`),
  );
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(demoUrl);
  await expect(page.locator('#map-name')).toHaveText('Willow Bay');
});
test.afterEach(() => {
  expect(errors).toEqual([]);
});

async function currentMap(page: Page): Promise<TileMap> {
  await expect(page.locator('#draft-status')).toHaveText(
    'Draft saved on this device',
  );
  // Wait for the debounced draft, which is a public persistence boundary.
  await page.waitForTimeout(400);
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('tile-studio.draft.v1')!).map as TileMap,
  );
}
async function frame(page: Page) {
  const box = (await page.locator('#map-canvas').boundingBox())!;
  return { box, view: fitView(box.width, box.height, 36, 26, 24) };
}
async function paint(
  page: Page,
  view: View,
  from: [number, number],
  to = from,
) {
  const box = (await page.locator('#map-canvas').boundingBox())!;
  const point = (cell: [number, number]) => ({
    x: box.x + view.x + (cell[0] + 0.5) * 24 * view.zoom,
    y: box.y + view.y + (cell[1] + 0.5) * 24 * view.zoom,
  });
  const a = point(from);
  const b = point(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y);
  await page.mouse.up();
}
async function download(page: Page, id: string): Promise<Download> {
  const result = page.waitForEvent('download');
  await page.locator(id).click();
  return result;
}
async function bytes(download: Download): Promise<Buffer> {
  return readFile((await download.path())!);
}

test('packaged editing workflow, view transforms, history, JSON round-trip, and invariant PNG', async ({
  page,
}, info) => {
  await expect(page.locator('#origin')).toHaveText('EXAMPLE MAP');
  const { box, view: initial } = await frame(page);
  let view = initial;
  await page.screenshot({ path: info.outputPath('first-screen.png') });
  await page.getByRole('button', { name: 'Stone', exact: true }).click();
  await paint(page, view, [5, 13], [12, 13]);
  const first = await currentMap(page);
  for (let x = 5; x <= 12; x++) expect(first.cells[13 * 36 + x]).toBe(6);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  view = zoomAt(
    view,
    { x: box.width / 2, y: box.height / 2 },
    view.zoom * 1.25,
  );
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.locator('#map-canvas').focus();
  await page.keyboard.down('Space');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 64, start.y + 31);
  await page.mouse.up();
  await page.keyboard.up('Space');
  view = { ...view, x: view.x + 64, y: view.y + 31 };
  expect((await currentMap(page)).cells).toEqual(first.cells);
  await page.getByRole('button', { name: 'Flowers', exact: true }).click();
  await paint(page, view, [9, 16], [13, 16]);
  const second = await currentMap(page);
  for (let x = 9; x <= 13; x++) expect(second.cells[16 * 36 + x]).toBe(7);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await currentMap(page)).cells).toEqual(first.cells);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect((await currentMap(page)).cells).toEqual(second.cells);
  await page.getByRole('button', { name: 'Erase', exact: true }).click();
  await paint(page, view, [10, 16]);
  expect((await currentMap(page)).cells[16 * 36 + 10]).toBe(0);
  await page.keyboard.press('Control+z');
  expect((await currentMap(page)).cells).toEqual(second.cells);
  const jsonDownload = await download(page, '#save');
  const jsonBytes = await bytes(jsonDownload);
  expect(JSON.parse(jsonBytes.toString())).toEqual(second);
  await expect(page.locator('#dirty')).toBeHidden();
  await page.locator('#file-input').setInputFiles({
    name: 'saved.json',
    mimeType: 'application/json',
    buffer: jsonBytes,
  });
  await expect(page.locator('#origin')).toHaveText('JSON MAP');
  expect(await currentMap(page)).toEqual(second);
  const pngA = await bytes(await download(page, '#export'));
  expect(pngA.subarray(1, 4).toString()).toBe('PNG');
  expect(pngA.readUInt32BE(16)).toBe(864);
  expect(pngA.readUInt32BE(20)).toBe(624);
  await page.locator('#zoom-in').click();
  await page.locator('#grid').click();
  const pngB = await bytes(await download(page, '#export'));
  expect(pngB).toEqual(pngA);
  await page.screenshot({ path: info.outputPath('edited-map.png') });
});

test('invalid files preserve unsaved work; draft survives reload; replacement can be cancelled', async ({
  page,
}) => {
  const { view } = await frame(page);
  await page.getByRole('button', { name: 'Cottage', exact: true }).click();
  await paint(page, view, [7, 12]);
  const edited = await currentMap(page);
  await page
    .locator('#file-input')
    .setInputFiles(path.join(demoRoot, 'invalid-map.json'));
  await expect(page.locator('#toast')).toContainText('Unsupported map version');
  expect(await currentMap(page)).toEqual(edited);
  await page.locator('#file-input').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.locator('#toast')).toContainText('Invalid JSON');
  expect(await currentMap(page)).toEqual(edited);
  await page.locator('#file-input').setInputFiles({
    name: 'huge.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(262145, 32),
  });
  await expect(page.locator('#toast')).toContainText('256 KiB');
  expect(await currentMap(page)).toEqual(edited);
  await page.reload();
  await expect(page.locator('#origin')).toHaveText('LOCAL DRAFT');
  expect(await currentMap(page)).toEqual(edited);
  await expect(page.locator('#dirty')).toBeVisible();
  await page.locator('#new').click();
  await expect(page.locator('#confirm-dialog')).toBeVisible();
  await page.locator('#confirm-cancel').click();
  expect(await currentMap(page)).toEqual(edited);
  await page
    .locator('#file-input')
    .setInputFiles(path.join(demoRoot, 'willow-bay.tilemap.json'));
  await expect(page.locator('#confirm-dialog')).toBeVisible();
  await page.locator('#confirm-discard').click();
  expect(await currentMap(page)).toEqual(exampleMap());
});

test('cancelled strokes, redo invalidation, resized coordinates, and keyboard editing', async ({
  page,
}, info) => {
  const { view } = await frame(page);
  const original = await currentMap(page);
  await page.getByRole('button', { name: 'Sand', exact: true }).click();
  const box = (await page.locator('#map-canvas').boundingBox())!;
  await page.mouse.move(
    box.x + view.x + 8.5 * 24 * view.zoom,
    box.y + view.y + 12.5 * 24 * view.zoom,
  );
  await page.mouse.down();
  await page.mouse.move(
    box.x + view.x + 12.5 * 24 * view.zoom,
    box.y + view.y + 12.5 * 24 * view.zoom,
  );
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await currentMap(page)).toEqual(original);
  await expect(page.locator('#undo')).toBeDisabled();
  await paint(page, view, [8, 12], [12, 12]);
  await page.locator('#undo').click();
  await expect(page.locator('#redo')).toBeEnabled();
  await paint(page, view, [1, 1]);
  await expect(page.locator('#redo')).toBeDisabled();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('#fit').click();
  const resized = await frame(page);
  await paint(page, resized.view, [8, 9]);
  expect((await currentMap(page)).cells[9 * 36 + 8]).toBe(2);
  await page.locator('#map-canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('8');
  await page.keyboard.press('Enter');
  expect((await currentMap(page)).cells[9 * 36 + 9]).toBe(8);
  await page.keyboard.press('Delete');
  expect((await currentMap(page)).cells[9 * 36 + 9]).toBe(0);
  await page.locator('#help').click();
  await expect(
    page.getByRole('heading', { name: 'Find your flow.' }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('keyboard-help-laptop.png') });
  await page.getByRole('button', { name: 'Back to the map' }).click();
  await page.screenshot({ path: info.outputPath('laptop.png') });
});

test('new map dimensions, transparent PNG, and save-before-replace path', async ({
  page,
}) => {
  await page.locator('#new').click();
  await page.locator('#new-name').fill('Tiny world');
  await page.locator('#new-width').fill('8');
  await page.locator('#new-height').fill('10');
  await page.getByRole('button', { name: 'Create map' }).click();
  const created = await currentMap(page);
  expect(created.width).toBe(8);
  expect(created.height).toBe(10);
  expect(created.cells.every((tile) => tile === 0)).toBe(true);
  const png = await bytes(await download(page, '#export'));
  expect(png.readUInt32BE(16)).toBe(192);
  expect(png.readUInt32BE(20)).toBe(240);
  const alpha = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const output = document.createElement('canvas');
    output.width = image.width;
    output.height = image.height;
    const context = output.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, 1, 1).data[3];
  }, png.toString('base64'));
  expect(alpha).toBe(0);
  await page.locator('#new').click();
  const saved = page.waitForEvent('download');
  await page.locator('#confirm-save').click();
  expect(JSON.parse((await bytes(await saved)).toString())).toEqual(created);
  await expect(page.locator('#new-dialog')).toBeVisible();
  await page.locator('#example').click();
  expect(await currentMap(page)).toEqual(exampleMap());
});

test('unavailable and corrupt storage show a recoverable warning', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      return key === 'tile-studio.draft.v1'
        ? '{broken'
        : original.call(this, key);
    };
  });
  await page.reload();
  await expect(page.locator('#toast')).toContainText(
    'draft unavailable or damaged',
  );
  expect(await page.locator('#map-name').textContent()).toBe('Willow Bay');
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.reload();
  await expect(page.locator('#draft-status')).toHaveText(
    'Draft unavailable · save JSON',
  );
  const exported = JSON.parse(
    (await bytes(await download(page, '#save'))).toString(),
  );
  expect(exported).toEqual(exampleMap());
});

test('wheel anchor, resize without refit, and keyboard pan preserve cell coordinates', async ({
  page,
}) => {
  const { box, view: initial } = await frame(page);
  const anchor = { x: box.width * 0.55, y: box.height * 0.45 };
  await page.mouse.move(box.x + anchor.x, box.y + anchor.y);
  const deliveredWheel = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        document
          .getElementById('map-canvas')!
          .addEventListener(
            'wheel',
            (event) => resolve((event as WheelEvent).deltaY),
            { once: true },
          );
      }),
  );
  await page.mouse.wheel(0, -100);
  // The installed browser scales injected wheel deltas at DPR 2. Use the actual
  // delivered CSS-pixel delta while asserting the resulting document edit.
  const factor = Math.exp(
    -Math.max(-100, Math.min(100, await deliveredWheel)) * 0.002,
  );
  await expect(page.locator('#reset-zoom')).toHaveText(
    `${Math.round(initial.zoom * factor * 100)}%`,
  );
  let view = zoomAt(initial, anchor, initial.zoom * factor);
  await page.getByRole('button', { name: 'Reeds', exact: true }).click();
  await paint(page, view, [11, 12]);
  expect((await currentMap(page)).cells[12 * 36 + 11]).toBe(10);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('#map-canvas')).toHaveCSS('height', '616px');
  const resized = (await page.locator('#map-canvas').boundingBox())!;
  view = {
    ...view,
    x: view.x + (resized.width - box.width) / 2,
    y: view.y + (resized.height - box.height) / 2,
  };
  await page.locator('#map-canvas').focus();
  await page.keyboard.press('h');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  view = { ...view, x: view.x - 48, y: view.y - 48 };
  const beforePan = await currentMap(page);
  await page.keyboard.press('b');
  await paint(page, view, [12, 12]);
  const edited = await currentMap(page);
  expect(edited.cells[12 * 36 + 12]).toBe(10);
  expect(
    edited.cells.filter((id, index) => id !== beforePan.cells[index]),
  ).toHaveLength(1);
});

test('draft debounce never stores an uncommitted or pointer-cancelled stroke', async ({
  page,
}) => {
  const { box, view } = await frame(page);
  await page.getByRole('button', { name: 'Stone', exact: true }).click();
  await paint(page, view, [5, 12]);
  const committed = await currentMap(page);
  // Queue a draft, then start another stroke before its debounce fires.
  await paint(page, view, [6, 12]);
  await page.mouse.move(
    box.x + view.x + 8.5 * 24 * view.zoom,
    box.y + view.y + 12.5 * 24 * view.zoom,
  );
  await page.mouse.down();
  await page.waitForTimeout(650);
  const during = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('tile-studio.draft.v1')!).map as TileMap,
  );
  expect(during).toEqual(committed);
  await page.locator('#map-canvas').dispatchEvent('pointercancel');
  await page.mouse.up();
  const after = await currentMap(page);
  expect(after.cells[12 * 36 + 6]).toBe(6);
  expect(after.cells[12 * 36 + 8]).toBe(exampleMap().cells[12 * 36 + 8]);
});
