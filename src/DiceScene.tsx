import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { dieShape, frameRate, trayWidth, trayDepth, type DiceRoll } from '../server/dice-physics';

function createDie(die: DiceRoll['dice'][number]) {
  const shape = dieShape(die.sides);
  const group = new THREE.Group();
  const vertices: number[] = [];
  for (const face of shape.faces) {
    for (let i = 1; i < face.indices.length - 1; i++) {
      for (const index of [face.indices[0], face.indices[i], face.indices[i + 1]]) vertices.push(...shape.vertices[index]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: die.percentile === 'tens' ? 0xb99459 : 0xf3e5cb, roughness: .32, metalness: .12, flatShading: true }));
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 12), new THREE.LineBasicMaterial({ color: 0x6b5031, transparent: true, opacity: .4 })));
  for (const face of shape.faces) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d')!;
    const value = die.percentile ? face.value - 1 : face.value;
    const label = die.percentile === 'tens' ? String(value * 10).padStart(2, '0') : String(value);
    context.fillStyle = '#20170f';
    context.font = `700 ${label.length > 1 ? 140 : 180}px Georgia, serif`;
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(label, 128, 132);
    if (value === 6 || value === 9) context.fillRect(105, 208, 46, 9);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const size = die.sides === 20 ? .46 : die.sides === 12 ? .55 : die.sides === 10 ? .58 : .72;
    const number = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    const normal = new THREE.Vector3(...face.normal);
    number.position.set(...face.center as [number, number, number]).addScaledVector(normal, .008);
    number.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    group.add(number);
  }
  return group;
}

export default function DiceScene({ roll, onComplete, zoom = 1 }: { roll: DiceRoll; onComplete: () => void; zoom?: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const complete = useRef(onComplete);
  const [failed, setFailed] = useState(false);
  complete.current = onComplete;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const refresh = useRef<(() => void) | null>(null);
  useEffect(() => { refresh.current?.(); }, [zoom]);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFailed(true); complete.current(); return; }
    const scene = new THREE.Scene();
    renderer.setClearColor(0x000000, 0);
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(0, 22, 15);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xfff3da, 0x354539, 2.4));
    const light = new THREE.DirectionalLight(0xffe6bc, 3);
    light.position.set(-5, 14, 6); light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
    light.shadow.bias = -.001;
    scene.add(light);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(trayWidth, .3, trayDepth), new THREE.ShadowMaterial({ opacity: .25 }));
    floor.position.y = -.15; floor.receiveShadow = true; scene.add(floor);
    const dice = roll.dice.map(die => { const group = createDie(die); scene.add(group); return group; });
    const resize = () => {
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const requestedRatio = Math.min(window.devicePixelRatio || 1, 2) * Math.max(.5, zoomRef.current);
      const ratio = Math.min(requestedRatio, renderer.capabilities.maxTextureSize / Math.max(width, height), Math.sqrt(16000000 / (width * height)));
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    refresh.current = resize;
    let frame = 0, done = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const q = new THREE.Quaternion();
    const draw = (now: number) => {
      const index = reduced ? roll.frames.length - 1 : Math.max(0, Math.min(roll.frames.length - 1, (now - start) / 1000 * frameRate));
      const lower = Math.floor(index), upper = Math.min(lower + 1, roll.frames.length - 1), mix = index - lower;
      dice.forEach((die, i) => {
        const a = roll.frames[lower][i], b = roll.frames[upper][i];
        die.position.fromArray(a.p).lerp(new THREE.Vector3().fromArray(b.p), mix);
        die.quaternion.fromArray(a.q).slerp(q.fromArray(b.q), mix);
      });
      const center = new THREE.Vector3(0, 0, 0);
      const radius = Math.hypot(trayWidth / 2, trayDepth / 2) + 2;
      const verticalAngle = THREE.MathUtils.degToRad(camera.fov / 2);
      const horizontalAngle = Math.atan(Math.tan(verticalAngle) * camera.aspect);
      const distance = Math.max(9, radius / Math.sin(Math.min(verticalAngle, horizontalAngle)));
      camera.position.copy(center).add(new THREE.Vector3(0, .84, .56).normalize().multiplyScalar(distance));
      camera.lookAt(center);
      renderer.render(scene, camera);
      if (index < roll.frames.length - 1) frame = requestAnimationFrame(draw);
      else if (!done) { done = true; complete.current(); }
    };
    frame = requestAnimationFrame(draw);
    const contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); setFailed(true); complete.current(); };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    return () => {
      refresh.current = null;
      cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        }
      });
      materials.forEach(material => { if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose(); material.dispose(); });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [roll]);

  return <><div className="dice-scene" ref={holder} aria-hidden="true"/>{failed && <p className="dice-render-error">Tampilan 3D tidak tersedia. Hasil fisika server tetap ditampilkan.</p>}</>;
}
