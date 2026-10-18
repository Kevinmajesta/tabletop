import { useEffect, useRef } from 'react';
import './coin-flip.css';

export type CoinResult = { id: string; name: string; face: 'Angka' | 'Gambar' };
export default function CoinFlip({ result, onComplete }: { result: CoinResult; onComplete: () => void }) {
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => { const timer = window.setTimeout(() => complete.current(), 4500); return () => window.clearTimeout(timer); }, []);
  return <div className="coin-flip" role="status" aria-label={`${result.name}: ${result.face}`}>
    <div className={`coin-toss ${result.face === 'Gambar' ? 'coin-back' : ''}`}><div className="coin-body">
      <div className="coin-face">1<span>ANGKA</span></div><div className="coin-face coin-reverse">✦<span>GAMBAR</span></div>
    </div></div>
    <p>{result.name} · <strong>{result.face}</strong></p>
  </div>;
}
