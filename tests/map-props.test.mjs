import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';

const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b20000000049454e44ae426082', 'hex');

test('gambar di peta: hanya DM mengunggah, rasio tersimpan, boleh besar, terlihat pemain walau di luar pandangan', { timeout: 20000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'props-'));
  const port = 48000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
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
    const settle = () => new Promise(r => setTimeout(r, 200));
    const dm = await join('dm', true), rana = await join('rana');
    const up = (who, kind, extra = {}) => {
      const fd = new FormData();
      fd.append('image', new Blob([png], { type: 'image/png' }), 'x.png');
      for (const [k, v] of Object.entries(extra)) fd.append(k, v);
      return fetch(`${base}/api/rooms/${room.id}/upload/${kind}`, { method: 'POST', body: fd, headers: { 'x-player-id': who, 'x-player-secret': 'secret-' + who, ...(who === 'dm' ? { 'x-dm-key': room.dmKey } : {}) } });
    };
    assert.equal((await up('rana', 'prop', { aspect: '2' })).status, 403, 'pemain tidak boleh menaruh gambar');
    assert.equal((await up('dm', 'prop', { aspect: '2', name: 'Kota' })).status, 200);
    await settle();
    // Vision menyala dan pemain tidak punya sumber pandangan: gambar tetap dikirim (ditutup lapisan gelap di klien).
    await dm.act({ type: 'scene:settings', vision: true });
    await settle();
    const prop = rana.state.tokens.find(t => t.prop);
    assert.ok(prop, 'pemain menerima gambar');
    assert.equal(prop.aspect, 2);
    assert.equal(prop.name, 'Kota');
    dm.s.emit('token:resize', { id: prop.id, size: 30 });
    await new Promise(r => setTimeout(r, 400));
    assert.equal(rana.state.tokens.find(t => t.id === prop.id).size, 30, 'gambar boleh lebih besar dari 6 kotak');
    dm.s.emit('token:resize', { id: prop.id, size: 500 });
    await new Promise(r => setTimeout(r, 400));
    assert.equal(rana.state.tokens.find(t => t.id === prop.id).size, 80);
    assert.ok((await rana.act({ type: 'token:update', id: prop.id, rotation: 30 })).error, 'pemain tidak boleh memutar gambar DM');
    // Gambar boleh digeser ke luar tabel, tapi tetap dibatasi supaya tidak hilang terlalu jauh.
    dm.s.emit('token:move', { id: prop.id, x: -40, y: 180 });
    await new Promise(r => setTimeout(r, 400));
    const moved = rana.state.tokens.find(t => t.id === prop.id);
    assert.deepEqual([moved.x, moved.y], [-40, 180], 'gambar boleh di luar tabel');
    dm.s.emit('token:move', { id: prop.id, x: -9999, y: 9999 });
    await new Promise(r => setTimeout(r, 400));
    const far = rana.state.tokens.find(t => t.id === prop.id);
    assert.deepEqual([far.x, far.y], [-150, 250]);
  } finally {
    for (const s of sockets) s.close();
    server.kill();
    await new Promise(r => setTimeout(r, 200));
    rmSync(data, { recursive: true, force: true });
  }
});
