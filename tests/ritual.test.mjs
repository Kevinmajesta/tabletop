import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newRitual, ritualView, visionOf, holderOf, candleCount, ritualSteps, ritualSeals } from '../dist-server/ritual.js';
import { newGame, gameAction, gameView, declareGame } from '../dist-server/minigames.js';

// Pembuat acak deterministik supaya tes bisa diulang.
function seeded(seed) {
  let s = seed >>> 0;
  return max => { s = (s * 1664525 + 1013904223) >>> 0; return s % max; };
}

function startedGame(players, seed = 7) {
  const game = newGame('t1', 'ritual');
  assert.equal(declareGame(game, players), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, seeded(seed)), null);
  return game;
}

test('ritual yang dibuat selalu punya lima langkah ke lilin berbeda', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const r = newRitual(seeded(seed));
    assert.equal(r.candles.length, candleCount);
    assert.equal(r.order.length, ritualSteps);
    assert.equal(new Set(r.order).size, ritualSteps);
    assert.equal(new Set(r.candles.map(c => c.rune)).size, candleCount, 'rune unik');
    assert.equal(r.clues.length, ritualSteps);
  }
});

test('penglihatan bergantian warna dan rune, pemain tunggal melihat semuanya', () => {
  assert.equal(visionOf(0, 1), 'all');
  assert.equal(visionOf(0, 3), 'color');
  assert.equal(visionOf(1, 3), 'rune');
  assert.equal(visionOf(2, 3), 'color');
  assert.equal(visionOf(-1, 3), 'none');
  assert.deepEqual([0, 1, 2, 3, 4].map(s => holderOf(s, 2)), [0, 1, 0, 1, 0]);
});

test('pemain hanya menerima ciri dan petunjuk miliknya, tanpa urutan jawaban', () => {
  const game = startedGame(['a', 'b']);
  const a = gameView(game, 'a', false).ritual;
  const b = gameView(game, 'b', false).ritual;
  assert.equal(a.vision, 'color');
  assert.ok(a.candles.every(c => c.color !== null && c.rune === null));
  assert.ok(b.candles.every(c => c.rune !== null && c.color === null));
  assert.deepEqual(a.myClues.map(c => c.step), [0, 2, 4]);
  assert.deepEqual(b.myClues.map(c => c.step), [1, 3]);
  assert.equal(a.order, undefined);
  assert.equal(JSON.stringify(gameView(game, 'a', false)).includes('"order"'), false);
  const spectator = gameView(game, 'x', false).ritual;
  assert.equal(spectator.myClues.length, 0);
  assert.ok(spectator.candles.every(c => c.color === null && c.rune === null));
  const gm = gameView(game, 'dm', true).ritual;
  assert.equal(gm.order.length, ritualSteps);
  assert.equal(gm.myClues.length, ritualSteps);
});

test('urutan benar memenangkan ritual dan memberi poin', () => {
  const game = startedGame(['a', 'b']);
  const order = game.ritual.order;
  order.forEach((candle, i) => {
    assert.equal(gameAction(game, i % 2 ? 'b' : 'a', false, { type: 'ritual:light', candle }), null);
  });
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'win');
  assert.deepEqual(game.scores, { a: 1, b: 1 });
  assert.equal(gameView(game, 'a', false).ritual.order.length, ritualSteps, 'jawaban dibuka setelah selesai');
});

test('lilin salah memadamkan semua lilin dan mematahkan satu segel', () => {
  const game = startedGame(['a', 'b']);
  const [first, second] = game.ritual.order;
  const wrong = [...Array(candleCount).keys()].find(i => i !== second && i !== first);
  gameAction(game, 'a', false, { type: 'ritual:light', candle: first });
  gameAction(game, 'b', false, { type: 'ritual:light', candle: wrong });
  assert.equal(game.result, 'backfire');
  assert.deepEqual(game.ritual.lit, []);
  assert.equal(game.ritual.seals, ritualSeals - 1);
  assert.equal(gameView(game, 'a', false).ritual.candles[wrong].wrong, true);
});

test('segel habis menggagalkan ritual', () => {
  const game = startedGame(['a']);
  const wrong = [...Array(candleCount).keys()].find(i => i !== game.ritual.order[0]);
  for (let i = 0; i < ritualSeals; i++) gameAction(game, 'a', false, { type: 'ritual:light', candle: wrong });
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'lost');
});

test('penonton dan input aneh ditolak', () => {
  const game = startedGame(['a', 'b']);
  assert.match(gameAction(game, 'x', false, { type: 'ritual:light', candle: 0 }), /peserta/);
  assert.ok(gameAction(game, 'a', false, { type: 'ritual:light', candle: 99 }));
  assert.ok(gameAction(game, 'a', false, { type: 'ritual:light', candle: '1' }));
  gameAction(game, 'a', false, { type: 'ritual:light', candle: game.ritual.order[0] });
  assert.match(gameAction(game, 'a', false, { type: 'ritual:light', candle: game.ritual.order[0] }), /sudah menyala/);
});

test('ronde menunggu tidak membocorkan ritual lama setelah reset', () => {
  const game = startedGame(['a', 'b']);
  gameAction(game, 'dm', true, { type: 'reset' });
  assert.equal(game.phase, 'waiting');
  assert.equal(gameView(game, 'a', false).ritual, undefined);
});
