import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { blocksMovement } from '../dist-server/tabletop.js';

const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const move = source.slice(source.indexOf('  function moveToken('), source.indexOf('  function finishDrag('));
test('optimistic player drag cannot cross barriers while DM and open portals can', () => {
  for (const kind of ['wall', 'door', 'window']) for (const open of [false, true]) for (const isDM of [false, true]) {
    const token = { id: 'hero', x: 20, y: 50 };
    let room = { tokens: [token], scenes: [] }, emitted = 0;
    const activeScene = { marks: [{ kind, open, a: { x: 40, y: 0 }, b: { x: 40, y: 100 } }] };
    runInNewContext(ts.transpileModule(`${move}\nmoveToken({});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      room, activeScene, isDM, blocksMovement,
      dragging: { current: 'hero' }, mapRef: { current: {} }, tokenPosition: () => ({ x: 60, y: 50 }),
      performance: { now: () => 100 }, lastTokenMove: { current: 0 },
      socketRef: { current: { emit: () => emitted++ } },
      setMovement() {}, setRoom: fn => { room = fn(room); },
    });
    const allowed = isDM || (kind !== 'wall' && open);
    assert.equal(room.tokens[0].x, allowed ? 60 : 20, `${kind} open=${open} dm=${isDM}`);
    assert.equal(emitted, allowed ? 1 : 0);
  }
});
