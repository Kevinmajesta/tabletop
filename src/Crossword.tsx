import { useEffect, useRef, useState } from 'react';
import type { Game } from '../server/minigames';
import { crosswordEdit } from './crossword-input.mjs';

export default function Crossword({ game, disabled, send }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const entries = game.crosswordEntries || [];
  const [selected, setSelected] = useState(entries[0]?.id || '');
  const [draft, setDraft] = useState<string[]>(game.crosswordLetters || []);
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const entry = entries.find(item => item.id === selected) || entries[0];
  const solved = new Set(entries.filter(item => game.crosswordSolved?.includes(item.id)).flatMap(item => item.cells));
  useEffect(() => { setDraft(current => current.map((letter, i) => game.crosswordLetters?.[i] || letter)); }, [game.crosswordLetters]);
  const focus = (cell: number) => { inputs.current.get(cell)?.focus(); inputs.current.get(cell)?.select(); };
  function select(id: string) {
    setSelected(id);
    const word = entries.find(item => item.id === id);
    if (word) requestAnimationFrame(() => focus(word.cells.find(cell => !solved.has(cell)) ?? word.cells[0]));
  }
  function submit(letters = draft) {
    if (entry && entry.cells.every(cell => letters[cell])) send({ type: 'crossword:answer', id: entry.id, answer: entry.cells.map(cell => letters[cell]).join('') });
  }
  return <section className="tts-play">
    <p>Klik petunjuk, lalu ketik di kotak. Enter untuk periksa; kata lengkap diperiksa otomatis. Klik kotak perpotongan dua kali untuk mengganti arah.</p>
    <div className="tts-layout">
      <div className="tts-board-panel">
        <div className="tts-current" aria-live="polite">{entry?.id} · {entry?.clue}</div>
        <div className="crossword-grid tts-pilihan-grid" style={{ gridTemplateColumns: `repeat(${game.crosswordColumns || 5}, 1fr)` }} aria-label="Papan teka-teki silang">
          {draft.map((_, cell) => {
            const words = entries.filter(item => item.cells.includes(cell));
            const number = entries.find(item => item.cells[0] === cell)?.id.slice(0, -1);
            return <span key={cell} className={!words.length ? 'blocked' : `${entry?.cells.includes(cell) ? 'word-active' : ''} ${solved.has(cell) ? 'word-solved' : ''}`}>
              {number && <small>{number}</small>}
              {!!words.length && <input ref={node => { if (node) inputs.current.set(cell, node); else inputs.current.delete(cell); }} aria-label={`Baris ${Math.floor(cell / (game.crosswordColumns || 5)) + 1}, kolom ${cell % (game.crosswordColumns || 5) + 1}`} value={game.crosswordLetters?.[cell] || draft[cell] || ''} readOnly={solved.has(cell)} disabled={disabled || game.phase !== 'open'} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={1}
                onFocus={event => { if (!entry?.cells.includes(cell)) setSelected(words[0].id); event.currentTarget.select(); }}
                onDoubleClick={() => setSelected(words.find(word => word.id !== entry?.id)?.id || words[0].id)}
                onChange={event => {
                  if (!entry) return;
                  const result = crosswordEdit(draft, entry, cell, event.target.value);
                  setDraft(result.letters);
                  if (result.letters[cell]) focus(result.next);
                  if (result.answer) submit(result.letters);
                }}
                onKeyDown={event => {
                  if (!entry) return;
                  const index = entry.cells.indexOf(cell);
                  if (event.key === 'Enter') { event.preventDefault(); submit(); }
                  if (event.key === 'Backspace' && !draft[cell]) { event.preventDefault(); focus(entry.cells[Math.max(0, index - 1)]); }
                  const offset = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -(game.crosswordColumns || 5), ArrowDown: game.crosswordColumns || 5 } as Record<string, number>)[event.key];
                  if (offset) { event.preventDefault(); focus(cell + offset); }
                }} />}
            </span>;
          })}
        </div>
        <button disabled={disabled || game.phase !== 'open' || !entry || game.crosswordSolved?.includes(entry.id) || !entry.cells.every(cell => draft[cell])} onClick={() => submit()}>Periksa kata</button>
        <p>{game.crosswordSolved?.length || 0} / {entries.length} kata selesai</p>
      </div>
      <div className="tts-clues">{[['M', 'Mendatar'], ['T', 'Menurun']].map(([suffix, title]) => <section key={suffix}><h3>{title}</h3>{entries.filter(item => item.id.endsWith(suffix)).map(item => <button key={item.id} className={item.id === entry?.id ? 'selected' : ''} onClick={() => select(item.id)}><b>{item.id.slice(0, -1)}</b><span>{item.clue} <small>({item.cells.length}) {game.crosswordSolved?.includes(item.id) ? '✓' : ''}</small></span></button>)}</section>)}<a href="https://www.tekatekisilang.com/tts-pilihan-1" target="_blank" rel="noreferrer">Sumber: TTS Pilihan #1 · d-dy</a></div>
    </div>
    {game.phase === 'finished' && <p role="status">Semua jawaban benar. Teka-teki selesai!</p>}
  </section>;
}
