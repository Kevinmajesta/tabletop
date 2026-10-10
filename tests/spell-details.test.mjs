import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisedCatalog } from '../dist-server/characters.js';

test('2024 spells expose descriptions and Command includes commands and upcast', () => {
  for (const spell of revisedCatalog.spells) assert.ok(spell.desc?.some(text => text.trim()), spell.index);
  const command = revisedCatalog.spells.find(spell => spell.index === 'command');
  assert.match(command.desc.join('\n'), /Wisdom saving throw/);
  assert.match(command.desc.join('\n'), /Approach/);
  assert.match(command.desc.join('\n'), /one additional creature/);
});

test('2024 species traits include descriptions and lineage spell details', () => {
  for (const id of ['trance','wood-elf-speed-increase','lineage-spell-longstrider','lineage-spell-pass-without-trace']) {
    const trait = revisedCatalog.traits.find(t => t.index === id);
    assert.ok(trait.desc.some(text => text.trim()), id);
  }
  assert.match(revisedCatalog.traits.find(t => t.index === 'lineage-spell-longstrider').desc.join('\n'), /10 feet/);
  assert.match(revisedCatalog.traits.find(t => t.index === 'lineage-spell-pass-without-trace').desc.join('\n'), /Stealth/);
});
