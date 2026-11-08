import type { Game } from '../server/minigames';
import { lockLength, lockTries, lockSymbols } from '../server/lockpick';

const marks = ['🔥', '💧', '🌿', '⚡', '🌙', '⭐'];
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
  return <section className="lockpick">
    <p>Tebak kode peti: <strong>{lockLength} simbol</strong> dari {lockSymbols} pilihan, simbol boleh berulang, <strong>{lockTries} percobaan</strong>. Setelah tiap tebakan, warna kotak memberi tahu hasilnya. Jika percobaan habis, kode diacak ulang. Susunan dibagikan ke semua pemain.</p>
    <ul className="lock-legend" aria-label="Arti warna"><li><i className="lock-tile g" />Benar & posisi tepat</li><li><i className="lock-tile y" />Ada, posisi salah</li><li><i className="lock-tile x" />Tidak ada</li></ul>
    {game.phase !== 'waiting' && lock && <>
      {game.phase === 'open' && <p role="status" className="lock-left">Sisa percobaan: <strong>{left}</strong>{lock.attempts > 0 && ` · kode sudah diacak ulang ${lock.attempts}x`}</p>}
      {game.result === 'wrong' && game.phase === 'open' && <p role="alert" className="lock-wrong">✕ Percobaan habis. Kode peti diacak ulang, riwayat dihapus.</p>}
      <div className="lock-board" role="grid" aria-label="Papan tebakan">{Array.from({ length: lockTries }, (_, r) => {
        const h = history[r];
        const isDraft = open && r === history.length;
        return <div key={r} role="row" className={`lock-row${isDraft ? ' active' : ''}`}>{Array.from({ length: lockLength }, (_, c) => {
          const n = h ? h.guess[c] : isDraft ? draft[c] : undefined;
          const m = h?.marks[c];
          return <button key={c} role="gridcell" type="button" tabIndex={isDraft && n !== undefined ? 0 : -1} className={`lock-tile${m ? ' ' + m : ''}${n !== undefined && !m ? ' typed' : ''}`}
            aria-label={h ? `Tebakan ${r + 1}, kotak ${c + 1}: simbol ${(n ?? 0) + 1}, ${markName[m!]}` : isDraft ? `Kotak ${c + 1}${n !== undefined ? `, simbol ${n + 1}, lepas` : ', kosong'}` : `Baris ${r + 1} kosong`}
            disabled={!isDraft || disabled || n === undefined} onClick={() => sync(draft.filter((_, j) => j !== c))}>{n !== undefined ? marks[n] : ''}</button>;
        })}</div>;
      })}</div>
      {open && <>
        <div className="lock-palette" aria-label="Pilih simbol">{marks.map((m, n) => <button key={n} type="button" className={`lock-key${best[n] ? ' ' + best[n] : ''}`} aria-label={`Simbol ${n + 1}${best[n] ? ', ' + markName[best[n]] : ''}`} disabled={disabled || draft.length >= lockLength} onClick={() => sync([...draft, n])}>{m}</button>)}</div>
        <div className="minigame-actions">
          <button type="button" disabled={disabled || !draft.length} onClick={() => sync(draft.slice(0, -1))}>Hapus ⌫</button>
          <button type="button" className="lock-submit" disabled={disabled || draft.length !== lockLength} onClick={() => send({ type: 'lock:try' })}>Coba kode</button>
        </div>
      </>}
      {game.phase === 'finished' && <p role="status" className="lock-win">✓ Klik! Peti terbuka. Kodenya: {lock.code?.map(n => marks[n]).join(' ')}</p>}
    </>}
  </section>;
}
