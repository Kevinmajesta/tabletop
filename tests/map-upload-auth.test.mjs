import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { io } from 'socket.io-client';

const pause = () => new Promise(resolve => setTimeout(resolve, 60));

test('map uploads use authenticated socket DM semantics', { timeout: 20000 }, async t => {
  const data = mkdtempSync(join(process.env.TMPDIR, 'map-upload-auth-'));
  const port = 47000 + Math.floor(Math.random() * 1000);
  const base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], {
    env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore',
  });
  const sockets = [];
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { await fetch(base); ready = true; break; } catch { await pause(); }
    }
    assert.ok(ready, 'isolated server starts');
    const room = await (await fetch(`${base}/api/rooms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })).json();
    async function connect(id, name, dmKey = '') {
      const socket = io(base); sockets.push(socket);
      const peer = { socket, state: null };
      socket.on('room:state', state => { peer.state = state; });
      await new Promise((resolve, reject) => {
        socket.once('connect', resolve); socket.once('connect_error', reject);
      });
      peer.join = await new Promise(resolve => socket.emit('room:join', {
        roomId: room.id, playerId: id, playerSecret: `secret-${id}`, name, dmKey,
      }, resolve));
      return peer;
    }
    const player = await connect('player', 'Player');
    const keyed = await connect('keyed', 'Game master', room.dmKey);
    const named = await connect('named', 'Dm');
    assert.equal(player.join.isDM, false);
    assert.equal(keyed.join.isDM, true);
    assert.equal(named.join.isDM, true);
    async function upload(id, headers = {}) {
      const form = new FormData();
      form.append('image', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 'map.png');
      return fetch(`${base}/api/rooms/${room.id}/upload/map`, {
        method: 'POST', headers: { 'x-player-id': id, 'x-player-secret': `secret-${id}`, ...headers }, body: form,
      });
    }
    await t.test('ordinary player and forged name header are denied before storing files', async () => {
      assert.equal((await upload('player')).status, 403);
      assert.equal((await upload('player', { 'x-player-name': 'dm', 'x-dm-key': 'invalid' })).status, 403);
      assert.deepEqual(readdirSync(join(data, 'uploads')), []);
    });
    await t.test('invalid member secret is denied even with DM name or valid key', async () => {
      assert.equal((await upload('named', { 'x-player-secret': 'wrong' })).status, 403);
      assert.equal((await upload('keyed', { 'x-player-secret': 'wrong', 'x-dm-key': room.dmKey })).status, 403);
      assert.deepEqual(readdirSync(join(data, 'uploads')), []);
    });
    await t.test('key DM may upload a map', async () => {
      assert.equal((await upload('keyed', { 'x-dm-key': room.dmKey })).status, 200);
    });
    await t.test('authenticated named DM may upload without a key to the prepared scene', async () => {
      const result = await new Promise(resolve => named.socket.emit('tabletop:action', { sceneId: named.state.activeSceneId, type: 'scene:create', name: 'Draft' }, resolve));
      assert.equal(result.ok, true);
      await pause();
      const draft = named.state.activeSceneId;
      assert.notEqual(draft, named.state.publishedSceneId);
      const updated = new Promise(resolve => named.socket.once('room:state', resolve));
      assert.equal((await upload('named')).status, 200);
      const state = await updated;
      assert.equal(state.activeSceneId, draft);
      assert.match(state.map, /^\/uploads\//);
      assert.match(state.scenes.find(scene => scene.id === draft).map, /^\/uploads\//);
    });
  } finally {
    sockets.forEach(socket => socket.disconnect());
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill(); await exited;
    rmSync(data, { recursive: true, force: true });
  }
});
