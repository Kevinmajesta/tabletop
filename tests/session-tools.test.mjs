import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as characters from '../dist-server/characters.js';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { io } from 'socket.io-client';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('hit die, condition-adjusted rolls, NPC initiative and DM-only audio', { timeout: 40000 }, async () => {
  const data = mkdtempSync(path.join(process.env.TMPDIR, 'session-tools-'));
  const port = 49000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await delay(100); } }
    const room = await (await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function join(id, dm = false) {
      const socket = io(base); sockets.push(socket);
      const peer = { socket, state: null };
      socket.on('room:state', s => { peer.state = s; });
      socket.on('room:patch', ({ patch }) => { peer.state = { ...peer.state, ...patch }; });
      await new Promise(r => socket.once('connect', r));
      await new Promise(r => socket.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: `secret-${id}`, dmKey: dm ? room.dmKey : '' }, r));
      await delay(60);
      return peer;
    }
    const ack = (who, event, payload) => new Promise(r => who.socket.emit(event, payload, r));
    const owner = await join('owner'), dm = await join('dm', true);

    const build = { ...characters.emptyBuild(), name: 'Tester' };
    for (let i = 0; i < 6; i++) for (const group of characters.buildGroups(build)) if (!build.choices[group.key]) {
      const used = Object.values(build.choices).flat();
      build.choices[group.key] = group.options.filter(o => !['skill', 'language'].includes(group.kind) || !used.includes(o.id)).slice(0, group.count).map(o => o.id);
    }
    build.choices['background.bonus.one'] = ['wis'];
    assert.equal((await ack(owner, 'character:action', { type: 'create', build })).ok, true);
    await delay(80);
    const mine = () => owner.state.characters[0];

    // Hit Die: refuses at full HP, heals and spends one die when hurt.
    assert.match((await ack(owner, 'character:action', { type: 'hitdie', id: mine().id, revision: mine().revision })).error, /penuh/);
    assert.equal((await ack(owner, 'character:action', { type: 'resources', id: mine().id, revision: mine().revision, hp: 1 })).ok, true);
    await delay(60);
    assert.equal((await ack(owner, 'character:action', { type: 'hitdie', id: mine().id, revision: mine().revision })).ok, true);
    await delay(60);
    assert.ok(mine().hp > 1);
    assert.equal(mine().resourcesUsed['hit-dice'], 1);

    // Audio: a player is rejected; a DM can stop it.
    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }), 'a.mp3');
    const send = (id, extra = {}) => fetch(`${base}/api/rooms/${room.id}/audio`, { method: 'POST', headers: { 'x-player-id': id, 'x-player-secret': `secret-${id}`, ...extra }, body: form });
    assert.equal((await send('owner')).status, 403);
    assert.equal((await send('dm', { 'x-dm-key': room.dmKey })).status, 200);
    await delay(100);
    assert.match(owner.state.ambience.url, /^\/uploads\//);
    const sceneId = dm.state.activeSceneId;
    assert.ok((await ack(owner, 'tabletop:action', { sceneId, type: 'audio:stop' })).error);
    assert.equal((await ack(dm, 'tabletop:action', { sceneId, type: 'audio:stop' })).ok, true);
    await delay(60);
    assert.equal(owner.state.ambience, null);

    // NPC initiative: player rejected; DM rolls every non-character token into combat order.
    for (const name of ['n1', 'n2']) {
      const tf = new FormData();
      tf.append('image', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 't.png');
      tf.append('name', name);
      const r = await fetch(`${base}/api/rooms/${room.id}/upload/token`, { method: 'POST', headers: { 'x-player-id': 'dm', 'x-player-secret': 'secret-dm' }, body: tf });
      assert.equal(r.status, 200);
    }
    await delay(100);
    assert.ok((await ack(owner, 'tabletop:action', { sceneId, type: 'combat:roll-npc' })).error);
    assert.equal((await ack(dm, 'tabletop:action', { sceneId, type: 'combat:roll-npc' })).ok, true);
    await delay(80);
    const combat = dm.state.scenes.find(x => x.id === sceneId).combat;
    assert.equal(combat.active, true);
    assert.equal(combat.ids.length, 2);
    const inits = combat.ids.map(id => dm.state.scenes.find(x => x.id === sceneId).tokens.find(t => t.id === id).initiative);
    assert.ok(inits.every(n => n >= 1 && n <= 20) && inits[0] >= inits[1]);

    // Conditions: a linked Poisoned character rolls ability checks at disadvantage, and manual advantage cancels it.
    const lf = new FormData();
    lf.append('image', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 'c.png');
    lf.append('name', 'Hero');
    lf.append('characterId', mine().id);
    assert.equal((await fetch(`${base}/api/rooms/${room.id}/upload/token`, { method: 'POST', headers: { 'x-player-id': 'owner', 'x-player-secret': 'secret-owner' }, body: lf })).status, 200);
    await delay(100);
    const hero = dm.state.scenes.find(x => x.id === sceneId).tokens.find(t => t.characterId === mine().id);
    const upd = await ack(dm, 'tabletop:action', { sceneId, type: 'token:update', id: hero.id, conditions: ['Poisoned'], characterRevision: hero.characterRevision }); assert.ok(!upd?.error, JSON.stringify(upd));
    await delay(100);
    const lastRoll = () => owner.state.messages.filter(m => m.kind === 'roll').at(-1).text;
    assert.equal((await ack(owner, 'dice:roll', { characterId: mine().id, kind: 'ability', key: 'str', mode: 'normal' })).ok, true);
    await delay(300);
    assert.match(lastRoll(), /^disadvantage:.*disadvantage dari kondisi/);
    assert.equal((await ack(owner, 'dice:roll', { characterId: mine().id, kind: 'ability', key: 'str', mode: 'advantage' })).ok, true);
    await delay(300);
    assert.match(lastRoll(), /saling batal/);
    assert.doesNotMatch(lastRoll(), /^(advantage|disadvantage):/);
  } finally { sockets.forEach(s => s.close()); server.kill(); }
});
