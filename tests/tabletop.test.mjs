import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';

test('DM and player share room, enforce map permissions, move tokens, chat and roll', async () => {
  const port = 32000 + Math.floor(Math.random() * 10000);
  const base = `http://127.0.0.1:${port}`;
  const testData = mkdtempSync(path.join(tmpdir(), 'meja-petualang-'));
  const server = spawn(process.execPath, process.env.TEST_DEV ? ['--import', 'tsx', 'server/index.ts'] : ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: testData }, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverOutput = '';
  server.stdout.on('data', chunk => { serverOutput += chunk; });
  server.stderr.on('data', chunk => { serverOutput += chunk; });
  const sockets = [];
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(`Server exited unexpectedly: ${serverOutput}`);
      try { await fetch(base); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(ready, `server starts: ${serverOutput}`);
    const created = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Test Campaign' }) });
    const { id, dmKey } = await created.json();
    assert.ok(id && dmKey);
    const connect = async (name, playerId, dmKeyValue) => {
      const socket = io(base);
      sockets.push(socket);
      await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
      const result = await new Promise(resolve => socket.emit('room:join', { roomId: id, name, playerId, playerSecret: `secret-${playerId}`, dmKey: dmKeyValue }, resolve));
      assert.equal(result.ok, true);
      return { socket, result };
    };
    const dm = await connect('DM', 'dm', dmKey);
    const player = await connect('Player', 'player');
    assert.equal(dm.result.isDM, true);
    assert.equal(player.result.isDM, false);
    const waitState = (socket, condition) => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { socket.off('room:state', listener); reject(new Error('State update timed out')); }, 2500);
      function listener(state) { if (condition(state)) { clearTimeout(timeout); socket.off('room:state', listener); resolve(state); } }
      socket.on('room:state', listener);
    });
    const image = new Blob([Uint8Array.from([137, 80, 78, 71])], { type: 'image/png' });
    const upload = async (kind, who, key) => {
      const form = new FormData(); form.append('image', image, 'sample.png'); form.append('name', 'Hero');
      return fetch(`${base}/api/rooms/${id}/upload/${kind}`, { method: 'POST', headers: { 'x-player-id': who, 'x-player-secret': `secret-${who}`, 'x-dm-key': key || '' }, body: form });
    };
    assert.equal((await upload('map', 'player')).status, 403);
    const mapState = waitState(player.socket, state => !!state.map);
    assert.equal((await upload('map', 'dm', dmKey)).status, 200);
    assert.ok((await mapState).map.startsWith('/uploads/'));
    const tokenState = waitState(dm.socket, state => state.tokens.length === 1);
    assert.equal((await upload('token', 'player')).status, 200);
    const token = (await tokenState).tokens[0];
    const resizedState = waitState(dm.socket, state => state.tokens[0].size === 2);
    player.socket.emit('token:resize', { id: token.id, size: 2 });
    assert.equal((await resizedState).tokens[0].size, 2);
    const clampedState = waitState(player.socket, state => state.tokens[0].size === 6);
    dm.socket.emit('token:resize', { id: token.id, size: 99 });
    assert.equal((await clampedState).tokens[0].size, 6);
    const outsider = await connect('Other player', 'outsider');
    outsider.socket.emit('token:resize', { id: token.id, size: 3 });
    player.socket.emit('token:resize', { id: token.id, size: 'invalid' });
    await new Promise(resolve => setTimeout(resolve, 100));
    const wrongMove = waitState(dm.socket, state => state.tokens[0].x === 25);
    dm.socket.emit('token:move', { id: token.id, x: 25, y: 30 });
    assert.equal((await wrongMove).tokens[0].size, 6, 'unauthorized and invalid resize ignored');
    const movedState = waitState(dm.socket, state => state.tokens[0].x === 75);
    player.socket.emit('token:move', { id: token.id, x: 75, y: 75 });
    const moved = await movedState;
    assert.equal(moved.tokens[0].y, 75);
    const chatState = waitState(dm.socket, state => state.messages.some(m => m.text === 'Halo party'));
    player.socket.emit('chat:send', 'Halo party');
    assert.equal((await chatState).messages.at(-1).name, 'Player');
    const rollState = waitState(player.socket, state => state.messages.some(m => m.kind === 'roll'));
    const animation = socket => new Promise(resolve => socket.once('dice:animation', resolve));
    const dmAnimation = animation(dm.socket);
    const playerAnimation = animation(player.socket);
    dm.socket.emit('dice:roll', '1d20+3');
    const message = (await rollState).messages.at(-1);
    assert.match(message.text, /1d20\+3 → \[\d+\] \+ 3 = \d+/);
    const trajectory = await dmAnimation;
    assert.deepEqual(trajectory, await playerAnimation);
    assert.equal(trajectory.id, message.id);
    assert.deepEqual(trajectory.roll.values, message.roll.values);
    assert.equal(trajectory.roll.total, message.roll.total);
    assert.ok(trajectory.roll.frames.length > 1);
    assert.equal(message.roll.frames, undefined, 'trajectory not persisted into chat history');
    const cooldown = await new Promise(resolve => dm.socket.emit('dice:roll', '1d20', resolve));
    assert.ok(cooldown.error);
    const otherRoom = await (await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    const other = io(base); sockets.push(other);
    await new Promise((resolve, reject) => { other.once('connect', resolve); other.once('connect_error', reject); });
    await new Promise(resolve => other.emit('room:join', { roomId: otherRoom.id, name: 'Other room', playerId: 'other', playerSecret: 'other-secret' }, resolve));
    await new Promise(resolve => setTimeout(resolve, 1600));
    const pendingRoll = new Promise(resolve => dm.socket.emit('dice:roll', '20d100', resolve));
    await new Promise(resolve => setTimeout(resolve, 50));
    const blockedOther = await new Promise(resolve => other.emit('dice:roll', '20d100', resolve));
    assert.ok(blockedOther.error, 'same caller cannot consume another worker across rooms');
    const pendingResult = await pendingRoll;
    assert.ok(pendingResult.ok || pendingResult.error, 'heavy roll completes or rejects without blocking server');
    const allowedOther = await new Promise(resolve => other.emit('dice:roll', '1d6', resolve));
    assert.equal(allowedOther.ok, true, 'another room can roll after worker is released');
    const rejoin = await new Promise(resolve => player.socket.emit('room:join', { roomId: id, name: 'Imposter', playerId: 'dm', playerSecret: 'wrong' }, resolve));
    assert.ok(rejoin.error);
  } finally {
    for (const socket of sockets) socket.disconnect();
    server.kill();
    await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
    rmSync(testData, { recursive: true, force: true });
  }
});
