import { mount } from './ui';
import { drawTile, TILES } from './tiles';
import {
  createMap,
  exampleMap,
  MAX_FILE_BYTES,
  parseMap,
  serializeMap,
  TILE_SIZE,
  type TileMap,
} from './model';
import {
  fitView,
  screenToCell,
  zoomAt,
  type Point,
  type View,
} from './geometry';
import { History, Stroke } from './history';
import { isDirty, readDraft, writeDraft } from './draft';

mount();
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('map-canvas');
const ctx = canvas.getContext('2d')!;
const artwork = document.createElement('canvas');
const art = artwork.getContext('2d')!;
const minimap = element<HTMLCanvasElement>('minimap');
const history = new History();
let map = exampleMap();
let saved: string | null = serializeMap(map);
let origin = 'EXAMPLE MAP';
let view: View = { x: 0, y: 0, zoom: 1 };
let selected = 1;
type Tool = 'brush' | 'eraser' | 'hand';
let tool: Tool = 'brush';
let space = false;
let grid = false;
let hover: Point | null = null;
let keyboardCursor: Point = { x: 0, y: 0 };
let width = 0;
let height = 0;
let firstSize = true;
let renderPending = false;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let draftTimer: ReturnType<typeof setTimeout> | undefined;
let pendingReplacement: (() => void) | null = null;
let interaction: {
  id: number;
  stroke: Stroke | null;
  start: Point;
  view: View;
} | null = null;
const storage = () => window.localStorage;
const draft = readDraft(storage);
if (draft.kind === 'restored') {
  map = draft.draft.map;
  saved = draft.draft.saved;
  origin = 'LOCAL DRAFT';
}

function toast(message: string, error = false): void {
  clearTimeout(toastTimer);
  const box = element('toast');
  box.textContent = message;
  box.classList.toggle('error', error);
  box.hidden = false;
  if (!error)
    toastTimer = setTimeout(() => {
      box.hidden = true;
    }, 5000);
}

function persist(): void {
  clearTimeout(draftTimer);
  // Drafts contain committed strokes only, including when an earlier debounce fires.
  if (interaction?.stroke) {
    draftTimer = setTimeout(persist, 300);
    return;
  }
  const error = writeDraft(storage, { map, saved });
  const status = element('draft-status');
  status.textContent = error
    ? 'Draft unavailable · save JSON'
    : 'Draft saved on this device';
  status.classList.toggle('warning', !!error);
  status.title =
    error ?? 'Local browser storage; save a JSON file for a portable copy.';
}

function update(): void {
  element('map-name').textContent = map.name;
  element('view-label').textContent = map.name.toUpperCase();
  element('origin').textContent = origin;
  element('dimensions').textContent = `${map.width} × ${map.height} cells`;
  element('overview-size').textContent = `${map.width} × ${map.height}`;
  element('dirty').hidden = !isDirty(map, saved);
  element<HTMLButtonElement>('undo').disabled = history.undoCount === 0;
  element<HTMLButtonElement>('redo').disabled = history.redoCount === 0;
  element('reset-zoom').textContent = `${Math.round(view.zoom * 100)}%`;
  element<HTMLButtonElement>('zoom-out').disabled = view.zoom <= 0.25;
  element<HTMLButtonElement>('zoom-in').disabled = view.zoom >= 4;
  const tile = TILES.find((item) => item.id === selected)!;
  element('selected-name').textContent = tile.name;
  element('selected-id').textContent = String(tile.id).padStart(2, '0');
  element('selection-swatch').style.background = tile.color;
  element('tool-status').textContent = space
    ? 'Pan (Space)'
    : tool === 'brush'
      ? `Paint · ${tile.name}`
      : tool === 'eraser'
        ? 'Erase'
        : 'Pan';
  element('cursor-status').textContent = hover
    ? `X ${hover.x + 1}   Y ${hover.y + 1}`
    : 'Move over the map';
  element('canvas-hint').textContent =
    origin === 'EXAMPLE MAP'
      ? 'An original example. Make it your own.'
      : 'Your world, in the making.';
  document
    .querySelectorAll<HTMLButtonElement>('[data-tile]')
    .forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(Number(button.dataset.tile) === selected),
      ),
    );
  for (const name of ['brush', 'eraser', 'hand'] as const)
    element(name).setAttribute('aria-pressed', String(tool === name));
  element('grid').setAttribute('aria-pressed', String(grid));
  canvas.style.cursor =
    interaction && !interaction.stroke
      ? 'grabbing'
      : tool === 'hand' || space
        ? 'grab'
        : 'crosshair';
  document.title = `${isDirty(map, saved) ? '● ' : ''}${map.name} — Tile Studio`;
  requestRender();
}

function rebuildArtwork(): void {
  artwork.width = map.width * TILE_SIZE;
  artwork.height = map.height * TILE_SIZE;
  art.imageSmoothingEnabled = false;
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++)
      drawTile(
        art,
        map.cells[y * map.width + x]!,
        x * TILE_SIZE,
        y * TILE_SIZE,
        x * 13 + y * 7,
      );
  const mini = minimap.getContext('2d')!;
  mini.clearRect(0, 0, minimap.width, minimap.height);
  mini.imageSmoothingEnabled = false;
  const scale = Math.min(
    (minimap.width - 12) / artwork.width,
    (minimap.height - 12) / artwork.height,
  );
  mini.drawImage(
    artwork,
    (minimap.width - artwork.width * scale) / 2,
    (minimap.height - artwork.height * scale) / 2,
    artwork.width * scale,
    artwork.height * scale,
  );
  requestRender();
}

function changed(): void {
  rebuildArtwork();
  update();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(persist, 300);
}

function requestRender(): void {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    render();
  });
}

function render(): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.zoom, view.zoom);
  ctx.shadowColor = '#0006';
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#263b3b';
  ctx.fillRect(0, 0, artwork.width, artwork.height);
  ctx.shadowColor = 'transparent';
  // Checkerboard is an editor aid; it is never part of PNG output.
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (map.cells[y * map.width + x] === 0) {
        ctx.fillStyle = (x + y) % 2 ? '#304141' : '#374949';
        ctx.fillRect(x * 24, y * 24, 24, 24);
      }
    }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(artwork, 0, 0);
  if (grid) {
    ctx.strokeStyle = '#182b3444';
    ctx.lineWidth = 1 / view.zoom;
    ctx.beginPath();
    for (let x = 0; x <= map.width; x++) {
      ctx.moveTo(x * 24, 0);
      ctx.lineTo(x * 24, artwork.height);
    }
    for (let y = 0; y <= map.height; y++) {
      ctx.moveTo(0, y * 24);
      ctx.lineTo(artwork.width, y * 24);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = '#c4d0ae66';
  ctx.lineWidth = 1 / view.zoom;
  ctx.strokeRect(0, 0, artwork.width, artwork.height);
  if (hover && tool !== 'hand' && !space) {
    ctx.fillStyle = tool === 'eraser' ? '#eb9e6d55' : '#f5ead84d';
    ctx.fillRect(hover.x * 24, hover.y * 24, 24, 24);
    ctx.strokeStyle = tool === 'eraser' ? '#ffe0a8' : '#ffefd2';
    ctx.lineWidth = 2 / view.zoom;
    ctx.strokeRect(
      hover.x * 24 + 1 / view.zoom,
      hover.y * 24 + 1 / view.zoom,
      24 - 2 / view.zoom,
      24 - 2 / view.zoom,
    );
  }
  ctx.restore();
  // Subtle rulers make scale legible without occupying a panel.
  ctx.font = '8px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8a9d93';
  ctx.textAlign = 'center';
  for (let x = 0; x < map.width; x += 4)
    ctx.fillText(
      String(x + 1).padStart(2, '0'),
      view.x + (x + 0.5) * 24 * view.zoom,
      view.y - 12,
    );
  ctx.textAlign = 'right';
  for (let y = 0; y < map.height; y += 4)
    ctx.fillText(
      String(y + 1).padStart(2, '0'),
      view.x - 12,
      view.y + (y + 0.6) * 24 * view.zoom,
    );
}

function cancelInteraction(): void {
  if (!interaction) return;
  const current = interaction;
  interaction = null;
  if (current.stroke) {
    current.stroke.cancel();
    rebuildArtwork();
  }
  if (canvas.hasPointerCapture(current.id))
    canvas.releasePointerCapture(current.id);
  update();
}

function fit(): void {
  cancelInteraction();
  view = fitView(width, height, map.width, map.height, TILE_SIZE);
  hover = null;
  update();
}
function changeZoom(
  multiplier: number,
  point = { x: width / 2, y: height / 2 },
): void {
  cancelInteraction();
  view = zoomAt(view, point, view.zoom * multiplier);
  hover = null;
  update();
}

function resize(): void {
  cancelInteraction();
  const rect = canvas.getBoundingClientRect();
  const oldWidth = width;
  const oldHeight = height;
  width = rect.width;
  height = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  if (firstSize) {
    firstSize = false;
    fit();
  } else {
    view.x += (width - oldWidth) / 2;
    view.y += (height - oldHeight) / 2;
    update();
  }
}

function localPoint(event: PointerEvent | WheelEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function cellAt(point: Point): Point | null {
  const cell = screenToCell(point, view, TILE_SIZE);
  return cell.x >= 0 && cell.x < map.width && cell.y >= 0 && cell.y < map.height
    ? cell
    : null;
}

canvas.addEventListener('pointerdown', (event) => {
  if (
    interaction ||
    !event.isPrimary ||
    (event.button !== 0 && event.button !== 1)
  )
    return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  const point = localPoint(event);
  const pan = tool === 'hand' || space || event.button === 1;
  const stroke = pan ? null : new Stroke(map, tool === 'eraser' ? 0 : selected);
  interaction = {
    id: event.pointerId,
    stroke,
    start: point,
    view: { ...view },
  };
  canvas.setPointerCapture(event.pointerId);
  hover = cellAt(point);
  if (hover) keyboardCursor = hover;
  stroke?.visit(hover);
  if (stroke) rebuildArtwork();
  update();
});
canvas.addEventListener('pointermove', (event) => {
  if (interaction && interaction.id !== event.pointerId) return;
  const point = localPoint(event);
  hover = cellAt(point);
  if (hover) keyboardCursor = hover;
  if (interaction) {
    if (interaction.stroke) {
      interaction.stroke.visit(hover);
      rebuildArtwork();
    } else {
      view.x = interaction.view.x + point.x - interaction.start.x;
      view.y = interaction.view.y + point.y - interaction.start.y;
    }
  }
  update();
});
canvas.addEventListener('pointerup', (event) => {
  if (!interaction || interaction.id !== event.pointerId) return;
  const current = interaction;
  interaction = null;
  if (canvas.hasPointerCapture(event.pointerId))
    canvas.releasePointerCapture(event.pointerId);
  if (current.stroke && history.push(current.stroke.finish())) changed();
  else update();
});
canvas.addEventListener('pointercancel', cancelInteraction);
canvas.addEventListener('lostpointercapture', cancelInteraction);
canvas.addEventListener('pointerleave', () => {
  if (!interaction) {
    hover = null;
    update();
  }
});
canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    changeZoom(
      Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.002),
      localPoint(event),
    );
  },
  { passive: false },
);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

function chooseTool(next: Tool): void {
  cancelInteraction();
  tool = next;
  update();
}
function chooseTile(id: number): void {
  selected = id;
  chooseTool('brush');
}
for (const name of ['brush', 'eraser', 'hand'] as const)
  element(name).addEventListener('click', () => chooseTool(name));
document
  .querySelectorAll<HTMLButtonElement>('[data-tile]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      chooseTile(Number(button.dataset.tile)),
    ),
  );
function undo(): void {
  cancelInteraction();
  if (history.undo(map)) changed();
}
function redo(): void {
  cancelInteraction();
  if (history.redo(map)) changed();
}
element('undo').addEventListener('click', undo);
element('redo').addEventListener('click', redo);
element('grid').addEventListener('click', () => {
  grid = !grid;
  update();
});
element('fit').addEventListener('click', fit);
element('fit-bottom').addEventListener('click', fit);
element('zoom-in').addEventListener('click', () => changeZoom(1.25));
element('zoom-out').addEventListener('click', () => changeZoom(0.8));
element('reset-zoom').addEventListener('click', () => {
  cancelInteraction();
  view = {
    x: (width - artwork.width) / 2,
    y: (height - artwork.height) / 2,
    zoom: 1,
  };
  hover = null;
  update();
});

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function filename(): string {
  return (
    map.name
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'tile-map'
  );
}
function save(): void {
  cancelInteraction();
  download(
    new Blob([serializeMap(map)], { type: 'application/json' }),
    `${filename()}.tilemap.json`,
  );
  saved = serializeMap(map);
  persist();
  update();
  toast('Map downloaded as JSON. Keep the file as your portable copy.');
}
element('save').addEventListener('click', save);
element('export').addEventListener('click', () => {
  cancelInteraction();
  artwork.toBlob((blob) => {
    if (!blob) {
      toast('PNG export failed. Try saving JSON instead.', true);
      return;
    }
    download(blob, `${filename()}.png`);
    toast(`PNG exported · ${artwork.width} × ${artwork.height} px`);
  }, 'image/png');
});

function replaceMap(next: TileMap, source: string, clean: boolean): void {
  cancelInteraction();
  map = next;
  saved = clean ? serializeMap(map) : null;
  origin = source;
  history.clear();
  keyboardCursor = { x: 0, y: 0 };
  rebuildArtwork();
  fit();
  persist();
  update();
}
function guardReplacement(action: () => void): void {
  cancelInteraction();
  if (!isDirty(map, saved)) {
    action();
    return;
  }
  pendingReplacement = action;
  element<HTMLDialogElement>('confirm-dialog').showModal();
}
function finishReplacement(saveFirst: boolean): void {
  if (saveFirst) save();
  const action = pendingReplacement;
  pendingReplacement = null;
  element<HTMLDialogElement>('confirm-dialog').close();
  action?.();
}
element('confirm-save').addEventListener('click', () =>
  finishReplacement(true),
);
element('confirm-discard').addEventListener('click', () =>
  finishReplacement(false),
);
element('confirm-cancel').addEventListener('click', () => {
  pendingReplacement = null;
  element<HTMLDialogElement>('confirm-dialog').close();
});
element('confirm-dialog').addEventListener('cancel', () => {
  pendingReplacement = null;
});

function openPicker(): void {
  cancelInteraction();
  element<HTMLInputElement>('file-input').click();
}
element('open').addEventListener('click', openPicker);
element<HTMLInputElement>('file-input').addEventListener(
  'change',
  async (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    element<HTMLButtonElement>('open').disabled = true;
    try {
      if (file.size > MAX_FILE_BYTES)
        throw new Error('Map file exceeds the 256 KiB limit.');
      const next = parseMap(await file.text());
      guardReplacement(() => {
        replaceMap(next, 'JSON MAP', true);
        toast('Map opened. Every tile is ready to edit.');
      });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Could not read this file. Your current map is unchanged.',
        true,
      );
    } finally {
      input.value = '';
      element<HTMLButtonElement>('open').disabled = false;
    }
  },
);

function newMap(): void {
  element('new-error').textContent = '';
  guardReplacement(() => element<HTMLDialogElement>('new-dialog').showModal());
}
element('new').addEventListener('click', newMap);
element('new-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const next = createMap(
      element<HTMLInputElement>('new-name').value,
      Number(element<HTMLInputElement>('new-width').value),
      Number(element<HTMLInputElement>('new-height').value),
      Number(element<HTMLSelectElement>('new-fill').value),
    );
    element<HTMLDialogElement>('new-dialog').close();
    replaceMap(next, 'NEW MAP', false);
    toast('A new world, ready for its first tile.');
  } catch (error) {
    element('new-error').textContent =
      error instanceof Error ? error.message : 'Could not create map.';
  }
});
element('example').addEventListener('click', () => {
  element<HTMLDialogElement>('new-dialog').close();
  replaceMap(exampleMap(), 'EXAMPLE MAP', true);
  toast('Willow Bay example opened.');
});
function help(): void {
  cancelInteraction();
  element<HTMLDialogElement>('help-dialog').showModal();
}
element('help').addEventListener('click', help);
element('shortcuts').addEventListener('click', help);
document
  .querySelectorAll<HTMLButtonElement>('[data-close]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      element<HTMLDialogElement>(button.dataset.close!).close(),
    ),
  );
document.querySelector('.brand')!.addEventListener('click', (event) => {
  event.preventDefault();
  fit();
});

document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (
    target.matches('input, select, textarea') ||
    document.querySelector('dialog[open]')
  )
    return;
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;
  if (mod && ['s', 'o', 'n', 'z', 'y'].includes(key)) {
    event.preventDefault();
    if (key === 's') save();
    if (key === 'o') openPicker();
    if (key === 'n') newMap();
    if (key === 'z') {
      if (event.shiftKey) redo();
      else undo();
    }
    if (key === 'y') redo();
    return;
  }
  if (mod || event.altKey) return;
  // Preserve native Space/Enter activation on focused controls.
  if (target.closest('button, a') && [' ', 'enter'].includes(key)) return;
  if (key === ' ') {
    event.preventDefault();
    if (!space) {
      cancelInteraction();
      space = true;
      update();
    }
    return;
  }
  if (key === 'escape') {
    cancelInteraction();
    hover = null;
    update();
    return;
  }
  if (key === 'b') chooseTool('brush');
  if (key === 'e') chooseTool('eraser');
  if (key === 'h') chooseTool('hand');
  if (key === 'f') {
    event.preventDefault();
    fit();
  }
  if (key === 'g') {
    grid = !grid;
    update();
  }
  if (/^[0-9]$/.test(key)) chooseTile(key === '0' ? 10 : Number(key));
  if (key === '+' || key === '=') {
    event.preventDefault();
    changeZoom(1.25);
  }
  if (key === '-') {
    event.preventDefault();
    changeZoom(0.8);
  }
  if (key === '?') {
    event.preventDefault();
    help();
  }
  if (
    target === canvas &&
    [
      'arrowleft',
      'arrowright',
      'arrowup',
      'arrowdown',
      'enter',
      'delete',
      'backspace',
    ].includes(key)
  ) {
    event.preventDefault();
    cancelInteraction();
    if (tool === 'hand' && key.startsWith('arrow')) {
      if (key === 'arrowleft') view.x += 48;
      if (key === 'arrowright') view.x -= 48;
      if (key === 'arrowup') view.y += 48;
      if (key === 'arrowdown') view.y -= 48;
      hover = null;
      update();
      return;
    }
    if (key === 'arrowleft')
      keyboardCursor.x = Math.max(0, keyboardCursor.x - 1);
    if (key === 'arrowright')
      keyboardCursor.x = Math.min(map.width - 1, keyboardCursor.x + 1);
    if (key === 'arrowup') keyboardCursor.y = Math.max(0, keyboardCursor.y - 1);
    if (key === 'arrowdown')
      keyboardCursor.y = Math.min(map.height - 1, keyboardCursor.y + 1);
    hover = { ...keyboardCursor };
    if (
      ['enter', 'delete', 'backspace'].includes(key) &&
      (tool !== 'hand' || key !== 'enter')
    ) {
      const stroke = new Stroke(
        map,
        key !== 'enter' || tool === 'eraser' ? 0 : selected,
      );
      stroke.visit(hover);
      if (history.push(stroke.finish())) changed();
    }
    const cellId = map.cells[keyboardCursor.y * map.width + keyboardCursor.x];
    const tileName = TILES.find((tile) => tile.id === cellId)?.name ?? 'Empty';
    element('keyboard-status').textContent =
      `Column ${keyboardCursor.x + 1}, row ${keyboardCursor.y + 1}: ${tileName}.`;
    update();
  }
});
document.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    space = false;
    update();
  }
});
window.addEventListener('blur', () => {
  space = false;
  cancelInteraction();
});
window.addEventListener('beforeunload', (event) => {
  cancelInteraction();
  persist();
  if (isDirty(map, saved)) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('pagehide', persist);
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(canvas);

document
  .querySelectorAll<HTMLCanvasElement>('[data-preview]')
  .forEach((preview) => {
    const context = preview.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    context.scale(2, 2);
    const tile = Number(preview.dataset.preview);
    if ([1, 2, 3, 4, 9].includes(tile)) {
      for (let x = 0; x < 2; x++) drawTile(context, tile, x * 24 - 6, 0, x);
    } else {
      context.fillStyle = '#8ca96e';
      context.fillRect(0, 0, 36, 24);
      drawTile(context, tile, 6, 0);
    }
  });
rebuildArtwork();
resize();
update();
if (draft.kind === 'error') {
  element('draft-status').textContent = 'Draft unavailable · save JSON';
  element('draft-status').classList.add('warning');
  toast(draft.message, true);
} else {
  persist();
  if (draft.kind === 'restored')
    toast('Local draft restored. Welcome back to your world.');
}
