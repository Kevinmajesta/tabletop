import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const snapshotPath = new URL('../server/catalog/spells-xphb.json', import.meta.url);

test('runtime merger replaces stale spells, retains mechanical alias IDs, and never mutates inputs', async () => {
  const runtimePath = new URL('../server/catalog/spells-xphb.ts', import.meta.url);
  assert.ok(existsSync(runtimePath), 'XPHB runtime merger must exist');
  const { tsImport } = await import('tsx/esm/api');
  const { mergeXphbSpells, xphbSpells, xphbSpellId } = await tsImport(runtimePath.href, import.meta.url);
  const input = [
    { index: 'hideous-laughter', name: 'Hideous Laughter', level: 1, desc: ['old'], classes: [] },
    { index: 'blade-ward', name: 'Blade Ward', desc: ['old'], damage: { damage_at_slot_level: { '0': '1d6' } } },
    { index: 'custom', name: 'Custom spell', desc: ['keep me'] },
  ];
  const before = structuredClone(input);
  const result = mergeXphbSpells(input);
  assert.deepEqual(input, before);
  assert.equal(result.length, 392);
  assert.equal(new Set(result.map(s => s.index)).size, 392);
  assert.equal(result.find(s => s.index === 'hideous-laughter').name, "Tasha's Hideous Laughter");
  assert.ok(!result.some(s => s.index === 'tashas-hideous-laughter'));
  assert.equal(result.find(s => s.index === 'blade-ward').concentration, true);
  assert.equal(result.find(s => s.index === 'blade-ward').damage, undefined, 'obsolete damage must not survive');
  assert.equal(result.find(s => s.index === 'fire-bolt').damage.damage_at_slot_level['0'], '1d10');
  assert.equal(result.find(s => s.index === 'custom').desc[0], 'keep me');
  assert.deepEqual(mergeXphbSpells(result), result);
  assert.equal(xphbSpells.length, 391);
  assert.equal(xphbSpellId('hideous-laughter'), 'tashas-hideous-laughter');
  assert.equal(xphbSpellId('custom'), 'custom');
  const srd = JSON.parse(readFileSync(new URL('../server/catalog/srd-2024.json', import.meta.url))).spells;
  const merged = mergeXphbSpells(srd);
  for (const spell of srd) assert.ok(merged.some(s => s.index === spell.index), spell.index);
  assert.equal(merged.length, 391);
  assert.ok(merged.find(s => s.index === 'wish').classes.some(c => c.index === 'wizard'));
});

test('renderer supports nested tags and rejects unknown source structures rather than losing text', async () => {
  const { readable, renderEntries } = await import('../scripts/import-5etools-spells.mjs');
  assert.equal(readable('{@b {@spell Wish|XPHB}}'), 'Wish');
  assert.equal(readable('{@variantrule Cover|XPHB|Half Cover}'), 'Half Cover');
  assert.throws(() => readable('{@unknown stuff}'), /Unsupported/);
  assert.throws(() => renderEntries({ type: 'unknown' }), /Unsupported/);
});

test('local importer generates all 391 XPHB spells with complete readable entries and source provenance', async () => {
  const importerPath = new URL('../scripts/import-5etools-spells.mjs', import.meta.url);
  assert.ok(existsSync(importerPath), 'local XPHB spell importer must exist');
  const { importSpells } = await import(importerPath.href);
  const actual = importSpells('D:/5etools-src');
  const raw = JSON.parse(readFileSync('D:/5etools-src/data/spells/spells-xphb.json')).spell.filter(s => s.source === 'XPHB');
  assert.equal(actual.spells.length, 391);
  assert.equal(new Set(actual.spells.map(s => s.index)).size, 391);
  assert.deepEqual(actual.spells.map(s => s.name), raw.map(s => s.name));
  assert.equal(actual.provenance.commit, '8790755429c346d20020eed7826d312d484c393f');
  assert.equal(actual.provenance.source, 'XPHB');
  assert.deepEqual(actual, JSON.parse(readFileSync(snapshotPath)));
  for (const [i, spell] of actual.spells.entries()) {
    assert.deepEqual(spell.entries, raw[i].entries, `${spell.name}: retain rich source entries`);
    assert.deepEqual(spell.entriesHigherLevel, raw[i].entriesHigherLevel || []);
    assert.ok(spell.desc.length > 0, spell.name);
    assert.doesNotMatch(spell.desc.join('\n'), /\{@|\{@|\|XPHB/, spell.name);
    assert.ok(spell.classes.length > 0, `${spell.name}: class membership`);
    assert.ok(spell.classes.every(c => ['bard','cleric','druid','paladin','ranger','sorcerer','warlock','wizard'].includes(c.index)));
    assert.equal(spell.concentration, raw[i].duration.some(d => d.concentration));
    assert.equal(spell.ritual, !!raw[i].meta?.ritual);
  }
  assert.equal(Math.max(...actual.spells.map(s => s.level)), 9);
  const augury = actual.spells.find(s => s.index === 'augury');
  assert.match(augury.desc.join('\n'), /Weal and woe \| Good and bad/);
  assert.match(augury.material, /25\+ GP/);
  assert.match(actual.spells.find(s => s.index === 'acid-splash').desc.join('\n'), /17 \(4d6\)/);
  const rerun = spawnSync(process.execPath, ['scripts/import-5etools-spells.mjs', 'D:/5etools-src'], { cwd: root, encoding: 'utf8' });
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.deepEqual(JSON.parse(readFileSync(snapshotPath)), actual);
});
