// Monster cepat untuk DM: token langsung jadi dengan HP, AC, dan bonus initiative.
// Angka dari SRD 5.1 (CC BY 4.0). Gambar token: lihat monsterImage di bawah.
import type { BoardToken } from './tabletop.js';
import srd from './catalog/monsters-srd.json' with { type: 'json' };
import homebrew from './catalog/monsters-homebrew.json' with { type: 'json' };

// Stat block lengkap per monster (SRD 5.1 via dnd5eapi.co, CC BY 4.0).
export type MonsterAction = { name: string; desc: string; attack?: number; damage?: { dice: string; type: string }[]; dc?: { ability?: string; value: number }; usage?: string };
export type MonsterStats = {
  name: string; source: string; meta: string; ac: number; acNote: string; hp: number; hitDice: string; speed: string;
  abilities: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>;
  saves: [string, number][]; skills: [string, number][];
  vulnerabilities: string; resistances: string; immunities: string; conditionImmunities: string;
  senses: string; languages: string; cr: string; xp: number; prof: number; init: number;
  traits: { name: string; desc: string }[]; actions: MonsterAction[]; bonus?: MonsterAction[]; reactions: { name: string; desc: string }[]; legendary: { name: string; desc: string }[];
};
// Monster buatan sendiri (homebrew) memakai format yang sama.
const stats = { ...(srd as unknown as Record<string, MonsterStats>), ...(homebrew as unknown as Record<string, MonsterStats>) };
export const monsterStats = (key: string): MonsterStats | undefined => stats[key];

export type Monster = { key: string; name: string; group: string; ac: number; hp: number; init: number; size: number; color: string; cr?: string };
const base: Monster[] = [
  { key: 'goblin', name: 'Goblin', group: 'Humanoid', ac: 15, hp: 7, init: 2, size: 1, color: '#5f8f4e' },
  { key: 'kobold', name: 'Kobold', group: 'Humanoid', ac: 12, hp: 5, init: 2, size: 1, color: '#a8643a' },
  { key: 'bandit', name: 'Bandit', group: 'Humanoid', ac: 12, hp: 11, init: 1, size: 1, color: '#7a6a55' },
  { key: 'cultist', name: 'Cultist', group: 'Humanoid', ac: 12, hp: 9, init: 1, size: 1, color: '#7a3b5e' },
  { key: 'guard', name: 'Guard', group: 'Humanoid', ac: 16, hp: 11, init: 1, size: 1, color: '#5b6f86' },
  { key: 'thug', name: 'Thug', group: 'Humanoid', ac: 11, hp: 32, init: 0, size: 1, color: '#6a5146' },
  { key: 'orc', name: 'Orc', group: 'Humanoid', ac: 13, hp: 15, init: 1, size: 1, color: '#5e7a3a' },
  { key: 'hobgoblin', name: 'Hobgoblin', group: 'Humanoid', ac: 18, hp: 11, init: 1, size: 1, color: '#9c4a2e' },
  { key: 'gnoll', name: 'Gnoll', group: 'Humanoid', ac: 15, hp: 22, init: 1, size: 1, color: '#8c7340' },
  { key: 'bugbear', name: 'Bugbear', group: 'Humanoid', ac: 16, hp: 27, init: 2, size: 1, color: '#7d5a32' },
  { key: 'giant-rat', name: 'Giant Rat', group: 'Binatang', ac: 12, hp: 7, init: 2, size: 1, color: '#6e6258' },
  { key: 'wolf', name: 'Wolf', group: 'Binatang', ac: 13, hp: 11, init: 2, size: 1, color: '#6f7780' },
  { key: 'dire-wolf', name: 'Dire Wolf', group: 'Binatang', ac: 14, hp: 37, init: 2, size: 2, color: '#4c545e' },
  { key: 'giant-spider', name: 'Giant Spider', group: 'Binatang', ac: 14, hp: 26, init: 3, size: 2, color: '#3e3a4a' },
  { key: 'owlbear', name: 'Owlbear', group: 'Monstrositas', ac: 13, hp: 59, init: 1, size: 2, color: '#8a5d3b' },
  { key: 'ogre', name: 'Ogre', group: 'Raksasa', ac: 11, hp: 59, init: -1, size: 2, color: '#7f6b45' },
  { key: 'skeleton', name: 'Skeleton', group: 'Undead', ac: 13, hp: 13, init: 2, size: 1, color: '#bdb6a3' },
  { key: 'zombie', name: 'Zombie', group: 'Undead', ac: 8, hp: 22, init: -2, size: 1, color: '#6b7a5a' },
  { key: 'ghoul', name: 'Ghoul', group: 'Undead', ac: 12, hp: 22, init: 2, size: 1, color: '#7b8a74' },
  { key: 'ghost', name: 'Ghost', group: 'Undead', ac: 11, hp: 45, init: 1, size: 1, color: '#a7b8a0' },
  { key: 'specter', name: 'Specter', group: 'Undead', ac: 12, hp: 58, init: 2, size: 1, color: '#a7b8a0' },
  { key: 'mummy', name: 'Mummy', group: 'Undead', ac: 11, hp: 58, init: -1, size: 1, color: '#a7b8a0' },
  { key: 'wraith', name: 'Wraith', group: 'Undead', ac: 13, hp: 67, init: 3, size: 1, color: '#a7b8a0' },
  { key: 'vampire-spawn', name: 'Vampire Spawn', group: 'Undead', ac: 15, hp: 82, init: 3, size: 1, color: '#a7b8a0' },
  { key: 'lich', name: 'Lich', group: 'Undead', ac: 17, hp: 135, init: 3, size: 1, color: '#a7b8a0' },
  { key: 'harpy', name: 'Harpy', group: 'Monstrositas', ac: 11, hp: 38, init: 1, size: 1, color: '#8e6aa8' },
  { key: 'basilisk', name: 'Basilisk', group: 'Monstrositas', ac: 15, hp: 52, init: -1, size: 1, color: '#8e6aa8' },
  { key: 'gargoyle', name: 'Gargoyle', group: 'Monstrositas', ac: 15, hp: 52, init: 0, size: 1, color: '#8e6aa8' },
  { key: 'werewolf', name: 'Werewolf', group: 'Monstrositas', ac: 12, hp: 58, init: 1, size: 1, color: '#8e6aa8' },
  { key: 'minotaur', name: 'Minotaur', group: 'Monstrositas', ac: 14, hp: 76, init: 0, size: 2, color: '#8e6aa8' },
  { key: 'medusa', name: 'Medusa', group: 'Monstrositas', ac: 15, hp: 127, init: 2, size: 1, color: '#8e6aa8' },
  { key: 'troll', name: 'Troll', group: 'Raksasa', ac: 15, hp: 84, init: 1, size: 2, color: '#b0703f' },
  { key: 'giant-snapping-turtle', name: 'Giant Snapping Turtle', group: 'Binatang', ac: 17, hp: 115, init: -1, size: 3, color: '#8f6b45' },
  { key: 'dryad', name: 'Dryad', group: 'Fey', ac: 11, hp: 22, init: 1, size: 1, color: '#6fae7f' },
  { key: 'young-red-dragon', name: 'Young Red Dragon', group: 'Naga', ac: 18, hp: 178, init: 0, size: 2, color: '#c0453a' },
];
// AC, HP, dan bonus initiative selalu mengikuti stat block SRD.
export const monsters: Monster[] = base.map((m) => { const st = stats[m.key]; return st ? { ...m, ac: st.ac, hp: st.hp, init: st.init } : m; });

// Token bergambar (public/monsters/<key>.webp): karya domain publik / CC0 dari Wikimedia Commons.
// Sisanya memakai medali ikon (public/monsters/<key>.svg, game-icons.net CC BY 3.0). Sumber lengkap: CREDITS.txt.
const artwork = new Set(['skeleton', 'lich', 'zombie', 'ghoul', 'mummy', 'vampire-spawn', 'specter', 'wraith', 'ghost', 'werewolf', 'troll', 'ogre', 'goblin', 'orc', 'harpy', 'minotaur', 'medusa', 'basilisk', 'gargoyle', 'young-red-dragon', 'dryad', 'giant-snapping-turtle', 'wolf', 'dire-wolf', 'bandit', 'cultist', 'guard', 'thug']);
// Monster Manual 2024 (key "xmm:...") tanpa gambar memakai medali polos; DM bisa mengganti gambar lewat menu Token.
export const monsterImage = (m: Monster) => m.key.startsWith('xmm:') ? '/monsters/plain.svg' : `/monsters/${m.key}.${artwork.has(m.key) ? 'webp' : 'svg'}`;

// Buat beberapa token monster bernomor, berkumpul di sekitar titik (persen peta).
export function monsterTokens(m: Monster, count: number, existing: BoardToken[], at: { x: number; y: number }, ownerId: string, hidden: boolean, makeId: () => string): BoardToken[] {
  const used = existing.filter(t => t.monster === m.key).map(t => Number(t.name.replace(`${m.name} `, ''))).filter(Number.isFinite);
  let next = used.length ? Math.max(...used) + 1 : 1;
  const image = monsterImage(m);
  return Array.from({ length: count }, (_, i) => {
    // Susun melingkar supaya token tidak bertumpuk.
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    const r = count > 1 ? 4 + count * 1.2 : 0;
    return {
      id: makeId(),
      name: `${m.name} ${next++}`,
      image,
      ownerId,
      x: Math.max(2, Math.min(98, at.x + Math.cos(angle) * r)),
      y: Math.max(2, Math.min(98, at.y + Math.sin(angle) * r)),
      size: m.size,
      hp: m.hp,
      maxHp: m.hp,
      ac: m.ac,
      initBonus: m.init,
      monster: m.key,
      ...(hidden ? { hidden: true } : {}),
    };
  });
}
