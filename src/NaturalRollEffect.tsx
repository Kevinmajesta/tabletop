const twentyGifs = Object.values(import.meta.glob('./gif nat20/*.gif', { eager: true, query: '?url', import: 'default' })) as string[];
const oneGifs = Object.values(import.meta.glob('./gif nat 1/*.gif', { eager: true, query: '?url', import: 'default' })) as string[];

function gifFor(gifs: string[], id: string) {
  const hash = Array.from(id).reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 0);
  return gifs[hash % gifs.length];
}

export default function NaturalRollEffect({ sides, values, revealed, rollId }: { sides: number; values: number[]; revealed: boolean; rollId?: string }) {
  if (!revealed || sides !== 20 || localStorage.getItem('meja-dice-animation') === 'off') return null;
  const twenty = values.includes(20);
  const one = values.includes(1);
  if (!twenty && !one) return null;
  return <div key={rollId ?? values.join(',')} className="natural-roll-effects" role="status" aria-live="polite">
    {twenty && <div className="natural-roll natural-twenty"><img src={gifFor(twentyGifs, rollId || values.join(','))} alt=""/><div className="natural-splash-title"><strong>Natural 20</strong><p>Angka tertinggi!</p></div></div>}
    {one && <div className="natural-roll natural-one"><img src={gifFor(oneGifs, rollId || values.join(','))} alt=""/><div className="natural-splash-title"><strong>Natural 1</strong><p>Angka terendah!</p></div></div>}
  </div>;
}
