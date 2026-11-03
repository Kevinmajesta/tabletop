import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
test('each dice result disappears two seconds after reveal without removing newer rolls', () => {
  const effect = source.slice(source.indexOf('  useEffect(() => {\n    const active = diceAnimations'), source.indexOf('  function finishAnimation'));
  let now = 1000, callback, delay, cleanup;
  let animations = [{ id: 'a', revealed: true, revealedAt: 1000 }, { id: 'b', revealed: false }];
  const run = () => {
    cleanup?.();
    runInNewContext(ts.transpileModule(effect, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      diceAnimations: animations, Date: { now: () => now },
      setDiceAnimations: update => { animations = update(animations); },
      useEffect: fn => { cleanup = fn(); },
      window: { setTimeout: (fn, ms) => { callback = fn; delay = ms; return 1; }, clearTimeout() {} },
    });
  };
  run();
  assert.equal(delay, 2000);
  now = 2000;
  animations = animations.map(a => a.id === 'b' ? { ...a, revealed: true, revealedAt: now } : a);
  run();
  assert.equal(delay, 1000, 'second result does not restart first result timer');
  now = 3000; callback();
  assert.deepEqual(animations.map(a => a.id), ['b']);
  run();
  assert.equal(delay, 1000);
  now = 4000; callback();
  assert.equal(animations.length, 0);
});
