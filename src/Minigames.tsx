import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { gameCatalog, type Game } from '../server/minigames';
import './minigames.css';

export const gameNames = Object.fromEntries(Object.entries(gameCatalog).map(([kind, entry]) => [kind, entry.name]));
const choices: Record<string, string> = { rock: 'Batu', paper: 'Kertas', scissors: 'Gunting' };
export default function Minigames({ games, socket, dm, playerId, members, connected, openToken, onClose, onOpen }: { games: Game[]; socket: Socket | null; dm: boolean; playerId: string; members: { id: string; name: string; online: boolean; dm: boolean }[]; connected: boolean; openToken: string | null; onClose: () => void; onOpen: (id: string) => void }) {
  const [participants, setParticipants] = useState<string[]>([]);
  const [response, setResponse] = useState('');
  const seenDeclarations = useRef(new Map<string, number>());
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const game = games.find(game => game.tokenId === openToken);
  useEffect(() => {
    if (!connected) { seenDeclarations.current.clear(); return; }
    const next = games.find(item => item.declaration && item.declaration !== seenDeclarations.current.get(item.tokenId));
    for (const item of games) if (item.declaration) seenDeclarations.current.set(item.tokenId, item.declaration);
    if (next) onOpen(next.tokenId);
  }, [games, connected, dm, playerId, onOpen]);
  useEffect(() => {
    setError(''); setParticipants([]);
    if (!game) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.focus(); };
  }, [game?.tokenId]);
  useEffect(() => { setResponse(''); setError(''); }, [game?.tokenId, game?.round, game?.phase, game?.turn]);
  function send(action: Record<string, unknown>) {
    if (!socket || !connected || busy) return;
    setBusy(true); setError('');
    socket.timeout(5000).emit('minigame:action', { tokenId: game?.tokenId, ...action }, (timeout: Error | null, result?: { error?: string }) => {
      setBusy(false); setError(timeout ? 'Koneksi terputus. Periksa status ronde sebelum mencoba lagi.' : result?.error || '');
    });
  }
  function remove() {
    if (!game || !socket || !connected || busy || !confirm(`Hapus token ${gameNames[game.kind]}?`)) return;
    socket.emit('token:remove', game.tokenId);
    onClose();
  }
  const disabled = !connected || busy;
  const name = (id: string) => members.find(member => member.id === id)?.name || 'Pemain';
  return <section className="minigames"><details>
    <summary>Token minigame · {games.length}</summary>
    {dm && <><p>Token siap pakai. Keluarkan ke peta, lalu klik token untuk deklarasikan permainan.</p><div className="minigame-actions">{Object.entries(gameCatalog).map(([kind, entry]) => <button key={kind} disabled={disabled} onClick={() => send({ type: 'create', kind })}>Keluarkan {entry.name} · {entry.mode === 'duel' ? '1v1' : 'Semua pemain'}</button>)}</div></>}
    {!games.length && !dm && <p>GM belum mengeluarkan token permainan.</p>}
    {!!games.length && <p>GM deklarasikan peserta. Layar peserta otomatis membuka permainan.</p>}
    <div className="minigame-actions">{games.map(item => <button key={item.tokenId} onClick={() => onOpen(item.tokenId)}>{gameNames[item.kind]} · ronde {item.round}</button>)}</div>
    {dm && !!games.length && <p>Geser token dengan Shift sambil menyeret.</p>}
    {!game && error && <p role="alert">{error}</p>}
    </details>
    {game && <dialog ref={dialog} className="minigame-dialog" onCancel={onClose} aria-labelledby="minigame-title">
      <header><h2 id="minigame-title">{gameNames[game.kind]}</h2><button onClick={onClose} aria-label="Tutup permainan">Tutup</button></header>
      <p>Ronde {game.round} · {({ waiting: 'Menunggu peserta', open: 'Ronde dibuka', finished: 'Ronde selesai' })[game.phase]}</p>
      {!connected && <p role="status">Koneksi terputus. Menunggu sambungan kembali.</p>}
      <ul className="minigame-scores">{game.players.map(id => <li key={id}>{name(id)} · {game.scores[id]} poin {game.choices[id] ? '· pilihan terkunci' : ''}</li>)}</ul>
      {!game.players.length && <p>Menunggu GM deklarasikan peserta.</p>}
      {!dm && !game.players.includes(playerId) && <p>Kamu penonton. Aksi permainan hanya untuk peserta yang dipilih GM.</p>}
      {game.phase === 'waiting' && <div className="minigame-actions">
        {dm && <fieldset className="minigame-participants"><legend>{gameCatalog[game.kind].mode === 'duel' ? 'Pilih dua peserta 1v1' : 'Seluruh pemain online menjadi peserta'}</legend>
          {gameCatalog[game.kind].mode === 'duel' && members.filter(member => member.online).map(member => <label key={member.id}><input type="checkbox" checked={participants.includes(member.id)} disabled={disabled || (!participants.includes(member.id) && participants.length >= 2)} onChange={e => setParticipants(current => e.target.checked ? [...current, member.id] : current.filter(id => id !== member.id))} />{member.name}{member.dm ? ' (GM)' : ''}</label>)}
          <button disabled={disabled || (gameCatalog[game.kind].mode === 'duel' && participants.length !== 2)} onClick={() => send({ type: 'declare', players: participants })}>Deklarasikan {gameNames[game.kind]}</button>
        </fieldset>}
        {dm && <button disabled={disabled || game.players.length < (gameCatalog[game.kind].mode === 'duel' ? 2 : 1)} onClick={() => send({ type: 'start' })}>Mulai ronde</button>}
      </div>}
      {game.kind === 'quickmath' && <>
        <p>Sepuluh soal acak dari server. Jawaban benar pertama tiap soal mendapat 1 poin; jawaban salah boleh dicoba lagi.</p>
        {game.phase !== 'waiting' && <><p>Soal {Math.min(game.turn + 1, 10)} dari 10</p><h3 className="quickmath-question" aria-live="polite">{game.question} = ?</h3></>}
        {game.phase === 'open' && (dm || game.players.includes(playerId)) && <form onSubmit={e => { e.preventDefault(); if (/^\d+$/.test(response.trim())) send({ type: 'answer', round: game.round, question: game.turn, answer: Number(response.trim()) }); }}>
          <label>Jawaban<input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={4} value={response} disabled={disabled} onChange={e => setResponse(e.target.value)} /></label>
          <button disabled={disabled || !/^\d+$/.test(response.trim())}>Kirim jawaban</button>
        </form>}
        {game.phase === 'finished' && <p role="status">Selesai. Jawaban terakhir: {game.question} = {game.answer}.</p>}
      </>}
      {game.kind === 'memory' && <>
        <p>{game.players.map(id => `${name(id)}: ${game.scores[id]} pasang`).join(' · ')}</p>
        {game.phase === 'open' && <p role="status">Giliran {name(game.players[game.turn])}.</p>}
        {game.phase === 'finished' && <p role="status">{game.result === 'Seri.' ? 'Permainan Seri.' : `${name(game.result)} menang.`}</p>}
        {game.phase !== 'waiting' && <div className="memory-board">{game.memoryBoard?.map((card, i) => <button key={i} aria-label={`Kartu ${i + 1}`} disabled={disabled || game.phase !== 'open' || game.players[game.turn] !== playerId || !!game.board[i] || (game.memoryOpen && game.memoryOpen.includes(i))} onClick={() => send({ type: 'flip', index: i })} className={game.board[i] ? 'memory-matched' : game.memoryOpen?.includes(i) ? 'memory-open' : ''}>{card || '?'}</button>)}</div>}
      </>}
      {game.kind === 'bombdefuse' && <>
        <p>Player 1 adalah Expert dan membaca manual. Player 2 adalah Operator yang menekan perangkat. Selesaikan keempat modul tanpa salah input.</p>
        {game.phase === 'open' && <div className="bomb-game">
          {playerId === game.players[0] || dm ? <aside className="bomb-sheet"><strong>EXPERT MANUAL</strong><a href="/manual/bomb-defusal-manual.pdf" target="_blank" rel="noreferrer">Buka manual PDF</a>{game.bombModules?.map(module => <section key={module.id}><b>{module.label}</b><p>Clue perangkat: {module.clue}</p></section>)}<small>Baca aturan dari PDF, lalu arahkan Operator.</small></aside> : null}
          <div className="bomb-device" aria-label="Bom dengan modul kabel, tombol, dan simbol">
            <div className="bomb-display">{game.bombModules?.filter(module => module.progress.length === module.solution?.length).length || 0}/{game.bombModules?.length || 4}</div>
            <div className="bomb-modules">{game.bombModules?.map(module => <section className="bomb-module" key={module.id}><b>{module.label}</b><small>{module.clue}</small><div className={module.id === 'wires' ? 'bomb-wires' : 'bomb-options'}>{module.options.map((value, index) => <button key={value} aria-label={module.id === 'wires' ? `Kabel ${'ABC'[index]}, warna ${value}` : value} className={`${module.id === 'wires' ? `bomb-wire wire-${value}` : 'bomb-option'} ${module.progress.includes(value) ? 'cut' : ''}`} disabled={disabled || playerId !== game.players[1] || module.progress.includes(value) || module.progress.length === module.solution?.length} onClick={() => send({ type: 'bomb:input', module: module.id, value })}><span>{module.id === 'wires' ? `${'ABC'[index]} · ${value}` : value}</span></button>)}</div></section>)}</div>
          </div>
        </div>}
        {game.phase === 'open' && playerId === game.players[1] && <p role="status">Kamu Operator. Sebutkan clue pada perangkat dan ikuti instruksi Expert.</p>}
        {game.phase === 'finished' && <p role="status">{game.result === 'defused' ? 'Bom berhasil dijinakkan! +1 poin untuk Operator.' : 'Boom! Ada input yang salah.'}</p>}
      </>}
      {game.kind === 'rps' && game.phase === 'open' && <div className="minigame-actions">{game.players.includes(playerId) && !game.choices[playerId] ? Object.entries(choices).map(([choice, label]) => <button key={choice} disabled={disabled} onClick={() => send({ type: 'choose', choice })}>{label}</button>) : <p>Menunggu pilihan peserta lain.</p>}</div>}
      {game.kind === 'rps' && game.phase === 'finished' && <><p>{game.result === 'Seri.' ? game.result : `${name(game.result)} menang, +1 poin.`}</p><ul>{game.players.map(id => <li key={id}>{name(id)}: {choices[game.choices[id]]}</li>)}</ul></>}
      {game.kind === 'connectfour' && <>
        <p>{game.players.map((id, i) => `${name(id)}: ${i === 0 ? 'Merah (X)' : 'Emas (O)'}`).join(' · ')}</p>
        {game.phase === 'open' && <p role="status">Giliran {name(game.players[game.turn])}.</p>}
        <div className="connectfour-columns">{Array.from({ length: 7 }, (_, column) => <button key={column} aria-label={`Jatuhkan keping di kolom ${column + 1}`} disabled={disabled || game.phase !== 'open' || game.players[game.turn] !== playerId || !!game.board[column]} onClick={() => send({ type: 'drop', column })}>{column + 1}</button>)}</div>
        <div className="connectfour-board" role="img" aria-label={`Papan Connect Four. ${game.board.map((cell, i) => `Baris ${Math.floor(i / 7) + 1} kolom ${i % 7 + 1}: ${cell || 'kosong'}`).join('; ')}`}>{game.board.map((cell, i) => <span key={i} className={cell === 'X' ? 'piece-red' : cell === 'O' ? 'piece-gold' : ''} aria-hidden="true">{cell || '·'}</span>)}</div>
        {game.phase === 'finished' && <p role="status">{game.result === 'Seri.' ? 'Seri.' : `${name(game.result)} menang, +1 poin.`}</p>}
      </>}
      {game.kind === 'tictactoe' && <>
        <p>{game.players.map((id, i) => `${name(id)}: ${i === 0 ? 'X' : 'O'}`).join(' · ')}</p>
        {game.phase === 'open' && <p role="status">Giliran {name(game.players[game.turn])} ({game.turn === 0 ? 'X' : 'O'}).</p>}
        <div className="tictactoe-board">{game.board.map((cell, i) => <button key={i} aria-label={`Baris ${Math.floor(i / 3) + 1}, kolom ${i % 3 + 1}: ${cell || 'kosong'}`} disabled={disabled || game.phase !== 'open' || game.players[game.turn] !== playerId || !!cell} onClick={() => send({ type: 'cell', cell: i })}>{cell || '·'}</button>)}</div>
        {game.phase === 'finished' && <p role="status">{game.result === 'Seri.' ? 'Seri.' : `${name(game.result)} menang, +1 poin.`}</p>}
      </>}
      <div className="minigame-actions">
        {dm && game.phase !== 'waiting' && <button disabled={disabled} onClick={() => send({ type: 'reset' })}>{game.phase === 'finished' ? 'Siapkan ronde berikutnya' : 'Batalkan ronde'}</button>}
        {dm && <button className="remove-action" disabled={disabled} onClick={remove}>Hapus token</button>}
      </div>
      {busy && <p role="status">Mengirim aksi…</p>}{error && <p role="alert">{error}</p>}
    </dialog>}
  </section>;
}
