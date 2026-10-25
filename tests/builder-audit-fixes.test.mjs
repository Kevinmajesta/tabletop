import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyBuild, buildGroups, deriveSheet, validateBuild, revisedCatalog} from '../dist-server/characters.js';

test('Keen Senses grants a skill and participates in duplicate validation',()=>{
 const b={...emptyBuild(),race:'elf',subrace:'elven-lineage-high-elf',choices:{'trait.keen-senses':['perception'],'background.skill.0':['perception']}};
 assert.equal(buildGroups(b).find(g=>g.key==='trait.keen-senses').kind,'skill');
 assert.equal(deriveSheet(b).skills.find(s=>s.id==='perception').proficient,true);
 assert.ok(validateBuild(b).errors.some(e=>e.startsWith('Skill proficiency ganda')));
});

test('High Elf replaces only its lineage cantrip with a Wizard cantrip using lineage ability',()=>{
 const b={...emptyBuild(),race:'elf',subrace:'elven-lineage-high-elf',level:5,choices:{'race.spell-ability':['wis'],'trait.spell.high-elf-cantrip-versatility':['fire-bolt']}};
 const group=buildGroups(b).find(g=>g.key==='trait.spell.high-elf-cantrip-versatility');
 assert.ok(group);
 assert.deepEqual(group.options.map(o=>o.id).sort(),revisedCatalog.spells.filter(s=>s.level===0&&s.classes?.some(c=>c.index==='wizard')).map(s=>s.index).sort());
 const sheet=deriveSheet(b);
 assert.ok(sheet.cantrips.includes('fire-bolt'));
 assert.ok(!sheet.cantrips.includes('prestidigitation'));
 assert.equal(sheet.innateSpells.find(s=>s.id==='fire-bolt').ability,'wis');
 assert.ok(sheet.prepared.includes('misty-step'));
 assert.ok(!sheet.prepared.includes('fire-bolt'));
 assert.ok(deriveSheet({...b,cantrips:['prestidigitation']}).cantrips.includes('prestidigitation'),'independent class source is retained');
 const invalid=validateBuild({...b,choices:{...b.choices,[group.key]:['eldritch-blast']}});
 assert.ok(invalid.issues.some(i=>i.groupKey===group.key));
});

test('Wizard normal learned spellbook respects acquisition levels independently of Savant',()=>{
 const spells=level=>revisedCatalog.spells.filter(s=>s.level===level&&s.classes?.some(c=>c.index==='wizard')).map(s=>s.index);
 const b={...emptyBuild(),classId:'wizard',level:5,subclassId:'evoker',spells:[...spells(1).slice(0,8),...spells(2).slice(0,3),...spells(3).slice(0,3)]};
 const invalid=validateBuild(b);
 assert.ok(invalid.issues.some(i=>i.section==='spell'&&i.groupKey==='spells'&&/progresi/.test(i.message)));
 for(let level=1;level<=5;level++) {
  const legal={...b,level,spells:[...spells(1).slice(0,level===1?6:8),...spells(2).slice(0,Math.max(0,Math.min(level-2,2))*2),...spells(3).slice(0,level===5?2:0)],choices:{'subclass.savant':spells(2).slice(4,6),'subclass.savant.5':spells(3).slice(3,4)}};
  assert.ok(!validateBuild(legal).errors.some(e=>/progresi/.test(e)),`legal level ${level}`);
 }
 const tooFewFirst={...b,spells:[...spells(1).slice(0,4),...spells(2).slice(0,8),...spells(3).slice(0,2)]};
 assert.ok(validateBuild(tooFewFirst).errors.some(e=>/progresi/.test(e)));
});

test('ASI and class spell selection errors identify their exact editable fields',()=>{
 const b={...emptyBuild(),classId:'wizard',level:5,levelFourFeat:'ability-score-improvement'};
 const result=validateBuild(b);
 for(const [prefix,section,groupKey] of [['ASI level 4:','ability','asi.4'],['cantrips:','spell','cantrips'],['spells:','spell','spells']]) {
  const message=result.errors.find(e=>e.startsWith(prefix));
  assert.ok(message);
  assert.deepEqual(result.issues.find(i=>i.message===message),{message,section,groupKey});
 }
});

test('Prepared spell errors identify the prepared field',()=>{
 const result=validateBuild({...emptyBuild(),classId:'wizard',spells:['alarm'],prepared:['fireball']});
 const message=result.errors.find(e=>e.startsWith('Prepared spells:'));
 assert.deepEqual(result.issues.find(i=>i.message===message),{message,section:'spell',groupKey:'prepared'});
});

test('six general feats do not require martial weapon proficiency but retain ability prerequisites',()=>{
 for(const feat of ['crossbow-expert','dual-wielder','great-weapon-master','polearm-master','sentinel','sharpshooter']) {
  const b={...emptyBuild(),classId:'wizard',level:4,levelFourFeat:feat};
  assert.ok(!validateBuild(b).errors.some(e=>/martial/i.test(e)),feat);
  assert.ok(validateBuild({...b,method:'manual',scores:{str:8,dex:8,con:8,int:15,wis:10,cha:8}}).errors.some(e=>/ability prasyarat/.test(e)),`${feat} ability minimum`);
 }
});

test('Human Skillful uses the existing human.skill choice only',()=>{
 const b={...emptyBuild(),choices:{'human.skill':['stealth']}};
 assert.ok(!buildGroups(b).some(g=>g.key==='trait.skillful'));
 assert.equal(buildGroups(b).filter(g=>g.key==='human.skill').length,1);
 assert.equal(deriveSheet(b).skills.find(s=>s.id==='stealth').proficient,true);
});
