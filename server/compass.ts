// Jalur Sang Alkemis (party, semua pemain melihat hal yang sama).
// Tabel periodik menjadi labirin. Party menyusun jalur dari Kalium ke Tenesin langkah demi langkah ke kotak
// tetangga. Arah yang boleh diambil ditentukan oleh kategori unsur tempat berdiri (kompas), dan tidak boleh
// menginjak unsur yang sama dua kali. Banyak cabang berakhir buntu; hanya ada satu jalur yang sampai (dibuktikan di tes).
// Tidak ada batas percobaan; setiap jalur yang diserahkan hanya dijawab benar atau salah.
import { elements } from './alchemy-data.js';
import { compassGoal, compassMap, compassStart, dirDelta, type Dir } from './compass-data.js';
export { compassGoal, compassMap, compassStart } from './compass-data.js';

const main = elements.filter(e => e.row <= 7);
const cell = new Map(main.map(e => [`${e.row}:${e.col}`, e]));
export const neighbor = (z: number, d: Dir) => { const e = elements[z - 1]; return cell.get(`${e.row + dirDelta[d][0]}:${e.col + dirDelta[d][1]}`); };
export const adjacent = (a: number, b: number) => (['U', 'D', 'L', 'R'] as Dir[]).some(d => neighbor(a, d)?.z === b);

// Jalur dianggap benar bila setiap langkah mengikuti kompas, tidak berulang, dan berakhir di tujuan.
export function validPath(path: number[]): boolean {
  if (path[0] !== compassStart || path.at(-1) !== compassGoal || new Set(path).size !== path.length) return false;
  for (let i = 1; i < path.length; i++) {
    const dirs = compassMap[elements[path[i - 1] - 1].category] ?? [];
    if (!dirs.some(d => neighbor(path[i - 1], d)?.z === path[i])) return false;
  }
  return true;
}

export const compassSolution = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 13, 5, 6, 14, 15, 33, 34, 52, 53, 85, 117];
export const defaultCompassReward = 'Langkah terakhir menyala. Garis cahaya di tabel membentuk lambang sang alkemis, dan sebuah laci tersembunyi terbuka.';

export type CompassAttempt = { by: string; ok: boolean; steps: number };
export type CompassState = { path: number[]; tries: number; log: CompassAttempt[]; reward: string; solved: boolean };
export type CompassView = CompassState & { answer?: number[] };

type GameLike = { phase: string; result: string; scores: Record<string, number>; compass?: CompassState };

export function newCompass(reward = defaultCompassReward): CompassState {
  return { path: [compassStart], tries: 0, log: [], reward, solved: false };
}

export function compassView(t: CompassState, dm: boolean): CompassView {
  return { ...t, reward: dm || t.solved ? t.reward : '', ...(dm ? { answer: compassSolution } : {}) };
}

export function compassAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>): string | null {
  const t = game.compass;
  if (!t) return 'Ronde belum dimulai.';
  if (action.type === 'compass:reward') {
    if (!dm) return 'Hanya GM boleh menulis pesan hadiah.';
    if (typeof action.text !== 'string') return 'Pesan tidak valid.';
    t.reward = action.text.trim().slice(0, 300) || defaultCompassReward;
    return null;
  }
  if (game.phase !== 'open' || t.solved) return 'Ronde belum dibuka.';
  if (action.type === 'compass:step') {
    const z = action.z;
    if (typeof z !== 'number' || !Number.isInteger(z) || z < 1 || z > elements.length) return 'Unsur tidak valid.';
    // Hanya syarat bentuk jalur (bersebelahan) yang dicek di sini; aturan kompas baru dinilai saat diserahkan.
    if (!adjacent(t.path.at(-1)!, z)) return 'Langkah harus ke kotak yang bersebelahan.';
    if (t.path.length >= 80) return 'Jalur terlalu panjang.';
    t.path.push(z);
    return null;
  }
  if (action.type === 'compass:undo') { if (t.path.length > 1) t.path.pop(); return null; }
  if (action.type === 'compass:reset') { t.path = [compassStart]; return null; }
  if (action.type !== 'compass:submit') return 'Aksi tidak tersedia pada ronde ini.';
  if (t.path.at(-1) !== compassGoal) return 'Jalur belum sampai ke tujuan.';
  const ok = validPath(t.path);
  t.tries++;
  t.log.push({ by: playerId, ok, steps: t.path.length - 1 });
  if (t.log.length > 40) t.log.shift();
  if (ok) {
    t.solved = true;
    game.scores[playerId] = (game.scores[playerId] || 0) + 1;
    game.phase = 'finished';
    game.result = 'won';
  }
  return null;
}
