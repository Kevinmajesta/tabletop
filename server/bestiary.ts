// Monster Manual 2024 (XMM) hasil impor 5etools (scripts/import-5etools-bestiary.mjs).
// Hanya untuk pemakaian pribadi: teks non-SRD adalah hak cipta Wizards of the Coast. Klien memuat modul ini secara lazy.
import xmm from "./catalog/monsters-xmm.json" with { type: "json" };
import type { Monster, MonsterStats } from "./monsters.js";

export type BestiaryStats = MonsterStats & { group: string; tokenSize: number; color: string; srd: boolean };
const book = xmm as unknown as Record<string, BestiaryStats>;
export const bestiaryStats = (key: string): BestiaryStats | undefined => book[key];
export const bestiaryMonsters: Monster[] = Object.entries(book)
  .map(([key, s]) => ({ key, name: s.name, group: s.group, ac: s.ac, hp: s.hp, init: s.init, size: s.tokenSize, color: s.color, cr: s.cr }))
  .sort((a, b) => a.name.localeCompare(b.name));
