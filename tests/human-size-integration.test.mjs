import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyBuild, buildGroups, revisedCatalog, validateBuild, deriveSheet} from '../dist-server/characters.js';
import {speciesGuide} from '../dist-server/catalog/species-guide.js';

// Blade Ward 2024: https://roll20.net/compendium/dnd5e/Spells:Blade%20Ward?expansion=32231
 test('runtime Blade Ward concentration flag agrees with its duration and description',()=>{
 const spell=revisedCatalog.spells.find(s=>s.index==='blade-ward');
 assert.match(spell.duration,/Concentration, up to 1 minute/);
 assert.match(spell.desc.join(' '),/konsentrasi/);
 assert.equal(spell.concentration,true);
});

test('Human size metadata and selection persist through validation and derivation',()=>{
 assert.equal(revisedCatalog.races.find(r=>r.index==='human').size,'Medium / Small');
 const build={...emptyBuild(),name:'Small Human',choices:{'race.size':['Small']}};
 const group=buildGroups(build).find(g=>g.key==='race.size');
 assert.deepEqual(group.options.map(o=>o.id),['Medium','Small']);
 for(let pass=0;pass<12;pass++) for(const choice of buildGroups(build)) {
  if(build.choices[choice.key]?.length===choice.count && build.choices[choice.key].every(id=>choice.options.some(o=>o.id===id))) continue;
  const used=Object.values(build.choices).flat();
  build.choices[choice.key]=choice.options.filter(o=>!['skill','language'].includes(choice.kind)||!used.includes(o.id)).slice(0,choice.count).map(o=>o.id);
 }
 const result=validateBuild(JSON.parse(JSON.stringify(build)));
 assert.deepEqual(result.errors,[]);
 const saved=result.build;
 assert.deepEqual(saved.choices['race.size'],['Small']);
 assert.ok(deriveSheet(saved));
 assert.equal(speciesGuide(saved,revisedCatalog).size,'Small');
 const invalid=validateBuild({...build,choices:{'race.size':['Large']}});
 assert.ok(invalid.issues.some(i=>i.groupKey==='race.size'));
});
