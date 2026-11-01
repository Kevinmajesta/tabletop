import snapshot from './spells-xphb-runtime.json' with { type: 'json' };
import type { Entry } from '../characters.js';

export const xphbSpells = snapshot.spells;
export const xphbSpellProvenance = snapshot.provenance;
const byId = new Map<string, (typeof xphbSpells)[number]>();
for (const spell of xphbSpells) {
  byId.set(spell.index, spell);
  for (const alias of spell.aliases) byId.set(alias, spell);
}

export function xphbSpellId(index: string): string {
  return byId.get(index)?.index || index;
}

// Retain IDs used by current species/subclass/feat mechanics, not duplicate legacy spell entries.
export function mergeXphbSpells(existing: Entry[]): Entry[] {
  const seen = new Set<string>();
  const result: Entry[] = [];
  for (const entry of existing) {
    const spell = byId.get(entry.index);
    const key = spell?.index || entry.index;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(spell ? { ...spell, index: entry.index } : entry);
  }
  for (const spell of xphbSpells) {
    if (!seen.has(spell.index)) result.push(spell);
  }
  return result;
}
