export const seatSolution = ['HANA', 'CITRA', 'IWAN', 'ANI', 'GALIH', 'EKA', 'BUDI', 'FANI', 'DODI'];
type SeatRule = { room: 'chairs' | 'morse' | 'vigenere'; kind: 'seat' | 'clockwise' | 'distance'; a: string; b?: string; value: number };
// Tingkat sedang: Iwan & Eka langsung, Citra punya dua kemungkinan yang baru tersingkir lewat Fani → Hana (putaran 9→1),
// lalu Budi/Dodi/Ani cukup diuji dua kemungkinan. GALIH sengaja tanpa petunjuk (sisa kursi).
export const seatRules: SeatRule[] = [
  { room: 'chairs', kind: 'seat', a: 'IWAN', value: 2 },
  { room: 'chairs', kind: 'clockwise', a: 'IWAN', b: 'EKA', value: 3 },
  { room: 'chairs', kind: 'distance', a: 'CITRA', b: 'EKA', value: 4 },
  { room: 'chairs', kind: 'clockwise', a: 'FANI', b: 'HANA', value: 2 },
  { room: 'morse', kind: 'clockwise', a: 'EKA', b: 'FANI', value: 2 },
  { room: 'vigenere', kind: 'distance', a: 'ANI', b: 'BUDI', value: 3 },
  { room: 'vigenere', kind: 'clockwise', a: 'BUDI', b: 'DODI', value: 2 },
];
export function seatClue(rule: SeatRule): string {
  const number = ['NOL', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM', 'TUJUH', 'DELAPAN', 'SEMBILAN'];
  if (rule.kind === 'seat') return `${rule.a} DUDUK DI KURSI ${number[rule.value + 1]}`;
  if (rule.kind === 'clockwise') return `${rule.b} BERADA ${number[rule.value]} KURSI SEARAH JARUM JAM DARI ${rule.a}`;
  return `${rule.a} DAN ${rule.b} TERPISAH ${number[rule.value - 1]} ORANG MELALUI JALUR TERPENDEK`;
}
