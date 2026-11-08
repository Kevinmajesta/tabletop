import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newTiles, adjacent, isSafe, condOk, bandOf, reachBand, tileCols, tileRows, tileLives } from '../dist-server/tilefloor.js';
import { newGame, gameAction, gameView, declareGame } from '../dist-server/minigames.js';

const act = (g, id, type, data = {}, dm = false, rnd) => gameAction(g, id, dm, { type, ...data }, rnd);
const rnd = seed => max => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 8) % max; };
const has = (v, key) => JSON.stringify(v).includes(`"${key}"`);
const start = (seed = 7) => { const g = newGame('t', 'tilefloor'); declareGame(g, ['guide', 'walker']); const r = rnd(seed); assert.equal(act(g, 'gm', 'start', {}, true, r), null); return { g, r }; };
const wrongNeighbour = t => [t.pos - 1, t.pos + 1, t.pos - tileCols].find(c => c >= 0 && c < tileCols * tileRows && adjacent(t.pos, c) && !isSafe(t, c));

test('papan sah untuk banyak seed: jalur menyambung, ubin jalur aman, ubin lain tidak aman', () => {
  for (let s = 1; s < 300; s++) {
    const t = newTiles(rnd(s));
    const { path } = t;
    assert.equal(Math.floor(path[0] / tileCols), tileRows - 1);
    assert.equal(Math.floor(path.at(-1) / tileCols), 0);
    for (let i = 1; i < path.length; i++) assert.ok(adjacent(path[i - 1], path[i]), `seed ${s} step ${i}`);
    assert.equal(new Set(path).size, path.length);
    for (let c = 0; c < tileCols * tileRows; c++) assert.equal(isSafe(t, c), path.includes(c), `seed ${s} cell ${c}`);
  }
});

test('zona 3 punya 3 syarat DAN: ubin yang memenuhi sebagian tetap runtuh, dan ada banyak jebakan hampir-benar', () => {
  let near = 0, wrongTotal = 0;
  for (let s = 1; s < 60; s++) {
    const t = newTiles(rnd(s));
    assert.deepEqual(t.rules.map(r => r.length), [1, 2, 3]);
    for (let i = 0; i < tileCols * tileRows; i++) {
      const r = t.rules[bandOf(i)];
      const hit = r.filter(c => condOk(c, t.faces[i], i)).length;
      assert.equal(isSafe(t, i), hit === r.length);
      if (!isSafe(t, i) && r.length > 1) { wrongTotal++; if (hit === r.length - 1) near++; }
    }
  }
  assert.ok(near / wrongTotal > 0.5, `jebakan hampir-benar ${near}/${wrongTotal}`);
});

test('syarat nomor baris dihitung dari bawah dan negasi warna bekerja', () => {
  const f = { s: 0, n: 4, c: 1 };
  const bottom = (tileRows - 1) * tileCols;                 // baris 1 dari bawah: 4 + 1 = 5 (ganjil)
  assert.equal(condOk({ k: 'row', v: 'odd' }, f, bottom), true);
  assert.equal(condOk({ k: 'row', v: 'even' }, f, bottom), false);
  assert.equal(condOk({ k: 'row', v: 'even' }, f, bottom - tileCols), true); // baris 2: 4 + 2 = 6
  assert.equal(condOk({ k: 'col', v: [1], neg: true }, f, 0), false);
  assert.equal(condOk({ k: 'col', v: [2], neg: true }, f, 0), true);
});

test('kabut: Pejalan hanya menerima wajah ubin yang bersebelahan; Pemandu tidak menerima satu pun', () => {
  const { g } = start();
  const w = gameView(g, 'walker', false).tiles;
  const shown = w.faces.map((f, i) => f ? i : -1).filter(i => i >= 0);
  assert.ok(shown.every(i => i === g.tiles.pos || adjacent(g.tiles.pos, i)) && shown.length >= 2 && shown.length <= 4);
  assert.equal(w.faces.filter(Boolean).length, shown.length);
  assert.equal(gameView(g, 'guide', false).tiles.faces, undefined);
  assert.ok(gameView(g, 'gm', true).tiles.faces.every(Boolean));
  // ubin berkabut tidak bisa diinjak (tidak bersebelahan)
  const far = g.tiles.path[5];
  assert.ok(act(g, 'walker', 'tile:step', { cell: far }, false, rnd(1)));
});

test('timer: waktu habis mengurangi nyawa dan mengacak papan; laporan awal diabaikan', () => {
  const { g, r } = start(21);
  const t = g.tiles, before = JSON.stringify(t.faces);
  assert.ok(t.deadline > Date.now() && t.deadline - Date.now() <= 50000);
  assert.ok(act(g, 'other', 'tile:timeout', {}, false, r));                       // bukan peserta
  assert.equal(act(g, 'guide', 'tile:timeout', {}, false, r), null);              // terlalu awal: diabaikan
  assert.equal(t.lives, tileLives);
  t.deadline = Date.now() - 100;                                                  // simulasi waktu habis
  assert.equal(act(g, 'guide', 'tile:timeout', {}, false, r), null);
  assert.equal(t.lives, tileLives - 1); assert.equal(g.result, 'timeout');
  assert.notEqual(JSON.stringify(t.faces), before);
  assert.equal(act(g, 'walker', 'tile:timeout', {}, false, r), null);            // laporan ganda dari pasangan: deadline baru, diabaikan
  assert.equal(t.lives, tileLives - 1);
  t.deadline = Date.now() - 5000;                                                 // melangkah setelah waktu habis dihitung jatuh
  assert.equal(act(g, 'walker', 'tile:step', { cell: t.path[1] }, false, r), null);
  assert.equal(t.lives, tileLives - 2);
  t.deadline = Date.now() - 100;
  assert.equal(act(g, 'walker', 'tile:timeout', {}, false, r), null);
  assert.equal(g.phase, 'finished'); assert.equal(g.result, 'lost');
});

test('timer langkah mengikuti zona dan diatur ulang tiap langkah benar', () => {
  const { g, r } = start(3);
  const t = g.tiles;
  const d0 = t.deadline;
  t.deadline = Date.now() + 1000;
  assert.equal(act(g, 'walker', 'tile:step', { cell: t.path[1] }, false, r), null);
  assert.ok(t.deadline - Date.now() > 40000);
  assert.ok(d0 > 0);
});

test('tampilan per peran: Pejalan tanpa aturan, Pemandu tanpa wajah ubin, zona terbuka bertahap', () => {
  const { g } = start();
  const w = gameView(g, 'walker', false).tiles, p = gameView(g, 'guide', false).tiles, o = gameView(g, 'other', false).tiles, d = gameView(g, 'gm', true).tiles;
  assert.ok(w.faces && !has(w, 'path') && !has(w, 'rules') && !has(w, 'ruleTexts'));
  assert.ok(!p.faces && !has(p, 'path') && !has(p, 'rules') && p.ruleTexts.length === 1); // posisi start: baris 1, tepi zona 1 masih 2 baris jauhnya
  assert.ok(!o.faces && !has(o, 'ruleTexts') && !has(o, 'path'));
  assert.ok(d.faces && d.path && d.rules && d.ruleTexts.length === 3);
  g.tiles.pos = g.tiles.path.find(c => bandOf(c) === 1);
  assert.equal(gameView(g, 'guide', false).tiles.ruleTexts.length, 2);
});

test('langkah: peran, jarak, validasi; jatuh mengurangi nyawa dan mengacak papan', () => {
  const { g, r } = start();
  const t = g.tiles, path = t.path;
  assert.ok(act(g, 'guide', 'tile:step', { cell: path[1] }, false, r));
  assert.ok(act(g, 'walker', 'tile:step', { cell: path[2] }, false, r));
  assert.ok(act(g, 'walker', 'tile:step', { cell: 1.5 }, false, r));
  assert.ok(act(g, 'walker', 'tile:step', { cell: 9999 }, false, r));
  assert.ok(act(g, 'walker', 'tile:step', { cell: path[1] }));
  const bad = wrongNeighbour(t);
  assert.ok(bad !== undefined);
  const before = JSON.stringify(t.faces), badFace = t.faces[bad];
  assert.equal(act(g, 'walker', 'tile:step', { cell: bad }, false, r), null);
  assert.equal(g.result, 'fall');
  assert.equal(t.lives, tileLives - 1);
  assert.deepEqual(t.lastWrong, badFace);
  assert.equal(t.pos, t.path[0]);
  assert.notEqual(JSON.stringify(t.faces), before);
  assert.equal(act(g, 'walker', 'tile:step', { cell: t.path[1] }, false, r), null);
});

test('nyawa habis: kalah; menyelesaikan jalur: menang, rahasia terbuka, reset bersih', () => {
  let { g, r } = start(11);
  for (let i = 0; i < tileLives; i++) { assert.equal(g.phase, 'open'); assert.equal(act(g, 'walker', 'tile:step', { cell: wrongNeighbour(g.tiles) }, false, r), null); }
  assert.equal(g.phase, 'finished'); assert.equal(g.result, 'lost');
  assert.ok(act(g, 'walker', 'tile:step', { cell: 0 }, false, r));
  ({ g, r } = start(13));
  const path = [...g.tiles.path];
  for (let i = 1; i < path.length; i++) assert.equal(act(g, 'walker', 'tile:step', { cell: path[i] }, false, r), null, `step ${i}`);
  assert.equal(g.phase, 'finished'); assert.equal(g.result, 'win');
  assert.ok(has(gameView(g, 'walker', false).tiles, 'ruleTexts'));
  assert.equal(act(g, 'gm', 'reset', {}, true), null);
  assert.equal(g.tiles, undefined);
});

test('4 pemain: dua game Lantai Ubin berjalan paralel dan independen', () => {
  const a = newGame('ta', 'tilefloor'), b = newGame('tb', 'tilefloor');
  declareGame(a, ['g1', 'w1']); declareGame(b, ['g2', 'w2']);
  const ra = rnd(3), rb = rnd(11);
  act(a, 'gm', 'start', {}, true, ra); act(b, 'gm', 'start', {}, true, rb);
  assert.ok(act(a, 'w2', 'tile:step', { cell: a.tiles.path[1] }, false, ra));
  assert.ok(!has(gameView(a, 'g2', false), 'faces'));
  assert.equal(act(a, 'w1', 'tile:step', { cell: a.tiles.path[1] }, false, ra), null);
  assert.equal(b.tiles.pos, b.tiles.path[0]);
  for (let i = 1; i < b.tiles.path.length; i++) assert.equal(act(b, 'w2', 'tile:step', { cell: b.tiles.path[i] }, false, rb), null);
  assert.equal(b.phase, 'finished'); assert.equal(a.phase, 'open');
});

test('GM yang ikut jadi Pejalan/Pemandu hanya menerima tampilan perannya, bukan tampilan GM penuh', () => {
  for (const [role, seed] of [['walker', 5], ['guide', 6]]) {
    const g = newGame('t', 'tilefloor');
    declareGame(g, role === 'walker' ? ['guide', 'gm'] : ['gm', 'walker']);
    assert.equal(act(g, 'gm', 'start', {}, true, rnd(seed)), null);
    const v = gameView(g, 'gm', true).tiles;
    assert.ok(!has(v, 'path') && !has(v, 'rules'), role);
    if (role === 'walker') { assert.ok(!v.ruleTexts); assert.ok(v.faces.filter(Boolean).length <= 4); }
    else { assert.equal(v.faces, undefined); assert.equal(v.ruleTexts.length, 1); }
  }
  const g = newGame('t', 'tilefloor'); declareGame(g, ['guide', 'walker']); act(g, 'gm', 'start', {}, true, rnd(7));
  assert.ok(has(gameView(g, 'gm', true).tiles, 'path'));        // GM non-peserta tetap melihat semuanya
});

test('adil: Pemandu selalu memegang aturan zona SEMUA ubin yang bisa diinjak Pejalan berikutnya', () => {
  for (let s = 1; s < 200; s++) {
    const g = newGame('t', 'tilefloor'); declareGame(g, ['guide', 'walker']);
    act(g, 'gm', 'start', {}, true, rnd(s));
    for (const pos of g.tiles.path) {
      g.tiles.pos = pos;
      const known = gameView(g, 'guide', false).tiles.ruleTexts.length;
      for (let c = 0; c < tileCols * tileRows; c++) if (adjacent(pos, c)) assert.ok(bandOf(c) < known, `seed ${s} pos ${pos} -> ${c}: zona ${bandOf(c)} belum terlihat (${known})`);
    }
  }
});

test('aturan bervariasi antar ronde, tiap zona punya banyak pola, dan selalu bisa dipenuhi', () => {
  const kinds = [new Set(), new Set(), new Set()];
  for (let s = 1; s < 300; s++) {
    const t = newTiles(rnd(s));
    t.rules.forEach((r, i) => kinds[i].add(r.map(c => c.k + (c.neg ? '!' : '')).join('+')));
    assert.ok(t.path.length > 0);
  }
  kinds.forEach((k, i) => assert.ok(k.size >= 4, `zona ${i + 1} hanya ${k.size} pola: ${[...k]}`));
  assert.ok(![...kinds[0]].every(k => k === 'sym'), 'zona 1 tidak melulu lambang');
});

test('newTiles tidak pernah gagal membuat papan untuk banyak seed (aturan selalu bisa dipenuhi di semua ubin zonanya)', () => {
  for (let s = 1; s < 1500; s++) assert.doesNotThrow(() => newTiles(rnd(s)), `seed ${s}`);
});
