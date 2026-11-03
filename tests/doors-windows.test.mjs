import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blocked, blocksMovement, visible, newScene } from '../dist-server/tabletop.js';

const server = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/BoardTools.tsx', import.meta.url), 'utf8');

test('Roll20-style doors and windows vision and movement rules', () => {
  const scene = newScene('Portal Room', 'p-room');
  scene.vision = true;
  scene.daylight = true;
  scene.tokens.push({ id: 'hero', ownerId: 'player', name: 'Hero', image: '', x: 20, y: 50, visionRange: 60, visionSource: true });

  // 1. Wall blocks both vision and movement
  const wall = { id: 'w1', ownerId: 'dm', kind: 'wall', a: { x: 40, y: 0 }, b: { x: 40, y: 100 }, text: '' };
  scene.marks = [wall];
  assert.equal(blocked({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), true, 'wall blocks vision');
  assert.equal(blocksMovement({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), true, 'wall blocks movement');
  assert.equal(visible({ x: 60, y: 50 }, scene, 'player'), false, 'cannot see through wall');

  // 2. Closed door blocks both vision and movement
  const closedDoor = { id: 'd1', ownerId: 'dm', kind: 'door', a: { x: 40, y: 0 }, b: { x: 40, y: 100 }, text: '', open: false };
  scene.marks = [closedDoor];
  assert.equal(blocked({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), true, 'closed door blocks vision');
  assert.equal(blocksMovement({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), true, 'closed door blocks movement');
  assert.equal(visible({ x: 60, y: 50 }, scene, 'player'), false, 'cannot see through closed door');

  // 3. Open door permits both vision and movement
  const openDoor = { id: 'd1', ownerId: 'dm', kind: 'door', a: { x: 40, y: 0 }, b: { x: 40, y: 100 }, text: '', open: true };
  scene.marks = [openDoor];
  assert.equal(blocked({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), false, 'open door passes vision');
  assert.equal(blocksMovement({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), false, 'open door passes movement');
  assert.equal(visible({ x: 60, y: 50 }, scene, 'player'), true, 'can see through open door');

  // 4. Closed window blocks both vision and movement
  const closedWindow = { id: 'win1', ownerId: 'dm', kind: 'window', a: { x: 40, y: 0 }, b: { x: 40, y: 100 }, text: '', open: false };
  scene.marks = [closedWindow];
  assert.equal(blocked({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), true, 'closed window blocks vision');
  assert.equal(blocksMovement({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), true, 'closed window blocks movement');
  assert.equal(visible({ x: 60, y: 50 }, scene, 'player'), false, 'cannot see through closed window');

  // 5. Open window permits both (player can climb through)
  const openWindow = { id: 'win1', ownerId: 'dm', kind: 'window', a: { x: 40, y: 0 }, b: { x: 40, y: 100 }, text: '', open: true };
  scene.marks = [openWindow];
  assert.equal(blocked({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), false, 'open window passes vision');
  assert.equal(blocksMovement({ x: 20, y: 50 }, { x: 60, y: 50 }, scene.marks), false, 'open window passes movement');
  assert.equal(visible({ x: 60, y: 50 }, scene, 'player'), true, 'can see through open window');
});

test('DM can place and directly toggle doors and windows on the board', () => {
  assert.ok(server.includes('"window"'));
  assert.ok(server.includes('p.type === "door:toggle"'));
  assert.ok(client.includes('["window", "Jendela"]'));
  assert.ok(client.includes('board-portal'));
  assert.ok(client.includes('door:toggle'));
  assert.ok(client.includes('action({ type: "door:toggle", id: key })'));
});
