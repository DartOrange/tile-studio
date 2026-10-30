# Tile Studio

A browser-local 2D tile-map editor for a game designer sketching a small outdoor level. Open the original **Willow Bay** example, choose a terrain tile, paint a continuous stroke, refine it with undo, and save a reusable map or export an image.

## Release scope

- One tile layer; ten original geometric terrain tiles plus transparent cells.
- Maps from 8 × 8 to 64 × 64 cells, rendered at 24 pixels per tile in PNG output.
- Paint, erase, pan, anchored zoom, fit/reset, grid, keyboard editing, stroke undo/redo.
- Version 1 JSON save/open with transactional validation; local draft recovery.
- A self-contained, offline `demo/index.html` for desktop browsers.

No backend, accounts, collaboration, marketplace, AI functionality, additional layers, transforms, engine integration, or game simulation.

## Stack and target

Strict TypeScript and Canvas 2D with native HTML controls. State and geometry stay independent of the DOM. esbuild compiles an inline classic-script bundle, avoiding module fetches and file-protocol restrictions. There are no runtime dependencies or network assets. Node.js and npm are development tools only.

The acceptance target is Windows desktop Microsoft Edge, including high-DPI rendering and a 1366 × 768 laptop viewport. Other browsers require separate verification.

## Observable acceptance

1. First launch displays a labeled, editable example and a readable tool/palette/canvas hierarchy.
2. Fast pointer strokes remain continuous after pan, zoom, resize, and device scaling; pan never paints.
3. One undo restores a whole stroke; redo restores it; a new change invalidates redo. Cancellation rolls a stroke back; no-ops preserve history.
4. Saving and reopening preserves every cell and dimension. Invalid, oversized, or unsupported files preserve the current map and explain the failure.
5. A draft survives reload when storage works; denied, corrupt, or full storage is visible. Replacement and closing warn about unsaved work.
6. PNG output contains only the map at native resolution, independent of the editor view.
7. The committed compiled demo passes the editing/export/recovery workflow without a server or network requests. Unit tests cover geometry, history, and file boundaries; screenshots are visually inspected.
