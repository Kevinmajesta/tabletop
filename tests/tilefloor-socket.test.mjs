import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';

// End-to-end: server nyata + 1 GM + 4 pemain, dua token Lantai Ubin berjalan paralel.
test('Lantai Ubin: 2 pasangan paralel lewat Socket.IO, jalur tersembunyi dari Pejalan', async () => {
  const port = 42000 + Math.floor(Math.random() * 10000);
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: mkdtempSync(path.join(tmpdir(), 'tile-')) }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const { id, dmKey } = await (await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'T' }) })).json();
    const connect = async (playerId, key) => {
      const socket = io(base); sockets.push(socket);
      await new Promise((res, rej) => { socket.once('connect', res); socket.once('connect_error', rej); });
      const r = await new Promise(res => socket.emit('room:join', { roomId: id, name: playerId, playerId, playerSecret: `s-${playerId}`, dmKey: key }, res));
      assert.equal(r.ok, true);
      const box = { state: null }; socket.on('room:state', s => { box.state = s; });
      return { socket, box };
    };
    const gm = await connect('gm', dmKey);
    const [g1, w1, g2, w2] = await Promise.all(['g1', 'w1', 'g2', 'w2'].map(p => connect(p)));
    const act = (c, a) => new Promise(res => c.socket.emit('minigame:action', a, res));
    const until = async (fn) => { for (let i = 0; i < 60; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 50)); } throw new Error('timeout'); };
    assert.equal((await act(gm, { type: 'create', kind: 'tilefloor' })).ok, true);
    assert.equal((await act(gm, { type: 'create', kind: 'tilefloor' })).ok, true);
    await until(() => gm.box.state?.minigames?.length === 2);
    const [A, B] = gm.box.state.minigames.map(m => m.tokenId);
    assert.equal((await act(gm, { type: 'declare', tokenId: A, players: ['g1', 'w1'] })).ok, true);
    assert.equal((await act(gm, { type: 'declare', tokenId: B, players: ['g2', 'w2'] })).ok, true);
    assert.equal((await act(gm, { type: 'start', tokenId: A })).ok, true);
    assert.equal((await act(gm, { type: 'start', tokenId: B })).ok, true);
    const game = (c, t) => c.box.state?.minigames?.find(m => m.tokenId === t);
    await until(() => game(g1, A)?.tiles && game(w2, B)?.tiles && game(g2, B)?.tiles && game(w1, A)?.tiles && game(gm, A)?.tiles?.path);
    assert.ok(game(g1, A).tiles.ruleTexts.length >= 1 && !game(g1, A).tiles.faces);
    assert.ok(game(w1, A).tiles.faces && !game(w1, A).tiles.ruleTexts);
    assert.equal(game(w1, A).tiles.path, undefined); assert.equal(game(g1, A).tiles.path, undefined);
    const pathA = game(gm, A).tiles.path, pathB = game(gm, B).tiles.path;
    assert.ok((await act(g1, { type: 'tile:step', tokenId: A, cell: pathA[1] })).error);
    assert.ok((await act(w2, { type: 'tile:step', tokenId: A, cell: pathA[1] })).error);
    for (let i = 1; i < pathA.length; i++) assert.equal((await act(w1, { type: 'tile:step', tokenId: A, cell: pathA[i] })).ok, true);
    await until(() => game(g1, A).phase === 'finished');
    assert.equal(game(g2, B).phase, 'open');
    assert.equal(game(w2, B).tiles.pos, pathB[0]);
    for (let i = 1; i < pathB.length; i++) assert.equal((await act(w2, { type: 'tile:step', tokenId: B, cell: pathB[i] })).ok, true);
    await until(() => game(g2, B).phase === 'finished');
  } finally { sockets.forEach(s => s.close()); server.kill(); }
});
