import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tsImport } from 'tsx/esm/api';

const { randomId } = await tsImport('../src/random-id.ts', import.meta.url);

test('randomId falls back when crypto.randomUUID is unavailable', () => {
  const source = {
    getRandomValues(values) {
      values.set([1, 2, 3, 4]);
      return values;
    },
  };

  assert.equal(randomId(source), '1-2-3-4');
});
