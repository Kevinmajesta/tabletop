import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = process.argv[2] || 'D:/5etools-src';
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const text = value => {
  if (typeof value === 'string') return value.replace(/\{@\w+ ([^{}]+)\}/g, (_, body) => body.split('|')[0]);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('\n');
  if (!value || typeof value !== 'object') return '';
  return [value.name, text(value.entries || value.items || value.entry || value.rows)].filter(Boolean).join(': ');
};
const result = { source: 'XPHB', sourcePath: 'data/class/class-*.json', classes: {}, subclasses: {}, features: [], subclassSpells: {} };
function levels(entity, groups, refs, featureData, owner) {
  return Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    const features = refs.flatMap(ref => {
      const uid = typeof ref === 'string' ? ref : ref.classFeature || ref.subclassFeature;
      if (!uid) return [];
      const parts = uid.split('|');
      const rank = Number(parts[owner === 'class' ? 3 : 5]);
      if (rank !== level) return [];
      const sourceFeature = featureData.find(f => f.name === parts[0] && f.level === level && f.source === 'XPHB' && (owner === 'class' || f.subclassShortName === entity.shortName));
      const index = `xphb:${slug(entity.name)}:${level}:${slug(parts[0])}`;
      result.features.push({ index, name: parts[0], level, desc: sourceFeature ? [text(sourceFeature.entries)] : ['See PHB 2024.'] });
      return [{ index, name: parts[0] }];
    });
    const spellcasting = { cantrips_known: entity.cantripProgression?.[i] || 0, prepared_spells: entity.preparedSpellsProgression?.[i] || entity.spellsKnownProgression?.[i] || 0 };
    const specific = {};
    for (const group of groups || []) {
      if (group.rowsSpellProgression) group.rowsSpellProgression[i].forEach((slots, n) => spellcasting[`spell_slots_level_${n + 1}`] = Number(slots));
      if (group.rows) group.colLabels.forEach((label, n) => {
        const key = text(label), value = group.rows[i]?.[n];
        if (/Cantrips/i.test(key)) spellcasting.cantrips_known = Number(value);
        else if (/Prepared Spells|Spells Prepared/i.test(key)) spellcasting.prepared_spells = Number(value);
        else specific[slug(key)] = typeof value === 'object' ? value.type === 'dice' ? value.toRoll.map(d => `${d.number}d${d.faces}`).join('+') : value.value ?? text(value) : Number.isFinite(Number(value)) ? Number(value) : value;
      });
    }
    if (entity.casterProgression === 'pact') spellcasting[`spell_slots_level_${specific['slot-level']}`] = specific['spell-slots'];
    return { level, features, prof_bonus: 2 + Math.floor(i / 4), spellcasting, class_specific: specific };
  });
}
for (const id of 'barbarian bard cleric druid fighter monk paladin ranger rogue sorcerer warlock wizard'.split(' ')) {
  const data = JSON.parse(readFileSync(resolve(root, `data/class/class-${id}.json`), 'utf8'));
  const klass = data.class.find(c => c.source === 'XPHB');
  assert.ok(klass, id);
  result.classes[id] = levels(klass, klass.classTableGroups, klass.classFeatures, data.classFeature, 'class');
  for (const sub of data.subclass.filter(s => s.source === 'XPHB')) {
    const key = slug(sub.name);
    result.subclassSpells[key] = (sub.additionalSpells || []).flatMap(entry => Object.entries(entry.prepared || {}).filter(([at]) => /^\d+$/.test(at)).map(([at, spells]) => ({ level: Number(at), spells: spells.filter(s => typeof s === 'string').map(s => slug(s.split('|')[0])) })));
    result.subclasses[key] = levels(sub, sub.subclassTableGroups, sub.subclassFeatures, data.subclassFeature, 'subclass');
  }
}
result.epicBoons = JSON.parse(readFileSync(resolve(root, 'data/feats.json'), 'utf8')).feat.filter(f => f.source === 'XPHB' && f.category === 'EB').map(f => ({ index: slug(f.name), name: f.name, abilities: f.ability[0].choose.from, description: text(f.entries) }));
assert.equal(result.epicBoons.length, 12);
assert.equal(Object.keys(result.classes).length, 12);
assert.equal(Object.keys(result.subclasses).length, 48);
for (const rows of [...Object.values(result.classes), ...Object.values(result.subclasses)]) assert.equal(rows.length, 20);
writeFileSync('server/catalog/progression-xphb.json', JSON.stringify(result, null, 2) + '\n');
console.log(`Generated ${Object.keys(result.classes).length} classes, ${Object.keys(result.subclasses).length} subclasses, ${result.features.length} feature records.`);
