import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('player tools use the existing sidebar slot', () => {
  const source = readFileSync(new URL('../src/BoardTools.tsx', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.ok(!source.includes('player-tool-rail'));
  assert.ok(source.includes("document.getElementById('player-tools-slot') && createPortal(<button"));
  const sidebar = main.slice(main.indexOf('<nav className="tabletop-rail"'), main.indexOf('</nav>', main.indexOf('<nav className="tabletop-rail"')));
  assert.ok(sidebar.includes('id="player-tools-slot"'));
});
