import { useState } from 'react';
import type { Game } from '../server/minigames';

export default function TornJournal({ game, disabled, send }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const journal = game.journal;
  const open = game.phase === 'open' && !!journal;
  const [drafts, setDrafts] = useState<string[]>([]);
  const [asked, setAsked] = useState<number | null>(null);
  const questions = journal?.questions || [];
  const submit = (i: number) => { setAsked(i); send({ type: 'journal:answer', index: i, text: drafts[i] || '' }); };
  const solvedCount = journal?.solved.filter(Boolean).length || 0;
  return <section className="torn-journal">
    {game.phase !== 'finished' && <details className="journal-intro" open><summary>Cara bermain</summary>
      <p>Sebuah jurnal perjalanan sepanjang <strong>10 halaman</strong> ditemukan. Bacalah bersama, lalu jawab kelima pertanyaan di bawah. Jawabannya tersebar di dalam jurnal, jadi baca teliti dan jangan terburu-buru.</p>
      <ul>
        <li>Semua pemain melihat jawaban yang sudah benar secara langsung.</li>
        <li>Huruf besar atau kecil dan tanda baca tidak berpengaruh pada jawaban.</li>
      </ul>
    </details>}
    <aside className="journal-book"><strong>JURNAL SEKAR ARUNIKA</strong><a href="/manual/jurnal-terkoyak.pdf" target="_blank" rel="noreferrer">Buka jurnal PDF (10 halaman)</a><small>Baca di tab baru, lalu kembali ke sini untuk menjawab.</small></aside>
    {game.phase !== 'waiting' && journal && <>
      {game.phase === 'open' && <p className="journal-hint">Terjawab {solvedCount}/{questions.length} · salah sejauh ini: {journal.attempts}x</p>}
      <ol className="journal-questions">{questions.map((q, i) => {
        const done = journal.solved[i];
        return <li key={i} className={`journal-question ${done ? 'solved' : ''}`}>
          <p>{q}</p>
          {done
            ? <p className="journal-ok">✓ Terjawab{journal.solution ? `: ${journal.solution[i]}` : ''}</p>
            : <form onSubmit={e => { e.preventDefault(); submit(i); }}>
              <input aria-label={`Jawaban pertanyaan ${i + 1}`} value={drafts[i] || ''} maxLength={60} disabled={disabled || !open} onChange={e => setDrafts(d => { const next = [...d]; next[i] = e.target.value; return next; })} />
              <button type="submit" className="journal-primary" disabled={disabled || !open || !(drafts[i] || '').trim()}>Jawab</button>
            </form>}
          {asked === i && game.result === 'wrong' && !done && open && <p role="alert" className="journal-wrong">✕ Jawaban belum tepat. Baca ulang halaman yang relevan.</p>}
        </li>;
      })}</ol>
      {game.phase === 'finished' && <p role="status" className="journal-win">{journal.epilogue}</p>}
    </>}
  </section>;
}
