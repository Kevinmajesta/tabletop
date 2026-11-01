import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('character wizard offers the full PHB level range', () => {
  const source = readFileSync(new URL('../src/Characters.tsx', import.meta.url), 'utf8');
  assert.match(source, /Array\.from\(\{ length: 20 \}, \(_, index\) => index \+ 1\)/);
  assert.doesNotMatch(source, /\[1, 2, 3, 4, 5\]\.map\(\(level\)/);
  assert.ok(source.includes('asiLevels(build).filter(level => level !== 4)'));
  assert.ok(source.includes('featsForLevel(level).map'));
  assert.ok(source.includes('asi: { ...build.asi, 4: selected as Ability[] }'));
  assert.ok(source.includes('asi: { ...build.asi, [level]: selected as Ability[] }'));
});
