import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const slug = name => name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const title = text => text[0].toUpperCase() + text.slice(1);
const schools = { A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment', V: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation' };

// Only the current XPHB tag vocabulary is accepted: new source syntax must not silently lose text.
export function readable(text) {
  let previous;
  do {
    previous = text;
    text = text.replace(/\{@(\w+) ([^{}]*)}/g, (_, tag, content) => {
      const parts = content.split('|');
      if (['b', 'i', 'dc', 'filter', 'book'].includes(tag)) return parts[0];
      if (tag === 'chance') return `${parts[1] || parts[0]}%`;
      if (['scaledamage', 'scaledice'].includes(tag)) return parts[3] || parts[0];
      if (['damage', 'dice'].includes(tag)) return parts[1] || parts[0];
      if (['variantrule', 'action', 'condition', 'creature', 'spell', 'sense', 'status', 'hazard', 'skill', 'item', 'race'].includes(tag)) return parts[2] || parts[0];
      throw new Error(`Unsupported spell tag: ${tag}`);
    });
  } while (text !== previous);
  if (text.includes('{@')) throw new Error(`Unrendered spell tag: ${text}`);
  return text;
}

export function renderEntries(entry) {
  if (typeof entry === 'string') return [readable(entry)];
  if (Array.isArray(entry)) return entry.flatMap(renderEntries);
  if (!entry || typeof entry !== 'object') throw new Error('Invalid spell entry');
  if (entry.type === 'table') return [
    ...(entry.caption ? [readable(entry.caption)] : []),
    entry.colLabels.map(readable).join(' | '),
    ...entry.rows.map(row => row.map(cell => renderEntries(cell).join(' ')).join(' | ')),
  ];
  if (['entries', 'item'].includes(entry.type)) return [
    ...(entry.name ? [readable(entry.name)] : []),
    ...renderEntries(entry.entries || [entry.entry]),
  ];
  if (entry.type === 'list') return entry.items.flatMap(item => renderEntries(item).map(line => `• ${line}`));
  throw new Error(`Unsupported spell entry type: ${entry.type}`);
}

export function importSpells(sourceRoot) {
  const input = readFileSync(resolve(sourceRoot, 'data/spells/spells-xphb.json'));
  const spells = JSON.parse(input).spell.filter(s => s.source === 'XPHB');
  if (spells.length !== 391) throw new Error(`Expected 391 XPHB spells; received ${spells.length}`);
  const lookup = JSON.parse(readFileSync(resolve(sourceRoot, 'data/generated/gendata-spell-source-lookup.json'))).xphb;
  const result = spells.map(s => {
    const classes = Object.keys(lookup[s.name.toLowerCase()]?.class?.XPHB || {});
    if (!classes.length) throw new Error(`Missing XPHB class membership: ${s.name}`);
    const distance = s.range.distance;
    const range = distance.amount ? `${distance.amount} ${distance.type}` : title(distance.type);
    const higher = renderEntries(s.entriesHigherLevel || []);
    const material = typeof s.components.m === 'string' ? s.components.m : s.components.m?.text;
    const body = renderEntries(s.entries);
    const school = schools[s.school];
    if (!school) throw new Error(`Unknown spell school: ${s.school}`);
    // shortcut: combat rows expose the first base damage only; multi-hit and conditional damage stay manual.
    const attackDice = body.some(line => /make (?:a |an )?(?:melee|ranged )?spell attack/i.test(line))
      ? JSON.stringify(s.entries).match(/\{@damage ([^|}]+)/)?.[1] : undefined;
    return {
      index: slug(s.name), name: s.name, source: s.source, page: s.page,
      aliases: typeof s.srd52 === 'string' ? [slug(s.srd52)] : [],
      level: s.level, school: { index: slug(school), name: school },
      classes: classes.map(name => ({ index: slug(name), name })),
      casting_time: s.time.map(t => `${t.number} ${t.unit}${t.number !== 1 ? 's' : ''}${t.condition ? `, ${readable(t.condition)}` : ''}`).join(' or '),
      range: s.range.type === 'point' ? range : `Self (${range} ${s.range.type})`,
      components: ['v', 's', 'm'].filter(c => s.components[c]).map(c => c.toUpperCase()),
      ...(material ? { material: readable(material) } : {}),
      concentration: s.duration.some(d => !!d.concentration), ritual: !!s.meta?.ritual,
      duration: s.duration.map(d => {
        if (d.type === 'instant') return 'Instantaneous';
        if (d.type === 'special') return 'Special';
        if (d.type === 'permanent') return `Until ${(d.ends || []).map(e => ({ dispel: 'dispelled', trigger: 'triggered' })[e] || e).join(' or ')}`;
        if (d.type !== 'timed') throw new Error(`Unknown duration ${d.type}`);
        return `${d.concentration ? 'up to ' : ''}${d.duration.amount} ${d.duration.type}${d.duration.amount !== 1 ? 's' : ''}`;
      }).join(' or '),
      ...(attackDice ? { damage: {
        damage_dice: attackDice,
        damage_type: { index: s.damageInflict?.[0] || 'special', name: title(s.damageInflict?.[0] || 'special') },
        damage_at_slot_level: { [String(s.level)]: attackDice },
      } } : {}),
      desc: [...body, ...higher], description: [...body, ...higher].join('\n'),
      ...(higher.length ? { higher_level: higher } : {}),
      entries: s.entries, entriesHigherLevel: s.entriesHigherLevel || [],
      // Preserve mechanics and rich source structure independently from the UI text projection.
      raw: s,
    };
  });
  if (new Set(result.map(s => s.index)).size !== 391) throw new Error('Duplicate spell IDs');
  return {
    provenance: {
      source: 'XPHB', path: 'data/spells/spells-xphb.json',
      commit: execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    },
    spells: result,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = importSpells(process.argv[2] || 'D:/5etools-src');
  writeFileSync(new URL('../server/catalog/spells-xphb.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
  console.log(`Imported ${output.spells.length} XPHB spells (levels 0–9), commit ${output.provenance.commit}`);
}
