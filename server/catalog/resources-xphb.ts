import snapshot from './resources-xphb-runtime.json' with { type: 'json' };
import { generalFeats } from './feats-2024.js';
import { originFeats } from './backgrounds-2024.js';
import { invocations, metamagic } from './class-options-2024.js';
import type { Catalog, Entry } from '../characters.js';

type Raw = Record<string, any>;
export type BookResource = { id: string; kind: string; name: string; source: string; page: number | null; file: string; desc: string[]; raw: Raw; traitSections?: { name: string; desc: string[] }[] };
export const xphbResourceMetadata = snapshot.metadata;
export const xphbResources = snapshot.resources as BookResource[];
export const resourceSlug = (name: string) => name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const provenance = (r: BookResource) => ({ source: r.source, page: r.page, file: r.file, resourceId: r.id, revision: snapshot.metadata.revision, mechanics: 'reference-only' });
const entry = (r: BookResource, index = resourceSlug(r.name)) => ({ index, name: r.name, desc: r.desc, description: r.desc.join('\n'), xphb: provenance(r) });
export const xphbFeats = xphbResources.filter(r => r.kind === 'feat').map(r => ({ ...entry(r), category: r.raw.category, prerequisite: r.raw.prerequisite || [], sourceData: r.raw }));
export const xphbOptionalFeatures = xphbResources.filter(r => r.kind === 'optionalfeature').map(r => ({ ...entry(r), featureType: r.raw.featureType, prerequisite: r.raw.prerequisite || [], sourceData: r.raw }));
const normalize = (name: string) => resourceSlug(name).replace(/-armor$/, '');
export const mpmmResources = snapshot.mpmmResources as BookResource[];
export const mpmmSpeciesResources = mpmmResources.filter(r => r.kind === 'race' && r.name !== 'Genasi').map(r => ({ ...r, index: `motm:${resourceSlug(r.name)}` }));
const genasi = mpmmResources.find(r => r.kind === 'race' && r.name === 'Genasi');
for (const r of mpmmResources.filter(r => r.kind === 'subrace')) mpmmSpeciesResources.push({ ...r, index: `motm:genasi-${resourceSlug(r.name)}`, name: `${r.name} Genasi`, desc: [...(genasi?.desc || []), ...r.desc] });
const ref = (name: string) => ({ index: resourceSlug(name), name });
function equipment(r: BookResource): Entry {
  const raw = r.raw;
  const type = String(raw.type || '').split('|')[0];
  const category = ['LA','MA','HA','S'].includes(type) ? `${({ LA: 'light', MA: 'medium', HA: 'heavy', S: 'shield' } as Raw)[type]}${type === 'S' ? 's' : '-armor'}` : ['M','R'].includes(type) ? `${raw.weaponCategory}-weapons` : 'adventuring-gear';
  const damageTypes: Raw = { B: 'Bludgeoning', P: 'Piercing', S: 'Slashing', N: 'Necrotic', R: 'Radiant', Y: 'Psychic', F: 'Fire', C: 'Cold', L: 'Lightning', A: 'Acid', T: 'Thunder', O: 'Force', I: 'Poison' };
  const result: Entry & Raw = { ...entry(r), equipment_category: ref(category), equipment_categories: [ref(category)] };
  if (raw.weight !== undefined) result.weight = raw.weight;
  if (raw.value !== undefined) result.cost = { quantity: raw.value / 100, unit: 'gp' };
  if (raw.weaponCategory) result.weapon_category = raw.weaponCategory === 'martial' ? 'Martial' : 'Simple';
  if (['M','R'].includes(type)) result.weapon_range = type === 'R' ? 'Ranged' : 'Melee';
  if (raw.dmg1) result.damage = { damage_dice: raw.dmg1, damage_type: ref(damageTypes[raw.dmgType] || raw.dmgType || 'Damage') };
  if (['LA','MA','HA','S'].includes(type)) {
    result.armor_category = ({ LA: 'Light', MA: 'Medium', HA: 'Heavy', S: 'Shield' } as Raw)[type];
    result.armor_class = { base: raw.ac, dex_bonus: ['LA','MA'].includes(type), ...(type === 'MA' ? { max_bonus: 2 } : {}) };
  }
  if (raw.strength) result.str_minimum = raw.strength;
  if (raw.property) result.properties = raw.property.map((p: string | { uid: string }) => {
    const abbreviation = (typeof p === 'string' ? p : p.uid).split('|')[0];
    const property = xphbResources.find(x => x.kind === 'itemProperty' && x.raw.abbreviation === abbreviation);
    return ref(property?.raw.entries?.[0]?.name || abbreviation);
  });
  return result;
}

// Apply after mechanics/progression composition; imports from characters are type-only.
export function applyXphbResources(catalog: Catalog): Catalog {
  const merge = (rows: Entry[], kind: string, create = (r: BookResource): Entry => entry(r)) => {
    const resources = xphbResources.filter(r => r.kind === kind);
    const matched = new Set<string>();
    const result = rows.map(old => {
      if (old.index.startsWith('motm:')) return old;
      const candidates = resources.filter(r => normalize(r.name) === normalize(old.name) && (!r.raw.className || !old.class || resourceSlug(r.raw.className) === old.class.index));
      const r = candidates.length === 1 ? candidates[0] : undefined;
      if (!r) return old;
      matched.add(r.id);
      return { ...old, desc: r.desc, description: r.desc.join('\n'), xphb: provenance(r) };
    });
    for (const r of resources) if (!matched.has(r.id)) {
      const fresh = create(r);
      if (!result.some(row => row.index === fresh.index)) result.push(fresh);
    }
    return result;
  };
  const subclasses = merge(catalog.subclasses, 'subclass', r => ({ ...entry(r), class: ref(r.raw.className) }));
  const features = catalog.features.map(old => {
    if (old.index.startsWith('motm:')) return old;
    const classId = old.class?.index || (old.index.startsWith('xphb:') ? old.index.split(':')[1] : undefined);
    if (!classId && !old.subclass) return old;
    const subclass = old.subclass ? subclasses.find(s => s.index === old.subclass?.index) : undefined;
    const candidates = xphbResources.filter(r => ['classFeature', 'subclassFeature'].includes(r.kind) && normalize(r.name) === normalize(old.name) && (!classId || resourceSlug(r.raw.className) === classId) && (subclass ? normalize(r.raw.subclassShortName) === normalize(subclass.name.replace(/^(Path of the |College of |Circle of the |Oath of (the )?|Warrior of (the )?)/, '').replace(/ (Domain|Patron|Sorcery)$/, '')) : r.kind === 'classFeature'));
    const level = typeof old.level === 'number' ? old.level : undefined;
    const r = (level ? candidates.filter(r => r.raw.level === level) : candidates).sort((a,b) => a.raw.level - b.raw.level)[0];
    return r ? { ...old, desc: r.desc, description: r.desc.join('\n'), xphb: provenance(r) } : old;
  });
  const traits = catalog.traits.map(old => {
    if (old.index.startsWith('motm:')) return old;
    const owners = catalog.races.filter(race => race.traits?.some(t => t.index === old.index));
    const matching = xphbResources.filter(r => r.kind === 'race' && owners.some(o => normalize(o.name) === normalize(r.name))).flatMap(r => (r.raw.entries || []).filter((e: Raw) => e.name && (normalize(e.name) === normalize(old.name) || normalize(old.name).startsWith(`${normalize(e.name)}-`))).map((e: Raw) => ({ r, name: e.name })));
    const match = matching[0];
    if (!match) return old;
    const start = match.r.desc.indexOf(match.name);
    const nextNames = (match.r.raw.entries || []).map((e: Raw) => e.name).filter(Boolean);
    let end = start + 1;
    while (end < match.r.desc.length && !nextNames.includes(match.r.desc[end])) end++;
    const desc = match.r.desc.slice(start + 1, end);
    return desc.length ? { ...old, desc, description: desc.join('\n'), xphb: provenance(match.r) } : old;
  });
  const backgrounds = catalog.backgrounds.map(old => {
    const r = xphbResources.find(r => r.kind === 'background' && normalize(r.name) === normalize(old.name));
    return r ? { ...old, desc: r.desc.join('\n'), xphb: provenance(r) } : old;
  });
  let gear = merge(catalog.equipment, 'baseitem', equipment);
  gear = merge(gear, 'item', equipment);
  gear = merge(gear, 'itemGroup', equipment);
  const mpmm = (old: Entry): Entry => {
    const owner = catalog.races.find(race => race.traits?.some(trait => trait.index === old.index));
    const r = mpmmSpeciesResources.find(r => r.index === old.index || r.index === owner?.index);
    if (!r) return old;
    let detail = r.desc;
    if (r.index !== old.index) {
      const headings = (r.raw.entries || []).map((item: Raw) => item.name).filter(Boolean);
      const start = detail.findIndex(text => normalize(text) === normalize(old.name));
      if (start < 0) return old;
      let end = start + 1;
      while (end < detail.length && !headings.includes(detail[end])) end++;
      detail = detail.slice(start + 1, end);
    }
    const desc = [...new Set([...(old.desc || []), ...detail])];
    return { ...old, desc, description: desc.join('\n'), mpmm: provenance(r) } as Entry;
  };
  return { ...catalog, classes: merge(catalog.classes, 'class'), races: merge(catalog.races, 'race').map(mpmm), traits: traits.map(mpmm), subclasses, features, equipment: gear, backgrounds };
}
