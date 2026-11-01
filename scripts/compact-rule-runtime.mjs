import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const catalog = new URL('../server/catalog/', import.meta.url);

function compactRow(row, resources) {
  const { fluff, entries, entriesHigherLevel, raw, ...runtime } = row;
  if (raw) {
    const { entries: rawEntries, entriesHigherLevel: rawHigher, ...mechanics } = raw;
    // Trait overlays and equipment properties need entry names, not duplicate paragraphs.
    if (resources && ['race', 'itemProperty'].includes(row.kind)) {
      mechanics.entries = (rawEntries || []).map(e => e && typeof e === 'object' && e.name ? { name: e.name } : {});
    }
    runtime.raw = mechanics;
  }
  return runtime;
}

for (const name of ['resources', 'spells']) {
  const source = await readFile(new URL(`${name}-xphb.json`, catalog));
  const snapshot = JSON.parse(source);
  for (const key of Object.keys(snapshot)) {
    if (Array.isArray(snapshot[key])) snapshot[key] = snapshot[key].map(row => compactRow(row, name === 'resources'));
  }
  const payload = JSON.stringify(snapshot) + '\n';
  await writeFile(new URL(`${name}-xphb-runtime.json`, catalog), payload);
  console.log(`${name}: ${source.length} -> ${Buffer.byteLength(payload)} bytes; gzip ${gzipSync(source).length} -> ${gzipSync(payload).length} bytes`);
}
