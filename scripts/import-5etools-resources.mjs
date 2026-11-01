import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || 'D:/5etools-src');
const output = fileURLToPath(new URL('../server/catalog/resources-xphb.json', import.meta.url));
const revision = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (revision !== '8790755429c346d20020eed7826d312d484c393f') throw new Error(`Unexpected source revision: ${revision}`);
const files = ['races', 'backgrounds', 'feats', 'optionalfeatures', 'items-base', 'items'].map(f => `data/${f}.json`);
files.push(...(await readdir(path.join(root, 'data/class'))).filter(f => /^class-.*\.json$/.test(f)).sort().map(f => `data/class/${f}`));
const resources = [];
const slug = value => String(value).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const file of files) {
  const data = JSON.parse(await readFile(path.join(root, file), 'utf8'));
  for (const [kind, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) continue;
    for (const raw of rows.filter(row => row.source === 'XPHB')) {
      const name = raw.name || raw.abbreviation;
      if (!name) throw new Error(`Missing resource name: ${file}/${kind}`);
      const id = ['xphb', kind, raw.className, raw.subclassShortName, name, raw.level].filter(v => v !== undefined).map(slug).join(':');
      resources.push({ id, kind, name, source: 'XPHB', page: raw.page ?? null, file, desc: [], raw });
    }
  }
}
if (new Set(resources.map(r => r.id)).size !== resources.length) throw new Error('Duplicate XPHB resource IDs');
const referenceKey = (kind, raw) => {
  if (kind === 'classFeature') return [raw.name, raw.className, raw.classSource, raw.level, raw.source].join('|');
  if (kind === 'subclassFeature') return [raw.name, raw.className, raw.classSource, raw.subclassShortName, raw.subclassSource, raw.level, raw.source].join('|');
  return [raw.name, raw.source].join('|');
};
const references = new Map(resources.map(r => [`${r.kind}:${referenceKey(r.kind, r.raw).toLowerCase()}`, r]));
const unresolved = new Set();
function inline(text) {
  let previous;
  do {
    previous = text;
    text = text.replace(/\{@(\w+) ([^{}]*)}/g, (_, tag, payload) => {
      const parts = payload.split('|');
      if (['filter', 'link', 'quickref', 'book', 'adventure'].includes(tag)) return parts[0];
      if (tag === 'deity') return parts[3] || parts[0];
      return parts[2] || parts[0];
    });
  } while (text !== previous);
  return text;
}
function render(value, seen = new Set()) {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number') return [inline(String(value))];
  if (Array.isArray(value)) return value.flatMap(v => render(v, seen));
  const refKind = { refClassFeature: 'classFeature', refSubclassFeature: 'subclassFeature', refOptionalfeature: 'optionalfeature', refFeat: 'feat' }[value.type];
  if (refKind) {
    const ref = value[refKind];
    const parts = ref.split('|');
    const expected = refKind === 'classFeature' ? 5 : refKind === 'subclassFeature' ? 7 : 2;
    if (parts.length < expected) parts.push(parts[2] || 'XPHB');
    const key = `${refKind}:${parts.join('|').toLowerCase()}`;
    const target = references.get(key);
    if (!target) { unresolved.add(key); return [`See ${parts[0]} (${parts[1] || 'XPHB'}).`]; }
    if (seen.has(key)) return [`See ${target.name}.`];
    return [target.name, ...render(target.raw.entries, new Set([...seen, key]))];
  }
  if (value.type === 'table') return [value.caption || '', render(value.colLabels, seen).join(' | '), ...(value.rows || []).map(row => row.map(cell => render(cell, seen).join(' ')).join(' | '))].filter(Boolean);
  if (value.type === 'cell') return render(value.entry ?? value.roll?.exact ?? `${value.roll?.min ?? ''}–${value.roll?.max ?? ''}`, seen);
  if (value.type === 'statblock') return [`See ${value.name} (${value.source || 'XPHB'} stat block).`];
  return [value.name ? inline(value.name) : '', ...render(value.entries ?? value.entry ?? value.items ?? [], seen)].filter(Boolean);
}
// Include structured fluff where it exists; the book dump is not required.
for (const file of ['data/fluff-races.json', 'data/fluff-backgrounds.json', 'data/fluff-feats.json', 'data/fluff-items.json', 'data/fluff-optionalfeatures.json']) {
  const data = JSON.parse(await readFile(path.join(root, file), 'utf8'));
  for (const rows of Object.values(data).filter(Array.isArray)) for (const fluff of rows.filter(r => r.source === 'XPHB')) {
    for (const resource of resources.filter(r => r.name === fluff.name)) resource.fluff = { file, raw: fluff };
  }
}
for (const r of resources) {
  r.desc = [...render(r.fluff?.raw.entries), ...render(r.raw.entries)];
  if (r.kind === 'class' || r.kind === 'subclass') {
    const featureKind = r.kind === 'class' ? 'classFeature' : 'subclassFeature';
    for (let level = 1; level <= 20; level++) {
      const features = resources.filter(f => f.kind === featureKind && f.raw.className === (r.raw.className || r.name) && (r.kind === 'class' || f.raw.subclassShortName === r.raw.shortName) && f.raw.level === level);
      if (features.length) r.desc.push(`Level ${level}`, ...features.flatMap(f => [f.name, ...render(f.raw.entries)]));
    }
    if (r.kind === 'class') r.desc.unshift(...render(r.raw.startingEquipment?.entries));
  }
  if (['baseitem', 'item', 'itemGroup'].includes(r.kind)) {
    const raw = r.raw;
    r.desc.push(...render(raw.additionalEntries));
    if (raw.dmg1) r.desc.push(`Damage: ${raw.dmg1}${raw.dmg2 ? ` (versatile ${raw.dmg2})` : ''} ${raw.dmgType || ''}`);
    if (raw.ac) r.desc.push(`Armor Class: ${raw.ac}`);
    for (const [field, kind, key] of [['type', 'itemType', 'abbreviation'], ['property', 'itemProperty', 'abbreviation'], ['mastery', 'itemMastery', 'name']]) {
      for (const ref of [raw[field] || []].flat()) {
        const uid = typeof ref === 'string' ? ref : ref.uid;
        const target = resources.find(x => x.kind === kind && x.raw[key]?.toLowerCase() === uid.split('|')[0].toLowerCase());
        if (target) r.desc.push(target.name, ...render(target.raw.entries), ...(ref.note ? [ref.note] : []));
      }
    }
    if (raw.items) r.desc.push(`Options: ${raw.items.map(v => v.split('|')[0]).join(', ')}`);
  }
  r.desc = [...new Set(r.desc.filter(Boolean))];
}
const mpmmResources = [];
const raceData = JSON.parse(await readFile(path.join(root, 'data/races.json'), 'utf8'));
const raceFluff = JSON.parse(await readFile(path.join(root, 'data/fluff-races.json'), 'utf8'));
for (const kind of ['race', 'subrace']) for (const raw of raceData[kind].filter(r => r.source === 'MPMM')) {
  const fluff = raceFluff.raceFluff?.find(f => f.source === 'MPMM' && f.name === (kind === 'subrace' ? `${raw.name} ${raw.raceName}` : raw.name));
  const inherited = fluff?._copy ? raceFluff.raceFluff.find(f => f.name === fluff._copy.name && f.source === fluff._copy.source) : undefined;
  const fluffEntries = fluff?._copy ? [...(fluff._copy._mod?.entries?.items || []), ...(inherited?.entries || [])] : fluff?.entries;
  mpmmResources.push({ id: `mpmm:${kind}:${slug(raw.raceName || '')}:${slug(raw.name)}`, kind, name: raw.name, source: 'MPMM', page: raw.page, file: 'data/races.json', desc: [...render(fluffEntries), ...render(raw.entries)], traitSections: (raw.entries || []).filter(e => e.name).map(e => ({ name: inline(e.name), desc: render(e.entries) })), raw, ...(fluff ? { fluff: { file: 'data/fluff-races.json', raw: fluff } } : {}) });
}
const counts = {};
for (const r of resources) counts[r.kind] = (counts[r.kind] || 0) + 1;
const metadata = { source: 'XPHB', revision, counts, total: resources.length, unresolvedReferences: [...unresolved].sort(), mechanics: 'Reference text and structured source data; not automatic rules implementation.' };
metadata.mpmm = { source: 'MPMM', counts: { race: mpmmResources.filter(r => r.kind === 'race').length, subrace: mpmmResources.filter(r => r.kind === 'subrace').length }, selectableSpecies: 33 };
await writeFile(output, JSON.stringify({ metadata, resources, mpmmResources }, null, 2) + '\n');
console.log(JSON.stringify(metadata, null, 2));
