import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisedCatalog, emptyBuild, buildGroups, validateBuild, deriveSheet } from '../dist-server/characters.js';
const ids = 'aarakocra aasimar bugbear centaur changeling deep-gnome duergar eladrin fairy firbolg genasi-air genasi-earth genasi-fire genasi-water githyanki githzerai goblin goliath harengon hobgoblin kenku kobold lizardfolk minotaur orc satyr sea-elf shadar-kai shifter tabaxi tortle triton yuan-ti'.split(' ');
function complete(id, level=1) {
  const build = {...emptyBuild(), name:'MotM test', race:`motm:${id}`, background:'custom', backgroundName:'Test', level, subclassId:level>=3?'champion':'', asi:level>=4?{4:['con','con']}:{} };
  for(let pass=0;pass<12;pass++) for(const g of buildGroups(build)) {
    if(build.choices[g.key]?.length===g.count && build.choices[g.key].every(id=>g.options.some(o=>o.id===id))) continue;
    const fixed = revisedCatalog.traits.find(t=>t.index===build.race)?.proficiencies?.map(p=>p.index.slice(6))||[];
    const used=[...fixed,...Object.entries(build.choices).filter(([k])=>k!==g.key).flatMap(([,v])=>v)];
    build.choices[g.key]=g.options.filter(o=>!(['skill','language'].includes(g.kind)||g.key==='origin.skills')||!used.includes(o.id)).slice(0,g.count).map(o=>o.id);
  }
  return build;
}
test('MotM fixed and selectable proficiencies work with every 2024 background',()=>{
 for(const id of ids) for(const bg of revisedCatalog.backgrounds) {
  const b=complete(id); b.background=bg.id; b.choices={};
  const fixed=revisedCatalog.traits.find(t=>t.index===b.race)?.proficiencies?.map(p=>p.index.slice(6))||[];
  for(let pass=0;pass<12;pass++) for(const g of buildGroups(b)) {
   if(b.choices[g.key]?.length===g.count&&b.choices[g.key].every(id=>g.options.some(o=>o.id===id)))continue;
   const used=[...fixed,...Object.entries(b.choices).filter(([k])=>k!==g.key).flatMap(([,v])=>v)];
   b.choices[g.key]=g.options.filter(o=>!(['skill','language'].includes(g.kind)||g.key==='origin.skills')||!used.includes(o.id)).slice(0,g.count).map(o=>o.id);
  }
  assert.deepEqual(validateBuild(b).errors,[],`${id}/${bg.id}`);
 }
});
test('all 33 distinctly identified MotM species save at levels 1–5 without legacy ASI',()=>{
  assert.equal(revisedCatalog.races.filter(r=>r.index.startsWith('motm:')).length,33);
  for(const id of ids) for(let level=1;level<=5;level++) {
    const build=complete(id,level), result=validateBuild(JSON.parse(JSON.stringify(build)));
    assert.deepEqual(result.errors,[],`${id}/${level}`);
    const sheet=deriveSheet(result.build);
    assert.match(sheet.raceName,/MotM/);
    assert.equal(sheet.scores.str,15);
    assert.ok(sheet.features.some(f=>f.name.includes('MotM')));
  }
});
