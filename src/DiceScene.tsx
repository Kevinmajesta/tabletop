import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const duration = 2300;

function d10Geometry() {
  // Ten planar kite faces: the two staggered rings meet at opposite tips.
  const height = .12;
  const tip = height * (1 + 2 / (1 - Math.cos(Math.PI / 5)));
  const ring = Array.from({ length: 10 }, (_, i) => new THREE.Vector3(
    Math.cos(i * Math.PI / 5), i % 2 ? height : -height, Math.sin(i * Math.PI / 5),
  ));
  const vertices: number[] = [];
  for (let i = 0; i < 10; i++) {
    const apex = new THREE.Vector3(0, i % 2 ? -tip : tip, 0);
    const a = ring[i];
    const b = ring[(i + 1) % 10];
    const c = ring[(i + 2) % 10];
    for (const point of [apex, a, b, apex, b, c]) vertices.push(point.x, point.y, point.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

function geometryFor(sides: number) {
  switch (sides) {
    case 4: return new THREE.TetrahedronGeometry(1.38);
    case 6: return new THREE.BoxGeometry(1.9, 1.9, 1.9);
    case 8: return new THREE.OctahedronGeometry(1.48);
    case 10: return d10Geometry();
    case 12: return new THREE.DodecahedronGeometry(1.42);
    default: return new THREE.IcosahedronGeometry(1.48);
  }
}

function numeral(label: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff2d7';
  context.font = `bold ${label.length > 2 ? 87 : label.length > 1 ? 122 : 154}px Arial, sans-serif`;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.fillText(label, 128, 134);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Face = { normal: THREE.Vector3; center: THREE.Vector3; triangles: number };

function createDie(sides: number, value: number, labelFor: (value: number) => string) {
  const group = new THREE.Group();
  const source = geometryFor(sides);
  const geometry = source.index ? source.toNonIndexed() : source;
  if (source !== geometry) source.dispose();
  // Use flat faces so the numbered faces remain legible while turning.
  geometry.computeVertexNormals();
  const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x75478b, roughness: .43, metalness: .12, flatShading: true, side: THREE.DoubleSide }));
  group.add(body);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 9), new THREE.LineBasicMaterial({ color: 0xe2bce9, transparent: true, opacity: .8 })));

  const positions = geometry.getAttribute('position');
  const faces: Face[] = [];
  for (let i = 0; i < positions.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, i);
    const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2);
    const center = a.clone().add(b).add(c).divideScalar(3);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (normal.dot(center) < 0) normal.negate();
    const face = faces.find(candidate => candidate.normal.dot(normal) > .999);
    if (face) { face.center.add(center); face.triangles++; }
    else faces.push({ normal, center, triangles: 1 });
  }

  faces.forEach((face, i) => {
    face.center.divideScalar(face.triangles);
    const label = labelFor((value + i - 2 + sides) % sides + 1);
    const texture = numeral(label);
    const size = sides === 20 ? .52 : sides === 12 ? .65 : sides === 10 ? .64 : sides === 4 ? .64 : .82;
    const number = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    number.position.copy(face.center).addScaledVector(face.normal, .027);
    number.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face.normal);
    group.add(number);
  });
  const target = new THREE.Quaternion().setFromUnitVectors(faces[0].normal, new THREE.Vector3(0, 0, 1));
  return { group, target };
}

export default function DiceScene({ sides, values, onComplete }: { sides: number; values: number[]; onComplete: () => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const complete = useRef(onComplete);
  complete.current = onComplete;

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { const timer = window.setTimeout(() => complete.current(), duration); return () => window.clearTimeout(timer); }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    camera.position.set(0, 0, values.length > 1 ? 10 : 8);
    scene.add(new THREE.HemisphereLight(0xffeed8, 0x29152f, 2.7));
    const light = new THREE.DirectionalLight(0xffffff, 2.3);
    light.position.set(-3, 5, 6);
    scene.add(light);

    const dice = (sides === 100
      ? [{ value: Math.floor(values[0] % 100 / 10) + 1, label: (v: number) => values[0] === 100 && v === 1 ? '100' : String((v - 1) * 10).padStart(2, '0') }, { value: values[0] % 10 + 1, label: (v: number) => String(v - 1) }]
      : values.map(value => ({ value, label: (v: number) => String(v) })))
      .map(({ value, label }, i, all) => {
        const die = createDie(sides === 100 ? 10 : sides, value, label);
        die.group.position.x = (i - (all.length - 1) / 2) * 2.2;
        scene.add(die.group);
        const start = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.4 + i, 2.2 + i, -.8));
        return { ...die, start, x: die.group.position.x };
      });

    const resize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      camera.aspect = width / height;
      camera.position.z = Math.max(8, dice.length * 2.15 + 5);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let frame = 0;
    let done = false;
    const startTime = performance.now();
    const spin = new THREE.Quaternion();
    const axis = new THREE.Vector3(.7, 1, .3).normalize();
    function animate(now: number) {
      const progress = Math.min(1, (now - startTime) / duration);
      const ease = progress < .55 ? progress * .45 : .2475 + (1 - Math.pow(1 - (progress - .55) / .45, 3)) * .7525;
      dice.forEach(({ group, target, start, x }, i) => {
        spin.setFromAxisAngle(axis, (1 - ease) * Math.PI * (4 + i));
        group.quaternion.copy(start).multiply(spin).slerp(target, ease);
        group.position.set(x, Math.abs(Math.sin(progress * Math.PI * 5 + i)) * .33 * (1 - progress), 0);
      });
      renderer.render(scene, camera);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else if (!done) { done = true; complete.current(); }
    }
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => { if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose(); material.dispose(); });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [sides, values]);

  return <div className="dice-scene" ref={holder} aria-hidden="true"/>;
}
