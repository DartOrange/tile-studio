import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const hash = async (file) =>
  createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
const manifest = await readFile('demo/SHA256SUMS.txt', 'utf8');
const entries = manifest.trim().split('\n');
for (const line of entries) {
  const [expected, file] = line.split('  ');
  assert.equal(
    await hash(`demo/${file}`),
    expected,
    `Package checksum: ${file}`,
  );
}
const info = JSON.parse(await readFile('demo/build-info.json', 'utf8'));
for (const [file, expected] of Object.entries(info.sourceSha256))
  assert.equal(
    await hash(file),
    expected,
    `Build input changed: ${file}. Rebuild the demo.`,
  );
const html = await readFile('demo/index.html', 'utf8');
assert.ok(
  html.includes('<script>') && html.includes('<style>'),
  'Inline bundle required',
);
assert.ok(
  !/<script[^>]+src=|<link[^>]+href=|@import|url\(https?:/i.test(html),
  'Demo must not fetch external assets',
);
assert.ok(
  !html.includes('APP_SCRIPT') && !html.includes('APP_STYLE'),
  'Build placeholders must be replaced',
);
console.log(
  `Verified ${entries.length} package checksums, ${Object.keys(info.sourceSha256).length} source hashes, and inline assets.`,
);
