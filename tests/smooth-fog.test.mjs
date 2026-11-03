import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('vision fog uses a blurred mask instead of visible square cells', () => {
  const source = readFileSync(new URL('../src/BoardTools.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('id="vision-fog-blur"'));
  assert.ok(source.includes('filter="url(#vision-fog-blur)"'));
  assert.ok(source.includes('feGaussianBlur'));
  assert.ok(source.includes('filterUnits="userSpaceOnUse"'));
  assert.ok(source.includes('height / rows + 1'));
  assert.ok(source.includes('const columns = 100'));
  assert.ok(source.includes('stdDeviation={Math.max(width / 100, height / rows)}'));
});
