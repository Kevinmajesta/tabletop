import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quizBank, quizLength, quizPass, defaultQuizReward } from '../dist-server/quiz.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

let seed = 7;
const rand = max => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % max; };

function started(players = ['a', 'b']) {
  const game = newGame('q1', 'quiz');
  game.players = [...players];
  for (const id of players) game.scores[id] = 0;
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, rand), null);
  return game;
}
const correct = game => gameView(game, 'dm', true).quiz.asked[game.quiz.current].correct;

test('bank soal rapi: 4 pilihan unik, tidak ada soal ganda, cukup untuk 10', () => {
  assert.ok(quizBank.length >= quizLength * 3);
  assert.equal(new Set(quizBank.map(q => q.q)).size, quizBank.length);
  for (const q of quizBank) { assert.equal(q.options.length, 4); assert.equal(new Set(q.options).size, 4, q.q); }
});

test('ronde butuh tepat dua pemain dan memilih 10 soal berbeda', () => {
  const solo = newGame('q0', 'quiz'); solo.players = ['a'];
  assert.match(gameAction(solo, 'dm', true, { type: 'start' }, rand), /belum cukup|dua pemain/);
  const crowd = newGame('q2', 'quiz'); crowd.players = ['a', 'b', 'c'];
  assert.match(gameAction(crowd, 'dm', true, { type: 'start' }, rand), /dua pemain/);
  const game = started();
  assert.equal(game.quiz.questions.length, quizLength);
  assert.equal(new Set(game.quiz.questions).size, quizLength);
  for (const order of game.quiz.orders) assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
});

test('pemain hanya melihat soal yang sedang ditanyakan dan tanpa kunci', () => {
  const game = started();
  const view = gameView(game, 'a', false).quiz;
  assert.equal(view.asked.length, 1);
  assert.equal(view.asked[0].correct, null);
  assert.equal(view.reward, '');
  assert.ok(!JSON.stringify(gameView(game, 'a', false)).includes('"orders"'));
  assert.equal(typeof gameView(game, 'dm', true).quiz.asked[0].correct, 'number');
});

test('tanda dibagi ke rekan, lalu jawaban dikunci; penonton tidak bisa menjawab', () => {
  const game = started();
  assert.match(gameAction(game, 'c', false, { type: 'quiz:mark', choice: 1 }), /dua peserta/);
  assert.match(gameAction(game, 'a', false, { type: 'quiz:next' }), /Jawab dulu/);
  assert.equal(gameAction(game, 'a', false, { type: 'quiz:mark', choice: 2 }), null);
  assert.deepEqual(gameView(game, 'b', false).quiz.mark, { choice: 2, by: 'a' });
  assert.match(gameAction(game, 'a', false, { type: 'quiz:answer', choice: 9 }), /tidak dikenal/);
  const right = correct(game);
  assert.equal(gameAction(game, 'b', false, { type: 'quiz:answer', choice: right }), null);
  assert.match(gameAction(game, 'a', false, { type: 'quiz:answer', choice: 0 }), /sudah dijawab/);
  const view = gameView(game, 'a', false).quiz;
  assert.equal(view.asked[0].correct, right);
  assert.equal(view.asked[0].by, 'b');
  assert.equal(view.score, 1);
  assert.deepEqual(game.scores, { a: 1, b: 1 }, 'satu tim, poin sama');
  assert.match(gameAction(game, 'c', false, { type: 'quiz:next' }), /tim/);
  assert.equal(gameAction(game, 'a', false, { type: 'quiz:next' }), null);
  assert.equal(gameView(game, 'a', false).quiz.asked.length, 2);
  assert.equal(game.quiz.mark, null);
});

function playThrough(rightCount) {
  const game = started();
  for (let i = 0; i < quizLength; i++) {
    const right = correct(game);
    assert.equal(gameAction(game, 'a', false, { type: 'quiz:answer', choice: i < rightCount ? right : (right + 1) % 4 }), null);
    assert.equal(gameAction(game, i % 2 ? 'a' : 'dm', i % 2 === 0, { type: 'quiz:next' }), null);
  }
  return game;
}

test('7 benar = lulus dan hadiah terlihat; 6 benar = gagal', () => {
  const win = playThrough(quizPass);
  assert.equal(win.phase, 'finished');
  assert.equal(win.result, 'won');
  const view = gameView(win, 'b', false).quiz;
  assert.equal(view.score, quizPass);
  assert.equal(view.asked.length, quizLength);
  assert.ok(view.asked.every(a => typeof a.correct === 'number'));
  assert.equal(view.reward, defaultQuizReward);
  const lose = playThrough(quizPass - 1);
  assert.equal(lose.result, 'lost');
  assert.equal(gameView(lose, 'b', false).quiz.reward, '');
  assert.match(gameAction(lose, 'a', false, { type: 'quiz:next' }), /belum dibuka/);
});

test('GM menulis hadiah dan hadiah bertahan saat ronde diulang dengan soal baru', () => {
  const game = started();
  assert.match(gameAction(game, 'a', false, { type: 'quiz:reward', text: 'x' }), /GM/);
  assert.equal(gameAction(game, 'dm', true, { type: 'quiz:reward', text: 'Kunci ada di sumur.' }), null);
  const before = game.quiz.questions.join();
  assert.equal(gameAction(game, 'dm', true, { type: 'reset' }), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, rand), null);
  assert.equal(game.quiz.reward, 'Kunci ada di sumur.');
  assert.notEqual(game.quiz.questions.join(), before);
});
