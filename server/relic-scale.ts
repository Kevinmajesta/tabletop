// Timbangan Relik: 9 relik, satu palsu (lebih ringan), hanya 2 kali timbang. Relik palsu hanya ada di server.
export type ScaleWeighing = { left: number[]; right: number[]; result: 'left-light' | 'right-light' | 'balanced' };
export type ScaleState = { fake: number; left: number; attempts: number; history: ScaleWeighing[]; leftPan?: number[]; rightPan?: number[] };
export const scaleRelics = 9;
export const scaleWeighs = 2;

export function newScale(randomInt: (max: number) => number, attempts = 0): ScaleState {
  return { fake: randomInt(scaleRelics), left: scaleWeighs, attempts, history: [] };
}

const validSide = (side: unknown): side is number[] =>
  Array.isArray(side) && side.length >= 1 && side.length <= scaleRelics && side.every(n => Number.isInteger(n) && n >= 0 && n < scaleRelics);

export function weigh(scale: ScaleState, left: unknown, right: unknown): string | null {
  if (scale.left < 1) return 'Timbangan sudah habis dipakai. Tunjuk relik yang palsu.';
  if (!validSide(left) || !validSide(right)) return 'Pilih relik untuk kedua piringan.';
  if (left.length !== right.length) return 'Kedua piringan harus berisi jumlah relik yang sama.';
  if (new Set([...left, ...right]).size !== left.length + right.length) return 'Satu relik hanya boleh ditaruh di satu piringan.';
  const result = left.includes(scale.fake) ? 'left-light' : right.includes(scale.fake) ? 'right-light' : 'balanced';
  scale.leftPan = [];
  scale.rightPan = [];
  scale.history.push({ left: [...left], right: [...right], result });
  scale.left--;
  return null;
}

// Strip the secret for everyone except the DM, unless the round is over.
export function scaleView(scale: ScaleState, dm: boolean, finished: boolean) {
  const { fake, ...rest } = scale;
  return dm || finished ? scale : rest;
}
