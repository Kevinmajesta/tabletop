import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, gameAction, gameView, declareGame, closeMemoryMismatch } from '../dist-server/minigames.js';
const act = (game, id, type, data = {}, dm = false, randomInt) => gameAction(game, id, dm, { type, ...data }, randomInt);
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
test('quick math lets GM play without being declared and runs ten questions', () => {
  const game = newGame('t', 'quickmath'); declareGame(game, ['a']);
  assert.equal(gameAction(game, 'gm', true, { type: 'start' }, () => 0), null);
  for (const answer of ['2', null, 2.5, NaN, Infinity]) assert.ok(act(game, 'a', 'answer', { round: 1, answer }));
  assert.ok(act(game, 'a', 'answer', { round: 0, question: 0, answer: 2 }));
  assert.ok(act(game, 'a', 'answer', { round: 1, question: 0, answer: 3 }));
  assert.ok(act(game, 'a', 'answer', { round: 1, question: 1, answer: 2 }));
  for (let question = 1; question <= 10; question++) {
    const player = question % 2 ? 'gm' : 'a';
    assert.equal(act(game, player, 'answer', { round: 1, question: question - 1, answer: 2 }, player === 'gm', () => 0), null);
    assert.equal(game.turn, question);
    assert.equal(game.phase, question === 10 ? 'finished' : 'open');
  }
  assert.equal(game.scores.gm, 5); assert.equal(game.scores.a, 5);
  assert.equal(gameView(game, 'a', false).answer, 2);
  assert.ok(act(game, 'a', 'answer', { round: 10, answer: 2 }));
});
test('memory keeps a wrong pair visible for one second and blocks more flips', () => {
  const game = newGame('t', 'memory'); declareGame(game, ['a', 'b']);
  assert.equal(gameAction(game, 'gm', true, { type: 'start' }, max => max - 1), null);
  assert.equal(game.memoryBoard.length, 16);
  assert.equal(gameView(game, 'a', false).memoryBoard.filter(Boolean).length, 0);

  assert.equal(act(game, 'a', 'flip', { index: 0 }), null);
  assert.equal(game.turn, 0); assert.deepEqual(game.memoryOpen, [0]);
  assert.equal(gameView(game, 'a', false).memoryBoard[0], game.memoryBoard[0]);
  assert.equal(gameView(game, 'b', false).memoryBoard.filter(Boolean).length, 0);

  const wrong = game.memoryBoard.findIndex(card => card !== game.memoryBoard[0]);
  assert.equal(act(game, 'a', 'flip', { index: wrong }), null);
  assert.equal(game.turn, 0); assert.deepEqual(game.memoryOpen, [0, wrong]);
  assert.equal(gameView(game, 'a', false).memoryBoard.filter(Boolean).length, 2);
  assert.equal(gameView(game, 'b', false).memoryBoard.filter(Boolean).length, 0);
  assert.equal(gameView(game, 'spectator', false).memoryBoard.filter(Boolean).length, 2);
  assert.equal(act(game, 'b', 'flip', { index: 1 }), 'Tunggu kartu tertutup kembali.');
  assert.equal(closeMemoryMismatch(game, game.memoryCloseAt - 1), false);
  assert.deepEqual(game.memoryOpen, [0, wrong]); assert.equal(game.turn, 0);
  assert.equal(closeMemoryMismatch(game, game.memoryCloseAt), true);
  assert.deepEqual(game.memoryOpen, []); assert.equal(game.memoryCloseAt, undefined); assert.equal(game.turn, 1);

  assert.equal(act(game, 'b', 'flip', { index: 0 }), null);
  const pair = game.memoryBoard.indexOf(game.memoryBoard[0], 1);
  assert.equal(act(game, 'b', 'flip', { index: pair }), null);
  assert.equal(game.scores.b, 1); assert.deepEqual(game.memoryOpen, []);
  assert.equal(game.board[0], 'b'); assert.equal(game.board[pair], 'b');
});
test('defuse bomb gives the expert rules while only the operator can input', () => {
  const game = newGame('bombdefuse', 'bombdefuse');
  assert.equal(declareGame(game, ['expert', 'operator']), null);
  assert.equal(act(game, 'gm', 'start', {}, true, () => 0), null);
  const expertView = gameView(game, 'expert', false);
  const operatorView = gameView(game, 'operator', false);
  const dmWires = gameView(game, 'gm', true).bombModules?.find(module => module.id === 'wires');
  const operatorWires = operatorView.bombModules?.find(module => module.id === 'wires');
  assert.equal(expertView.bombModules, undefined);
  assert.equal(operatorWires?.clue, '🐦 · INDIKATOR GELAP');
  assert.deepEqual(dmWires?.solution, ['red', 'blue', 'yellow']);
  assert.equal(operatorWires?.solution, undefined);
  assert.ok(act(game, 'expert', 'bomb:input', { module: 'wires', value: 'red' }));
  assert.equal(act(game, 'operator', 'bomb:input', { module: 'wires', value: 'red' }), null);
  assert.equal(act(game, 'operator', 'bomb:input', { module: 'wires', value: 'blue' }), null);
  assert.equal(act(game, 'operator', 'bomb:input', { module: 'wires', value: 'yellow' }), null);
  assert.equal(game.phase, 'open');
});

test('defuse bomb requires every expert-directed module', () => {
  const game = newGame('bombmodules', 'bombdefuse');
  declareGame(game, ['expert', 'operator']);
  assert.equal(act(game, 'gm', 'start', {}, true, () => 0), null);
  const expertView = gameView(game, 'expert', false);
  const operatorView = gameView(game, 'operator', false);
  const dmView = gameView(game, 'gm', true);
  assert.deepEqual(game.bombModules?.map(module => module.id), ['wires', 'button', 'keypad', 'dial']);
  assert.equal(expertView.bombModules, undefined);
  assert.deepEqual(dmView.bombModules?.find(module => module.id === 'dial')?.solution, ['4', '1', '3', '2']);
  assert.equal(operatorView.bombModules?.find(module => module.id === 'dial')?.solution, undefined);
  assert.ok(operatorView.bombModules?.every(module => !('solution' in module)));
  assert.deepEqual(dmView.bombModules?.find(module => module.id === 'keypad')?.solution, ['☾', '★', '☂', '♜']);
  assert.ok(act(game, 'expert', 'bomb:input', { module: 'button', value: 'yellow' }));
  for (const value of ['red', 'blue', 'yellow']) assert.equal(act(game, 'operator', 'bomb:input', { module: 'wires', value }), null);
  assert.equal(act(game, 'operator', 'bomb:input', { module: 'button', value: 'yellow' }), null);
  for (const value of ['☾', '★', '☂', '♜']) assert.equal(act(game, 'operator', 'bomb:input', { module: 'keypad', value }), null);
  assert.equal(game.phase, 'open');
  for (const value of ['4', '1', '3', '2']) assert.equal(act(game, 'operator', 'bomb:input', { module: 'dial', value }), null);
  assert.equal(game.result, 'defused');
});

test('guess drawing runs three rounds and hides selected word from guesser', () => {
  const game = newGame('drawing', 'drawing');
  declareGame(game, ['drawer', 'guesser']);
  assert.equal(act(game, 'gm', 'start', {}, true), null);
  assert.deepEqual(gameView(game, 'drawer', false).drawingChoices, ['KUCING', 'GAJAH', 'KELINCI']);
  assert.equal(gameView(game, 'guesser', false).drawingChoices, undefined);
  assert.equal(act(game, 'drawer', 'drawing:choose', { word: 'KUCING' }), null);
  assert.equal(gameView(game, 'guesser', false).drawingWord, undefined);
  assert.equal(act(game, 'drawer', 'drawing:stroke', { points: [[0.1, 0.2], [0.8, 0.7]] }), null);
  assert.equal(gameView(game, 'guesser', false).drawingStrokes.length, 1);
  assert.ok(act(game, 'drawer', 'drawing:guess', { answer: 'KUCING' }));
  assert.ok(act(game, 'guesser', 'drawing:guess', { answer: 'salah' }));
  assert.equal(act(game, 'guesser', 'drawing:guess', { answer: 'kucing' }), null);
  assert.equal(game.drawingRound, 1);
  for (const answer of ['NASI', 'APEL']) {
    assert.equal(act(game, 'drawer', 'drawing:choose', { word: answer }), null);
    assert.equal(act(game, 'guesser', 'drawing:guess', { answer }), null);
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.scores.guesser, 3);
});

test('Indonesian crossword needs no assignment and validates shared answers on server', () => {
  const game = newGame('crossword', 'crossword');
  assert.equal(act(game, 'gm', 'start', {}, true), null);
  assert.equal(game.crosswordEntries.length, 4);
  assert.ok(game.crosswordEntries.every(entry => entry.clue && entry.cells.length === entry.answer.length));
  assert.ok(gameView(game, 'a', false).crosswordEntries.every(entry => !('answer' in entry)));
  assert.ok(act(game, 'a', 'crossword:answer', { id: '1M', answer: 'salah' }));
  for (const entry of game.crosswordEntries) assert.equal(act(game, 'a', 'crossword:answer', { id: entry.id, answer: entry.answer }), null);
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'a');
  assert.equal(game.scores.a, 1);
});

test('seating puzzle needs no assignment, hides solution, and accepts one shared nine-seat arrangement', () => {
  const game = newGame('chairs', 'seating');
  assert.equal(act(game, 'gm', 'start', {}, true, max => max - 1), null);
  assert.equal(game.seatingNames.length, 9);
  assert.equal(game.seatingSeats.length, 9);
  assert.ok(game.seatingClues.length >= 9);
  assert.equal(gameView(game, 'a', false).seatingSolution, undefined);
  const solution = [...game.seatingSolution];
  assert.equal(act(game, 'a', 'seating:place', { seat: 0, name: solution[0] }), null);
  assert.ok(act(game, 'b', 'seating:place', { seat: 1, name: solution[0] }));
  for (let seat = 1; seat < 9; seat++) assert.equal(act(game, seat % 2 ? 'b' : 'a', 'seating:place', { seat, name: solution[seat] }), null);
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'a');
  assert.equal(game.scores.a, 1);
});

test('relic cipher advances through three server-validated layers without leaking answers', () => {
  const game = newGame('cipher', 'reliccipher');
  declareGame(game, ['a', 'b']);
  assert.equal(act(game, 'gm', 'start', {}, true, () => 0), null);
  assert.equal(game.phase, 'open');
  assert.equal(game.cipherStage, 0);
  const view = gameView(game, 'a', false);
  assert.equal(view.cipherLayers?.length, 1);
  assert.equal(Object.hasOwn(view.cipherLayers?.[0] || {}, 'answer'), false);
  assert.ok(act(game, 'a', 'cipher:answer', { answer: 'salah' }));
  for (const answer of game.cipherLayers.map(layer => layer.answer)) {
    assert.equal(act(game, 'a', 'cipher:answer', { answer }), null);
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'a');
  assert.equal(game.scores.a, 1);
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
  act(game, 'gm', 'reset', {}, true); assert.deepEqual(game.board, Array(9).fill('')); assert.deepEqual(game.moveHistory, []);
});
test('tic tac toe removes oldest mark after six active marks and cannot draw', () => {
  const game = newGame('t', 'tictactoe'); act(game, 'a', 'join'); act(game, 'b', 'join'); act(game, 'gm', 'start', {}, true);
  [0,1,2,4,3,5,7].forEach((cell, i) => assert.equal(act(game, i % 2 ? 'b' : 'a', 'cell', { cell }), null));
  assert.equal(game.board[0], '');
  assert.deepEqual(game.moveHistory, [1,2,4,3,5,7]);
  assert.equal(game.phase, 'open'); assert.equal(game.result, ''); assert.equal(game.turn, 1);
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
