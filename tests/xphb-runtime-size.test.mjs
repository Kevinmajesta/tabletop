import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const catalog = new URL('../server/catalog/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, catalog), 'utf8'));

test('compact snapshots preserve descriptions and runtime mechanics without audit prose', () => {
  for (const name of ['resources', 'spells']) {
    const runtimePath = new URL(`${name}-xphb-runtime.json`, catalog);
    assert.ok(existsSync(runtimePath), `${fileURLToPath(runtimePath)} must be generated`);
    const full = read(`${name}-xphb.json`);
    const compact = read(`${name}-xphb-runtime.json`);
    for (const key of Object.keys(full).filter(key => !Array.isArray(full[key]))) {
      assert.deepEqual(compact[key], full[key], `${name}.${key}`);
    }
    for (const key of Object.keys(full).filter(key => Array.isArray(full[key]))) {
      assert.equal(compact[key].length, full[key].length, key);
      full[key].forEach((row, i) => {
        const actual = compact[key][i];
        // Every normalized field (including descriptions, aliases and provenance) survives.
        for (const field of Object.keys(row).filter(k => !['raw', 'fluff', 'entries', 'entriesHigherLevel'].includes(k))) {
          assert.deepEqual(actual[field], row[field], `${row.id || row.index}.${field}`);
        }
        assert.ok(!('fluff' in actual));
        assert.ok(!('entries' in actual));
        assert.ok(!('entriesHigherLevel' in actual));
        for (const field of Object.keys(row.raw || {}).filter(k => !['entries', 'entriesHigherLevel'].includes(k))) {
          assert.deepEqual(actual.raw[field], row.raw[field], `${row.id || row.index}.raw.${field}`);
        }
        // Trait matching and item-property names read only the immediate entry names.
        const namedEntries = name === 'resources' && ['race', 'itemProperty'].includes(row.kind)
          ? (row.raw.entries || []).map(e => e && typeof e === 'object' && e.name ? { name: e.name } : {})
          : undefined;
        assert.deepEqual(actual.raw.entries, namedEntries, `${row.id || row.index}.raw.entries`);
        assert.ok(!('entriesHigherLevel' in actual.raw));
      });
    }
    const originalBytes = Buffer.byteLength(JSON.stringify(full));
    const compactBytes = readFileSync(runtimePath).length;
    assert.ok(compactBytes < originalBytes * 0.75, `${name}: ${compactBytes} must be <75% of ${originalBytes} minified source bytes`);
  }
});
