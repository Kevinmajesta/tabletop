// Data dan geometri bersama Puzzle Gambar (jigsaw). Dipakai server dan klien.
// Rakit bebas tanpa papan: keping yang cocok menempel satu sama lain menjadi kelompok.
// Gambar diskalakan ke "satuan puzzle" (sisi terpanjang 2100) supaya geometri sama untuk gambar apa pun.
// Bentuk tonjolan/lekukan diturunkan dari `seed`; server cukup menyimpan seed, posisi, dan putaran keping.

export type JigsawPreset = { id: string; title: string; url: string; w: number; h: number; credit?: string };
export const jigsawPresets: JigsawPreset[] = [
  { id: 'birds', title: 'Rumah Burung di Atas Tiang', url: '/jigsaw/bird-houses.jpg', w: 2400, h: 1453, credit: 'Foto: Lisafern, Wikimedia Commons (CC0)' },
  { id: 'market', title: 'Pasar Kota di Malam Hari', url: '/maps/town-market-night.jpg', w: 2100, h: 1470 },
];
export const pieceOptions = [48, 108, 204, 300];

export type JigsawConfig = { image: string; title: string; srcW: number; srcH: number; cols: number; rows: number; rotate: boolean; credit?: string };

const LONG = 2100;
export function gridFor(count: number, srcW: number, srcH: number) {
  const aspect = srcW / srcH;
  let best = { cols: 1, rows: 1, score: Infinity };
  for (let cols = 2; cols <= 40; cols++) {
    const rows = Math.max(2, Math.round(count / cols));
    const cell = (aspect / cols) / (1 / rows); // rasio lebar/tinggi satu keping
    const score = Math.abs(cols * rows - count) / count + Math.abs(Math.log(cell)) * 0.8;
    if (score < best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

export function geometry(cfg: Pick<JigsawConfig, 'srcW' | 'srcH' | 'cols' | 'rows'>) {
  const scale = LONG / Math.max(cfg.srcW, cfg.srcH);
  const W = cfg.srcW * scale, H = cfg.srcH * scale;
  const PW = W / cfg.cols, PH = H / cfg.rows;
  // Meja kerja luas: keping disebar di sekeliling, area tengah sebesar gambar dibiarkan kosong untuk merakit.
  const TW = Math.round(W * 2.5), TH = Math.round(H * 2.6);
  return { W, H, PW, PH, TW, TH, count: cfg.cols * cfg.rows };
}

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return (max: number) => { s = (s * 1664525 + 1013904223) >>> 0; return Math.floor((s / 4294967296) * max); };
}

// h[r][c]: sambungan (r,c)-(r+1,c), +1 = tonjolan keping atas. v[r][c]: sambungan (r,c)-(r,c+1), +1 = tonjolan keping kiri.
export function tabs(seed: number, cols: number, rows: number) {
  const r = rng(seed ^ 0x9e3779b9);
  const pick = () => (r(2) ? 1 : -1);
  return {
    h: Array.from({ length: rows - 1 }, () => Array.from({ length: cols }, pick)),
    v: Array.from({ length: rows }, () => Array.from({ length: cols - 1 }, pick)),
  };
}

const tabCurve: [number, number][][] = [
  [[0.36, 0]],
  [[0.42, 0], [0.43, 0.06], [0.40, 0.10]],
  [[0.36, 0.16], [0.40, 0.25], [0.50, 0.25]],
  [[0.60, 0.25], [0.64, 0.16], [0.60, 0.10]],
  [[0.57, 0.06], [0.58, 0], [0.64, 0]],
  [[1, 0]],
];
function edge(x0: number, y0: number, x1: number, y1: number, s: number, size: number) {
  if (!s) return `L${x1.toFixed(1)} ${y1.toFixed(1)}`;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = dy / len, ny = -dx / len; // normal ke luar untuk keliling searah jarum jam (sumbu y ke bawah)
  const k = size * s;
  const pt = ([t, u]: [number, number]) => `${(x0 + dx * t + nx * u * k).toFixed(1)} ${(y0 + dy * t + ny * u * k).toFixed(1)}`;
  return tabCurve.map(seg => (seg.length === 1 ? `L${pt(seg[0])}` : `C${seg.map(pt).join(' ')}`)).join(' ');
}

// Jalur SVG keping pada posisi aslinya di gambar (koordinat gambar, pojok kiri atas = 0,0).
export function piecePath(id: number, cfg: Pick<JigsawConfig, 'cols' | 'rows'>, PW: number, PH: number, t: ReturnType<typeof tabs>) {
  const r = Math.floor(id / cfg.cols), c = id % cfg.cols;
  const x = c * PW, y = r * PH, size = Math.min(PW, PH);
  const top = r === 0 ? 0 : -t.h[r - 1][c];
  const right = c === cfg.cols - 1 ? 0 : t.v[r][c];
  const bottom = r === cfg.rows - 1 ? 0 : t.h[r][c];
  const left = c === 0 ? 0 : -t.v[r][c - 1];
  return `M${x.toFixed(1)} ${y.toFixed(1)} ` +
    edge(x, y, x + PW, y, top, size) + ' ' + edge(x + PW, y, x + PW, y + PH, right, size) + ' ' +
    edge(x + PW, y + PH, x, y + PH, bottom, size) + ' ' + edge(x, y + PH, x, y, left, size) + ' Z';
}

export const homeCenter = (id: number, cols: number, PW: number, PH: number) => ({ x: ((id % cols) + 0.5) * PW, y: (Math.floor(id / cols) + 0.5) * PH });
export const isEdgePiece = (id: number, cols: number, rows: number) => { const r = Math.floor(id / cols), c = id % cols; return r === 0 || c === 0 || r === rows - 1 || c === cols - 1; };
// Putar vektor (dx,dy) sebanyak rot x 90 derajat searah jarum jam (sumbu y ke bawah).
export function turn(dx: number, dy: number, rot: number) {
  const k = ((rot % 4) + 4) % 4;
  return k === 0 ? [dx, dy] : k === 1 ? [-dy, dx] : k === 2 ? [-dx, -dy] : [dy, -dx];
}
