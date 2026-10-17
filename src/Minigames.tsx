import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { gameCatalog, type Game } from '../server/minigames';
import './minigames.css';

export const gameNames = Object.fromEntries(Object.entries(gameCatalog).map(([kind, entry]) => [kind, entry.name]));
const choices: Record<string, string> = { rock: 'Batu', paper: 'Kertas', scissors: 'Gunting' };
function DrawingBoard({ strokes = [], enabled, send }: { strokes?: number[][][]; enabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const [current, setCurrent] = useState<number[][]>([]);
  const point = (element: SVGSVGElement, x: number, y: number) => { const box = element.getBoundingClientRect(); return [Math.max(0, Math.min(1, (x - box.left) / box.width)), Math.max(0, Math.min(1, (y - box.top) / box.height))]; };
  const finish = () => { if (current.length > 1) send({ type: 'drawing:stroke', points: current }); setCurrent([]); };
  return <svg className="drawing-canvas" viewBox="0 0 100 70" aria-label="Kanvas gambar" onPointerDown={event => { if (!enabled) return; event.currentTarget.setPointerCapture(event.pointerId); setCurrent([point(event.currentTarget, event.clientX, event.clientY)]); }} onPointerMove={event => { if (!enabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return; setCurrent(points => [...points.slice(-98), point(event.currentTarget, event.clientX, event.clientY)]); }} onPointerUp={finish} onPointerCancel={() => setCurrent([])}>
    {[...strokes, current].filter(points => points.length > 1).map((points, index) => <polyline key={index} points={points.map(([x, y]) => `${x * 100},${y * 70}`).join(' ')} />)}
  </svg>;
}
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
  useEffect(() => { setResponse(''); setError(''); }, [game?.tokenId, game?.round, game?.phase, game?.turn, game?.cipherStage, game?.drawingRound]);
  function send(action: Record<string, unknown>) {
    if (!socket || !connected || busy) return;
    setBusy(true); setError('');
    socket.timeout(5000).emit('minigame:action', { tokenId: game?.tokenId, ...action }, (timeout: Error | null, result?: { error?: string }) => {
      setBusy(false); setError(timeout ? 'Koneksi terputus. Periksa status ronde sebelum mencoba lagi.' : result?.error || '');
    });
  }
  function remove(target: Game) {
    if (!socket || !connected || busy || !confirm(`Hapus token ${gameNames[target.kind]} dari map?`)) return;
    socket.emit('token:remove', target.tokenId);
    if (game?.tokenId === target.tokenId) onClose();
  }
  const disabled = !connected || busy;
  const openParty = game?.kind === 'crossword' || game?.kind === 'seating';
  const name = (id: string) => members.find(member => member.id === id)?.name || 'Pemain';
  return <section className="minigames">{dm && <details>
    <summary>Token minigame · {games.length}</summary>
    <p>Token siap pakai. Keluarkan ke peta, lalu klik token untuk deklarasikan permainan.</p><div className="minigame-actions">{Object.entries(gameCatalog).map(([kind, entry]) => <button key={kind} disabled={disabled} onClick={() => send({ type: 'create', kind })}>Keluarkan {entry.name} · {entry.mode === 'duel' ? '1v1' : 'Semua pemain'}</button>)}</div>
    {!!games.length && <p>GM deklarasikan peserta. Layar peserta otomatis membuka permainan.</p>}
    <div className="minigame-token-list">{games.map(item => <div key={item.tokenId}><button onClick={() => onOpen(item.tokenId)}>{gameNames[item.kind]} · ronde {item.round}</button><button className="remove-action" aria-label={`Hapus ${gameNames[item.kind]} dari map`} title="Hapus token dari map" disabled={disabled} onClick={() => remove(item)}>Hapus</button></div>)}</div>
    {!!games.length && <p>Geser token dengan Shift sambil menyeret. Hapus menghilangkan token dan seluruh ronde game.</p>}
    {!game && error && <p role="alert">{error}</p>}
    </details>}
    {game && <dialog ref={dialog} className="minigame-dialog" onCancel={onClose} aria-labelledby="minigame-title">
      <header><h2 id="minigame-title">{gameNames[game.kind]}</h2><button onClick={onClose} aria-label="Tutup permainan">Tutup</button></header>
      <p>Ronde {game.round} · {({ waiting: 'Menunggu peserta', open: 'Ronde dibuka', finished: 'Ronde selesai' })[game.phase]}</p>
      {!connected && <p role="status">Koneksi terputus. Menunggu sambungan kembali.</p>}
      <ul className="minigame-scores">{game.players.map(id => <li key={id}>{name(id)} · {game.scores[id]} poin {game.choices[id] ? '· pilihan terkunci' : ''}</li>)}</ul>
      {!openParty && !game.players.length && <p>Menunggu GM deklarasikan peserta.</p>}
      {!openParty && !dm && !game.players.includes(playerId) && <p>Kamu penonton. Aksi permainan hanya untuk peserta yang dipilih GM.</p>}
      {game.phase === 'waiting' && <div className="minigame-actions">
        {dm && !openParty && <fieldset className="minigame-participants"><legend>{gameCatalog[game.kind].mode === 'duel' ? 'Pilih dua peserta 1v1' : 'Seluruh pemain online menjadi peserta'}</legend>
          {gameCatalog[game.kind].mode === 'duel' && members.filter(member => member.online).map(member => <label key={member.id}><input type="checkbox" checked={participants.includes(member.id)} disabled={disabled || (!participants.includes(member.id) && participants.length >= 2)} onChange={e => setParticipants(current => e.target.checked ? [...current, member.id] : current.filter(id => id !== member.id))} />{member.name}{member.dm ? ' (GM)' : ''}</label>)}
          <button disabled={disabled || (gameCatalog[game.kind].mode === 'duel' && participants.length !== 2)} onClick={() => send({ type: 'declare', players: participants })}>Deklarasikan {gameNames[game.kind]}</button>
        </fieldset>}
        {dm && <button disabled={disabled || (!openParty && game.players.length < (gameCatalog[game.kind].mode === 'duel' ? 2 : 1))} onClick={() => send({ type: 'start' })}>Mulai ronde</button>}
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
      {game.kind === 'drawing' && <>
        <p>Player 1 menggambar. Player 2 menebak. Tiga ronde: hewan, makanan, lalu buah.</p>
        {game.phase !== 'waiting' && <><p>Ronde {Math.min((game.drawingRound || 0) + 1, 3)} dari 3</p>
          {playerId === game.players[0] && !game.drawingWord && <div className="minigame-actions">{game.drawingChoices?.map(word => <button key={word} disabled={disabled} onClick={() => send({ type: 'drawing:choose', word })}>{word}</button>)}</div>}
          {playerId === game.players[0] && game.drawingWord && <p>Kata untuk digambar: <strong>{game.drawingWord}</strong></p>}
          {playerId === game.players[1] && !game.drawingStrokes?.length && <p>Menunggu gambar.</p>}
          <DrawingBoard strokes={game.drawingStrokes} enabled={!disabled && game.phase === 'open' && playerId === game.players[0] && !!game.drawingWord} send={send} />
          {playerId === game.players[0] && game.drawingWord && <button disabled={disabled} onClick={() => send({ type: 'drawing:clear' })}>Bersihkan kanvas</button>}
          {playerId === game.players[1] && game.phase === 'open' && <form onSubmit={event => { event.preventDefault(); if (response.trim()) send({ type: 'drawing:guess', answer: response.trim() }); }}><label>Tebakan<input value={response} maxLength={40} disabled={disabled || !game.drawingStrokes?.length} onChange={event => setResponse(event.target.value)} /></label><button disabled={disabled || !response.trim() || !game.drawingStrokes?.length}>Tebak</button></form>}
        </>}
        {game.phase === 'finished' && <p role="status">Tiga ronde selesai. {name(game.players[1])} mendapat {game.scores[game.players[1]]} poin.</p>}
      </>}
      {game.kind === 'crossword' && <>
        <p>Isi empat jawaban bahasa Indonesia. Semua pemain boleh membantu tanpa assignment.</p>
        {game.phase !== 'waiting' && <div className="crossword-game">
          <div className="crossword-grid" aria-label="Papan teka-teki silang">{Array.from({ length: 20 }, (_, cell) => {
            const active = game.crosswordEntries?.some(entry => entry.cells.includes(cell));
            return <span key={cell} className={active ? '' : 'blocked'}>{active ? game.crosswordLetters?.[cell] || '' : ''}</span>;
          })}</div>
          <div>{game.crosswordEntries?.map(entry => <form key={entry.id} onSubmit={event => { event.preventDefault(); const answer = new FormData(event.currentTarget).get('answer'); if (typeof answer === 'string' && answer.trim()) send({ type: 'crossword:answer', id: entry.id, answer }); }}><label>{entry.id} · {entry.clue}<input name="answer" disabled={disabled || game.phase !== 'open' || game.crosswordSolved?.includes(entry.id)} /></label><button disabled={disabled || game.phase !== 'open' || game.crosswordSolved?.includes(entry.id)}>{game.crosswordSolved?.includes(entry.id) ? 'Benar' : 'Jawab'}</button></form>)}</div>
        </div>}
        {game.phase === 'finished' && <p role="status">Teka-teki selesai oleh {name(game.result)}.</p>}
      </>}
      {game.kind === 'seating' && <>
        <p>Susun sembilan orang mengelilingi meja. Jendela A dan B menjadi patokan. Semua pemain boleh mengubah kursi.</p>
        {game.phase !== 'waiting' && <><ol className="seating-clues">{game.seatingClues?.map(clue => <li key={clue}>{clue}</li>)}</ol><div className="seating-room"><b className="window-a">Jendela A</b><b className="window-b">Jendela B</b><div className="seating-table">MEJA</div>{game.seatingSeats?.map((occupant, seat) => <label className={`seat seat-${seat}`} key={seat}><span>Kursi {seat + 1}</span><select aria-label={`Kursi ${seat + 1}`} value={occupant} disabled={disabled || game.phase !== 'open'} onChange={event => send({ type: 'seating:place', seat, name: event.target.value })}><option value="">Kosong</option>{game.seatingNames?.map(person => <option key={person} value={person} disabled={game.seatingSeats?.includes(person) && person !== occupant}>{person}</option>)}</select></label>)}</div></>}
        {game.phase === 'finished' && <p role="status">Susunan benar! Diselesaikan oleh {name(game.result)}.</p>}
      </>}
      {(game.kind === 'reliccipher' || game.kind === 'chaincipher') && <>
        <p>{game.kind === 'chaincipher' ? 'Pecahkan berurutan: Morse menghasilkan sandi A–Z, lalu sandi A–N, baru kalimat akhir.' : 'Tiga lapis sandi saling mengunci. Hasil lapis sebelumnya menjadi kunci lapis berikutnya.'} Semua peserta boleh mengirim jawaban.</p>
        {game.phase !== 'waiting' && <div className="relic-cipher">
          <div className="cipher-progress" aria-label={`Lapis ${Math.min((game.cipherStage || 0) + 1, 3)} dari 3`}>{[0, 1, 2].map(index => <span key={index} className={index < (game.cipherStage || 0) ? 'solved' : index === (game.cipherStage || 0) && game.phase === 'open' ? 'active' : ''}>{index < (game.cipherStage || 0) ? '✓' : index + 1}</span>)}</div>
          {game.cipherLayers?.map((layer, index) => <article className={`cipher-layer ${index < (game.cipherStage || 0) ? 'solved' : ''}`} key={layer.title}>
            <header><h3>{layer.title}</h3>{index < (game.cipherStage || 0) && <b>TERPECAHKAN</b>}</header>
            <pre>{layer.cipher}</pre>
            {game.kind !== 'chaincipher' && <dl><div><dt>Metode</dt><dd>{layer.method}</dd></div><div><dt>Petunjuk</dt><dd>{layer.clue}</dd></div></dl>}
          </article>)}
          {game.phase === 'open' && (dm || game.players.includes(playerId)) && <form className="cipher-answer" onSubmit={event => { event.preventDefault(); if (response.trim()) send({ type: 'cipher:answer', answer: response.trim() }); }}>
            <label>Jawaban lapis {(game.cipherStage || 0) + 1}<input autoComplete="off" maxLength={120} value={response} disabled={disabled} onChange={event => setResponse(event.target.value)} placeholder="Spasi dan tanda baca boleh diabaikan" /></label>
            <button disabled={disabled || !response.trim()}>Uji jawaban</button>
          </form>}
        </div>}
        {game.phase === 'finished' && <p role="status">Relik terbuka. {name(game.result)} memecahkan lapis terakhir dan mendapat 1 poin.</p>}
      </>}
      {game.kind === 'memory' && <>
        <p>{game.players.map(id => `${name(id)}: ${game.scores[id]} pasang`).join(' · ')}</p>
        {game.phase === 'open' && <p role="status">{game.memoryCloseAt ? 'Tidak cocok. Kartu akan tertutup dalam 1 detik.' : `Giliran ${name(game.players[game.turn])}.`}</p>}
        {game.phase === 'finished' && <p role="status">{game.result === 'Seri.' ? 'Permainan Seri.' : `${name(game.result)} menang.`}</p>}
        {game.phase !== 'waiting' && <div className="memory-board">{game.memoryBoard?.map((card, i) => <button key={i} aria-label={`Kartu ${i + 1}`} disabled={disabled || !!game.memoryCloseAt || game.phase !== 'open' || game.players[game.turn] !== playerId || !!game.board[i] || (game.memoryOpen && game.memoryOpen.includes(i))} onClick={() => send({ type: 'flip', index: i })} className={game.board[i] ? 'memory-matched' : game.memoryOpen?.includes(i) ? 'memory-open' : ''}>{card || '?'}</button>)}</div>}
      </>}
      {game.kind === 'bombdefuse' && <>
        <p>Player 1 adalah Expert dan membaca manual. Player 2 adalah Operator yang menekan perangkat. Selesaikan keempat modul tanpa salah input.</p>
        {game.phase === 'open' && playerId === game.players[0] && !dm
          ? <aside className="bomb-sheet"><strong>EXPERT MANUAL</strong><a href="/manual/bomb-defusal-manual.pdf" target="_blank" rel="noreferrer">Buka manual PDF</a><small>Fokus pada manual, lalu arahkan Operator.</small></aside>
          : game.phase === 'open' && <div className="bomb-game">
            {dm && <aside className="bomb-sheet"><strong>EXPERT MANUAL</strong><a href="/manual/bomb-defusal-manual.pdf" target="_blank" rel="noreferrer">Buka manual PDF</a></aside>}
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
        <p>{game.players.map((id, i) => `${name(id)}: ${i === 0 ? 'X' : 'O'}`).join(' · ')} · Maksimal enam tanda; tanda paling lama hilang saat langkah berikutnya.</p>
        {game.phase === 'open' && <p role="status">Giliran {name(game.players[game.turn])} ({game.turn === 0 ? 'X' : 'O'}).</p>}
        <div className="tictactoe-board">{game.board.map((cell, i) => <button key={i} aria-label={`Baris ${Math.floor(i / 3) + 1}, kolom ${i % 3 + 1}: ${cell || 'kosong'}`} disabled={disabled || game.phase !== 'open' || game.players[game.turn] !== playerId || !!cell} onClick={() => send({ type: 'cell', cell: i })}>{cell || '·'}</button>)}</div>
        {game.phase === 'finished' && <p role="status">{game.result === 'Seri.' ? 'Seri.' : `${name(game.result)} menang, +1 poin.`}</p>}
      </>}
      <div className="minigame-actions">
        {dm && game.phase !== 'waiting' && <button disabled={disabled} onClick={() => send({ type: 'reset' })}>{game.phase === 'finished' ? 'Siapkan ronde berikutnya' : 'Batalkan ronde'}</button>}
        {dm && <button className="remove-action" disabled={disabled} onClick={() => remove(game)}>Hapus token dari map</button>}
      </div>
      {busy && <p role="status">Mengirim aksi…</p>}{error && <p role="alert">{error}</p>}
    </dialog>}
  </section>;
}
