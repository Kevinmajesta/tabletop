import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, gameAction, gameView, declareGame } from '../dist-server/minigames.js';
const act = (game, id, type, data = {}, dm = false) => gameAction(game, id, dm, { type, ...data });
test('quick math generates each operation on server and hides answer even from GM', () => {
  for (const [operation, question, answer] of [[0, '3 + 8', 11], [1, '8 − 3', 5], [2, '3 × 8', 24]]) {
    const game = newGame('t', 'quickmath');
    assert.equal(declareGame(game, ['a', 'b', 'c']), null);
    const values = [operation, 2, 7];
    assert.equal(gameAction(game, 'gm', true, { type: 'start', question: 'client override', answer: 999 }, max => {
      const value = values.shift(); assert.ok(value < max); return value;
    }), null);
    assert.equal(game.question, question); assert.equal(game.answer, answer);
    assert.equal(Object.hasOwn(gameView(game, 'a', false), 'answer'), false);
    assert.equal(Object.hasOwn(gameView(game, 'gm', true), 'answer'), false);
  }
});
test('quick math rejects spectators, stale and malformed answers; first correct answer scores once', () => {
  const game = newGame('t', 'quickmath'); declareGame(game, ['a', 'b']);
  assert.ok(act(game, 'a', 'start'));
  assert.equal(gameAction(game, 'gm', true, { type: 'start' }, () => 0), null);
  for (const answer of ['2', null, 2.5, NaN, Infinity]) assert.ok(act(game, 'a', 'answer', { round: 1, answer }));
  assert.ok(act(game, 'gm', 'answer', { round: 1, answer: 2 }));
  assert.ok(act(game, 'a', 'answer', { round: 0, answer: 2 }));
  assert.ok(act(game, 'a', 'answer', { round: 1, answer: 3 }));
  assert.equal(game.phase, 'open'); assert.equal(game.scores.a, 0);
  assert.equal(act(game, 'a', 'answer', { round: 1, answer: 2 }), null);
  assert.ok(act(game, 'b', 'answer', { round: 1, answer: 2 }));
  assert.equal(game.result, 'a'); assert.equal(game.scores.a, 1); assert.equal(game.scores.b, 0);
  assert.equal(gameView(game, 'b', false).answer, 2);
  assert.ok(act(game, 'b', 'reset')); assert.equal(act(game, 'gm', 'reset', {}, true), null);
  assert.equal(game.question, undefined); assert.equal(game.answer, undefined);
  gameAction(game, 'gm', true, { type: 'start' }, () => 0);
  assert.ok(act(game, 'a', 'answer', { round: 1, answer: 2 }));
  assert.equal(act(game, 'b', 'answer', { round: 2, answer: 2 }), null);
  assert.equal(game.scores.a, 1); assert.equal(game.scores.b, 1);
});
test('memory match pairs hidden cards, limits to two open, requires turn', () => {
  const game = newGame('t', 'memory'); declareGame(game, ['a', 'b']);
  assert.equal(gameAction(game, 'gm', true, { type: 'start' }, max => max - 1), null);
  assert.equal(game.memoryBoard.length, 16);
  assert.equal(gameView(game, 'a', false).memoryBoard.filter(Boolean).length, 0);
  assert.equal(gameView(game, 'gm', true).memoryBoard.filter(Boolean).length, 0);
  assert.ok(act(game, 'a', 'flip', { index: 0 }));
  assert.equal(game.turn, 0); assert.deepEqual(game.memoryOpen, [0]);
  assert.equal(gameView(game, 'a', false).memoryBoard[0], game.memoryBoard[0]);
  assert.equal(gameView(game, 'b', false).memoryBoard.filter(Boolean).length, 0);
  assert.equal(gameView(game, 'gm', true).memoryBoard.filter(Boolean).length, 0);
  assert.equal(act(game, 'a', 'flip', { index: 0 }), null);
  assert.equal(act(game, 'b', 'flip', { index: 1 }), null);
  const pair = game.memoryBoard.indexOf(game.memoryBoard[0], 1);
  assert.ok(act(game, 'a', 'flip', { index: pair }));
  assert.equal(game.scores.a, 1); assert.deepEqual(game.memoryOpen, []);
  assert.equal(game.board[0], 'a'); assert.equal(game.board[pair], 'a');
  assert.equal(gameView(game, 'b', false).memoryBoard[0], game.memoryBoard[0]);
  assert.ok(act(game, 'a', 'flip', { index: pair === 1 ? 2 : 1 }));
  const wrong = game.memoryBoard.findIndex((c, i) => c !== game.memoryBoard[pair === 1 ? 2 : 1] && !game.board[i] && i !== (pair === 1 ? 2 : 1));
  assert.ok(act(game, 'a', 'flip', { index: wrong }));
  assert.equal(game.turn, 1); assert.deepEqual(game.memoryOpen, [wrong]);
  assert.equal(gameView(game, 'b', false).memoryBoard[wrong], game.memoryBoard[wrong]);
});
test('Connect Four validates turn and gravity, wins vertically and horizontally, resets', () => {
  for (const sequence of [[0,1,0,1,0,1,0], [0,6,1,6,2,6,3]]) {
    const game = newGame('t', 'connectfour'); declareGame(game, ['a', 'gm']); act(game, 'gm', 'start', {}, true);
    assert.ok(act(game, 'gm', 'drop', { column: 0 })); assert.ok(act(game, 'a', 'drop', { column: 7 }));
    sequence.forEach((column, i) => assert.equal(act(game, i % 2 ? 'gm' : 'a', 'drop', { column }), null));
    assert.equal(game.result, 'a'); assert.equal(game.scores.a, 1); assert.ok(act(game, 'gm', 'drop', { column: 2 }));
    act(game, 'gm', 'reset', {}, true); assert.deepEqual(game.board, Array(42).fill(''));
  }
});
test('Connect Four rejects full column and detects both diagonal directions', () => {
  const game = newGame('t', 'connectfour'); declareGame(game, ['a', 'b']); act(game, 'gm', 'start', {}, true);
  for (let i = 0; i < 6; i++) assert.equal(act(game, i % 2 ? 'b' : 'a', 'drop', { column: 0 }), null);
  assert.ok(act(game, 'a', 'drop', { column: 0 })); assert.equal(game.turn, 0);
  for (const mirrored of [false, true]) {
    act(game, 'gm', 'reset', {}, true); act(game, 'gm', 'start', {}, true);
    const col = c => mirrored ? 6 - c : c;
    game.board[5 * 7 + col(0)] = 'X'; game.board[4 * 7 + col(1)] = 'X'; game.board[3 * 7 + col(2)] = 'X';
    for (let row = 3; row <= 5; row++) game.board[row * 7 + col(3)] = row % 2 ? 'O' : 'X';
    assert.equal(act(game, 'a', 'drop', { column: col(3) }), null); assert.equal(game.result, 'a');
  }
});
test('declaration selects exactly two duel participants and locks admission', () => {
  const game = newGame('t', 'rps');
  assert.ok(declareGame(game, ['a'])); assert.ok(declareGame(game, ['a', 'a']));
  assert.equal(declareGame(game, ['a', 'b']), null);
  assert.equal(game.declaration, 1); assert.ok(act(game, 'c', 'join'));
  act(game, 'gm', 'start', {}, true); assert.ok(declareGame(game, ['b', 'c']));
});
test('tic tac toe enforces turns, rejects occupied cells and resolves victory once', () => {
  const game = newGame('t', 'tictactoe'); act(game, 'a', 'join'); act(game, 'b', 'join');
  assert.ok(act(game, 'c', 'join')); act(game, 'gm', 'start', {}, true);
  assert.ok(act(game, 'b', 'cell', { cell: 0 })); assert.ok(act(game, 'a', 'cell', { cell: 9 }));
  act(game, 'a', 'cell', { cell: 0 }); assert.ok(act(game, 'b', 'cell', { cell: 0 }));
  act(game, 'b', 'cell', { cell: 3 }); act(game, 'a', 'cell', { cell: 1 }); act(game, 'b', 'cell', { cell: 4 }); act(game, 'a', 'cell', { cell: 2 });
  assert.equal(game.result, 'a'); assert.equal(game.scores.a, 1); assert.ok(act(game, 'b', 'cell', { cell: 5 }));
  act(game, 'gm', 'reset', {}, true); assert.deepEqual(game.board, Array(9).fill(''));
});
test('tic tac toe full board without winner ends in draw', () => {
  const game = newGame('t', 'tictactoe'); act(game, 'a', 'join'); act(game, 'b', 'join'); act(game, 'gm', 'start', {}, true);
  [0,1,2,4,3,5,7,6,8].forEach((cell, i) => assert.equal(act(game, i % 2 ? 'b' : 'a', 'cell', { cell }), null));
  assert.equal(game.result, 'Seri.'); assert.equal(game.phase, 'finished'); assert.equal(game.scores.a, 0);
});
test('RPS hides choices, rejects spectators and duplicate choices, resolves once', () => {
  const game = newGame('t', 'rps');
  assert.equal(act(game, 'a', 'join'), null); act(game, 'b', 'join');
  assert.ok(act(game, 'c', 'join'));
  assert.ok(act(game, 'a', 'start')); assert.equal(act(game, 'gm', 'start', {}, true), null);
  assert.ok(act(game, 'c', 'choose', { choice: 'rock' }));
  act(game, 'a', 'choose', { choice: 'rock' });
  assert.equal(gameView(game, 'b', true).choices.a, 'locked');
  assert.ok(act(game, 'a', 'choose', { choice: 'paper' }));
  act(game, 'b', 'choose', { choice: 'scissors' });
  assert.equal(game.result, 'a'); assert.equal(game.scores.a, 1);
  assert.ok(act(game, 'b', 'choose', { choice: 'paper' }));
});
