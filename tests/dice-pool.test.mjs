import { test } from 'node:test';
import assert from 'node:assert/strict';
const { DicePool } = process.env.TEST_DEV
  ? await import('../server/dice-pool.ts')
  : await import('../dist-server/dice-pool.js');

test('worker pool returns physical dice animation for consecutive rolls', async () => {
  const pool = new DicePool(1);
  for (const sides of [6, 20, 100]) {
    const roll = await pool.roll(sides, 1, 0);
    assert.ok(roll.frames.length > 1);
    assert.equal(roll.values.length, 1);
    assert.ok(roll.total >= 1 && roll.total <= sides);
  }
});
