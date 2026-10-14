import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { persistence } from '../dist-server/persistence.js';
import { resources } from '../dist-server/resources.js';
import { emptyBuild, buildGroups, deriveSheet, validateBuild } from '../dist-server/characters.js';

test('Agonizing Blast offers selected damaging Warlock cantrip', () => {
  const build = { ...emptyBuild(), classId: 'warlock', level: 2, cantrips: ['eldritch-blast'], choices: { 'class.invocations': ['agonizing-blast'] } };
  const group = buildGroups(build).find((entry) => entry.key === 'invocation.agonizing-blast');
  assert.ok(group);
  assert.deepEqual(group.options.map((option) => option.id), ['eldritch-blast']);
});

test('async persistence flush writes latest snapshot atomically',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'meja-save-'));
  try {let state={revision:1}; const store=persistence(path.join(dir,'rooms.json'),()=>state);store.save();state={revision:2};store.save();await store.flush();assert.deepEqual(JSON.parse(await readFile(path.join(dir,'rooms.json'),'utf8')),{revision:2});}finally{await rm(dir,{recursive:true,force:true});}
});
test('2024 rest resources and Human repeatable origin feats available',()=>{
  const build={...emptyBuild(),level:5,classId:'bard'};
  const sheet=deriveSheet(build);
  const inspiration=resources(build,sheet).find(r=>r.id==='bardic-inspiration');
  assert.equal(inspiration.max,Math.max(1,sheet.modifiers.cha));assert.equal(inspiration.shortRest,true);
  const feats=buildGroups(build).find(g=>g.key==='human.feat').options;
  assert.ok(feats.some(f=>f.id==='skilled'));assert.ok(feats.some(f=>f.id==='magic-initiate'));
  assert.doesNotThrow(()=>validateBuild({...build,classId:'druid',subclassId:'circle-of-the-land',choices:{'subclass.land':['constructor']}}));
});
