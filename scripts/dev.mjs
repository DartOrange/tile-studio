import { context } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
const template = await readFile('index.html', 'utf8');
await writeFile(
  'dist/index.html',
  template
    .replace('<!-- APP_STYLE -->', '<link rel="stylesheet" href="/style.css">')
    .replace('<!-- APP_SCRIPT -->', '<script src="/main.js"></script>'),
);
const app = await context({
  entryPoints: ['src/main.ts', 'src/style.css'],
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  sourcemap: true,
});
await app.watch();
const server = await app.serve({
  servedir: 'dist',
  host: '127.0.0.1',
  port: 5173,
});
console.log(`Tile Studio: http://${server.hosts[0]}:${server.port}`);
