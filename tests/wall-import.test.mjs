import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';
import { visible } from '../dist-server/tabletop.js';

// Labirin sintetis: dinding vertikal & horizontal tiap 2% (sekitar 2.400 segmen).
function mazeWalls() {
  const walls = [];
  for (let i = 0; i <= 50; i++) for (let j = 0; j < 50; j += 2) {
    walls.push({ kind: 'wall', a: { x: i * 2, y: j * 2 }, b: { x: i * 2, y: j * 2 + 2 } });
    walls.push({ kind: 'wall', a: { x: j * 2, y: i * 2 }, b: { x: j * 2 + 2, y: i * 2 } });
  }
  walls.push({ kind: 'door', a: { x: 51, y: 50 }, b: { x: 51, y: 52 } });
  return walls;
}

test('GM mengimpor ribuan dinding sekaligus; pemain tidak boleh; undo; patch token tidak mengirim ulang dinding', { timeout: 30000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'walls-'));
  const port = 48000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const room = await (await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function join(id, dm = false) {
      const s = io(base); sockets.push(s);
      let state; const patches = [];
      s.on('room:state', r => { state = r; });
      s.on('room:patch', ({ patch }) => {
        patches.push(patch);
        const scenes = patch.scenes?.map(sc => sc.keepMarks ? { ...sc, marks: state.scenes.find(o => o.id === sc.id).marks } : sc);
        state = { ...state, ...patch, ...(scenes ? { scenes } : {}) };
      });
      await new Promise(r => s.once('connect', r));
      s.emit('room:patches');
      await new Promise(r => s.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: 'secret-' + id, dmKey: dm ? room.dmKey : '' }, r));
      await new Promise(r => setTimeout(r, 150));
      return { s, patches, get state() { return state; }, act: payload => new Promise(r => s.emit('tabletop:action', { sceneId: state.activeSceneId, ...payload }, r)) };
    }
    const settle = (ms = 250) => new Promise(r => setTimeout(r, ms));
    const dm = await join('dm', true), rana = await join('rana');
    const walls = mazeWalls();
    assert.ok(walls.length > 2000);
    assert.ok((await rana.act({ type: 'walls:import', walls })).error, 'pemain tidak boleh impor');
    assert.ok((await dm.act({ type: 'walls:import', walls: [{ kind: 'lava', a: { x: 1, y: 1 }, b: { x: 2, y: 2 } }] })).error);
    assert.ok((await dm.act({ type: 'walls:import', walls: Array(5001).fill(walls[0]) })).error, 'batas 5000');
    // Gambar biasa milik pemain tetap ada setelah impor.
    assert.equal((await rana.act({ type: 'mark:add', kind: 'line', a: { x: 1, y: 1 }, b: { x: 3, y: 3 } })).ok, true);
    assert.equal((await dm.act({ type: 'walls:import', walls, columns: 96, offset: true })).ok, true);
    await settle(400);
    const scene = rana.state.scenes[0];
    assert.equal(scene.marks.filter(m => m.kind === 'wall').length, walls.length - 1);
    assert.equal(scene.marks.filter(m => m.kind === 'door' && m.open === false).length, 1);
    assert.equal(scene.marks.filter(m => m.kind === 'line').length, 1);
    assert.equal(scene.grid.columns, 96);
    // Masih bisa menambah dinding manual di atas 200.
    assert.equal((await dm.act({ type: 'mark:add', kind: 'wall', a: { x: 10, y: 11 }, b: { x: 12, y: 11 } })).ok, true);
    // Impor ulang mengganti dinding lama, bukan menumpuk.
    assert.equal((await dm.act({ type: 'walls:import', walls: walls.slice(0, 10) })).ok, true);
    await settle();
    assert.equal(rana.state.scenes[0].marks.filter(m => m.kind === 'wall').length, 10);
    dm.s.emit('campaign:undo', () => {}); await settle(400);
    assert.equal(rana.state.scenes[0].marks.filter(m => m.kind === 'wall').length, walls.length);
    // Token bergeser: patch scenes tidak membawa ulang dinding.
    const fd = new FormData();
    fd.append('image', new Blob([Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b20000000049454e44ae426082', 'hex')], { type: 'image/png' }), 'x.png');
    await fetch(`${base}/api/rooms/${room.id}/upload/token`, { method: 'POST', body: fd, headers: { 'x-player-id': 'rana', 'x-player-secret': 'secret-rana' } });
    await settle();
    const token = rana.state.tokens.find(t => t.ownerId === 'rana');
    rana.patches.length = 0;
    dm.s.emit('token:move', { id: token.id, x: 51, y: 51 });
    await settle(400);
    const scenePatch = rana.patches.find(p => p.scenes);
    assert.ok(scenePatch, 'ada patch scene');
    assert.equal(scenePatch.scenes[0].keepMarks, true);
    assert.equal(scenePatch.scenes[0].marks, undefined);
    assert.ok(JSON.stringify(scenePatch).length < 20000, 'patch kecil: ' + JSON.stringify(scenePatch).length);
    assert.equal(rana.state.scenes[0].marks.filter(m => m.kind === 'wall').length, walls.length, 'klien tetap punya semua dinding');
    // Hapus semua dinding.
    assert.ok((await rana.act({ type: 'walls:clear' })).error);
    assert.equal((await dm.act({ type: 'walls:clear' })).ok, true);
    await settle();
    assert.equal(rana.state.scenes[0].marks.filter(m => m.kind === 'wall' || m.kind === 'door').length, 0);
    assert.equal(rana.state.scenes[0].marks.filter(m => m.kind === 'line').length, 1);
  } finally {
    for (const s of sockets) s.close();
    server.kill();
    await new Promise(r => setTimeout(r, 200));
    rmSync(data, { recursive: true, force: true });
  }
});

test('visible() tetap cepat dengan ribuan dinding', () => {
  const marks = mazeWalls().map((w, i) => ({ id: 'w' + i, ownerId: 'dm', text: '', ...w }));
  const scene = { id: 's', name: '', map: null, marks, fog: false, vision: true, daylight: true, grid: { columns: 96, distance: 5, unit: 'ft', diagonal: 'grid', width: 5376, height: 4032, offsetX: 0, offsetY: 0 }, combat: { active: false, round: 1, turn: 0, ids: [] },
    tokens: [{ id: 'h', ownerId: 'p', x: 51, y: 51, visionSource: true, visionRange: 60, name: '', image: '' }] };
  scene.tokens[0].y = 49;
  const start = performance.now();
  let n = 0;
  for (let i = 0; i < 2000; i++) if (visible({ x: (i * 7) % 100, y: (i * 13) % 100 }, scene, 'p')) n++;
  const ms = performance.now() - start;
  assert.ok(ms < 1500, `2000 cek pandangan butuh ${ms.toFixed(0)} ms`);
  // Satu sel labirin: titik di sel sebelah terhalang dinding.
  assert.equal(visible({ x: 53, y: 49 }, scene, 'p'), false);
  assert.equal(visible({ x: 51.5, y: 49.5 }, scene, 'p'), true);
  console.log('visible x2000:', ms.toFixed(1), 'ms');
});
