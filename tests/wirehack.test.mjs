import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePanel, voltage, wireStages, wireLives } from '../dist-server/wirehack.js';
import { newGame, gameAction, gameView, declareGame } from '../dist-server/minigames.js';

function seeded(seed) {
  let s = seed >>> 0;
  return max => { s = (s * 1664525 + 1013904223) >>> 0; return s % max; };
}
function started(seed = 5) {
  const game = newGame('t1', 'wirehack');
  assert.equal(declareGame(game, ['h']), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, seeded(seed)), null);
  return game;
}
const act = (game, id, type, data = {}) => gameAction(game, id, false, { type, ...data }, seeded(2));
const W = game => game.wirehack;
function wire(game, links) { links.forEach((to, from) => assert.equal(act(game, 'h', 'wire:link', { from, to }), null)); }

test('mode solo: tepat satu peretas, duel tetap dua', () => {
  const solo = newGame('s', 'wirehack');
  assert.match(declareGame(solo, ['a', 'b']), /satu pemain/);
  assert.equal(declareGame(solo, ['a']), null);
  const duel = newGame('d', 'tictactoe');
  assert.match(declareGame(duel, ['a']), /dua pemain/);
});

test('setiap panel punya tepat satu cara sambung yang benar', () => {
  for (let stage = 0; stage < wireStages.length; stage++) {
    for (let seed = 1; seed <= 60; seed++) {
      const { panel, solution } = makePanel(stage, seeded(seed * 31 + stage));
      assert.equal(panel.values.length, wireStages[stage].mults.length);
      assert.equal(voltage(panel, solution), panel.target);
      assert.deepEqual([...panel.mults].sort((a, b) => a - b), [...wireStages[stage].mults].sort((a, b) => a - b));
    }
  }
});

test('pemain hanya melihat jawaban setelah selesai, GM selalu melihat', () => {
  const game = started();
  assert.equal(gameView(game, 'h', false).wirehack.solution, undefined);
  assert.equal(gameView(game, 'x', false).wirehack.solution, undefined);
  assert.ok(gameView(game, 'dm', true).wirehack.solution);
});

test('menyambung kabel: satu pengali hanya satu kabel, hanya peretas yang boleh', () => {
  const game = started();
  wire(game, [0, 1]);
  assert.equal(act(game, 'h', 'wire:link', { from: 2, to: 0 }), null);
  assert.deepEqual(W(game).links, [null, 1, 0], 'kabel lama di pengali 0 dilepas');
  assert.match(act(game, 'x', 'wire:link', { from: 0, to: 2 }), /peretas/);
  assert.match(act(game, 'h', 'wire:submit'), /semua kabel/);
});

test('jawaban benar membuka panel berikutnya sampai menang', () => {
  const game = started();
  for (let stage = 0; stage < wireStages.length; stage++) {
    assert.equal(W(game).stage, stage);
    wire(game, W(game).solution);
    assert.equal(act(game, 'h', 'wire:submit'), null);
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'win');
  assert.equal(game.scores.h, 1);
});

test('salah kirim memicu alarm, tiga alarm menggagalkan peretasan', () => {
  const game = started();
  for (let k = 1; k <= wireLives; k++) {
    const right = W(game).solution;
    const wrong = [...right.slice(1), right[0]];
    wire(game, wrong);
    act(game, 'h', 'wire:submit');
    if (k < wireLives) {
      assert.equal(W(game).lives, wireLives - k);
      assert.equal(game.result, 'wrong');
      assert.equal(W(game).last.ok, false);
      assert.deepEqual(W(game).links.every(l => l === null), true, 'panel baru setelah alarm');
    }
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'lost');
});

test('waktu habis memicu alarm, laporan terlalu cepat diabaikan', () => {
  const game = started();
  assert.equal(act(game, 'h', 'wire:timeout'), null);
  assert.equal(W(game).lives, wireLives, 'belum habis');
  W(game).deadline = Date.now() - 1000;
  assert.equal(act(game, 'h', 'wire:timeout'), null);
  assert.equal(W(game).lives, wireLives - 1);
  assert.equal(W(game).last.reason, 'timeout');
});
