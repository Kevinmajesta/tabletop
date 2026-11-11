import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elements, seals, defaultAlchemyReward } from '../dist-server/alchemy.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

const bySym = Object.fromEntries(elements.map(e => [e.symbol, e]));
const at = (row, col) => elements.find(e => e.row === row && e.col === col);
const up = e => at(e.row - 1, e.col);
const left = e => elements.filter(x => x.row === e.row && x.col < e.col).sort((a, b) => b.col - a.col)[0];
const only = (list, why) => { assert.equal(list.length, 1, `${why}: ${list.map(e => e.symbol)}`); return list[0]; };

test('tata letak tabel periodik standar', () => {
  assert.equal(elements.length, 118);
  for (const [s, g, p] of [['H', 1, 1], ['He', 18, 1], ['B', 13, 2], ['Ne', 18, 2], ['K', 1, 4], ['Fe', 8, 4], ['Hf', 4, 6], ['Au', 11, 6], ['Bi', 15, 6], ['Rn', 18, 6], ['Rf', 4, 7], ['Og', 18, 7]]) {
    assert.equal(bySym[s].group, g, s);
    assert.equal(bySym[s].period, p, s);
  }
  assert.equal(bySym.Eu.col, bySym.Am.col);
  assert.equal(bySym.La.group, null);
  const cells = new Set(elements.map(e => `${e.row}:${e.col}`));
  assert.equal(cells.size, 118);
});

test('Segel Pertama: setiap teka-teki punya tepat satu jawaban', () => {
  const c = only(elements.filter(e => e.period === 2 && e.category === 'nonmetal' && e.state === 'padat'), 'nonlogam padat periode 2');
  const ne = at(bySym.F.row, bySym.F.col + 1);
  const ar = at(ne.row + 1, ne.col);
  assert.equal(ar.category, 'noble');
  const i = only(elements.filter(e => e.category === 'halogen' && e.state === 'padat' && e.symbol.length === 1), 'halogen padat 1 huruf');
  const order = [c, ar, i].sort((a, b) => a.z - b.z);
  assert.deepEqual(order.map(e => e.z), seals[0].answer);
  assert.equal(order.map(e => e.symbol).join('').toUpperCase(), seals[0].word);
});

test('Segel Kedua: jejak bersyarat sampai ke LILIN, setiap titik awal unik', () => {
  const isMetal = e => ['alkali', 'alkaline', 'transition', 'post', 'lanthanide', 'actinide'].includes(e.category);
  const right = e => elements.filter(x => x.row === e.row && x.col > e.col).sort((p, q) => p.col - q.col)[0];
  // 1. Logam alkali periode 5, naik terus, berhenti tepat sebelum menginjak bukan-logam.
  let a = only(elements.filter(e => e.category === 'alkali' && e.period === 5), 'alkali periode 5');
  while (up(a) && isMetal(up(a))) a = up(a);
  assert.ok(up(a) && !isMetal(up(a)), 'baris 1 harus berhenti karena bertemu bukan-logam');
  // 2. Tetangga kanan natrium, naik satu, lalu ke kiri sampai mentok.
  let b = up(right(bySym.Na));
  while (left(b)) b = left(b);
  // 3. Nonlogam padat golongan 16 periode 3, naik sampai gas, lalu ke kiri sampai gas berikutnya.
  let c = only(elements.filter(e => e.category === 'nonmetal' && e.state === 'padat' && e.group === 16 && e.period === 3), 'nonlogam padat gol 16 per 3');
  do c = up(c); while (c.state !== 'gas');
  do c = left(c); while (c.state !== 'gas');
  assert.deepEqual([a, b, c].map(e => e.z), seals[1].answer);
  assert.equal([a, b, c].map(e => e.symbol).join('').toUpperCase(), seals[1].word);
});

test('Segel Ketiga: deduksi berantai dua logam', () => {
  const metal = e => !['metalloid', 'nonmetal', 'halogen', 'noble'].includes(e.category);
  const lastFirst = elements[seals[0].answer.at(-1) - 1];
  const lastSecond = elements[seals[1].answer.at(-1) - 1];
  const ironMate = only(elements.filter(e => metal(e) && e.group === bySym.Fe.group && e.period === lastFirst.period), 'segolongan besi seperiode I');
  const other = only(elements.filter(e => metal(e) && e.group === lastSecond.group && e.period === bySym.Au.period), 'segolongan N seperiode emas');
  const pair = [ironMate, other].sort((a, b) => b.z - a.z);
  assert.deepEqual(pair.map(e => e.z), seals[2].answer);
  assert.equal(pair.map(e => e.symbol).join('').toUpperCase(), seals[2].word);
});

function started() {
  const game = newGame('a1', 'alchemy');
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  return game;
}
const act = (game, id, type, data = {}) => gameAction(game, id, false, { type, ...data });

test('alur menang lewat tiga segel, jawaban tersembunyi sampai selesai', () => {
  const game = started();
  assert.equal(gameView(game, 'p1', false).alchemy.answers, undefined);
  assert.equal(gameView(game, 'p1', false).alchemy.reward, '');
  assert.deepEqual(gameView(game, 'dm', true).alchemy.answers, seals.map(s => s.answer));
  assert.equal(act(game, 'p1', 'alch:draft', { draft: [6, 18] }), null);
  assert.match(act(game, 'p1', 'alch:submit'), /butuh 3 unsur/);
  assert.equal(act(game, 'p2', 'alch:draft', { draft: [53, 18, 6] }), null);
  assert.equal(act(game, 'p2', 'alch:submit'), null);
  assert.equal(game.alchemy.mistakes, 1);
  assert.deepEqual(game.alchemy.draft, []);
  for (const [i, s] of seals.entries()) {
    assert.equal(game.alchemy.seal, i);
    assert.equal(act(game, 'p1', 'alch:draft', { draft: s.answer }), null);
    assert.equal(act(game, 'p1', 'alch:submit'), null);
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'won');
  assert.equal(gameView(game, 'p2', false).alchemy.reward, defaultAlchemyReward);
});

test('tanpa batas percobaan: salah berkali-kali tidak mengunci, validasi draft tetap jalan', () => {
  const game = started();
  for (const bad of [[0], [119], [1.5], ['6'], [1, 2, 3, 4], 'x']) assert.ok(act(game, 'p1', 'alch:draft', { draft: bad }));
  assert.match(gameAction(game, 'p1', false, { type: 'alch:reward', text: 'x' }), /Hanya GM/);
  assert.equal(gameAction(game, 'dm', true, { type: 'alch:reward', text: 'Lilin biru di rak atas.' }), null);
  for (let i = 0; i < 20; i++) {
    assert.equal(act(game, 'p1', 'alch:draft', { draft: [1, 1, 1] }), null);
    assert.equal(act(game, 'p1', 'alch:submit'), null);
  }
  assert.equal(game.phase, 'open');
  assert.equal(game.alchemy.mistakes, 20);
  assert.equal(gameView(game, 'p1', false).alchemy.answers, undefined);
  assert.equal(act(game, 'p1', 'alch:draft', { draft: seals[0].answer }), null);
  assert.equal(act(game, 'p1', 'alch:submit'), null);
  assert.equal(game.alchemy.seal, 1);
  assert.equal(gameAction(game, 'dm', true, { type: 'reset' }), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  assert.equal(game.alchemy.reward, 'Lilin biru di rak atas.');
  assert.equal(game.alchemy.mistakes, 0);
});
