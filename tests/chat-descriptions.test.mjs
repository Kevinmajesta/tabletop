import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equipmentChatDescription } from '../dist-server/characters.js';

test('equipment chat description includes rules and useful stats', () => {
  assert.equal(
    equipmentChatDescription({
      index: 'longsword',
      name: 'Longsword',
      description: [],
      damage: { damage_dice: '1d8', damage_type: { index: 'slashing', name: 'Slashing' } },
      properties: [{ index: 'versatile', name: 'Versatile' }],
      weight: 3,
    }, 1),
    '1 × Longsword\nDamage: 1d8 Slashing · Properties: Versatile · Weight: 3 lb',
  );
  assert.equal(
    equipmentChatDescription({
      index: 'backpack',
      name: 'Backpack',
      description: ['Holds up to 30 pounds.'],
      weight: 5,
    }, 2),
    '2 × Backpack\nHolds up to 30 pounds.\nWeight: 5 lb each',
  );
});
