import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shiftLevels, shiftLevers, reachable, shiftLine } from '../dist-server/shift.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

// BFS independen: (denah, posisi party, posisi harta). Berjalan gratis di dalam lorong yang tersambung, menggeser = 1 langkah.
function solve(level, maxDepth = 6) {
  const key = s => s.tiles.join(',') + '|' + s.pos + '|' + s.goal;
  let frontier = [{ tiles: level.tiles, pos: level.start, goal: level.goal, path: [] }];
  const seen = new Set([key(frontier[0])]);
  for (let d = 0; d <= maxDepth; d++) {
    const next = [];
    for (const s of frontier) {
      const region = reachable(s.tiles, s.pos);
      if (region.has(s.goal)) return { depth: d, path: s.path };
      for (const p of region) for (const line of shiftLevers) for (const dir of [1, -1]) {
        const m = shiftLine(s.tiles, line, dir, [p, s.goal]);
        const n = { tiles: m.tiles, pos: m.carry[0], goal: m.carry[1], path: [...s.path, { walk: p, line, dir }] };
        if (!seen.has(key(n))) { seen.add(key(n)); next.push(n); }
      }
    }
    frontier = next;
  }
  return null;
}

test('setiap ruangan bisa diselesaikan, dan jatah lilin sama dengan geseran minimum', () => {
  for (const lv of shiftLevels) {
    assert.equal(lv.tiles.length, 25);
    assert.ok(!reachable(lv.tiles, lv.start).has(lv.goal), `${lv.name} tidak boleh langsung terbuka`);
    const res = solve(lv);
    assert.ok(res, `${lv.name} harus bisa diselesaikan`);
    assert.equal(res.depth, lv.budget, `${lv.name}: minimum ${res.depth}, jatah ${lv.budget}`);
  }
});

test('geser melingkar membawa party dan harta, lalu kembali ke semula setelah 5 geseran', () => {
  const lv = shiftLevels[0];
  let s = { tiles: lv.tiles, carry: [5, 6] };
  s = shiftLine(s.tiles, { axis: 'r', k: 1 }, 1, s.carry);
  assert.deepEqual(s.carry, [6, 7]);
  assert.equal(s.tiles[6], lv.tiles[5]);
  for (let i = 0; i < 4; i++) s = shiftLine(s.tiles, { axis: 'r', k: 1 }, 1, s.carry);
  assert.deepEqual(s.tiles, lv.tiles);
  assert.deepEqual(s.carry, [5, 6]);
});

const act = (game, id, type, data = {}) => gameAction(game, id, false, { type, ...data });
function play(game, id, path) {
  for (const step of path) {
    if (game.shift.pos !== step.walk) assert.equal(act(game, id, 'shift:walk', { to: step.walk }), null);
    assert.equal(act(game, id, 'shift:pull', { axis: step.line.axis, k: step.line.k, dir: step.dir }), null);
  }
  assert.equal(act(game, id, 'shift:walk', { to: game.shift.goal }), null);
}

test('alur bermain: lilin habis, ulang, lalu tiga ruangan diselesaikan dengan solusi BFS', () => {
  const game = newGame('s1', 'shift');
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  assert.equal(gameView(game, 'p1', false).shift.reward, '');
  const far = [...Array(25).keys()].find(i => !reachable(game.shift.tiles, game.shift.pos).has(i));
  assert.match(act(game, 'p1', 'shift:walk', { to: far }), /lorong/);
  assert.match(act(game, 'p1', 'shift:pull', { axis: 'r', k: 2, dir: 1 }), /Tuas/);
  // Habiskan lilin dengan geseran asal; tuas berikutnya ditolak, lalu ulang ruangan.
  for (let i = 0; i < shiftLevels[0].budget; i++) assert.equal(act(game, 'p1', 'shift:pull', { axis: 'c', k: 3, dir: 1 }), null);
  assert.match(act(game, 'p1', 'shift:pull', { axis: 'c', k: 3, dir: 1 }), /Lilin/);
  assert.equal(act(game, 'p2', 'shift:reset'), null);
  assert.deepEqual(game.shift.tiles, shiftLevels[0].tiles);
  assert.equal(game.shift.used, 0);
  for (const [i, lv] of shiftLevels.entries()) {
    assert.equal(game.shift.level, i);
    play(game, i % 2 ? 'p2' : 'p1', solve(lv).path);
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.shift.done, true);
  assert.ok(gameView(game, 'p1', false).shift.reward.length > 0);
});
