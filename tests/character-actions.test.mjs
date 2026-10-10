import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustHealth, updatePrepared } from '../dist-server/character-actions.js';
import { emptyBuild, deriveSheet } from '../dist-server/characters.js';

test('damage absorbs temporary HP, concentration DC uses full damage, heal clamps and zero ends concentration',()=>{
 const build=emptyBuild();const c={build,sheet:deriveSheet(build),hp:10,tempHp:5,concentration:'bless',deathSuccess:1,deathFailure:1};
 adjustHealth(c,'damage',8);assert.equal(c.tempHp,0);assert.equal(c.hp,7);assert.equal(c.concentrationSaveDC,10);
 adjustHealth(c,'heal',999);assert.equal(c.hp,c.sheet.hp);assert.equal(c.deathFailure,0);
 adjustHealth(c,'damage',999);assert.equal(c.hp,0);assert.equal(c.concentration,'');assert.throws(()=>adjustHealth(c,'heal',NaN));
});
test('prepared spell updates reject unsupported class and forged IDs',()=>{
 const build=emptyBuild();const c={build,sheet:deriveSheet(build)};
 assert.throws(()=>updatePrepared(c,[]),/Class/);
 c.build={...build,classId:'wizard'};assert.throws(()=>updatePrepared(c,['not-a-spell']),/Pilih/);
});
