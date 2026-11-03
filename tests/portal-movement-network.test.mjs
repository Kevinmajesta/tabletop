import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { io } from 'socket.io-client';
import { newScene, visible } from '../dist-server/tabletop.js';

const cases = [
  ['wall', false], ['door', false], ['door', true], ['window', false], ['window', true],
].flatMap(([kind, open]) => [false, true].map(vision => ({ kind, open, vision })));

test('two sockets enforce walls and portals regardless of vision, preserve ownership and allow DM bypass', { timeout: 30000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'portal-movement-'));
  const rooms = Object.fromEntries(cases.map(({ kind, open, vision }, i) => {
    const id = `PORTAL${i}`, scene = newScene('Barrier', 'scene');
    scene.vision = vision;
    scene.tokens = [
      { id: 'hero', ownerId: 'player', name: 'Hero', image: '', x: 20, y: 50, visionSource: true, visionRange: 41 },
      { id: 'other', ownerId: 'dm', name: 'Other', image: '', x: 25, y: 50 },
      { id: 'beyond', ownerId: 'dm', name: 'Beyond', image: '', x: 60, y: 50 },
    ];
    scene.marks = [{ id: 'barrier', ownerId: 'dm', kind, open, a: { x: 50, y: 0 }, b: { x: 50, y: 100 }, text: '' }];
    return [id, { id, title: id, dmKey: 'dm-key', map: null, members: {}, messages: [], tokens: scene.tokens, scenes: [scene], activeSceneId: scene.id, preparedSceneId: scene.id }];
  }));
  writeFileSync(join(data, 'rooms.json'), JSON.stringify(rooms));
  const port = 48000 + Math.floor(Math.random() * 1000), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  server.stdout.on('data', chunk => output += chunk);
  server.stderr.on('data', chunk => output += chunk);
  const sockets = [];
  const nextState = socket => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('room:state', receive); reject(new Error('room:state timeout')); }, 3000);
    const receive = state => { clearTimeout(timer); resolve(state); };
    socket.once('room:state', receive);
  });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { await fetch(base); ready = true; break; }
      catch { if (server.exitCode !== null) break; await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(ready, `isolated server did not start: ${output}`);
    for (const playerId of ['dm', 'player']) {
      const socket = io(base, { transports: ['websocket'], reconnection: false, timeout: 3000 });
      sockets.push(socket);
      await once(socket, 'connect');
    }
    const [dm, player] = sockets;
    for (const [i, { kind, open, vision }] of cases.entries()) {
      const roomId = `PORTAL${i}`, label = `${kind} open=${open} vision=${vision}`;
      const joinRoom = (socket, playerId) => new Promise((resolve, reject) => {
        socket.timeout(3000).emit('room:join', { roomId, playerId, name: playerId === 'dm' ? 'DM' : 'Player', playerSecret: `secret-${playerId}` }, (error, result) => {
          if (error) return reject(error);
          try {
            assert.equal(result.ok, true, JSON.stringify(result));
            assert.equal(result.isDM, playerId === 'dm');
            // Ignore queued peer broadcasts; the join's state follows its acknowledgement.
            nextState(socket).then(resolve, reject);
          } catch (error) { reject(error); }
        });
      });
      await joinRoom(dm, 'dm');
      let state = await joinRoom(player, 'player');
      const scene = rooms[roomId].scenes[0];
      if (vision) assert.equal(visible(scene.marks[0].a, scene, 'player'), false, `${label}: endpoint outside vision`);
      assert.deepEqual(state.scenes[0].marks, scene.marks, `${label}: collision/fog geometry retained`);
      const allowed = kind !== 'wall' && open;
      assert.equal(state.tokens.some(token => token.id === 'beyond'), !vision || allowed, `${label}: vision through barrier`);
      player.emit('token:move', { id: 'other', x: 30, y: 50 });
      player.emit('token:move', { id: 'hero', x: 60, y: 50 });
      state = await joinRoom(player, 'player'); // Same-socket ordering flushes both movement attempts.
      assert.equal(state.tokens.find(token => token.id === 'hero').x, allowed ? 60 : 20, `${label}: player crossing`);
      assert.equal(state.tokens.find(token => token.id === 'other').x, 25, `${label}: ownership enforced`);
      dm.emit('token:move', { id: 'hero', x: allowed ? 20 : 60, y: 50 });
      state = await joinRoom(dm, 'dm');
      assert.equal(state.tokens.find(token => token.id === 'hero').x, allowed ? 20 : 60, `${label}: DM bypass`);
    }
  } finally {
    sockets.forEach(socket => socket.disconnect());
    if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
    rmSync(data, { recursive: true, force: true });
  }
});
