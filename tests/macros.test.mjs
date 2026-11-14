import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';

test('makro status: AFK, Kembali, angkat tangan, turun otomatis saat bicara, DM bisa menurunkan', async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'macros-'));
  const port = 43000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
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
      return { s, get state() { return state; }, status: p => new Promise(r => s.emit('member:status', p, r)) };
    }
    const settle = () => new Promise(r => setTimeout(r, 150));
    const dm = await join('dm', true), rana = await join('rana'), bima = await join('bima');
    const statusOf = (who, id) => who.state.members.find(m => m.id === id).status;
    const lastStatus = who => [...who.state.messages].reverse().find(m => m.kind === 'status');

    assert.equal((await rana.status({ status: 'afk' })).ok, true);
    await settle();
    assert.equal(statusOf(dm, 'rana'), 'afk');
    assert.equal(lastStatus(bima).text, 'rana AFK bentar');
    assert.ok((await rana.status({ status: 'afk' })).error, 'tidak AFK dua kali');
    assert.equal((await rana.status({ status: 'back' })).ok, true);
    await settle();
    assert.equal(statusOf(dm, 'rana'), undefined);
    assert.equal(lastStatus(dm).text, 'rana dah balik');
    assert.ok((await rana.status({ status: 'back' })).error, 'kembali tanpa pergi ditolak');

    // Angkat tangan, lalu bicara di chat: tangan turun otomatis.
    assert.equal((await rana.status({ status: 'hand' })).ok, true);
    await settle();
    assert.equal(statusOf(dm, 'rana'), 'hand');
    assert.equal(lastStatus(dm).text, 'rana mau ngomong');
    rana.s.emit('chat:send', 'Aku mau cek pintu itu.');
    await settle();
    assert.equal(statusOf(dm, 'rana'), undefined);

    // Pemain tidak bisa menurunkan tangan orang lain; DM bisa.
    assert.equal((await bima.status({ status: 'hand' })).ok, true);
    assert.ok((await rana.status({ status: 'lower', playerId: 'bima' })).error);
    await settle();
    assert.equal(statusOf(dm, 'bima'), 'hand');
    assert.equal((await dm.status({ status: 'lower', playerId: 'bima' })).ok, true);
    await settle();
    assert.equal(statusOf(rana, 'bima'), undefined);
    assert.ok((await bima.status({ status: 'menari' })).error, 'status tidak dikenal ditolak');
  } finally {
    sockets.forEach(s => s.disconnect());
    server.kill();
    await new Promise(r => server.once('exit', r));
    rmSync(data, { recursive: true, force: true });
  }
});
