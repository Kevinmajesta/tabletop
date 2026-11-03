import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { io } from 'socket.io-client';

const pause = (ms = 60) => new Promise(resolve => setTimeout(resolve, ms));

test('DM handout upload is shown to players; player upload is rejected', { timeout: 20000 }, async () => {
  const data = mkdtempSync(join(process.env.TMPDIR, 'handout-'));
  const port = 48000 + Math.floor(Math.random() * 1000);
  const base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await pause(); } }
    const room = await (await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function connect(id, name, dmKey = '') {
      const socket = io(base); sockets.push(socket);
      const peer = { socket, state: null };
      socket.on('room:state', s => { peer.state = s; });
      socket.on('room:patch', ({ patch }) => { peer.state = { ...peer.state, ...patch }; });
      await new Promise(r => socket.once('connect', r));
      await new Promise(r => socket.emit('room:join', { roomId: room.id, playerId: id, playerSecret: `secret-${id}`, name, dmKey }, r));
      return peer;
    }
    const player = await connect('p', 'Player');
    const dm = await connect('d', 'Game master', room.dmKey);
    const send = (id, extra = {}) => {
      const form = new FormData();
      form.append('image', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 'h.png');
      return fetch(`${base}/api/rooms/${room.id}/upload/handout`, { method: 'POST', headers: { 'x-player-id': id, 'x-player-secret': `secret-${id}`, ...extra }, body: form });
    };
    assert.equal((await send('p')).status, 403);
    await pause(200);
    assert.ok(!player.state.shownImage);
    assert.equal((await send('d', { 'x-dm-key': room.dmKey })).status, 200);
    await pause(300);
    assert.match(player.state.shownImage, /^\/uploads\//);
    assert.equal(player.state.shownImage, dm.state.shownImage);
  } finally { sockets.forEach(s => s.close()); server.kill(); }
});
