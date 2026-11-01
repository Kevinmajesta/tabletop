import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyBuild, buildGroups, featsForLevel, deriveSheet, validateBuild} from '../dist-server/characters.js';
import {xphbFeats, xphbOptionalFeatures} from '../dist-server/catalog/resources-xphb.js';
import {invocations, metamagic, maneuvers} from '../dist-server/catalog/class-options-2024.js';

test('selectable general feats and optionalfeature inventories use every imported PHB record',()=>{
 const general=xphbFeats.filter(f=>f.category==='G'&&f.index!=='ability-score-improvement');
 assert.deepEqual(featsForLevel(4).map(f=>f.index).sort(),general.map(f=>f.index).sort());
 for(const [type,ids] of [['EI',invocations.map(f=>f[0])],['MM',metamagic.map(f=>f[0])],['MV:B',maneuvers]]) {
  const expected=xphbOptionalFeatures.filter(f=>f.featureType.includes(type)).map(f=>type==='MV:B'?f.name:f.index);
  assert.deepEqual([...ids].sort(),expected.sort(),type);
 }
 const chef=featsForLevel(4).find(f=>f.index==='chef');
 assert.equal(chef.description,xphbFeats.find(f=>f.index==='chef').description);
});

test('invocations enforce every imported level and pact prerequisite, including dependency chains',()=>{
 for(const feature of xphbOptionalFeatures.filter(f=>f.featureType.includes('EI'))) {
  const p=feature.prerequisite[0]||{};
  const minimum=p.level?.level||1;
  const dependencies=(p.optionalfeature||[]).map(s=>s.split('|')[0].replaceAll(' ','-'));
  if(feature.index==='devouring-blade') dependencies.push('pact-of-the-blade');
  const options=(level,selected)=>buildGroups({...emptyBuild(),classId:'warlock',level,choices:{'class.invocations':selected}}).find(g=>g.key==='class.invocations').options.map(o=>o.id);
  assert.ok(options(minimum,dependencies).includes(feature.index),feature.index);
  if(minimum>1) assert.ok(!options(minimum-1,dependencies).includes(feature.index),`${feature.index} level`);
  if(p.optionalfeature) assert.ok(!options(20,[]).includes(feature.index),`${feature.index} pact`);
 }
 const invalid={...emptyBuild(),classId:'warlock',level:12,choices:{'class.invocations':['devouring-blade','thirsting-blade']}};
 assert.ok(validateBuild(invalid).issues.some(i=>i.groupKey==='class.invocations'));
 assert.ok(deriveSheet({...invalid,choices:{'class.invocations':['witch-sight']}}).features.some(f=>f.name==='Witch Sight'));
});

test('invocation cantrip choices enforce Warlock damage, range and attack prerequisites',()=>{
 const build={...emptyBuild(),classId:'warlock',level:5,cantrips:['eldritch-blast','chill-touch','mage-hand','fire-bolt','toll-the-dead'],choices:{'class.invocations':['agonizing-blast','eldritch-spear','repelling-blast']}};
 const ids=key=>buildGroups(build).find(g=>g.key===`invocation.${key}`).options.map(o=>o.id);
 assert.ok(ids('agonizing-blast').includes('chill-touch'));
 assert.ok(ids('agonizing-blast').includes('toll-the-dead'));
 assert.ok(!ids('agonizing-blast').includes('fire-bolt'));
 assert.ok(!ids('agonizing-blast').includes('mage-hand'));
 assert.ok(!ids('eldritch-spear').includes('chill-touch'));
 assert.ok(!ids('repelling-blast').includes('toll-the-dead'));
});

test('Lessons of the First Ones offers imported origin feats',()=>{
 const build={...emptyBuild(),classId:'warlock',level:2,choices:{'class.invocations':['lessons-of-the-first-ones']}};
 const group=buildGroups(build).find(g=>g.key==='invocation.lessons.feat');
 assert.ok(group);
 assert.deepEqual(group.options.map(o=>o.id).sort(),xphbFeats.filter(f=>f.category==='O').map(f=>f.index).sort());
});

test('source feat levels and epic spellcasting prerequisites are enforced',()=>{
 assert.deepEqual(featsForLevel(1),[]);
 assert.ok(!featsForLevel(18).some(f=>f.index==='boon-of-spell-recall'));
 const build={...emptyBuild(),classId:'fighter',level:19,feats:{19:'boon-of-spell-recall'}};
 assert.ok(validateBuild(build).errors.some(e=>/Spellcasting|Pact Magic/.test(e)));
 const caster={...build,classId:'wizard'};
 assert.ok(!validateBuild(caster).errors.some(e=>/Spellcasting|Pact Magic/.test(e)));
});

test('source descriptions survive fighting style and Lessons selections on the sheet',()=>{
 const fighter=deriveSheet({...emptyBuild(),classId:'fighter',choices:{'class.fighting-style':['blind-fighting']}});
 assert.ok(fighter.features.some(f=>f.name==='Blind Fighting'&&f.desc.join('').includes('Blindsight')));
 const warlock=deriveSheet({...emptyBuild(),classId:'warlock',level:2,choices:{'class.invocations':['lessons-of-the-first-ones'],'invocation.lessons.feat':['tough']}});
 assert.ok(warlock.features.some(f=>f.name.includes('Tough')&&f.desc.join('').includes('Hit Point')));
});

test('fighting style choice includes every imported fighting style feat',()=>{
 const group=buildGroups({...emptyBuild(),classId:'fighter'}).find(g=>g.key==='class.fighting-style');
 assert.deepEqual(group.options.map(o=>o.id).sort(),xphbFeats.filter(f=>f.category==='FS').map(f=>f.index).sort());
});
