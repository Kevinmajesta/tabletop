import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('XPHB importer produces the complete non-spell inventory with provenance', async () => {
  assert.ok(existsSync(new URL('../server/catalog/resources-xphb.json', import.meta.url)), 'generated XPHB resource inventory is missing');
  const { default: data } = await import('../server/catalog/resources-xphb.json', { with: { type: 'json' } });
  assert.equal(data.metadata.source, 'XPHB');
  assert.equal(data.metadata.revision, '8790755429c346d20020eed7826d312d484c393f');
  for (const [kind, count] of Object.entries({ race: 10, background: 16, feat: 77, optionalfeature: 58, class: 12, subclass: 48, baseitem: 94, item: 123, itemGroup: 6 })) {
    assert.equal(data.resources.filter(r => r.kind === kind).length, count, kind);
    assert.equal(data.metadata.counts[kind], count);
  }
  assert.ok(data.resources.every(r => r.source === 'XPHB' && r.file && r.raw && Array.isArray(r.desc)));
  assert.equal(new Set(data.resources.map(r => r.id)).size, data.resources.length);
  for (const cls of data.resources.filter(r => r.kind === 'class')) {
    const features = data.resources.filter(r => r.kind === 'classFeature' && r.raw.className === cls.name);
    assert.ok(features.some(r => r.raw.level === 1), cls.name);
    assert.ok(features.some(r => r.raw.level === 20), cls.name);
    assert.ok(cls.desc.join('\n').includes('Level 20'), cls.name);
  }
});

test('book links render visible labels rather than chapter numbers', async () => {
  const { default: data } = await import('../server/catalog/resources-xphb.json', { with: { type: 'json' } });
  const desc = data.resources.find(r => r.name === 'Mounted Combatant').desc.join('\n');
  assert.match(desc, /While mounted/);
  assert.doesNotMatch(desc, /While 1/);
});

test('MPMM summaries and owner-matched trait details survive enrichment', async () => {
  const { applyXphbResources } = await import('../dist-server/catalog/resources-xphb.js');
  const { motmRaces, motmTraits } = await import('../dist-server/catalog/motm.js');
  const { default: snapshot } = await import('../server/catalog/srd-2024.json', { with: { type: 'json' } });
  const input = { ...snapshot, races: [...snapshot.races, ...motmRaces], traits: [...snapshot.traits, ...motmTraits, {index:'motm:aasimar-healing', name:'Healing Hands', desc:['Ringkasan asli.']}] };
  input.races = input.races.map(r => r.index === 'motm:aasimar' ? {...r, traits:[...r.traits, {index:'motm:aasimar-healing',name:'Healing Hands'}]} : r);
  const output = applyXphbResources(input);
  assert.equal(output.races.find(r => r.index === 'motm:aasimar').desc[0], motmRaces.find(r => r.index === 'motm:aasimar').desc[0]);
  const trait = output.traits.find(r => r.index === 'motm:aasimar-healing');
  assert.equal(trait.desc[0], 'Ringkasan asli.');
  assert.match(trait.desc.join('\n'), /d4/);
  assert.equal(trait.mpmm.source, 'MPMM');
  assert.ok(output.traits.find(r => r.index === 'motm:aasimar').desc.some(t => t.includes('dilacak manual')));
  assert.deepEqual(applyXphbResources(output), output);
});

test('MPMM inventory maps all 33 selectable species without mixing book sources', async () => {
  const { mpmmResources, mpmmSpeciesResources, applyXphbResources } = await import('../dist-server/catalog/resources-xphb.js');
  const { motmRaces, motmTraits } = await import('../dist-server/catalog/motm.js');
  const { default: snapshot } = await import('../server/catalog/srd-2024.json', { with: { type: 'json' } });
  assert.equal(mpmmResources.filter(r => r.kind === 'race').length, 30);
  assert.equal(mpmmResources.filter(r => r.kind === 'subrace').length, 4);
  assert.equal(mpmmSpeciesResources.length, 33);
  assert.deepEqual(new Set(mpmmSpeciesResources.map(r => r.index)), new Set(motmRaces.map(r => r.index)));
  const catalog = applyXphbResources({ ...snapshot, races: [...snapshot.races, ...motmRaces], traits: [...snapshot.traits, ...motmTraits] });
  for (const old of motmRaces) {
    const updated = catalog.races.find(r => r.index === old.index);
    assert.equal(updated.mpmm.source, 'MPMM');
    assert.ok(updated.desc.length);
    for (const key of Object.keys(old).filter(k => !['desc', 'description'].includes(k))) assert.deepEqual(updated[key], old[key]);
  }
});

test('overlay preserves mechanics and MotM while enriching descriptions and equipment', async () => {
  const { applyXphbResources, xphbFeats, xphbOptionalFeatures, xphbResourceMetadata } = await import('../dist-server/catalog/resources-xphb.js');
  const snapshot = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../server/catalog/srd-2024.json', import.meta.url), 'utf8'));
  const motm = { index: 'motm:elf', name: 'Elf', desc: ['MotM only'] };
  snapshot.races.push(motm);
  const catalog = applyXphbResources(snapshot);
  assert.deepEqual(catalog.races.find(r => r.index === motm.index), motm);
  assert.equal(catalog.races.filter(r => !r.index.startsWith('motm:')).length, 10);
  for (const key of ['classes', 'races', 'subclasses', 'equipment', 'features']) for (const old of snapshot[key]) {
    const updated = catalog[key].find(r => r.index === old.index);
    assert.ok(updated, `${key}/${old.index}`);
    for (const field of Object.keys(old).filter(k => !['desc', 'description'].includes(k))) assert.deepEqual(updated[field], old[field], `${key}/${old.index}/${field}`);
  }
  assert.ok(catalog.classes.every(r => r.desc.join('\n').includes('Level 20')));
  assert.equal(catalog.subclasses.length, 48);
  assert.ok(catalog.subclasses.every(r => r.desc.length > 0));
  assert.ok(catalog.equipment.length >= 223);
  assert.ok(catalog.equipment.every(r => typeof r.description === 'string' || Array.isArray(r.description)));
  assert.equal(new Set(catalog.equipment.map(r => r.index)).size, catalog.equipment.length);
  assert.equal(xphbFeats.length, 77);
  assert.equal(xphbOptionalFeatures.length, 58);
  assert.equal(xphbResourceMetadata.unresolvedReferences.length, 0);
  assert.ok(xphbFeats.every(f => f.xphb && f.desc.length));
  assert.ok(xphbOptionalFeatures.every(f => f.xphb && f.desc.length));
  assert.deepEqual(applyXphbResources(catalog), catalog, 'overlay must be idempotent');
});
