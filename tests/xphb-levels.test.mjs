import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const imported = JSON.parse(readFileSync(new URL('../server/catalog/progression-xphb.json', import.meta.url), 'utf8'));
import { emptyBuild, buildGroups, revisedCatalog, levelFor, progression, asiLevels, spellLimits, deriveSheet, finalScores, validateBuild } from '../dist-server/characters.js';
const build = (classId, level, subclassId = '') => ({ ...emptyBuild(), classId, level, subclassId });

test('all imported class and subclass slot tables agree with runtime', () => {
  assert.equal(Object.keys(imported.subclasses).length, 48);
  for (const klass of revisedCatalog.classes) for (let level = 1; level <= 20; level++) {
    const limits = spellLimits(build(klass.index, level));
    for (let rank = 1; rank <= 9; rank++) assert.equal(limits.slotsByLevel[rank] || 0, imported.classes[klass.index][level-1].spellcasting[`spell_slots_level_${rank}`] || 0, `${klass.index}/${level}/${rank}`);
  }
  for (const id of ['eldritch-knight','arcane-trickster']) for (let level = 3; level <= 20; level++) {
    const limits = spellLimits(build(id === 'eldritch-knight' ? 'fighter' : 'rogue', level, id));
    for (let rank = 1; rank <= 4; rank++) assert.equal(limits.slotsByLevel[rank], imported.subclasses[id][level-1].spellcasting[`spell_slots_level_${rank}`]);
  }
});

test('spell limits follow all nine slot ranks, pact magic and third casters', () => {
  assert.equal(spellLimits(build('wizard', 20)).slotsByLevel[9], 1);
  assert.equal(spellLimits(build('wizard', 20)).spells, 44);
  assert.equal(spellLimits(build('wizard', 20)).prepared, 25);
  assert.equal(spellLimits(build('warlock', 20)).slotsByLevel[5], 4);
  assert.equal(spellLimits(build('fighter', 20, 'eldritch-knight')).slotsByLevel[4], 1);
  assert.equal(spellLimits(build('fighter', 20, 'eldritch-knight')).spells, 13);
  assert.equal(spellLimits(build('rogue', 20, 'arcane-trickster')).cantrips, 3);
  assert.equal(spellLimits(build('paladin', 20)).maxSpellLevel, 5);
});

test('later ASIs are independent of level-four feat and capstones derive', () => {
  assert.deepEqual(asiLevels(build('fighter', 20)), [4,6,8,12,14,16,19]);
  assert.deepEqual(asiLevels(build('rogue', 20)), [4,8,10,12,16,19]);
  const b = { ...build('fighter', 8), levelFourFeat: 'grappler', asi: { 6: ['con','con'], 8: ['wis','wis'] } };
  assert.equal(finalScores(b).con, b.scores.con + 2);
  assert.equal(finalScores(b).wis, b.scores.wis + 2);
  assert.ok(deriveSheet(build('fighter', 20, 'champion')).features.some(f => f.name === 'Three Extra Attacks' && f.desc.length));
  assert.equal(deriveSheet(build('monk', 20)).speed, 60);
  assert.match(deriveSheet(build('monk', 20)).attacks.find(a => a.id === 'unarmed-strike').damage, /^1d12/);
});

test('later feats and epic boons have independent choices and runtime validation', () => {
  const b = { ...build('fighter', 19, 'champion'), feats: { 6: 'grappler', 19: 'boon-of-fortitude' }, asi: {4:['int','int'],8:['wis','wis'],12:['cha','cha'],14:['dex','dex'],16:['int','int']}, choices: {'level6.ability':['str'], 'level19.ability':['con']} };
  assert.equal(finalScores(b).str, b.scores.str + 1);
  assert.equal(finalScores(b).con, b.scores.con + 1);
  assert.equal(deriveSheet(b).hp, deriveSheet({...b, feats: {6:'grappler'}}).hp + 59);
  const result = validateBuild(b);
  assert.equal(result.build.feats[19], 'boon-of-fortitude');
  assert.ok(!result.errors.some(e => e.includes('ASI level 6') || e.includes('ASI level 19')));
  assert.ok(validateBuild({...b, feats:{6:'boon-of-fortitude'}}).errors.some(e => /Feat level 6/.test(e)));
  assert.ok(validateBuild({...b, feats:{6:'grappler',8:'grappler'}}).errors.some(e => /Feat.*ganda/.test(e)));
});

test('high-level options and automatic subclass spells unlock at source levels', () => {
  const groups = (id, level, sub) => buildGroups(build(id, level, sub));
  assert.equal(groups('sorcerer', 17).find(g => g.key === 'class.metamagic').count, 6);
  assert.equal(groups('warlock', 20).find(g => g.key === 'class.invocations').count, 10);
  assert.equal(groups('fighter', 15, 'battle-master').find(g => g.key === 'subclass.maneuvers').count, 9);
  assert.ok(deriveSheet(build('cleric', 7, 'life-domain')).spells.includes('death-ward'));
  assert.ok(!deriveSheet(build('cleric', 6, 'life-domain')).spells.includes('death-ward'));
  assert.ok(groups('warlock', 17).some(g => g.key === 'class.arcanum.9'));
});

test('later feat prerequisites cannot be bypassed', () => {
  const b = {...build('fighter', 8, 'champion'), method:'manual', scores:{str:10,dex:10,con:10,int:10,wis:10,cha:10}, feats:{8:'grappler'}, choices:{'level8.ability':['str']}};
  assert.ok(validateBuild(b).errors.some(e => e.includes('Grappler membutuhkan')));
});

test('all twelve PHB classes expose level 1–20 progression and proficiency', () => {
  for (const klass of revisedCatalog.classes) for (let level = 1; level <= 20; level++) {
    const b = build(klass.index, level);
    assert.equal(levelFor(b), level, `${klass.index}/${level}`);
    assert.equal(progression(b)?.level, level);
    assert.equal(deriveSheet(b).proficiency, 2 + Math.floor((level - 1) / 4));
  }
  assert.equal(levelFor(build('fighter', Infinity)), 1);
  for (const level of [0, 21, 1.5, Infinity, '20']) assert.ok(validateBuild({ ...build('fighter', level), name: 'Bounds' }).errors.some(e => /Level harus 1–20/.test(e)));
});
