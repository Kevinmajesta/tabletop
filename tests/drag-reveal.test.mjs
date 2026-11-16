import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { io } from 'socket.io-client';
import { newScene } from '../dist-server/tabletop.js';

// GM menyeret token (mis. token minigame) dari luar pandangan ke dalam pandangan pemain.
// Pesan seret final:false sudah memindah token, pesan final:true di titik yang sama
// tetap harus mengirim state lengkap supaya token muncul tanpa refresh.
test('token yang diseret GM ke pandangan pemain langsung muncul di layar pemain', { timeout: 30000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'drag-reveal-'));
  const scene = newScene('Aula', 'scene');
  scene.vision = true;
  scene.tokens = [
    { id: 'hero', ownerId: 'player', name: 'Hero', image: '', x: 20, y: 50, visionSource: true, visionRange: 20 },
    { id: 'game', ownerId: 'dm', name: 'Perjamuan', image: '', x: 85, y: 50, minigame: 'lich', size: 1.5 },
  ];
  const rooms = { DRAG: { id: 'DRAG', title: 'DRAG', dmKey: 'dm-key', map: null, members: {}, messages: [], tokens: scene.tokens, scenes: [scene], activeSceneId: scene.id, preparedSceneId: scene.id, minigames: [] } };
  writeFileSync(join(data, 'rooms.json'), JSON.stringify(rooms));
  const port = 49000 + Math.floor(Math.random() * 1000), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  server.stdout.on('data', chunk => output += chunk);
  server.stderr.on('data', chunk => output += chunk);
  const sockets = [];
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { await fetch(base); ready = true; break; }
      catch { if (server.exitCode !== null) break; await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(ready, `server tidak jalan: ${output}`);
    const join = async playerId => {
      const socket = io(base, { transports: ['websocket'], reconnection: false, timeout: 3000 });
      sockets.push(socket);
      await once(socket, 'connect');
      const states = [];
      socket.on('room:state', state => states.push(state));
      const result = await socket.timeout(3000).emitWithAck('room:join', { roomId: 'DRAG', playerId, name: playerId, playerSecret: `secret-${playerId}` });
      assert.equal(result.ok, true, JSON.stringify(result));
      return { socket, states };
    };
    const dm = await join('dm');
    const player = await join('player');
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(player.states.at(-1).tokens.some(t => t.id === 'game'), false, 'awalnya di luar pandangan');
    const before = player.states.length;
    dm.socket.emit('token:move', { id: 'game', x: 50, y: 50, final: false });
    dm.socket.emit('token:move', { id: 'game', x: 30, y: 50, final: false });
    dm.socket.emit('token:move', { id: 'game', x: 30, y: 50, final: true });
    for (let i = 0; i < 30 && player.states.length === before; i++) await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(player.states.length > before, 'pemain menerima state baru setelah GM melepas token');
    assert.equal(player.states.at(-1).tokens.some(t => t.id === 'game'), true, 'token minigame muncul');
  } finally {
    sockets.forEach(socket => socket.disconnect());
    server.kill();
    rmSync(data, { recursive: true, force: true });
  }
});

test('token minigame di luar tabel terlihat dari semua sisi dinding; di dalam tabel tetap ikut aturan pandangan', async () => {
  const { seesToken, offTableAllowed } = await import('../dist-server/tabletop.js');
  const scene = newScene('Dua', 'scene');
  scene.vision = true;
  scene.tokens = [{ id: 'kiri', ownerId: 'a', name: 'A', image: '', x: 20, y: 50, visionSource: true, visionRange: 60 }];
  scene.marks = [{ id: 'w', ownerId: 'dm', kind: 'wall', a: { x: 47.43, y: 0 }, b: { x: 47.43, y: 100 }, text: '' }];
  const game = { id: 'g', ownerId: 'dm', name: 'Dua Ruangan', image: '', minigame: 'cooprooms', x: 47.5, y: 50 };
  assert.equal(seesToken(game, scene, 'a'), false, 'di atas dinding, sisi seberang: tidak terlihat');
  assert.equal(seesToken({ ...game, x: -3 }, scene, 'a'), true, 'di luar tabel: terlihat');
  assert.equal(seesToken({ ...game, x: 50, y: 104 }, scene, 'a'), true, 'di luar tabel bawah: terlihat');
  assert.equal(seesToken({ ...game, x: 104 }, scene, 'a'), true, 'di luar tabel seberang dinding: terlihat');
  assert.equal(seesToken({ ...game, minigame: undefined, x: 104 }, scene, 'a'), false, 'token biasa tidak dapat pengecualian');
  assert.equal(offTableAllowed(game), true);
  assert.equal(offTableAllowed({ ...game, minigame: undefined }), false);
});
