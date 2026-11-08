import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { io } from 'socket.io-client';
import { monsters, monsterTokens, monsterImage } from '../dist-server/monsters.js';
import { weathers } from '../dist-server/tabletop.js';

test('daftar monster lengkap dan token bernomor berlanjut', () => {
  assert.ok(monsters.length >= 15);
  for (const m of monsters) {
    assert.ok(m.ac > 0 && m.hp > 0, m.name);
    assert.equal(monsterImage(m), `/monsters/${m.key}.svg`);
    assert.ok(existsSync(new URL(`../public/monsters/${m.key}.svg`, import.meta.url)), `token ${m.name} ada`);
  }
  const goblin = monsters.find(m => m.key === 'goblin');
  let n = 0;
  const first = monsterTokens(goblin, 2, [], { x: 50, y: 50 }, 'dm', false, () => `id${n++}`);
  assert.deepEqual(first.map(t => t.name), ['Goblin 1', 'Goblin 2']);
  assert.ok(first.every(t => t.ac === 15 && t.hp === 7 && t.maxHp === 7 && t.initBonus === 2 && t.monster === 'goblin'));
  const more = monsterTokens(goblin, 1, first, { x: 50, y: 50 }, 'dm', true, () => `id${n++}`);
  assert.equal(more[0].name, 'Goblin 3');
  assert.equal(more[0].hidden, true);
  assert.deepEqual([...weathers], ['rain', 'storm', 'snow', 'fog', 'night', 'torch']);
});

test('server: suasana scene, monster cepat, AC rahasia, initiative dengan bonus', { timeout: 30000 }, async t => {
  const data = mkdtempSync(join(tmpdir(), 'weather-monsters-'));
  const port = 48000 + Math.floor(Math.random() * 1000);
  const base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  t.after(() => { for (const s of sockets) s.close(); server.kill(); rmSync(data, { recursive: true, force: true }); });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base + '/api/token-screen')).status < 500) break; } catch {} await new Promise(r => setTimeout(r, 100)); }

  const lobby = await (await fetch(base + '/api/hero-lobby', { method: 'POST' })).json();
  const joinRoom = who => new Promise((resolve, reject) => {
    const s = io(base, { transports: ['websocket'] });
    sockets.push(s);
    const box = { s, room: null };
    s.on('room:state', r => { box.room = r; });
    s.on('connect', () => s.emit('room:join', { roomId: lobby.id, ...who }, res => (res?.error ? reject(new Error(res.error)) : resolve(box))));
  });
  const dm = await joinRoom({ name: 'DM', playerId: randomUUID(), playerSecret: randomUUID(), dmKey: lobby.dmKey });
  const pl = await joinRoom({ name: 'Rana', playerId: randomUUID(), playerSecret: randomUUID() });
  const settle = () => new Promise(r => setTimeout(r, 250));
  await settle();
  const sceneId = () => dm.room.scenes.find(s => s.id === dm.room.activeSceneId).id;
  const act = (box, payload) => new Promise(r => box.s.emit('tabletop:action', { sceneId: sceneId(), ...payload }, r));
  const sceneOf = box => box.room.scenes.find(s => s.id === box.room.activeSceneId);

  assert.deepEqual(await act(dm, { type: 'scene:settings', weather: 'rain' }), { ok: true });
  await settle();
  assert.equal(sceneOf(dm).weather, 'rain');
  assert.equal(sceneOf(pl).weather, 'rain', 'pemain melihat suasana yang sama');
  await act(dm, { type: 'scene:settings', weather: 'tornado' });
  await settle();
  assert.equal(sceneOf(dm).weather, 'rain', 'nilai asing diabaikan');
  await act(dm, { type: 'scene:settings', weather: '' });
  await settle();
  assert.equal(sceneOf(dm).weather, undefined);

  assert.ok((await act(pl, { type: 'token:monster', monster: 'goblin', count: 1 })).error, 'pemain tidak boleh menambah monster');
  assert.deepEqual(await act(dm, { type: 'token:monster', monster: 'goblin', count: 3 }), { ok: true });
  await settle();
  const goblins = sceneOf(dm).tokens.filter(tk => tk.monster === 'goblin');
  assert.deepEqual(goblins.map(g => g.name), ['Goblin 1', 'Goblin 2', 'Goblin 3']);
  assert.ok(goblins.every(g => g.ac === 15 && g.initBonus === 2));
  const seen = sceneOf(pl).tokens.filter(tk => tk.monster === 'goblin');
  assert.equal(seen.length, 3);
  assert.ok(seen.every(g => g.ac === undefined && g.initBonus === undefined), 'AC monster rahasia DM');

  assert.deepEqual(await act(dm, { type: 'combat:roll-npc' }), { ok: true });
  await settle();
  for (const g of sceneOf(dm).tokens.filter(tk => tk.monster === 'goblin')) assert.ok(g.initiative >= 3 && g.initiative <= 22, `initiative ${g.initiative}`);

  assert.deepEqual(await act(dm, { type: 'token:update', id: goblins[0].id, ac: 17 }), { ok: true });
  await settle();
  assert.equal(sceneOf(dm).tokens.find(tk => tk.id === goblins[0].id).ac, 17);
});
