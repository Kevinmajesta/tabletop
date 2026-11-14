import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';

test('putar token: pemilik/DM boleh memutar, cahaya lancip ikut berputar', { timeout: 20000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'rotation-'));
  const port = 47000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const room = await (await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function join(id, dm = false) {
      const s = io(base); sockets.push(s);
      let state;
      s.on('room:state', r => { state = r; });
      s.on('room:patch', ({ patch }) => { state = { ...state, ...patch }; });
      await new Promise(r => s.once('connect', r));
      await new Promise(r => s.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: 'secret-' + id, dmKey: dm ? room.dmKey : '' }, r));
      await new Promise(r => setTimeout(r, 120));
      return { s, get state() { return state; }, act: payload => new Promise(r => s.emit('tabletop:action', { sceneId: state.activeSceneId, ...payload }, r)) };
    }
    const settle = () => new Promise(r => setTimeout(r, 150));
    const dm = await join('dm', true), rana = await join('rana'), bima = await join('bima');
    const fd = new FormData();
    fd.append('image', new Blob([Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b20000000049454e44ae426082', 'hex')], { type: 'image/png' }), 't.png');
    fd.append('name', 'Rana');
    const up = await fetch(`${base}/api/rooms/${room.id}/upload/token`, { method: 'POST', body: fd, headers: { 'x-player-id': 'rana', 'x-player-secret': 'secret-rana' } });
    assert.equal(up.ok, true, await up.clone().text());
    await settle();
    const tok = () => rana.state.tokens.find(t => t.name === 'Rana');
    const id = tok().id;
    assert.equal((await dm.act({ type: 'token:update', id, lightRange: 30, lightShape: 'cone', lightAngle: 60, lightDir: 0 })).ok, true);
    await settle();
    // Pemilik memutar 90°: cahaya ikut dari 0° ke 90°.
    assert.equal((await rana.act({ type: 'token:update', id, rotation: 90 })).ok, true);
    await settle();
    assert.equal(tok().rotation, 90);
    assert.equal(tok().lightDir, 90);
    // Putar balik lewat 0: -45 → 315, cahaya ikut 90 - 135 = -45 → 315.
    await rana.act({ type: 'token:update', id, rotation: -45 }); await settle();
    assert.equal(tok().rotation, 315);
    assert.equal(tok().lightDir, 315);
    // Pemain lain tidak boleh memutar token orang.
    assert.ok((await bima.act({ type: 'token:update', id, rotation: 10 })).error);
    // Token cahaya bulat: putaran tidak membuat lightDir baru.
    await dm.act({ type: 'token:update', id, lightShape: 'circle' }); await settle();
    await dm.act({ type: 'token:update', id, rotation: 0 }); await settle();
    assert.equal(tok().rotation, undefined);
    assert.equal(tok().lightDir, 315);
  } finally {
    for (const s of sockets) s.close();
    server.kill();
    await new Promise(r => setTimeout(r, 200));
    rmSync(data, { recursive: true, force: true });
  }
});
