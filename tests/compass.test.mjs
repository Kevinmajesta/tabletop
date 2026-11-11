import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elements } from '../dist-server/alchemy-data.js';
import { compassStart, compassGoal, compassMap, compassSolution, validPath, neighbor, defaultCompassReward } from '../dist-server/compass.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

// Penelusur independen: coba semua jalur yang mengikuti kompas tanpa mengulang unsur.
function allPaths() {
  const found = [];
  const walk = path => {
    const cur = path.at(-1);
    if (cur === compassGoal) { found.push([...path]); return; }
    for (const d of compassMap[elements[cur - 1].category] ?? []) {
      const n = neighbor(cur, d);
      if (n && !path.includes(n.z)) walk([...path, n.z]);
    }
  };
  walk([compassStart]);
  return found;
}

test('labirin kompas hanya punya satu jalur dari K ke Ts', () => {
  assert.equal(elements[compassStart - 1].symbol, 'K');
  assert.equal(elements[compassGoal - 1].symbol, 'Ts');
  const paths = allPaths();
  assert.equal(paths.length, 1);
  assert.deepEqual(paths[0], compassSolution);
  assert.equal(validPath(compassSolution), true);
  assert.equal(compassSolution.map(z => elements[z - 1].symbol).join('-'), 'K-Ca-Sc-Ti-V-Cr-Mn-Fe-Co-Ni-Cu-Zn-Ga-Al-B-C-Si-P-As-Se-Te-I-At-Ts');
});

test('validasi jalur menolak pelanggaran kompas, pengulangan, dan tujuan salah', () => {
  assert.equal(validPath(compassSolution.slice(0, -1)), false);
  // Dari Seng (logam transisi, ←→) tidak boleh turun ke Kadmium.
  assert.equal(validPath([...compassSolution.slice(0, 12), 48]), false);
  const looped = [...compassSolution]; looped.splice(2, 0, 20);
  assert.equal(validPath(looped), false);
});

function started() {
  const game = newGame('c1', 'compass');
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  return game;
}
const act = (game, id, type, data = {}) => gameAction(game, id, false, { type, ...data });

test('alur bermain: langkah bebas bersebelahan, jalur salah tanpa batas, lalu benar', () => {
  const game = started();
  assert.equal(gameView(game, 'p1', false).compass.answer, undefined);
  assert.deepEqual(gameView(game, 'dm', true).compass.answer, compassSolution);
  assert.match(act(game, 'p1', 'compass:step', { z: 26 }), /bersebelahan/);
  // Naik dari K ke Na melanggar kompas, tapi tetap boleh dicoba; baru dinilai saat diserahkan.
  assert.equal(act(game, 'p1', 'compass:step', { z: 11 }), null);
  assert.equal(act(game, 'p1', 'compass:undo'), null);
  assert.deepEqual(game.compass.path, [19]);
  assert.match(act(game, 'p1', 'compass:submit'), /belum sampai/);
  // Jalur yang sampai ke Ts lewat jalan pintas terlarang dinilai salah, berulang kali tanpa terkunci.
  const cheat = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 53, 85, 117];
  for (let i = 0; i < 6; i++) {
    assert.equal(act(game, 'p2', 'compass:reset'), null);
    cheat.slice(1).forEach(z => assert.equal(act(game, 'p2', 'compass:step', { z }), null));
    assert.equal(act(game, 'p2', 'compass:submit'), null);
  }
  assert.equal(game.phase, 'open');
  assert.equal(game.compass.tries, 6);
  assert.equal(act(game, 'p1', 'compass:reset'), null);
  compassSolution.slice(1).forEach(z => assert.equal(act(game, 'p1', 'compass:step', { z }), null));
  assert.equal(act(game, 'p1', 'compass:submit'), null);
  assert.equal(game.phase, 'finished');
  assert.equal(gameView(game, 'p2', false).compass.reward, defaultCompassReward);
});
