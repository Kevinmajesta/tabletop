import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../src/DiceScene.tsx', import.meta.url), 'utf8');

test('consecutive rolls release their own chat result after 2.5 seconds independently of physics', () => {
  const handler = main.match(/setPendingRollIds\(\(current\) => \[\.\.\.current, animation.id\]\);[\s\S]*?rollTimers.add\(timer\);/)?.[0];
  assert.ok(handler);
  let pendingRollIds = [];
  const timers = [];
  const rollTimers = new Set();
  const receive = id => runInNewContext(handler, {
    animation: { id }, rollTimers,
    setPendingRollIds(update) { pendingRollIds = update(pendingRollIds); },
    window: { setTimeout(callback, delay) { assert.equal(delay, 2500); timers.push(callback); return callback; } },
  });
  const expression = main.match(/room\?\.messages\.filter\(.*?\)(?=\.map\(\(message\))/)?.[0];
  const room = { messages: [{ id: 'first' }, { id: 'second' }, { id: 'chat' }] };
  const visible = () => Array.from(runInNewContext(expression, { room, pendingRollIds }), message => message.id);
  receive('first');
  receive('second');
  assert.deepEqual(visible(), ['chat']);
  timers[0]();
  assert.deepEqual(visible(), ['first', 'chat']);
  timers[1]();
  assert.deepEqual(visible(), ['first', 'second', 'chat']);
  assert.equal(rollTimers.size, 0);
  assert.ok(main.includes('rollTimers.forEach(window.clearTimeout)'));
});

test('chat auto-scroll reacts to delayed reveals and new messages at the history limit', () => {
  const effect = main.match(/useEffect\(\(\) => \{\s*messagesEnd.current\?\.scrollIntoView\([\s\S]*?\}, (\[[^\n]+\])\);/);
  assert.ok(effect);
  const room = { messages: Array.from({ length: 100 }, (_, id) => ({ id: String(id) })) };
  let pendingRollIds = ['99'];
  const dependencies = () => Array.from(runInNewContext(effect[1], { room, pendingRollIds }));
  const before = dependencies();
  pendingRollIds = [];
  assert.notDeepEqual(dependencies(), before, 'reveal triggers scroll after the delayed result renders');
  const revealed = dependencies();
  room.messages.shift();
  room.messages.push({ id: '100' });
  assert.notDeepEqual(dependencies(), revealed, 'new message triggers scroll even with 100 messages');
});

test('settled dice do not add another second before revealing', () => {
  const completion = scene.match(/else if \(!done\) \{[^\n]+\}/)?.[0];
  assert.ok(completion);
  const delays = [];
  let complete = false;
  runInNewContext(`let done = false, revealTimer; if (false) {} ${completion}`, {
    setTimeout(callback, delay) { delays.push(delay); assert.equal(complete, false); callback(); },
    complete: { current() { complete = true; } },
  });
  assert.deepEqual(delays, []);
  assert.equal(complete, true);
  assert.ok(!scene.includes('revealTimer'));
});
