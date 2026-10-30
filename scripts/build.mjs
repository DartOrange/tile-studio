import { build } from 'esbuild';
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  readdir,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const result = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['edge120', 'chrome120', 'firefox121', 'safari17'],
  minify: true,
  write: false,
  legalComments: 'inline',
});
const css = await build({
  entryPoints: ['src/style.css'],
  minify: true,
  write: false,
});
const template = await readFile('index.html', 'utf8');
const html = template
  .replace('<!-- APP_STYLE -->', `<style>${css.outputFiles[0].text}</style>`)
  .replace(
    '<!-- APP_SCRIPT -->',
    `<script>${result.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script>`,
  );
await mkdir('demo', { recursive: true });
await writeFile('demo/index.html', html);
// Generate fixtures from the same model implementation used in the bundle.
const fixtureBuild = await build({
  stdin: {
    contents: "export { exampleMap } from './src/model.ts'",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { exampleMap } = await import(
  `data:text/javascript;base64,${Buffer.from(fixtureBuild.outputFiles[0].text).toString('base64')}`
);
await writeFile(
  'demo/willow-bay.tilemap.json',
  JSON.stringify(exampleMap(), null, 2) + '\n',
);
await writeFile(
  'demo/invalid-map.json',
  JSON.stringify({ ...exampleMap(), version: 99 }, null, 2) + '\n',
);
await copyFile('LICENSE', 'demo/LICENSE.txt');
await copyFile('THIRD_PARTY_NOTICES.md', 'demo/THIRD_PARTY_NOTICES.md');
const files = [
  'index.html',
  'willow-bay.tilemap.json',
  'invalid-map.json',
  'LICENSE.txt',
  'THIRD_PARTY_NOTICES.md',
  'README.md',
];
const hashes = [];
for (const file of files)
  hashes.push(
    `${createHash('sha256')
      .update(await readFile(path.join('demo', file)))
      .digest('hex')}  ${file}`,
  );
let revision = 'uncommitted';
try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  /* Initial build before the first source commit. */
}
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const sourceFiles = [
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
];
for (const dir of ['src', 'scripts'])
  for (const file of await readdir(dir)) sourceFiles.push(`${dir}/${file}`);
const sourceSha256 = {};
for (const file of sourceFiles.sort())
  sourceSha256[file] = createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
await writeFile(
  'demo/build-info.json',
  JSON.stringify(
    {
      product: 'Tile Studio',
      version: pkg.version,
      sourceRevisionAtBuild: revision,
      sourceNote:
        'Build may include working-tree changes. The containing Git commit is the authoritative source snapshot.',
      node: process.version,
      esbuild: pkg.devDependencies.esbuild,
      sourceSha256,
      target:
        'Self-contained desktop browser HTML; classic inline script; no runtime dependencies',
      sha256: Object.fromEntries(
        hashes.map((line) => [line.slice(66), line.slice(0, 64)]),
      ),
    },
    null,
    2,
  ) + '\n',
);
hashes.push(
  `${createHash('sha256')
    .update(await readFile('demo/build-info.json'))
    .digest('hex')}  build-info.json`,
);
await writeFile('demo/SHA256SUMS.txt', hashes.join('\n') + '\n');
console.log(
  `Built demo/index.html (${Buffer.byteLength(html).toLocaleString()} bytes). SHA-256 manifest written.`,
);
