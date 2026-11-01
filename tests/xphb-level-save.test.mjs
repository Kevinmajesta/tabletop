import { test } from 'node:test';
import assert from 'node:assert/strict';
import { complete } from './levels-2024.test.mjs';
import { revisedCatalog, asiLevels, finalScores, validateBuild } from '../dist-server/characters.js';

test('all twelve classes can save at levels 6–20 with legal ability increases', () => {
  for (const klass of revisedCatalog.classes) for (let level = 6; level <= 20; level++) {
    const build = complete(klass.index, level);
    build.asi = {};
    for (const at of asiLevels(build)) {
      build.asi[at] = [];
      for (let i = 0; i < 2; i++) {
        const scores = finalScores(build);
        const ability = Object.keys(scores).sort((a, b) => scores[a] - scores[b])[0];
        build.asi[at].push(ability);
      }
    }
    assert.deepEqual(validateBuild(build).errors, [], `${klass.index}/${level}`);
  }
});
