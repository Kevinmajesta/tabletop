import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mirrorRooms, traceBeams, isSolved, solutions, starsFor } from '../dist-server/mirrors.js';
import { newGame, gameAction, gameView, declareGame } from '../dist-server/minigames.js';

function seeded(seed) {
  let s = seed >>> 0;
  return max => { s = (s * 1664525 + 1013904223) >>> 0; return s % max; };
}
function started(players, seed = 7) {
  const game = newGame('t1', 'mirrors');
  assert.equal(declareGame(game, players), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, seeded(seed)), null);
  return game;
}
const act = (game, id, type, data = {}) => gameAction(game, id, false, { type, ...data }, seeded(3));
const slots = map => map.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === 'M' ? [{ x, y }] : [])));
const bitsOf = mirrors => mirrors.reduce((b, m, i) => b | ((m.dir === '\\' ? 1 : 0) << i), 0);

// Putar cermin menuju susunan jawaban terdekat, masing-masing oleh pemiliknya.
function solveRoom(game) {
  const t = game.mirrors;
  const map = mirrorRooms[t.room].map;
  const now = bitsOf(t.mirrors);
  const target = solutions(map).sort((a, b) => ((a ^ now).toString(2).split('1').length) - ((b ^ now).toString(2).split('1').length))[0];
  t.mirrors.forEach((m, i) => {
    const want = (target >> i) & 1 ? '\\' : '/';
    if (m.dir !== want && !t.cleared) assert.equal(act(game, game.players[m.owner], 'mirror:rotate', { index: i }), null);
  });
}

test('semua ruangan berukuran sama dan bisa diselesaikan', () => {
  for (const room of mirrorRooms) {
    assert.ok(room.map.every(row => row.length === room.map[0].length), room.name);
    assert.ok(solutions(room.map).length > 0, `${room.name} punya jawaban`);
  }
});

test('cahaya memantul sesuai arah cermin dan berhenti di pilar', () => {
  const map = ['R.M', '...', '..T'];
  assert.equal(isSolved(map, [{ x: 2, y: 0, dir: '\\' }]), true);
  assert.equal(isSolved(map, [{ x: 2, y: 0, dir: '/' }]), false);
  const blocked = traceBeams(['R#T'], []);
  assert.equal(blocked[0].hits.length, 0);
});

test('kristal penguat wajib dilewati cahaya yang sampai ke pintu', () => {
  const map = mirrorRooms[1].map;
  for (const bits of solutions(map)) {
    const mirrors = slots(map).map((s, i) => ({ ...s, dir: (bits >> i) & 1 ? '\\' : '/' }));
    const hits = traceBeams(map, mirrors).flatMap(b => b.hits);
    assert.ok(hits.some(h => h.startsWith('C@')));
  }
});

test('ruangan dimulai belum selesai dan cermin kunci terbagi ke semua pemain', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const game = started(['a', 'b'], seed);
    const t = game.mirrors;
    assert.equal(isSolved(mirrorRooms[0].map, t.mirrors), false);
    assert.ok(t.par >= 2);
    assert.deepEqual([...new Set(t.mirrors.map(m => m.owner))].sort(), [0, 1]);
  }
});

test('hanya pemilik yang bisa memutar cermin', () => {
  const game = started(['a', 'b']);
  const t = game.mirrors;
  const mine = t.mirrors.findIndex(m => m.owner === 0);
  const theirs = t.mirrors.findIndex(m => m.owner === 1);
  const before = t.mirrors[mine].dir;
  assert.equal(act(game, 'a', 'mirror:rotate', { index: mine }), null);
  assert.notEqual(t.mirrors[mine].dir, before);
  assert.equal(t.rotations, 1);
  assert.match(act(game, 'a', 'mirror:rotate', { index: theirs }), /milik temanmu/);
  assert.match(act(game, 'x', 'mirror:rotate', { index: mine }), /peserta/);
});

test('menyelesaikan tiga ruangan memberi bintang dan memenangkan permainan', () => {
  const game = started(['a', 'b', 'c']);
  for (let room = 0; room < mirrorRooms.length; room++) {
    assert.equal(game.mirrors.room, room);
    assert.match(act(game, 'a', 'mirror:next') ?? '', /belum terbuka/);
    solveRoom(game);
    assert.equal(game.mirrors.cleared, true);
    assert.equal(game.mirrors.stars[room], 3, 'jalur terpendek dapat tiga bintang');
    if (room < mirrorRooms.length - 1) assert.equal(act(game, 'b', 'mirror:next'), null);
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.result, 'win');
  assert.deepEqual(game.scores, { a: 9, b: 9, c: 9 });
  assert.ok(gameView(game, 'a', false).mirrors, 'ruangan tetap terlihat setelah selesai');
});

test('bintang turun kalau putaran jauh melebihi minimum', () => {
  assert.equal(starsFor(4, 3), 3);
  assert.equal(starsFor(8, 3), 2);
  assert.equal(starsFor(12, 3), 1);
});
