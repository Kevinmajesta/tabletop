import { useEffect, useState } from 'react';

const twentyGifs = Object.values(import.meta.glob('./gif nat20/*.gif', { query: '?url', import: 'default' })) as (() => Promise<string>)[];
const oneGifs = Object.values(import.meta.glob('./gif nat 1/*.gif', { query: '?url', import: 'default' })) as (() => Promise<string>)[];

function gifFor(gifs: (() => Promise<string>)[], id: string) {
  const hash = Array.from(id).reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 0);
  return gifs[hash % gifs.length];
}

function RollGif({ gifs, id }: { gifs: (() => Promise<string>)[]; id: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { let live = true; void gifFor(gifs, id)().then((url) => { if (live) setSrc(url); }); return () => { live = false; }; }, [gifs, id]);
  return src ? <img src={src} alt=""/> : null;
}

export default function NaturalRollEffect({ sides, values, rollId }: { sides: number; values: number[]; rollId?: string }) {
  const twenty = values.includes(20);
  const one = values.includes(1);
  if (sides !== 20 || (!twenty && !one)) return null;
  const id = rollId || values.join(',');
  return <div key={id} className="natural-roll-effects" role="status" aria-live="polite">
    {twenty && <div className="natural-roll natural-twenty"><RollGif gifs={twentyGifs} id={id}/><div className="natural-splash-title"><strong>Natural 20</strong><p>Angka tertinggi!</p></div></div>}
    {one && <div className="natural-roll natural-one"><RollGif gifs={oneGifs} id={id}/><div className="natural-splash-title"><strong>Natural 1</strong><p>Angka terendah!</p></div></div>}
  </div>;
}
