import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyBuild,revisedCatalog,deriveSheet,buildGroups,validateBuild} from '../dist-server/characters.js';
const build=(race,subrace='',level=1)=>({...emptyBuild(),race,subrace,level});
test('PHB innate casting ability and prepared spells are independent from Wizard quota',()=>{
 for(const race of ['elf','gnome','tiefling']) for(const ability of ['int','wis','cha']) {
  const sub=revisedCatalog.races.find(r=>r.index===race).subraces[0].index;
  const b={...build(race,sub,5),classId:'wizard',choices:{'race.spell-ability':[ability]}};
  assert.ok(buildGroups(b).some(g=>g.key==='race.spell-ability'&&g.options.some(o=>o.id===ability)));
  const sheet=deriveSheet(b);
  assert.ok(sheet.innateSpells.length);
  for(const innate of sheet.innateSpells) {
   assert.equal(innate.ability,ability);
   assert.equal(innate.dc,8+sheet.proficiency+sheet.modifiers[ability]);
   if(revisedCatalog.spells.find(s=>s.index===innate.id).level>0) assert.ok(sheet.prepared.includes(innate.id),innate.id);
  }
 }
 assert.ok(deriveSheet(build('elf','elven-lineage-wood-elf')).cantrips.includes('druidcraft'));
});
test('natural unarmed strikes use Martial Arts only without armor and shield',()=>{
 const base={...build('motm:tabaxi','',5),classId:'monk',scores:{str:8,dex:18,con:13,int:12,wis:14,cha:10}};
 const monk=revisedCatalog.classes.find(c=>c.index==='monk');
 const starting=monk.starting_equipment;
 monk.starting_equipment=[...(starting||[]),{equipment:{index:'leather-armor'},quantity:1},{equipment:{index:'shield'},quantity:1}];
 try { for(const [armor,shield,damage,bonus] of [['',false,'1d8+4',7],['leather-armor',false,'1d6-1',2],['',true,'1d6-1',2]]) {
  const attack=deriveSheet({...base,armor,shield}).attacks.find(a=>a.id==='motm-natural');
  assert.equal(attack.damage,damage);
  assert.equal(attack.bonus,bonus);
  assert.match(attack.name,/slashing/);
 } } finally {monk.starting_equipment=starting;}
});
test('Trance rejects already owned category weapons and tools, not Astral Knowledge',()=>{
 for(const race of ['motm:eladrin','motm:sea-elf','motm:shadar-kai']) {
  const b={...build(race),classId:'fighter',background:'srd-2024:artisan',choices:{'background.tool.0':['smiths-tools'],'motm.trance':['longsword','smiths-tools']}};
  const group=buildGroups(b).find(g=>g.key==='motm.trance');
  assert.ok(!group.options.some(o=>o.id==='longsword'));
  assert.ok(!group.options.some(o=>o.id==='smiths-tools'));
  assert.ok(validateBuild(b).errors.some(e=>e.includes(group.name)));
 }
 assert.ok(buildGroups({...build('motm:githyanki'),classId:'fighter'}).find(g=>g.key==='motm.trance').options.some(o=>o.id==='longsword'));
});
test('catalog summaries preserve Charger timing, Aasimar turn scope and Duergar self targeting',async()=>{
 const {generalFeats}=await import('../dist-server/catalog/feats-2024.js');
 const charger=generalFeats.find(f=>f.index==='charger').description;
 assert.match(charger,/Attack action/);
 assert.match(charger,/segera/);
 assert.match(charger,/satu ukuran lebih besar/);
 const aasimar=revisedCatalog.traits.find(t=>t.index==='motm:aasimar').desc.join(' ');
 assert.match(aasimar,/giliranmu sendiri/);
 assert.match(aasimar,/memberi damage/);
 assert.match(aasimar,/bonus action.*mengakhiri/);
 const duergar=deriveSheet(build('motm:duergar','',5)).innateSpells;
 assert.ok(duergar.every(s=>s.uses.includes('hanya diri sendiri')));
 for(const trait of revisedCatalog.traits.filter(t=>t.index.startsWith('motm:'))) assert.match(trait.desc.join(' '),/Darkvision.*resistansi.*advantage save.*immunity.*manual/i);
});
test('PHB Aasimar is distinct from MotM and chooses revelation on activation',()=>{
 const race=revisedCatalog.races.find(r=>r.index==='aasimar');
 assert.ok(race);
 assert.ok(revisedCatalog.races.some(r=>r.index==='motm:aasimar'));
 for(let level=1;level<=5;level++) {
  const b=build('aasimar','',level),sheet=deriveSheet(b);
  assert.ok(sheet.innateSpells.some(s=>s.id==='light'&&s.ability==='cha'));
  assert.ok(!buildGroups(b).some(g=>g.key.includes('revelation')));
  assert.equal(sheet.features.some(f=>f.name==='Celestial Revelation'),level>=3);
 }
});
test('Dwarven Toughness adds one HP each level',()=>{
 for(let level=1;level<=5;level++) assert.equal(deriveSheet(build('dwarf','',level)).hp-deriveSheet(build('human','',level)).hp,level);
});
test('all PHB lineage spells unlock at the listed character level',()=>{
 for(const sub of revisedCatalog.subraces.filter(s=>/^(elven-lineage|fiendish-legacy)/.test(s.index))) for(let level=1;level<=5;level++) {
  const sheet=deriveSheet(build(sub.species.index,sub.index,level));
  for(const ref of sub.racial_traits) {
   const trait=revisedCatalog.traits.find(t=>t.index===ref.index);
   for(const spell of trait?.spells||[]) {
    const id=spell.spell?.index||spell.index;
    assert.equal([...sheet.spells,...sheet.cantrips].includes(id),level>=(ref.level||1),`${sub.index}/${level}/${id}`);
   }
  }
 }
});
