import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';
import { dedupeMembers, mergeMembers } from '../dist-server/members.js';

test('menggabung identitas lama: kepemilikan, peserta minigame, skor, lalu anggota lama dihapus', () => {
  const room = {
    members: { a1: { name: 'Miko', secret: 'x' }, a2: { name: 'miko ', secret: 'y' }, b: { name: 'Han', secret: 'z' } },
    characters: [{ ownerId: 'a1' }, { ownerId: 'b' }],
    scenes: [{ tokens: [{ ownerId: 'a1' }, { ownerId: 'b' }] }],
    minigames: [{ players: ['a1', 'b', 'a2'], scores: { a1: 2, a2: 1, b: 5 }, choices: { a1: 'batu' } }],
  };
  mergeMembers(room, 'a2', ['a1']);
  assert.deepEqual(Object.keys(room.members).sort(), ['a2', 'b']);
  assert.equal(room.characters[0].ownerId, 'a2');
  assert.equal(room.scenes[0].tokens[0].ownerId, 'a2');
  assert.deepEqual(room.minigames[0].players, ['a2', 'b']);
  assert.deepEqual(room.minigames[0].scores, { a2: 3, b: 5 });
  assert.deepEqual(room.minigames[0].choices, { a2: 'batu' });
});

test('merapikan data lama: satu nama satu anggota, pemilik karakter yang dipertahankan, yang online tidak dihapus', () => {
  const members = {};
  const names = ['DM', 'Miko', 'Han', 'Mariadi', 'DM', 'DM', 'Miko', 'Mariadi', 'han', 'DM', 'DM', 'TESDT', 'Miko', 'han', 'Mariadi'];
  names.forEach((n, i) => { members['id' + i] = { name: n, secret: 's' }; });
  const room = { members, characters: [{ ownerId: 'id1' }], scenes: [{ tokens: [{ ownerId: 'id6' }, { ownerId: 'id1' }] }], minigames: [] };
  const removed = dedupeMembers(room, id => id === 'id9');
  assert.equal(Object.keys(room.members).length, 5);
  assert.equal(removed, names.length - 5);
  assert.ok(room.members.id1, 'Miko yang memiliki karakter dipertahankan');
  assert.ok(room.members.id9, 'DM yang sedang online dipertahankan');
  assert.equal(room.scenes[0].tokens[0].ownerId, 'id1');
  // Tanpa kepemilikan, yang paling baru terdaftar dipertahankan.
  assert.ok(room.members.id14 && !room.members.id3, 'Mariadi terbaru dipertahankan');
});

test('server: masuk lagi dengan nama sama tidak menambah anggota, karakter ikut pindah, data lama dirapikan saat start', async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'members-'));
  // Data lama yang sudah menumpuk: tiga "Miko" offline.
  writeFileSync(join(data, 'rooms.json'), JSON.stringify({
    OLD1: { id: 'OLD1', title: 'Lama', dmKey: 'k', map: null, tokens: [], messages: [], members: { m1: { name: 'Miko', secret: 'a' }, m2: { name: 'Miko', secret: 'b' }, m3: { name: 'miko', secret: 'c' } } },
  }));
  const port = 47000 + Math.floor(Math.random() * 1000), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const room = await (await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function connect(name, id, roomId = room.id) {
      const s = io(base); sockets.push(s);
      let state;
      s.on('room:state', r => { state = r; });
      await new Promise(r => s.once('connect', r));
      const res = await new Promise(r => s.emit('room:join', { roomId, name, playerId: id, playerSecret: 'secret-' + id }, r));
      assert.equal(res.ok, true, JSON.stringify(res));
      await new Promise(r => setTimeout(r, 250));
      return { s, get state() { return state; } };
    }
    // Data lama: tiga Miko sudah jadi satu.
    const old = await connect('Han', 'h-old', 'OLD1');
    assert.equal(old.state.members.filter(m => m.name.toLowerCase() === 'miko').length, 1);
    old.s.disconnect();

    const first = await connect('Miko', 'miko-1');
    first.s.disconnect();
    await new Promise(r => setTimeout(r, 200));
    // Masuk lagi dari "browser lain" (identitas baru) dengan nama sama, beda huruf besar kecil.
    const second = await connect('miko', 'miko-2');
    const watcher = await connect('Han', 'han-1');
    const mikos = watcher.state.members.filter(m => m.name.toLowerCase() === 'miko');
    assert.equal(mikos.length, 1, 'tidak ada anggota ganda');
    assert.equal(mikos[0].id, 'miko-2');
    // Dua perangkat online bersamaan dengan nama sama tidak saling menghapus.
    const third = await connect('Miko', 'miko-3');
    const both = third.state.members.filter(m => m.name.toLowerCase() === 'miko');
    assert.equal(both.length, 2);
    assert.ok(both.every(m => m.online));
    // Salah satu perangkat keluar: identitasnya digabung ke yang masih online, tidak tertinggal sebagai ganda.
    second.s.disconnect();
    await new Promise(r => setTimeout(r, 400));
    const after = watcher.state.members.filter(m => m.name.toLowerCase() === 'miko');
    assert.equal(after.length, 1, JSON.stringify(after));
    assert.equal(after[0].id, 'miko-3');
    assert.equal(after[0].online, true);
  } finally {
    sockets.forEach(s => s.disconnect());
    server.kill();
    await new Promise(r => server.once('exit', r));
    rmSync(data, { recursive: true, force: true });
  }
});
