// Siapa Pencurinya: satu lapis, enam tersangka, tepat 3 orang jujur. Solusi hanya ada di server.
// Keunikan dibuktikan brute force di tests/whodunit.test.mjs (tiap ucapan dan aturan "tepat 3" diperlukan).
export const suspects = ['Arya', 'Bima', 'Cakra', 'Dewi', 'Elang', 'Farah'] as const;
export type WhodunitStatement = { k: 'is' | 'false' | 'same'; j: number; m?: number };
export const statementRules: WhodunitStatement[] = [
  { k: 'is', j: 4 }, { k: 'same', j: 3, m: 4 }, { k: 'false', j: 3 },
  { k: 'is', j: 2 }, { k: 'is', j: 1 }, { k: 'same', j: 4, m: 1 },
];
export const statementTexts = [
  'Pencurinya adalah Elang.',
  'Dewi dan Elang sama-sama jujur, atau sama-sama berbohong.',
  'Ucapan Dewi itu bohong.',
  'Pencurinya adalah Cakra.',
  'Pencurinya adalah Bima.',
  'Elang dan Bima sama-sama jujur, atau sama-sama berbohong.',
];
const culprit = 4; // Elang
const honest = [0, 1, 2]; // Arya, Bima, Cakra
export const honestCount = 3;
// draft* disinkronkan ke semua pemain; reveal baru terisi setelah ronde selesai.
export type WhodunitState = { attempts: number; draftCulprit: number | null; draftHonest: number[]; reveal?: string };

export function newWhodunit(): WhodunitState { return { attempts: 0, draftCulprit: null, draftHonest: [] }; }

export function checkWhodunit(c: unknown, h: unknown): boolean {
  return c === culprit && Array.isArray(h) && h.length === honest.length && honest.every(i => h.includes(i));
}

export const whodunitReveal = 'Elang pencurinya. Yang jujur: Arya, Bima, dan Cakra. Dewi, Elang, dan Farah berbohong.';
