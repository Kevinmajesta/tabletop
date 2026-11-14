import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';

test('hitung mundur: hanya DM, tampil untuk semua, hilang sendiri setelah 0, bisa dihentikan', { timeout: 30000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'countdown-'));
  const port = 46000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
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
      return { s, get state() { return state; }, act: payload => new Promise(r => s.emit('tabletop:action', { sceneId: state.activeSceneId, ...payload }, r)) };
    }
    const settle = (ms = 150) => new Promise(r => setTimeout(r, ms));
    const dm = await join('dm', true), rana = await join('rana');
    assert.ok((await rana.act({ type: 'rest:start', kind: 'countdown', note: '' })).error, 'pemain tidak boleh memulai hitung mundur');
    assert.equal((await dm.act({ type: 'rest:start', kind: 'countdown', note: 'Pilih pintu!' })).ok, true);
    await settle();
    assert.equal(rana.state.rest?.kind, 'countdown');
    assert.equal(rana.state.rest?.note, 'Pilih pintu!');
    assert.ok(Math.abs(Date.now() - rana.state.rest.since) < 2000);
    // 5 detik + 2,5 detik "Waktu habis!" lalu hilang sendiri.
    await settle(6000);
    assert.equal(rana.state.rest?.kind, 'countdown', 'masih menampilkan Waktu habis');
    await settle(2000);
    assert.equal(rana.state.rest, null);
    // Dihentikan DM di tengah jalan, lalu timer lama tidak mengganggu hitung mundur baru.
    await dm.act({ type: 'rest:start', kind: 'countdown', note: '' }); await settle();
    await dm.act({ type: 'rest:end' }); await settle();
    assert.equal(rana.state.rest, null);
  } finally {
    for (const s of sockets) s.close();
    server.kill();
    await new Promise(r => setTimeout(r, 200));
    rmSync(data, { recursive: true, force: true });
  }
});
