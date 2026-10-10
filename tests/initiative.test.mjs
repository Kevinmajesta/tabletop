import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyInitiative } from '../dist-server/initiative.js';
import { newScene } from '../dist-server/tabletop.js';

test('initiative updates linked owned token and orders combat without changing turn', () => {
  const scene = newScene('Battle','scene');
  scene.tokens = [{id:'hero',characterId:'char',ownerId:'player',initiative:2},{id:'enemy',ownerId:'dm',initiative:12},{id:'other',characterId:'char',ownerId:'other',initiative:1}];
  scene.combat = {active:true,ids:['enemy','hero'],turn:0,round:2};
  assert.equal(applyInitiative(scene,'char','player',19,false),1);
  assert.equal(scene.tokens[0].initiative,19);
  assert.equal(scene.tokens[2].initiative,1);
  assert.deepEqual(scene.combat.ids,['hero','enemy']);
  assert.equal(scene.combat.ids[scene.combat.turn],'enemy');
  assert.equal(scene.combat.round,2);
});
test('initiative does not start combat or mutate unrelated tokens', () => {
  const scene = newScene('Battle','scene');
  scene.tokens=[{id:'hero',characterId:'char',ownerId:'player'}];
  assert.equal(applyInitiative(scene,'other','player',20,false),0);
  assert.equal(applyInitiative(scene,'char','player',-1,false),1);
  assert.equal(scene.combat.active,false);
  assert.equal(scene.tokens[0].initiative,-1);
});
test('new combatant joins, negative initiatives sort and equal values keep order', () => {
  const scene=newScene('Battle','scene');
  scene.tokens=[{id:'first',initiative:-2},{id:'second',initiative:-2},{id:'hero',characterId:'char',ownerId:'player'}];
  scene.combat={active:true,ids:['first','second'],turn:1,round:3};
  applyInitiative(scene,'char','player',-5,false);
  assert.deepEqual(scene.combat.ids,['first','second','hero']);
  assert.equal(scene.combat.ids[scene.combat.turn],'second');
  applyInitiative(scene,'char','player',-2,false);
  assert.deepEqual(scene.combat.ids,['first','second','hero']);
});
