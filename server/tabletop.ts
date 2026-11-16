export type Point = { x: number; y: number };
export type Grid = { columns: number; distance: number; unit: 'ft' | 'm'; diagonal: 'grid' | 'euclidean'; width: number; height: number; offsetX: number; offsetY: number };
// kind 'draw' = goresan pensil bebas: titik-titiknya di points, warnanya di text (#rrggbb).
export type Mark = { id: string; ownerId: string; kind: 'line' | 'circle' | 'cone' | 'rect' | 'text' | 'draw' | 'wall' | 'door' | 'window' | 'light' | 'reveal'; a: Point; b: Point; text: string; open?: boolean; points?: Point[] };
// Efek suasana di atas peta, dipilih DM per scene.
export const weathers = ['rain', 'storm', 'snow', 'fog', 'night', 'torch'] as const;
export type Weather = typeof weathers[number];
export type Scene = { id: string; name: string; map: string | null; mapScale?: number; tokens: BoardToken[]; grid: Grid; marks: Mark[]; fog: boolean; vision: boolean; daylight: boolean; weather?: Weather; gridHidden?: boolean; combat: { active: boolean; round: number; turn: number; ids: string[] } };
export type BoardToken = Point & { id: string; name: string; image: string; ownerId: string; minigame?: import('./minigames.js').GameKind; size?: number; hp?: number; maxHp?: number; conditions?: string[]; initiative?: number; dead?: boolean; hidden?: boolean; visionRange?: number; visionSource?: boolean; lightRange?: number; lightShape?: 'cone'; lightAngle?: number; lightDir?: number; rotation?: number; prop?: true; aspect?: number; characterId?: string; characterRevision?: number; ac?: number; initBonus?: number; monster?: string };
// Batas posisi (persen peta) untuk gambar peta/prop: boleh keluar dari tabel sampai 1,5× ukuran peta.
export const PROP_MIN = -150, PROP_MAX = 250;
// Gambar peta dan token minigame boleh ditaruh di luar tabel.
export const offTableAllowed = (t: { prop?: true; minigame?: string }) => !!t.prop || !!t.minigame;
// Token minigame di luar tabel tidak terhalang dinding/kabut: selalu terlihat (kecuali disembunyikan GM).
export const offTable = (p: Point) => p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100;
export const seesToken = (t: BoardToken, scene: Scene, playerId: string) => (!!t.minigame && offTable(t)) || visible(t, scene, playerId);
export const conditions = ['Prone', 'Poisoned', 'Stunned', 'Blinded', 'Restrained', 'Unconscious', 'Defeated'];
export function newScene(name: string, id: string): Scene {
  return { id, name, map: null, tokens: [], grid: { columns: 20, distance: 5, unit: 'ft', diagonal: 'grid', width: 1200, height: 800, offsetX: 0, offsetY: 0 }, marks: [], fog: false, vision: false, daylight: true, combat: { active: false, round: 1, turn: 0, ids: [] } };
}
export function distance(a: Point, b: Point, grid: Grid) {
  const x = Math.abs(a.x - b.x) / 100 * grid.columns;
  const y = Math.abs(a.y - b.y) / 100 * grid.columns * grid.height / grid.width;
  return (grid.diagonal === 'grid' ? Math.max(x, y) : Math.hypot(x, y)) * grid.distance;
}
export function blocked(a: Point, b: Point, marks: Mark[], pad = 0) {
  // pad extends each wall at both ends so sight rays cannot slip through hairline gaps at wall joints
  const ext = (w: Mark): Mark => { if (!pad) return w; const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y, l = Math.hypot(dx, dy) || 1, ux = dx / l * pad, uy = dy / l * pad; return { ...w, a: { x: w.a.x - ux, y: w.a.y - uy }, b: { x: w.b.x + ux, y: w.b.y + uy } }; };
  const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const on = (p: Point, q: Point, r: Point) => Math.abs(cross(p, q, r)) < 1e-8 && r.x >= Math.min(p.x, q.x) - 1e-8 && r.x <= Math.max(p.x, q.x) + 1e-8 && r.y >= Math.min(p.y, q.y) - 1e-8 && r.y <= Math.max(p.y, q.y) + 1e-8;
  const lx = Math.min(a.x, b.x) - pad - 1e-6, hx = Math.max(a.x, b.x) + pad + 1e-6, ly = Math.min(a.y, b.y) - pad - 1e-6, hy = Math.max(a.y, b.y) + pad + 1e-6;
  const near = (w: Mark) => Math.max(w.a.x, w.b.x) >= lx && Math.min(w.a.x, w.b.x) <= hx && Math.max(w.a.y, w.b.y) >= ly && Math.min(w.a.y, w.b.y) <= hy;
  return marks.filter(near).map(ext).some(w => (w.kind === 'wall' || ((w.kind === 'door' || w.kind === 'window') && !w.open)) && ((cross(a, b, w.a) * cross(a, b, w.b) < 0 && cross(w.a, w.b, a) * cross(w.a, w.b, b) < 0) || on(a, b, w.a) || on(a, b, w.b) || on(w.a, w.b, a) || on(w.a, w.b, b)));
}
export function blocksMovement(a: Point, b: Point, marks: Mark[]) {
  return blocked(a, b, marks);
}
// Cahaya lancip (kerucut): arah dalam derajat layar (0 = kanan, 90 = bawah), lebar sudut penuh dalam derajat.
export const coneDefaults = { angle: 90, dir: 0 };
export function inLightCone(token: BoardToken, point: Point, grid: Pick<Grid, 'width' | 'height' | 'columns'>) {
  if (token.lightShape !== 'cone') return true;
  const dx = ((point.x - token.x) / 100) * grid.width, dy = ((point.y - token.y) / 100) * grid.height;
  // Petak token sendiri selalu terang.
  if (Math.hypot(dx, dy) <= (grid.width / grid.columns) * 0.6) return true;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const diff = Math.abs((((angle - (token.lightDir ?? coneDefaults.dir)) % 360) + 540) % 360 - 180);
  return diff <= (token.lightAngle ?? coneDefaults.angle) / 2;
}
export function visible(point: Point, scene: Scene, playerId: string, previewTokenId?: string | null) {
  const grid = { ...scene.grid, diagonal: 'euclidean' as const };
  // Perpanjangan ujung dinding ~5% satu kotak (maks 0,4% peta) — cukup menutup celah sambungan tanpa menjorok ke lorong.
  const sightPad = Math.min(0.4, (100 / Math.max(1, scene.grid.columns)) * 0.05);
  const sources = scene.tokens.filter(t =>
    !t.hidden && (previewTokenId ? t.id === previewTokenId : t.ownerId === playerId && t.visionSource),
  );
  const tokenLight = (token: BoardToken) => !!token.lightRange && !token.hidden && distance(token, point, grid) <= token.lightRange && inLightCone(token, point, scene.grid) && !blocked(token, point, scene.marks, sightPad);
  const revealed = scene.marks.some(m => m.kind === 'reveal' && point.x >= Math.min(m.a.x, m.b.x) && point.x <= Math.max(m.a.x, m.b.x) && point.y >= Math.min(m.a.y, m.b.y) && point.y <= Math.max(m.a.y, m.b.y));
  if (scene.fog && !revealed && !sources.some(tokenLight)) return false;
  if (!scene.vision) return true;
  const lit = scene.daylight || scene.marks.some(m => m.kind === 'light' && distance(m.a, point, grid) <= distance(m.a, m.b, grid) && !blocked(m.a, point, scene.marks, sightPad)) || scene.tokens.some(tokenLight);
  return sources.some(t => distance(t, point, grid) <= (t.visionRange ?? 60) && !blocked(t, point, scene.marks, sightPad)) && lit;
}
