import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score, marksOf, validLock, lockTries } from '../dist-server/lockpick.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

const act = (g, id, type, data = {}, dm = false, rnd) => gameAction(g, id, dm, { type, ...data }, rnd);
const fixed = n => () => n;

test('score counts exact and near per occurrence, including duplicates', () => {
  assert.deepEqual(score([0, 1, 2, 3], [0, 1, 2, 3]), { exact: 4, near: 0 });
  assert.deepEqual(score([0, 1, 2, 3], [3, 2, 1, 0]), { exact: 0, near: 4 });
  assert.deepEqual(score([0, 0, 1, 1], [0, 1, 0, 1]), { exact: 2, near: 2 });
  assert.deepEqual(score([0, 0, 0, 1], [0, 0, 1, 1]), { exact: 3, near: 0 });
  assert.deepEqual(score([0, 1, 2, 3], [4, 4, 4, 4]), { exact: 0, near: 0 });
  assert.deepEqual(score([2, 2, 3, 3], [2, 3, 2, 3]), { exact: 2, near: 2 });
});

test('validLock rejects malformed drafts', () => {
  for (const bad of [null, 'ab', [0, 1, 2, 3, 4], [6], [-1], [1.5], ['1']]) assert.equal(validLock(bad), false, JSON.stringify(bad));
  assert.equal(validLock([]), true);
  assert.equal(validLock([0, 5, 5, 0]), true);
});

test('round: code hidden, draft syncs, feedback correct, out of tries reshuffles, right code wins, reset clears', () => {
  const g = newGame('l', 'lockpick');
  assert.ok(act(g, 'p', 'start'));
  assert.equal(act(g, 'gm', 'start', {}, true, fixed(2)), null); // kode = 2,2,2,2
  assert.ok(!JSON.stringify(gameView(g, 'p', false)).includes('"code"'));
  assert.ok(JSON.stringify(gameView(g, 'gm', true)).includes('"code"'));
  assert.ok(act(g, 'p', 'lock:try'));                       // draft belum lengkap
  assert.ok(act(g, 'p', 'lock:draft', { draft: [9] }));     // simbol tidak valid
  assert.equal(act(g, 'a', 'lock:draft', { draft: [2, 0, 0, 0] }), null);
  assert.deepEqual(gameView(g, 'b', false).lock.draft, [2, 0, 0, 0]);
  assert.equal(act(g, 'b', 'lock:try'), null);
  assert.deepEqual(gameView(g, 'a', false).lock.history[0], { guess: [2, 0, 0, 0], exact: 1, near: 0, marks: ['g', 'x', 'x', 'x'] });
  assert.deepEqual(g.lock.draft, []);
  for (let i = 1; i < lockTries; i++) { act(g, 'a', 'lock:draft', { draft: [0, 0, 0, 0] }); assert.equal(act(g, 'a', 'lock:try', {}, false, fixed(3)), null); }
  assert.equal(g.phase, 'open'); assert.equal(g.result, 'wrong');
  assert.equal(g.lock.history.length, 0); assert.equal(g.lock.attempts, 1);
  assert.deepEqual(g.lock.code, [3, 3, 3, 3]);
  act(g, 'a', 'lock:draft', { draft: [3, 3, 3, 3] });
  assert.equal(act(g, 'b', 'lock:try'), null);
  assert.equal(g.phase, 'finished'); assert.equal(g.scores.b, 1);
  assert.ok(JSON.stringify(gameView(g, 'a', false)).includes('"code"'));
  assert.ok(act(g, 'a', 'lock:draft', { draft: [] }));
  assert.equal(act(g, 'gm', 'reset', {}, true), null);
  assert.equal(g.lock, undefined);
  assert.ok(act(newGame('x', 'cryptex'), 'p', 'lock:draft', { draft: [] }));
});

test('marksOf mengikuti aturan Wordle termasuk simbol ganda, dan konsisten dengan score', () => {
  assert.deepEqual(marksOf([0, 1, 2, 3], [0, 1, 2, 3]), ['g', 'g', 'g', 'g']);
  assert.deepEqual(marksOf([0, 1, 2, 3], [3, 2, 1, 0]), ['y', 'y', 'y', 'y']);
  assert.deepEqual(marksOf([0, 1, 2, 3], [4, 4, 4, 4]), ['x', 'x', 'x', 'x']);
  assert.deepEqual(marksOf([1, 2, 3, 4], [0, 0, 1, 1]), ['x', 'x', 'y', 'x']);   // hanya satu 1 di kode: satu kuning
  assert.deepEqual(marksOf([0, 0, 1, 2], [0, 1, 0, 0]), ['g', 'y', 'y', 'x']);   // dua 0 di kode: hijau + kuning, sisanya abu
  assert.deepEqual(marksOf([2, 2, 3, 3], [2, 3, 2, 3]), ['g', 'y', 'y', 'g']);
  for (let i = 0; i < 500; i++) {
    const r = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 6));
    const c = r(), g = r(), m = marksOf(c, g), s = score(c, g);
    assert.equal(m.filter(x => x === 'g').length, s.exact);
    assert.equal(m.filter(x => x === 'y').length, s.near);
  }
});
