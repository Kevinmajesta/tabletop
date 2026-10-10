import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBuild, validateBuild, catalogFor, revisedCatalog, deriveSheet } from '../dist-server/characters.js';

test('catalog and validation use only 2024, including omitted ruleset', () => {
  assert.equal(catalogFor({}), revisedCatalog);
  assert.deepEqual(deriveSheet({...emptyBuild(),ruleset:undefined}),deriveSheet(emptyBuild()));
  assert.equal(catalogFor({ ruleset: 'srd-2014' }), revisedCatalog);
  const result=validateBuild({...emptyBuild(),ruleset:undefined,name:'Test'});
  assert.equal(result.build.ruleset,'srd-2024');
  assert.ok(!result.errors.some(error=>error.includes('2014')));
  assert.ok(validateBuild({...emptyBuild(),ruleset:'srd-2014'}).errors.some(error=>error.includes('Ruleset harus D&D 2024')));
});
