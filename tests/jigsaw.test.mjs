import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometry, gridFor, tabs, piecePath, isEdgePiece, turn, jigsawPresets, pieceOptions } from '../dist-server/jigsaw-data.js';
import { scatter, jigsawAction, defaultConfig, groupCount, HOLD_MS, newJigsaw } from '../dist-server/jigsaw.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

test('pilihan jumlah keping menghasilkan kisi mendekati jumlah itu dengan keping hampir persegi', () => {
  for (const preset of jigsawPresets) for (const n of pieceOptions) {
    const { cols, rows } = gridFor(n, preset.w, preset.h);
    assert.ok(Math.abs(cols * rows - n) / n < 0.12, `${preset.id} ${n}: ${cols}x${rows}`);
    const { PW, PH } = geometry({ srcW: preset.w, srcH: preset.h, cols, rows });
    assert.ok(PW / PH > 0.75 && PW / PH < 1.33, `${preset.id} ${n}: rasio keping ${PW / PH}`);
  }
});

test('bentuk keping: sambungan berpasangan, keping tepi punya sisi rata', () => {
  const cfg = defaultConfig(108);
  const { PW, PH, count } = geometry(cfg);
  const t = tabs(42, cfg.cols, cfg.rows);
  for (let id = 0; id < count; id++) {
    const d = piecePath(id, cfg, PW, PH, t);
    const flat = [Math.floor(id / cfg.cols) === 0, id % cfg.cols === cfg.cols - 1, Math.floor(id / cfg.cols) === cfg.rows - 1, id % cfg.cols === 0].filter(Boolean).length;
    assert.equal((d.match(/C/g) || []).length, (4 - flat) * 4, `keping ${id}`);
    assert.equal(isEdgePiece(id, cfg.cols, cfg.rows), flat > 0);
  }
  assert.deepEqual(turn(1, 0, 1), [-0, 1]);
  assert.deepEqual(turn(1, 0, 4), [1, 0]);
});

test('sebaran awal: setiap keping kelompok sendiri, tidak bertumpuk, area rakit di tengah kosong', () => {
  for (const n of pieceOptions) {
    const cfg = { ...defaultConfig(n), rotate: true };
    const { PW, PH, W, H, TW, TH, count } = geometry(cfg);
    const ps = scatter(cfg, 7);
    assert.equal(ps.length, count);
    assert.equal(groupCount(ps), count);
    assert.ok(ps.some(p => p.r !== 0), 'dengan putaran, sebagian keping mulai miring');
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      assert.ok(p.x > 0 && p.y > 0 && p.x < TW && p.y < TH);
      assert.ok(!(Math.abs(p.x - TW / 2) < W / 2 && Math.abs(p.y - TH / 2) < H / 2), 'area tengah dibiarkan kosong');
      for (let j = i + 1; j < ps.length; j++) assert.ok(Math.abs(p.x - ps[j].x) >= PW || Math.abs(p.y - ps[j].y) >= PH, `keping ${i} dan ${j} bertumpuk`);
    }
  }
});

function started(setup) {
  const game = newGame('j1', 'jigsaw');
  if (setup) assert.equal(gameAction(game, 'dm', true, { type: 'jigsaw:setup', ...setup }), null);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, max => 1234 % max), null);
  return game;
}

test('pengaturan GM: gambar bawaan/unggahan, jumlah keping, putar; pemain tidak boleh mengatur', () => {
  const game = newGame('j0', 'jigsaw');
  const market = jigsawPresets[1];
  assert.match(gameAction(game, 'p1', false, { type: 'jigsaw:setup', image: market.url, srcW: 1, srcH: 1, pieces: 48 }), /Hanya GM/);
  assert.match(gameAction(game, 'dm', true, { type: 'jigsaw:setup', image: 'https://evil.example/x.jpg', srcW: 800, srcH: 600, pieces: 48 }), /Gambar/);
  assert.match(gameAction(game, 'dm', true, { type: 'jigsaw:setup', image: market.url, srcW: 800, srcH: 600, pieces: 50 }), /Jumlah/);
  assert.equal(gameAction(game, 'dm', true, { type: 'jigsaw:setup', image: '/uploads/abc-123.png', title: 'Burung', srcW: 1600, srcH: 1200, pieces: 48, rotate: true }), null);
  assert.equal(game.jigsawSetup.title, 'Burung');
  assert.equal(game.jigsawSetup.rotate, true);
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }, max => 5 % max), null);
  assert.equal(game.jigsaw.config.image, '/uploads/abc-123.png');
  assert.equal(game.jigsaw.pieces.length, game.jigsaw.config.cols * game.jigsaw.config.rows);
  assert.match(gameAction(game, 'dm', true, { type: 'jigsaw:setup', image: market.url, srcW: 1, srcH: 1, pieces: 48 }), /sebelum ronde/);
});

test('keping menempel ke tetangga, kelompok bergerak bersama, kunci pegangan antarpemain', () => {
  const game = started({ image: jigsawPresets[0].url, srcW: 1, srcH: 1, pieces: 48 });
  const t = game.jigsaw, { PW, PH } = geometry(t.config), cols = t.config.cols;
  const now = 1_000_000;
  const act = (who, type, data, at = now) => jigsawAction(game, who, false, { type, ...data }, at);
  // Keping 1 dijatuhkan sedikit meleset di kanan keping 0 -> menempel dan rata.
  const a = t.pieces[0];
  assert.equal(act('p1', 'jigsaw:grab', { id: 1 }), null);
  assert.match(act('p2', 'jigsaw:grab', { id: 1 }), /dipegang/);
  assert.equal(act('p1', 'jigsaw:drop', { id: 1, x: a.x + PW + 9, y: a.y - 7 }), null);
  assert.equal(t.pieces[1].g, t.pieces[0].g);
  assert.deepEqual([t.pieces[1].x, t.pieces[1].y], [Math.round((a.x + PW) * 10) / 10, a.y]);
  assert.equal(t.joins.p1, 1);
  // Terlalu jauh -> tidak menempel.
  const b = t.pieces[0];
  assert.equal(act('p2', 'jigsaw:grab', { id: cols }), null);
  assert.equal(act('p2', 'jigsaw:drop', { id: cols, x: b.x + PW * 0.1, y: b.y + PH * 0.6 }), null);
  assert.notEqual(t.pieces[cols].g, t.pieces[0].g);
  // Kelompok {0,1} diseret dari keping 0: keping 1 ikut bergeser sama jauh.
  const before1 = { ...t.pieces[1] };
  assert.equal(act('p2', 'jigsaw:grab', { id: 0 }), null);
  assert.equal(act('p2', 'jigsaw:drop', { id: 0, x: t.pieces[0].x + 300, y: t.pieces[0].y + 40 }), null);
  assert.ok(Math.abs(t.pieces[1].x - (before1.x + 300)) < 0.2 && Math.abs(t.pieces[1].y - (before1.y + 40)) < 0.2);
  // Pegangan yang ditinggal lama boleh diambil orang lain.
  assert.equal(act('p1', 'jigsaw:grab', { id: 5 }, now), null);
  assert.match(act('p2', 'jigsaw:grab', { id: 5 }, now + 1000), /dipegang/);
  assert.equal(act('p2', 'jigsaw:grab', { id: 5 }, now + HOLD_MS + 1), null);
  assert.match(act('p1', 'jigsaw:rotate', { id: 7 }), /tidak aktif/);
  for (const bad of [-1, 999, 1.5, '3']) assert.match(act('p1', 'jigsaw:grab', { id: bad }), /tidak dikenal/);
});

test('putar: kelompok berputar di poros keping, hanya menempel bila putarannya sama', () => {
  const game = started({ image: jigsawPresets[1].url, srcW: 1, srcH: 1, pieces: 48, rotate: true });
  const t = game.jigsaw, { PW } = geometry(t.config);
  t.pieces.forEach(p => { p.r = 0; });
  t.pieces[1].r = 1;
  const a = t.pieces[0];
  assert.equal(jigsawAction(game, 'p1', false, { type: 'jigsaw:drop', id: 1, x: a.x + PW, y: a.y }), null);
  assert.notEqual(t.pieces[1].g, t.pieces[0].g, 'putaran beda tidak menempel');
  for (let i = 0; i < 3; i++) assert.equal(jigsawAction(game, 'p1', false, { type: 'jigsaw:rotate', id: 1 }), null);
  assert.equal(t.pieces[1].r, 0);
  assert.equal(jigsawAction(game, 'p1', false, { type: 'jigsaw:drop', id: 1, x: a.x + PW + 5, y: a.y + 5 }), null);
  assert.equal(t.pieces[1].g, t.pieces[0].g);
  // Kelompok berputar 90°: keping kanan pindah ke bawah poros.
  assert.equal(jigsawAction(game, 'p1', false, { type: 'jigsaw:rotate', id: 0 }), null);
  assert.equal(t.pieces[0].r, 1);
  assert.ok(Math.abs(t.pieces[1].x - t.pieces[0].x) < 0.2 && Math.abs(t.pieces[1].y - (t.pieces[0].y + PW)) < 0.2);
});

test('semua keping menjadi satu kelompok = selesai, pesan hadiah terbuka, waktu tercatat', () => {
  const game = started({ image: jigsawPresets[0].url, srcW: 1, srcH: 1, pieces: 108, rotate: true });
  const t = game.jigsaw, { PW, PH, W, H, TW, TH } = geometry(t.config), cols = t.config.cols;
  assert.equal(gameView(game, 'p1', false).jigsaw.reward, '');
  // Luruskan semua putaran dulu, lalu pasang keping satu per satu di sebelah keping 0.
  for (let id = 0; id < t.pieces.length; id++) while (t.pieces[id].r !== 0) assert.equal(jigsawAction(game, 'p1', false, { type: 'jigsaw:rotate', id }), null);
  // Pindahkan keping 0 ke area rakit di tengah meja supaya seluruh gambar muat.
  assert.equal(jigsawAction(game, 'p1', false, { type: 'jigsaw:drop', id: 0, x: (TW - W) / 2 + PW / 2, y: (TH - H) / 2 + PH / 2 }), null);
  const ox = t.pieces[0].x, oy = t.pieces[0].y;
  for (let id = 1; id < t.pieces.length; id++) {
    if (t.pieces[id].g === t.pieces[0].g) continue;
    const who = id % 2 ? 'p1' : 'p2';
    assert.equal(jigsawAction(game, who, false, { type: 'jigsaw:drop', id, x: ox + (id % cols) * PW + 4, y: oy + Math.floor(id / cols) * PH - 4 }), null);
  }
  assert.equal(groupCount(t.pieces), 1);
  assert.equal(game.phase, 'finished');
  assert.equal(t.done, true);
  assert.ok(t.finishedAt >= t.startedAt);
  assert.ok(gameView(game, 'p1', false).jigsaw.reward.length > 0);
  assert.equal((t.joins.p1 || 0) + (t.joins.p2 || 0), t.pieces.length - 1);
});

test('data jigsaw versi lama tidak membuat newJigsaw rusak dan konfigurasi bawaan valid', () => {
  const cfg = defaultConfig();
  assert.equal(cfg.image, jigsawPresets[0].url);
  const t = newJigsaw(9, cfg);
  assert.equal(t.pieces.length, cfg.cols * cfg.rows);
});
