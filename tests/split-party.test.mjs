import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';

test('split party: pemain bisa dikirim ke scene berbeda, terisolasi, lalu disatukan lagi', async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'split-'));
  const port = 42000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const room = await (await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function join(id, dm = false) {
      const s = io(base); sockets.push(s);
      let state; const pings = [];
      s.on('room:state', r => { state = r; });
      s.on('tabletop:ping', p => pings.push(p));
      await new Promise(r => s.once('connect', r));
      await new Promise(r => s.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: 'secret-' + id, dmKey: dm ? room.dmKey : '' }, r));
      await new Promise(r => setTimeout(r, 120));
      return { s, pings, get state() { return state; }, act: p => new Promise(r => s.emit('tabletop:action', { sceneId: state.activeSceneId, ...p }, r)) };
    }
    const settle = () => new Promise(r => setTimeout(r, 200));
    async function upload(id, name) {
      const form = new FormData();
      form.append('image', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 't.png');
      form.append('name', name);
      await fetch(`${base}/api/rooms/${room.id}/upload/token`, { method: 'POST', headers: { 'x-player-id': id, 'x-player-secret': 'secret-' + id, ...(id === 'dm' ? { 'x-dm-key': room.dmKey } : {}) }, body: form });
    }
    const dm = await join('dm', true), rana = await join('rana'), bima = await join('bima');
    const sceneA = dm.state.activeSceneId;
    await upload('dm', 'Goblin di Pasar'); await settle();
    // DM membuat scene B (otomatis jadi scene yang disiapkan DM) dan menaruh token di sana.
    assert.equal((await dm.act({ type: 'scene:create', name: 'Gua' })).ok, true);
    await settle();
    const sceneB = dm.state.activeSceneId;
    assert.notEqual(sceneA, sceneB);
    await upload('dm', 'Laba-laba Gua'); await settle();
    assert.ok((await rana.act({ type: 'scene:send', players: ['rana'] })).error, 'pemain tidak boleh mengirim');
    assert.ok((await dm.act({ type: 'scene:send', players: [] })).error, 'harus memilih pemain');
    assert.equal((await dm.act({ type: 'scene:send', players: ['rana', 'tidak-ada'] })).ok, true);
    await settle();
    // Rana di Gua, Bima tetap di Pasar.
    assert.equal(rana.state.activeSceneId, sceneB);
    assert.equal(bima.state.activeSceneId, sceneA);
    assert.deepEqual(rana.state.tokens.map(t => t.name), ['Laba-laba Gua']);
    assert.deepEqual(bima.state.tokens.map(t => t.name), ['Goblin di Pasar']);
    assert.deepEqual(dm.state.playerScenes, { rana: sceneB }, 'DM tahu siapa di mana');
    assert.equal(rana.state.playerScenes, undefined, 'pemain tidak menerima peta split party');
    // Rana tidak bisa menggerakkan token di Pasar.
    const goblin = bima.state.tokens[0];
    rana.s.emit('token:move', { id: goblin.id, x: 10, y: 10 });
    await settle();
    assert.notEqual(bima.state.tokens[0].x, 10);
    // Ping Bima di Pasar tidak sampai ke Rana di Gua.
    rana.pings.length = 0;
    bima.s.emit('tabletop:ping', { sceneId: sceneA, x: 40, y: 40 });
    await settle();
    assert.equal(rana.pings.length, 0, 'ping scene lain tidak bocor');
    assert.ok(dm.pings.some(p => p.sceneId === sceneA));
    // Pemain bergabung kemudian ikut scene utama.
    const cara = await join('cara');
    assert.equal(cara.state.activeSceneId, sceneA);
    // "Semua pemain ke sini" di Gua menyatukan semua dan menghapus pembagian.
    assert.equal((await dm.act({ type: 'scene:publish' })).ok, true);
    await settle();
    for (const who of [rana, bima, cara]) assert.equal(who.state.activeSceneId, sceneB);
    assert.deepEqual(dm.state.playerScenes, {});
    // Kirim pemain ke scene utama menghapus pengecualiannya.
    assert.equal((await dm.act({ type: 'scene:send', players: ['bima'] })).ok, true);
    await settle();
    assert.deepEqual(dm.state.playerScenes, {});
  } finally {
    sockets.forEach(s => s.disconnect());
    server.kill();
    await new Promise(r => server.once('exit', r));
    rmSync(data, { recursive: true, force: true });
  }
});
