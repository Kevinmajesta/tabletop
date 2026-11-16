import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newLich, poisonReadings, lichSolutions, holdersOf, senses, isPoison, gobletCount } from '../dist-server/lich.js';
import { newGame, gameAction, gameView, declareGame } from '../dist-server/minigames.js';

function seeded(seed) {
  let s = seed >>> 0;
  return max => { s = (s * 1664525 + 1013904223) >>> 0; return s % max; };
}
const P = ['p0', 'p1', 'p2', 'p3'];
function started(seed = 7, players = P) {
  const game = newGame('t1', 'lich');
  assert.equal(declareGame(game, players), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, seeded(seed)), null);
  return game;
}
const safeGoblets = game => game.lich.goblets.flatMap((d, g) => (isPoison(d) ? [] : [g]));

test('setiap meja punya satu jawaban, dan setiap indra wajib', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const t = newLich(seeded(seed));
    assert.equal(t.goblets.length, gobletCount);
    assert.equal(t.goblets.filter(isPoison).length, 4);
    assert.equal(poisonReadings(t, senses), 1);
    for (const s of senses) assert.ok(poisonReadings(t, senses.filter(x => x !== s)) > 1, `indra ${s} wajib`);
    for (const s of senses) assert.ok(poisonReadings(t, [s]) > 1, `indra ${s} saja tidak cukup`);
    assert.deepEqual(t.pages.flat().sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  }
});

test('buku tidak lengkap: tanpa aturan banyak kemungkinan, dengan aturan tepat satu', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const t = newLich(seeded(seed));
    const observed = t.goblets.map(d => t.signatures[d]);
    assert.ok(t.shown.every(x => x.length === 2), 'tiap minuman hanya dua ciri tercatat');
    const bare = lichSolutions(observed, t.shown, t.signatures, []);
    assert.ok(bare.direct >= 5, 'minimal lima piala tidak bisa dicocokkan langsung');
    assert.ok(bare.poisonSets >= 4);
    const rules = t.rules.flat();
    assert.ok(rules.length >= 4 && rules.length <= 8);
    const full = lichSolutions(observed, t.shown, t.signatures, rules);
    assert.equal(full.count, 1);
    assert.equal(full.poisonSets, 1);
    // setiap aturan dibutuhkan
    for (const rule of rules) assert.ok(lichSolutions(observed, t.shown, t.signatures, rules.filter(x => x !== rule)).count > 1);
  }
});

test('rahasia: tiap pemain hanya melihat indranya dan halaman bukunya', () => {
  const game = started();
  const seenDrinks = new Set();
  P.forEach((id, i) => {
    const v = gameView(game, id, false).lich;
    assert.deepEqual(v.roles.map(r => r.sense), [senses[i]]);
    assert.deepEqual(Object.keys(v.observed), [senses[i]]);
    assert.equal(v.book.length, 2);
    assert.ok(v.book.every(b => Object.keys(b.traits).length === 2 && !b.full));
    assert.ok(v.rules.length >= 1);
    assert.equal(v.solution, undefined);
    v.book.forEach(b => seenDrinks.add(b.drink));
  });
  assert.equal(seenDrinks.size, 8);
  assert.equal(gameView(game, 'dm', true).lich.solution.length, gobletCount);
});

test('sulangan butuh persetujuan semua peserta; tanda baru membatalkan persetujuan', () => {
  const game = started(3);
  const safe = safeGoblets(game);
  assert.match(gameAction(game, 'p0', false, { type: 'lich:agree' }), /Tandai tepat/);
  for (const g of safe) assert.equal(gameAction(game, 'p1', false, { type: 'lich:mark', goblet: g }), null);
  const extra = [...Array(8).keys()].find(g => !safe.includes(g));
  assert.match(gameAction(game, 'p1', false, { type: 'lich:mark', goblet: extra }), /Lepas satu/);
  for (const id of ['p0', 'p1', 'p2']) assert.equal(gameAction(game, id, false, { type: 'lich:agree' }), null);
  assert.equal(game.phase, 'open');
  // p3 mengubah tanda: persetujuan hilang
  assert.equal(gameAction(game, 'p3', false, { type: 'lich:mark', goblet: safe[0] }), null);
  assert.equal(game.lich.agreed.length, 0);
  assert.equal(gameAction(game, 'p3', false, { type: 'lich:mark', goblet: safe[0] }), null);
  for (const id of P) assert.equal(gameAction(game, id, false, { type: 'lich:agree' }), null);
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'win');
  assert.match(gameAction(game, 'orang-luar', false, { type: 'lich:mark', goblet: 0 }), /belum dimulai|tamu/);
});

test('sulangan salah: lich menyebut jumlah racun dan meja tetap sama', () => {
  const game = started(9);
  const poison = game.lich.goblets.flatMap((d, g) => (isPoison(d) ? [g] : []));
  const safe = safeGoblets(game);
  const before = [...game.lich.goblets];
  for (const g of [poison[0], poison[1], safe[0], safe[1]]) gameAction(game, 'p0', false, { type: 'lich:mark', goblet: g });
  for (const id of P) gameAction(game, id, false, { type: 'lich:agree' });
  assert.equal(game.phase, 'open');
  assert.equal(game.result, 'poisoned');
  assert.equal(game.lich.lastPoisoned, 2);
  assert.equal(game.lich.attempts, 1);
  assert.deepEqual(game.lich.goblets, before);
  assert.equal(gameView(game, 'p1', false).lich.history[0].poisoned, 2);
});

test('pemain kurang dari empat memegang beberapa indra; lebih dari empat ikut berbagi', () => {
  assert.deepEqual(holdersOf({}, 2), [0, 1, 0, 1]);
  assert.deepEqual(holdersOf({}, 6), [0, 1, 2, 3]);
  assert.deepEqual(holdersOf({ holders: [0, 0, 1, 9] }, 3), [0, 1, 2, 0], 'pemegang tidak valid kembali ke bawaan');
  const game = started(4, ['a', 'b', 'c']);
  assert.equal(gameView(game, 'a', false).lich.book.length, 4);
});

test('GM membagi indra selama ronde; pemain lain tidak bisa', () => {
  const game = started(11);
  assert.match(gameAction(game, 'p0', false, { type: 'lich:seat', seats: ['p1', 'p1', 'p2', 'p3'] }), /Hanya GM/);
  assert.equal(gameAction(game, 'dm', true, { type: 'lich:seat', seats: ['p3', 'p3', 'p2', 'p3'] }), null);
  assert.deepEqual(game.players, ['p3', 'p2']);
  assert.deepEqual(gameView(game, 'p3', false).lich.roles.map(r => r.sense), ['sight', 'smell', 'touch']);
  assert.equal(gameView(game, 'p3', false).lich.book.length, 6);
  assert.deepEqual(gameView(game, 'p0', false).lich.roles, []);
  assert.match(gameAction(game, 'dm', true, { type: 'lich:seat', seats: ['p1', 'p2'] }), /keempat indra/);
});

test('ronde lama tanpa buku tidak lengkap tetap bisa ditampilkan', () => {
  const game = started(12);
  delete game.lich.shown; delete game.lich.rules;
  const v = gameView(game, 'p0', false).lich;
  assert.equal(Object.keys(v.book[0].traits).length, 4);
  assert.deepEqual(v.rules, []);
});

test('GM memilih pemegang indra sebelum mulai, tanpa deklarasi (boleh pemain offline)', () => {
  const game = newGame('t2', 'lich');
  assert.equal(gameAction(game, 'dm', true, { type: 'lich:seat', seats: ['budi', 'sari', 'budi', 'rani'] }), null);
  assert.deepEqual(game.players, ['budi', 'sari', 'rani']);
  assert.ok(game.declaration >= 1);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, seeded(3)), null);
  assert.deepEqual(gameView(game, 'budi', false).lich.roles.map(r => r.sense), ['sight', 'watch']);
  assert.deepEqual(gameView(game, 'rani', false).lich.roles.map(r => r.sense), ['touch']);
});
