import { useEffect, useState } from 'react';
import type { Game } from '../server/minigames';
import Crossword from './Crossword';

type Props = {
  game: Game;
  disabled: boolean;
  send: (action: Record<string, unknown>) => void;
  dm: boolean;
  members: { id: string; name: string; online: boolean; dm: boolean }[];
};
const names = ['ANI', 'BUDI', 'CITRA', 'DODI', 'EKA', 'FANI', 'GALIH', 'HANA', 'IWAN'];

export default function CoopPuzzle({ game, disabled, send, dm, members }: Props) {
  const coop = game.coop;
  const assigned = [coop?.teams[0]?.[0] || '', coop?.teams[0]?.[1] || '', coop?.teams[1]?.[0] || '', coop?.teams[1]?.[1] || ''];
  const assignmentKey = JSON.stringify(assigned);
  const [players, setPlayers] = useState(assigned);
  const [cipherAnswer, setCipherAnswer] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [panel, setPanel] = useState<'chairs' | 'tts' | 'cipher'>('chairs');
  useEffect(() => { setPanel(game.coop?.room === 'cipher' ? 'cipher' : 'chairs'); }, [game.tokenId, game.coop?.room]);
  useEffect(() => { setPlayers(JSON.parse(assignmentKey)); }, [game.tokenId, game.round, assignmentKey]);
  useEffect(() => { setCipherAnswer(''); setFinalAnswer(''); }, [game.tokenId, game.round, game.phase, coop?.cipherStage]);
  const canAssign = players.every(id => id && members.some(member => member.id === id)) && new Set(players).size === 4;
  const locked = disabled || game.phase !== 'open';
  const chairs = dm || coop?.room === 'chairs';
  const cipher = dm || coop?.room === 'cipher';
  const memberName = (id: string) => members.find(member => member.id === id)?.name || 'Pemain';

  if (game.phase === 'waiting') return <section className="coop-setup">
    <p>Dua pemain di ruang kursi dan dua pemain di ruang sandi. Saling kirim petunjuk untuk menyelesaikan kedua ruang.</p>
    {dm ? <fieldset className="minigame-participants" disabled={disabled}>
      <legend>Pilih empat pemain berbeda</legend>
      {players.map((id, index) => <label key={index}>
        {index < 2 ? 'Ruang kursi' : 'Ruang sandi'} · pemain {index % 2 + 1}
        <select value={id} onChange={event => setPlayers(current => current.map((value, slot) => slot === index ? event.target.value : value))}>
          <option value="">Pilih pemain</option>
          {members.map(member => <option key={member.id} value={member.id} disabled={players.some((value, slot) => slot !== index && value === member.id)}>{member.name}{member.online ? '' : ' (offline)'}{member.dm ? ' (GM)' : ''}</option>)}
        </select>
      </label>)}
      <button disabled={disabled || !canAssign} onClick={() => send({ type: 'coop:assign', teams: [players.slice(0, 2), players.slice(2, 4)] })}>Tetapkan tim</button>
      <p>Setelah tim ditetapkan, gunakan tombol Mulai ronde.</p>
    </fieldset> : <p>Menunggu GM menetapkan tim dan membuka ronde.</p>}
    {coop?.teams.some(team => team.length > 0) && <ul>{coop.teams.map((team, index) => <li key={index}>{index === 0 ? 'Ruang kursi' : 'Ruang sandi'}: {team.map(memberName).join(', ')}</li>)}</ul>}
  </section>;

  if (!coop) return <p role="status">Menunggu data ruang.</p>;
  if (!chairs && !cipher) return <p>Kamu penonton. Kedua tim sedang bertukar petunjuk.</p>;

  return <section className="coop-workspace">
    <div className="coop-progress" aria-label="Progres sesi"><span>TTS <b>{coop.crossword?.crosswordSolved?.length ?? '—'}/19</b></span><span>Kursi <b>{coop.seatDone ? 'Selesai' : 'Disusun'}</b></span><span>Sandi <b>{Math.min(coop.cipherStage, 3)}/3</b></span></div>
    <nav className="coop-tabs" aria-label="Panel puzzle">
      {chairs && <><button aria-pressed={panel === 'chairs'} onClick={() => setPanel('chairs')}>9 Kursi</button><button aria-pressed={panel === 'tts'} onClick={() => setPanel('tts')}>Teka-teki silang</button></>}
      {cipher && <button aria-pressed={panel === 'cipher'} onClick={() => setPanel('cipher')}>Ruang sandi</button>}
    </nav>
    <div className="coop-columns">
    {!!coop.clues?.length && <aside className="coop-notes"><h3>Catatan ruangan</h3><ol>{coop.clues.map((clue, index) => <li key={index}>{clue}</li>)}</ol><p>Sampaikan petunjuk kepada tim sebelah lewat suara atau chat.</p></aside>}
    <div className="coop-main">
    {chairs && <section hidden={panel !== 'tts'}>
      <h3>Teka-teki silang</h3>
      <p><strong>Ekstraksi:</strong> ambil huruf pertama jawaban <mark>7M</mark>, <mark>5T</mark>, <mark>9T</mark>, <mark>15M</mark>, <mark>12T</mark>, sesuai urutan. Sampaikan kepada tim sandi.</p>
      {coop.crossword ? <Crossword key={`${game.tokenId}-${game.round}`} game={coop.crossword} disabled={locked} send={action => send({ type: 'coop:crossword', id: action.id, answer: action.answer })} /> : <p>Menunggu papan TTS.</p>}
    </section>}
    {chairs && <section hidden={panel !== 'chairs'}>
      <h3>Susunan kursi{coop.seatDone ? ' · selesai' : ''}</h3>
      <p>Susun sembilan orang mengelilingi meja. Jendela A dan B menjadi patokan.</p>
      <div className="seating-room">
        <b className="window-a">Jendela A</b><b className="window-b">Jendela B</b><div className="seating-table">MEJA</div>
        {names.map((_, seat) => <label className={`seat seat-${seat}`} key={seat}><span>Kursi {seat + 1}</span>
          <select aria-label={`Kursi ${seat + 1}`} value={coop.seats?.[seat] || ''} disabled={locked || coop.seatDone} onChange={event => send({ type: 'coop:seat', seat, name: event.target.value })}>
            <option value="">Pilih nama</option>{names.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>)}
      </div>
      {coop.reward && <p role="status">{coop.reward}</p>}
      <form onSubmit={event => { event.preventDefault(); if (!locked && !coop.finalDone && finalAnswer.trim()) send({ type: 'coop:final', answer: finalAnswer.trim() }); }}>
        <label>Kode pintu akhir<input value={finalAnswer} onChange={event => setFinalAnswer(event.target.value)} disabled={locked || coop.finalDone} autoComplete="off" /></label>
        <button disabled={locked || coop.finalDone || !finalAnswer.trim()}>Kirim kode pintu</button>
      </form>
    </section>}
    {cipher && <section hidden={panel !== 'cipher'} className="cipher-layer">
      <h3>Ruang sandi · tahap {coop.cipherStage + 1}</h3>
      {coop.cipher ? <>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{coop.cipher}</p>
        {!!coop.fragments?.length && <div className="coop-fragments" aria-label="Sembilan pasangan angka">{coop.fragments.map(fragment => <div key={fragment.name}><small>{fragment.name}</small><strong>{fragment.text}</strong></div>)}</div>}
        <form onSubmit={event => { event.preventDefault(); if (!locked && cipherAnswer.trim()) send({ type: 'coop:cipher', answer: cipherAnswer.trim() }); }}>
          <label>{coop.cipherStage >= 2 ? 'Kode pintu 18 digit' : 'Jawaban sandi'}<input value={cipherAnswer} onChange={event => setCipherAnswer(event.target.value)} disabled={locked || coop.cipherStage >= 3} autoComplete="off" /></label>
          <button disabled={locked || coop.cipherStage >= 3 || !cipherAnswer.trim()}>Kirim jawaban sandi</button>
        </form>
      </> : <p role="status">Menunggu sandi berikutnya atau petunjuk dari tim kursi.</p>}
    </section>}
    </div></div>
    {coop.finalDone && <p role="status">Kedua ruang selesai!</p>}
  </section>;
}
