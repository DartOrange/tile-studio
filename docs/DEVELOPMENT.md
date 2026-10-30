# Development and architecture

## Reproducible commands

Use Node.js 22.18+ and npm. The release was built on Windows with Node 26.13.0 and npm 11.20.0. There are no runtime dependencies.

```powershell
npm ci
npm run dev             # Local source preview on 127.0.0.1:5173
npm run format          # Format editable files
npm run check           # Formatting, lint, strict types, domain tests, build, package integrity
npm run test:demo       # Actual file:// demo in installed Microsoft Edge, DPR 1 and 2
npm run verify:package  # Verify demo and source-input SHA-256 hashes
```

Playwright uses the locally installed Edge channel. No development server is involved in packaged-demo tests. The browser suite records screenshots in ignored `test-results/` and retains traces on failures. Committed screenshots in `docs/screenshots/` show the verified packaged editor. Browser development tools can inspect the readable TypeScript through the development server's source maps.

esbuild bundles a classic IIFE script and inlines both script and CSS in the HTML template. This avoids file-protocol module loading and cross-origin asset fetches. `demo/` is intentionally committed, including the compiled HTML. Build inputs and output files have SHA-256 manifests; no timestamp makes unchanged rebuilds reproducible. The containing Git commit identifies the complete release snapshot; `sourceRevisionAtBuild` records the previous HEAD available when building, and `sourceSha256` identifies the exact inputs, including uncommitted changes.

Tool choices were checked against the [esbuild browser and IIFE API](https://esbuild.github.io/api/#format), [TypeScript installation guidance](https://www.typescriptlang.org/download/), and [typescript-eslint compatibility range](https://typescript-eslint.io/users/dependency-versions/). TypeScript 6.0.3 is pinned because the selected lint adapter supports TypeScript below 6.1. No incompatible peer dependency overrides are used. Native HTML and Canvas keep the editor's input/state boundary explicit without a component framework.

## State boundaries

| Module                           | Responsibility                                                               |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `model.ts`                       | Owned map data, original example, strict version 1 parsing and serialization |
| `geometry.ts`                    | CSS-pixel coordinate transforms, anchored zoom, fitting, Bresenham cells     |
| `history.ts`                     | Pending stroke transaction, before/after deltas, bounded undo/redo           |
| `draft.ts`                       | Validated browser-storage envelope, saved baseline, recoverable errors       |
| `tiles.ts`                       | Original geometric tile artwork, fixed palette IDs                           |
| `ui.ts`, `style.css`, `icons.ts` | Native controls, responsive editor shell, inline icons                       |
| `main.ts`                        | Input/controller boundary, rendering, persistence scheduling, file actions   |

The document is independent of the viewport. Pan and zoom change `View`, not cells. The offscreen artwork canvas caches the current map at native resolution. The visible canvas composites artwork, checkerboard, grid, hover, and rulers. PNG export uses only the offscreen artwork, so editor overlays and transforms cannot leak into the image.

## Coordinates and pointer lifecycle

Pointer coordinates are first made local with `clientX/Y - canvas.getBoundingClientRect().left/top`. These are CSS pixels. A cell is `floor((local - pan) / (24 * zoom))`. Device pixel ratio scales only the backing store and context, never the pointer transform. A resize preserves the world point at the center; Fit computes a fresh centered view. Wheel zoom keeps the world point under the pointer fixed and clamps zoom to 25–400%.

A primary pointer-down captures the pointer and selects either pan or stroke for that interaction. Space/middle-button/Hand-tool pan never creates a stroke. Bresenham interpolation fills gaps between delivered pointer positions. Out-of-map positions are ignored and break interpolation; re-entry starts a new segment in the same stroke. Secondary pointers are ignored while a primary interaction is active.

Pointer-up commits one delta command. Escape, pointer cancellation, lost capture, blur, a view change, or a tool change rolls back pending deltas. No-op strokes preserve history and redo. New committed changes clear redo. Undo and redo never record themselves. The shared history budget is 100 commands / 32,768 cell records; oldest commands are evicted first. Draft persistence defers while a stroke is pending so a cancelled preview cannot become a saved draft.

## File contract and replacement

```json
{
  "format": "tile-studio",
  "version": 1,
  "name": "A small world",
  "width": 8,
  "height": 8,
  "tileSize": 24,
  "cells": [0]
}
```

This abbreviated illustration requires 64 cells to be a valid file. Cells are row-major, `index = y * width + x`.

| ID  | Terrain             | ID  | Terrain   |
| --- | ------------------- | --- | --------- |
| 0   | Empty / transparent | 6   | Stone     |
| 1   | Meadow              | 7   | Flowers   |
| 2   | Sand                | 8   | Cottage   |
| 3   | Water               | 9   | Boardwalk |
| 4   | Path                | 10  | Reeds     |
| 5   | Pine                |     |           |

Input is limited to 256 KiB before file reading and checked again as UTF-8 bytes in the parser. Parsing accepts only a plain map object with the exact known fields, format/version, a readable trimmed name of 1–60 characters, integer dimensions in 8–64, tile size 24, exactly width × height cells, and integer palette IDs. It returns an owned copy. Version 0 and future versions are deliberately unsupported; there is no implicit migration.

File reading and validation finish before replacement is considered. Errors leave document, history, and saved baseline intact. A valid replacement prompts when the current serialized document differs from its last saved baseline. Cancel preserves the map, Discard continues, and Save & continue initiates a JSON download first. Creating a new map is also guarded. The browser's standard beforeunload warning protects dirty documents on reload/close after interaction; it cannot guarantee a download completed or prevent browser crashes.

The version 1 draft envelope contains a validated map and its saved baseline. It does not contain undo history or viewport state. Reads/writes are wrapped because accessing localStorage itself can throw. Corrupt drafts show a persistent error and open the example; further successful edits or JSON save can replace the damaged draft. A 300 ms debounce, pagehide, and beforeunload persist completed changes. Storage races between tabs are outside the release scope.

## Rendering and accessibility

Rendering is event-driven and coalesced through requestAnimationFrame. The map cache is rebuilt on edits, not on pan/zoom. At most 4,096 tiles are drawn, making a full cache rebuild a reasonable bounded choice; no frame-rate benchmark is claimed. Terrain is composed from original rectangles and paths, with deterministic coordinate-based surface variation.

Tool and palette buttons expose pressed state, disabled history controls reflect availability, dialogs manage focus natively, and controls have accessible names and visible focus. A keyboard path supports cell movement, paint/erase, pan, zoom, file actions, and help. The canvas exposes an application role with documented keys, and keyboard edits announce coordinates and terrain in a live status region. No screen-reader or hardware touch/pen validation is claimed. On shorter screens the optional overview is hidden to keep every tile and the selected tool visible.
