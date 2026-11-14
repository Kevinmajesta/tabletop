import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';
import { addToLibrary, seedLibrary, libraryView } from '../dist-server/library.js';

test('gudang: tanpa duplikat per pemilik, data lama terisi dari scene, player hanya melihat miliknya', () => {
  const room = { scenes: [{ tokens: [
    { name: 'Rana', image: '/uploads/a.png', ownerId: 'p1' },
    { name: 'Rana lagi', image: '/uploads/a.png', ownerId: 'p1' },
    { name: 'Goblin', image: '/monsters/goblin.svg', ownerId: 'dm' },
    { name: 'Minigame', image: '', ownerId: 'dm', minigame: 'tavern' },
    { name: 'Bima', image: '/uploads/b.png', ownerId: 'p2' },
  ] }] };
  assert.equal(seedLibrary(room), 3);
  assert.equal(seedLibrary(room), 0, 'tidak mengisi ulang bila gudang sudah ada');
  assert.deepEqual(libraryView(room, 'p1', false).map(i => i.name), ['Rana']);
  assert.equal(libraryView(room, 'dm', true).length, 3);
  assert.equal(addToLibrary(room, { name: 'x', image: '/uploads/a.png', ownerId: 'p1' }).name, 'Rana');
  assert.equal(addToLibrary(room, { name: 'x', image: 'https://evil/x.png', ownerId: 'p1' }), null);
  assert.ok(addToLibrary(room, { name: 'Rana', image: '/uploads/a.png', ownerId: 'p2' }), 'pemilik lain boleh punya gambar sama');
});

test('server: unggah tersimpan di gudang, seret ke peta, simpan dari peta, ganti nama, hapus, hak akses', async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'library-'));
  const port = 48000 + Math.floor(Math.random() * 1000), base = `http://localhost:${port}`;
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
      const res = await new Promise(r => s.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: 'secret-' + id, dmKey: dm ? room.dmKey : '' }, r));
      assert.equal(res.ok, true);
      await new Promise(r => setTimeout(r, 150));
      return { s, get state() { return state; }, emit: (event, payload) => new Promise(r => s.emit(event, payload, r)) };
    }
    const settle = () => new Promise(r => setTimeout(r, 200));
    async function upload(id, name, place) {
      const form = new FormData();
      form.append('image', new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }), 'token.png');
      form.append('name', name);
      if (place === false) form.append('place', '0');
      const r = await fetch(`${base}/api/rooms/${room.id}/upload/token`, { method: 'POST', headers: { 'x-player-id': id, 'x-player-secret': 'secret-' + id }, body: form });
      assert.equal(r.status, 200);
    }
    const dm = await join('dm', true), rana = await join('rana'), bima = await join('bima');
    // Unggah biasa: tersimpan di gudang dan ditaruh di peta. Unggah "simpan saja": hanya masuk gudang.
    await upload('rana', 'Rana', true); await upload('rana', 'Kuda Rana', false); await upload('bima', 'Bima', false);
    await settle();
    assert.deepEqual(rana.state.library.map(i => i.name).sort(), ['Kuda Rana', 'Rana']);
    assert.equal(rana.state.tokens.filter(t => t.ownerId === 'rana').length, 1, 'yang "simpan saja" tidak muncul di peta');
    assert.deepEqual(bima.state.library.map(i => i.name), ['Bima'], 'player hanya melihat gudang sendiri');
    assert.equal(dm.state.library.length, 3, 'DM melihat semua');
    // Player menaruh token dari gudangnya di titik tertentu.
    const horse = rana.state.library.find(i => i.name === 'Kuda Rana');
    const placed = await rana.emit('library:place', { id: horse.id, x: 30, y: 70 });
    assert.equal(placed.ok, true);
    await settle();
    const t = rana.state.tokens.find(x => x.id === placed.id);
    assert.deepEqual([t.name, t.x, t.y, t.ownerId], ['Kuda Rana', 30, 70, 'rana']);
    // Player lain tidak bisa memakai token orang lain.
    assert.ok((await bima.emit('library:place', { id: horse.id, x: 10, y: 10 })).error);
    assert.ok((await bima.emit('library:rename', { id: horse.id, name: 'Curian' })).error);
    assert.ok((await bima.emit('library:remove', horse.id)).error);
    // DM menaruh token milik Bima: pemiliknya tetap Bima, jadi Bima bisa menggerakkannya.
    const bimaItem = dm.state.library.find(i => i.ownerId === 'bima');
    const byDm = await dm.emit('library:place', { id: bimaItem.id, x: 55, y: 45 });
    assert.equal(byDm.ok, true);
    await settle();
    assert.equal(dm.state.tokens.find(x => x.id === byDm.id).ownerId, 'bima');
    // Ganti nama dan hapus dari gudang; token di peta tidak ikut terhapus.
    assert.equal((await rana.emit('library:rename', { id: horse.id, name: 'Kuda Perang' })).ok, true);
    await settle();
    assert.ok(rana.state.library.some(i => i.name === 'Kuda Perang'));
    assert.equal((await rana.emit('library:remove', horse.id)).ok, true);
    await settle();
    assert.ok(!rana.state.library.some(i => i.id === horse.id));
    assert.ok(rana.state.tokens.some(x => x.id === placed.id), 'token di peta tetap ada');
    // Simpan lagi dari token di peta ke gudang.
    assert.equal((await rana.emit('library:save', placed.id)).ok, true);
    await settle();
    assert.ok(rana.state.library.some(i => i.name === 'Kuda Rana'));
    assert.ok((await rana.emit('library:save', placed.id)).error, 'tidak disimpan dua kali');
    assert.ok((await bima.emit('library:save', placed.id)).error, 'tidak bisa menyimpan token orang lain');
  } finally {
    sockets.forEach(s => s.disconnect());
    server.kill();
    await new Promise(r => server.once('exit', r));
    rmSync(data, { recursive: true, force: true });
  }
});

test('server: data lama tanpa gudang diisi otomatis dari token di scene saat start', async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'library-old-'));
  const scene = { id: 's1', name: 'Pasar', map: null, tokens: [{ id: 't1', name: 'Rana', image: '/uploads/a.png', ownerId: 'rana', x: 50, y: 50 }], grid: { columns: 20, distance: 5, unit: 'ft', width: 1000, height: 700, offsetX: 0, offsetY: 0, diagonal: 'grid' }, marks: [], fog: false, vision: false, daylight: true, combat: { active: false, round: 1, turn: 0, ids: [] } };
  writeFileSync(join(data, 'rooms.json'), JSON.stringify({ OLD1: { id: 'OLD1', title: 'Lama', dmKey: 'k', map: null, tokens: scene.tokens, messages: [], members: { rana: { name: 'rana', secret: 'secret-rana' } }, scenes: [scene], activeSceneId: 's1', preparedSceneId: 's1' } }));
  const port = 49000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const s = io(base, { autoConnect: false });
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    s.connect();
    let state;
    s.on('room:state', r => { state = r; });
    await new Promise(r => s.once('connect', r));
    await new Promise(r => s.emit('room:join', { roomId: 'OLD1', name: 'rana', playerId: 'rana', playerSecret: 'secret-rana' }, r));
    await new Promise(r => setTimeout(r, 250));
    assert.deepEqual(state.library.map(i => [i.name, i.image]), [['Rana', '/uploads/a.png']]);
  } finally {
    s.disconnect();
    server.kill();
    await new Promise(r => server.once('exit', r));
    rmSync(data, { recursive: true, force: true });
  }
});
