// Bahasa Rune yang Hilang (party, semua pemain melihat hal yang sama).
// Party membaca sembilan contoh kalimat rune kurcaci kuno beserta artinya, menyimpulkan tata bahasanya,
// lalu menulis kalimat rune untuk empat pintu. Tidak ada batas percobaan; jawaban hanya benar atau salah.
import { normalizeRunes, runeKeys, runeTasks } from './runes-data.js';
export { runeExamples, runeTasks, runeKeys, normalizeRunes } from './runes-data.js';

export const runeAnswers = [
  'ᛊᛚᛖ ᚦᚢᚱᛁ',
  'ᛜᛟᛈᛖ ᛒᚨᚱ ᚱᚨᚲᛁ',
  'ᛟᛈᛖᛞ ᛞᚹᛖ ᛒᚨᚱᛁ ᚱᚨᚲᛊ',
  'ᛜᚹᚨᚱ ᚷᛟᛚ ᛞᚹᛖᛁᛊ ᚦᚢᚱᛁ',
];
export const defaultRuneReward = 'Pintu keempat bergeser. Di baliknya, rune yang sama terukir di sebuah peta: tempat harta sang raja kurcaci.';

export type RuneAttempt = { by: string; task: number; text: string; ok: boolean };
export type RuneState = { task: number; draft: string; misses: number; log: RuneAttempt[]; reward: string };
export type RuneView = RuneState & { solved: string[]; answers?: string[] };

type GameLike = { phase: string; result: string; scores: Record<string, number>; runes?: RuneState };
const allowed = new Set([...runeKeys, ' ']);

export function newRunes(reward = defaultRuneReward): RuneState {
  return { task: 0, draft: '', misses: 0, log: [], reward };
}

export function runesView(t: RuneState, dm: boolean, finished: boolean): RuneView {
  const done = t.task >= runeTasks.length;
  return { ...t, reward: dm || done ? t.reward : '', solved: runeAnswers.slice(0, t.task), ...(dm || finished ? { answers: runeAnswers } : {}) };
}

export function runesAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>): string | null {
  const t = game.runes;
  if (!t) return 'Ronde belum dimulai.';
  if (action.type === 'runes:reward') {
    if (!dm) return 'Hanya GM boleh menulis pesan hadiah.';
    if (typeof action.text !== 'string') return 'Pesan tidak valid.';
    t.reward = action.text.trim().slice(0, 300) || defaultRuneReward;
    return null;
  }
  if (game.phase !== 'open' || t.task >= runeTasks.length) return 'Ronde belum dibuka.';
  if (action.type === 'runes:draft') {
    const text = action.text;
    if (typeof text !== 'string' || text.length > 80 || ![...text].every(ch => allowed.has(ch))) return 'Hanya rune dan spasi yang bisa diukir.';
    t.draft = text;
    return null;
  }
  if (action.type !== 'runes:submit') return 'Aksi tidak tersedia pada ronde ini.';
  const text = normalizeRunes(t.draft);
  if (!text) return 'Ukir kalimat rune dulu.';
  const ok = text === runeAnswers[t.task];
  t.log.push({ by: playerId, task: t.task, text, ok });
  if (t.log.length > 40) t.log.shift();
  if (ok) {
    t.task++;
    t.draft = '';
    game.scores[playerId] = (game.scores[playerId] || 0) + 1;
    if (t.task >= runeTasks.length) { game.phase = 'finished'; game.result = 'won'; }
  } else {
    t.misses++;
  }
  return null;
}
