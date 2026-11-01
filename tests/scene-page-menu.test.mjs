import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { io } from 'socket.io-client';

const source = readFileSync(new URL('../src/BoardTools.tsx', import.meta.url), 'utf8');
test('DM page menu separates preview cards from publishing the prepared scene', () => {
  assert.ok(source.includes('dm && pagesOpen'), 'page drawer must be DM-only');
  assert.ok(source.includes('aria-label="Menu scene"'));
  assert.ok(source.includes('aria-label="Tutup menu scene"'));
  assert.ok(source.includes('aria-controls="scene-page-menu"'));
  assert.ok(source.includes('publishedSceneId === page.id'));
  assert.ok(source.includes('scene.id === page.id'));
  assert.ok(source.includes('action({ type: "scene:activate", id: page.id })'));
  assert.ok(source.includes('action({ type: "scene:publish" })'));
  assert.ok(source.includes('setPagesOpen(false)'));
});

test('DM draft stays private until publication and player cannot activate scenes', { timeout: 20000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || process.cwd(), 'scene-menu-'));
  const port = 45000 + Math.floor(Math.random() * 1000);
  const base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  const pause = () => new Promise(resolve => setTimeout(resolve, 60));
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) { try { await fetch(base); ready = true; break; } catch { await pause(); } }
    assert.ok(ready, 'server starts');
    const room = await (await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function connect(id, dm = false) {
      const socket = io(base); sockets.push(socket);
      const peer = { socket, state: null };
      socket.on('room:state', state => { peer.state = state; });
      await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
      await new Promise(resolve => socket.emit('room:join', { roomId: room.id, playerId: id, playerSecret: `secret-${id}`, name: id, dmKey: dm ? room.dmKey : '' }, resolve));
      await pause();
      return peer;
    }
    const dm = await connect('dm', true), player = await connect('player');
    const initial = player.state.activeSceneId;
    const action = async (peer, payload) => {
      const result = await new Promise(resolve => peer.socket.emit('tabletop:action', { sceneId: peer.state.activeSceneId, ...payload }, resolve));
      await pause(); return result;
    };
    assert.equal((await action(dm, { type: 'scene:create', name: 'Private preparation' })).ok, true);
    const draft = dm.state.activeSceneId;
    assert.notEqual(draft, initial);
    assert.equal(dm.state.publishedSceneId, initial);
    assert.equal(player.state.activeSceneId, initial);
    assert.equal(player.state.scenes.length, 1);
    assert.ok(!player.state.scenes.some(scene => scene.id === draft));
    assert.equal((await action(dm, { type: 'grid', columns: 31 })).ok, true);
    assert.notEqual(player.state.scenes[0].grid.columns, 31);
    assert.ok((await action(player, { type: 'scene:activate', id: draft })).error);
    assert.ok((await action(player, { type: 'scene:publish' })).error);
    assert.equal((await action(dm, { type: 'scene:publish' })).ok, true);
    assert.equal(player.state.activeSceneId, draft);
    assert.equal(dm.state.publishedSceneId, draft);
    assert.equal(player.state.scenes[0].grid.columns, 31);
    assert.equal((await action(dm, { type: 'scene:activate', id: initial })).ok, true);
    assert.equal(dm.state.activeSceneId, initial);
    assert.equal(player.state.activeSceneId, draft);
  } finally {
    sockets.forEach(socket => socket.disconnect());
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill(); await exited;
    rmSync(data, { recursive: true, force: true });
  }
});
