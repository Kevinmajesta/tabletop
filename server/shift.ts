// Dungeon yang Berputar (party, semua pemain melihat hal yang sama).
// Tiga ruangan berpetak 5x5. Party berjalan bebas lewat lorong yang tersambung, dan menarik tuas di tepi
// untuk menggeser baris/kolom. Setiap ruangan punya jatah geseran (lilin) sama dengan jumlah minimum,
// jadi party harus menemukan cara paling hemat. Lilin habis berarti ulang ruangan; tidak ada batas percobaan.
import { reachable, shiftLevels, shiftLevers, shiftLine, type Line } from './shift-data.js';
export { shiftLevels, shiftLevers, reachable, shiftLine } from './shift-data.js';

export const defaultShiftReward = 'Peti di jantung labirin terbuka. Di dalamnya ada peta kecil yang ditandai lingkaran merah.';

export type ShiftAttempt = { by: string; level: number; kind: 'cleared' | 'reset' };
export type ShiftState = { level: number; tiles: number[]; pos: number; goal: number; used: number; resets: number; log: ShiftAttempt[]; reward: string; done: boolean };

type GameLike = { phase: string; result: string; scores: Record<string, number>; shift?: ShiftState };

function load(t: ShiftState, level: number) {
  const lv = shiftLevels[level];
  Object.assign(t, { level, tiles: [...lv.tiles], pos: lv.start, goal: lv.goal, used: 0 });
}

export function newShift(reward = defaultShiftReward): ShiftState {
  const t = { level: 0, tiles: [], pos: 0, goal: 0, used: 0, resets: 0, log: [], reward, done: false } as ShiftState;
  load(t, 0);
  return t;
}

// Tidak ada rahasia di papan ini: semua orang melihat ruangan yang sama. Hanya pesan hadiah yang disembunyikan.
export function shiftView(t: ShiftState, dm: boolean): ShiftState {
  return { ...t, reward: dm || t.done ? t.reward : '' };
}

export function shiftAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>): string | null {
  const t = game.shift;
  if (!t) return 'Ronde belum dimulai.';
  if (action.type === 'shift:reward') {
    if (!dm) return 'Hanya GM boleh menulis pesan hadiah.';
    if (typeof action.text !== 'string') return 'Pesan tidak valid.';
    t.reward = action.text.trim().slice(0, 300) || defaultShiftReward;
    return null;
  }
  if (game.phase !== 'open' || t.done) return 'Ronde belum dibuka.';
  const lv = shiftLevels[t.level];
  if (action.type === 'shift:reset') {
    load(t, t.level);
    t.resets++;
    t.log.push({ by: playerId, level: t.level, kind: 'reset' });
    if (t.log.length > 40) t.log.shift();
    return null;
  }
  if (action.type === 'shift:walk') {
    const to = action.to;
    if (typeof to !== 'number' || !Number.isInteger(to) || to < 0 || to >= lv.tiles.length) return 'Petak tidak valid.';
    if (!reachable(t.tiles, t.pos).has(to)) return 'Tidak ada lorong yang tersambung ke petak itu.';
    t.pos = to;
    if (t.pos === t.goal) {
      t.log.push({ by: playerId, level: t.level, kind: 'cleared' });
      if (t.log.length > 40) t.log.shift();
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      if (t.level + 1 < shiftLevels.length) load(t, t.level + 1);
      else { t.done = true; game.phase = 'finished'; game.result = 'won'; }
    }
    return null;
  }
  if (action.type === 'shift:pull') {
    const axis = action.axis, k = action.k, dir = action.dir;
    const line = shiftLevers.find(l => l.axis === axis && l.k === k);
    if (!line || (dir !== 1 && dir !== -1)) return 'Tuas tidak dikenal.';
    if (t.used >= lv.budget) return 'Lilin sudah habis. Ulangi ruangan untuk mencoba lagi.';
    const moved = shiftLine(t.tiles, line as Line, dir, [t.pos, t.goal]);
    t.tiles = moved.tiles;
    [t.pos, t.goal] = moved.carry;
    t.used++;
    return null;
  }
  return 'Aksi tidak tersedia pada ronde ini.';
}
