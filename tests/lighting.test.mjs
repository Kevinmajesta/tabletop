import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sightPolygon, wallSegments, polygonPath } from '../dist-server/lighting.js';

const inside = (pt, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

test('tanpa dinding, poligon berupa lingkaran sebesar jangkauan', () => {
  const poly = sightPolygon({ x: 500, y: 500 }, 100, []);
  for (const p of poly) assert.ok(Math.abs(Math.hypot(p.x - 500, p.y - 500) - 100) < 1e-6);
  assert.ok(inside({ x: 590, y: 500 }, poly));
  assert.ok(!inside({ x: 610, y: 500 }, poly));
});

test('dinding pendek membuat bayangan meruncing yang tajam di belakangnya', () => {
  const marks = [{ id: 'w', ownerId: 'dm', kind: 'wall', a: { x: 55, y: 48 }, b: { x: 55, y: 52 }, text: '' }];
  const segs = wallSegments(marks, 1000, 1000, 0);
  const poly = sightPolygon({ x: 500, y: 500 }, 200, segs);
  assert.ok(inside({ x: 540, y: 500 }, poly), 'depan dinding terlihat');
  assert.ok(!inside({ x: 600, y: 500 }, poly), 'tepat di belakang dinding gelap');
  assert.ok(!inside({ x: 650, y: 530 }, poly), 'bayangan melebar menjauh');
  assert.ok(inside({ x: 600, y: 560 }, poly), 'di luar kerucut bayangan tetap terlihat');
  assert.ok(inside({ x: 400, y: 500 }, poly));
});

test('pintu terbuka tidak menghalangi, pintu tertutup menghalangi', () => {
  const door = open => [{ id: 'd', ownerId: 'dm', kind: 'door', a: { x: 55, y: 40 }, b: { x: 55, y: 60 }, text: '', open }];
  assert.equal(wallSegments(door(true), 1000, 1000).length, 0);
  const poly = sightPolygon({ x: 500, y: 500 }, 200, wallSegments(door(false), 1000, 1000));
  assert.ok(!inside({ x: 600, y: 500 }, poly));
  assert.match(polygonPath(poly), /^M[\d.]+,[\d.]+L.*Z$/);
});

test('cahaya lancip: juring dengan puncak di token, hanya ke arah yang dipilih', () => {
  const poly = sightPolygon({ x: 500, y: 500 }, 200, [], 96, { dir: 0, width: Math.PI / 2 });
  assert.deepEqual(poly[0], { x: 500, y: 500 });
  assert.ok(inside({ x: 650, y: 500 }, poly), 'depan (kanan) terang');
  assert.ok(inside({ x: 620, y: 560 }, poly), 'masih dalam 45° ke bawah');
  assert.ok(!inside({ x: 520, y: 600 }, poly), 'samping gelap');
  assert.ok(!inside({ x: 380, y: 500 }, poly), 'belakang gelap');
  const down = sightPolygon({ x: 500, y: 500 }, 200, [], 96, { dir: Math.PI / 2, width: Math.PI / 3 });
  assert.ok(inside({ x: 500, y: 650 }, down) && !inside({ x: 650, y: 500 }, down));
});

test('server: visible() mengikuti bentuk dan arah cahaya lancip', async () => {
  const { newScene, visible, inLightCone } = await import('../dist-server/tabletop.js');
  const s = newScene('Gua', 's1');
  s.fog = true; s.vision = false;
  s.tokens.push({ id: 't', name: 'Rana', image: '', ownerId: 'p', x: 50, y: 50, visionSource: true, lightRange: 30, lightShape: 'cone', lightAngle: 90, lightDir: 0 });
  assert.equal(visible({ x: 54, y: 50 }, s, 'p'), true, 'depan');
  assert.equal(visible({ x: 46, y: 50 }, s, 'p'), false, 'belakang');
  assert.equal(visible({ x: 50, y: 58 }, s, 'p'), false, 'samping');
  assert.equal(inLightCone(s.tokens[0], { x: 50.5, y: 50 }, s.grid), true, 'petak token sendiri terang');
  s.tokens[0].lightDir = 180;
  assert.equal(visible({ x: 46, y: 50 }, s, 'p'), true, 'setelah diputar');
  delete s.tokens[0].lightShape;
  assert.equal(visible({ x: 50, y: 58 }, s, 'p'), true, 'bulat menerangi semua arah');
});
