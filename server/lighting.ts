// Geometri cahaya untuk tampilan (seperti Owlbear Rodeo): setiap sumber cahaya/vision menghasilkan poligon
// area yang tidak terhalang dinding (ray casting). Bayangan dinding jadi tajam dan meruncing; tepi lingkaran
// jangkauan dipudarkan oleh gradien di klien. Aturan siapa melihat apa tetap di visible() (tabletop.ts).
import type { Mark, Point } from './tabletop.js';

export type Segment = { a: Point; b: Point };

// Dinding, pintu tertutup, dan jendela tertutup dalam koordinat piksel. pad (piksel layar peta) sedikit memperpanjang
// ujung dinding supaya sinar tidak lolos lewat celah sambungan. Sengaja dalam piksel, bukan persen peta: di peta besar
// (mis. 144 kolom) persen akan membuat ujung dinding menjorok ke lorong dan memunculkan bayangan segitiga palsu.
export function wallSegments(marks: Mark[], width: number, height: number, pad = 1.5): Segment[] {
  return marks
    .filter(w => w.kind === 'wall' || ((w.kind === 'door' || w.kind === 'window') && !w.open))
    .map(w => {
      const ax = (w.a.x / 100) * width, ay = (w.a.y / 100) * height, bx = (w.b.x / 100) * width, by = (w.b.y / 100) * height;
      const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, ux = (dx / l) * pad, uy = (dy / l) * pad;
      return { a: { x: ax - ux, y: ay - uy }, b: { x: bx + ux, y: by + uy } };
    });
}

function cast(o: Point, angle: number, radius: number, segs: Segment[]): Point {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = radius;
  for (const s of segs) {
    const ex = s.b.x - s.a.x, ey = s.b.y - s.a.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-12) continue;
    const px = s.a.x - o.x, py = s.a.y - o.y;
    const t = (px * ey - py * ex) / denom, u = (px * dy - py * dx) / denom;
    if (t >= 0 && t < best && u >= 0 && u <= 1) best = t;
  }
  return { x: o.x + dx * best, y: o.y + dy * best };
}

// Poligon area terlihat dari titik o sejauh radius (piksel). Sinar diarahkan ke setiap ujung dinding (plus sedikit
// di kiri-kanannya) agar sudut bayangan tepat, ditambah sinar merata untuk busur lingkaran.
// cone: arah dan lebar (radian) untuk cahaya lancip; poligon berupa juring dengan puncak di titik o.
export function sightPolygon(o: Point, radius: number, segs: Segment[], arcSteps = 96, cone?: { dir: number; width: number }): Point[] {
  const near = segs.filter(s =>
    Math.min(s.a.x, s.b.x) <= o.x + radius && Math.max(s.a.x, s.b.x) >= o.x - radius &&
    Math.min(s.a.y, s.b.y) <= o.y + radius && Math.max(s.a.y, s.b.y) >= o.y - radius);
  const angles: number[] = [];
  if (cone) {
    const width = Math.min(Math.PI * 2, Math.max(0.01, cone.width)), from = cone.dir - width / 2;
    const steps = Math.max(8, Math.ceil((arcSteps * width) / (Math.PI * 2)));
    for (let i = 0; i <= steps; i++) angles.push(from + (i / steps) * width);
    for (const s of near) for (const p of [s.a, s.b]) {
      const a = Math.atan2(p.y - o.y, p.x - o.x);
      for (const v of [a - 1e-4, a, a + 1e-4]) {
        const rel = ((((v - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
        if (rel <= width) angles.push(from + rel);
      }
    }
    angles.sort((x, y) => x - y);
    return [o, ...angles.map(a => cast(o, a, radius, near))];
  }
  for (let i = 0; i < arcSteps; i++) angles.push((i / arcSteps) * Math.PI * 2 - Math.PI);
  for (const s of near) for (const p of [s.a, s.b]) {
    const a = Math.atan2(p.y - o.y, p.x - o.x);
    angles.push(a - 1e-4, a, a + 1e-4);
  }
  angles.sort((x, y) => x - y);
  return angles.map(a => cast(o, a, radius, near));
}

export const polygonPath = (points: Point[]) =>
  points.length ? `M${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}Z` : '';
