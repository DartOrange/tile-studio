# Run Tile Studio

Double-click **index.html**, or choose **Open with → Microsoft Edge**. No installation, server, account, or network connection is needed. Keep a JSON copy of maps you want to retain; browser drafts are a convenience, not a backup.

Try this: select Pine, drag across the example island, zoom with the wheel, hold Space and drag to pan, paint again, then Undo and Redo. Save map downloads version 1 JSON. Open that file to continue. Export PNG downloads just the map at 24 pixels per tile.

- `willow-bay.tilemap.json`: the original editable example.
- `invalid-map.json`: intentionally unsupported version 99; opening it must show an error and preserve your current map.
- `SHA256SUMS.txt`: SHA-256 hashes of this package's files.
- `build-info.json`: compiler/runtime versions and build provenance.
- `LICENSE.txt` and `THIRD_PARTY_NOTICES.md`: redistribution information.

Use the **?** control for keyboard shortcuts. Arrow keys and Enter edit a focused canvas. Paint/erase are B/E; H or Space-drag pans; F fits; G toggles grid; Ctrl+Z/Ctrl+Shift+Z undo/redo; Ctrl+S saves JSON.

The local draft may be unavailable in private browsing or restricted browser environments. File-URL storage is browser-dependent and tied to the file location. A warning appears when a draft cannot be stored. Saving JSON is the portable way to retain your work. A Save action initiates a browser download; verify that the browser actually kept the file before discarding important changes.
