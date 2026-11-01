import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tsImport } from 'tsx/esm/api';
const { resources } = await tsImport('../server/resources.ts', import.meta.url);
const sheet = { modifiers: { str: 3, dex: 3, con: 3, int: 3, wis: 3, cha: 3 } };
const pool = (classId, level, id, subclassId) => resources({ classId, level, subclassId, choices: {} }, sheet).find(r => r.id === id);

test('XPHB existing feature pools gain their higher-level dice and recharge rules', () => {
  for (let level = 3; level <= 20; level++) {
    assert.equal(pool('fighter', level, 'action-surge').max, level >= 17 ? 2 : 1);
    const superiority = pool('fighter', level, 'superiority-dice', 'battle-master');
    assert.equal(superiority.max, level >= 15 ? 6 : level >= 7 ? 5 : 4);
    assert.equal(superiority.name, `Superiority Dice d${level >= 18 ? 12 : level >= 10 ? 10 : 8}`);
    for (const [classId, subclassId] of [['fighter', 'psi-warrior'], ['rogue', 'soulknife']]) {
      const dice = pool(classId, level, 'psionic-dice', subclassId);
      assert.equal(dice.max, 2 * (2 + Math.floor((level - 1) / 4)));
      assert.equal(dice.name, `Psionic Energy Dice d${level >= 17 ? 12 : level >= 11 ? 10 : level >= 5 ? 8 : 6}`);
    }
    assert.equal(pool('wizard', level, 'portent', 'diviner').max, level >= 14 ? 3 : 2);
    assert.equal(pool('cleric', level, 'warding-flare', 'light-domain').shortRest, level >= 6);
    assert.equal(pool('barbarian', level, 'warrior-gods', 'path-of-the-zealot').max, level >= 17 ? 7 : level >= 12 ? 6 : level >= 6 ? 5 : 4);
  }
});

// XPHB class tables in 5etools class-{class}.json (commit 8790755).
test('XPHB class-table resource pools scale through every level 1–20', () => {
  const tables = [
    ['barbarian', 'rage', [2,2,3,3,3,4,4,4,4,4,4,5,5,5,5,5,6,6,6,6]],
    ['fighter', 'second-wind', [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4]],
    ['cleric', 'channel-divinity', [0,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,4,4,4]],
    ['druid', 'wild-shape', [0,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,4,4,4,4]],
    ['paladin', 'channel-divinity', [0,0,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3]],
  ];
  for (const [classId, id, maxima] of tables) for (const [i, max] of maxima.entries()) {
    const resource = pool(classId, i + 1, id);
    assert.equal(resource?.max || 0, max, `${classId} ${id} level ${i + 1}`);
    if (max) { assert.equal(resource.shortRest, false); assert.equal(resource.shortRecovery, 1); }
  }
});
