import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyBuild, revisedCatalog, deriveSheet, buildGroups, validateBuild} from '../dist-server/characters.js';
import {motmSpecies} from '../dist-server/catalog/motm.js';
const build=(id,level=1)=>({...emptyBuild(),race:`motm:${id}`,level,choices:{'motm.ability':['wis']}});
test('every innate spell resolves and unlocks only at its species level',()=>{
 for(const s of motmSpecies) for(let level=1;level<=5;level++) {
  const sheet=deriveSheet(build(s.id,level));
  for(const [at,id] of s.spells||[]) {
   assert.ok(revisedCatalog.spells.some(s=>s.index===id),id);
   assert.equal([...sheet.cantrips,...sheet.spells].includes(id),level>=at,`${s.id}/${level}/${id}`);
   if(level>=at) assert.ok(sheet.innateSpells.some(spell=>spell.id===id&&spell.ability===(s.id==='aasimar'?'cha':'wis')));
  }
 }
});
test('natural armor, natural attacks, movement and initiative reach derived sheet',()=>{
 assert.equal(deriveSheet(build('tortle')).ac,17);
 assert.equal(deriveSheet(build('lizardfolk')).ac,15);
 assert.ok(deriveSheet(build('minotaur')).attacks.some(a=>a.name.includes('Horns')&&a.damage==='1d6+2'));
 assert.equal(deriveSheet(build('harengon',5)).initiative,5);
 assert.deepEqual(deriveSheet(build('aarakocra')).movement,{fly:30});
 assert.deepEqual(deriveSheet(build('genasi-water')).movement,{swim:30});
 assert.deepEqual(deriveSheet(build('tabaxi')).movement,{climb:30});
});
test('source picker isolates books and follows saved species without mutating build',async()=>{
 const {speciesSource,speciesForSource,selectSpecies}=await import('../dist-server/catalog/motm.js');
 assert.equal(speciesSource('orc'),'phb-2024');
 assert.equal(speciesSource('motm:orc'),'motm');
 assert.equal(speciesForSource(revisedCatalog,'motm').length,33);
 assert.ok(speciesForSource(revisedCatalog,'phb-2024').every(r=>!r.index.startsWith('motm:')));
 const original={...build('kobold'),choices:{'motm.legacy':['craftiness'],'background.bonus.two':['str'],'class.fighting-style':['archery']}};
 const changed=selectSpecies(original,'motm:aasimar',revisedCatalog);
 assert.equal(changed.race,'motm:aasimar');
 assert.deepEqual(changed.choices,{'background.bonus.two':['str'],'class.fighting-style':['archery']});
 assert.ok(original.choices['motm.legacy']);
 const ui=readFileSync(new URL('../src/Characters.tsx',import.meta.url),'utf8');
 assert.match(ui,/speciesForSource\(catalog,\s*speciesBook\)/);
 assert.match(ui,/setSpeciesBook\(speciesSource\(build.race\)\)/);
});
test('fixed species skill can replace overlapping background skill',()=>{
 const b={...build('goliath'),background:'srd-2024:soldier'};
 const group=buildGroups(b).find(g=>g.key==='background.skill.0');
 assert.ok(group.options.some(o=>o.id!=='athletics'));
});
test('conditional species choices are validated at trust boundary',()=>{
 const kobold=build('kobold');
 assert.ok(buildGroups(kobold).some(g=>g.key==='motm.legacy'));
 kobold.choices['motm.legacy']=['draconic-sorcery'];
 assert.ok(buildGroups(kobold).some(g=>g.key==='motm.cantrip'&&g.kind==='spell'));
 assert.ok(validateBuild({...kobold,choices:{...kobold.choices,'motm.ability':['str']}}).errors.some(e=>e.includes('Ability spell')));
 assert.ok(validateBuild({...build('tortle'),armor:'chain-mail'}).errors.some(e=>e.includes('Tortle')));
});
