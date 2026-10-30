# Third-party notices

Tile Studio has **no runtime package dependencies**. All terrain artwork, icons, the Willow Bay example, and interface styles are included under the repository's MIT license. Artwork is drawn with Canvas paths and rectangles; no external images, fonts, or tile sets are embedded.

The interface uses the operating system's installed Segoe UI or system sans-serif font. Font files are not redistributed.

Development-only packages are installed through npm and are not included in the compiled demo: esbuild (MIT), TypeScript (Apache-2.0), ESLint and @eslint/js (MIT), typescript-eslint (MIT), globals (MIT), Prettier (MIT), tsx (MIT), @types/node (MIT), and Playwright (Apache-2.0). Their transitive dependencies retain their individual licenses inside `node_modules`. The package lock records exact resolved development dependencies.

The compiled demo includes original application code only. `demo/LICENSE.txt` contains the license applicable to that code and its bundled original assets.
