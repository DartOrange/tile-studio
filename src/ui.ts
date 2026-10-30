import { icon } from './icons';
import { TILES } from './tiles';

export function mount(): void {
  document.querySelector('#app')!.innerHTML = `
    <header class="header">
      <a class="brand" href="#" aria-label="Tile Studio home"><span class="brand-mark"><i></i><i></i><i></i><i></i></span>Tile Studio<span class="edition">01</span></a>
      <div class="header-divider"></div><span class="tagline">A small world, one tile at a time.</span>
      <div class="file-actions">
        <button id="open" class="quiet">${icon('open')}<span>Open</span></button>
        <button id="save" class="secondary">${icon('save')}<span>Save map</span></button>
        <button id="export" class="primary">${icon('export')}<span>Export PNG</span></button>
      </div>
    </header>
    <div class="project-bar">
      <div class="project-name"><span class="project-dot"></span><strong id="map-name"></strong><span id="dirty" class="dirty" aria-label="Unsaved changes" hidden>●</span><span id="origin" class="badge">EXAMPLE MAP</span></div>
      <div class="project-actions"><span id="dimensions" class="muted"></span><span class="separator"></span><button id="new" class="text-button">${icon('plus')} New map</button><button id="help" class="icon-button" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">${icon('help')}</button></div>
    </div>
    <main class="workspace">
      <nav class="tool-rail" aria-label="Editing tools">
        <div class="tool-group">
          <button id="brush" class="tool" title="Paint (B)" aria-label="Paint" aria-pressed="true">${icon('brush')}<span>B</span></button>
          <button id="eraser" class="tool" title="Erase (E)" aria-label="Erase" aria-pressed="false">${icon('eraser')}<span>E</span></button>
          <button id="hand" class="tool" title="Pan (H / hold Space)" aria-label="Pan" aria-pressed="false">${icon('hand')}<span>H</span></button>
        </div>
        <div class="tool-group"><button id="undo" class="tool" title="Undo stroke (Ctrl+Z)" aria-label="Undo">${icon('undo')}</button><button id="redo" class="tool" title="Redo stroke (Ctrl+Shift+Z)" aria-label="Redo">${icon('redo')}</button></div>
        <div class="tool-group"><button id="grid" class="tool" title="Toggle grid (G)" aria-label="Show grid" aria-pressed="false">${icon('grid')}</button><button id="fit" class="tool" title="Fit map (F)" aria-label="Fit map">${icon('fit')}</button></div>
        <div class="rail-footer"><span class="rail-line"></span><span class="vertical-label">MAKE A LITTLE WORLD</span></div>
      </nav>
      <aside class="library" aria-label="Tile palette">
        <div class="library-heading"><div class="eyebrow">YOUR TOOLBOX</div><h1>Terrain library<span>10</span></h1><p>Little pieces. Endless possibilities.</p></div>
        <div class="palette-label"><span>WILLOW COLLECTION</span><span class="tiny-dot"></span></div>
        <div class="tile-grid" role="group" aria-label="Terrain tiles">${TILES.map((tile, i) => `<button class="tile-card" data-tile="${tile.id}" aria-label="${tile.name}" aria-pressed="${i === 0}"><span class="tile-preview"><canvas width="72" height="48" data-preview="${tile.id}" aria-hidden="true"></canvas><span class="tile-key">${(i + 1) % 10}</span></span><span class="tile-name">${tile.name}</span></button>`).join('')}</div>
        <div class="selection"><span class="selection-swatch" id="selection-swatch"></span><div><span class="eyebrow">SELECTED TILE</span><strong id="selected-name">Meadow</strong></div><span id="selected-id" class="tile-id">01</span></div>
        <div class="map-overview"><div class="section-label"><span>MAP OVERVIEW</span><span id="overview-size"></span></div><canvas id="minimap" width="180" height="130" aria-label="Map overview"></canvas><div class="layer"><span class="layer-icon">${icon('layers')}</span><span>Ground layer</span><span class="layer-count">01</span></div></div>
        <div class="local-note"><span class="tiny-dot"></span>Made here. Stays here.<span>No uploads, ever.</span></div>
      </aside>
      <section class="stage" aria-label="Map workspace">
        <div class="stage-label"><span class="tiny-dot"></span><span id="view-label">WILLOW BAY</span><span class="stage-label-divider">/</span><span>GROUND</span></div>
        <canvas id="map-canvas" tabindex="0" role="application" aria-label="Tile map. Arrow keys move the cursor. Enter paints. B paint, E erase, H pan, F fit. See Keyboard shortcuts for all controls."></canvas>
        <div id="keyboard-status" class="sr-only" role="status" aria-live="polite"></div><div class="canvas-caption"><span class="caption-title">A place to begin.</span><span id="canvas-hint">An original example. Make it your own.</span></div>
        <div class="view-controls"><button id="zoom-out" class="icon-button" aria-label="Zoom out" title="Zoom out (-)">${icon('minus')}</button><button id="reset-zoom" title="Reset view to 100%" aria-label="Reset view to 100%">100%</button><button id="zoom-in" class="icon-button" aria-label="Zoom in" title="Zoom in (+)">${icon('plus')}</button><span class="separator"></span><button id="fit-bottom" title="Fit map (F)">${icon('fit')}<span>Fit</span></button></div>
        <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
      </section>
    </main>
    <footer class="status-bar"><div><span class="status-dot"></span><strong id="tool-status">Paint</strong><span class="status-divider">/</span><span id="cursor-status">Move over the map</span></div><div><span id="draft-status">Local draft ready</span><span class="status-divider">/</span><span>24 px tiles</span><span class="status-divider">/</span><button id="shortcuts">Space to pan <kbd>?</kbd></button></div></footer>
    <input type="file" id="file-input" accept=".json,application/json" hidden />
    <dialog id="new-dialog" aria-labelledby="new-title"><form id="new-form"><div class="dialog-eyebrow">A FRESH CANVAS</div><h2 id="new-title">Every world starts small.</h2><p>Choose a name and the space to explore.</p><label>Map name<input id="new-name" name="name" maxlength="60" value="Untitled world" required /></label><div class="dimension-inputs"><label>Width<input id="new-width" type="number" min="8" max="64" step="1" value="32" required /></label><span>×</span><label>Height<input id="new-height" type="number" min="8" max="64" step="1" value="24" required /></label></div><label>Starting terrain<select id="new-fill"><option value="0">Empty / transparent</option><option value="1">Meadow</option><option value="3">Water</option><option value="2">Sand</option></select></label><div id="new-error" class="form-error" role="alert"></div><p class="form-note">8–64 cells per side · one layer · 24 px per tile</p><div class="dialog-actions"><button type="button" data-close="new-dialog" class="secondary">Cancel</button><button class="primary" type="submit">Create map ${icon('plus')}</button></div><button id="example" class="example-button" type="button">Or reopen the Willow Bay example ${icon('chevron')}</button></form></dialog>
    <dialog id="confirm-dialog" aria-labelledby="confirm-title"><div class="dialog-eyebrow">UNSAVED CHANGES</div><h2 id="confirm-title">Keep your little world.</h2><p>Your current map has changes that are not saved to a JSON file. Save a copy or discard them to continue.</p><div class="dialog-actions"><button id="confirm-cancel" class="secondary">Cancel</button><button id="confirm-discard" class="secondary danger">Discard changes</button><button id="confirm-save" class="primary">Save & continue</button></div></dialog>
    <dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-eyebrow">A FEW SMALL SHORTCUTS</div><h2 id="help-title">Find your flow.</h2><div class="shortcut-list"><span>Paint / erase / pan</span><span><kbd>B</kbd> <kbd>E</kbd> <kbd>H</kbd></span><span>Temporary pan</span><span><kbd>Space</kbd> + drag / middle drag</span><span>Zoom at pointer</span><span>Mouse wheel</span><span>Zoom in / out</span><span><kbd>+</kbd> <kbd>−</kbd></span><span>Fit map / toggle grid</span><span><kbd>F</kbd> <kbd>G</kbd></span><span>Choose tile</span><span><kbd>1</kbd> through <kbd>0</kbd></span><span>Undo / redo stroke</span><span><kbd>Ctrl Z</kbd> / <kbd>Ctrl Shift Z</kbd></span><span>Save / open / new</span><span><kbd>Ctrl S</kbd> <kbd>Ctrl O</kbd> <kbd>Ctrl N</kbd></span><span>Move cursor / pan with Hand tool</span><span>Focus canvas + arrow keys</span><span>Paint / erase one cell</span><span><kbd>Enter</kbd> / <kbd>Delete</kbd></span><span>Cancel current stroke</span><span><kbd>Esc</kbd></span></div><p class="form-note">Use ⌘ instead of Ctrl on macOS. PNG export always uses the native map size. Empty cells export as transparency.</p><div class="dialog-actions"><button class="primary" data-close="help-dialog">Back to the map</button></div></dialog>
  `;
}
