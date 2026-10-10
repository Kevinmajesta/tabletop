import { mkdirSync, writeFileSync } from 'node:fs';
const base = 'https://www.dnd5eapi.co';
const edition = process.argv[2] === '2024' ? '2024' : '2014';
async function get(url) {
  const response = await fetch(base + url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
async function collection(name) {
  const list = await get(`/api/${edition}/${name}`);
  const results = [];
  for (let i = 0; i < list.results.length; i += 6) results.push(...await Promise.all(list.results.slice(i, i + 6).map(item => get(item.url))));
  return results;
}
const classes = await collection('classes');
for (const entry of classes) { entry.levels = (await get(entry.class_levels)).filter(level => level.level <= 7); entry.levelOne = entry.levels[0]; }
const races = await collection(edition === '2024' ? 'species' : 'races');
const subraces = await collection(edition === '2024' ? 'subspecies' : 'subraces');
const backgrounds = await collection('backgrounds');
const skills = await collection('skills');
const equipment = await collection('equipment');
const categories = await collection('equipment-categories');
const allSpells = await collection('spells');
const spells = allSpells.filter(spell => spell.level <= 4);
const features = await collection('features');
const traits = await collection('traits');
const subclasses = await collection('subclasses');
for (const entry of subclasses) entry.levels = await get(entry.subclass_levels || `/api/${edition}/subclasses/${entry.index}/levels`);
const languages = await collection('languages');
const feats = edition === '2024' ? await collection('feats') : [];
mkdirSync(new URL('../server/catalog/', import.meta.url), { recursive: true });
const output = { version: 1, ruleset: `srd-${edition}`, source: base, fetchedAt: new Date().toISOString(), classes, races, subraces, backgrounds, skills, equipment, categories, spells, features, traits, subclasses, languages, feats };
writeFileSync(new URL(`../server/catalog/srd-${edition}.json`, import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(`SRD snapshot: ${classes.length} classes through level 7, ${races.length} races, ${spells.length} level 0–4 spells`);
