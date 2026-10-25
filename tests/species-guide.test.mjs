import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { revisedCatalog, emptyBuild } from '../dist-server/characters.js';

test('every selectable species has its own Indonesian overview and catalog-backed details', async () => {
  assert.ok(existsSync(new URL('../dist-server/catalog/species-guide.js', import.meta.url)), 'species guide is available');
  const { speciesGuide, speciesOverviews } = await import('../dist-server/catalog/species-guide.js');
  assert.equal(revisedCatalog.races.length, 43);
  assert.deepEqual(Object.keys(speciesOverviews).sort(), revisedCatalog.races.map(r => r.index).sort());
  assert.equal(new Set(Object.values(speciesOverviews)).size, 43);
  for (const race of revisedCatalog.races) {
    const guide = speciesGuide({...emptyBuild(), race: race.index}, revisedCatalog);
    assert.ok(guide.overview.length > 45, race.index);
    assert.equal(guide.speed, race.speed);
    assert.ok(guide.size.length > 0, race.index);
    assert.ok(guide.traits.length > 0, race.index);
    for (const trait of guide.traits) assert.ok(revisedCatalog.traits.some(t => t.index === trait.index));
  }
});
