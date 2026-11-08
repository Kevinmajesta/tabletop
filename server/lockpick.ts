// Kode Peti: tebak kode 4 simbol dari 6 (simbol boleh berulang), 8 percobaan. Kode hanya ada di server.
// Habis percobaan: kode diacak ulang dan riwayat dihapus, jadi tidak bisa dicari dengan eliminasi lintas ronde.
export const lockSymbols = 6;
export const lockLength = 4;
export const lockTries = 8;
export type Mark = 'g' | 'y' | 'x'; // hijau: benar di posisinya, kuning: ada tapi salah posisi, abu: tidak ada (sisa)
export type LockGuess = { guess: number[]; exact: number; near: number; marks: Mark[] };
export type LockState = { code: number[]; history: LockGuess[]; draft: number[]; attempts: number };

export function newLock(randomInt: (max: number) => number, attempts = 0): LockState {
  return { code: Array.from({ length: lockLength }, () => randomInt(lockSymbols)), history: [], draft: [], attempts };
}

export const validLock = (g: unknown): g is number[] =>
  Array.isArray(g) && g.length <= lockLength && g.every(n => Number.isInteger(n) && n >= 0 && n < lockSymbols);

// exact = simbol benar di posisi benar; near = simbol ada di kode tapi posisi salah (dihitung per kemunculan).
export function score(code: number[], guess: number[]): { exact: number; near: number } {
  const exact = guess.filter((n, i) => n === code[i]).length;
  const count = (a: number[], n: number) => a.filter(x => x === n).length;
  let common = 0;
  for (let n = 0; n < lockSymbols; n++) common += Math.min(count(code, n), count(guess, n));
  return { exact, near: common - exact };
}

// Gaya Wordle: hijau dulu, lalu kuning hanya selama sisa kemunculan simbol itu di kode masih ada (duplikat tidak dihitung ganda).
export function marksOf(code: number[], guess: number[]): Mark[] {
  const left = Array(lockSymbols).fill(0);
  code.forEach((n, i) => { if (guess[i] !== n) left[n]++; });
  const out = guess.map((n, i): Mark => n === code[i] ? 'g' : 'x');
  guess.forEach((n, i) => { if (out[i] === 'x' && left[n] > 0) { left[n]--; out[i] = 'y'; } });
  return out;
}

// Rahasia disembunyikan dari pemain sampai ronde selesai; GM selalu boleh lihat.
export function lockView(lock: LockState, dm: boolean, finished: boolean) {
  const { code, ...rest } = lock;
  return dm || finished ? lock : rest;
}
