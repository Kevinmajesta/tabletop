import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('held pointer keeps broadcasting beyond 60 moves and always releases', { timeout: 15000 }, async () => {
  const data = mkdtempSync(join(tmpdir(), 'map-pointer-'));
  const port = 45000 + Math.floor(Math.random() * 1000), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await pause(100); } }
    const room = await (await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    for (const id of ['dm', 'player']) {
      const socket = io(base); sockets.push(socket);
      await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
      await new Promise(resolve => socket.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: `secret-${id}`, dmKey: id === 'dm' ? room.dmKey : '' }, resolve));
    }
    const [dm, player] = sockets;
    // Obtain the scene from the normal state stream, not an assumed scene id.
    const nextState = new Promise(resolve => dm.once('room:state', resolve));
    dm.emit('room:join', { roomId: room.id, name: 'dm', playerId: 'dm', playerSecret: 'secret-dm', dmKey: room.dmKey }, () => {});
    const sceneId = (await nextState).activeSceneId;
    const events = [];
    player.on('tabletop:pointer', event => events.push(event));
    for (let i = 0; i < 100; i++) dm.emit('tabletop:pointer', { sceneId, x: i % 100, y: 30, active: true });
    dm.emit('tabletop:pointer', { sceneId, x: 99, y: 30, active: false });
    await pause(500);
    assert.equal(events.filter(event => event.active).length, 100);
    assert.equal(events.at(-1).active, false);
  } finally {
    sockets.forEach(socket => socket.disconnect());
    server.kill();
    await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
    rmSync(data, { recursive: true, force: true });
  }
});

function gesture() {
  const source = readFileSync(new URL('../src/BoardTools.tsx', import.meta.url), 'utf8');
  const effect = source.match(/useEffect\(\(\) => \{\s*let active = false;[\s\S]*?\n  \}, \[connected,[^\n]+/)[0];
  const listeners = new Map(), sent = [];
  let local = null;
  const cleanup = runInNewContext(ts.transpileModule(effect, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    useEffect: callback => callback(), connected: true, scene: { id: 'scene' }, playerId: 'self',
    socket: { emit: (_, payload) => sent.push(payload) },
    svg: { current: { getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }) } },
    pointerThrottle: { current: 0 }, performance: { now: () => 100 },
    setLocalPointer: value => { local = value; },
    window: { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) },
  });
  const fire = (type, overrides = {}) => listeners.get(type)?.({ button: 2, buttons: 2, clientX: 20, clientY: 30, preventDefault() {}, ...overrides });
  return { fire, sent, cleanup, get local() { return local; } };
}

test('own pointer moves immediately even between network updates', () => {
  const g = gesture();
  g.fire('pointerdown');
  g.fire('pointermove', { clientX: 40 });
  g.fire('pointermove', { clientX: 50 });
  assert.equal(g.local?.x, 50);
});

for (const end of ['pointerup', 'pointercancel', 'blur']) test(`pointer clears on ${end}, including outside map`, () => {
  const g = gesture();
  g.fire('pointerdown');
  g.fire(end, { clientX: 150 });
  assert.equal(g.sent.at(-1).active, false);
  assert.equal(g.local, null);
});

test('lost right-button release clears on the next move', () => {
  const g = gesture();
  g.fire('pointerdown');
  g.fire('pointermove', { buttons: 0 });
  assert.equal(g.sent.at(-1).active, false);
});
