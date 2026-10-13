import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateRoll, dieShape, readDie } from '../dist-server/dice-physics.js';

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

for (const sides of [4, 6, 8, 10, 12, 20, 100]) {
  test(`d${sides}: result comes from final physical orientation`, () => {
    for (const seed of [17, 42, 2026]) {
      const roll = simulateRoll(sides, 2, -3, random(seed));
      const last = roll.frames.at(-1);
      const previous = roll.frames.at(-2);
      assert.equal(dieShape(sides === 100 ? 10 : sides).faces.length, sides === 100 ? 10 : sides);
      const faces = last.map((pose, i) => readDie(roll.dice[i].sides, pose.q));
      const expected = sides === 100 ? [0, 2].map(i => ((faces[i] - 1) * 10 + faces[i + 1] - 1) || 100) : faces;
      assert.deepEqual(roll.values, expected);
      assert.equal(roll.total, expected.reduce((sum, value) => sum + value, -3));
      assert.ok(roll.values.every(value => value >= 1 && value <= sides));
      last.forEach((pose, i) => {
        assert.ok(pose.p.every(Number.isFinite));
        assert.ok(Math.abs(pose.p[0]) < 9 && Math.abs(pose.p[2]) < 6);
        assert.ok(pose.p.every((value, j) => Math.abs(value - previous[i].p[j]) < .01), 'die stopped moving');
      });
    }
  });
}

test('d10 uses ten planar four-sided faces for d10 and d100', () => {
  const shape = dieShape(10);
  assert.deepEqual(shape.faces.map(face => face.indices.length), Array(10).fill(4));
  assert.ok(shape.faces.every(face => new Set(face.indices).size === 4));
  for (const face of shape.faces) {
    const [a, b, c, d] = face.indices.map(index => shape.vertices[index]);
    const normal = cross(subtract(b, a), subtract(c, a));
    assert.ok(Math.abs(dot(normal, subtract(d, a))) < 1e-9);
  }
});

function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }

test('same starting random sequence gives same trajectory, not preselected face values', () => {
  assert.deepEqual(simulateRoll(20, 3, 5, random(8)), simulateRoll(20, 3, 5, random(8)));
  assert.notDeepEqual(simulateRoll(20, 3, 5, random(8)).frames, simulateRoll(20, 3, 5, random(9)).frames);
});
