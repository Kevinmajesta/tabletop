import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export type Pose = { p: number[]; q: number[] };
export type DiceRoll = { sides: number; modifier: number; values: number[]; total: number; frames: Pose[][]; dice: { sides: number; percentile?: 'tens' | 'units' }[] };
export const frameRate = 30;
export const trayWidth = 18;
export const trayDepth = 12;

export function dieShape(sides: number) {
  let geometry: THREE.BufferGeometry;
  if (sides === 10) {
    const h = .105;
    const tip = h * (1 + 2 / (1 - Math.cos(Math.PI / 5)));
    const ring = Array.from({ length: 10 }, (_, i) => [Math.cos(i * Math.PI / 5), i % 2 ? h : -h, Math.sin(i * Math.PI / 5)]);
    const vertices = [...ring, [0, tip, 0], [0, -tip, 0]];
    const faces = Array.from({ length: 10 }, (_, i) => [i % 2 ? 11 : 10, i, (i + 1) % 10, (i + 2) % 10]);
    return finishShape(vertices, faces);
  }
  switch (sides) {
    case 4: geometry = new THREE.TetrahedronGeometry(1.15); break;
    case 6: geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5); break;
    case 8: geometry = new THREE.OctahedronGeometry(1.12); break;
    case 12: geometry = new THREE.DodecahedronGeometry(1.08); break;
    default: geometry = new THREE.IcosahedronGeometry(1.12);
  }
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute('position');
  const vertices: number[][] = [];
  const planes: { normal: THREE.Vector3; indices: Set<number> }[] = [];
  for (let i = 0; i < position.count; i += 3) {
    const points = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(position, i + j));
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
    if (normal.dot(points[0]) < 0) normal.negate();
    let plane = planes.find(p => p.normal.dot(normal) > .999);
    if (!plane) { plane = { normal, indices: new Set() }; planes.push(plane); }
    for (const point of points) {
      let index = vertices.findIndex(v => point.distanceToSquared(new THREE.Vector3(...v)) < 1e-10);
      if (index < 0) { index = vertices.length; vertices.push(point.toArray()); }
      plane.indices.add(index);
    }
  }
  source.dispose();
  if (source !== geometry) geometry.dispose();
  return finishShape(vertices, planes.map(p => [...p.indices]));
}

function finishShape(vertices: number[][], indices: number[][]) {
  const points = vertices.map(v => new THREE.Vector3(...v));
  const faces = indices.map((face, index) => {
    const center = face.reduce((sum, i) => sum.add(points[i]), new THREE.Vector3()).divideScalar(face.length);
    const normal = center.clone().normalize();
    const u = points[face[0]].clone().sub(center).normalize();
    const v = normal.clone().cross(u);
    const sorted = [...face].sort((a, b) => {
      const pa = points[a].clone().sub(center), pb = points[b].clone().sub(center);
      return Math.atan2(pa.dot(v), pa.dot(u)) - Math.atan2(pb.dot(v), pb.dot(u));
    });
    const actual = points[sorted[1]].clone().sub(points[sorted[0]]).cross(points[sorted[2]].clone().sub(points[sorted[0]])).normalize();
    return { indices: sorted, normal: actual.toArray(), center: center.toArray(), value: index + 1 };
  });
  return { vertices, faces };
}

export function readDie(sides: number, quaternion: number[]) {
  const shape = dieShape(sides);
  const q = new THREE.Quaternion(...quaternion);
  let best = -Infinity, value = 1;
  for (const face of shape.faces) {
    const height = new THREE.Vector3(...face.normal).applyQuaternion(q).y * (sides === 4 ? -1 : 1);
    if (height > best) { best = height; value = face.value; }
  }
  return value;
}

export function simulateRoll(sides: number, count: number, modifier: number, random: () => number): DiceRoll {
  const dice: DiceRoll['dice'] = Array.from({ length: count }, () => sides === 100
    ? [{ sides: 10, percentile: 'tens' as const }, { sides: 10, percentile: 'units' as const }]
    : [{ sides }]).flat();
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0), allowSleep: true });
  const material = new CANNON.Material();
  world.defaultContactMaterial.friction = .38;
  world.defaultContactMaterial.restitution = .32;
  (world.solver as CANNON.GSSolver).iterations = 16;
  const floor = new CANNON.Body({ mass: 0, material, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  for (const [x, z, sx, sz] of [[-9.3, 0, .3, 6.6], [9.3, 0, .3, 6.6], [0, -6.3, 9.6, .3], [0, 6.3, 9.6, .3]]) {
    const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(sx, 5, sz)) });
    wall.position.set(x, 5, z); world.addBody(wall);
  }
  const bodies = dice.map((die, i) => {
    const shape = dieShape(die.sides);
    const body = new CANNON.Body({ mass: 1, material, shape: new CANNON.ConvexPolyhedron({ vertices: shape.vertices.map(v => new CANNON.Vec3(...v)), faces: shape.faces.map(f => f.indices) }), linearDamping: .2, angularDamping: .24, sleepSpeedLimit: .12, sleepTimeLimit: .45 });
    body.position.set(-6 + (i % 8) * 1.65, 3 + Math.floor(i / 8) * 2.5, -3 + random());
    body.quaternion.setFromEuler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2);
    body.velocity.set(3 + random() * 5, random() * 2, 3 + random() * 5);
    body.angularVelocity.set((random() - .5) * 22, (random() - .5) * 22, (random() - .5) * 22);
    world.addBody(body); return body;
  });
  const frames: Pose[][] = [];
  const record = () => frames.push(bodies.map(body => ({ p: body.position.toArray(), q: body.quaternion.toArray() })));
  record();
  for (let step = 0; step < 1200; step++) {
    world.step(1 / 60);
    if (step % 2 === 1) record();
    if (step > 90 && bodies.every(body => body.sleepState === CANNON.Body.SLEEPING)) break;
    if (step === 1199) throw new Error('Dadu belum berhenti. Coba lempar lagi.');
  }
  const faces = bodies.map((body, i) => readDie(dice[i].sides, body.quaternion.toArray()));
  const values = sides === 100 ? Array.from({ length: count }, (_, i) => ((faces[i * 2] - 1) * 10 + faces[i * 2 + 1] - 1) || 100) : faces;
  return { sides, modifier, values, total: values.reduce((sum, value) => sum + value, modifier), dice, frames };
}
