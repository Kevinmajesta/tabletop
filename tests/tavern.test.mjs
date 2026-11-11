import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tavernMenu, tavernNotes, tavernChances, defaultReward } from '../dist-server/tavern.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

const price = Object.fromEntries(tavernMenu.flatMap(s => s.items).map(i => [i.id, i]));
// Kalkulator tagihan terpisah dari data jawaban, mengikuti Aturan Rumah apa adanya.
function bill({ guests, tuesday, guild, order, glasses = 0 }) {
  let food = 0, other = 0;
  for (const [id, qty] of Object.entries(order)) {
    const item = price[id];
    if (id === 'ale') other += (tuesday ? item.cp / 2 : item.cp) * qty;
    else if (item.kind === 'food') food += item.cp * (qty - Math.floor(qty / 3));
    else other += item.cp * qty;
  }
  if (guild) food -= Math.floor(food / 10);
  return food + other + 5 * guests + 8 * glasses;
}

test('jawaban ketiga nota sesuai menu dan Aturan Rumah', () => {
  assert.equal(bill({ guests: 5, tuesday: true, order: { ale: 10, boar: 3, soup: 2 } }), tavernNotes[0].answer);
  const mage = bill({ guests: 1, guild: true, order: { pie: 1, fish: 1, wine: 1, tea: 2, private: 2, stable: 4 } });
  assert.equal(1000 - mage, tavernNotes[1].answer);
  const siblings = bill({ guests: 3, tuesday: true, order: { shared: 3, bath: 3, mead: 3, ale: 6, bread: 3, pie: 3 }, glasses: 1 });
  assert.equal(siblings % 3, 0);
  assert.equal(siblings / 3, tavernNotes[2].answer);
});

function started() {
  const game = newGame('t1', 'tavern');
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  return game;
}
const answer = (game, id, note, value) => gameAction(game, id, false, { type: 'tavern:answer', note, value });

test('pemain tidak melihat jawaban atau hadiah sebelum peti terbuka, GM melihat', () => {
  const game = started();
  const pv = gameView(game, 'p1', false).tavern;
  assert.deepEqual(pv.answers, [null, null, null]);
  assert.equal(pv.reward, '');
  const dv = gameView(game, 'dm', true).tavern;
  assert.deepEqual(dv.answers, tavernNotes.map(n => n.answer));
  assert.equal(dv.reward, defaultReward);
  assert.equal(gameView(newGame('t2', 'tavern'), 'p1', false).tavern, undefined);
});

test('alur menang: salah sekali, lalu ketiga nota benar membuka peti', () => {
  const game = started();
  assert.equal(answer(game, 'p1', 0, 300), null);
  assert.equal(game.tavern.chances, tavernChances - 1);
  assert.equal(answer(game, 'p1', 0, tavernNotes[0].answer), null);
  assert.deepEqual(gameView(game, 'p2', false).tavern.answers, [tavernNotes[0].answer, null, null]);
  assert.match(answer(game, 'p2', 0, 1), /sudah terpecahkan/);
  assert.equal(answer(game, 'p2', 1, tavernNotes[1].answer), null);
  assert.equal(game.phase, 'open');
  assert.equal(answer(game, 'p1', 2, tavernNotes[2].answer), null);
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'won');
  assert.equal(gameView(game, 'p2', false).tavern.reward, defaultReward);
  assert.equal(game.tavern.log.length, 4);
  assert.match(answer(game, 'p1', 1, 5), /belum dibuka/);
});

test('alur kalah: kesempatan habis menutup peti, ronde ulang mempertahankan petunjuk GM', () => {
  const game = started();
  assert.match(gameAction(game, 'p1', false, { type: 'tavern:reward', text: 'x' }), /Hanya GM/);
  assert.equal(gameAction(game, 'dm', true, { type: 'tavern:reward', text: 'Cari di bawah papan ke-7 dermaga.' }), null);
  for (let i = 0; i < tavernChances; i++) assert.equal(answer(game, 'p1', 1, 1 + i), null);
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'lost');
  const pv = gameView(game, 'p1', false).tavern;
  assert.equal(pv.reward, '');
  assert.deepEqual(pv.answers, tavernNotes.map(n => n.answer));
  assert.equal(gameAction(game, 'dm', true, { type: 'reset' }), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  assert.equal(game.tavern.chances, tavernChances);
  assert.equal(game.tavern.reward, 'Cari di bawah papan ke-7 dermaga.');
});

test('input tidak valid ditolak tanpa memotong kesempatan', () => {
  const game = started();
  for (const [note, value] of [[3, 1], [-1, 1], [0, 1.5], [0, '265'], [0, -4], [0, 1e9]]) assert.ok(answer(game, 'p1', note, value));
  assert.equal(game.tavern.chances, tavernChances);
});
