import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBuild, revisedCatalog, buildGroups, spellLimits, validateBuild, deriveSheet } from '../dist-server/characters.js';

export function complete(classId, level, subclassId) {
  const build = { ...emptyBuild(), name: 'Level test', classId, level, subclassId: level >= 3 ? subclassId || revisedCatalog.subclasses.find(s => s.class.index === classId).index : '', asi: level >= 4 ? { 4: ['con','con'] } : {} };
  for (let pass = 0; pass < 12; pass++) for (const group of buildGroups(build)) {
    if (build.choices[group.key]?.length === group.count && build.choices[group.key].every(id => group.options.some(o => o.id === id))) continue;
    const used = Object.entries(build.choices).filter(([key]) => key !== group.key).flatMap(([,values]) => values);
    build.choices[group.key] = group.options.filter(o => !['skill','language'].includes(group.kind) || !used.includes(o.id)).slice(0,group.count).map(o => o.id);
  }
  const limits = spellLimits(build);
  build.cantrips = revisedCatalog.spells.filter(s => s.level === 0 && !(build.subclassId === 'arcane-trickster' && s.index === 'mage-hand') && s.classes?.some(c => c.index === limits.spellClass)).slice(0,limits.cantrips).map(s => s.index);
  const bonus = [...build.choices['subclass.savant'] || [], ...build.choices['subclass.savant.5'] || []];
  build.spells = revisedCatalog.spells.filter(s => s.level && s.level <= limits.maxSpellLevel && !bonus.includes(s.index) && s.classes?.some(c => c.index === limits.spellClass)).slice(0,limits.spells).map(s => s.index);
  build.prepared = build.spells.slice(0,limits.prepared);
  for (let pass = 0; pass < 4; pass++) for (const group of buildGroups(build)) if (!build.choices[group.key]?.every(id => group.options.some(o => o.id === id)) || build.choices[group.key]?.length !== group.count) build.choices[group.key] = group.options.slice(0,group.count).map(o=>o.id);
  return build;
}

test('all twelve classes save correctly at every level 1–5', () => {
  for (const klass of revisedCatalog.classes) for (let level = 1; level <= 5; level++) {
    const build = complete(klass.index, level);
    assert.deepEqual(validateBuild(build).errors, [], `${klass.index}/${level}`);
    const sheet = deriveSheet(build);
    assert.equal(sheet.level,level);
    assert.equal(sheet.proficiency,level === 5 ? 3 : 2);
    assert.equal(!!sheet.subclassName,level >= 3);
  }
});

test('PHB has four subclasses per class and Warlock/Druid spell bonuses', () => {
  assert.equal(revisedCatalog.subclasses.length,48);
  for(const klass of revisedCatalog.classes) assert.equal(revisedCatalog.subclasses.filter(s=>s.class.index===klass.index).length,4);
  for(const sub of revisedCatalog.subclasses) for(const level of [3,4,5]) assert.deepEqual(validateBuild(complete(sub.class.index,level,sub.index)).errors,[],`${sub.index}/${level}`);
  for(const [classId,id,spell] of [['warlock','archfey-patron','misty-step'],['warlock','celestial-patron','revivify'],['druid','circle-of-the-moon','moonbeam'],['druid','circle-of-the-sea','water-breathing']]) {
    const build = {...complete(classId,5),subclassId:id};
    assert.ok(deriveSheet(build).spells.includes(spell));
    assert.equal(deriveSheet(build).subclassName,revisedCatalog.subclasses.find(s=>s.index===id).name);
  }
});

test('subclass, ASI, feat prerequisites and level bounds validated', () => {
  const fighter = complete('fighter',3);
  assert.ok(validateBuild({ ...fighter, subclassId: '' }).errors.length);
  assert.ok(validateBuild({ ...fighter, subclassId: 'life-domain' }).errors.length);
  assert.ok(validateBuild({ ...fighter, level: 6 }).errors.length);
  const five = complete('fighter',5);
  assert.ok(deriveSheet(five).features.some(f => f.name === 'Extra Attack'));
  assert.ok(validateBuild({ ...five, asi: {} }).errors.length);
  const grappler = { ...five, levelFourFeat: 'grappler', asi: {}, choices: { ...five.choices, 'level4.ability': ['str'] } };
  assert.deepEqual(validateBuild(grappler).errors, []);
  assert.ok(validateBuild({ ...grappler, levelFourFeat: 'boon-of-fate' }).errors.length);
  const forged = { ...grappler, method: 'manual', scores: { str:12, dex:10, con:13, int:12, wis:10, cha:8 }, choices: { ...grappler.choices, 'race.ability': ['str'] } };
  assert.ok(validateBuild(forged).errors.some(e => e.includes('Grappler membutuhkan')));
  const wizard = deriveSheet(complete('wizard',5));
  const evokerBuild = complete('wizard',5);
  const bonusSpells = [...evokerBuild.choices['subclass.savant'], ...evokerBuild.choices['subclass.savant.5']];
  assert.ok(bonusSpells.every(id => deriveSheet(evokerBuild).spells.includes(id)));
  evokerBuild.prepared = [...bonusSpells, ...evokerBuild.spells].slice(0, spellLimits(evokerBuild).prepared);
  assert.deepEqual(validateBuild(evokerBuild).errors, []);
  assert.ok(bonusSpells.every(id => deriveSheet(evokerBuild).prepared.includes(id)));
  assert.deepEqual(wizard.slotsByLevel, { 1:4, 2:3, 3:2, 4:0 });
  const warlock = deriveSheet(complete('warlock',5));
  assert.equal(warlock.slotsByLevel[3],2);
  assert.equal(warlock.slotsByLevel[1],0);
});
