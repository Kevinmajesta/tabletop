import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io } from 'socket.io-client';
import { emptyBuild, buildGroups, validateBuild } from '../dist-server/characters.js';

function makeBuild(name) {
  const build = { ...emptyBuild(), name };
  for (let i = 0; i < 6; i++) for (const group of buildGroups(build)) if (!build.choices[group.key]) {
    const used = Object.values(build.choices).flat();
    build.choices[group.key] = group.options.filter(o => !['skill', 'language'].includes(group.kind) || !used.includes(o.id)).slice(0, group.count).map(o => o.id);
  }
  build.choices['background.bonus.one'] = ['wis'];
  assert.deepEqual(validateBuild(build).errors, []);
  return build;
}

test('istirahat otomatis: Short Rest sheet memakai Hit Dice, Rest dari DM memulihkan party di peta, ringkasan di chat', async () => {
  const data = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'rest-'));
  const port = 45000 + Math.floor(Math.random() * 900), base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['dist-server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: data }, stdio: 'ignore' });
  const sockets = [];
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const room = await (await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    async function join(id, dm = false) {
      const s = io(base); sockets.push(s);
      let state;
      s.on('room:state', r => { state = r; });
      await new Promise(r => s.once('connect', r));
      await new Promise(r => s.emit('room:join', { roomId: room.id, name: id, playerId: id, playerSecret: 'secret-' + id, dmKey: dm ? room.dmKey : '' }, r));
      await new Promise(r => setTimeout(r, 120));
      return { s, get state() { return state; }, emit: (event, payload) => new Promise(r => s.emit(event, payload, r)) };
    }
    const settle = () => new Promise(r => setTimeout(r, 150));
    const dm = await join('dm', true), rana = await join('rana');
    // Rana punya dua karakter: satu di peta, satu cadangan (tidak di peta).
    const hero = await rana.emit('character:action', { type: 'create', build: makeBuild('Rana') });
    const spare = await rana.emit('character:action', { type: 'create', build: makeBuild('Cadangan') });
    assert.equal(hero.ok, true); assert.equal(spare.ok, true);
    const form = new FormData(); form.append('image', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 't.png'); form.append('name', 'Rana');
    await fetch(`${base}/api/rooms/${room.id}/upload/token`, { method: 'POST', headers: { 'x-player-id': 'rana', 'x-player-secret': 'secret-rana' }, body: form });
    await settle();
    const tokenId = rana.state.tokens.find(t => t.name === 'Rana').id;
    assert.equal((await rana.emit('character:action', { type: 'link', id: hero.id, tokenId })).ok, true);
    await settle();
    const char = id => rana.state.characters.find(c => c.id === id);
    const hurt = async (id, hp) => { assert.equal((await rana.emit('character:action', { type: 'resources', id, revision: char(id).revision, hp })).ok, true); await settle(); };
    const lastSystem = () => [...rana.state.messages].reverse().find(m => m.kind === 'system');

    // 1. Short Rest dari sheet dengan 2 Hit Dice.
    const max = char(hero.id).sheet.hp, level = char(hero.id).sheet.level;
    await hurt(hero.id, 1);
    const short = await rana.emit('character:action', { type: 'rest', rest: 'short', hitDice: 2, id: hero.id, revision: char(hero.id).revision });
    assert.equal(short.ok, true, JSON.stringify(short));
    await settle();
    const usedDice = char(hero.id).resourcesUsed?.['hit-dice'] || 0;
    assert.ok(usedDice >= 1 && usedDice <= Math.min(2, level), `Hit Dice terpakai: ${usedDice}`);
    assert.ok(char(hero.id).hp > 1, 'HP bertambah dari Hit Dice');
    assert.equal(lastSystem().name, 'Short Rest');
    assert.match(lastSystem().text, /Rana · HP 1 → \d+\/\d+ · \d Hit Dice d\d+/);
    assert.equal(rana.state.tokens.find(t => t.id === tokenId).hp, char(hero.id).hp, 'HP token ikut sinkron');

    // 2. Short/Long Rest dari menu Jeda DM hanya layar: HP, Hit Dice, dan chat tidak berubah.
    await hurt(hero.id, 2);
    const before = { hp: char(hero.id).hp, dice: char(hero.id).resourcesUsed?.['hit-dice'] || 0, messages: rana.state.messages.length };
    for (const kind of ['long', 'short']) {
      assert.equal((await dm.emit('tabletop:action', { sceneId: dm.state.activeSceneId, type: 'rest:start', kind, note: '' })).ok, true);
      await settle();
      assert.equal(rana.state.rest.kind, kind);
      assert.equal(char(hero.id).hp, before.hp, 'HP tidak dipulihkan oleh layar rest');
      assert.equal(char(hero.id).resourcesUsed?.['hit-dice'] || 0, before.dice);
      assert.equal(rana.state.messages.length, before.messages, 'tidak ada ringkasan rest di chat');
      await dm.emit('tabletop:action', { sceneId: dm.state.activeSceneId, type: 'rest:end' });
      await settle();
    }
    // Pemain tidak boleh memulai istirahat sendiri.
    assert.ok((await rana.emit('tabletop:action', { sceneId: rana.state.activeSceneId, type: 'rest:start', kind: 'long' })).error);
  } finally {
    sockets.forEach(s => s.disconnect());
    server.kill();
    await new Promise(r => server.once('exit', r));
    rmSync(data, { recursive: true, force: true });
  }
});
