// Monster cepat untuk DM: token langsung jadi dengan HP, AC, dan bonus initiative.
// Angka dari SRD 5.1 (CC BY 4.0). Gambar token berupa medali SVG sederhana, jadi tidak perlu file.
import type { BoardToken } from './tabletop.js';

export type Monster = { key: string; name: string; group: string; ac: number; hp: number; init: number; size: number; color: string };
export const monsters: Monster[] = [
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
];

// Token medali per monster ada di public/monsters/<key>.svg (ikon game-icons.net, CC BY 3.0; lihat CREDITS.txt).
export const monsterImage = (m: Monster) => `/monsters/${m.key}.svg`;

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
