import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elements } from '../dist-server/alchemy-data.js';
import { potionPool, potionRules, potionSolution, defaultPotionReward } from '../dist-server/potion.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

const el = z => elements[z - 1];
const metal = e => ['alkali', 'alkaline', 'transition', 'post', 'lanthanide', 'actinide'].includes(e.category);
const K = (b, k) => b.slice(k * 3, k * 3 + 3);
const all = f => b => [0, 1, 2].every(k => f(K(b, k), k));
// Sepuluh aturan, ditulis ulang dari teks aturan di potion-data.ts dan dicek ke data tabel periodik.
const checks = [
  all(c => c.filter(e => e.period === 2).length === 1),
  all(c => metal(c[2])),
  all(c => c.filter(e => e.state === 'cair').length <= 1),
  all(c => c.every((e, i) => e.state !== 'gas' || i === 0)),
  all(c => new Set(c.map(e => e.group)).size === 3),
  b => K(b, 2).every(e => e.category !== 'transition'),
  b => b.every((e, i) => e.category !== 'alkali' || (i % 3 > 0 && b[i - 1].state === 'gas')),
  b => b[4].category === 'halogen',
  all(c => !(c.some(e => e.category === 'noble') && c.some(e => e.category === 'alkali'))),
  all(c => !(c.some(e => e.category === 'alkali') && c.some(e => e.category === 'transition'))),
];
function* perms(a, n = a.length) { if (n <= 1) { yield a.slice(); return; } for (let i = 0; i < n; i++) { yield* perms(a, n - 1); const j = n % 2 ? 0 : i; [a[j], a[n - 1]] = [a[n - 1], a[j]]; } }

test('hanya satu susunan yang memenuhi kesepuluh aturan, dan setiap aturan dibutuhkan', () => {
  assert.equal(checks.length, potionRules.length);
  const boards = [...perms(potionPool.map(el))];
  assert.equal(boards.length, 362880);
  const sols = boards.filter(b => checks.every(c => c(b)));
  assert.equal(sols.length, 1);
  assert.deepEqual(sols[0].map(e => e.z), potionSolution);
  checks.forEach((_, skip) => {
    const n = boards.filter(b => checks.every((c, i) => i === skip || c(b))).length;
    assert.ok(n > 1, `aturan ${skip + 1} ternyata tidak dibutuhkan`);
  });
});

function started() {
  const game = newGame('p1', 'potion');
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  return game;
}
const act = (game, id, type, data = {}) => gameAction(game, id, false, { type, ...data });

test('alur bermain: susun, racik salah tanpa batas, lalu benar', () => {
  const game = started();
  assert.equal(gameView(game, 'p1', false).potion.answer, undefined);
  assert.equal(gameView(game, 'p1', false).potion.reward, '');
  assert.deepEqual(gameView(game, 'dm', true).potion.answer, potionSolution);
  assert.match(act(game, 'p1', 'potion:place', { slot: 0, z: 1 }), /bukan bahan/);
  assert.match(act(game, 'p1', 'potion:place', { slot: 9, z: 11 }), /tidak valid/);
  assert.equal(act(game, 'p1', 'potion:place', { slot: 0, z: 11 }), null);
  assert.equal(act(game, 'p2', 'potion:place', { slot: 4, z: 11 }), null);
  assert.deepEqual(game.potion.slots.filter(v => v !== null), [11]);
  assert.equal(game.potion.slots[4], 11);
  assert.match(act(game, 'p1', 'potion:brew'), /Isi kesembilan/);
  const wrong = [...potionSolution]; [wrong[0], wrong[6]] = [wrong[6], wrong[0]];
  for (let round = 0; round < 12; round++) {
    wrong.forEach((z, slot) => act(game, 'p1', 'potion:place', { slot, z }));
    assert.equal(act(game, 'p1', 'potion:brew'), null);
  }
  assert.equal(game.phase, 'open');
  assert.equal(game.potion.tries, 12);
  assert.equal(act(game, 'p2', 'potion:clear'), null);
  potionSolution.forEach((z, slot) => assert.equal(act(game, 'p2', 'potion:place', { slot, z }), null));
  assert.equal(act(game, 'p2', 'potion:brew'), null);
  assert.equal(game.phase, 'finished');
  assert.equal(gameView(game, 'p1', false).potion.reward, defaultPotionReward);
  assert.match(act(game, 'p1', 'potion:place', { slot: 0, z: 11 }), /belum dibuka/);
});

test('pesan hadiah GM bertahan saat ronde diulang', () => {
  const game = started();
  assert.match(gameAction(game, 'p1', false, { type: 'potion:reward', text: 'x' }), /Hanya GM/);
  assert.equal(gameAction(game, 'dm', true, { type: 'potion:reward', text: 'Uapnya menunjuk ke sumur tua.' }), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'reset' }), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  assert.equal(game.potion.reward, 'Uapnya menunjuk ke sumur tua.');
  assert.deepEqual(game.potion.slots, Array(9).fill(null));
});
