import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('vision fog memakai poligon bayangan dinding dan gradien memudar, bukan sel kotak', () => {
  const source = readFileSync(new URL('../src/BoardTools.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('sightPolygon('), 'bayangan dinding dari ray casting');
  assert.ok(source.includes('<radialGradient'), 'tepi jangkauan memudar');
  assert.ok(source.includes('id("dark")'));
  assert.ok(!source.includes('height / rows + 1'), 'tidak ada lagi sel kotak');
});
