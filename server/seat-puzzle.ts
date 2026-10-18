export const seatSolution = ['HANA', 'CITRA', 'IWAN', 'ANI', 'GALIH', 'EKA', 'BUDI', 'FANI', 'DODI'];
type SeatRule = { room: 'chairs' | 'morse' | 'vigenere'; kind: 'seat' | 'clockwise' | 'distance'; a: string; b?: string; value: number };
export const seatRules: SeatRule[] = [
  { room: 'chairs', kind: 'seat', a: 'IWAN', value: 2 },
  { room: 'chairs', kind: 'clockwise', a: 'ANI', b: 'EKA', value: 2 },
  { room: 'chairs', kind: 'distance', a: 'CITRA', b: 'EKA', value: 4 },
  { room: 'morse', kind: 'clockwise', a: 'BUDI', b: 'HANA', value: 3 },
  { room: 'vigenere', kind: 'clockwise', a: 'FANI', b: 'IWAN', value: 4 },
  { room: 'vigenere', kind: 'clockwise', a: 'BUDI', b: 'DODI', value: 2 },
];
export function seatClue(rule: SeatRule): string {
  const number = ['NOL', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM', 'TUJUH', 'DELAPAN', 'SEMBILAN'];
  if (rule.kind === 'seat') return `${rule.a} DUDUK DI KURSI ${number[rule.value + 1]}`;
  if (rule.kind === 'clockwise') return `${rule.b} BERADA ${number[rule.value]} KURSI SEARAH JARUM JAM DARI ${rule.a}`;
  return `${rule.a} DAN ${rule.b} TERPISAH ${number[rule.value - 1]} ORANG MELALUI JALUR TERPENDEK`;
}
