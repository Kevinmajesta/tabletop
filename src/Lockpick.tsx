import { Delete, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import type { Game } from '../server/minigames';
import { lockLength, lockTries, lockSymbols } from '../server/lockpick';
import GameRules from './GameRules';
import './lockpick.css';

const marks = ['🔥', '💧', '🌿', '⚡', '🌙', '⭐'];
const markNames = ['Api', 'Air', 'Daun', 'Petir', 'Bulan', 'Bintang'];
const markName = { g: 'benar, posisi tepat', y: 'ada, posisi salah', x: 'tidak ada' } as const;
const rank = { x: 1, y: 2, g: 3 } as const;

export default function Lockpick({ game, disabled, send }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const lock = game.lock;
  const open = game.phase === 'open' && !!lock;
  const draft = lock?.draft ?? [];
  const sync = (next: number[]) => send({ type: 'lock:draft', draft: next });
  const history = lock?.history ?? [];
  const left = lockTries - history.length;
  // Seperti keyboard Wordle: status terbaik tiap simbol dari semua tebakan di ronde ini.
  const best: Record<number, 'g' | 'y' | 'x'> = {};
  history.forEach(h => h.guess.forEach((n, i) => { const m = h.marks[i]; if (!best[n] || rank[m] > rank[best[n]]) best[n] = m; }));

  return <section className="mg-skin lockpick-skin" data-phase={game.phase}>
    <GameRules phase={game.phase}>
      <p>Tebak kode gembok peti: <strong>{lockLength} simbol</strong> dari {lockSymbols} pilihan. Simbol boleh berulang, dan kalian punya <strong>{lockTries} percobaan</strong>.</p>
      <p>Setelah tiap tebakan, warna lubang menunjukkan hasilnya. Hijau berarti simbol benar di posisi tepat. Kuning berarti simbol ada di kode tapi posisinya salah. Abu berarti simbol tidak ada.</p>
      <p>Kalau percobaan habis, kode diacak ulang. Susunan tebakan dibagikan ke semua pemain, jadi berunding dulu sebelum mencoba.</p>
    </GameRules>

    {game.phase !== 'waiting' && lock && <div className="lp-layout">
      <div className="lp-chest">
        <div className="lp-lock-head" aria-hidden="true">{game.phase === 'finished' ? <LockKeyholeOpen size={28} /> : <LockKeyhole size={28} />}</div>
        <div className="lp-board" role="grid" aria-label="Papan tebakan">{Array.from({ length: lockTries }, (_, r) => {
          const h = history[r];
          const isDraft = open && r === history.length;
          return <div key={r} role="row" className={`lp-row${isDraft ? ' active' : ''}${h ? ' done' : ''}`}>
            <span className="lp-row-num" aria-hidden="true">{r + 1}</span>
            {Array.from({ length: lockLength }, (_, c) => {
              const n = h ? h.guess[c] : isDraft ? draft[c] : undefined;
              const m = h?.marks[c];
              return <button key={c} role="gridcell" type="button" tabIndex={isDraft && n !== undefined ? 0 : -1} className={`lp-socket${m ? ' ' + m : ''}${n !== undefined && !m ? ' typed' : ''}`}
                style={{ ['--i' as string]: c }}
                aria-label={h ? `Tebakan ${r + 1}, lubang ${c + 1}: ${markNames[n ?? 0]}, ${markName[m!]}` : isDraft ? `Lubang ${c + 1}${n !== undefined ? `, ${markNames[n]}, ketuk untuk melepas` : ', kosong'}` : `Baris ${r + 1} kosong`}
                disabled={!isDraft || disabled || n === undefined} onClick={() => sync(draft.filter((_, j) => j !== c))}>{n !== undefined ? marks[n] : ''}</button>;
            })}
          </div>;
        })}</div>
      </div>

      <aside className="lp-side">
        {game.phase === 'open' && <ul className="mg-stats">
          <li><span>Sisa percobaan</span><strong>{left}<small>/{lockTries}</small></strong></li>
          {lock.attempts > 0 && <li><span>Kode diacak</span><strong>{lock.attempts}×</strong></li>}
        </ul>}
        {game.result === 'wrong' && game.phase === 'open' && <p role="alert" className="mg-alert bad">Percobaan habis. Kode gembok diacak ulang dan riwayat dihapus.</p>}
        {game.phase === 'finished' && <p role="status" className="mg-alert good">Klik! Peti terbuka. Kodenya {lock.code?.map(n => marks[n]).join(' ')}.</p>}

        <ul className="lp-legend" aria-label="Arti warna">
          <li><i className="g" />Benar, posisi tepat</li>
          <li><i className="y" />Ada, posisi salah</li>
          <li><i className="x" />Tidak ada</li>
        </ul>

        {open && <>
          <div className="lp-keys" aria-label="Pilih simbol">{marks.map((m, n) => <button key={n} type="button" className={`lp-key${best[n] ? ' ' + best[n] : ''}`} aria-label={`${markNames[n]}${best[n] ? ', ' + markName[best[n]] : ''}`} disabled={disabled || draft.length >= lockLength} onClick={() => sync([...draft, n])}><span>{m}</span><small>{markNames[n]}</small></button>)}</div>
          <div className="lp-actions">
            <button type="button" className="mg-btn" disabled={disabled || !draft.length} onClick={() => sync(draft.slice(0, -1))}><Delete size={16} aria-hidden="true" /> Hapus</button>
            <button type="button" className="mg-btn primary" disabled={disabled || draft.length !== lockLength} onClick={() => send({ type: 'lock:try' })}>Putar gembok</button>
          </div>
        </>}
      </aside>
    </div>}
  </section>;
}
