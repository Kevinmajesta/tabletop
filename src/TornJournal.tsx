import { useState, useEffect } from 'react';
import type { Game } from '../server/minigames';

export default function TornJournal({ game, disabled, send }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const journal = game.journal;
  const open = game.phase === 'open' && !!journal;
  const [order, setOrder] = useState<string[]>(journal?.order || []);
  const [reading, setReading] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState('');
  // A wrong submission keeps the player's draft so they can tweak it; the server only bumps the miss counter.
  const pages = journal?.pages || [];
  const byId = (id: string) => pages.find(p => p.id === id)!;
  const loose = pages.filter(p => !order.includes(p.id));
  const toggleRead = (id: string) => setReading(cur => cur === id ? null : id);
  useEffect(() => {
    if (journal?.order) {
      setOrder(journal.order);
    }
  }, [journal?.order]);
  const updateOrder = (next: string[]) => {
    setOrder(next);
    send({ type: 'journal:order', order: next });
  };
  const place = (id: string) => updateOrder([...order, id]);
  const unplace = (id: string) => updateOrder(order.filter(x => x !== id));
  const shift = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    updateOrder(next);
  };
  const ready = open && !disabled && order.length === pages.length;
  const page = (id: string, actions: React.ReactNode, slot?: number) => {
    const p = byId(id);
    return <li key={id} className={`journal-page ${reading === id ? 'reading' : ''}`}>
      <div className="journal-row">
        <button type="button" className="journal-tab" aria-expanded={reading === id} onClick={() => toggleRead(id)}>
          <b>{slot !== undefined ? `${slot + 1}. ` : ''}Halaman {id}</b>
          <span aria-hidden="true">{reading === id ? '▾ tutup' : '▸ baca'}</span>
        </button>
        <div className="journal-actions">{actions}</div>
      </div>
      {reading === id && <div className="journal-body"><p>{p.text}</p><p className="journal-foot">{p.foot || '— halaman ini tidak punya kata sambung —'}</p></div>}
    </li>;
  };
  return <section className="torn-journal">
    {game.phase !== 'finished' && <details className="journal-intro" open><summary>Cara menyusun</summary>
      <p>Sepuluh halaman jurnal seorang penjelajah terlepas dan tercampur. <strong>Huruf A–J hanyalah penanda, bukan nomor halaman.</strong> Baca tiap halaman, lalu susun urutan aslinya.</p>
      <ul>
        <li><em>Kata sambung</em> di dasar halaman adalah kata pertama halaman berikutnya.</li>
        <li>Bila tintanya luntur (▒▒▒▒▒), simpulkan halaman berikutnya dari isi cerita: perjalanan hanya bergerak maju.</li>
      </ul>
    </details>}
    {game.phase !== 'waiting' && journal && <>
      {journal.attempts > 0 && game.phase === 'open' && (submitted === order.join(',') ? <p role="alert" className="journal-wrong">✕ Urutan ini belum tepat ({journal.attempts}x salah). Periksa lagi kata sambung dan isi tiap halaman.</p> : <p className="journal-hint">Percobaan salah sejauh ini: {journal.attempts}x.</p>)}
      {game.phase === 'open' && <div className="journal-bar" aria-label="Urutan yang sedang disusun">
        <div><strong>Urutanmu {order.length}/{pages.length}</strong><small>nomor·huruf halaman · ketuk untuk melepas</small>
          <span className="journal-chips">{order.length ? order.map((id, i) => <button type="button" key={id} className="journal-chip" title={`Lepas halaman ${id}`} disabled={disabled} onClick={() => unplace(id)}>{i + 1}·{id}</button>) : <em>kosong · ketuk "Taruh" pada sebuah halaman</em>}</span></div>
        <button className="journal-primary" disabled={!ready} onClick={() => { setSubmitted(order.join(',')); send({ type: 'journal:submit', order }); }} title={ready ? '' : 'Susun kesepuluh halaman dulu'}>{ready ? 'Periksa urutan' : `Periksa (${order.length}/${pages.length})`}</button>
      </div>}
      {game.phase !== 'finished' && <>
        <h4>Halaman belum disusun ({loose.length})</h4>
        <ul className="journal-list">{loose.map(p => page(p.id, <button type="button" disabled={disabled || !open} onClick={() => place(p.id)}>Taruh →</button>))}{!loose.length && <li className="journal-empty">Semua halaman sudah di urutan.</li>}</ul>
        <h4>Urutanmu ({order.length}/{pages.length}) · paling atas = halaman pertama</h4>
        <ol className="journal-list journal-order">{order.map((id, i) => page(id, <>
          <button type="button" aria-label={`Naikkan halaman ${id}`} disabled={disabled || !open || i === 0} onClick={() => shift(i, -1)}>▲</button>
          <button type="button" aria-label={`Turunkan halaman ${id}`} disabled={disabled || !open || i === order.length - 1} onClick={() => shift(i, 1)}>▼</button>
          <button type="button" disabled={disabled || !open} onClick={() => unplace(id)}>Lepas</button>
        </>, i))}{!order.length && <li className="journal-empty">Belum ada halaman. Mulai dari halaman yang menurutmu paling awal.</li>}</ol>
        <div className="minigame-actions">
          <button type="button" disabled={disabled || !open || !order.length} onClick={() => updateOrder([])}>Kosongkan urutan</button>
        </div>
      </>}
      {game.phase === 'finished' && <p role="status" className="journal-win">Urutan benar! Kalimat terakhir jurnal terbaca jelas dan sampulnya terbuka.</p>}
      {game.phase === 'finished' && <ol className="journal-list journal-order">{journal.solution!.map((id, i) => page(id, null, i))}</ol>}
    </>}
  </section>;
}
