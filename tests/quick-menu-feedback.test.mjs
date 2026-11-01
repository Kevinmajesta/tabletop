import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('quick sheet displays roll errors outside the closed full-sheet dialog', () => {
  const source = readFileSync(new URL('../src/Characters.tsx', import.meta.url), 'utf8');
  const quick = source.slice(source.indexOf('className="character-quick-panel"'), source.indexOf('<dialog'));
  assert.ok(quick.includes('role="alert"'), 'quick sheet must expose server rejection feedback');
  assert.ok(quick.includes('{error}'));
});

test('minigame token menu has an accessible explicit close button', () => {
  const source = readFileSync(new URL('../src/Minigames.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('aria-label="Tutup menu token minigame"'));
  assert.ok(source.includes('tokenMenu.current.open = false'));
});
