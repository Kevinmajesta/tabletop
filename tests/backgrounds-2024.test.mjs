import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisedCatalog, emptyBuild, buildGroups, validateBuild, deriveSheet } from '../dist-server/characters.js';

function complete(background, packet = '0') {
  const build = { ...emptyBuild(), name: 'Background test', background };
  for (let pass = 0; pass < 10; pass++) {
    for (const group of buildGroups(build)) {
      if (build.choices[group.key]?.length === group.count && build.choices[group.key].every(id => group.options.some(o => o.id === id))) continue;
      const usedSkills = new Set([...buildGroups(build).filter(g => g.kind === 'skill').flatMap(g => build.choices[g.key] || []), ...build.choices['origin.skills'] || []]);
      const usedLanguages = new Set(buildGroups(build).filter(g => g.kind === 'language').flatMap(g => build.choices[g.key] || []));
      build.choices[group.key] = group.key === 'background.equipment.0' ? [packet] : group.options.filter(o => !(group.kind === 'skill' && usedSkills.has(o.id)) && !(group.kind === 'language' && usedLanguages.has(o.id))).slice(0, group.count).map(o => o.id);
    }
  }
  return build;
}

test('all sixteen 2024 backgrounds can be saved with either equipment package', () => {
  assert.equal(revisedCatalog.backgrounds.length, 16);
  assert.equal(emptyBuild().ruleset, 'srd-2024');
  for (const bg of revisedCatalog.backgrounds) for (const packet of ['0', '1']) {
    const build = complete(bg.id, packet);
    assert.deepEqual(validateBuild(build).errors, [], `${bg.name}/${packet}`);
    const sheet = deriveSheet(build);
    assert.ok(sheet.features.some(f => f.name === bg.feature && f.desc[0]));
    assert.ok(sheet.languages.includes('Common'));
    assert.ok(sheet.equipment.some(e => e.id === 'gp' && e.count >= (packet === '1' ? 50 : 1)));
    if (packet === '0' && build.choices['background.tool.0']) assert.ok(sheet.equipment.some(e => e.id === build.choices['background.tool.0'][0]));
  }
});

test('2024 origin feat effects and spell lists reach sheet correctly', () => {
  const farmer = complete('srd-2024:farmer');
  assert.equal(deriveSheet(farmer).hp, 10 + deriveSheet(farmer).modifiers.con + 2);
  const guard = complete('srd-2024:guard');
  assert.equal(deriveSheet(guard).initiative, deriveSheet(guard).modifiers.dex + 2);
  const guide = complete('srd-2024:guide');
  const sheet = deriveSheet(guide);
  assert.ok(sheet.spells.includes(guide.choices['origin.spell'][0]));
  assert.ok(!sheet.cantrips.includes(guide.choices['origin.spell'][0]));
  assert.ok(guide.choices['origin.cantrips'].every(id => revisedCatalog.spells.find(s => s.index === id).classes.some(c => c.index === 'druid')));
  assert.ok(validateBuild({ ...guide, choices: { ...guide.choices, 'background.bonus.two': ['cha'] } }).errors.length);
});

test('origin tools use canonical IDs and fixed class/background tools do not duplicate', () => {
  const artisan = complete('srd-2024:artisan');
  const crafter = buildGroups(artisan).find(g => g.key === 'origin.tools');
  assert.ok(crafter.options.some(o => o.id === 'cartographer-tools'));
  assert.ok(!crafter.options.some(o => o.id === 'cartographers-tools'));
  artisan.choices['origin.tools'] = ['cartographer-tools', 'smiths-tools', 'weavers-tools'];
  assert.ok(deriveSheet(artisan).proficiencies.includes('cartographer-tools'));
  assert.ok(!deriveSheet(artisan).proficiencies.includes('cartographers-tools'));
  for (const [classId, background, tool] of [['rogue', 'criminal', 'thieves-tools'], ['druid', 'hermit', 'herbalism-kit']]) {
    const build = { ...complete(`srd-2024:${background}`), classId };
    assert.equal(deriveSheet(build).proficiencies.filter(id => id === tool).length, 1);
  }
});
