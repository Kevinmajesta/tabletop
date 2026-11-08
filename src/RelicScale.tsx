import { useState, useEffect } from 'react';
import type { Game } from '../server/minigames';

const relics = Array.from({ length: 9 }, (_, i) => i);
const symbols = ['◆', '●', '▲', '■', '✦', '⬢', '✚', '⬟', '❖'];
type Side = 'pool' | 'left' | 'right';
const outcome = { 'left-light': 'Piringan kiri lebih ringan', 'right-light': 'Piringan kanan lebih ringan', balanced: 'Seimbang' } as const;

export default function RelicScale({ game, disabled, send }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const scale = game.scale;
  const [place, setPlace] = useState<Record<number, Side>>(() => {
    const init: Record<number, Side> = {};
    scale?.leftPan?.forEach(n => init[n] = 'left');
    scale?.rightPan?.forEach(n => init[n] = 'right');
    return init;
  });
  const [pick, setPick] = useState<number | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  useEffect(() => {
    if (scale?.leftPan !== undefined || scale?.rightPan !== undefined) {
      const nextPlace: Record<number, Side> = {};
      scale?.leftPan?.forEach(n => nextPlace[n] = 'left');
      scale?.rightPan?.forEach(n => nextPlace[n] = 'right');
      setPlace(nextPlace);
    }
  }, [scale?.leftPan, scale?.rightPan]);
  const open = game.phase === 'open' && !!scale;
  const side = (n: number): Side => place[n] || 'pool';
  const on = (s: Side) => relics.filter(n => side(n) === s);
  const left = on('left'), right = on('right');
  const canWeigh = open && !disabled && scale!.left > 0 && left.length > 0 && left.length === right.length;
  const syncPlace = (nextPlace: Record<number, Side>) => {
    setPlace(nextPlace);
    const nextLeft = relics.filter(n => nextPlace[n] === 'left');
    const nextRight = relics.filter(n => nextPlace[n] === 'right');
    send({ type: 'scale:place', left: nextLeft, right: nextRight });
  };
  const tap = (n: number) => {
    if (side(n) === 'pool') {
      setSel(cur => cur.includes(n) ? cur.filter(x => x !== n) : [...cur, n]);
    } else {
      const nextPlace = { ...place, [n]: 'pool' as Side };
      syncPlace(nextPlace);
    }
  };
  const move = (to: 'left' | 'right') => {
    const nextPlace = { ...place, ...Object.fromEntries(sel.map(n => [n, to])) };
    syncPlace(nextPlace);
    setSel([]);
  };
  // A wrong guess resets the scale on the server; clear the local draft so it never shows a stale plan.
  // Pans also clear after each completed weighing so the next plan starts from an empty scale.
  const stamp = `${scale?.attempts}:${scale?.history.length}`;
  const [seen, setSeen] = useState(stamp);
  if (seen !== stamp) { setSeen(stamp); setPlace({}); setSel([]); if (scale?.attempts !== Number(seen.split(':')[0])) setPick(null); }
  const hint = game.phase === 'finished' ? '' : scale && scale.left < 1 ? 'Timbangan habis. Baca hasil di bawah, lalu tunjuk relik yang palsu.' : !left.length && !right.length ? 'Pilih satu atau beberapa relik di meja, lalu tekan Taruh di kiri atau Taruh di kanan. Ketuk relik di piringan untuk mengembalikannya.' : left.length !== right.length ? `Kiri ${left.length}, kanan ${right.length}. Jumlahnya harus sama.` : `Siap menimbang ${left.length} lawan ${right.length}.`;
  const relicButton = (n: number) => <button key={n} type="button" className={`relic relic-${side(n)} ${sel.includes(n) ? 'picked' : ''}`} disabled={disabled || !open} aria-label={`Relik ${n + 1}, ${({ pool: 'di meja', left: 'di piringan kiri', right: 'di piringan kanan' })[side(n)]}`} aria-pressed={sel.includes(n)} onClick={() => tap(n)}><span aria-hidden="true">{symbols[n]}</span><small>{n + 1}</small></button>;
  return <section className="relic-scale">
    <p>Ada sembilan relik bernomor. Satu di antaranya palsu dan sedikit lebih ringan. Kalian hanya punya <strong>dua kali</strong> menimbang, lalu harus menunjuk yang palsu. Jika salah, relik palsunya diacak ulang dan timbangan dipulihkan.</p>
    {game.phase !== 'waiting' && scale && <>
      {game.phase !== 'finished' && <p role="status" aria-live="polite" className="relic-left"><span>Sisa timbangan: <strong>{scale.left} dari 2</strong></span>{scale.attempts > 0 && <span>Percobaan ke-{scale.attempts + 1}</span>}</p>}
      {game.phase !== 'finished' && <div className="relic-balance" aria-label="Timbangan">
        <div className="relic-pan"><h4>Piringan kiri</h4><div>{left.map(relicButton)}{!left.length && <em className="relic-empty">kosong</em>}</div></div>
        <div className="relic-pan"><h4>Piringan kanan</h4><div>{right.map(relicButton)}{!right.length && <em className="relic-empty">kosong</em>}</div></div>
      </div>}
      {game.phase === 'finished' && <p role="status" className="relic-win">Benar! Relik palsunya adalah relik {scale.fake + 1}. Brankas relik terbuka.</p>}
      {game.phase !== 'finished' && <><h4>Meja relik</h4>
      <div className="relic-table">{on('pool').map(relicButton)}{!on('pool').length && <em>semua relik sudah di piringan</em>}</div>
      <p className="relic-hint">{hint}</p>
      <div className="minigame-actions">
        <button type="button" disabled={disabled || !open || !sel.length} onClick={() => move('left')}>◀ Taruh di kiri{sel.length ? ` (${sel.length})` : ''}</button>
        <button type="button" disabled={disabled || !open || !sel.length} onClick={() => move('right')}>Taruh di kanan{sel.length ? ` (${sel.length})` : ''} ▶</button>
      </div>
      <div className="minigame-actions">
        <button className="relic-primary" disabled={!canWeigh} onClick={() => send({ type: 'scale:weigh', left, right })}>Timbang</button>
        <button type="button" disabled={disabled || !open || !Object.keys(place).length} onClick={() => syncPlace({})}>Kosongkan piringan</button>
      </div></>}
      <h4>Hasil timbangan</h4>
      {scale.history.length ? <ol className="relic-history">{scale.history.map((h, i) => <li key={i}><span>{h.left.map(n => n + 1).join(' + ')}</span> lawan <span>{h.right.map(n => n + 1).join(' + ')}</span> → <strong>{outcome[h.result]}</strong></li>)}</ol> : <p>Belum ada penimbangan.</p>}
      {open && <fieldset className="relic-guess"><legend>Tunjuk relik palsu (satu kali, tidak bisa dibatalkan)</legend>
        {scale.attempts > 0 && game.result === 'wrong' && <p role="alert" className="relic-wrong">Tebakan salah. Relik palsunya diacak ulang dan timbangan dipulihkan ({scale.attempts}x salah).</p>}
        <div>{relics.map(n => <label key={n}><input type="radio" name="fake" checked={pick === n} disabled={disabled} onChange={() => setPick(n)} /><span aria-hidden="true">{symbols[n]}</span> Relik {n + 1}</label>)}</div>
        <button disabled={disabled || pick === null} onClick={() => { if (pick !== null && confirm(`Yakin relik ${pick + 1} yang palsu?`)) send({ type: 'scale:pick', relic: pick }); }}>Tunjuk relik palsu</button>
      </fieldset>}
    </>}
  </section>;
}
