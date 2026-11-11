// Segel Sang Alkemis (party, semua pemain melihat hal yang sama).
// Lemari alkemis terkunci tiga segel. Setiap segel dibuka dengan menyusun unsur dari tabel periodik;
// simbol-simbolnya membentuk satu kata. Ketiga kata menjadi pesan rahasia: CARI · LILIN · BIRU.
// Tidak ada batas percobaan; setiap percobaan hanya dijawab benar atau salah.
// Segel 1: teka-teki sifat unsur. Segel 2: jejak panah di tabel. Segel 3: deduksi berantai dari dua segel sebelumnya.
// Kunci jawaban hanya ada di file ini (server). Klien memakai alchemy-data.ts.
import { elements, sealInfo, type SealInfo } from './alchemy-data.js';
export { elements } from './alchemy-data.js';

export type Seal = SealInfo & { answer: number[]; word: string };
const keys = [
  { answer: [6, 18, 53], word: 'CARI' },
  { answer: [3, 3, 7], word: 'LILIN' },
  { answer: [83, 44], word: 'BIRU' },
];
export const seals: Seal[] = sealInfo.map((info, i) => ({ ...info, ...keys[i] }));
export const defaultAlchemyReward = 'Ketiga segel terbuka dan pintu lemari berderit. Di dalamnya tergores pesan sang alkemis: "CARI LILIN BIRU."';

export type AlchemyAttempt = { by: string; seal: number; guess: number[]; ok: boolean };
export type AlchemyState = { seal: number; draft: number[]; mistakes: number; log: AlchemyAttempt[]; reward: string };
// solved: jawaban segel yang sudah terbuka (boleh dilihat semua). answers: semua jawaban, hanya GM atau setelah selesai.
export type AlchemyView = AlchemyState & { solved: { answer: number[]; word: string }[]; answers?: number[][] };

type GameLike = { phase: string; result: string; scores: Record<string, number>; alchemy?: AlchemyState };

export function newAlchemy(reward = defaultAlchemyReward): AlchemyState {
  return { seal: 0, draft: [], mistakes: 0, log: [], reward };
}

export function alchemyView(t: AlchemyState, dm: boolean, finished: boolean): AlchemyView {
  const won = t.seal >= seals.length;
  return { ...t, reward: dm || won ? t.reward : '', solved: seals.slice(0, t.seal).map(s => ({ answer: s.answer, word: s.word })), ...(dm || finished ? { answers: seals.map(s => s.answer) } : {}) };
}

const validZ = (z: unknown) => typeof z === 'number' && Number.isInteger(z) && z >= 1 && z <= elements.length;

export function alchemyAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>): string | null {
  const t = game.alchemy;
  if (!t) return 'Ronde belum dimulai.';
  if (action.type === 'alch:reward') {
    if (!dm) return 'Hanya GM boleh menulis pesan hadiah.';
    if (typeof action.text !== 'string') return 'Pesan tidak valid.';
    t.reward = action.text.trim().slice(0, 300) || defaultAlchemyReward;
    return null;
  }
  if (game.phase !== 'open' || t.seal >= seals.length) return 'Ronde belum dibuka.';
  const seal = seals[t.seal];
  if (action.type === 'alch:draft') {
    const draft = action.draft;
    if (!Array.isArray(draft) || draft.length > seal.answer.length || !draft.every(validZ)) return 'Susunan unsur tidak valid.';
    t.draft = [...draft] as number[];
    return null;
  }
  if (action.type !== 'alch:submit') return 'Aksi tidak tersedia pada ronde ini.';
  if (t.draft.length !== seal.answer.length) return `Segel ini butuh ${seal.answer.length} unsur.`;
  const ok = t.draft.every((z, i) => z === seal.answer[i]);
  t.log.push({ by: playerId, seal: t.seal, guess: [...t.draft], ok });
  if (t.log.length > 40) t.log.shift();
  t.draft = [];
  if (ok) {
    t.seal++;
    game.scores[playerId] = (game.scores[playerId] || 0) + 1;
    if (t.seal >= seals.length) { game.phase = 'finished'; game.result = 'won'; }
  } else {
    // Tidak ada batas percobaan: kesalahan hanya dihitung untuk ditampilkan.
    t.mistakes++;
  }
  return null;
}
