// Data publik Dungeon yang Berputar: denah ruangan, tuas, dan logika lorong. Dipakai server dan klien.
// Papan 5x5. Setiap petak punya lubang lorong (bitmask): N=1, E=2, S=4, W=8. Dua petak bertetangga
// tersambung bila keduanya punya lubang yang saling berhadapan. Tuas menggeser satu baris/kolom secara
// melingkar; party dan harta ikut bergeser bersama petaknya.
export const SIZE = 5;
export const N = 1, E = 2, S = 4, W = 8;
const opp: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };

export type Line = { axis: 'r' | 'c'; k: number };
export const shiftLevers: Line[] = [{ axis: 'r', k: 1 }, { axis: 'r', k: 3 }, { axis: 'c', k: 1 }, { axis: 'c', k: 3 }];

export type ShiftLevel = { name: string; story: string; tiles: number[]; start: number; goal: number; budget: number };
// Setiap ruangan dibuat dan diverifikasi dengan pencarian BFS: budget = jumlah geseran minimum (lihat tes).
export const shiftLevels: ShiftLevel[] = [
  { name: 'Ruang Penjaga', story: 'Lorong-lorong ruangan ini terputus. Tarik tuas di tepi untuk menggeser baris dan kolom ruangan sampai jalan ke peti terbuka.',
    tiles: [3, 13, 13, 5, 13, 4, 4, 1, 4, 7, 13, 3, 13, 12, 13, 4, 13, 3, 13, 12, 3, 7, 13, 3, 3], start: 0, goal: 24, budget: 2 },
  { name: 'Aula Roda Batu', story: 'Lantai aula ini berderak setiap kali tuas ditarik. Lilin di dinding hanya cukup untuk tiga geseran.',
    tiles: [7, 3, 5, 7, 3, 3, 4, 3, 13, 3, 3, 12, 12, 7, 3, 13, 3, 13, 5, 13, 1, 12, 5, 5, 7], start: 0, goal: 24, budget: 3 },
  { name: 'Jantung Labirin', story: 'Ruang terakhir sang pembangun. Empat geseran, tidak lebih. Rencanakan sebelum menarik tuas.',
    tiles: [11, 6, 9, 9, 6, 14, 14, 9, 6, 9, 11, 10, 8, 9, 10, 10, 9, 10, 6, 6, 6, 11, 9, 10, 10], start: 0, goal: 24, budget: 4 },
];

export function reachable(tiles: number[], from: number): Set<number> {
  const seen = new Set([from]), q = [from];
  while (q.length) {
    const i = q.shift()!, r = Math.floor(i / SIZE), c = i % SIZE;
    for (const [d, dr, dc] of [[N, -1, 0], [E, 0, 1], [S, 1, 0], [W, 0, -1]] as const) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) continue;
      const j = rr * SIZE + cc;
      if ((tiles[i] & d) && (tiles[j] & opp[d]) && !seen.has(j)) { seen.add(j); q.push(j); }
    }
  }
  return seen;
}

// Geser satu baris (dir +1 = kanan) atau kolom (dir +1 = bawah) secara melingkar.
export function shiftLine(tiles: number[], line: Line, dir: 1 | -1, carry: number[]) {
  const idx = Array.from({ length: SIZE }, (_, i) => (line.axis === 'r' ? line.k * SIZE + i : i * SIZE + line.k));
  const next = tiles.slice();
  const moved = new Map<number, number>();
  idx.forEach((from, i) => { const to = idx[(i + dir + SIZE) % SIZE]; next[to] = tiles[from]; moved.set(from, to); });
  return { tiles: next, carry: carry.map(p => moved.get(p) ?? p) };
}
