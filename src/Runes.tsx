import { useState } from 'react';
import { useSyncedDraft } from './useSyncedDraft';
import { Delete, DoorClosed, DoorOpen, Eraser, Feather, Space } from 'lucide-react';
import type { Game } from '../server/minigames';
import type { RuneView } from '../server/runes';
import { runeExamples, runeKeys, runeTasks } from '../server/runes-data';
import './alchemy.css';
import './potion.css';
import './runes.css';

export default function Runes({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const t = game.runes as RuneView | undefined;
  const [notes, setNotes] = useState('');
  // Salinan lokal ukiran: ketukan rune beruntun langsung terlihat dan tidak saling menimpa sebelum server menjawab.
  const [draft, setDraft] = useSyncedDraft(t?.draft ?? '', v => v);
  if (!t) return <section className="mg-skin alchemy-skin runes-skin" data-phase={game.phase} />;

  const done = t.task >= runeTasks.length;
  const canPlay = game.phase === 'open' && !done && !disabled;
  const set = (text: string) => { if (canPlay) { setDraft(text); send({ type: 'runes:draft', text }); } };
  const last = t.log.at(-1);
  const who = (id: string) => (id === playerId ? 'Kamu' : name(id));

  return <section className="mg-skin alchemy-skin runes-skin" data-phase={game.phase}>
    <div className="rn-doors" aria-label="Empat pillar">
      {runeTasks.map((task, i) => {
        const open = i < t.task, current = i === t.task && !done;
        return <div key={i} className={`rn-door${open ? ' open' : ''}${current ? ' current' : ''}`}>
          {open ? <DoorOpen size={18} /> : <DoorClosed size={18} />}
          <small>Pillar {i + 1}</small>
          {open ? <span className="rn-glyph">{t.solved[i]}</span> : <span className="rn-task">{current ? task : '—'}</span>}
        </div>;
      })}
    </div>

    {!done && last && !last.ok && last.task === t.task && <div className="pt-fail rn-fail" role="status" key={t.misses}>
      Rune <span className="rn-glyph">{last.text}</span> meredup. Pillar tidak bergeming.
    </div>}

    <div className="rn-layout">
      <article className="rn-tablet" aria-label="Prasasti contoh">
        <header><Feather size={15} /><span>Prasasti dan catatan penjelajah</span></header>
        <ol>
          {runeExamples.map((ex, i) => (
            <li key={i}><span className="rn-glyph">{ex.runes}</span><em>{ex.meaning}</em></li>
          ))}
        </ol>
      </article>

      <div className="rn-work">
        {!done && <div className="rn-ask">
          <small>Ukir untuk Pillar {t.task + 1}</small>
          <strong>“{runeTasks[t.task]}”</strong>
        </div>}
        <div className={`rn-slab${draft ? '' : ' empty'}`} aria-live="polite">
          {draft ? <span className="rn-glyph">{draft}</span> : <span>Ukiran kosong</span>}
        </div>
        <div className="rn-keys" aria-label="Papan rune">
          {runeKeys.map(k => <button key={k} type="button" className="rn-key" disabled={!canPlay || draft.length >= 80} onClick={() => set(draft + k)}>{k}</button>)}
        </div>
        <div className="rn-edit">
          <button type="button" className="al-ghost" disabled={!canPlay || !draft || draft.endsWith(' ')} onClick={() => set(draft + ' ')}><Space size={14} />Spasi</button>
          <button type="button" className="al-ghost" disabled={!canPlay || !draft} onClick={() => set([...draft].slice(0, -1).join(''))}><Delete size={14} />Hapus</button>
          <button type="button" className="al-ghost" disabled={!canPlay || !draft} onClick={() => set('')}><Eraser size={14} />Kosongkan</button>
          <button type="button" className="al-primary" disabled={!canPlay || !draft.trim()} onClick={() => send({ type: 'runes:submit' })}>Masukkan</button>
        </div>
        {dm && t.answers && !done && <div className="al-dm-answer rn-dm-answer">Jawaban (hanya GM): <span className="rn-glyph">{t.answers[t.task]}</span></div>}
        <label className="rn-notes">
          <span>Catatan pribadi (hanya kamu yang melihat)</span>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tulis dugaan kalian di sini, misalnya rune mana yang mungkin berarti apa." />
        </label>
      </div>
    </div>

    {!!t.log.length && <div className="al-log" aria-label="Riwayat ukiran">
      {t.log.slice().reverse().slice(0, 6).map((a, i) => (
        <div key={i} className={a.ok ? 'ok' : 'bad'}><span>{who(a.by)}</span> mengukir <b className="rn-glyph">{a.text}</b> di Pillar {a.task + 1}<em>{a.ok ? 'menyala' : 'salah'}</em></div>
      ))}
    </div>}

  </section>;
}
