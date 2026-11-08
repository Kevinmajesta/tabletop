import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statementRules, honestCount, checkWhodunit } from '../dist-server/whodunit.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

const N = 6;
const ev = (s, t, tr) => s.k === 'is' ? t === s.j : s.k === 'false' ? !tr[s.j] : tr[s.j] === tr[s.m];
const masks = Array.from({ length: 1 << N }, (_, m) => Array.from({ length: N }, (_, i) => !!(m >> i & 1)));
const solve = (skip = -1, need = honestCount) => {
  const out = [];
  for (let t = 0; t < N; t++) for (const tr of masks) {
    if (need >= 0 && tr.filter(Boolean).length !== need) continue;
    if (statementRules.every((s, i) => i === skip || ev(s, t, tr) === tr[i])) out.push([t, tr]);
  }
  return out;
};
const act = (g, id, type, data = {}, dm = false) => gameAction(g, id, dm, { type, ...data });

test('exactly one consistent solution; every statement and the "3 honest" rule are required', () => {
  const sols = solve();
  assert.equal(sols.length, 1);
  assert.equal(sols[0][0], 4);
  assert.deepEqual(sols[0][1].map(Number), [1, 1, 1, 0, 0, 0]);
  assert.ok(solve(-1, -1).length > 1);
  for (let i = 0; i < N; i++) assert.ok(solve(i).length > 1, `statement ${i} is redundant`);
});

test('round: draft syncs to others, answer never leaks, wrong counted, right wins, reset clears', () => {
  const g = newGame('w', 'whodunit');
  assert.ok(act(g, 'p', 'start'));
  assert.equal(act(g, 'gm', 'start', {}, true), null);
  assert.ok(act(g, 'p', 'whodunit:draft', { culprit: 9, honest: [] }));
  assert.ok(act(g, 'p', 'whodunit:draft', { culprit: 1, honest: [0, 0] }));
  assert.equal(act(g, 'a', 'whodunit:draft', { culprit: 1, honest: [0, 2] }), null);
  assert.deepEqual(gameView(g, 'b', false).whodunit.draftHonest, [0, 2]);
  assert.equal(act(g, 'b', 'whodunit:submit'), null);
  assert.equal(g.phase, 'open'); assert.equal(g.whodunit.attempts, 1);
  assert.ok(!JSON.stringify(gameView(g, 'b', false)).includes('Elang pencurinya'));
  act(g, 'a', 'whodunit:draft', { culprit: 4, honest: [2, 1, 0] });
  assert.equal(act(g, 'b', 'whodunit:submit'), null);
  assert.equal(g.phase, 'finished'); assert.equal(g.scores.b, 1);
  assert.match(gameView(g, 'a', false).whodunit.reveal, /Elang/);
  assert.ok(act(g, 'b', 'whodunit:submit'));
  assert.equal(act(g, 'gm', 'reset', {}, true), null);
  assert.equal(g.whodunit, undefined);
  assert.ok(act(newGame('x', 'cryptex'), 'p', 'whodunit:draft', { culprit: 1, honest: [] }));
});

test('checkWhodunit rejects malformed input', () => {
  for (const [c, h] of [[4, [0, 1]], [4, 'abc'], [null, [0, 1, 2]], [3, [0, 1, 2]], [4, [3, 4, 5]]]) assert.equal(checkWhodunit(c, h), false);
  assert.equal(checkWhodunit(4, [2, 0, 1]), true);
});

test('jawaban salah tidak membocorkan pencuri atau siapa yang jujur ke pemain mana pun', () => {
  const g = newGame('w', 'whodunit');
  assert.equal(act(g, 'gm', 'start', {}, true), null);
  act(g, 'p', 'whodunit:draft', { culprit: 0, honest: [3, 4, 5] });
  assert.equal(act(g, 'p', 'whodunit:submit'), null);
  assert.equal(g.result, 'wrong');
  for (const [id, dm] of [['p', false], ['q', false]]) {
    const w = gameView(g, id, dm).whodunit;
    assert.equal(w.reveal, undefined);
    assert.ok(!/Elang pencurinya|jujur: Arya/i.test(JSON.stringify(gameView(g, id, dm))));
  }
  assert.equal(g.phase, 'open');
});
