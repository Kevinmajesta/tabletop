import { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { Game } from '../server/minigames';
import GameRules from './GameRules';
import './quickmath.css';

const TOTAL = 10;

export default function QuickMath({ game, disabled, send, playerId, dm, name }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; dm: boolean; name: (id: string) => string }) {
  const [response, setResponse] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const canAnswer = game.phase === 'open' && (dm || game.players.includes(playerId));
  useEffect(() => { setResponse(''); if (canAnswer) input.current?.focus(); }, [game.round, game.turn, game.phase, canAnswer]);
  const valid = /^\d+$/.test(response.trim());
  const board = [...game.players].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0));
  const top = game.scores[board[0]] || 0;
  const lastWinner = game.turn > 0 && game.players.includes(game.result) ? game.result : '';
  const current = Math.min(game.turn + 1, TOTAL);

  return <section className="mg-skin quickmath-skin" data-phase={game.phase}>
    <GameRules phase={game.phase}>
      <p>Sepuluh soal acak dari server. Jawaban benar <strong>pertama</strong> untuk tiap soal mendapat satu poin.</p>
      <p>Jawaban salah boleh dicoba lagi, jadi kecepatan dan ketelitian sama pentingnya.</p>
    </GameRules>

    {game.phase !== 'waiting' && <div className="qm-layout">
      <div className="qm-stage">
        <div className="qm-progress" aria-label={`Soal ${current} dari ${TOTAL}`}>
          {Array.from({ length: TOTAL }, (_, i) => <i key={i} data-state={i < game.turn ? 'done' : i === game.turn && game.phase === 'open' ? 'current' : 'later'} />)}
        </div>
        <span className="mg-kicker">{game.phase === 'finished' ? 'Selesai' : `Soal ${current} dari ${TOTAL}`}</span>
        {game.phase === 'open' && <h3 className="qm-question" aria-live="polite" key={game.turn}>{game.question}<span> = ?</span></h3>}
        {game.phase === 'finished' && <h3 className="qm-question done">{game.question}<span> = {game.answer}</span></h3>}
        {lastWinner && game.phase === 'open' && <p className="qm-flash" key={`w${game.turn}`}><b>{lastWinner === playerId ? 'Kamu' : name(lastWinner)}</b> menjawab soal sebelumnya paling cepat.</p>}
        {canAnswer && <form className="qm-answer" onSubmit={e => { e.preventDefault(); if (valid) send({ type: 'answer', round: game.round, question: game.turn, answer: Number(response.trim()) }); }}>
          <label className="qm-label" htmlFor={`qm-${game.tokenId}`}>Jawaban</label>
          <input ref={input} id={`qm-${game.tokenId}`} type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={4} autoComplete="off" value={response} disabled={disabled} onChange={e => setResponse(e.target.value)} placeholder="?" />
          <button className="mg-btn primary" disabled={disabled || !valid}>Kirim</button>
        </form>}
        {game.phase === 'open' && !canAnswer && <p className="qm-watch">Kamu menonton. Hanya peserta yang bisa menjawab.</p>}
      </div>

      <aside className="qm-board">
        <span className="mg-kicker"><Trophy size={13} aria-hidden="true" /> Papan skor</span>
        <ol>{board.map((id, i) => {
          const score = game.scores[id] || 0;
          return <li key={id} className={`${id === playerId ? 'me' : ''}${id === lastWinner ? ' fresh' : ''}${game.phase === 'finished' && score === top && top > 0 ? ' champion' : ''}`}>
            <span className="qm-rank">{i + 1}</span>
            <span className="qm-name">{id === playerId ? `${name(id)} (kamu)` : name(id)}</span>
            <strong>{score}</strong>
          </li>;
        })}</ol>
      </aside>
    </div>}
  </section>;
}
