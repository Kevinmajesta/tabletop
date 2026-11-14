import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';

test('garis grid: hanya DM yang bisa menyalakan/mematikan, pemain ikut melihat hasilnya', async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'grid-'));
  const port = 44000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const room = await (await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function join(id, dm = false) {
      const s = io(base); sockets.push(s);
      let state;
      s.on('room:state', r => { state = r; });
      await new Promise(r => s.once('connect', r));
      await new Promise(r => s.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: 'secret-' + id, dmKey: dm ? room.dmKey : '' }, r));
      await new Promise(r => setTimeout(r, 120));
      return { get state() { return state; }, act: p => new Promise(r => s.emit('tabletop:action', { sceneId: state.activeSceneId, ...p }, r)) };
    }
    const settle = () => new Promise(r => setTimeout(r, 150));
    const dm = await join('dm', true), rana = await join('rana');
    const sceneOf = who => who.state.scenes.find(s => s.id === who.state.activeSceneId);
    assert.equal(sceneOf(rana).gridHidden, undefined, 'grid tampil secara bawaan');
    assert.ok((await rana.act({ type: 'scene:settings', gridHidden: true })).error, 'pemain tidak boleh mengubah grid');
    assert.equal((await dm.act({ type: 'scene:settings', gridHidden: true })).ok, true);
    await settle();
    assert.equal(sceneOf(rana).gridHidden, true, 'pemain melihat grid dimatikan DM');
    assert.equal((await dm.act({ type: 'scene:settings', gridHidden: false })).ok, true);
    await settle();
    assert.equal(sceneOf(rana).gridHidden, undefined, 'grid kembali tampil');
  } finally {
    sockets.forEach(s => s.disconnect());
    server.kill();
    await new Promise(r => server.once('exit', r));
    rmSync(data, { recursive: true, force: true });
  }
});
