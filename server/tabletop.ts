export type Point = { x: number; y: number };
export type Grid = { columns: number; distance: number; unit: 'ft' | 'm'; diagonal: 'grid' | 'euclidean'; width: number; height: number; offsetX: number; offsetY: number };
export type Mark = { id: string; ownerId: string; kind: 'line' | 'circle' | 'cone' | 'rect' | 'text' | 'wall' | 'light' | 'reveal'; a: Point; b: Point; text: string };
export type Scene = { id: string; name: string; map: string | null; tokens: BoardToken[]; grid: Grid; marks: Mark[]; fog: boolean; vision: boolean; daylight: boolean; combat: { active: boolean; round: number; turn: number; ids: string[] } };
export type BoardToken = Point & { id: string; name: string; image: string; ownerId: string; minigame?: import('./minigames.js').GameKind; size?: number; hp?: number; maxHp?: number; conditions?: string[]; initiative?: number; hidden?: boolean; visionRange?: number; visionSource?: boolean; characterId?: string; characterRevision?: number };
export const conditions = ['Prone', 'Poisoned', 'Stunned', 'Blinded', 'Restrained', 'Unconscious', 'Defeated'];
export function newScene(name: string, id: string): Scene {
  return { id, name, map: null, tokens: [], grid: { columns: 20, distance: 5, unit: 'ft', diagonal: 'grid', width: 1200, height: 800, offsetX: 0, offsetY: 0 }, marks: [], fog: false, vision: false, daylight: true, combat: { active: false, round: 1, turn: 0, ids: [] } };
}
export function distance(a: Point, b: Point, grid: Grid) {
  const x = Math.abs(a.x - b.x) / 100 * grid.columns;
  const y = Math.abs(a.y - b.y) / 100 * grid.columns * grid.height / grid.width;
  return (grid.diagonal === 'grid' ? Math.max(x, y) : Math.hypot(x, y)) * grid.distance;
}
export function blocked(a: Point, b: Point, marks: Mark[]) {
  const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const on = (p: Point, q: Point, r: Point) => Math.abs(cross(p, q, r)) < 1e-8 && r.x >= Math.min(p.x, q.x) - 1e-8 && r.x <= Math.max(p.x, q.x) + 1e-8 && r.y >= Math.min(p.y, q.y) - 1e-8 && r.y <= Math.max(p.y, q.y) + 1e-8;
  return marks.some(w => w.kind === 'wall' && ((cross(a, b, w.a) * cross(a, b, w.b) < 0 && cross(w.a, w.b, a) * cross(w.a, w.b, b) < 0) || on(a, b, w.a) || on(a, b, w.b) || on(w.a, w.b, a) || on(w.a, w.b, b)));
}
export function visible(point: Point, scene: Scene, playerId: string) {
  if (scene.fog && !scene.marks.some(m => m.kind === 'reveal' && point.x >= Math.min(m.a.x, m.b.x) && point.x <= Math.max(m.a.x, m.b.x) && point.y >= Math.min(m.a.y, m.b.y) && point.y <= Math.max(m.a.y, m.b.y))) return false;
  if (!scene.vision) return true;
  const sources = scene.tokens.filter(t => t.ownerId === playerId && t.visionSource && !t.hidden);
  return sources.some(t => distance(t, point, { ...scene.grid, diagonal: 'euclidean' }) <= (t.visionRange ?? 60) && !blocked(t, point, scene.marks)) && (scene.daylight || scene.marks.some(m => m.kind === 'light' && distance(m.a, point, { ...scene.grid, diagonal: 'euclidean' }) <= distance(m.a, m.b, { ...scene.grid, diagonal: 'euclidean' }) && !blocked(m.a, point, scene.marks)));
}
