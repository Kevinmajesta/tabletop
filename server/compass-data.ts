// Data publik Jalur Sang Alkemis: titik awal, tujuan, dan kompas kategori. Dipakai server dan klien.
// Jalur jawabannya sengaja tidak ada di sini (lihat compass.ts) supaya tidak ikut terkirim ke browser pemain.
import type { Category } from './alchemy-data.js';

export type Dir = 'U' | 'D' | 'L' | 'R';
export const compassStart = 19; // K
export const compassGoal = 117; // Ts
// Arah langkah yang boleh diambil dari unsur berkategori tertentu. Gas mulia adalah jalan buntu.
export const compassMap: Partial<Record<Category, Dir[]>> = {
  alkali: ['L', 'R'],
  alkaline: ['U', 'R'],
  transition: ['L', 'R'],
  post: ['U', 'D'],
  metalloid: ['U', 'R'],
  nonmetal: ['U', 'D'],
  halogen: ['U', 'D'],
};
export const dirArrow: Record<Dir, string> = { U: '↑', D: '↓', L: '←', R: '→' };
export const dirDelta: Record<Dir, [number, number]> = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
