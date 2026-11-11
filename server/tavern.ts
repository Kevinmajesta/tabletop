// Tagihan Sang Pengelana (party, semua pemain melihat hal yang sama).
// Pemilik tavern menyimpan petunjuk di peti berkunci tiga baris angka. Party membaca menu tavern
// beserta Aturan Rumah di bawahnya, lalu menghitung tiga nota tagihan lama. Jawaban tiap nota dalam cp
// membuka satu baris kunci. Kesempatan salah dibagi bersama; habis berarti pemilik tavern menolak.
// Semua harga disimpan dalam cp. 1 gp = 10 sp = 100 cp.
// Kunci jawaban hanya ada di file ini (server). Klien memakai tavern-data.ts.
import { tavernNoteText, tavernChances, type TavernNoteText } from './tavern-data.js';
export { tavernMenu, houseRules, tavernChances } from './tavern-data.js';

export type TavernNote = TavernNoteText & { answer: number };
// Rincian jawaban dihitung ulang di tes:
// 1. ale 10×4÷2 = 20 · babi 3×80 − 80 = 160 · sup 2×30 = 60 · tip 5×5 = 25 → 265
// 2. hidangan 60+50 = 110, guild −11 → 99 · minum 100+6 = 106 · kamar 400 · kandang 40 · tip 5 → 650, kembalian 350
// 3. roti 4 · pai 120 · mead 45 · ale 12 · gelas 8 · kamar 150 · mandi 60 · tip 15 → 414 ÷ 3 = 138
const answers = [265, 350, 138];
export const tavernNotes: TavernNote[] = tavernNoteText.map((note, i) => ({ ...note, answer: answers[i] }));

export const defaultReward = 'Pemilik tavern tersenyum, membuka peti, lalu menyerahkan secarik perkamen: "Cari lonceng yang tak pernah berbunyi."';

export type TavernAttempt = { by: string; note: number; value: number; ok: boolean };
export type TavernState = { solved: boolean[]; chances: number; log: TavernAttempt[]; reward: string };
export type TavernView = TavernState & { answers: (number | null)[] };

type GameLike = { phase: string; result: string; scores: Record<string, number>; tavern?: TavernState };

export function newTavern(reward = defaultReward): TavernState {
  return { solved: tavernNotes.map(() => false), chances: tavernChances, log: [], reward };
}

// Jawaban hanya untuk GM. Petunjuk hadiah baru terlihat pemain setelah peti terbuka.
export function tavernView(t: TavernState, dm: boolean, finished: boolean): TavernView {
  const won = t.solved.every(Boolean);
  return { ...t, reward: dm || won ? t.reward : '', answers: tavernNotes.map((n, i) => (dm || finished || t.solved[i] ? n.answer : null)) };
}

export function tavernAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>): string | null {
  const t = game.tavern;
  if (!t) return 'Ronde belum dimulai.';
  if (action.type === 'tavern:reward') {
    if (!dm) return 'Hanya GM boleh menulis petunjuk hadiah.';
    if (typeof action.text !== 'string') return 'Petunjuk tidak valid.';
    t.reward = action.text.trim().slice(0, 300) || defaultReward;
    return null;
  }
  if (action.type !== 'tavern:answer') return 'Aksi tidak tersedia pada ronde ini.';
  if (game.phase !== 'open') return 'Ronde belum dibuka.';
  const note = action.note, value = action.value;
  if (typeof note !== 'number' || !Number.isInteger(note) || note < 0 || note >= tavernNotes.length) return 'Nota tidak dikenal.';
  if (t.solved[note]) return 'Nota ini sudah terpecahkan.';
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100000) return 'Masukkan angka bulat dalam cp.';
  const ok = value === tavernNotes[note].answer;
  t.log.push({ by: playerId, note, value, ok });
  if (t.log.length > 40) t.log.shift();
  if (ok) {
    t.solved[note] = true;
    game.scores[playerId] = (game.scores[playerId] || 0) + 1;
    if (t.solved.every(Boolean)) { game.phase = 'finished'; game.result = 'won'; }
  } else {
    t.chances--;
    if (t.chances <= 0) { game.phase = 'finished'; game.result = 'lost'; }
  }
  return null;
}
