import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';

const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b20000000049454e44ae426082', 'hex');

test('token:moveMany memindahkan grup sekaligus; semua-atau-tidak untuk pemain', { timeout: 20000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'group-'));
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
      return { s, get state() { return state; } };
    }
    const wait = () => new Promise(r => setTimeout(r, 400));
    const dm = await join('dm', true), rana = await join('rana');
    const up = who => {
      const fd = new FormData();
      fd.append('image', new Blob([png], { type: 'image/png' }), 'x.png');
      return fetch(`${base}/api/rooms/${room.id}/upload/token`, { method: 'POST', body: fd, headers: { 'x-player-id': who, 'x-player-secret': 'secret-' + who, ...(who === 'dm' ? { 'x-dm-key': room.dmKey } : {}) } });
    };
    for (const who of ['dm', 'dm', 'rana', 'rana']) assert.equal((await up(who)).status, 200);
    await wait();
    const of = who => dm.state.tokens.filter(t => t.ownerId === who);
    const [d1, d2] = of('dm'), [r1, r2] = of('rana');
    assert.ok(d1 && d2 && r1 && r2);
    dm.s.emit('token:moveMany', { moves: [{ id: d1.id, x: 10, y: 20 }, { id: r1.id, x: 30, y: 40 }, { id: d2.id, x: 150, y: -5 }] });
    await wait();
    const at = (who, id) => { const t = who.state.tokens.find(t => t.id === id); return [t.x, t.y]; };
    assert.deepEqual(at(rana, d1.id), [10, 20]);
    assert.deepEqual(at(rana, r1.id), [30, 40], 'GM boleh memindahkan token pemain dalam grup');
    assert.deepEqual(at(rana, d2.id), [100, 0], 'token biasa tetap dijepit di dalam peta');
    // Pemain mencampur token GM: seluruh grup ditolak.
    rana.s.emit('token:moveMany', { moves: [{ id: r1.id, x: 60, y: 60 }, { id: d1.id, x: 60, y: 60 }] });
    await wait();
    assert.deepEqual(at(dm, r1.id), [30, 40]);
    assert.deepEqual(at(dm, d1.id), [10, 20]);
    rana.s.emit('token:moveMany', { moves: [{ id: r1.id, x: 55, y: 50 }, { id: r2.id, x: 65, y: 50 }] });
    await wait();
    assert.deepEqual(at(dm, r1.id), [55, 50]);
    assert.deepEqual(at(dm, r2.id), [65, 50]);
    // Payload rusak / duplikat diabaikan.
    rana.s.emit('token:moveMany', { moves: [{ id: r1.id, x: 1, y: 1 }, { id: r1.id, x: 2, y: 2 }] });
    rana.s.emit('token:moveMany', { moves: [{ id: r1.id, x: 'a', y: 1 }] });
    await wait();
    assert.deepEqual(at(dm, r1.id), [55, 50]);
  } finally {
    for (const s of sockets) s.close();
    server.kill();
    await new Promise(r => setTimeout(r, 200));
    rmSync(data, { recursive: true, force: true });
  }
});
