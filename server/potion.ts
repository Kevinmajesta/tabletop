// Ramuan Seimbang (party, semua pemain melihat hal yang sama).
// Sembilan unsur harus dibagi ke tiga kuali berisi tiga lapis, mengikuti sepuluh aturan racikan.
// Seperti sudoku: tiap aturan saling mengunci dan hanya ada satu susunan yang benar (dibuktikan di tes).
// Tidak ada batas percobaan; setiap racikan hanya dijawab benar atau salah.
import { potionPool } from './potion-data.js';
export { potionPool, potionRules } from './potion-data.js';

// Urutan slot: kuali kiri atas, tengah, bawah, lalu kuali tengah, lalu kuali kanan.
export const potionSolution = [10, 14, 80, 6, 35, 26, 8, 11, 20]; // Ne Si Hg | C Br Fe | O Na Ca
export const defaultPotionReward = 'Ketiga kuali berpendar bersamaan. Uapnya membentuk tulisan di udara sebelum menghilang.';

export type PotionAttempt = { by: string; ok: boolean };
export type PotionState = { slots: (number | null)[]; tries: number; log: PotionAttempt[]; reward: string; solved: boolean };
export type PotionView = PotionState & { answer?: number[] };

type GameLike = { phase: string; result: string; scores: Record<string, number>; potion?: PotionState };

export function newPotion(reward = defaultPotionReward): PotionState {
  return { slots: Array(9).fill(null), tries: 0, log: [], reward, solved: false };
}

export function potionView(t: PotionState, dm: boolean): PotionView {
  return { ...t, reward: dm || t.solved ? t.reward : '', ...(dm ? { answer: potionSolution } : {}) };
}

export function potionAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>): string | null {
  const t = game.potion;
  if (!t) return 'Ronde belum dimulai.';
  if (action.type === 'potion:reward') {
    if (!dm) return 'Hanya GM boleh menulis pesan hadiah.';
    if (typeof action.text !== 'string') return 'Pesan tidak valid.';
    t.reward = action.text.trim().slice(0, 300) || defaultPotionReward;
    return null;
  }
  if (game.phase !== 'open' || t.solved) return 'Ronde belum dibuka.';
  if (action.type === 'potion:place') {
    const slot = action.slot, z = action.z;
    if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot > 8) return 'Posisi kuali tidak valid.';
    if (z === null) { t.slots[slot] = null; return null; }
    if (typeof z !== 'number' || !potionPool.includes(z)) return 'Unsur ini bukan bahan ramuan.';
    // Satu unsur hanya punya satu tempat: memindahkannya mengosongkan posisi lamanya.
    t.slots = t.slots.map(v => (v === z ? null : v));
    t.slots[slot] = z;
    return null;
  }
  if (action.type === 'potion:clear') { t.slots = Array(9).fill(null); return null; }
  if (action.type !== 'potion:brew') return 'Aksi tidak tersedia pada ronde ini.';
  if (t.slots.some(v => v === null)) return 'Isi kesembilan posisi dulu sebelum meracik.';
  const ok = t.slots.every((z, i) => z === potionSolution[i]);
  t.tries++;
  t.log.push({ by: playerId, ok });
  if (t.log.length > 40) t.log.shift();
  if (ok) {
    t.solved = true;
    game.scores[playerId] = (game.scores[playerId] || 0) + 1;
    game.phase = 'finished';
    game.result = 'won';
  }
  return null;
}
