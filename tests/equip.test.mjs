import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBuild, deriveSheet, emptyBuild, buildGroups, equipItem, equippedWeapons, visibleAttacks } from '../dist-server/characters.js';

// Ranger level 1 dengan pilihan pertama di setiap grup (paket equipment A: scimitar, shortsword, longbow, studded leather).
function ranger() {
  let build = { ...emptyBuild(), classId: 'ranger', name: 'Uji' };
  for (let i = 0; i < 6; i++) {
    for (const g of buildGroups(build)) if ((build.choices[g.key] || []).length !== g.count) build.choices = { ...build.choices, [g.key]: g.options.slice(0, g.count).map(o => o.id) };
  }
  const sheet = deriveSheet(build);
  return { id: 'c', ownerId: 'p', revision: 1, ruleset: build.ruleset, build, sheet, hp: sheet.hp, tempHp: 0, slotsUsed: 0, deathSuccess: 0, deathFailure: 0, conditions: [] };
}

test('karakter lama tanpa daftar equipped: semua senjata dianggap dipakai', () => {
  const c = ranger();
  assert.deepEqual(equippedWeapons(c).sort(), ['longbow', 'scimitar', 'shortsword']);
  assert.equal(visibleAttacks(c).length, c.sheet.attacks.length);
});

test('melepas senjata menyembunyikannya dari serangan; unarmed strike tetap ada', () => {
  const c = ranger();
  equipItem(c, 'scimitar', false);
  equipItem(c, 'shortsword', false);
  assert.deepEqual(visibleAttacks(c).map(a => a.id).sort(), ['longbow', 'unarmed-strike']);
  equipItem(c, 'shortsword', true);
  assert.deepEqual(visibleAttacks(c).map(a => a.id).sort(), ['longbow', 'shortsword', 'unarmed-strike']);
});

test('armor yang dipakai mengubah AC; barang yang tidak dimiliki ditolak', () => {
  const c = ranger();
  const bare = c.sheet.ac;
  equipItem(c, 'studded-leather-armor', true);
  assert.equal(c.build.armor, 'studded-leather-armor');
  assert.ok(c.sheet.ac > bare, `AC naik dari ${bare} ke ${c.sheet.ac}`);
  equipItem(c, 'studded-leather-armor', false);
  assert.equal(c.sheet.ac, bare);
  assert.throws(() => equipItem(c, 'greatsword', true), /tidak ada di inventory/);
  assert.throws(() => equipItem(c, 'explorers-pack', true), /tidak bisa dipakai/);
  assert.throws(() => equipItem(c, 'longbow', 'ya'), /tidak valid/);
  assert.ok(validateBuild(c.build).build, 'build tetap valid setelah ganti armor');
});
