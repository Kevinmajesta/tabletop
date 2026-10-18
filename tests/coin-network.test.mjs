import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';

test('coin flip broadcasts one server result without dice modifiers', async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'coin-'));
  const port = 46000 + Math.floor(Math.random() * 1000), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const room = await (await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function connect(id) {
      const s = io(base); sockets.push(s);
      await new Promise(r => s.once('connect', r));
      await new Promise(r => s.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: 'secret-' + id }, r));
      return s;
    }
    const a = await connect('a'), b = await connect('b');
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Coin result not broadcast')), 3000);
      b.on('room:state', state => {
        const message = state.messages.find(m => m.text.startsWith('Koin flip'));
        if (message) { clearTimeout(timer); resolve(message); }
      });
    });
    const animation = new Promise(r => b.once('coin:animation', r));
    const ack = await new Promise(r => a.emit('dice:roll', { expression: 'coin', mode: 'advantage', modifier: 99 }, r));
    assert.equal(ack.ok, true);
    const message = await result;
    assert.match(message.text, /^Koin flip → (Angka|Gambar)$/);
    assert.equal(message.name, 'a');
    assert.equal(message.kind, 'roll');
    assert.equal(message.roll, undefined);
    const visual = await animation;
    assert.equal(visual.id, message.id);
    assert.equal(visual.name, message.name);
    assert.equal(message.text, `Koin flip → ${visual.face}`);
  } finally {
    sockets.forEach(s => s.disconnect());
    server.kill();
    await new Promise(r => server.once('exit', r));
    rmSync(data, { recursive: true, force: true });
  }
});
