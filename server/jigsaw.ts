// Puzzle Gambar (party, semua pemain merakit bersama secara langsung).
// Rakit bebas seperti puzzle sungguhan: tidak ada papan. Keping yang dijatuhkan dekat tetangga aslinya
// (posisi dan putaran cocok) menempel dan menjadi satu kelompok yang bergerak bersama. Kelompok yang sedang
// dipegang seorang pemain dikunci atas namanya. Puzzle selesai bila semua keping menjadi satu kelompok.
// GM memilih gambar (bawaan atau unggahan), jumlah keping, dan apakah keping bisa berputar.
import { geometry, gridFor, homeCenter, jigsawPresets, pieceOptions, rng, turn, type JigsawConfig } from './jigsaw-data.js';
export { jigsawPresets, pieceOptions } from './jigsaw-data.js';

export const defaultJigsawReward = 'Gambar utuh kembali. Di salah satu sudutnya terlihat tanda kecil yang sebelumnya tidak kalian sadari.';
export const HOLD_MS = 15000; // pegangan yang ditinggal lebih lama dari ini boleh diambil orang lain
export const JOIN = 0.28;      // keping menempel bila meleset kurang dari 28% ukuran keping

export type Piece = { x: number; y: number; r: number; g: number }; // pusat keping di meja, putaran (x90°), id kelompok
export type JigsawState = {
  config: JigsawConfig; seed: number; pieces: Piece[];
  held: Record<string, { by: string; at: number }>;
  joins: Record<string, number>; startedAt: number; finishedAt?: number; reward: string; done: boolean;
};
type GameLike = { phase: string; result: string; scores: Record<string, number>; jigsaw?: JigsawState; jigsawSetup?: JigsawConfig };

export function defaultConfig(count = 204, preset = jigsawPresets[0]): JigsawConfig {
  return { image: preset.url, title: preset.title, srcW: preset.w, srcH: preset.h, ...gridFor(count, preset.w, preset.h), rotate: false, ...(preset.credit ? { credit: preset.credit } : {}) };
}

// Sebar keping ke petak kosong di sekeliling area rakit (tengah meja), satu petak per keping.
export function scatter(cfg: JigsawConfig, seed: number): Piece[] {
  const { W, H, PW, PH, TW, TH, count } = geometry(cfg);
  const r = rng(seed);
  const sw = PW * 1.45, sh = PH * 1.45;
  const cx0 = (TW - W) / 2 - 30, cy0 = (TH - H) / 2 - 30, cx1 = cx0 + W + 60, cy1 = cy0 + H + 60;
  const slots: { x: number; y: number }[] = [];
  for (let y = 10; y + sh <= TH - 10; y += sh) for (let x = 10; x + sw <= TW - 10; x += sw) {
    if (x + sw > cx0 && x < cx1 && y + sh > cy0 && y < cy1) continue;
    slots.push({ x: x + sw / 2, y: y + sh / 2 });
  }
  if (slots.length < count) throw new Error(`Meja puzzle terlalu sempit: ${slots.length} petak untuk ${count} keping.`);
  for (let i = slots.length - 1; i > 0; i--) { const j = r(i + 1); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  const jx = Math.max(1, Math.floor(sw - PW * 1.3)), jy = Math.max(1, Math.floor(sh - PH * 1.3));
  return Array.from({ length: count }, (_, id) => ({
    x: Math.round(slots[id].x + r(jx) - jx / 2), y: Math.round(slots[id].y + r(jy) - jy / 2),
    r: cfg.rotate ? r(4) : 0, g: id,
  }));
}

export function newJigsaw(seed: number, config: JigsawConfig, reward = defaultJigsawReward, now = Date.now()): JigsawState {
  return { config, seed, pieces: scatter(config, seed), held: {}, joins: {}, startedAt: now, reward, done: false };
}

export function jigsawView(t: JigsawState, dm: boolean): JigsawState {
  return { ...t, reward: dm || t.done ? t.reward : '' };
}

export const groupCount = (pieces: Piece[]) => new Set(pieces.map(p => p.g)).size;

const validId = (id: unknown, n: number): id is number => typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < n;
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

// Cek semua keping di kelompok `g` terhadap tetangga aslinya. Bila cocok, ratakan posisi lalu gabungkan.
function tryJoin(t: JigsawState, g: number): number {
  const { cols, rows } = t.config;
  const { PW, PH } = geometry(t.config);
  let merged = 0;
  for (let again = true; again;) {
    again = false;
    for (let id = 0; id < t.pieces.length && !again; id++) {
      const p = t.pieces[id];
      if (p.g !== g) continue;
      const r = Math.floor(id / cols), c = id % cols;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const n = t.pieces[nr * cols + nc];
        if (n.g === g || n.r !== p.r) continue;
        const [ox, oy] = turn(dc * PW, dr * PH, p.r);
        const ex = p.x + ox, ey = p.y + oy;
        if (Math.abs(n.x - ex) < PW * JOIN && Math.abs(n.y - ey) < PH * JOIN) {
          // Kelompok yang dijatuhkan menyesuaikan diri ke tetangga yang sudah diam.
          const sx = n.x - ex, sy = n.y - ey, other = n.g;
          for (const q of t.pieces) if (q.g === g) { q.x += sx; q.y += sy; }
          for (const q of t.pieces) if (q.g === other) q.g = g;
          delete t.held[String(other)];
          merged++; again = true;
          break;
        }
      }
    }
  }
  return merged;
}

export function jigsawAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>, now = Date.now()): string | null {
  if (action.type === 'jigsaw:setup') {
    if (!dm) return 'Hanya GM boleh mengatur puzzle.';
    if (game.phase !== 'waiting') return 'Atur puzzle sebelum ronde dimulai.';
    const { image, title, srcW, srcH, pieces, rotate } = action;
    const preset = jigsawPresets.find(p => p.url === image);
    if (typeof image !== 'string' || (!preset && !/^\/uploads\/[\w.-]+$/.test(image))) return 'Gambar puzzle tidak valid.';
    if (!preset && (!finite(srcW) || !finite(srcH) || srcW < 100 || srcH < 100 || srcW > 20000 || srcH > 20000)) return 'Ukuran gambar tidak valid.';
    if (typeof pieces !== 'number' || !pieceOptions.includes(pieces)) return 'Jumlah keping tidak tersedia.';
    const w = preset ? preset.w : Math.round(srcW as number), h = preset ? preset.h : Math.round(srcH as number);
    game.jigsawSetup = {
      image, title: preset ? preset.title : (typeof title === 'string' && title.trim().slice(0, 60)) || 'Gambar unggahan',
      srcW: w, srcH: h, ...gridFor(pieces, w, h), rotate: rotate === true, ...(preset?.credit ? { credit: preset.credit } : {}),
    };
    return null;
  }
  const t = game.jigsaw;
  if (!t) return 'Ronde belum dimulai.';
  if (action.type === 'jigsaw:reward') {
    if (!dm) return 'Hanya GM boleh menulis pesan hadiah.';
    if (typeof action.text !== 'string') return 'Pesan tidak valid.';
    t.reward = action.text.trim().slice(0, 300) || defaultJigsawReward;
    return null;
  }
  if (game.phase !== 'open' || t.done) return 'Ronde belum dibuka.';
  const id = action.id;
  if (!validId(id, t.pieces.length)) return 'Keping tidak dikenal.';
  const p = t.pieces[id], key = String(p.g), hold = t.held[key];
  const heldByOther = hold && hold.by !== playerId && now - hold.at < HOLD_MS;
  if (heldByOther) return 'Keping ini sedang dipegang pemain lain.';
  const { TW, TH } = geometry(t.config);

  if (action.type === 'jigsaw:grab') {
    for (const [k, h] of Object.entries(t.held)) if (h.by === playerId) delete t.held[k];
    t.held[key] = { by: playerId, at: now };
    return null;
  }
  if (action.type === 'jigsaw:release') { if (hold?.by === playerId) delete t.held[key]; return null; }
  if (action.type === 'jigsaw:drop' || action.type === 'jigsaw:rotate') {
    if (action.type === 'jigsaw:drop') {
      if (!finite(action.x) || !finite(action.y)) return 'Posisi tidak valid.';
      const dx = Math.max(0, Math.min(TW, action.x)) - p.x, dy = Math.max(0, Math.min(TH, action.y)) - p.y;
      for (const q of t.pieces) if (q.g === p.g) { q.x += dx; q.y += dy; }
      delete t.held[key];
    } else {
      if (!t.config.rotate) return 'Putar keping tidak aktif di puzzle ini.';
      // Putar seluruh kelompok 90° searah jarum jam dengan poros di pusat keping yang diklik.
      const px = p.x, py = p.y;
      for (const q of t.pieces) if (q.g === p.g) { const [rx, ry] = turn(q.x - px, q.y - py, 1); q.x = px + rx; q.y = py + ry; q.r = (q.r + 1) % 4; }
    }
    const merged = tryJoin(t, p.g);
    if (merged) {
      t.joins[playerId] = (t.joins[playerId] || 0) + merged;
      game.scores[playerId] = (game.scores[playerId] || 0) + merged;
    }
    for (const q of t.pieces) { q.x = Math.round(q.x * 10) / 10; q.y = Math.round(q.y * 10) / 10; }
    if (groupCount(t.pieces) === 1) { t.done = true; t.finishedAt = now; t.held = {}; game.phase = 'finished'; game.result = 'won'; }
    return null;
  }
  return 'Aksi tidak tersedia pada ronde ini.';
}

// Dipakai tes: posisi pusat keping bila semua terpasang rapi mulai dari titik (ox, oy).
export function solvedLayout(cfg: JigsawConfig, ox: number, oy: number) {
  const { PW, PH, count } = geometry(cfg);
  return Array.from({ length: count }, (_, id) => { const h = homeCenter(id, cfg.cols, PW, PH); return { x: ox + h.x, y: oy + h.y }; });
}
