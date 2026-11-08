import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';
import { newScale, weigh } from '../dist-server/relic-scale.js';

const act = (g, id, type, data = {}, dm = false, rnd) => gameAction(g, id, dm, { type, ...data }, rnd);
const fixed = n => () => n;

test('the 3-3 / 1-1 strategy finds the fake relic in 2 weighings for every possible fake', () => {
  for (let fake = 0; fake < 9; fake++) {
    const s = newScale(fixed(fake));
    assert.equal(weigh(s, [0, 1, 2], [3, 4, 5]), null);
    const r1 = s.history[0].result;
    const group = r1 === 'left-light' ? [0, 1, 2] : r1 === 'right-light' ? [3, 4, 5] : [6, 7, 8];
    assert.equal(weigh(s, [group[0]], [group[1]]), null);
    const r2 = s.history[1].result;
    const found = r2 === 'left-light' ? group[0] : r2 === 'right-light' ? group[1] : group[2];
    assert.equal(found, fake);
    assert.equal(s.left, 0);
  }
});

test('a 4-4 first weighing cannot always be solved in 2 weighings (pigeonhole: 9 cases, 3 outcomes each)', () => {
  // After 4v4, a balanced result leaves 1 candidate (fine) but an unbalanced one leaves 4, which 1 weighing can't split (needs <=3).
  const s = newScale(fixed(0));
  weigh(s, [0, 1, 2, 3], [4, 5, 6, 7]);
  assert.equal(s.history[0].result, 'left-light');
});

test('weighing validates input and the 2-weigh limit', () => {
  const s = newScale(fixed(4));
  for (const [l, r] of [[[], [1]], [[0], []], [[0, 1], [2]], [[0], [0]], [[0, 1], [1, 2]], [[9], [1]], [[-1], [1]], [[1.5], [2]], ['a', [1]], [null, [1]], [[0], 'b']]) assert.ok(weigh(s, l, r), JSON.stringify([l, r]));
  assert.equal(s.history.length, 0);
  assert.equal(s.left, 2);
  assert.equal(weigh(s, [0], [1]), null);
  assert.equal(weigh(s, [2], [3]), null);
  assert.match(weigh(s, [5], [6]), /habis/);
  assert.equal(s.history.length, 2);
});

test('relic scale round: secret stays on the server, wrong pick re-randomizes, right pick wins once', () => {
  const g = newGame('t', 'relicscale');
  assert.ok(act(g, 'p', 'start'));
  assert.equal(act(g, 'gm', 'start', {}, true, fixed(3)), null);
  assert.equal(g.scale.fake, 3);
  const playerView = JSON.stringify(gameView(g, 'p', false));
  assert.ok(!playerView.includes('fake'));
  assert.ok(JSON.stringify(gameView(g, 'gm', true)).includes('fake'));
  assert.equal(act(g, 'p', 'scale:weigh', { left: [3], right: [4] }), null);
  assert.equal(gameView(g, 'q', false).scale.history[0].result, 'left-light');
  assert.ok(act(g, 'p', 'scale:pick', { relic: 9 }));
  assert.ok(act(g, 'p', 'scale:pick', { relic: 1.5 }));
  assert.ok(act(g, 'p', 'scale:pick', { relic: '3' }));
  // A wrong guess must NOT be an error: errors skip save/broadcast and the reset would never reach clients.
  assert.equal(act(g, 'p', 'scale:pick', { relic: 0 }, false, fixed(7)), null);
  assert.equal(g.result, 'wrong');
  assert.equal(g.phase, 'open');
  assert.equal(act(g, 'p', 'scale:weigh', { left: [0], right: [1] }), null);
  assert.equal(g.result, '');
  assert.equal(g.scale.fake, 7);
  assert.equal(g.scale.left, 1);
  assert.equal(g.scale.history.length, 1);
  assert.equal(g.scale.attempts, 1);
  assert.equal(act(g, 'p', 'scale:pick', { relic: 7 }), null);
  assert.equal(g.phase, 'finished');
  assert.ok(JSON.stringify(gameView(g, 'p', false)).includes('"fake":7'));
  assert.ok(act(g, 'p', 'scale:pick', { relic: 7 }));
  assert.ok(act(g, 'p', 'scale:weigh', { left: [0], right: [1] }));
  assert.equal(act(g, 'gm', 'reset', {}, true), null);
  assert.equal(g.scale, undefined);
  assert.equal(act(g, 'gm', 'start', {}, true, fixed(1)), null);
  assert.equal(g.scale.fake, 1);
});

test('relic scale rejects actions before the round is open and from other kinds', () => {
  const g = newGame('t', 'relicscale');
  assert.ok(act(g, 'p', 'scale:weigh', { left: [0], right: [1] }));
  assert.ok(act(g, 'p', 'scale:pick', { relic: 0 }));
  const other = newGame('o', 'wallclock');
  act(other, 'gm', 'start', {}, true, fixed(0));
  assert.ok(act(other, 'p', 'scale:weigh', { left: [0], right: [1] }));
});
