import { useState, useEffect } from 'react';
import type { Game } from '../server/minigames';
import GameRules from './GameRules';
import './relicscale.css';

const relics = Array.from({ length: 9 }, (_, i) => i);
const symbols = ['◆', '●', '▲', '■', '✦', '⬢', '✚', '⬟', '❖'];
type Side = 'pool' | 'left' | 'right';
const outcome = { 'left-light': 'Kiri lebih ringan', 'right-light': 'Kanan lebih ringan', balanced: 'Seimbang' } as const;

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
  const hint = game.phase === 'finished' ? '' : scale && scale.left < 1 ? 'Timbangan habis. Baca hasilnya, lalu tunjuk relik yang palsu.' : !left.length && !right.length ? 'Pilih relik di meja, lalu taruh di piringan kiri atau kanan. Ketuk relik di piringan untuk mengembalikannya.' : left.length !== right.length ? `Kiri ${left.length}, kanan ${right.length}. Jumlahnya harus sama.` : `Siap menimbang ${left.length} lawan ${right.length}.`;
  // Neraca miring sesuai hasil terakhir selama piringan masih kosong; begitu relik ditaruh lagi, neraca kembali datar.
  const last = scale?.history.at(-1)?.result;
  const tilt = !left.length && !right.length && last ? last : 'balanced';
  const relicButton = (n: number) => <button key={n} type="button" className={`rs-relic${sel.includes(n) ? ' picked' : ''}`} disabled={disabled || !open} aria-label={`Relik ${n + 1}, ${({ pool: 'di meja', left: 'di piringan kiri', right: 'di piringan kanan' })[side(n)]}`} aria-pressed={sel.includes(n)} onClick={() => tap(n)}><span aria-hidden="true">{symbols[n]}</span><small>{n + 1}</small></button>;

  return <section className="mg-skin relicscale-skin" data-phase={game.phase}>
    <GameRules phase={game.phase}>
      <p>Ada sembilan relik bernomor. Satu di antaranya palsu dan sedikit lebih ringan.</p>
      <p>Kalian hanya punya <strong>dua kali</strong> menimbang, lalu harus menunjuk relik yang palsu. Jumlah relik di kedua piringan harus sama.</p>
      <p>Kalau tebakan salah, relik palsunya diacak ulang dan timbangan dipulihkan.</p>
    </GameRules>

    {game.phase !== 'waiting' && scale && <div className="rs-layout">
      <div className="rs-main">
        {game.phase === 'finished' ? <p role="status" className="mg-alert good">Benar! Relik palsunya adalah relik {scale.fake + 1}. Brankas relik terbuka.</p> : <>
          <div className="rs-balance" data-tilt={tilt} aria-label={`Timbangan${tilt !== 'balanced' ? ', ' + outcome[tilt] : ''}`}>
            <svg viewBox="0 0 400 150" aria-hidden="true" className="rs-stand">
              <path d="M200 40 L200 132 M172 140 L228 140 L220 132 L180 132 Z" />
              <circle cx="200" cy="34" r="9" />
            </svg>
            <div className="rs-beam" aria-hidden="true"><i /><i /></div>
            <div className="rs-pan left"><span className="rs-pan-label">Kiri</span><div className="rs-dish">{left.map(relicButton)}{!left.length && <em>kosong</em>}</div></div>
            <div className="rs-pan right"><span className="rs-pan-label">Kanan</span><div className="rs-dish">{right.map(relicButton)}{!right.length && <em>kosong</em>}</div></div>
          </div>

          <div className="rs-table">
            <span className="mg-kicker">Meja relik</span>
            <div className="rs-pool">{on('pool').map(relicButton)}{!on('pool').length && <em>Semua relik sudah di piringan.</em>}</div>
            <p className="rs-hint">{hint}</p>
            <div className="rs-actions">
              <button type="button" className="mg-btn" disabled={disabled || !open || !sel.length} onClick={() => move('left')}>Taruh di kiri{sel.length ? ` (${sel.length})` : ''}</button>
              <button type="button" className="mg-btn" disabled={disabled || !open || !sel.length} onClick={() => move('right')}>Taruh di kanan{sel.length ? ` (${sel.length})` : ''}</button>
              <button type="button" className="mg-btn" disabled={disabled || !open || !Object.keys(place).length} onClick={() => syncPlace({})}>Kosongkan</button>
              <button type="button" className="mg-btn primary" disabled={!canWeigh} onClick={() => send({ type: 'scale:weigh', left, right })}>Timbang</button>
            </div>
          </div>
        </>}
      </div>

      <aside className="rs-side">
        {game.phase !== 'finished' && <ul className="mg-stats">
          <li><span>Sisa timbangan</span><strong>{scale.left}<small>/2</small></strong></li>
          {scale.attempts > 0 && <li><span>Percobaan</span><strong>ke-{scale.attempts + 1}</strong></li>}
        </ul>}

        <div className="rs-ledger">
          <span className="mg-kicker">Catatan timbangan</span>
          {scale.history.length ? <ol>{scale.history.map((h, i) => <li key={i}>
            <span className="rs-ledger-pans"><b>{h.left.map(n => n + 1).join(' · ')}</b><i>lawan</i><b>{h.right.map(n => n + 1).join(' · ')}</b></span>
            <strong data-result={h.result}>{outcome[h.result]}</strong>
          </li>)}</ol> : <p className="rs-empty">Belum ada penimbangan.</p>}
        </div>

        {open && <div className="rs-guess">
          <span className="mg-kicker">Tunjuk relik palsu</span>
          {scale.attempts > 0 && game.result === 'wrong' && <p role="alert" className="mg-alert bad">Tebakan salah. Relik palsu diacak ulang dan timbangan dipulihkan.</p>}
          <div className="rs-guess-grid" role="radiogroup" aria-label="Pilih relik palsu">{relics.map(n => <button key={n} type="button" role="radio" aria-checked={pick === n} className="rs-chip" disabled={disabled} onClick={() => setPick(n)}><span aria-hidden="true">{symbols[n]}</span>{n + 1}</button>)}</div>
          <button type="button" className="mg-btn primary" disabled={disabled || pick === null} onClick={() => { if (pick !== null && confirm(`Yakin relik ${pick + 1} yang palsu?`)) send({ type: 'scale:pick', relic: pick }); }}>{pick === null ? 'Pilih satu relik' : `Tunjuk relik ${pick + 1}`}</button>
          <p className="rs-hint">Hanya sekali dan tidak bisa dibatalkan.</p>
        </div>}
      </aside>
    </div>}
  </section>;
}
