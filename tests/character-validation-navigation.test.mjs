import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBuild, buildGroups, validateBuild } from '../dist-server/characters.js';

test('incomplete expertise identifies its proficiency group without changing error strings', () => {
  const build = { ...emptyBuild(), name: 'Rogue', classId: 'rogue' };
  const group = buildGroups(build).find(g => g.key.includes('expertise'));
  assert.ok(group);
  const result = validateBuild(build);
  const message = `${group.name}: pilih ${group.count} opsi yang valid.`;
  assert.ok(result.errors.includes(message));
  assert.deepEqual(result.issues?.find(issue => issue.message === message), {
    message, section: 'proficiency', groupKey: group.key,
  });
});

test('duplicate skills target an involved proficiency group, never expertise or identity', () => {
  const build = { ...emptyBuild(), name: 'Rogue', classId: 'rogue' };
  const groups = buildGroups(build).filter(g => g.kind === 'skill');
  let pair;
  for (const first of groups) for (const second of groups) {
    const shared = first.options.find(o => second !== first && second.options.some(p => p.id === o.id));
    if (shared) pair = [first, second, shared.id];
  }
  assert.ok(pair);
  build.choices[pair[0].key] = [pair[2]];
  build.choices[pair[1].key] = [pair[2]];
  const result = validateBuild(build);
  const message = 'Skill proficiency ganda. Pilih skill lain; proficiency tetap tidak ditumpuk.';
  assert.ok(result.errors.includes(message));
  const issue = result.issues?.find(issue => issue.message === message);
  assert.equal(issue?.section, 'proficiency');
  assert.ok(pair.slice(0, 2).some(group => group.key === issue.groupKey));
  const target = groups.find(group => group.key === issue.groupKey);
  assert.ok(target.options.length > target.count, 'prefer a group where another skill can actually be selected');
});
