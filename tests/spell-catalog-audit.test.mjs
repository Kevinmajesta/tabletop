import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tsImport } from 'tsx/esm/api';

const { revisedCatalog } = await tsImport('../server/characters.ts', import.meta.url);

const snapshot = JSON.parse(readFileSync(new URL('../server/catalog/srd-2024.json', import.meta.url), 'utf8'));
const catalogs = [snapshot, revisedCatalog];
const source = JSON.parse(readFileSync(new URL('./fixtures/spell-audit-srd.json', import.meta.url), 'utf8'));
const normalize = text => text.replace(/\s+/g, ' ').trim();

test('spell inventories retain unique entries after repairs', () => {
  assert.equal(snapshot.spells.length, 217);
  assert.equal(revisedCatalog.spells.length, 218);
  for (const catalog of catalogs) assert.equal(new Set(catalog.spells.map(s => s.index)).size, catalog.spells.length);
});

test('material text excludes extraction parentheses and broken GP punctuation', () => {
  const expected = {
    'arcane-lock': 'gold dust worth 25+ GP, which the spell consumes',
    augury: 'specially marked sticks, bones, cards, or other divinatory tokens worth 25+ GP',
    'protection-from-evil-and-good': 'a flask of Holy Water worth 25+ GP, which the spell consumes',
  };
  for (const catalog of catalogs) {
    for (const [index, material] of Object.entries(expected)) assert.equal(spell(catalog, index).material, material, index);
    for (const s of catalog.spells) assert.doesNotMatch(s.material ?? '', /^\(|\+,/, s.index);
  }
});

for (const index of ['augury', 'confusion', 'control-water']) {
  test(`${index} retains its complete official text without neighboring spell contamination`, () => {
    for (const catalog of catalogs) {
      assert.equal(normalize(spell(catalog, index).description), normalize(source.descriptions[index]));
    }
  });
}

test('restored omen and confusion tables include every outcome', () => {
  for (const catalog of catalogs) {
    const augury = spell(catalog, 'augury').description;
    for (const row of ['Weal | Good', 'Woe | Bad', 'Weal and woe | Good and bad', 'Indifference | Neither good nor bad']) {
      assert.ok(augury.includes(row), row);
    }
    const confusion = spell(catalog, 'confusion').description;
    for (const row of [
      "1 The target doesn't take an action, and it uses all its movement to move. Roll 1d4 for the direction: 1, north; 2, east; 3, south; or 4, west.",
      "2-6 The target doesn't move or take actions.",
      "7-8 The target doesn't move, and it takes the Attack action to make one melee attack against a random creature within reach. If none are within reach, the target takes no action.",
      '9-10 The target chooses its behavior.',
    ]) assert.ok(confusion.includes(row), row);
    assert.doesNotMatch(spell(catalog, 'control-water').description, /Precipitation|Temperature|Counterspell|Wind Stage|weather conditions|conditions to take effect/);
    assert.match(spell(catalog, 'control-water').description, /at least 50 feet square and 25 feet deep/);
  }
});

test('Protection from Evil and Good requires concentration with a clean duration', () => {
  for (const catalog of catalogs) {
    const s = spell(catalog, 'protection-from-evil-and-good');
    assert.equal(s.concentration, true);
    assert.equal(s.duration, 'up to 10 minutes');
    for (const entry of catalog.spells) {
      if (snapshot.spells.some(s => s.index === entry.index) && /concentration/i.test(entry.duration)) {
        assert.equal(entry.concentration, true, entry.index);
      }
    }
  }
});
const spell = (catalog, index) => {
  const entry = catalog.spells.find(s => s.index === index);
  assert.ok(entry, index);
  return entry;
};

// Official SRD 5.2.1 spell headers; source and CC BY attribution: docs/audit-spell-fixes.md.
test('singular Component headers retain clean ranges and every component in snapshot and runtime', () => {
  const expected = {
    'divine-smite': ['Self', ['V']],
    'find-steed': ['30 feet', ['V', 'S']],
    guidance: ['Touch', ['V', 'S']],
    resistance: ['Touch', ['V', 'S']],
    'searing-smite': ['Self', ['V']],
    'sorcerous-burst': ['120 feet', ['V', 'S']],
  };
  for (const catalog of catalogs) {
    for (const [index, [range, components]] of Object.entries(expected)) {
      assert.equal(spell(catalog, index).range, range, index);
      assert.deepEqual(spell(catalog, index).components, components, index);
    }
    for (const s of catalog.spells) {
      assert.doesNotMatch(s.range, /Components?:/, s.index);
      assert.ok(s.components.length > 0, s.index);
    }
  }
});
